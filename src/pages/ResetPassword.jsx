import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, KeyRound, MailCheck, Lock, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const IconCircle = ({ icon: Icon }) => (
  <div className="mb-4" style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 20px' }}>
    <Icon size={38} />
  </div>
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState('method'); // method | verify | new | done
  const [channel, setChannel] = useState('email');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState(['', '', '', '']);
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  const back = () => {
    if (step === 'verify') setStep('method');
    else if (step === 'new') setStep('verify');
    else navigate('/signin');
  };

  const sendCode = () => {
    const ok = channel === 'email' ? /.+@.+\..+/.test(contact) : contact.replace(/\D/g, '').length >= 9;
    if (!ok) { toast(`Enter a valid ${channel}`, 'error'); return; }
    setStep('verify');
    toast(`Code sent via ${channel}`, 'info');
    setTimeout(() => otpRefs[0].current?.focus(), 100);
  };

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setCode((c) => c.map((x, idx) => (idx === i ? d : x)));
    if (d && i < 3) otpRefs[i + 1].current?.focus();
  };
  const onOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const verify = () => {
    if (code.join('').length < 4) { toast('Enter the 4-digit code', 'error'); return; }
    setStep('new');
  };

  const save = () => {
    if (pw.next.length < 4) { toast('Password is too short', 'error'); return; }
    if (pw.next !== pw.confirm) { toast('Passwords do not match', 'error'); return; }
    setStep('done');
  };

  /* ---------------- Success ---------------- */
  if (step === 'done') {
    return (
      <div className="screen fade-up flex-col">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Check size={48} />
          </div>
          <h1 className="mb-2">Password changed</h1>
          <p className="muted" style={{ maxWidth: 260 }}>Your password has been changed successfully.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/signin', { replace: true })}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div className="screen fade-up">
      <div className="header">
        <button className="icon-btn" onClick={back}><ArrowLeft size={20} /></button>
      </div>

      {/* ---------------- Choose method ---------------- */}
      {step === 'method' && (
        <>
          <IconCircle icon={KeyRound} />
          <h1 className="text-center mb-2">Forgot password?</h1>
          <p className="muted text-center mb-6" style={{ margin: '0 auto 24px', maxWidth: 280 }}>
            Choose where to receive your verification code.
          </p>

          {[
            { id: 'email', icon: Mail, title: 'Send via email', sub: 'Code sent to your email address' },
            { id: 'phone', icon: Phone, title: 'Send via SMS', sub: 'Code sent to your phone number' },
          ].map((o) => {
            const active = channel === o.id;
            const Icon = o.icon;
            return (
              <button key={o.id} className={`card flex items-center gap-3 mb-3${active ? ' card-selected' : ''}`} style={{ padding: '14px 16px' }} onClick={() => { setChannel(o.id); setContact(''); }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={19} /></div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div className="semibold t-sm">{o.title}</div>
                  <div className="t-xs muted">{o.sub}</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: active ? '6px solid var(--primary)' : '2px solid var(--line)' }} />
              </button>
            );
          })}

          <div className="field-label mt-3">{channel === 'email' ? 'Email address' : 'Phone number'}</div>
          <div className="field mb-6">
            {channel === 'email' ? <Mail size={18} className="muted" /> : <Phone size={18} className="muted" />}
            <input
              type={channel === 'email' ? 'email' : 'tel'}
              inputMode={channel === 'email' ? 'email' : 'tel'}
              autoComplete={channel === 'email' ? 'email' : 'tel'}
              placeholder={channel === 'email' ? 'Enter your email' : '024 000 0000'}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <button className="btn btn-primary mt-auto" onClick={sendCode}>Send code <ChevronRight size={18} /></button>
        </>
      )}

      {/* ---------------- Verify code ---------------- */}
      {step === 'verify' && (
        <>
          <IconCircle icon={MailCheck} />
          <h1 className="text-center mb-2">Verify code</h1>
          <p className="muted text-center mb-6" style={{ margin: '0 auto 24px', maxWidth: 280 }}>
            Enter the 4-digit code sent to <span className="semibold" style={{ color: 'var(--ink)' }}>{contact}</span>.
          </p>

          <div className="flex gap-3 justify-center mb-5">
            {code.map((d, i) => (
              <input
                key={i}
                ref={otpRefs[i]}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onOtpKey(i, e)}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                style={{ width: 60, height: 64, textAlign: 'center', fontSize: 26, fontWeight: 700, background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', outline: 'none', color: 'var(--ink)' }}
              />
            ))}
          </div>

          <button className="btn btn-primary" onClick={verify}>Verify</button>
          <button className="btn" style={{ background: 'transparent', color: 'var(--primary-dark)', marginTop: 8 }} onClick={() => toast('New code sent', 'info')}>Resend code</button>
        </>
      )}

      {/* ---------------- New password ---------------- */}
      {step === 'new' && (
        <>
          <IconCircle icon={Lock} />
          <h1 className="text-center mb-2">Create new password</h1>
          <p className="muted text-center mb-6" style={{ margin: '0 auto 24px', maxWidth: 280 }}>
            Your new password must be different from previous ones.
          </p>

          <div className="field-label">New password</div>
          <div className="field mb-4">
            <Lock size={18} className="muted" />
            <input type={showPw ? 'text' : 'password'} name="new-password" autoComplete="new-password" placeholder="Enter new password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
            <button className="muted" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="field-label">Confirm password</div>
          <div className="field mb-6">
            <Lock size={18} className="muted" />
            <input type={showPw ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" placeholder="Re-enter new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>

          <button className="btn btn-primary mt-auto" onClick={save}>Save password</button>
        </>
      )}
    </div>
  );
};

export default ResetPassword;
