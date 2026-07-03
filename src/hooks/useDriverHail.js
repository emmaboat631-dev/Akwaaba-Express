import { useEffect, useState } from 'react';
import { driverHail } from '../services/driverHail';

// Subscribes to the simulated live-hail request feed (mirrors useLiveBuses.js).
export const useDriverHail = () => {
  const [state, setState] = useState(() => driverHail.getState());
  useEffect(() => driverHail.subscribe(setState), []);

  return {
    online: state.online,
    requests: state.requests,
    activeRequest: state.activeRequest,
    goOnline: driverHail.goOnline,
    goOffline: driverHail.goOffline,
    accept: driverHail.accept,
    decline: driverHail.decline,
    completeActive: driverHail.completeActive,
  };
};
