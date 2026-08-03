// Real road routing via OSRM's public demo API (open source, open data — same
// engine you'd self-host in production). Returns a polyline that follows real
// roads instead of the straight line we were drawing before.
//
// This is a client-only fetch — nothing else has to change to swap in a
// self-hosted OSRM later; just point OSRM_HOST at your own instance.
//
// OSRM's public demo is rate-limited and not for production, but it's fine
// for a prototype. Route responses are cached in memory so the same request
// isn't re-hit as the driver moves.

const OSRM_HOST = 'https://router.project-osrm.org';

// Round coords to ~10 m so a driver's GPS jitter doesn't invalidate the cache
// every tick; a route from point A → B doesn't meaningfully change over 10 m.
const key = (from, to, profile) =>
  `${profile}|${from[0].toFixed(4)},${from[1].toFixed(4)}|${to[0].toFixed(4)},${to[1].toFixed(4)}`;

const cache = new Map(); // key -> route object
const inflight = new Map(); // key -> Promise (dedupe concurrent requests)

// Decode OSRM's polyline5 format into an array of [lat,lng] points.
// (Adapted from the standard polyline algorithm — kept inline so we don't add
// a dep for a 20-line helper.)
const decodePolyline = (str, precision = 5) => {
  const factor = 10 ** precision;
  let index = 0, lat = 0, lng = 0;
  const out = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    out.push([lat / factor, lng / factor]);
  }
  return out;
};

// profile: 'driving' (default) | 'walking' | 'cycling'
export const fetchRoute = async (from, to, profile = 'driving') => {
  if (!from || !to) return null;
  const k = key(from, to, profile);
  if (cache.has(k)) return cache.get(k);
  if (inflight.has(k)) return inflight.get(k);

  const url =
    `${OSRM_HOST}/route/v1/${profile}/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=polyline&alternatives=false&steps=false`;

  const req = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`OSRM ${r.status}`))))
    .then((data) => {
      const r = data.routes?.[0];
      if (!r) throw new Error('No route');
      const route = {
        polyline: decodePolyline(r.geometry),
        distanceM: r.distance,
        durationS: r.duration,
        profile,
        fetchedAt: Date.now(),
      };
      cache.set(k, route);
      inflight.delete(k);
      return route;
    })
    .catch((err) => {
      inflight.delete(k);
      throw err;
    });

  inflight.set(k, req);
  return req;
};

// Clear a cached route — used when we deliberately want to reroute from a
// slightly different origin (off-route case).
export const invalidateRoute = (from, to, profile = 'driving') => {
  cache.delete(key(from, to, profile));
};
