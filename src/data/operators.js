// Operators + bus types — fetched from Supabase on boot, hardcoded fallback for instant render.

import { supabase } from '../lib/supabase';

const OPERATORS_FALLBACK = [
  { id: 'stc', name: 'STC Intercity', mark: 'STC', color: '#274F9E', rating: 4.6 },
  { id: 'vip', name: 'VIP Jeoun', mark: 'VIP', color: '#B5544A', rating: 4.8 },
  { id: 'oa', name: 'OA Travel & Tours', mark: 'OA', color: '#1F6B44', rating: 4.5 },
  { id: 'metro', name: 'Metro Mass', mark: 'MM', color: '#B9822B', rating: 4.1 },
  { id: 'aaba', name: 'Aaba Express', mark: 'AE', color: '#5B3BA8', rating: 4.7 },
];

const BUS_TYPES_FALLBACK = [
  {
    id: 'vip', name: 'VIP', priceMult: 1.6, seats: 33, cols: [2, 1],
    amenities: ['Air conditioning', 'Reclining seats', 'WiFi', 'USB charging', 'On-board TV'],
  },
  {
    id: 'standard', name: 'Standard', priceMult: 1.0, seats: 44, cols: [2, 2],
    amenities: ['Air conditioning', 'USB charging', 'Reading light'],
  },
  {
    id: 'mini', name: 'Mini Coach', priceMult: 0.7, seats: 18, cols: [2, 1],
    amenities: ['Fan', 'Frequent stops'],
  },
];

export let OPERATORS = [...OPERATORS_FALLBACK];
export let BUS_TYPES = [...BUS_TYPES_FALLBACK];

const fetchPromise = Promise.all([
  supabase.from('operators').select('*').order('name'),
  supabase.from('bus_types').select('*').order('name'),
]).then(([opRes, btRes]) => {
  if (opRes.data?.length) OPERATORS = opRes.data;
  if (btRes.data?.length) {
    BUS_TYPES = btRes.data.map((bt) => ({
      ...bt,
      priceMult: Number(bt.price_mult ?? bt.priceMult ?? 1),
      cols: bt.cols || [2, 2],
    }));
  }
}).catch(() => {});

export const operatorsReady = fetchPromise;

export const operatorById = (id) => OPERATORS.find((o) => o.id === id);
export const busTypeById = (id) => BUS_TYPES.find((b) => b.id === id);

export const FARE = { base: 8, perKm: 0.42 };
