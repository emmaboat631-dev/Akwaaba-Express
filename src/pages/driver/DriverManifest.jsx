import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bus, ScanLine } from 'lucide-react';

import { useDriver } from '../../context/DriverContext';
import { findAssignedTripById, generateManifest } from '../../data/driverTrips';
import { cityById } from '../../data/cities';

import Header from '../../components/Header';
import EmptyState from '../../components/EmptyState';

const DriverManifest = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const driver = useDriver();

  const trip = useMemo(() => findAssignedTripById(tripId), [tripId]);
  const manifest = useMemo(() => (trip ? generateManifest(trip) : []), [trip]);
  // Boarding checkmarks are session-only — not persisted across a refresh.
  const [boarded, setBoarded] = useState(() => new Set());

  if (!trip) {
    return (
      <div className="screen has-nav">
        <Header title="Manifest" />
        <EmptyState icon={Bus} title="Trip not found" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/driver')}>Back to dashboard</button>} />
      </div>
    );
  }

  const from = cityById(trip.fromId);
  const to = cityById(trip.toId);
  const status = driver.getAssignedStatus(trip.id);

  const toggleBoarded = (seatNo) =>
    setBoarded((s) => {
      const next = new Set(s);
      if (next.has(seatNo)) next.delete(seatNo); else next.add(seatNo);
      return next;
    });

  const cta =
    status === 'scheduled'
      ? { label: 'Start trip', onClick: () => { driver.startTrip(trip.id); navigate(`/driver/trip/${trip.id}`); } }
      : status === 'in-progress'
        ? { label: 'Continue trip', onClick: () => navigate(`/driver/trip/${trip.id}`) }
        : { label: 'Trip completed', onClick: () => {}, disabled: true };

  return (
    <div className="screen has-nav fade-up">
      <Header
        title="Passenger manifest"
        subtitle={`${from.name} → ${to.name}`}
        right={
          <button className="icon-btn" onClick={() => navigate(`/driver/scan?tripId=${trip.id}`)} aria-label="Scan ticket">
            <ScanLine size={18} />
          </button>
        }
      />

      <div className="flex flex-col gap-2 mb-4">
        {manifest.map((p) => {
          const isBoarded = boarded.has(p.seatNo);
          return (
            <div key={p.seatNo} className="card card-pressable flex items-center gap-3" onClick={() => toggleBoarded(p.seatNo)}>
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

      <div className="mt-auto">
        <button className="btn btn-primary" onClick={cta.onClick} disabled={cta.disabled}>{cta.label}</button>
      </div>
    </div>
  );
};

export default DriverManifest;
