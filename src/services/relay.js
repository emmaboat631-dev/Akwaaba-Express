// Supabase Realtime relay — replaces the LAN WebSocket relay with Supabase
// Broadcast channels so driver/passenger sync works over the internet.
//
// API surface is identical to the old relay: ensure(), send(), subscribe(),
// onMessage(), getBooking(), connected. No consumer code needs to change.

import { supabase } from '../lib/supabase';

const stateListeners = new Set();
const rawListeners = new Set();

let connected = false;
let driversChannel = null;
let hailChannel = null;

const drivers = new Map();
const bookings = new Map();

const snapshot = () => ({ connected, drivers: [...drivers.values()], bookings: [...bookings.values()] });
const emit = () => stateListeners.forEach((cb) => cb(snapshot()));

const fold = (m) => {
  switch (m.type) {
    case 'driver:online':
      if (m.driverId) drivers.set(m.driverId, m);
      break;
    case 'driver:position': {
      const cur = m.driverId && drivers.get(m.driverId);
      if (cur?.bus && m.position) {
        drivers.set(m.driverId, { ...cur, bus: { ...cur.bus, position: m.position, origin: m.position, etaMin: m.etaMin ?? cur.bus.etaMin } });
      }
      break;
    }
    case 'driver:offline':
      drivers.delete(m.driverId);
      break;
    case 'booking:new':
      if (m.booking?.id) bookings.set(m.booking.id, m.booking);
      break;
    default:
      break;
  }
};

// Two channels:
//   "drivers" — presence + broadcast for driver:online/offline/position
//   "hail"    — broadcast for hail:*, booking:new, ticket:checkedin
function connect() {
  if (driversChannel) return;

  // --- Drivers channel with Presence ---
  driversChannel = supabase.channel('drivers', {
    config: { broadcast: { self: false }, presence: { key: '' } },
  });

  driversChannel
    .on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (!payload) return;
      fold(payload);
      rawListeners.forEach((cb) => cb(payload));
      emit();
    })
    .on('presence', { event: 'sync' }, () => {
      // Rebuild drivers from presence state on sync.
      const state = driversChannel.presenceState();
      drivers.clear();
      Object.values(state).forEach((presences) => {
        presences.forEach((p) => {
          if (p.driverId) {
            const entry = { type: 'driver:online', driverId: p.driverId, bus: p.bus };
            drivers.set(p.driverId, entry);
          }
        });
      });
      emit();
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach((p) => {
        if (p.driverId) {
          drivers.delete(p.driverId);
          const msg = { type: 'driver:offline', driverId: p.driverId };
          rawListeners.forEach((cb) => cb(msg));
        }
      });
      emit();
    })
    .subscribe((status) => {
      connected = status === 'SUBSCRIBED';
      emit();
    });

  // --- Hail channel for transient events ---
  hailChannel = supabase.channel('hail', {
    config: { broadcast: { self: false } },
  });

  hailChannel
    .on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (!payload) return;
      fold(payload);
      rawListeners.forEach((cb) => cb(payload));
      emit();
    })
    .subscribe();
}

export const relay = {
  ensure() { connect(); },

  send(type, payload = {}) {
    const msg = { type, ...payload };
    fold(msg);
    emit();

    // Route state-mutating driver events through presence + drivers broadcast,
    // everything else through the hail broadcast channel.
    if (type === 'driver:online' && msg.bus) {
      driversChannel?.send({
        type: 'broadcast',
        event: 'msg',
        payload: msg,
      });
      driversChannel?.track({ driverId: msg.driverId, bus: msg.bus });
    } else if (type === 'driver:position') {
      driversChannel?.send({
        type: 'broadcast',
        event: 'msg',
        payload: msg,
      });
      // Update presence with new position.
      const cur = drivers.get(msg.driverId);
      if (cur?.bus) {
        driversChannel?.track({ driverId: msg.driverId, bus: cur.bus });
      }
    } else if (type === 'driver:offline') {
      driversChannel?.send({
        type: 'broadcast',
        event: 'msg',
        payload: msg,
      });
      driversChannel?.untrack();
    } else {
      hailChannel?.send({
        type: 'broadcast',
        event: 'msg',
        payload: msg,
      });
    }
  },

  subscribe(cb) {
    stateListeners.add(cb);
    connect();
    cb(snapshot());
    return () => stateListeners.delete(cb);
  },

  onMessage(cb) {
    rawListeners.add(cb);
    connect();
    return () => rawListeners.delete(cb);
  },

  getBooking(id) { return bookings.get(id); },
  get connected() { return connected; },
};
