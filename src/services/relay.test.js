import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captures the handlers relay.js registers so tests can drive the channel.
const makeChannel = (name, registry) => {
  const handlers = { broadcast: [], presence: {} };
  const ch = {
    name,
    send: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    presenceState: vi.fn(() => ({})),
    on: vi.fn((kind, opts, cb) => {
      if (kind === 'broadcast') handlers.broadcast.push(cb);
      else handlers.presence[opts.event] = cb;
      return ch;
    }),
    subscribe: vi.fn((cb) => { ch._statusCb = cb; return ch; }),
    handlers,
  };
  registry[name] = ch;
  return ch;
};

let channels;

vi.mock('../lib/supabase', () => ({
  supabase: { channel: vi.fn((name) => makeChannel(name, channels)) },
}));

const loadRelay = async () => {
  channels = {};
  vi.resetModules();
  const { relay } = await import('./relay');
  return relay;
};

describe('relay', () => {
  let relay;
  beforeEach(async () => { relay = await loadRelay(); });

  describe('ensure', () => {
    it('opens the drivers and hail channels', () => {
      relay.ensure();
      expect(Object.keys(channels).sort()).toEqual(['drivers', 'hail']);
    });

    it('is idempotent', () => {
      relay.ensure();
      relay.ensure();
      expect(channels.drivers.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('connected', () => {
    it('starts disconnected', () => {
      expect(relay.connected).toBe(false);
    });

    it('becomes true once the drivers channel subscribes', () => {
      relay.ensure();
      channels.drivers._statusCb('SUBSCRIBED');
      expect(relay.connected).toBe(true);
    });

    it('stays false for a non-subscribed status', () => {
      relay.ensure();
      channels.drivers._statusCb('CLOSED');
      expect(relay.connected).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('invokes the listener immediately with a snapshot', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ connected: false, drivers: [], bookings: [] }),
      );
    });

    it('stops notifying after the returned cleanup runs', () => {
      const cb = vi.fn();
      const off = relay.subscribe(cb);
      off();
      relay.send('booking:new', { booking: { id: 'b1' } });
      expect(cb).toHaveBeenCalledTimes(1); // only the initial snapshot
    });

    it('notifies on state change', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      relay.send('booking:new', { booking: { id: 'b1' } });
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('onMessage', () => {
    it('forwards broadcast payloads to raw listeners', () => {
      const cb = vi.fn();
      relay.onMessage(cb);
      const msg = { type: 'hail:request', id: 'r1' };
      channels.hail.handlers.broadcast[0]({ payload: msg });
      expect(cb).toHaveBeenCalledWith(msg);
    });

    it('ignores an empty payload', () => {
      const cb = vi.fn();
      relay.onMessage(cb);
      channels.hail.handlers.broadcast[0]({ payload: null });
      expect(cb).not.toHaveBeenCalled();
    });

    it('stops forwarding after cleanup', () => {
      const cb = vi.fn();
      const off = relay.onMessage(cb);
      off();
      channels.hail.handlers.broadcast[0]({ payload: { type: 'x' } });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('send routing', () => {
    beforeEach(() => relay.ensure());

    it('routes driver:online through the drivers channel and tracks presence', () => {
      relay.send('driver:online', { driverId: 'd1', bus: { id: 'b1' } });
      expect(channels.drivers.send).toHaveBeenCalled();
      expect(channels.drivers.track).toHaveBeenCalledWith({ driverId: 'd1', bus: { id: 'b1' } });
      expect(channels.hail.send).not.toHaveBeenCalled();
    });

    it('routes driver:offline through the drivers channel and untracks', () => {
      relay.send('driver:offline', { driverId: 'd1' });
      expect(channels.drivers.untrack).toHaveBeenCalled();
    });

    it('routes driver:position through the drivers channel', () => {
      relay.send('driver:position', { driverId: 'd1', position: [5, -0.2] });
      expect(channels.drivers.send).toHaveBeenCalled();
    });

    it('routes everything else through the hail channel', () => {
      relay.send('booking:new', { booking: { id: 'b1' } });
      expect(channels.hail.send).toHaveBeenCalled();
      expect(channels.drivers.send).not.toHaveBeenCalled();
    });

    it('sends the type merged into the payload', () => {
      relay.send('ticket:checkedin', { bookingId: 'b9' });
      expect(channels.hail.send).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { type: 'ticket:checkedin', bookingId: 'b9' } }),
      );
    });
  });

  describe('state folding', () => {
    it('records a new booking so getBooking can find it', () => {
      relay.send('booking:new', { booking: { id: 'b1', amount: 50 } });
      expect(relay.getBooking('b1')).toEqual({ id: 'b1', amount: 50 });
    });

    it('returns undefined for an unknown booking', () => {
      expect(relay.getBooking('nope')).toBeUndefined();
    });

    it('ignores a booking with no id', () => {
      relay.send('booking:new', { booking: {} });
      expect(relay.getBooking(undefined)).toBeUndefined();
    });

    it('adds a driver on driver:online', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      relay.send('driver:online', { driverId: 'd1', bus: { id: 'b1' } });
      expect(cb.mock.calls.at(-1)[0].drivers).toHaveLength(1);
    });

    it('removes a driver on driver:offline', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      relay.send('driver:online', { driverId: 'd1', bus: { id: 'b1' } });
      relay.send('driver:offline', { driverId: 'd1' });
      expect(cb.mock.calls.at(-1)[0].drivers).toHaveLength(0);
    });

    it('updates a tracked driver position', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      relay.send('driver:online', { driverId: 'd1', bus: { id: 'b1', position: [0, 0] } });
      relay.send('driver:position', { driverId: 'd1', position: [5.6, -0.18], etaMin: 4 });
      const driver = cb.mock.calls.at(-1)[0].drivers[0];
      expect(driver.bus.position).toEqual([5.6, -0.18]);
      expect(driver.bus.etaMin).toBe(4);
    });

    it('ignores a position for an unknown driver', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      relay.send('driver:position', { driverId: 'ghost', position: [1, 1] });
      expect(cb.mock.calls.at(-1)[0].drivers).toHaveLength(0);
    });

    it('ignores an unknown message type', () => {
      expect(() => relay.send('something:else', { foo: 1 })).not.toThrow();
    });
  });

  describe('presence', () => {
    it('rebuilds the driver list on sync', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      channels.drivers.presenceState.mockReturnValue({
        key1: [{ driverId: 'd1', bus: { id: 'b1' } }],
        key2: [{ driverId: 'd2', bus: { id: 'b2' } }],
      });
      channels.drivers.handlers.presence.sync();
      expect(cb.mock.calls.at(-1)[0].drivers).toHaveLength(2);
    });

    it('drops departed drivers on leave', () => {
      const cb = vi.fn();
      relay.subscribe(cb);
      relay.send('driver:online', { driverId: 'd1', bus: { id: 'b1' } });
      channels.drivers.handlers.presence.leave({ leftPresences: [{ driverId: 'd1' }] });
      expect(cb.mock.calls.at(-1)[0].drivers).toHaveLength(0);
    });

    it('emits a driver:offline message to raw listeners on leave', () => {
      const raw = vi.fn();
      relay.onMessage(raw);
      channels.drivers.handlers.presence.leave({ leftPresences: [{ driverId: 'd1' }] });
      expect(raw).toHaveBeenCalledWith({ type: 'driver:offline', driverId: 'd1' });
    });
  });
});
