import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

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

  const handleOAuth = async (provider) => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (err) setError(err.message);
  };

  return (
    <div className="adm-login-split">
      {/* Left — login form (always light) */}
      <div className="adm-login-form-side">
        <div className="adm-login-form-wrap">
          <div className="adm-login-logo-row">
            <div className="adm-brand-icon" style={{ width: 44, height: 44, fontSize: 16 }}>AE</div>
            <span className="adm-login-brand-text">Akwaaba Express</span>
          </div>

          <div className="adm-login-form-head">
            <h1 className="adm-login-title">Sign In</h1>
            <p className="adm-login-sub">Welcome back! Enter your details to continue.</p>
          </div>

          {/* OAuth buttons */}
          <div className="adm-login-oauth">
            <button type="button" className="adm-login-oauth-btn" onClick={() => handleOAuth('google')}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Sign in with Google
            </button>
            <button type="button" className="adm-login-oauth-btn" onClick={() => handleOAuth('apple')}>
              <svg width="16" height="18" viewBox="0 0 16 20" fill="currentColor"><path d="M13.545 10.239c-.022-2.234 1.823-3.308 1.906-3.36-.038-.055-1.494-1.532-3.808-1.532-1.62 0-2.906.963-3.677.963-.794 0-1.994-.937-3.288-.912C2.844 5.423.96 6.585.96 9.17c0 1.534.295 3.112 1.06 4.638.702 1.257 1.597 2.6 2.74 2.577 1.115-.023 1.54-.71 2.888-.71 1.348 0 1.727.71 2.889.687 1.184-.023 1.962-1.274 2.641-2.537.527-.906.922-1.89 1.08-2.437-.023-.012-2.072-.793-2.094-3.149h.38zM11.36 3.457c.564-.702.95-1.651.844-2.621-.817.035-1.82.563-2.407 1.242-.52.611-.984 1.605-.864 2.543.91.069 1.845-.463 2.427-1.164z"/></svg>
              Sign in with Apple
            </button>
          </div>

          <div className="adm-login-divider">
            <span>OR</span>
          </div>

          {error && <div className="adm-login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="adm-login-form">
            <label className="adm-login-label">
              Email *
              <div className="adm-login-input-wrap">
                <Mail size={16} className="adm-login-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@akwaaba.com"
                  required
                  className="adm-login-input adm-login-input-icon-pad"
                />
              </div>
            </label>
            <label className="adm-login-label">
              Password *
              <div className="adm-login-input-wrap">
                <Lock size={16} className="adm-login-input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="adm-login-input adm-login-input-icon-pad"
                />
                <button type="button" className="adm-login-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button type="submit" className="adm-login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="adm-login-footer">
            Don't have an account? <Link to="/admin/signup" className="adm-login-link">Sign Up</Link>
          </p>
        </div>
      </div>

      {/* Right — photo hero panel with testimonial */}
      <div className="adm-login-hero">
        <img src="/admin-hero.jpg" alt="" className="adm-login-hero-img" />
        <div className="adm-login-hero-overlay" />
        <div className="adm-login-hero-content">
          <div className="adm-login-quote">
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" style={{ marginBottom: 16 }}>
              <path d="M0 14.4C0 6.4 5.6 1.2 12 0l1.2 2.8C8.4 4.4 6 8 5.6 11.6h5.2v12H0V14.4zm18.8 0C18.8 6.4 24.4 1.2 30.8 0L32 2.8c-4.8 1.6-7.2 5.2-7.6 8.8H30v12H18.8V14.4z" fill="#F4C430" />
            </svg>
            <p className="adm-login-quote-text">
              The dashboard has completely transformed how we manage our fleet. Real-time tracking, instant booking alerts, and clean analytics — all in one place.
            </p>
            <div className="adm-login-quote-author">
              <div className="adm-login-quote-avatar">EB</div>
              <div>
                <div className="adm-login-quote-name">Emmanuel Boateng</div>
                <div className="adm-login-quote-role">Fleet Operations Manager</div>
              </div>
            </div>
          </div>

          <div className="adm-login-hero-caption">
            <div className="adm-login-hero-tagline">Connecting Ghana, one journey at a time</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
