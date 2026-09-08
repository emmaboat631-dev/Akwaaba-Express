import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const OfflineGate = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: 'linear-gradient(165deg, #0B4A3C 0%, #06392F 45%, #032019 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 32,
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <WifiOff size={32} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No internet connection</h2>
      <p style={{ opacity: 0.8, maxWidth: 280, lineHeight: 1.5 }}>
        Connect to the internet to sign in and start using Akwaaba Express.
      </p>
    </div>
  );
};

export default OfflineGate;
