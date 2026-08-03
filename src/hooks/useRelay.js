import { useEffect, useMemo, useState } from 'react';
import { relay } from '../services/relay';

// Subscribe to the relay's mirrored snapshot: { connected, drivers[], bookings[] }.
// Also exposes `liveBuses` — the bus-shaped payloads of currently-online
// drivers, ready to drop into the passenger live list / map.
export const useRelay = () => {
  const [state, setState] = useState(() => ({ connected: relay.connected, drivers: [], bookings: [] }));
  useEffect(() => relay.subscribe(setState), []);

  const liveBuses = useMemo(
    () => state.drivers.map((d) => d.bus).filter(Boolean),
    [state.drivers],
  );

  return { ...state, liveBuses };
};
