import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Navigation } from 'lucide-react';

import { useGeolocation } from '../../hooks/useGeolocation';
import { useDriver } from '../../context/DriverContext';
import { useDriverHail } from '../../hooks/useDriverHail';
import { useToast } from '../../context/ToastContext';
import { findAssignedTripById } from '../../data/driverTrips';
import { operatorById, busTypeById } from '../../data/operators';
import { cityById } from '../../data/cities';
import { formatCedi, minutesToClock } from '../../utils/format';

import BusMap from '../../components/BusMap';
import BottomSheet from '../../components/BottomSheet';
import EmptyState from '../../components/EmptyState';
import OperatorMark from '../../components/OperatorMark';

// Serves both the scheduled-coach trip and the live-hail trip — same
// map-centric layout, different data source and bottom-sheet content,
// mirroring how LiveTracking.jsx is one screen for the analogous passenger case.
const DriverActiveTrip = () => {
  const navigate = useNavigate();
  const { tripId, requestId } = useParams();
  const { position } = useGeolocation();
  const driver = useDriver();
  const hail = useDriverHail();
  const toast = useToast();
  const [arrived, setArrived] = useState(false); // hail-only sub-phase, not persisted

  const isHail = !!requestId;
  const trip = !isHail ? findAssignedTripById(tripId) : null;
  const request = isHail ? hail.activeRequest : null;

  if ((isHail && !request) || (!isHail && !trip)) {
    return (
      <div className="screen fade-up">
        <EmptyState
          icon={MapPin}
          title={isHail ? 'Request no longer active' : 'Trip not found'}
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/driver')}>Back to dashboard</button>}
        />
      </div>
    );
  }

  const operator = trip ? operatorById(trip.operatorId) : null;
  const busType = trip ? busTypeById(trip.busTypeId) : null;
  const from = trip ? cityById(trip.fromId) : null;
  const to = trip ? cityById(trip.toId) : null;

  const routeLine = isHail
    ? (position && request.pickup ? [position, request.pickup] : null)
    : (from && to ? [[from.lat, from.lng], [to.lat, to.lng]] : null);

  const complete = () => {
    if (isHail) {
      driver.completeHail(request);
      hail.completeActive();
      toast('Ride complete', 'success');
    } else {
      driver.completeTrip(trip);
      toast('Trip complete', 'success');
    }
    navigate('/driver', { replace: true });
  };

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <BusMap routeLine={routeLine} fitBounds={routeLine} userPosition={position} />
      </div>

      <div style={{ position: 'absolute', top: 'calc(var(--safe-top) + 14px)', left: 16, zIndex: 20 }}>
        <button className="icon-btn" onClick={() => navigate('/driver')}><ArrowLeft size={20} /></button>
      </div>

      <BottomSheet peek={56} half={0.55} full={0.8} initial="full" bottomOffset={0}>
        {isHail ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Navigation size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="semibold">{request.passengerName}</div>
                <div className="t-xs muted">To {request.destinationName} · {request.distanceKm} km</div>
              </div>
              <span className="badge badge-success"><span className="live-dot" /> Live</span>
            </div>
            <div className="card flex justify-between items-center mb-4" style={{ padding: 14 }}>
              <span className="t-sm muted">Fare</span>
              <span className="bold t-num" style={{ color: 'var(--primary-dark)' }}>{formatCedi(request.fareEstimate)}</span>
            </div>
            <button className="btn btn-primary" onClick={() => (arrived ? complete() : setArrived(true))}>
              {arrived ? 'Complete ride' : 'Arrived at pickup'}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <OperatorMark operator={operator} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="semibold">{operator.name} · {busType.name}</div>
                <div className="t-xs muted">{from.name} → {to.name} · Plate {trip.plate}</div>
              </div>
              <span className="badge badge-primary">{minutesToClock(trip.departMins)}</span>
            </div>
            <div className="flex gap-3 mb-4">
              <div className="card flex-1 text-center" style={{ padding: 14 }}>
                <Users size={18} className="muted" style={{ margin: '0 auto 4px' }} />
                <div className="bold t-num" style={{ fontSize: 20 }}>{trip.seatsTaken.length}</div>
                <div className="t-xs muted">passengers</div>
              </div>
              <div className="card flex-1 text-center" style={{ padding: 14 }}>
                <div className="bold t-num" style={{ fontSize: 20 }}>{trip.distanceKm}</div>
                <div className="t-xs muted">km route</div>
              </div>
              <div className="card flex-1 text-center" style={{ padding: 14 }}>
                <div className="bold t-num" style={{ fontSize: 20, color: 'var(--primary-dark)' }}>{formatCedi(trip.earningsAmount)}</div>
                <div className="t-xs muted">est. earnings</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={complete}>Complete trip</button>
          </>
        )}
      </BottomSheet>
    </div>
  );
};

export default DriverActiveTrip;
