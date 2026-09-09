import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createSupabaseMock, makeSession, makeProfileRow } from '../test/supabaseMock';

let mock;
vi.mock('../lib/supabase', () => ({
  get supabase() { return mock.supabase; },
}));

const { AuthProvider, useAuth } = await import('./AuthContext');

// Surfaces the context on screen and exposes its actions to the test.
let ctx;
const Probe = () => {
  ctx = useAuth();
  if (ctx.loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="authed">{String(ctx.isAuthed)}</span>
      <span data-testid="name">{ctx.user?.name ?? '-'}</span>
      <span data-testid="email">{ctx.user?.email ?? '-'}</span>
      <span data-testid="role">{ctx.user?.role ?? '-'}</span>
      <span data-testid="places">{ctx.user?.savedPlaces?.length ?? 0}</span>
      <span data-testid="methods">{ctx.user?.paymentMethods?.length ?? 0}</span>
    </div>
  );
};

// `loading` briefly drops to false for the initial null session before
// getSession() resolves, so waiting on it alone races. Wait for the settled
// auth state instead — `authed` defaults to whether a session was supplied.
const setup = async (opts = {}, { authed = !!opts.session } = {}) => {
  mock = createSupabaseMock(opts);
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => {
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('authed')).toHaveTextContent(String(authed));
  });
};

beforeEach(() => { ctx = undefined; });

describe('AuthContext', () => {
  describe('signed out', () => {
    it('exposes no user', async () => {
      await setup();
      expect(screen.getByTestId('authed')).toHaveTextContent('false');
      expect(ctx.user).toBeNull();
    });

    it('does not query profiles', async () => {
      await setup();
      expect(mock.callsFor('profiles')).toHaveLength(0);
    });

    it('releases the loading flag', async () => {
      await setup();
      expect(ctx.loading).toBe(false);
    });
  });

  describe('signed in', () => {
    const opts = () => ({
      session: makeSession(),
      responses: {
        'profiles.select': { data: makeProfileRow(), error: null },
        'saved_places.select': { data: [{ id: 'p1', label: 'Home' }], error: null },
        'payment_methods.select': { data: [{ id: 'm1', type: 'card' }], error: null },
      },
    });

    it('exposes the mapped profile', async () => {
      await setup(opts());
      expect(screen.getByTestId('authed')).toHaveTextContent('true');
      expect(screen.getByTestId('name')).toHaveTextContent('Kwame Mensah');
      expect(screen.getByTestId('role')).toHaveTextContent('passenger');
    });

    it('maps snake_case columns to camelCase', async () => {
      await setup(opts());
      expect(ctx.user.regNo).toBe('AKW-123456');
      expect(ctx.user.avatarColor).toBe('#06392F');
      expect(ctx.user.joinedISO).toBe('2026-01-01T00:00:00Z');
    });

    it('merges saved places and payment methods onto the user', async () => {
      await setup(opts());
      expect(screen.getByTestId('places')).toHaveTextContent('1');
      expect(screen.getByTestId('methods')).toHaveTextContent('1');
    });

    it('prefers the auth email over the profile row', async () => {
      await setup({
        session: makeSession({ email: 'auth@example.com' }),
        responses: { 'profiles.select': { data: makeProfileRow({ email: 'stale@example.com' }), error: null } },
      });
      expect(screen.getByTestId('email')).toHaveTextContent('auth@example.com');
    });

    it('defaults nullable driver fields to empty strings', async () => {
      await setup(opts());
      expect(ctx.user.licenseNo).toBe('');
      expect(ctx.user.vehiclePlate).toBe('');
      expect(ctx.user.ghanaCard).toBe('');
    });

    it('maps a driver profile', async () => {
      await setup({
        session: makeSession(),
        responses: {
          'profiles.select': {
            data: makeProfileRow({
              role: 'driver', license_no: 'DL-1', vehicle_plate: 'GT 1234-24',
              verification_status: 'pending', rating: 4.7,
            }),
            error: null,
          },
        },
      });
      expect(ctx.user.role).toBe('driver');
      expect(ctx.user.licenseNo).toBe('DL-1');
      expect(ctx.user.vehiclePlate).toBe('GT 1234-24');
      expect(ctx.user.verificationStatus).toBe('pending');
      expect(ctx.user.rating).toBe(4.7);
    });
  });

  describe('missing profile row', () => {
    it('creates one from auth metadata', async () => {
      await setup({
        session: makeSession({ user_metadata: { role: 'driver', name: 'Ama S.', phone: '241112222' } }),
        responses: {
          'profiles.select': { data: null, error: null },
          'profiles.upsert': { data: makeProfileRow({ role: 'driver', name: 'Ama S.' }), error: null },
        },
      });
      expect(mock.callsFor('profiles', 'upsert')).toHaveLength(1);
      expect(screen.getByTestId('name')).toHaveTextContent('Ama S.');
    });

    it('stays signed out when the upsert also returns nothing', async () => {
      await setup({
        session: makeSession(),
        responses: {
          'profiles.select': { data: null, error: null },
          'profiles.upsert': { data: null, error: null },
        },
      }, { authed: false });
      expect(screen.getByTestId('authed')).toHaveTextContent('false');
    });
  });

  describe('resilience', () => {
    it('still loads the profile when the side tables fail', async () => {
      await setup({
        session: makeSession(),
        responses: {
          'profiles.select': { data: makeProfileRow(), error: null },
          'saved_places.select': () => Promise.reject(new Error('relation does not exist')),
          'payment_methods.select': () => Promise.reject(new Error('relation does not exist')),
        },
      });
      expect(screen.getByTestId('authed')).toHaveTextContent('true');
      expect(screen.getByTestId('places')).toHaveTextContent('0');
    });

    it('releases loading even when the profile query rejects', async () => {
      await setup({
        session: makeSession(),
        responses: { 'profiles.select': () => Promise.reject(new Error('boom')) },
      }, { authed: false });
      expect(ctx.loading).toBe(false);
    });
  });

  describe('auth lifecycle', () => {
    it('subscribes to auth state changes', async () => {
      await setup();
      expect(mock.supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    it('unsubscribes on unmount', async () => {
      mock = createSupabaseMock();
      const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument());
      unmount();
      expect(mock.unsubscribe).toHaveBeenCalled();
    });

    it('picks up a user when a session arrives', async () => {
      await setup({
        responses: { 'profiles.select': { data: makeProfileRow(), error: null } },
      });
      expect(screen.getByTestId('authed')).toHaveTextContent('false');

      await act(async () => { mock.emitAuth('SIGNED_IN', makeSession()); });
      await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    });

    it('clears the user on sign-out', async () => {
      await setup({
        session: makeSession(),
        responses: { 'profiles.select': { data: makeProfileRow(), error: null } },
      });
      expect(screen.getByTestId('authed')).toHaveTextContent('true');

      await act(async () => { mock.emitAuth('SIGNED_OUT', null); });
      await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));
    });

    it('logout calls through to Supabase', async () => {
      await setup({
        session: makeSession(),
        responses: { 'profiles.select': { data: makeProfileRow(), error: null } },
      });
      await act(async () => { await ctx.logout(); });
      expect(mock.supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const signedIn = (extra = {}) => ({
      session: makeSession(),
      responses: {
        'profiles.select': { data: makeProfileRow(), error: null },
        'profiles.update': { data: makeProfileRow({ name: 'New Name' }), error: null },
        ...extra,
      },
    });

    it('sends only whitelisted fields, mapped to db columns', async () => {
      await setup(signedIn());
      await act(async () => { await ctx.updateUser({ name: 'New Name', phone: '209998888' }); });
      const [call] = mock.callsFor('profiles', 'update');
      expect(call.args.update[0]).toEqual({ name: 'New Name', phone: '209998888' });
    });

    it('drops server-owned fields', async () => {
      await setup(signedIn());
      await act(async () => { await ctx.updateUser({ name: 'New Name', role: 'admin', id: 'hacked' }); });
      const [call] = mock.callsFor('profiles', 'update');
      expect(call.args.update[0]).not.toHaveProperty('role');
      expect(call.args.update[0]).not.toHaveProperty('id');
    });

    it('applies the returned row to state', async () => {
      await setup(signedIn());
      await act(async () => { await ctx.updateUser({ name: 'New Name' }); });
      await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('New Name'));
    });

    it('skips the request when nothing patchable is left', async () => {
      await setup(signedIn());
      await act(async () => { await ctx.updateUser({ role: 'admin' }); });
      expect(mock.callsFor('profiles', 'update')).toHaveLength(0);
    });

    it('sets the Ghana Card when the profile has none', async () => {
      await setup(signedIn());
      await act(async () => { await ctx.updateUser({ ghanaCard: 'GHA-111' }); });
      const [call] = mock.callsFor('profiles', 'update');
      expect(call.args.update[0]).toEqual({ ghana_card: 'GHA-111' });
    });

    it('refuses to change a Ghana Card that is already set', async () => {
      await setup({
        session: makeSession(),
        responses: {
          'profiles.select': { data: makeProfileRow({ ghana_card: 'GHA-000' }), error: null },
          'profiles.update': { data: makeProfileRow(), error: null },
        },
      });
      await act(async () => { await ctx.updateUser({ ghanaCard: 'GHA-999' }); });
      expect(mock.callsFor('profiles', 'update')).toHaveLength(0);
    });

    it('does nothing when signed out', async () => {
      await setup();
      await act(async () => { await ctx.updateUser({ name: 'Nobody' }); });
      expect(mock.callsFor('profiles', 'update')).toHaveLength(0);
    });

    it('leaves state untouched when the update errors', async () => {
      await setup(signedIn({ 'profiles.update': { data: null, error: { message: 'denied' } } }));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await act(async () => { await ctx.updateUser({ name: 'New Name' }); });
      expect(screen.getByTestId('name')).toHaveTextContent('Kwame Mensah');
    });
  });

  describe('saved places', () => {
    const signedIn = (extra = {}) => ({
      session: makeSession(),
      responses: {
        'profiles.select': { data: makeProfileRow(), error: null },
        'saved_places.select': { data: [{ id: 'p1', label: 'Home' }], error: null },
        ...extra,
      },
    });

    it('appends a new place', async () => {
      await setup(signedIn({ 'saved_places.insert': { data: { id: 'p2', label: 'Work' }, error: null } }));
      await act(async () => { await ctx.addSavedPlace({ label: 'Work' }); });
      await waitFor(() => expect(screen.getByTestId('places')).toHaveTextContent('2'));
    });

    it('stamps the place with the user id', async () => {
      await setup(signedIn({ 'saved_places.insert': { data: { id: 'p2' }, error: null } }));
      await act(async () => { await ctx.addSavedPlace({ label: 'Work' }); });
      const [call] = mock.callsFor('saved_places', 'insert');
      expect(call.args.insert[0][0]).toEqual({ user_id: 'u1', label: 'Work' });
    });

    it('does not append when the insert errors', async () => {
      await setup(signedIn({ 'saved_places.insert': { data: null, error: { message: 'nope' } } }));
      await act(async () => { await ctx.addSavedPlace({ label: 'Work' }); });
      expect(screen.getByTestId('places')).toHaveTextContent('1');
    });

    it('removes a place', async () => {
      await setup(signedIn({ 'saved_places.delete': { data: null, error: null } }));
      await act(async () => { await ctx.removeSavedPlace('p1'); });
      await waitFor(() => expect(screen.getByTestId('places')).toHaveTextContent('0'));
    });

    it('keeps the place when the delete errors', async () => {
      await setup(signedIn({ 'saved_places.delete': { data: null, error: { message: 'nope' } } }));
      await act(async () => { await ctx.removeSavedPlace('p1'); });
      expect(screen.getByTestId('places')).toHaveTextContent('1');
    });
  });

  describe('payment methods', () => {
    const signedIn = (extra = {}) => ({
      session: makeSession(),
      responses: {
        'profiles.select': { data: makeProfileRow(), error: null },
        'payment_methods.select': { data: [{ id: 'm1', type: 'card' }], error: null },
        ...extra,
      },
    });

    it('appends a new method', async () => {
      await setup(signedIn({ 'payment_methods.insert': { data: { id: 'm2', type: 'momo' }, error: null } }));
      await act(async () => { await ctx.addPaymentMethod({ type: 'momo' }); });
      await waitFor(() => expect(screen.getByTestId('methods')).toHaveTextContent('2'));
    });

    it('removes a method', async () => {
      await setup(signedIn({ 'payment_methods.delete': { data: null, error: null } }));
      await act(async () => { await ctx.removePaymentMethod('m1'); });
      await waitFor(() => expect(screen.getByTestId('methods')).toHaveTextContent('0'));
    });
  });

  describe('driver actions', () => {
    const asDriver = (extra = {}) => ({
      session: makeSession(),
      responses: {
        'profiles.select': { data: makeProfileRow({ role: 'driver' }), error: null },
        'profiles.update': { data: makeProfileRow({ role: 'driver', verification_status: 'pending' }), error: null },
        ...extra,
      },
    });

    it('setVehicleInfo sends verification back to pending', async () => {
      await setup(asDriver());
      await act(async () => { await ctx.setVehicleInfo({ vehiclePlate: 'GT 1234-24' }); });
      const [call] = mock.callsFor('profiles', 'update');
      expect(call.args.update[0]).toEqual({ vehicle_plate: 'GT 1234-24', verification_status: 'pending' });
    });

    it('submitVerification marks the profile pending', async () => {
      await setup(asDriver());
      await act(async () => { await ctx.submitVerification(); });
      const [call] = mock.callsFor('profiles', 'update');
      expect(call.args.update[0]).toEqual({ verification_status: 'pending' });
    });

    it('setPayoutMethod stores the method', async () => {
      await setup(asDriver());
      await act(async () => { await ctx.setPayoutMethod({ type: 'momo', number: '241234567' }); });
      const [call] = mock.callsFor('profiles', 'update');
      expect(call.args.update[0]).toEqual({ payout_method: { type: 'momo', number: '241234567' } });
    });

    it('driver actions no-op when signed out', async () => {
      await setup();
      await act(async () => {
        await ctx.setVehicleInfo({ vehiclePlate: 'X' });
        await ctx.submitVerification();
        await ctx.setPayoutMethod({ type: 'momo' });
      });
      expect(mock.callsFor('profiles', 'update')).toHaveLength(0);
    });
  });
});
