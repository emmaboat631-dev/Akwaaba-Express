import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const SignUp = () => {
  const navigate = useNavigate();
  const { authenticate, isAuthed } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ first: '', last: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);

  if (isAuthed) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.first.trim()) { toast('Enter your first name', 'error'); return; }
    if (!/.+@.+\..+/.test(form.email)) { toast('Enter a valid email', 'error'); return; }
    if (form.phone.replace(/\D/g, '').length < 9) { toast('Enter a valid phone number', 'error'); return; }
    if (form.password.length < 4) { toast('Password is too short', 'error'); return; }
    if (form.password !== form.confirm) { toast('Passwords do not match', 'error'); return; }
    authenticate({ name: `${form.first} ${form.last}`.trim(), email: form.email, phone: form.phone });
    toast('Account created. Akwaaba!', 'success');
    navigate('/', { replace: true });
  };

  return (
    <div className="screen fade-up">
      <div className="header">
        <button className="icon-btn" onClick={() => navigate('/signin')}><ArrowLeft size={20} /></button>
        <button className="t-sm semibold muted" onClick={() => { authenticate({ name: 'Guest' }); navigate('/', { replace: true }); }}>
          Skip
        </button>
      </div>

      <h1 className="mb-1">Create your account</h1>
      <p className="muted t-sm mb-5">Join Akwaaba Express to book buses across Ghana.</p>

      <div className="flex gap-3 mb-4">
        <div style={{ flex: 1 }}>
          <div className="field-label">First name</div>
          <div className="field"><input name="given-name" autoComplete="given-name" placeholder="Ama" value={form.first} onChange={set('first')} /></div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="field-label">Last name</div>
          <div className="field"><input name="family-name" autoComplete="family-name" placeholder="Mensah" value={form.last} onChange={set('last')} /></div>
        </div>
      </div>

      <div className="field-label">Email address</div>
      <div className="field mb-4">
        <Mail size={18} className="muted" />
        <input type="email" inputMode="email" name="email" autoComplete="email" placeholder="Enter your email" value={form.email} onChange={set('email')} />
      </div>

      <div className="field-label">Phone number</div>
      <div className="field mb-4">
        <Phone size={18} className="muted" />
        <input type="tel" inputMode="tel" name="tel" autoComplete="tel" placeholder="024 000 0000" value={form.phone} onChange={set('phone')} />
      </div>

      <div className="field-label">Password</div>
      <div className="field mb-4">
        <Lock size={18} className="muted" />
        <input type={showPw ? 'text' : 'password'} name="new-password" autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={set('password')} style={{ flex: 1, minWidth: 0 }} />
        <button className="muted" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="field-label">Confirm password</div>
      <div className="field mb-4">
        <Lock size={18} className="muted" />
        <input type={showPw ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" placeholder="Re-enter your password" value={form.confirm} onChange={set('confirm')} />
      </div>

      <p className="t-xs muted mb-4">
        By signing up, you agree to our <span className="semibold" style={{ color: 'var(--ink)' }}>Terms of Use</span> and <span className="semibold" style={{ color: 'var(--ink)' }}>Privacy Policy</span>.
      </p>

      <button className="btn btn-primary" onClick={submit}>Create account</button>

      <div className="text-center mt-auto" style={{ paddingTop: 20 }}>
        <span className="t-sm muted">Already have an account? </span>
        <button className="t-sm bold" style={{ color: 'var(--primary-dark)' }} onClick={() => navigate('/signin')}>Sign in</button>
      </div>
    </div>
  );
};

export default SignUp;
