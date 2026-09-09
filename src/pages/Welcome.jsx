import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
      {/* Brand — wordmark's already carried by the hero, so keep this a plain name. */}
      <div className="flex items-center mb-4">
        <span className="wordmark" style={{ fontSize: 18 }}>Akwaaba Express</span>
      </div>

      {/* Hero panel — full logo lockup as the illustration. */}
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
          padding: 24,
        }}
      >
        <img src="/logo-light.png" alt="Akwaaba Express" style={{ width: '85%', maxWidth: 320, height: 'auto', objectFit: 'contain' }} />
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
