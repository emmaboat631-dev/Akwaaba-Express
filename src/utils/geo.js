// Geo helpers for distance + marker interpolation along routes.

const R = 6371; // km
const toRad = (d) => (d * Math.PI) / 180;

// Great-circle distance in km between [lat,lng] pairs.
export const haversineKm = ([lat1, lng1], [lat2, lng2]) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Linear interpolation between two [lat,lng] points.
export const lerpPoint = ([lat1, lng1], [lat2, lng2], t) => [
  lat1 + (lat2 - lat1) * t,
  lng1 + (lng2 - lng1) * t,
];

// Total length (km) of a polyline of [lat,lng] points.
export const routeLengthKm = (points) => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineKm(points[i], points[i + 1]);
  }
  return total;
};

