import { vi } from 'vitest';

const MUTATIONS = ['insert', 'update', 'upsert', 'delete'];
const CHAIN = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte',
  'order', 'limit', 'range', 'single', 'maybeSingle',
];

// A Supabase query builder stand-in. Every chain method returns the builder,
// and the builder is thenable, so it resolves whether the caller awaits after
// `.eq(...)` or after `.single()`. Responses are registered per table and
// operation, e.g. 'profiles.select' or 'profiles.update'.
const makeBuilder = (table, responses, calls) => {
  const state = { table, op: 'select', args: {} };
  const builder = {};

  CHAIN.forEach((name) => {
    builder[name] = (...args) => {
      if (MUTATIONS.includes(name)) state.op = name;
      state.args[name] = args;
      return builder;
    };
  });

  builder.then = (resolve, reject) => {
    calls.push({ table, op: state.op, args: state.args });
    const res = responses[`${table}.${state.op}`] ?? { data: null, error: null };
    const value = typeof res === 'function' ? res(state) : res;
    return Promise.resolve(value).then(resolve, reject);
  };

  return builder;
};

export const createSupabaseMock = ({ session = null, responses = {} } = {}) => {
  const calls = [];
  let current = session;
  let authCb = null;

  const unsubscribe = vi.fn();

  const supabase = {
    from: vi.fn((table) => makeBuilder(table, responses, calls)),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: current } })),
      onAuthStateChange: vi.fn((cb) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe } } };
      }),
      signOut: vi.fn(async () => {
        current = null;
        authCb?.('SIGNED_OUT', null);
        return { error: null };
      }),
      signInWithPassword: vi.fn(async () => ({ data: { user: current?.user }, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
      setSession: vi.fn(async () => ({ data: {}, error: null })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      send: vi.fn(),
      track: vi.fn(),
      untrack: vi.fn(),
      presenceState: vi.fn(() => ({})),
    })),
    removeChannel: vi.fn(),
  };

  return {
    supabase,
    calls,
    unsubscribe,
    setResponse: (key, res) => { responses[key] = res; },
    // Drive onAuthStateChange the way Supabase would after a sign-in/out.
    emitAuth: (event, nextSession) => {
      current = nextSession;
      authCb?.(event, nextSession);
    },
    callsFor: (table, op) => calls.filter((c) => c.table === table && (!op || c.op === op)),
  };
};

export const makeSession = (overrides = {}) => ({
  user: {
    id: 'u1',
    email: 'traveller@example.com',
    user_metadata: {},
    ...overrides,
  },
});

export const makeProfileRow = (overrides = {}) => ({
  id: 'u1',
  role: 'passenger',
  name: 'Kwame Mensah',
  phone: '241234567',
  email: 'traveller@example.com',
  reg_no: 'AKW-123456',
  ghana_card: '',
  avatar_color: '#06392F',
  created_at: '2026-01-01T00:00:00Z',
  license_no: null,
  vehicle_plate: null,
  verification_status: null,
  rating: null,
  live_destination_id: null,
  operator_id: null,
  bus_type_id: null,
  vehicle_model: null,
  vehicle_color: null,
  payout_method: null,
  ...overrides,
});
