import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Power } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useDriver } from '../../context/DriverContext';
import { useDriverHail } from '../../hooks/useDriverHail';
import { useGeolocation } from '../../hooks/useGeolocation';
import { generateAssignedTrip, todayISO } from '../../data/driverTrips';
import { operatorById, busTypeById } from '../../data/operators';
import { cityById } from '../../data/cities';
import { formatCedi, minutesToClock } from '../../utils/format';

import Avatar from '../../components/Avatar';
import OperatorMark from '../../components/OperatorMark';
import Toggle from '../../components/Toggle';
import EmptyState from '../../components/EmptyState';
import IncomingRequestOverlay from '../../components/driver/IncomingRequestOverlay';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const driver = useDriver();
  const hail = useDriverHail();
  const { position } = useGeolocation();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { driver.rollDayIfNeeded(); }, []);

  // RequireAuth always guards this route, so `user` is never null here in
  // practice — the guard just matches the defensive pattern the rest of the
  // app uses (see Profile.jsx).
  const userId = user?.id;
  const trip = useMemo(() => (userId ? generateAssignedTrip(userId, todayISO()) : null), [userId]);

  if (!user || !trip) return null;

  const operator = operatorById(trip.operatorId);
  const busType = busTypeById(trip.busTypeId);
  const from = cityById(trip.fromId);
  const to = cityById(trip.toId);
  const status = driver.getAssignedStatus(trip.id);

  const todaysEntries = driver.completedTrips.filter((t) => t.date.slice(0, 10) === todayISO());
  const todayEarnings = todaysEntries.reduce((sum, t) => sum + t.amount, 0);
  const todayKm = todaysEntries.reduce((sum, t) => sum + (t.distanceKm || 0), 0);

  const toggleOnline = () => {
    const next = !hail.online;
    driver.setOnline(next);
    if (next) hail.goOnline(position);
    else hail.goOffline();
  };

  const acceptRequest = (id) => {
    hail.accept(id);
    driver.recordAccept();
    navigate(`/driver/request/${id}`);
  };
  const declineRequest = (id) => {
    hail.decline(id);
    driver.recordDecline();
  };

  const tripCta =
    status === 'scheduled'
      ? { label: 'View manifest', onClick: () => navigate(`/driver/trip/${trip.id}/manifest`) }
      : { label: 'Continue trip', onClick: () => navigate(`/driver/trip/${trip.id}`) };

  return (
    <div className="screen has-nav fade-up">
      <div className="flex justify-between items-start mb-4">
        <div style={{ paddingTop: 4 }}>
          <div className="t-sm muted">Akwaaba, {user.name?.split(' ')[0]}</div>
          <h1 className="t-display mt-1" style={{ fontSize: 28 }}>Driver dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={() => navigate('/driver/scan')} aria-label="Scan ticket"><ScanLine size={19} /></button>
          <Avatar name={user.name} color={user.avatarColor} size={44} onClick={() => navigate('/driver/profile')} />
        </div>
      </div>

      {/* Online toggle */}
      <div className="card flex items-center justify-between mb-4" style={{ padding: 16 }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: hail.online ? 'var(--success-light)' : 'var(--surface-2)', color: hail.online ? 'var(--success)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Power size={19} />
          </div>
          <div>
            <div className="semibold">{hail.online ? "You're online" : "You're offline"}</div>
            <div className="t-xs muted">{hail.online ? 'Receiving live ride requests' : 'Go online to receive requests'}</div>
          </div>
        </div>
        <Toggle on={hail.online} onClick={toggleOnline} />
      </div>

      {/* Today overview strip */}
      <div className="flex gap-3 mb-4">
        <div className="card flex-1 text-center" style={{ padding: 14 }}>
          <div className="bold t-num" style={{ fontSize: 18, color: 'var(--primary-dark)' }}>{formatCedi(todayEarnings)}</div>
          <div className="t-xs muted">today</div>
        </div>
        <div className="card flex-1 text-center" style={{ padding: 14 }}>
          <div className="bold t-num" style={{ fontSize: 18 }}>{todayKm.toFixed(1)}</div>
          <div className="t-xs muted">km</div>
        </div>
        <div className="card flex-1 text-center" style={{ padding: 14 }}>
          <div className="bold t-num" style={{ fontSize: 18 }}>{todaysEntries.length}</div>
          <div className="t-xs muted">trips</div>
        </div>
      </div>

      {/* Today's assigned trip */}
      <h3 className="mb-2">Today's assigned trip</h3>
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <OperatorMark operator={operator} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="semibold t-sm">{operator.name} · {busType.name}</div>
            <div className="t-xs muted">{from.name} → {to.name}</div>
          </div>
          <div className="text-right">
            <div className="bold t-num" style={{ fontSize: 16 }}>{minutesToClock(trip.departMins)}</div>
            <div className="t-xs muted">plate {trip.plate}</div>
          </div>
        </div>
        {status === 'completed' ? (
          <span className="badge badge-success">Completed today</span>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={tripCta.onClick} style={{ width: '100%' }}>{tripCta.label}</button>
        )}
      </div>

      {/* Live requests status */}
      <h3 className="mb-2">Live requests</h3>
      {hail.online ? (
        <div className="card flex items-center gap-2" style={{ padding: 14 }}>
          <span className="live-dot" />
          <span className="t-sm semibold">Online — waiting for a ride request…</span>
        </div>
      ) : (
        <EmptyState icon={Power} title="You're offline" message="Go online to start receiving live ride requests." />
      )}

      {hail.online && !hail.activeRequest && hail.requests[0] && (
        <IncomingRequestOverlay request={hail.requests[0]} onAccept={acceptRequest} onDecline={declineRequest} />
      )}
    </div>
  );
};

export default DriverDashboard;
