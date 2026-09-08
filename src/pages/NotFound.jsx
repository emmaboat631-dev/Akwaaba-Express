import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPinOff, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="screen fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <MapPinOff size={36} />
      </div>
      <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, marginBottom: 8, color: 'var(--primary)' }}>404</h1>
      <p className="bold" style={{ fontSize: 18, marginBottom: 8 }}>Page not found</p>
      <p className="muted t-sm" style={{ maxWidth: 280, marginBottom: 32 }}>
        This route doesn't exist. It may have been moved or you might have typed the wrong address.
      </p>
      <div className="flex gap-3" style={{ maxWidth: 320, width: '100%' }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Go back
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/', { replace: true })}>
          <Home size={16} /> Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
