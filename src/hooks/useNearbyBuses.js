import { useMemo } from 'react';
import { getNearbyBuses } from '../services/nearbyBuses';

// Static list of available buses around `center`. Stable per location so the
// map markers don't jitter (Uber-style idle view).
export const useNearbyBuses = (center) => {
  const key = center ? center.map((n) => n.toFixed(2)).join(',') : '';
  return useMemo(() => getNearbyBuses(center), [key]); // eslint-disable-line react-hooks/exhaustive-deps
};
