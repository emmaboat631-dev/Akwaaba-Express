// Cities — fetched from Supabase on boot, hardcoded fallback for offline/instant render.

import { supabase } from '../lib/supabase';

const FALLBACK = [
  { id: 'accra', name: 'Accra', region: 'Greater Accra', lat: 5.6037, lng: -0.187 },
  { id: 'kumasi', name: 'Kumasi', region: 'Ashanti', lat: 6.6885, lng: -1.6244 },
  { id: 'takoradi', name: 'Takoradi', region: 'Western', lat: 4.8845, lng: -1.7554 },
  { id: 'capecoast', name: 'Cape Coast', region: 'Central', lat: 5.1053, lng: -1.2466 },
  { id: 'tamale', name: 'Tamale', region: 'Northern', lat: 9.4008, lng: -0.8393 },
  { id: 'ho', name: 'Ho', region: 'Volta', lat: 6.611, lng: 0.471 },
  { id: 'koforidua', name: 'Koforidua', region: 'Eastern', lat: 6.094, lng: -0.2591 },
  { id: 'sunyani', name: 'Sunyani', region: 'Bono', lat: 7.3349, lng: -2.3123 },
  { id: 'techiman', name: 'Techiman', region: 'Bono East', lat: 7.5907, lng: -1.939 },
  { id: 'tema', name: 'Tema', region: 'Greater Accra', lat: 5.6698, lng: -0.0166 },
  { id: 'bolgatanga', name: 'Bolgatanga', region: 'Upper East', lat: 10.7856, lng: -0.8514 },
  { id: 'wa', name: 'Wa', region: 'Upper West', lat: 10.0607, lng: -2.5099 },
  { id: 'navrongo', name: 'Navrongo', region: 'Upper East', lat: 10.8956, lng: -1.0921 },
  { id: 'bawku', name: 'Bawku', region: 'Upper East', lat: 11.0616, lng: -0.2417 },
  { id: 'yendi', name: 'Yendi', region: 'Northern', lat: 9.4427, lng: -0.0099 },
  { id: 'obuasi', name: 'Obuasi', region: 'Ashanti', lat: 6.2059, lng: -1.6834 },
  { id: 'asantemampong', name: 'Asante Mampong', region: 'Ashanti', lat: 7.0627, lng: -1.4001 },
  { id: 'asantebekwai', name: 'Asante Bekwai', region: 'Ashanti', lat: 6.4533, lng: -1.5819 },
  { id: 'dunkwa', name: 'Dunkwa-on-Offin', region: 'Central', lat: 5.9656, lng: -1.78 },
  { id: 'kintampo', name: 'Kintampo', region: 'Bono East', lat: 8.0563, lng: -1.7306 },
  { id: 'tarkwa', name: 'Tarkwa', region: 'Western', lat: 5.3005, lng: -1.9922 },
  { id: 'ejura', name: 'Ejura', region: 'Ashanti', lat: 7.3856, lng: -1.3562 },
  { id: 'wenchi', name: 'Wenchi', region: 'Bono', lat: 7.7333, lng: -2.1 },
  { id: 'dormaa', name: 'Dormaa Ahenkro', region: 'Bono', lat: 7.2795, lng: -2.8797 },
  { id: 'nsawkaw', name: 'Nsawkaw', region: 'Bono', lat: 7.8744, lng: -2.3166 },
];

export let CITIES = [...FALLBACK];

let fetched = false;
const fetchPromise = supabase
  .from('cities')
  .select('*')
  .order('name')
  .then(({ data }) => {
    if (data?.length) {
      CITIES = data;
      fetched = true;
    }
  })
  .catch(() => {});

export const citiesReady = fetchPromise;

export const cityById = (id) => CITIES.find((c) => c.id === id);

export const POPULAR_ROUTES = [
  { fromId: 'accra', toId: 'kumasi' },
  { fromId: 'accra', toId: 'takoradi' },
  { fromId: 'kumasi', toId: 'tamale' },
  { fromId: 'accra', toId: 'capecoast' },
];
