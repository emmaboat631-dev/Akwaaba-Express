// Bus operators + bus classes used across live and scheduled trips.

// Colors are deep, muted brand tones (they double as text on soft tints in
// OperatorMark, and as the solid ticket band); `mark` is the monogram shown
// where a real logo would sit.
export const OPERATORS = [
  { id: 'stc', name: 'STC Intercity', mark: 'STC', color: '#274F9E', rating: 4.6 },
  { id: 'vip', name: 'VIP Jeoun', mark: 'VIP', color: '#B5544A', rating: 4.8 },
  { id: 'oa', name: 'OA Travel & Tours', mark: 'OA', color: '#1F6B44', rating: 4.5 },
  { id: 'metro', name: 'Metro Mass', mark: 'MM', color: '#B9822B', rating: 4.1 },
  { id: 'aaba', name: 'Aaba Express', mark: 'AE', color: '#5B3BA8', rating: 4.7 },
];

export const operatorById = (id) => OPERATORS.find((o) => o.id === id);

// Bus classes — drive price, capacity and amenities.
export const BUS_TYPES = [
  {
    id: 'vip',
    name: 'VIP',
    priceMult: 1.6,
    seats: 33,
    cols: [2, 1], // 2 seats | aisle | 1 seat
    amenities: ['Air conditioning', 'Reclining seats', 'WiFi', 'USB charging', 'On-board TV'],
  },
  {
    id: 'standard',
    name: 'Standard',
    priceMult: 1.0,
    seats: 44,
    cols: [2, 2],
    amenities: ['Air conditioning', 'USB charging', 'Reading light'],
  },
  {
    id: 'mini',
    name: 'Mini Coach',
    priceMult: 0.7,
    seats: 18,
    cols: [2, 1],
    amenities: ['Fan', 'Frequent stops'],
  },
];

export const busTypeById = (id) => BUS_TYPES.find((b) => b.id === id);

// Base fare model: a fixed boarding fee + per-km rate (GH₵).
export const FARE = { base: 8, perKm: 0.42 };
