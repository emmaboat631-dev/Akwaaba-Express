import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, Plus, Minus, Bus, Pencil, Check } from 'lucide-react';

import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';

const blank = { name: '', phone: '', idNo: '' };

const Passengers = () => {
  const navigate = useNavigate();
  const { draft, setPassengers, setSeats } = useBooking();
  const { user } = useAuth();
  const toast = useToast();
  const trip = draft.trip;

  const isLive = draft.type === 'live';
  const seatCount = draft.seats?.length || 0;
  const maxLive = trip?.seatsAvailable || 4;

  // The account holder is always passenger 1 — prefilled from the profile,
  // editable in place. Full forms are only asked for the extra riders.
  const [booker, setBooker] = useState(() => ({
    ...blank,
    name: user?.name || 'Traveller',
    phone: user?.phone || '',
    idNo: user?.ghanaCard || '',
    ...(draft.passengers?.[0] || {}),
  }));
  const [editingBooker, setEditingBooker] = useState(false);
  const [extras, setExtras] = useState(() => {
    const count = isLive
      ? Math.max(0, (draft.passengers?.length || 1) - 1)
      : Math.max(0, seatCount - 1);
    return Array.from({ length: count }, (_, i) =>
      draft.passengers?.[i + 1] ? { ...blank, ...draft.passengers[i + 1] } : { ...blank },
    );
  });

  const setField = (i, k) => (e) =>
    setExtras((p) => p.map((person, idx) => (idx === i ? { ...person, [k]: e.target.value } : person)));

  const setBookerField = (k) => (e) => setBooker((b) => ({ ...b, [k]: e.target.value }));

  const closeBookerEdit = () => {
    if (booker.name.trim().length < 2) { toast('Add your name', 'error'); return; }
    setEditingBooker(false);
  };

  // Live hail: the stepper sets the total riders (booker + extras).
  const changeCount = (delta) =>
    setExtras((p) => {
      const next = Math.min(maxLive - 1, Math.max(0, p.length + delta));
      if (next > p.length) return [...p, { ...blank }];
      return p.slice(0, next);
    });

  const valid = useMemo(
    () => booker.name.trim().length > 1 && extras.every((p) => p.name.trim().length > 1),
    [booker, extras],
  );

  if (!trip) {
    return (
      <div className="screen has-nav">
        <Header title="Passengers" />
        <EmptyState icon={Bus} title="No active booking" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Find a bus</button>} />
      </div>
    );
  }

  const proceed = () => {
    if (!valid) { toast('Add each passenger’s name', 'error'); return; }
    const passengers = [booker, ...extras];
    if (isLive) setSeats(passengers.map((_, i) => `GA${i + 1}`)); // general admission seats
    setPassengers(passengers);
    navigate('/payment');
  };

  return (
    <div className="screen has-nav fade-up">
      <Header title="Passenger details" subtitle={isLive ? 'Who is riding?' : `${seatCount} seat${seatCount === 1 ? '' : 's'} selected`} />

      {isLive && (
        <div className="card flex justify-between items-center mb-4">
          <span className="semibold t-sm">Number of seats</span>
          <div className="flex items-center gap-3">
            <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => changeCount(-1)}><Minus size={16} /></button>
            <span className="bold" style={{ width: 18, textAlign: 'center' }}>{extras.length + 1}</span>
            <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => changeCount(1)}><Plus size={16} /></button>
          </div>
        </div>
      )}

      {/* Booker — prefilled from the account, editable in place */}
      <div className="card mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={booker.name} color={user?.avatarColor} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="semibold t-sm">{booker.name || 'Your name'}</div>
            <div className="t-xs muted">{booker.phone || 'No phone added'}</div>
          </div>
          <span className="badge badge-primary">
            {!isLive && draft.seats[0] ? `You · Seat ${draft.seats[0]}` : 'You'}
          </span>
          <button
            className="icon-btn"
            style={{ width: 34, height: 34, background: 'var(--surface-2)', boxShadow: 'none' }}
            onClick={() => (editingBooker ? closeBookerEdit() : setEditingBooker(true))}
            aria-label={editingBooker ? 'Done editing' : 'Edit your details'}
          >
            {editingBooker ? <Check size={16} /> : <Pencil size={14} />}
          </button>
        </div>

        {editingBooker && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div className="field-label">Full name</div>
            <div className="field mb-3"><input autoFocus placeholder="e.g. Kwesi Boateng" value={booker.name} onChange={setBookerField('name')} /></div>
            <div className="flex gap-3">
              <div style={{ flex: 1 }}>
                <div className="field-label">Phone</div>
                <div className="field"><input type="tel" inputMode="tel" placeholder="024 000 0000" value={booker.phone} onChange={setBookerField('phone')} /></div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="field-label">Ghana Card (optional)</div>
                <div className="field"><input placeholder="GHA-000…" value={booker.idNo} onChange={setBookerField('idNo')} /></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {extras.length > 0 && (
        <div className="flex flex-col gap-4">
          {extras.map((p, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserRound size={15} /></div>
                <span className="semibold t-sm">Passenger {i + 2}{!isLive && draft.seats[i + 1] ? ` · Seat ${draft.seats[i + 1]}` : ''}</span>
              </div>
              <div className="field-label">Full name</div>
              <div className="field mb-3"><input placeholder="e.g. Kwesi Boateng" value={p.name} onChange={setField(i, 'name')} /></div>
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <div className="field-label">Phone</div>
                  <div className="field"><input type="tel" inputMode="tel" placeholder="024 000 0000" value={p.phone} onChange={setField(i, 'phone')} /></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="field-label">Ghana Card (optional)</div>
                  <div className="field"><input placeholder="GHA-000…" value={p.idNo} onChange={setField(i, 'idNo')} /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto" style={{ paddingTop: 16 }}>
        <button className="btn btn-primary" onClick={proceed}>Continue to payment</button>
      </div>
    </div>
  );
};

export default Passengers;
