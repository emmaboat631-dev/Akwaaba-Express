import { useEffect, useState } from 'react';
import { liveTracking } from '../services/liveTracking';

// Subscribe to the simulated real-time bus feed. Re-renders on every tick.
export const useLiveBuses = () => {
  const [buses, setBuses] = useState(() => liveTracking.getBuses());
  useEffect(() => liveTracking.subscribe(setBuses), []);
  return buses;
};
