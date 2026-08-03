import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Clock, MapPin, Star } from 'lucide-react';

import { useNearbyBuses } from '../hooks/useNearbyBuses';
import { useRelay } from '../hooks/useRelay';
import { useGeolocation } from '../hooks/useGeolocation';
import { useBooking } from '../context/BookingContext';
import { operatorById, busTypeById } from '../data/operators';
import { formatCedi } from '../utils/format';
import { lerpPoint } from '../utils/geo';

import BusMap from '../components/BusMap';
import BottomSheet from '../components/BottomSheet';
import EmptyState from '../components/EmptyState';
import OperatorMark from '../components/OperatorMark';

const LiveTracking = () => {
  const navigate = useNavigate();
  const { busId } = useParams();
  const { position } = useGeolocation();
  const simulated = useNearbyBuses(position);
  const { liveBuses } = useRelay();
  const { startBooking } = useBooking();

  // Include relay drivers so a tapped online driver (drv_*) resolves here too.
  const bus = useMemo(
    () => [...liveBuses, ...simulated].find((b) => b.id === busId),
    [liveBuses, simulated, busId],
  );

  // Animate just this bus easing toward the user (map stays fixed/fitted).
  const [busPos, setBusPos] = useState(bus?.origin || position);
  const [eta, setEta] = useState(bus?.etaMin ?? 0);

  useEffect(() => {
    if (!bus) return undefined;
    setBusPos(bus.origin);
    setEta(bus.etaMin);
    let t = 0;
    const id = setInterval(() => {
      t = Math.min(1, t + 0.05);
      setBusPos(lerpPoint(bus.origin, position, t));
      setEta(Math.max(0, Math.round(bus.etaMin * (1 - t))));
      if (t >= 1) clearInterval(id);
    }, 1200);
    return () => clearInterval(id);
  }, [bus, position]);

  const bounds = useMemo(
    () => (bus ? [bus.origin, position] : null),
    [bus, position],
  );

  if (!bus) {
    return (
      <div className="screen fade-up">
        <EmptyState icon={MapPin} title="Bus not found" message="This bus may have finished its route." action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/live')}>Back to live buses</button>} />
      </div>
    );
  }

  const operator = operatorById(bus.operatorId);
  const busType = busTypeById(bus.busTypeId);

  const book = () => {
    startBooking(bus);
    navigate('/passengers');
  };

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <BusMap
          buses={[{ ...bus, position: busPos }]}
          selectedBusId={bus.id}
          routeLine={bounds}
          fitBounds={bounds}
          userPosition={position}
        />
      </div>

      <div style={{ position: 'absolute', top: 'calc(var(--safe-top) + 14px)', left: 16, zIndex: 20 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
      </div>

      <BottomSheet peek={56} half={0.55} full={0.8} initial="full" bottomOffset={0}>
        <div className="flex items-center gap-3 mb-4">
          <OperatorMark operator={operator} size={48} />
          <div style={{ flex: 1 }}>
            <div className="semibold">{bus.routeName}</div>
            <div className="t-xs muted flex items-center gap-1">
              {operator.name} · <Star size={11} fill="#F4C430" stroke="#F4C430" /> {operator.rating}
            </div>
          </div>
          <span className="badge badge-success"><span className="live-dot" /> Live</span>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="card flex-1 text-center" style={{ padding: 14 }}>
            <Clock size={18} className="muted" style={{ margin: '0 auto 4px' }} />
            <div className="bold" style={{ fontSize: 20 }}>{eta === 0 ? 'Now' : eta}<span className="t-xs muted">{eta === 0 ? '' : ' min'}</span></div>
            <div className="t-xs muted">{eta === 0 ? 'arriving' : 'to your stop'}</div>
          </div>
          <div className="card flex-1 text-center" style={{ padding: 14 }}>
            <Users size={18} className="muted" style={{ margin: '0 auto 4px' }} />
            <div className="bold" style={{ fontSize: 20 }}>{bus.seatsAvailable}</div>
            <div className="t-xs muted">seats free</div>
          </div>
          <div className="card flex-1 text-center" style={{ padding: 14 }}>
            <div className="muted t-xs" style={{ marginBottom: 6 }}>{busType.name}</div>
            <div className="bold" style={{ fontSize: 20, color: 'var(--primary-dark)' }}>{formatCedi(bus.pricePerSeat)}</div>
            <div className="t-xs muted">per seat</div>
          </div>
        </div>

        <div className="card flex items-center gap-3 mb-4" style={{ padding: 14 }}>
          <MapPin size={18} className="muted" />
          <div className="t-sm">Heading to <span className="semibold">{bus.destinationName}</span> · Plate {bus.plate}</div>
        </div>

        <button className="btn btn-primary" onClick={book} disabled={bus.seatsAvailable === 0}>
          {bus.seatsAvailable === 0 ? 'Bus full' : `Book a seat · ${formatCedi(bus.pricePerSeat)}`}
        </button>
      </BottomSheet>
    </div>
  );
};

export default LiveTracking;
