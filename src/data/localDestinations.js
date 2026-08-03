// Local hop destinations for the live-hail driver flow — suburbs and known
// landmarks the driver might actually be heading to on a city shift. Distinct
// from src/data/cities.js (which is intercity — Accra ↔ Kumasi ↔ Tamale).
//
// Coordinates are approximate, borrowed from src/data/liveBuses.js's P map so
// they line up with where the simulated buses already run.

export const LOCAL_DESTINATIONS = [
  { id: 'circle',            name: 'Circle',           area: 'Accra Central',   lat: 5.5707, lng: -0.2074 },
  { id: 'kaneshie',          name: 'Kaneshie',         area: 'Accra West',      lat: 5.5631, lng: -0.239  },
  { id: 'madina',            name: 'Madina',           area: 'Greater Accra',   lat: 5.6836, lng: -0.166  },
  { id: 'tema-station',      name: 'Tema Station',     area: 'Accra Central',   lat: 5.55,   lng: -0.203  },
  { id: 'achimota',          name: 'Achimota',         area: 'Accra North',     lat: 5.619,  lng: -0.227  },
  { id: 'airport',           name: 'Airport',          area: 'Accra North',     lat: 5.6052, lng: -0.1668 },
  { id: 'osu',               name: 'Osu',              area: 'Accra Central',   lat: 5.556,  lng: -0.182  },
  { id: 'legon',             name: 'Legon',            area: 'Accra North',     lat: 5.65,   lng: -0.187  },
  { id: 'accra-mall',        name: 'Accra Mall',       area: 'Accra North',     lat: 5.621,  lng: -0.171  },
  { id: 'lapaz',             name: 'Lapaz',            area: 'Accra West',      lat: 5.608,  lng: -0.254  },
  { id: 'station-37',        name: 'Station 37',       area: 'Accra Central',   lat: 5.586,  lng: -0.182  },
  { id: 'adenta',            name: 'Adenta',           area: 'Greater Accra',   lat: 5.708,  lng: -0.162  },
  { id: 'spintex',           name: 'Spintex',          area: 'East Accra',      lat: 5.635,  lng: -0.115  },
  { id: 'labone-junction',   name: 'Labone Junction',  area: 'Accra Central',   lat: 5.566,  lng: -0.168  },
  { id: 'east-legon',        name: 'East Legon',       area: 'Accra North',     lat: 5.6377, lng: -0.1665 },
  { id: 'dansoman',          name: 'Dansoman',         area: 'Accra West',      lat: 5.5427, lng: -0.2534 },
  { id: 'tema',              name: 'Tema',             area: 'Coast',           lat: 5.6698, lng: -0.0166 },
];

export const localDestinationById = (id) => LOCAL_DESTINATIONS.find((d) => d.id === id);
