import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GoogleIcon, AppleIcon } from '../components/BrandIcons';
import { supabase } from '../lib/supabase';

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthed) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const go = (acct) => navigate(location.state?.from || (acct.role === 'driver' ? '/driver' : '/'), { replace: true });

  const submit = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      toast(error.message, 'error');
      setIsSubmitting(false);
      return;
    }

    toast('Welcome back', 'success');

    if (data.user) {
      let { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, role: 'passenger' }])
          .select('role')
          .single();

        if (insertError) {
          toast('Account state could not be resolved. Please contact support.', 'error');
          setIsSubmitting(false);
          return;
        }
        profile = newProfile;
      }

      go(profile);
    }
  };

  return (
    <div className="screen fade-up" style={{ padding: '20px 20px 32px' }}>
      <div className="flex items-center mb-5">
        <button className="icon-btn" onClick={() => navigate('/welcome')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div className="t-xs semibold" style={{ color: 'var(--primary)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
          Akwaaba Express
        </div>
        <h1 className="t-display" style={{ fontSize: 34, lineHeight: 1.1, marginBottom: 8 }}>Welcome back</h1>
        <p className="muted">Sign in to book seats and track live buses.</p>
      </div>

      <form onSubmit={submit}>
        <div className="field-label">Email address</div>
        <div className="field mb-4">
          <Mail size={18} className="muted" />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={set('email')}
          />
        </div>

        <div className="field-label">Password</div>
        <div className="field mb-3">
          <Lock size={18} className="muted" />
          <input
            type={showPw ? 'text' : 'password'}
            name="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={set('password')}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button type="button" className="muted" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex justify-end mb-5">
          <button
            type="button"
            className="t-sm semibold"
            style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/reset-password')}
          >
            Forgot password?
          </button>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="flex items-center gap-3" style={{ margin: '28px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="t-xs muted">OR CONTINUE WITH</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <div className="flex gap-3" style={{ marginBottom: 16 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => toast('OAuth not set up yet', 'info')}>
          <GoogleIcon /> Google
        </button>
        <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => toast('OAuth not set up yet', 'info')}>
          <AppleIcon /> Apple
        </button>
      </div>

      <div className="text-center mt-auto" style={{ paddingTop: 24 }}>
        <span className="muted t-sm">Don't have an account? </span>
        <button
          type="button"
          className="t-sm semibold"
          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/signup')}
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default SignIn;
