import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Pencil, Check, LogOut, Star, Lock, ShieldCheck, ShieldAlert,
  Smartphone, CreditCard, Bell, Moon,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { PAYMENT_PROVIDERS } from '../../data/paymentProviders';

import Avatar from '../../components/Avatar';
import Toggle from '../../components/Toggle';

const InfoRow = ({ label, value, locked }) => (
  <div className="flex justify-between items-center t-sm" style={{ gap: 12 }}>
    <span className="muted no-shrink">{label}</span>
    <span className="semibold flex items-center gap-1" style={{ minWidth: 0 }}>
      {locked && <Lock size={11} className="muted" />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </span>
  </div>
);

const DriverProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser, setVehicleInfo, submitVerification, setPayoutMethod, logout } = useAuth();
  const toast = useToast();
  const { isDark, toggleTheme } = useTheme();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [vehicleForm, setVehicleForm] = useState(null); // { licenseNo, vehiclePlate } | null
  const [payForm, setPayForm] = useState(null);
  const [settings, setSettings] = useState({ notify: true });

  if (!user) return null;

  const saveProfile = () => {
    if (!form.name.trim()) { toast('Name cannot be empty', 'error'); return; }
    updateUser(form);
    setEditing(false);
    toast('Profile updated', 'success');
  };

  const saveVehicle = () => {
    if (!vehicleForm.licenseNo.trim() || !vehicleForm.vehiclePlate.trim()) { toast('Add your license and plate number', 'error'); return; }
    setVehicleInfo(vehicleForm);
    setVehicleForm(null);
    toast('Vehicle details saved — pending verification', 'success');
  };

  const savePay = () => {
    const isCard = payForm.type === 'card';
    const digits = (payForm.number || '').replace(/\D/g, '');
    if (isCard) {
      if (digits.length < 12) { toast('Enter a valid card number', 'error'); return; }
      if (!/^\d{2}\/\d{2}$/.test(payForm.expiry || '')) { toast('Enter expiry as MM/YY', 'error'); return; }
    } else if (digits.length < 9) {
      toast('Enter a valid mobile number', 'error');
      return;
    }
    const label = PAYMENT_PROVIDERS.find((p) => p.type === payForm.type).label;
    const detail = isCard ? `•••• ${digits.slice(-4)}` : `${digits.slice(0, 3)} ••• ${digits.slice(-2)}`;
    setPayoutMethod({ type: payForm.type, label, detail });
    setPayForm(null);
    toast('Payout method saved', 'success');
  };

  return (
    <div className="screen has-nav fade-up">
      <div className="flex justify-between items-center mb-5">
        <h1>Driver profile</h1>
        <button className="icon-btn" onClick={() => (editing ? saveProfile() : setEditing(true))}>
          {editing ? <Check size={18} /> : <Pencil size={17} />}
        </button>
      </div>

      {/* Identity & account */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} color={user.avatarColor} size={60} />
          {editing ? (
            <div style={{ flex: 1 }}>
              <div className="field-label">Full name</div>
              <div className="field mb-2"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" /></div>
              <div className="field-label">Phone</div>
              <div className="field"><input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="024 000 0000" /></div>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <div className="bold" style={{ fontSize: 18 }}>{user.name}</div>
              <div className="t-sm muted">{user.phone || 'No phone'}</div>
              <div className="badge badge-primary mt-2"><Star size={11} fill="#F4C430" stroke="#F4C430" /> {user.rating?.toFixed(1)} rating</div>
            </div>
          )}
        </div>

        <div className="divider" style={{ margin: '14px 0' }} />

        <div className="flex flex-col gap-2">
          <InfoRow label="Email" value={user.email || 'Not added'} locked />
          <InfoRow label="Registration no." value={user.regNo} locked />
          <InfoRow label="Member since" value={user.joinedISO ? format(new Date(user.joinedISO), 'MMMM yyyy') : '—'} />
        </div>
      </div>

      {/* Vehicle & verification */}
      <div className="flex justify-between items-center mb-2">
        <h3>Vehicle & license</h3>
        <span className={`badge ${user.verificationStatus === 'verified' ? 'badge-success' : 'badge-warning'}`}>
          {user.verificationStatus === 'verified' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
          {user.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
        </span>
      </div>
      <div className="card mb-4">
        {vehicleForm ? (
          <>
            <div className="field-label">Driver's license no.</div>
            <div className="field mb-2"><input value={vehicleForm.licenseNo} onChange={(e) => setVehicleForm({ ...vehicleForm, licenseNo: e.target.value })} placeholder="DVLA-000000" /></div>
            <div className="field-label">Vehicle plate</div>
            <div className="field mb-3"><input value={vehicleForm.vehiclePlate} onChange={(e) => setVehicleForm({ ...vehicleForm, vehiclePlate: e.target.value })} placeholder="GR 1234-24" /></div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setVehicleForm(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={saveVehicle}>Save</button>
            </div>
          </>
        ) : (
          <>
            <InfoRow label="License no." value={user.licenseNo || 'Not added'} />
            <div className="divider" style={{ margin: '10px 0' }} />
            <InfoRow label="Plate" value={user.vehiclePlate || 'Not added'} />
            <div className="flex gap-2 mt-3">
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setVehicleForm({ licenseNo: user.licenseNo || '', vehiclePlate: user.vehiclePlate || '' })}>Edit details</button>
              {user.verificationStatus !== 'verified' && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={submitVerification} disabled={!user.licenseNo || !user.vehiclePlate}>Submit for verification</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Payout method */}
      <div className="flex justify-between items-center mb-2">
        <h3>Payout method</h3>
        {!user.payoutMethod && !payForm && (
          <button className="t-sm semibold" style={{ color: 'var(--primary-dark)' }} onClick={() => setPayForm({ type: 'momo', number: '', expiry: '' })}>Add</button>
        )}
      </div>
      <div className="card mb-4" style={{ padding: user.payoutMethod && !payForm ? 12 : 6 }}>
        {payForm ? (
          <div style={{ padding: 6 }}>
            <div className="scroll-x mb-3" style={{ margin: 0, padding: 0 }}>
              {PAYMENT_PROVIDERS.map((p) => (
                <button key={p.type} className={`chip${payForm.type === p.type ? ' active' : ''}`} onClick={() => setPayForm({ type: p.type, number: '', expiry: '' })}>{p.label}</button>
              ))}
            </div>
            {payForm.type === 'card' ? (
              <>
                <div className="field-label">Card number</div>
                <div className="field mb-2"><CreditCard size={18} className="muted" /><input inputMode="numeric" placeholder="0000 0000 0000 0000" value={payForm.number} onChange={(e) => setPayForm({ ...payForm, number: e.target.value })} /></div>
                <div className="field-label">Expiry date</div>
                <div className="field mb-3"><input inputMode="numeric" placeholder="MM/YY" value={payForm.expiry} onChange={(e) => setPayForm({ ...payForm, expiry: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div className="field-label">Mobile money number</div>
                <div className="field mb-3"><Smartphone size={18} className="muted" /><input type="tel" inputMode="tel" placeholder="024 000 0000" value={payForm.number} onChange={(e) => setPayForm({ ...payForm, number: e.target.value })} /></div>
              </>
            )}
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setPayForm(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={savePay}>Save method</button>
            </div>
          </div>
        ) : user.payoutMethod ? (
          <div className="flex items-center gap-3">
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user.payoutMethod.type === 'card' ? <CreditCard size={17} /> : <Smartphone size={17} />}
            </div>
            <div style={{ flex: 1 }}><div className="semibold t-sm">{user.payoutMethod.label}</div><div className="t-xs muted">{user.payoutMethod.detail}</div></div>
            <button className="t-sm semibold" style={{ color: 'var(--primary-dark)' }} onClick={() => setPayForm({ type: user.payoutMethod.type, number: '', expiry: '' })}>Change</button>
          </div>
        ) : (
          <div className="t-sm muted text-center" style={{ padding: 12 }}>No payout method added</div>
        )}
      </div>

      {/* Settings */}
      <h3 className="mb-2">Settings</h3>
      <div className="card mb-4" style={{ padding: 6 }}>
        {[
          { key: 'dark', label: 'Dark mode', icon: Moon },
          { key: 'notify', label: 'Push notifications', icon: Bell },
        ].map(({ key, label, icon: Icon }) => {
          const on = key === 'dark' ? isDark : settings[key];
          const handle = key === 'dark' ? toggleTheme : () => setSettings((s) => ({ ...s, [key]: !s[key] }));
          return (
            <div key={key} className="flex items-center gap-3" style={{ padding: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={17} /></div>
              <span className="t-sm semibold" style={{ flex: 1 }}>{label}</span>
              <Toggle on={on} onClick={handle} />
            </div>
          );
        })}
      </div>

      <button className="btn btn-outline mb-4" style={{ color: 'var(--red)', borderColor: 'rgba(206,17,38,0.25)' }} onClick={() => { logout(); navigate('/welcome', { replace: true }); }}>
        <LogOut size={18} /> Log out
      </button>
      <div className="text-center t-xs muted" style={{ paddingBottom: 16 }}>
        Akwaaba Express · Driver Prototype v1.0
      </div>
    </div>
  );
};

export default DriverProfile;
