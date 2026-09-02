// Static "available buses around you" — Uber-style. Buses are placed at fixed
// points around the user's current location and DON'T move on their own, so the
// map stays calm. Cached as a singleton keyed by (rounded) location so Home,
// LiveBuses and LiveTracking all share the same set (ids stay consistent).

import { OPERATORS, BUS_TYPES, FARE } from '../data/operators';
import { haversineKm } from '../utils/geo';
import { mulberry32, hashString, intRange, range, pick } from '../utils/random';

const DESTINATIONS = ['Circle', 'Kaneshie', 'Madina', 'Tema Station', 'Achimota', 'Airport', 'Osu', 'Legon', 'Accra Mall', 'Lapaz', 'Adenta', 'Spintex'];

const keyOf = (center) => center.map((n) => n.toFixed(2)).join(',');

const generateNearbyBuses = (center) => {
  const [lat, lng] = center;
  const rng = mulberry32(hashString(keyOf(center)));
  const count = intRange(rng, 6, 8);
  const out = [];

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const distKm = range(rng, 0.4, 3.2);
    const dLat = (distKm / 111) * Math.cos(angle);
    const dLng = (distKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    const position = [lat + dLat, lng + dLng];

    const operator = OPERATORS[intRange(rng, 0, OPERATORS.length - 1)];
    const busType = i % 3 === 0 ? BUS_TYPES[2] : BUS_TYPES[1];
    const dest = pick(rng, DESTINATIONS);
    const km = haversineKm(position, center);
    const etaMin = Math.max(1, Math.round((km / 22) * 60));
    const price = Math.max(4, Math.round((FARE.base + FARE.perKm * km) * busType.priceMult * 0.5));

    out.push({
      id: `near_${i}`,
      type: 'live',
      operatorId: operator.id,
      busTypeId: busType.id,
      plate: `GT ${intRange(rng, 1000, 9999)}-${intRange(rng, 20, 24)}`,
      destinationName: dest,
      routeName: `To ${dest}`,
      route: [position, center], // bus -> you, used by the tracking view
      position,
      origin: position,
      etaMin,
      seatsAvailable: intRange(rng, 2, 16),
      seatsTotal: busType.seats,
      pricePerSeat: price,
    });
  }

  return out.sort((a, b) => a.etaMin - b.etaMin);
};

let cacheKey = null;
let cache = [];

export const getNearbyBuses = (center) => {
  const key = keyOf(center);
  if (key !== cacheKey) {
    cacheKey = key;
    cache = generateNearbyBuses(center);
  }
  return cache;
};

