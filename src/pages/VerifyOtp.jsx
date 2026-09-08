import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

const OTP_LENGTH = 6;

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed } = useAuth();
  const toast = useToast();

  const email = location.state?.email;
  const role = location.state?.role || 'passenger';

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
    refs.current[0]?.focus();
  }, []);

  if (isAuthed) return <Navigate to="/" replace />;
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
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const verify = async () => {
    const token = code.join('');
    if (token.length < OTP_LENGTH) { toast('Enter the full 6-digit code', 'error'); return; }
    setVerifying(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) {
      toast(error.message, 'error');
      setVerifying(false);
      return;
    }

    toast('Email verified. Akwaaba!', 'success');
    navigate(role === 'driver' ? '/driver' : '/', { replace: true });
  };

  const resend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setResending(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('New code sent to your email', 'success');
    setCooldown(60);
    setCode(Array(OTP_LENGTH).fill(''));
    refs.current[0]?.focus();
  };

  return (
    <div className="screen fade-up" style={{ padding: '20px 20px 32px' }}>
      <div className="flex items-center mb-5">
        <button className="icon-btn" onClick={() => navigate('/signup')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Mail size={28} />
        </div>
        <h1 className="t-display" style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 8 }}>Verify your email</h1>
        <p className="muted t-sm" style={{ maxWidth: 280, margin: '0 auto' }}>
          We sent a 6-digit code to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Enter it below to activate your account.
        </p>
      </div>

      <div className="flex justify-center gap-2" style={{ marginBottom: 32 }}>
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
              width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
              borderRadius: 12, border: '2px solid var(--line)', background: 'var(--surface)',
              color: 'var(--ink)', outline: 'none', transition: 'border-color .15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; }}
          />
        ))}
      </div>

      <button className="btn btn-primary mb-4" onClick={verify} disabled={verifying}>
        {verifying ? 'Verifying…' : 'Verify & Continue'}
      </button>

      <div className="text-center">
        <span className="t-sm muted">Didn't receive the code? </span>
        <button
          className="t-sm semibold"
          style={{ color: cooldown > 0 ? 'var(--ink-3)' : 'var(--primary)', background: 'none', border: 'none', cursor: cooldown > 0 ? 'default' : 'pointer' }}
          onClick={resend}
          disabled={resending || cooldown > 0}
        >
          {resending ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>

      <p className="t-xs muted text-center" style={{ marginTop: 24, opacity: 0.6 }}>
        Check your spam folder if you don't see the email.
      </p>
    </div>
  );
};

export default VerifyOtp;
