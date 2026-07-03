// Simulated incoming live-hail requests for an online driver (singleton,
// mirrors services/liveTracking.js's subscribe shape).
//
// This is a self-contained mock — NOT wired to any real passenger booking.
// There is no backend, so a passenger's real request in one browser tab
// cannot notify a specific driver's session elsewhere. A real backend could
// replace this file's internals behind the same subscribe/accept/decline/
// completeActive API without any screen needing to change — the same seam
// philosophy as services/api.js.

import { hashString, mulberry32, range, pick } from '../utils/random';

const SPAWN_CHECK_MS = 5000;
const SPAWN_CHANCE = 0.5; // per check, while online/idle
export const REQUEST_TTL_MS = 15000; // Uber/Bolt-style accept/decline countdown

const PASSENGER_NAMES = ['Kwame A.', 'Ama S.', 'Kofi M.', 'Efua B.', 'Yaw O.', 'Adjoa K.', 'Kwesi D.', 'Akosua N.', 'Kojo P.', 'Abena T.'];
const DESTINATIONS = ['Circle', 'Kaneshie', 'Madina', 'Tema Station', 'Achimota', 'Airport', 'Osu', 'Legon', 'Accra Mall', 'Lapaz', 'Adenta', 'Spintex'];

let online = false;
let driverPos = null;
let requests = [];
let activeRequest = null;
let spawnTimer = null;
const subscribers = new Set();

const notify = () => subscribers.forEach((cb) => cb({ online, requests, activeRequest }));

const spawnRequest = () => {
  if (!driverPos) return;
  // Seeded per-spawn but deliberately includes Date.now()/Math.random() —
  // unlike scheduledTrips.js's stable seeds, this should feel "live", not
  // reproducible across refreshes.
  const rng = mulberry32(hashString(`req-${Date.now()}-${Math.random()}`));
  const [lat, lng] = driverPos;
  const angle = rng() * Math.PI * 2;
  const distKm = range(rng, 0.3, 2.5);
  const dLat = (distKm / 111) * Math.cos(angle);
  const dLng = (distKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

  requests = [
    ...requests,
    {
      id: `req_${Date.now()}`,
      passengerName: pick(rng, PASSENGER_NAMES),
      pickup: [lat + dLat, lng + dLng],
      destinationName: pick(rng, DESTINATIONS),
      distanceKm: +distKm.toFixed(1),
      fareEstimate: Math.round(range(rng, 8, 35)),
      expiresAt: Date.now() + REQUEST_TTL_MS,
    },
  ];
  notify();
};

const ensureSpawning = () => {
  if (spawnTimer) return;
  spawnTimer = setInterval(() => {
    if (online && !activeRequest && requests.length === 0 && Math.random() < SPAWN_CHANCE) spawnRequest();
  }, SPAWN_CHECK_MS);
};

const stopSpawning = () => {
  clearInterval(spawnTimer);
  spawnTimer = null;
};

export const driverHail = {
  goOnline(position) {
    online = true;
    driverPos = position;
    ensureSpawning();
    notify();
  },
  goOffline() {
    online = false;
    requests = [];
    stopSpawning();
    notify();
  },
  accept(requestId) {
    activeRequest = requests.find((r) => r.id === requestId) || activeRequest;
    requests = [];
    notify();
  },
  // Used for both an explicit decline tap and a countdown reaching zero —
  // the overlay component owns the per-request timer and calls this either way.
  decline(requestId) {
    requests = requests.filter((r) => r.id !== requestId);
    notify();
  },
  completeActive() {
    activeRequest = null;
    notify();
  },
  getState: () => ({ online, requests, activeRequest }),
  subscribe(cb) {
    subscribers.add(cb);
    cb({ online, requests, activeRequest });
    return () => subscribers.delete(cb);
  },
};
