import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bus, ScanLine } from 'lucide-react';

import { useDriver } from '../../context/DriverContext';
import { useToast } from '../../context/ToastContext';
import { findAssignedTripById, generateManifest } from '../../data/driverTrips';
import { cityById } from '../../data/cities';
import { supabase } from '../../lib/supabase';

import Header from '../../components/Header';
import EmptyState from '../../components/EmptyState';

const DriverManifest = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const driver = useDriver();
  const toast = useToast();

  const isRealTrip = !tripId.startsWith('assign__');
  const trip = useMemo(() => (isRealTrip ? null : findAssignedTripById(tripId)), [tripId, isRealTrip]);

  const [realPassengers, setRealPassengers] = useState([]);
  const [loading, setLoading] = useState(isRealTrip);
  const [realTripInfo, setRealTripInfo] = useState(null);

  const fetchPassengers = useCallback(async () => {
    if (!isRealTrip) return;
    setLoading(true);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, seats, passengers:booking_passengers(*)')
      .eq('trip_id', tripId)
      .eq('status', 'confirmed');

    const passengers = [];
    (bookings || []).forEach((b) => {
      (b.passengers || []).forEach((p) => {
        passengers.push({
          id: p.id,
          seatNo: p.seat || '—',
          passengerName: p.name,
          phone: p.phone || '',
          boarded: p.checked_in || false,
        });
      });
    });
    setRealPassengers(passengers);

    const { data: tripData } = await supabase
      .from('trips')
      .select('from_id, to_id')
      .eq('id', tripId)
      .single();
    if (tripData) setRealTripInfo(tripData);

    setLoading(false);
  }, [isRealTrip, tripId]);

  useEffect(() => { fetchPassengers(); }, [fetchPassengers]);

  const manifest = isRealTrip ? realPassengers : generateManifest(trip);
  const [localBoarded, setLocalBoarded] = useState(() => new Set());

  if (!isRealTrip && !trip) {
    return (
      <div className="screen">
        <Header title="Manifest" />
        <EmptyState icon={Bus} title="Trip not found" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/driver')}>Back to dashboard</button>} />
      </div>
    );
  }

  const from = isRealTrip
    ? cityById(realTripInfo?.from_id)
    : cityById(trip.fromId);
  const to = isRealTrip
    ? cityById(realTripInfo?.to_id)
    : cityById(trip.toId);
  const status = driver.getAssignedStatus(tripId);

  const toggleBoarded = async (passenger) => {
    if (isRealTrip && passenger.id) {
      const newValue = !passenger.boarded;
      const { error } = await supabase
        .from('booking_passengers')
        .update({ checked_in: newValue })
        .eq('id', passenger.id);
      if (error) {
        toast('Could not update boarding status', 'error');
        return;
      }
      setRealPassengers((prev) =>
        prev.map((p) => (p.id === passenger.id ? { ...p, boarded: newValue } : p))
      );
    } else {
      setLocalBoarded((s) => {
        const next = new Set(s);
        if (next.has(passenger.seatNo)) next.delete(passenger.seatNo); else next.add(passenger.seatNo);
        return next;
      });
    }
  };

  const cta =
    status === 'scheduled'
      ? { label: 'Start trip', onClick: () => { driver.startTrip(tripId); navigate(`/driver/trip/${tripId}`); } }
      : status === 'in-progress'
        ? { label: 'Continue trip', onClick: () => navigate(`/driver/trip/${tripId}`) }
        : { label: 'Trip completed', onClick: () => {}, disabled: true };

  return (
    <div className="screen fade-up">
      <Header
        title="Passenger manifest"
        subtitle={from && to ? `${from.name} → ${to.name}` : ''}
        right={
          <button className="icon-btn" onClick={() => navigate(`/driver/scan?tripId=${tripId}`)} aria-label="Scan ticket">
            <ScanLine size={18} />
          </button>
        }
      />

      {loading ? (
        <div className="text-center muted" style={{ padding: 32 }}>Loading…</div>
      ) : manifest.length === 0 ? (
        <EmptyState icon={Bus} title="No passengers yet" message="Passengers will appear here once they book this trip." />
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {manifest.map((p, i) => {
            const isBoarded = isRealTrip ? p.boarded : localBoarded.has(p.seatNo);
            return (
              <div key={p.id || i} className="card card-pressable flex items-center gap-3" onClick={() => toggleBoarded(p)}>
                <div className="badge badge-primary" style={{ minWidth: 34, justifyContent: 'center' }}>{p.seatNo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="semibold t-sm">{p.passengerName}</div>
                  <div className="t-xs muted">{p.phone}</div>
                </div>
                <span className="badge" style={isBoarded ? { background: 'var(--success-light)', color: 'var(--success)' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>
                  {isBoarded ? 'Boarded' : 'Waiting'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-auto">
        <button className="btn btn-primary" onClick={cta.onClick} disabled={cta.disabled}>{cta.label}</button>
      </div>
    </div>
  );
};

export default DriverManifest;
