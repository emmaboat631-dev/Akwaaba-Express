// Seed for the "live" Uber-style experience: buses already on the road around
// Accra that you can hail and hop onto. Each bus carries a route polyline that
// the live-tracking engine animates.

import { OPERATORS, BUS_TYPES, FARE } from './operators';
import { routeLengthKm } from '../utils/geo';

export const ACCRA_CENTER = [5.6037, -0.187];

// Recognisable Accra nodes (lat, lng).
const P = {
  circle: [5.5707, -0.2074],
  kaneshie: [5.5631, -0.239],
  madina: [5.6836, -0.166],
  temaStation: [5.55, -0.203],
  achimota: [5.619, -0.227],
  airport: [5.6052, -0.1668],
  osu: [5.556, -0.182],
  legon: [5.65, -0.187],
  mall: [5.621, -0.171],
  lapaz: [5.608, -0.254],
  station37: [5.586, -0.182],
  adenta: [5.708, -0.162],
  spintex: [5.635, -0.115],
  laboneJunction: [5.566, -0.168],
};

// A handful of believable city routes (named so we can label destinations).
const ROUTES = [
  { name: 'Kaneshie → Madina', points: [P.kaneshie, P.circle, P.station37, P.legon, P.madina] },
  { name: 'Tema Station → Adenta', points: [P.temaStation, P.osu, P.laboneJunction, P.mall, P.adenta] },
  { name: 'Circle → Spintex', points: [P.circle, P.station37, P.airport, P.mall, P.spintex] },
  { name: 'Lapaz → Airport', points: [P.lapaz, P.achimota, P.legon, P.airport] },
  { name: 'Achimota → Osu', points: [P.achimota, P.circle, P.station37, P.laboneJunction, P.osu] },
  { name: 'Madina → Kaneshie', points: [P.madina, P.legon, P.station37, P.circle, P.kaneshie] },
  { name: 'Spintex → Circle', points: [P.spintex, P.mall, P.airport, P.station37, P.circle] },
  { name: 'Adenta → Tema Station', points: [P.adenta, P.mall, P.laboneJunction, P.osu, P.temaStation] },
];

const PLATES = ['GT 482-21', 'GR 1190-22', 'AS 7732-20', 'GW 3081-23', 'GE 5567-21', 'GR 9043-24', 'GT 2218-22', 'GS 4410-23'];

export const seedLiveBuses = () =>
  ROUTES.map((route, i) => {
    const operator = OPERATORS[i % OPERATORS.length];
    // Live city buses are mostly Standard / Mini coaches.
    const busType = i % 3 === 0 ? BUS_TYPES[2] : BUS_TYPES[1];
    const km = routeLengthKm(route.points);
    const price = Math.max(4, Math.round((FARE.base + FARE.perKm * km) * busType.priceMult * 0.5));
    return {
      id: `live_${i}`,
      type: 'live',
      operatorId: operator.id,
      busTypeId: busType.id,
      plate: PLATES[i],
      destinationName: route.name.split(' → ')[1],
      routeName: route.name,
      route: route.points,
      seatsAvailable: 3 + ((i * 7) % 12),
      seatsTotal: busType.seats,
      pricePerSeat: price,
      // Animation state (mutated by the tracking engine):
      segIndex: i % (route.points.length - 1),
      segT: (i * 0.17) % 1,
      direction: 1,
      speed: 0.16 + (i % 4) * 0.05, // progress units per tick
      position: route.points[i % (route.points.length - 1)],
      etaMin: 4 + (i % 9),
    };
  });
