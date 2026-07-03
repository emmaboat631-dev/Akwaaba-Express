import { useEffect, useState } from 'react';
import { ACCRA_CENTER } from '../data/liveBuses';

// Try the device GPS; fall back to Accra centre so the prototype always has a
// sensible location (and works on desktop / when permission is denied).
export const useGeolocation = () => {
  const [position, setPosition] = useState(ACCRA_CENTER);
  const [located, setLocated] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocated(true);
      },
      () => setLocated(false),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
    );
    return () => id && navigator.geolocation.clearWatch?.(id);
  }, []);

  return { position, located };
};
