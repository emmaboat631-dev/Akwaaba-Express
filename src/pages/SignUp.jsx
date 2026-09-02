import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Phone, Eye, EyeOff, UserRound, Bus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SegmentedTabs from '../components/SegmentedTabs';
import PasswordChecklist, { passwordMeetsRules } from '../components/PasswordChecklist';
import { supabase } from '../lib/supabase';
import PhoneInput, { isValidGhPhone } from '../components/PhoneInput';
import { GoogleIcon, AppleIcon } from '../components/BrandIcons';

const SignUp = () => {
  const navigate = useNavigate();
  const { signInAsGuest, isAuthed } = useAuth();
  const toast = useToast();

  const [role, setRole] = useState('passenger');
  const [form, setForm] = useState({ first: '', last: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const guest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signInAsGuest();
      navigate('/', { replace: true });
    } catch (err) {
      toast(err.message || 'Guest sign-in failed — enable Anonymous provider in Supabase.', 'error');
      setBusy(false);
    }
  };

  const driver = role === 'driver';
  const copy = driver
    ? {
        subtitle: 'Drive with Akwaaba Express and earn on your own schedule.',
        first: 'Kwabena',
        last: 'Owusu',
        email: 'driver@example.com',
        phone: '024 000 0000',
        password: 'Create a driver password',
        submit: 'Start driving',
      }
    : {
        subtitle: 'Join Akwaaba Express to book buses across Ghana.',
        first: 'Ama',
        last: 'Mensah',
        email: 'you@example.com',
        phone: '024 000 0000',
        password: 'Create a password',
        submit: 'Create account',
      };

  if (isAuthed) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.first.trim()) { toast('Enter your first name', 'error'); return; }
    if (!/.+@.+\..+/.test(form.email)) { toast('Enter a valid email', 'error'); return; }
    if (!isValidGhPhone(form.phone)) { toast('Enter a valid 9-digit phone number', 'error'); return; }
    if (!passwordMeetsRules(form.password)) { toast('Password doesn’t meet all requirements', 'error'); return; }
    if (form.password !== form.confirm) { toast('Passwords do not match', 'error'); return; }
    
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: `${form.first} ${form.last}`.trim(),
          phone: form.phone,
          role: role
        }
      }
    });

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast('Account created. Akwaaba!', 'success');
    navigate(role === 'driver' ? '/driver' : '/', { replace: true });
  };

  return (
    <div className="screen fade-up">
      <div className="header">
        <button className="icon-btn" onClick={() => navigate('/signin')}><ArrowLeft size={20} /></button>
        {/* Guest sign-in is passenger-only — a driver account needs real
            license/vehicle info, so we hide Skip entirely when Driver is picked. */}
        {role === 'passenger' && (
          <button className="t-sm semibold muted" onClick={guest} disabled={busy}>Skip</button>
        )}
      </div>

      <h1 className="mb-1">Create your account</h1>
      <p className="muted t-sm mb-4">{copy.subtitle}</p>

      <div className="mb-5">
        <SegmentedTabs
          value={role}
          onChange={setRole}
          options={[
            { value: 'passenger', label: 'Passenger', icon: UserRound },
            { value: 'driver', label: 'Driver', icon: Bus },
          ]}
        />
      </div>

      <div className="flex gap-3 mb-4">
        <div style={{ flex: 1 }}>
          <div className="field-label">First name</div>
          <div className="field"><input name="given-name" autoComplete="given-name" placeholder={copy.first} value={form.first} onChange={set('first')} /></div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="field-label">Last name</div>
          <div className="field"><input name="family-name" autoComplete="family-name" placeholder={copy.last} value={form.last} onChange={set('last')} /></div>
        </div>
      </div>

      <div className="field-label">Email address</div>
      <div className="field mb-4">
        <Mail size={18} className="muted" />
        <input type="email" inputMode="email" name="email" autoComplete="email" placeholder={copy.email} value={form.email} onChange={set('email')} />
      </div>

      <div className="field-label">Phone number</div>
      <div className="field mb-4">
        <Phone size={18} className="muted" />
        <PhoneInput value={form.phone} onChange={(digits) => setForm((f) => ({ ...f, phone: digits }))} />
      </div>

      <div className="field-label">Password</div>
      <div className="field mb-3">
        <Lock size={18} className="muted" />
        <input type={showPw ? 'text' : 'password'} name="new-password" autoComplete="new-password" placeholder={copy.password} value={form.password} onChange={set('password')} style={{ flex: 1, minWidth: 0 }} />
        <button className="muted" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {(form.password.length > 0 || form.confirm.length > 0) && (
        <PasswordChecklist value={form.password} confirm={form.confirm} />
      )}

      <div className="field-label">Confirm password</div>
      <div className="field mb-4">
        <Lock size={18} className="muted" />
        <input type={showPw ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" placeholder="Re-enter your password" value={form.confirm} onChange={set('confirm')} />
      </div>

      <p className="t-xs muted mb-4">
        By signing up, you agree to our <span className="semibold" style={{ color: 'var(--ink)' }}>Terms of Use</span> and <span className="semibold" style={{ color: 'var(--ink)' }}>Privacy Policy</span>.
      </p>

      <button className="btn btn-primary" onClick={submit} disabled={busy}>{copy.submit}</button>

      <div className="flex items-center gap-3" style={{ margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="t-xs muted">OR SIGN UP WITH</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <div className="flex gap-3">
        <button className="btn btn-outline" style={{ flex: 1 }} disabled={busy} onClick={async () => {
          setBusy(true);
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
          });
          if (error) { toast(error.message, 'error'); setBusy(false); }
        }}>
          <GoogleIcon /> Google
        </button>
        <button className="btn btn-dark" style={{ flex: 1 }} disabled={busy} onClick={async () => {
          setBusy(true);
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: { redirectTo: window.location.origin },
          });
          if (error) { toast(error.message, 'error'); setBusy(false); }
        }}>
          <AppleIcon /> Apple
        </button>
      </div>

      <div className="text-center mt-auto" style={{ paddingTop: 20 }}>
        <span className="t-sm muted">Already have an account? </span>
        <button className="t-sm bold" style={{ color: 'var(--primary-dark)' }} onClick={() => navigate('/signin')}>Sign in</button>
      </div>
    </div>
  );
};

export default SignUp;
