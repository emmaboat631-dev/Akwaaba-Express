import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GoogleIcon, FacebookIcon } from '../components/BrandIcons';

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticate, isAuthed } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  if (isAuthed) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Role was fixed at signup and is restored from the account, not chosen
  // here — go to that role's home unless returning to a same-role deep link.
  const go = (acct) => navigate(location.state?.from || (acct.role === 'driver' ? '/driver' : '/'), { replace: true });

  const submit = () => {
    if (!/.+@.+\..+/.test(form.email)) { toast('Enter a valid email', 'error'); return; }
    if (form.password.length < 4) { toast('Enter your password', 'error'); return; }
    const acct = authenticate({ email: form.email });
    toast('Welcome back', 'success');
    go(acct);
  };

  const social = (provider) => {
    const acct = authenticate({ name: '' });
    toast(`Signed in with ${provider}`, 'success');
    go(acct);
  };

  return (
    <div className="screen fade-up">
      <div className="header">
        <button className="icon-btn" onClick={() => navigate('/welcome')}><ArrowLeft size={20} /></button>
      </div>

      <div className="mb-6" style={{ marginTop: 6 }}>
        <div className="wordmark t-sm" style={{ color: 'var(--primary-dark)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Akwaaba Express
        </div>
        <h1 className="t-display mt-2" style={{ fontSize: 32 }}>Welcome back</h1>
        <p className="muted t-sm mt-1">Sign in to book seats and track live buses.</p>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="field-label">Email address</div>
        <div className="field mb-4">
          <Mail size={18} className="muted" />
          <input type="email" inputMode="email" name="email" autoComplete="email" placeholder="Enter your email" value={form.email} onChange={set('email')} />
        </div>

        <div className="field-label">Password</div>
        <div className="field mb-2">
          <Lock size={18} className="muted" />
          <input
            type={showPw ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={set('password')}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button className="muted" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex justify-end" style={{ marginBottom: 18 }}>
          <button className="t-sm semibold" style={{ color: 'var(--primary-dark)' }} onClick={() => navigate('/reset-password')}>
            Forgot password?
          </button>
        </div>

        <button className="btn btn-primary" onClick={submit}>Sign in</button>
      </div>

      <div className="flex items-center gap-3" style={{ margin: '20px 0' }}>
        <div className="divider" style={{ flex: 1 }} />
        <span className="t-xs muted">Or continue with</span>
        <div className="divider" style={{ flex: 1 }} />
      </div>

      <div className="flex gap-3">
        <button className="btn btn-outline" onClick={() => social('Google')}><GoogleIcon /> Google</button>
        <button className="btn btn-outline" onClick={() => social('Facebook')}><FacebookIcon /> Facebook</button>
      </div>

      <div className="text-center mt-auto" style={{ paddingTop: 24 }}>
        <span className="t-sm muted">Don’t have an account? </span>
        <button className="t-sm bold" style={{ color: 'var(--primary-dark)' }} onClick={() => navigate('/signup')}>Sign up</button>
      </div>
    </div>
  );
};

export default SignIn;
