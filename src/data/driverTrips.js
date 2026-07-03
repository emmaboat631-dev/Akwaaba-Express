// Deterministic generator for a driver's scheduled coach assignment — mirrors
// scheduledTrips.js exactly. Same driver + date always yields the same
// operator/route/bus/plate/time (like a real duty roster), so refreshing or
// navigating back/forward keeps "today's trip" stable without a backend.

import { CITIES, cityById } from './cities';
import { OPERATORS, BUS_TYPES, FARE } from './operators';
import { haversineKm } from '../utils/geo';
import { hashString, mulberry32, intRange, range, pick } from '../utils/random';

const AVG_KMH = 56;

// Single source of truth for "what day is it" across driver data/state, so
// the assigned-trip generator and DriverContext's daily rollover always agree.
export const todayISO = () => new Date().toISOString().slice(0, 10);
const FIRST_NAMES = ['Kwame', 'Ama', 'Kofi', 'Efua', 'Yaw', 'Adjoa', 'Kwesi', 'Akosua', 'Kojo', 'Abena', 'Yaa', 'Kwabena'];
const LAST_NAMES = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Agyeman', 'Darko', 'Appiah', 'Adjei', 'Nkrumah'];
const PHONE_PREFIXES = ['020', '024', '026', '027', '050', '054', '055', '059'];

const buildTakenSeats = (rng, total) => {
  const count = intRange(rng, Math.floor(total * 0.2), Math.floor(total * 0.7));
  const taken = new Set();
  while (taken.size < count) taken.add(intRange(rng, 1, total));
  return [...taken];
};

// Assigns a driver their "today" trip: one operator + route + bus type +
// plate + time, seeded by driver id + date — stable all day, changes day to
// day, no stored roster needed.
export const generateAssignedTrip = (driverId, dateISO) => {
  const rng = mulberry32(hashString(`${driverId}-${dateISO}-assignment`));
  const from = cityById('accra');
  const toCity = pick(rng, CITIES.filter((c) => c.id !== 'accra'));
  const operator = pick(rng, OPERATORS);
  const busType = pick(rng, BUS_TYPES);

  const km = haversineKm([from.lat, from.lng], [toCity.lat, toCity.lng]);
  const departMins = intRange(rng, 6 * 60, 16 * 60);
  const durationMins = Math.round(
    (km / AVG_KMH) * 60 * (busType.id === 'mini' ? 1.25 : busType.id === 'vip' ? 0.95 : 1.08) +
      range(rng, 0, 25),
  );
  const seatsTaken = buildTakenSeats(rng, busType.seats);
  const price = Math.round((FARE.base + FARE.perKm * km) * busType.priceMult);

  return {
    id: `assign__${driverId}__${dateISO}`,
    driverId,
    dateISO,
    fromId: 'accra',
    toId: toCity.id,
    operatorId: operator.id,
    busTypeId: busType.id,
    plate: `GR ${intRange(rng, 1000, 9999)}-${intRange(rng, 10, 24)}`,
    departMins,
    arriveMins: departMins + durationMins,
    durationMins,
    seatsTotal: busType.seats,
    seatsTaken,
    seatsAvailable: busType.seats - seatsTaken.length,
    distanceKm: Math.round(km),
    price,
    earningsAmount: price * seatsTaken.length,
  };
};

// Reconstructs an assigned trip from its composite id (so /driver/trip/:id
// survives a refresh), mirroring scheduledTrips.js's findTripById.
export const findAssignedTripById = (tripId) => {
  const parts = String(tripId).split('__');
  if (parts.length !== 3 || parts[0] !== 'assign') return null;
  const [, driverId, dateISO] = parts;
  return generateAssignedTrip(driverId, dateISO);
};

// Seat-by-seat passenger manifest for the trip's taken seats — deterministic
// per trip id, so names/phones don't reshuffle on every render.
export const generateManifest = (assignedTrip) => {
  const rng = mulberry32(hashString(assignedTrip.id + '-manifest'));
  return [...assignedTrip.seatsTaken]
    .sort((a, b) => a - b)
    .map((seatNo) => {
      const digits = String(intRange(rng, 1000000, 9999999));
      return {
        seatNo,
        passengerName: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
        phone: `${pick(rng, PHONE_PREFIXES)} ${digits.slice(0, 3)} ${digits.slice(3)}`,
        boarded: false,
      };
    });
};
