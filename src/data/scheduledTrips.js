// Deterministic generator for scheduled intercity trips (flight-style booking).
// Same route + date always yields the same trips, so navigating back/forward
// or refreshing keeps results stable without a backend.

import { cityById } from './cities';
import { OPERATORS, BUS_TYPES, FARE } from './operators';
import { haversineKm } from '../utils/geo';
import { hashString, mulberry32, intRange, range } from '../utils/random';

const AVG_KMH = 56;

const buildTakenSeats = (rng, total) => {
  const count = intRange(rng, Math.floor(total * 0.2), Math.floor(total * 0.7));
  const taken = new Set();
  while (taken.size < count) taken.add(intRange(rng, 1, total));
  return [...taken];
};

export const generateTrips = (fromId, toId, dateISO) => {
  const from = cityById(fromId);
  const to = cityById(toId);
  if (!from || !to || fromId === toId) return [];

  const km = haversineKm([from.lat, from.lng], [to.lat, to.lng]);
  const rng = mulberry32(hashString(`${fromId}-${toId}-${dateISO}`));
  const tripCount = intRange(rng, 5, 8);

  const trips = [];
  for (let i = 0; i < tripCount; i++) {
    const operator = OPERATORS[intRange(rng, 0, OPERATORS.length - 1)];
    const busType = BUS_TYPES[intRange(rng, 0, BUS_TYPES.length - 1)];

    const departMins = intRange(rng, 5 * 60, 20 * 60); // 05:00 – 20:00
    const baseDuration = (km / AVG_KMH) * 60;
    const durationMins = Math.round(
      baseDuration * (busType.id === 'mini' ? 1.25 : busType.id === 'vip' ? 0.95 : 1.08) +
        range(rng, 0, 25),
    );
    const price = Math.round((FARE.base + FARE.perKm * km) * busType.priceMult);
    const seatsTaken = buildTakenSeats(rng, busType.seats);

    trips.push({
      id: `${fromId}__${toId}__${dateISO}__${i}`,
      type: 'scheduled',
      fromId,
      toId,
      dateISO,
      operatorId: operator.id,
      busTypeId: busType.id,
      plate: `GR ${intRange(rng, 1000, 9999)}-${intRange(rng, 10, 24)}`,
      departMins,
      arriveMins: departMins + durationMins,
      durationMins,
      price,
      seatsTotal: busType.seats,
      seatsTaken,
      seatsAvailable: busType.seats - seatsTaken.length,
      amenities: busType.amenities,
      distanceKm: Math.round(km),
    });
  }

  return trips.sort((a, b) => a.departMins - b.departMins);
};

// Find a single trip by its composite id (so /trip/:id survives refresh).
export const findTripById = (tripId) => {
  const parts = String(tripId).split('__');
  if (parts.length !== 4) return null;
  const [fromId, toId, dateISO, index] = parts;
  const trips = generateTrips(fromId, toId, dateISO);
  return trips[Number(index)] || null;
};
