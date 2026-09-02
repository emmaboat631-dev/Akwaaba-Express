// Road-following route via OpenRouteService (free tier: 2,000 req/day).
// Falls back to a straight line if the API is unreachable.

const ORS_KEY = import.meta.env.VITE_ORS_API_KEY || '';
const BASE = 'https://api.openrouteservice.org/v2/directions/driving-car';

const cache = new Map();

const cacheKey = (from, to) =>
  `${from[0].toFixed(4)},${from[1].toFixed(4)}|${to[0].toFixed(4)},${to[1].toFixed(4)}`;

// In-flight dedup — don't fire duplicate requests for the same pair.
const inflight = new Map();

/**
 * Fetch a road-following route between two [lat, lng] points.
 * Returns an array of [lat, lng] waypoints for a Leaflet Polyline.
 * Falls back to a straight line on error or missing API key.
 */
export async function getRoute(from, to) {
  if (!from || !to) return null;

  const key = cacheKey(from, to);
  if (cache.has(key)) return cache.get(key);

  if (!ORS_KEY) {
    const line = [from, to];
    cache.set(key, line);
    return line;
  }

  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    try {
      // ORS expects [lng, lat] (GeoJSON order), not [lat, lng].
      const url = `${BASE}?api_key=${ORS_KEY}&start=${from[1]},${from[0]}&end=${to[1]},${to[0]}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ORS ${res.status}`);

      const json = await res.json();
      const coords = json.features?.[0]?.geometry?.coordinates;
      if (!coords || coords.length === 0) throw new Error('No route');

      // Convert [lng, lat] back to [lat, lng] for Leaflet.
      const points = coords.map(([lng, lat]) => [lat, lng]);
      cache.set(key, points);
      return points;
    } catch (err) {
      console.warn('ORS routing fallback:', err.message);
      const line = [from, to];
      cache.set(key, line);
      return line;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/**
 * Clear the route cache (useful if the API key changes at runtime).
 */
export function clearRouteCache() {
  cache.clear();
}
