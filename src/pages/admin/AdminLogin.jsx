import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Bus, MapPin, Shield, Users } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add('adm-active');
    return () => document.body.classList.remove('adm-active');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    setLoading(false);
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Access denied. This account is not an administrator.');
      return;
    }
    navigate('/admin');
  };

  return (
    <div className="adm-login-split">
      {/* Left — illustration panel */}
      <div className="adm-login-hero">
        <div className="adm-login-hero-content">
          <div className="adm-login-hero-logo">
            <div className="adm-brand-icon" style={{ width: 44, height: 44, fontSize: 16 }}>AE</div>
            <span className="adm-login-hero-brand">Akwaaba Express</span>
          </div>

          {/* Inline SVG illustration */}
          <svg viewBox="0 0 400 300" className="adm-login-illustration" xmlns="http://www.w3.org/2000/svg">
            {/* Road */}
            <path d="M0 220 Q100 200 200 210 Q300 220 400 200" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="40" strokeLinecap="round" />
            <path d="M0 220 Q100 200 200 210 Q300 220 400 200" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="12 8" />

            {/* Bus body */}
            <rect x="120" y="130" width="160" height="70" rx="12" fill="#1FA971" />
            <rect x="125" y="125" width="150" height="10" rx="5" fill="#17906A" />
            {/* Windows */}
            <rect x="138" y="142" width="28" height="22" rx="4" fill="rgba(255,255,255,0.85)" />
            <rect x="174" y="142" width="28" height="22" rx="4" fill="rgba(255,255,255,0.85)" />
            <rect x="210" y="142" width="28" height="22" rx="4" fill="rgba(255,255,255,0.85)" />
            <rect x="246" y="142" width="28" height="22" rx="4" fill="rgba(255,255,255,0.7)" />
            {/* Door */}
            <rect x="252" y="170" width="22" height="30" rx="3" fill="rgba(255,255,255,0.3)" />
            {/* Headlights */}
            <circle cx="132" cy="185" r="6" fill="#F4C430" />
            <circle cx="268" cy="185" r="6" fill="#CE1126" opacity="0.8" />
            {/* Wheels */}
            <circle cx="160" cy="205" r="14" fill="#1A2E24" />
            <circle cx="160" cy="205" r="7" fill="#2D4A3E" />
            <circle cx="248" cy="205" r="14" fill="#1A2E24" />
            <circle cx="248" cy="205" r="7" fill="#2D4A3E" />
            {/* Label on bus */}
            <text x="200" y="192" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" letterSpacing="1">AKWAABA</text>

            {/* Map pins */}
            <g transform="translate(60, 100)">
              <circle cx="12" cy="8" r="10" fill="#F4C430" opacity="0.9" />
              <circle cx="12" cy="8" r="4" fill="white" />
              <path d="M12 18 L12 28" stroke="#F4C430" strokeWidth="2" opacity="0.5" />
            </g>
            <g transform="translate(310, 90)">
              <circle cx="12" cy="8" r="10" fill="#1FA971" opacity="0.9" />
              <circle cx="12" cy="8" r="4" fill="white" />
              <path d="M12 18 L12 28" stroke="#1FA971" strokeWidth="2" opacity="0.5" />
            </g>

            {/* Dotted route line */}
            <path d="M72 128 Q140 80 200 100 Q260 120 322 98" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="6 4" />

            {/* Ghana flag colors accent */}
            <rect x="0" y="270" width="400" height="4" fill="#CE1126" opacity="0.4" />
            <rect x="0" y="274" width="400" height="4" fill="#F4C430" opacity="0.4" />
            <rect x="0" y="278" width="400" height="4" fill="#1FA971" opacity="0.4" />
          </svg>

          <h2 className="adm-login-hero-title">Manage your fleet with confidence</h2>
          <p className="adm-login-hero-desc">Monitor bookings, track revenue, and manage trips across Ghana — all from one dashboard.</p>

          <div className="adm-login-hero-features">
            <div className="adm-login-hero-feat"><Bus size={16} /> <span>Fleet management</span></div>
            <div className="adm-login-hero-feat"><Users size={16} /> <span>User analytics</span></div>
            <div className="adm-login-hero-feat"><MapPin size={16} /> <span>Route tracking</span></div>
            <div className="adm-login-hero-feat"><Shield size={16} /> <span>Secure access</span></div>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="adm-login-form-side">
        <div className="adm-login-form-wrap">
          <div className="adm-login-form-head">
            <h1 className="adm-login-title">Welcome back!</h1>
            <p className="adm-login-sub">Sign in to access the admin dashboard</p>
          </div>

          {error && <div className="adm-login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="adm-login-form">
            <label className="adm-login-label">
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@akwaaba.com"
                required
                className="adm-login-input"
              />
            </label>
            <label className="adm-login-label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="adm-login-input"
              />
            </label>
            <button type="submit" className="adm-login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="adm-login-footer">Akwaaba Express Admin Portal</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
