import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Pencil, Check, LogOut, Home, Briefcase, MapPin, Plus, Trash2,
  Smartphone, CreditCard, Bell, Moon, Star, Lock,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

import Avatar from '../components/Avatar';

const PLACE_ICONS = { home: Home, work: Briefcase, other: MapPin };

const PAYMENT_PROVIDERS = [
  { type: 'momo', label: 'MTN MoMo' },
  { type: 'telecel', label: 'Telecel Cash' },
  { type: 'airteltigo', label: 'AirtelTigo Money' },
  { type: 'card', label: 'Visa / Mastercard' },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout, addSavedPlace, removeSavedPlace, addPaymentMethod, removePaymentMethod } = useAuth();
  const { bookings } = useTrips();
  const toast = useToast();
  const { isDark, toggleTheme } = useTheme();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', ghanaCard: '' });
  const [place, setPlace] = useState(null); // { label, address } | null
  const [payForm, setPayForm] = useState(null); // { type, number, expiry } | null
  const [settings, setSettings] = useState({ notify: true, email: false });

  if (!user) return null;

  const saveProfile = () => {
    if (!form.name.trim()) { toast('Name cannot be empty', 'error'); return; }
    updateUser(form);
    setEditing(false);
    toast('Profile updated', 'success');
  };

  const savePlace = () => {
    if (!place?.label?.trim() || !place?.address?.trim()) { toast('Add a label and address', 'error'); return; }
    addSavedPlace({ label: place.label, address: place.address, icon: 'other' });
    setPlace(null);
    toast('Place saved', 'success');
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
    addPaymentMethod({ type: payForm.type, label, detail });
    setPayForm(null);
    toast('Payment method added', 'success');
  };

  const InfoRow = ({ label, value, locked }) => (
    <div className="flex justify-between items-center t-sm" style={{ gap: 12 }}>
      <span className="muted no-shrink">{label}</span>
      <span className="semibold flex items-center gap-1" style={{ minWidth: 0 }}>
        {locked && <Lock size={11} className="muted" />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      </span>
    </div>
  );

  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick} style={{ width: 44, height: 26, borderRadius: 13, background: on ? 'var(--primary)' : 'var(--line)', position: 'relative', transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: 'var(--shadow-sm)' }} />
    </button>
  );

  return (
    <div className="screen has-nav fade-up">
      <div className="flex justify-between items-center mb-5">
        <h1>Profile</h1>
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
              <div className="badge badge-primary mt-2"><Star size={11} /> {bookings.length} trips booked</div>
            </div>
          )}
        </div>

        {editing && !user.ghanaCard && (
          <div style={{ marginTop: 12 }}>
            <div className="field-label">Ghana Card — set once, cannot be changed later</div>
            <div className="field"><input placeholder="GHA-000000000-0" value={form.ghanaCard} onChange={(e) => setForm({ ...form, ghanaCard: e.target.value })} /></div>
          </div>
        )}

        <div className="divider" style={{ margin: '14px 0' }} />

        <div className="flex flex-col gap-2">
          <InfoRow label="Email" value={user.email || 'Not added'} locked />
          {!(editing && !user.ghanaCard) && (
            <InfoRow label="Ghana Card" value={user.ghanaCard || 'Not added'} locked={!!user.ghanaCard} />
          )}
          <InfoRow label="Registration no." value={user.regNo} locked />
          <InfoRow label="Member since" value={user.joinedISO ? format(new Date(user.joinedISO), 'MMMM yyyy') : '—'} />
        </div>
      </div>

      {/* Saved places */}
      <div className="flex justify-between items-center mb-2">
        <h3>Saved places</h3>
        <button className="t-sm semibold" style={{ color: 'var(--primary-dark)' }} onClick={() => setPlace({ label: '', address: '' })}><Plus size={14} /> Add</button>
      </div>
      <div className="card mb-4" style={{ padding: 6 }}>
        {user.savedPlaces.map((p) => {
          const Icon = PLACE_ICONS[p.icon] || MapPin;
          return (
            <div key={p.id} className="flex items-center gap-3" style={{ padding: '12px 12px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={17} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="semibold t-sm">{p.label}</div>
                <div className="t-xs muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</div>
              </div>
              <button className="muted" onClick={() => { removeSavedPlace(p.id); toast('Place removed', 'info'); }}><Trash2 size={16} /></button>
            </div>
          );
        })}
        {place && (
          <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
            <div className="field mb-2"><input autoFocus placeholder="Label (e.g. Gym)" value={place.label} onChange={(e) => setPlace({ ...place, label: e.target.value })} /></div>
            <div className="field mb-3"><input placeholder="Address" value={place.address} onChange={(e) => setPlace({ ...place, address: e.target.value })} /></div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setPlace(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={savePlace}>Save place</button>
            </div>
          </div>
        )}
      </div>

      {/* Payment methods */}
      <div className="flex justify-between items-center mb-2">
        <h3>Payment methods</h3>
        <button className="t-sm semibold" style={{ color: 'var(--primary-dark)' }} onClick={() => setPayForm(payForm ? null : { type: 'momo', number: '', expiry: '' })}><Plus size={14} /> Add</button>
      </div>
      <div className="card mb-4" style={{ padding: 6 }}>
        {user.paymentMethods.map((m) => {
          const Icon = m.type === 'card' ? CreditCard : Smartphone;
          return (
            <div key={m.id} className="flex items-center gap-3" style={{ padding: '12px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={17} /></div>
              <div style={{ flex: 1 }}><div className="semibold t-sm">{m.label}</div><div className="t-xs muted">{m.detail}</div></div>
              <button className="muted" onClick={() => { removePaymentMethod(m.id); toast('Method removed', 'info'); }}><Trash2 size={16} /></button>
            </div>
          );
        })}
        {payForm && (
          <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
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
        )}
      </div>

      {/* Settings */}
      <h3 className="mb-2">Settings</h3>
      <div className="card mb-4" style={{ padding: 6 }}>
        {[
          { key: 'dark', label: 'Dark mode', icon: Moon },
          { key: 'notify', label: 'Push notifications', icon: Bell },
          { key: 'email', label: 'Email updates', icon: Bell },
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
      <div className="text-center t-xs muted" style={{ paddingBottom: 16, lineHeight: 1.7 }}>
        Akwaaba Express · Prototype v1.0
      </div>
    </div>
  );
};

export default Profile;
