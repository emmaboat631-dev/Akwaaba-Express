import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

const OTP_LENGTH = 6;

// Sign-up confirmation screen. Supabase sends one email that carries BOTH a
// confirmation link and a 6-digit code — this screen leads with the link
// (tap it and you land back here already signed in, via AuthContext's
// onAuthStateChange listener) and keeps the code entry as a fallback for
// anyone on a different device or without link access.
const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed } = useAuth();
  const toast = useToast();

  const email = location.state?.email;
  const role = location.state?.role || 'passenger';

  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (showCode) refs.current[0]?.focus();
  }, [showCode]);

  useEffect(() => {
    // The auth listener signs the user in the moment they click the link;
    // this navigates them onward to the right home.
    if (isAuthed) navigate(role === 'driver' ? '/driver' : '/', { replace: true });
  }, [isAuthed, navigate, role]);

  if (!email) return <Navigate to="/signup" replace />;

  const handleChange = (i, val) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const next = [...code];
      digits.forEach((d, idx) => { if (i + idx < OTP_LENGTH) next[i + idx] = d; });
      setCode(next);
      const focusIdx = Math.min(i + digits.length, OTP_LENGTH - 1);
      refs.current[focusIdx]?.focus();
      return;
    }
    const digit = val.replace(/\D/g, '');
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const verify = async () => {
    const token = code.join('');
    if (token.length < OTP_LENGTH) { toast('Enter the full 6-digit code', 'error'); return; }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) {
      toast(error.message, 'error');
      setVerifying(false);
      return;
    }
    toast('Email verified. Akwaaba!', 'success');
    // AuthContext's onAuthStateChange fires here — the effect above navigates.
  };

  const resend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResending(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('Confirmation email resent', 'success');
    setCooldown(60);
    setCode(Array(OTP_LENGTH).fill(''));
  };

  return (
    <div className="screen fade-up" style={{ padding: '20px 20px 32px' }}>
      <div className="flex items-center mb-5">
        <button className="icon-btn" onClick={() => navigate('/signup')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Mail size={32} />
        </div>
        <h1 className="t-display" style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 8 }}>Check your email</h1>
        <p className="muted t-sm" style={{ maxWidth: 320, margin: '0 auto' }}>
          We sent a confirmation link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Tap it to activate your account and come back here — you'll be signed in automatically.
        </p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="semibold t-sm mb-1">Waiting for confirmation</div>
            <div className="t-xs muted">This page will move on once you tap the link in your email.</div>
          </div>
        </div>
      </div>

      <div className="text-center mb-4">
        <span className="t-sm muted">Didn't receive it? </span>
        <button
          className="t-sm semibold"
          style={{ color: cooldown > 0 ? 'var(--ink-3)' : 'var(--primary)', background: 'none', border: 'none', cursor: cooldown > 0 ? 'default' : 'pointer' }}
          onClick={resend}
          disabled={resending || cooldown > 0}
        >
          {resending ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite', marginRight: 4 }} /> : null}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
        </button>
      </div>

      {/* Fallback: manual code entry, for users on a different device or without
          working links. The confirmation email carries the same 6-digit token. */}
      {!showCode ? (
        <div className="text-center">
          <button
            className="t-sm semibold"
            style={{ color: 'var(--primary)', background: 'none', border: 'none' }}
            onClick={() => setShowCode(true)}
          >
            Or enter the 6-digit code instead
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <div className="divider" style={{ margin: '16px 0 20px' }} />
          <p className="t-xs muted text-center mb-3">
            The email also includes a 6-digit code. Enter it below if you can't tap the link.
          </p>
          <div className="flex justify-center gap-2" style={{ marginBottom: 16 }}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                style={{
                  width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
                  borderRadius: 12, border: '2px solid var(--line)', background: 'var(--surface)',
                  color: 'var(--ink)', outline: 'none', transition: 'border-color .15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; }}
              />
            ))}
          </div>
          <button className="btn btn-primary" onClick={verify} disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify code'}
          </button>
        </div>
      )}

      <p className="t-xs muted text-center" style={{ marginTop: 24, opacity: 0.6 }}>
        Check your spam folder if you don't see the email.
      </p>
    </div>
  );
};

export default VerifyOtp;
