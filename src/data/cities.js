// Major Ghana cities with coordinates, used for intercity scheduled trips.

export const CITIES = [
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
];

export const cityById = (id) => CITIES.find((c) => c.id === id);

// Default popular routes shown on the search screen.
export const POPULAR_ROUTES = [
  { fromId: 'accra', toId: 'kumasi' },
  { fromId: 'accra', toId: 'takoradi' },
  { fromId: 'kumasi', toId: 'tamale' },
  { fromId: 'accra', toId: 'capecoast' },
];
