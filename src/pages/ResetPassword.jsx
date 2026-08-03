import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, KeyRound, MailCheck, Lock, Eye, EyeOff, Check } from 'lucide-react';

import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import PasswordChecklist, { passwordMeetsRules } from '../components/PasswordChecklist';

// Real password recovery via Supabase:
//   1. `request`   → user enters email → resetPasswordForEmail sends a link.
//   2. `sent`      → confirmation card, wait for user to click the link.
//   3. `new`       → user clicked the link, landed back on this page carrying
//                    a recovery token; Supabase fires PASSWORD_RECOVERY on the
//                    auth state, we flip to the new-password form.
//   4. `done`      → success card, sends them to sign in with the new password.
//
// Supabase's default recovery email is already wired — no dashboard changes
// beyond adding this app's origin to Auth → URL Configuration → Redirect URLs.

const IconCircle = ({ icon: Icon, tone = 'primary' }) => (
  <div
    style={{
      width: 84, height: 84, borderRadius: '50%',
      background: tone === 'success' ? 'var(--success)' : 'var(--primary-light)',
      color: tone === 'success' ? '#fff' : 'var(--primary-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '8px auto 20px',
    }}
  >
    <Icon size={38} />
  </div>
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState('request'); // request | sent | new | done
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // Detect the recovery token in the URL hash on first render and listen for
  // the PASSWORD_RECOVERY event Supabase fires when the client picks it up.
  // Either signal flips us straight to the new-password step.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setStep('new');
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStep('new');
    });
    return () => subscription.unsubscribe();
  }, []);

  const back = () => {
    if (step === 'sent') setStep('request');
    else if (step === 'new') navigate('/signin');
    else navigate('/signin');
  };

  const sendLink = async () => {
    if (!/.+@.+\..+/.test(email)) { toast('Enter a valid email', 'error'); return; }
    setBusy(true);
    try {
      // Redirect the user back to this exact page so we can catch the token.
      // The origin must be listed in Supabase's Auth → URL Configuration
      // (Redirect URLs) or this will fail silently on the click, not here.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setStep('sent');
    } catch (err) {
      toast(err.message || 'Could not send reset link', 'error');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast('Reset link sent again', 'info');
    } catch (err) {
      toast(err.message || 'Could not resend', 'error');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!passwordMeetsRules(pw.next)) { toast('Password doesn’t meet all requirements', 'error'); return; }
    if (pw.next !== pw.confirm) { toast('Passwords do not match', 'error'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw error;
      // Sign out the recovery session so the user has to log in fresh with
      // the new password — clearer than dropping them straight into the app.
      await supabase.auth.signOut();
      setStep('done');
    } catch (err) {
      toast(err.message || 'Could not save password. Link may have expired.', 'error');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- Success ---------------- */
  if (step === 'done') {
    return (
      <div className="screen fade-up flex-col">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <IconCircle icon={Check} tone="success" />
          <h1 className="mb-2">Password changed</h1>
          <p className="muted" style={{ maxWidth: 260 }}>
            Your password has been updated. Sign in with your new password to continue.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/signin', { replace: true })}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="screen fade-up">
      <div className="header">
        <button className="icon-btn" onClick={back}><ArrowLeft size={20} /></button>
      </div>

      {/* ---------------- Request the reset link ---------------- */}
      {step === 'request' && (
        <>
          <IconCircle icon={KeyRound} />
          <h1 className="text-center mb-2">Forgot password?</h1>
          <p className="muted text-center mb-6" style={{ margin: '0 auto 24px', maxWidth: 300 }}>
            Enter the email you signed up with. We'll send you a link to reset your password.
          </p>

          <div className="field-label">Email address</div>
          <div className="field mb-4">
            <Mail size={18} className="muted" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendLink()}
            />
          </div>

          <button className="btn btn-primary mt-auto" onClick={sendLink} disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </>
      )}

      {/* ---------------- Confirmation the link went out ---------------- */}
      {step === 'sent' && (
        <>
          <IconCircle icon={MailCheck} />
          <h1 className="text-center mb-2">Check your email</h1>
          <p className="muted text-center mb-3" style={{ margin: '0 auto', maxWidth: 320 }}>
            We sent a reset link to <span className="semibold" style={{ color: 'var(--ink)' }}>{email}</span>.
            Click it to set a new password.
          </p>
          <p className="t-xs muted text-center mb-6" style={{ margin: '0 auto 24px', maxWidth: 300 }}>
            Link expired or didn't arrive? Check your spam folder, or resend below.
          </p>

          <button className="btn btn-outline" onClick={resend} disabled={busy}>
            {busy ? 'Sending…' : 'Resend link'}
          </button>
          <button
            className="btn"
            style={{ background: 'transparent', color: 'var(--primary-dark)', marginTop: 8 }}
            onClick={() => navigate('/signin')}
          >
            Back to sign in
          </button>
        </>
      )}

      {/* ---------------- Set the new password ---------------- */}
      {step === 'new' && (
        <>
          <IconCircle icon={Lock} />
          <h1 className="text-center mb-2">Create new password</h1>
          <p className="muted text-center mb-6" style={{ margin: '0 auto 24px', maxWidth: 300 }}>
            Choose a strong password you haven't used on this account before.
          </p>

          <div className="field-label">New password</div>
          <div className="field mb-3">
            <Lock size={18} className="muted" />
            <input
              type={showPw ? 'text' : 'password'}
              name="new-password"
              autoComplete="new-password"
              placeholder="Enter new password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="muted" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {(pw.next.length > 0 || pw.confirm.length > 0) && (
            <PasswordChecklist value={pw.next} confirm={pw.confirm} />
          )}

          <div className="field-label">Confirm password</div>
          <div className="field mb-6">
            <Lock size={18} className="muted" />
            <input
              type={showPw ? 'text' : 'password'}
              name="confirm-password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </div>

          <button className="btn btn-primary mt-auto" onClick={savePassword} disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </>
      )}
    </div>
  );
};

export default ResetPassword;
