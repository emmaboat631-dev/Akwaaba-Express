import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { Plus, X, Bus, Calendar, MapPin, Clock, AlertTriangle } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { cityById } from '../../data/cities';
import { OPERATORS, BUS_TYPES, operatorById, busTypeById } from '../../data/operators';
import { formatCedi, minutesToClock } from '../../utils/format';


import Header from '../../components/Header';
import EmptyState from '../../components/EmptyState';
import OperatorMark from '../../components/OperatorMark';
import CityPicker from '../../components/CityPicker';

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

const timeToMins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const DriverTripManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const [pickingCity, setPickingCity] = useState(null);
  const [form, setForm] = useState({
    fromId: '',
    toId: '',
    date: todayISO(),
    departTime: '06:00',
    operatorId: user?.operatorId || '',
    busTypeId: user?.busTypeId || '',
    plate: user?.vehiclePlate || '',
    price: '',
  });

  const fetchTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('driver_id', user.id)
      .gte('travel_date', todayISO())
      .order('travel_date', { ascending: true });
    setTrips(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTrips(); }, [user.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.fromId || !form.toId) { toast('Select origin and destination', 'error'); return; }
    if (form.fromId === form.toId) { toast('Origin and destination must differ', 'error'); return; }
    if (!form.operatorId) { toast('Select an operator', 'error'); return; }
    if (!form.busTypeId) { toast('Select a bus type', 'error'); return; }
    if (!form.price || Number(form.price) < 1) { toast('Enter a valid price', 'error'); return; }

    const bt = busTypeById(form.busTypeId);
    const departMins = timeToMins(form.departTime);
    const from = cityById(form.fromId);
    const to = cityById(form.toId);
    const distKm = Math.round(
      111.32 * Math.sqrt(
        Math.pow(from.lat - to.lat, 2) + Math.pow((from.lng - to.lng) * Math.cos((from.lat * Math.PI) / 180), 2)
      )
    );
    const durMins = Math.round(distKm / 56 * 60);

    setSubmitting(true);
    const { error } = await supabase.from('trips').insert([{
      driver_id: user.id,
      from_id: form.fromId,
      to_id: form.toId,
      travel_date: form.date,
      operator_id: form.operatorId,
      bus_type_id: form.busTypeId,
      plate: form.plate || 'TBD',
      depart_mins: departMins,
      arrive_mins: departMins + durMins,
      duration_mins: durMins,
      distance_km: distKm,
      price: Number(form.price),
      seats_total: bt?.seats || 44,
    }]);

    if (error) {
      console.error('Trip insert failed:', error);
      toast('Could not create trip. Please try again.', 'error');
      setSubmitting(false);
      return;
    }

    toast('Trip created', 'success');
    setCreating(false);
    setSubmitting(false);
    setForm((f) => ({ ...f, fromId: '', toId: '', price: '' }));
    fetchTrips();
  };

  const cancelTrip = async (tripId) => {
    const { error } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', tripId)
      .eq('driver_id', user.id);
    setConfirmCancel(null);
    if (error) {
      console.error('Trip cancel failed:', error);
      toast('Could not cancel trip. Please try again.', 'error');
      return;
    }
    toast('Trip cancelled', 'info');
    fetchTrips();
  };

  const fromCity = cityById(form.fromId);
  const toCity = cityById(form.toId);

  return (
    <div className="screen fade-up">
      <Header title="Manage trips" onBack={() => navigate('/driver')} />

      {!creating && (
        <button className="btn btn-primary mb-4" onClick={() => setCreating(true)}>
          <Plus size={18} /> Create scheduled trip
        </button>
      )}

      {creating && (
        <div className="card mb-4" style={{ padding: 20 }}>
          <div className="semibold mb-3">New scheduled trip</div>

          <div className="flex gap-3 mb-3">
            <div style={{ flex: 1 }}>
              <div className="field-label">From</div>
              <button className="field" style={{ cursor: 'pointer' }} onClick={() => setPickingCity('from')}>
                <MapPin size={16} className="muted" />
                <span className={fromCity ? '' : 'muted'}>{fromCity?.name || 'Select city'}</span>
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">To</div>
              <button className="field" style={{ cursor: 'pointer' }} onClick={() => setPickingCity('to')}>
                <MapPin size={16} className="muted" />
                <span className={toCity ? '' : 'muted'}>{toCity?.name || 'Select city'}</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <div style={{ flex: 1 }}>
              <div className="field-label">Date</div>
              <div className="field">
                <Calendar size={16} className="muted" />
                <input type="date" value={form.date} min={todayISO()} max={format(addDays(new Date(), 30), 'yyyy-MM-dd')} onChange={(e) => set('date', e.target.value)} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Departure</div>
              <div className="field">
                <Clock size={16} className="muted" />
                <input type="time" value={form.departTime} onChange={(e) => set('departTime', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="field-label">Operator</div>
          <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
            {OPERATORS.map((op) => (
              <button
                key={op.id}
                className={`badge${form.operatorId === op.id ? ' badge-primary' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => set('operatorId', op.id)}
              >
                {op.mark}
              </button>
            ))}
          </div>

          <div className="field-label">Bus type</div>
          <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
            {BUS_TYPES.map((bt) => (
              <button
                key={bt.id}
                className={`badge${form.busTypeId === bt.id ? ' badge-primary' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => set('busTypeId', bt.id)}
              >
                {bt.name} ({bt.seats} seats)
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-3">
            <div style={{ flex: 1 }}>
              <div className="field-label">Plate number</div>
              <div className="field">
                <input placeholder="GR 1234-22" value={form.plate} onChange={(e) => set('plate', e.target.value)} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="field-label">Price per seat (GH₵)</div>
              <div className="field">
                <input type="number" inputMode="numeric" placeholder="e.g. 120" value={form.price} onChange={(e) => set('price', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Create trip'}
            </button>
          </div>
        </div>
      )}

      <CityPicker
        open={!!pickingCity}
        title={pickingCity === 'from' ? 'Select origin' : 'Select destination'}
        onSelect={(city) => {
          set(pickingCity === 'from' ? 'fromId' : 'toId', city.id);
          setPickingCity(null);
        }}
        onClose={() => setPickingCity(null)}
      />

      <div className="semibold mb-3">Your upcoming trips</div>

      {loading ? (
        <div className="text-center muted" style={{ padding: 32 }}>Loading…</div>
      ) : trips.length === 0 ? (
        <EmptyState icon={Bus} title="No upcoming trips" message="Create a scheduled trip above to get started." />
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((t) => {
            const op = operatorById(t.operator_id);
            const from = cityById(t.from_id);
            const to = cityById(t.to_id);
            const cancelled = t.status === 'cancelled';
            return (
              <div key={t.id} className="card" style={{ opacity: cancelled ? 0.5 : 1 }}>
                <div className="flex items-center gap-3">
                  <OperatorMark operator={op} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="semibold t-sm">{from?.name || t.from_id} → {to?.name || t.to_id}</div>
                    <div className="t-xs muted">
                      {format(new Date(t.travel_date + 'T00:00:00'), 'd MMM yyyy')} · {minutesToClock(t.depart_mins)} · {formatCedi(t.price)}
                    </div>
                  </div>
                  {cancelled ? (
                    <span className="badge" style={{ background: '#FBE9E9', color: 'var(--red)' }}>Cancelled</span>
                  ) : (
                    <button
                      className="t-xs"
                      style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setConfirmCancel(t)}
                    >
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {confirmCancel && (() => {
        const from = cityById(confirmCancel.from_id);
        const to = cityById(confirmCancel.to_id);
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,20,14,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card pop-in" style={{ maxWidth: 340, width: '100%', padding: 24, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FDF1E2', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <AlertTriangle size={22} />
              </div>
              <div className="semibold mb-1">Cancel this trip?</div>
              <p className="t-xs muted mb-4">
                {from?.name} to {to?.name} on {format(new Date(confirmCancel.travel_date + 'T00:00:00'), 'd MMM yyyy')}. Passengers with bookings will be notified.
              </p>
              <div className="flex gap-3">
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmCancel(null)}>Keep trip</button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--red)' }} onClick={() => cancelTrip(confirmCancel.id)}>Cancel trip</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DriverTripManager;
