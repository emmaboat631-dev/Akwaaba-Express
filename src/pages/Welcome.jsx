import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Bus, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Welcome = () => {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  if (isAuthed) return <Navigate to="/" replace />;

  return (
    <div
      className="screen fade-up"
      style={{ background: 'linear-gradient(165deg, #0B4A3C 0%, #06392F 45%, #032019 100%)', color: '#fff' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bus size={20} />
        </div>
        <span className="wordmark" style={{ fontSize: 18 }}>Akwaaba Express</span>
      </div>

      {/* Hero panel — evokes the reference's bus image */}
      <div
        style={{
          flex: 1,
          minHeight: 200,
          borderRadius: 'var(--r-xl)',
          background: 'linear-gradient(150deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 28,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12, display: 'grid', placeItems: 'center' }}>
          <span style={{ fontSize: 130, fontWeight: 800, letterSpacing: 2 }}>GH</span>
        </div>
        <img src="/realistic_bus.png" alt="Realistic Bus" style={{ width: 280, height: 'auto', zIndex: 1, objectFit: 'contain', mixBlendMode: 'multiply' }} />
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, height: 3, background: 'rgba(255,255,255,0.4)' }} />
        <div style={{ position: 'absolute', bottom: 11, left: 16, width: 13, height: 13, borderRadius: '50%', background: '#fff' }} />
        <div style={{ position: 'absolute', bottom: 11, right: 16, width: 13, height: 13, borderRadius: '50%', background: '#fff' }} />
      </div>

      {/* Headline (our content, reference style) */}
      <h1 className="t-display" style={{ fontSize: 38, lineHeight: 1.05 }}>
        Move around<br />Ghana,<br />the smart way.
      </h1>
      <p style={{ opacity: 0.9, marginTop: 12, maxWidth: 300 }}>
        Hail live city buses or book intercity trips — Accra to Kumasi, Tamale and beyond.
      </p>

      {/* Actions */}
      <div className="mt-6">
        <button
          className="btn"
          style={{ background: '#fff', color: 'var(--primary-dark)', fontWeight: 700 }}
          onClick={() => navigate('/signup')}
        >
          Get started <ArrowRight size={18} />
        </button>
        <button className="btn" style={{ background: 'transparent', color: '#fff', marginTop: 10 }} onClick={() => navigate('/signin')}>
          I already have an account
        </button>
      </div>
    </div>
  );
};

export default Welcome;
