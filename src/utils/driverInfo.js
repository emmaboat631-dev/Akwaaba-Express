// Extracts contact info for the driver of a booked live trip. Real drivers
// (broadcast via the LAN relay) carry their own name/phone in the bus payload
// — for the simulated buses populating the map when nobody's online, we
// synthesize plausible details deterministically from the bus id so a given
// trip always shows the same "driver."

import { hashString, mulberry32, pick } from './random';

const FIRST_NAMES = ['Kwame', 'Ama', 'Kofi', 'Efua', 'Yaw', 'Adjoa', 'Kwesi', 'Akosua', 'Kojo', 'Abena', 'Yaa', 'Kwabena'];
const LAST_NAMES = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Agyeman', 'Darko', 'Appiah', 'Adjei', 'Nkrumah'];
const PREFIXES = ['020', '024', '026', '027', '050', '054', '055', '059'];

const synthesize = (busId) => {
  const rng = mulberry32(hashString(String(busId || 'anon') + '-driver'));
  const first = pick(rng, FIRST_NAMES);
  const last = pick(rng, LAST_NAMES);
  const num = Math.floor(rng() * 9000000) + 1000000;
  const digits = String(num);
  return { name: `${first} ${last}`, phone: `${pick(rng, PREFIXES)} ${digits.slice(0, 3)} ${digits.slice(3)}` };
};

// Given the `trip` snapshot stored on a live booking, return { name, phone,
// vehicleModel, vehicleColor, synthesized } — `synthesized` is true when we
// generated the info because no real driver was attached (simulated bg bus).
export const driverInfoFor = (trip) => {
  if (!trip) return { name: 'Driver', phone: '', synthesized: true };
  if (trip.driverName || trip.driverPhone) {
    return {
      name: trip.driverName || 'Driver',
      phone: trip.driverPhone || '',
      vehicleModel: trip.vehicleModel || null,
      vehicleColor: trip.vehicleColor || null,
      synthesized: false,
    };
  }
  return { ...synthesize(trip.id), vehicleModel: null, vehicleColor: null, synthesized: true };
};
