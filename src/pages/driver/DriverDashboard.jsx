import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Power, Zap, CalendarClock, MapPin, ChevronRight, ShieldAlert } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useDriver } from '../../context/DriverContext';
import { useToast } from '../../context/ToastContext';
import { useDriverHail } from '../../hooks/useDriverHail';
import { useGeolocation } from '../../hooks/useGeolocation';
import { generateAssignedTrip, todayISO } from '../../data/driverTrips';
import { operatorById, busTypeById } from '../../data/operators';
import { cityById } from '../../data/cities';
import { formatCedi, minutesToClock } from '../../utils/format';
import { relay } from '../../services/relay';
import { REQUEST_TTL_MS } from '../../services/driverHail';
import { primeAudio } from '../../utils/sound';

import Avatar from '../../components/Avatar';
import OperatorMark from '../../components/OperatorMark';
import Toggle from '../../components/Toggle';
import SegmentedTabs from '../../components/SegmentedTabs';
import EmptyState from '../../components/EmptyState';
import LocalDestinationPicker from '../../components/LocalDestinationPicker';
import { localDestinationById } from '../../data/localDestinations';
import IncomingRequestOverlay from '../../components/driver/IncomingRequestOverlay';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const driver = useDriver();
  const toast = useToast();
  const hail = useDriverHail();
  const { position } = useGeolocation();

  // A real hail request from a passenger on another device (via the relay).
  const [relayRequest, setRelayRequest] = useState(null);
  const [pickDest, setPickDest] = useState(false); // live destination picker open

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { driver.rollDayIfNeeded(); }, []);

  // RequireAuth always guards this route, so `user` is never null here in
  // practice — the guard just matches the defensive pattern the rest of the
  // app uses (see Profile.jsx).
  const userId = user?.id;
  const trip = useMemo(() => (userId ? generateAssignedTrip(userId, todayISO()) : null), [userId]);

  // Latest GPS read, without making the presence effect depend on it (that
  // would retract/re-announce on every position tick).
  const positionRef = useRef(position);
  positionRef.current = position;

  // 'live' = accepting live hails (pop-ups + shown to passengers). 'scheduled'
  // = running the assigned trip only, no live pop-ups. `online` is persisted so
  // it survives a refresh; the hail engine is a function of both.
  const mode = driver.mode || 'live';
  const online = driver.onlineSince != null;
  const liveOnline = online && mode === 'live';

  // Keep the live-hail engine matched to (online + live). Any way online/mode
  // change — toggle, mode switch, refresh — this reconciles it.
  useEffect(() => {
    if (liveOnline) hail.goOnline(positionRef.current);
    else hail.goOffline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveOnline]);

  // Announce this driver to the LAN relay as a live bus while live-online, so a
  // passenger on another device sees them; retract on going offline / scheduled.
  useEffect(() => {
    if (!userId || !trip || !liveOnline) return undefined;
    // Live mode uses local suburb picks; scheduled falls back to intercity city.
    const dest = localDestinationById(driver.liveDestinationId) || cityById(trip.toId);
    const bus = {
      id: `drv_${userId}`,
      type: 'live',
      driverId: userId,
      driverName: user?.name,
      driverPhone: user?.phone || '',
      // Driver's own vehicle profile wins over the auto-assigned daily trip
      // — the trip is a fictional roster, this is what passengers actually see.
      operatorId: user?.operatorId || trip.operatorId,
      busTypeId: user?.busTypeId || trip.busTypeId,
      plate: user?.vehiclePlate || trip.plate,
      vehicleModel: user?.vehicleModel || null,
      vehicleColor: user?.vehicleColor || null,
      routeName: `To ${dest?.name}`,
      destinationName: dest?.name,
      position: positionRef.current,
      origin: positionRef.current,
      seatsAvailable: trip.seatsAvailable,
      seatsTotal: trip.seatsTotal,
      pricePerSeat: Math.max(5, Math.round(trip.price * 0.08)),
      etaMin: 3,
    };
    relay.send('driver:online', { driverId: userId, bus });
    return () => relay.send('driver:offline', { driverId: userId });
  }, [userId, trip, liveOnline, user?.name, user?.phone, user?.operatorId, user?.busTypeId, user?.vehiclePlate, user?.vehicleModel, user?.vehicleColor, driver.liveDestinationId]);

  // Push live location while live-online.
  useEffect(() => {
    if (!userId || !liveOnline || !position) return;
    relay.send('driver:position', { driverId: userId, position, etaMin: 3 });
  }, [userId, liveOnline, position]);

  // Latest live-online flag for the async relay listener below.
  const liveOnlineRef = useRef(liveOnline);
  liveOnlineRef.current = liveOnline;

  // Receive a passenger's hail request from another device (only while live).
  // Also react if the same passenger cancels the trip before the driver
  // arrives — clear the pending pop-up and toast so the driver knows.
  useEffect(() => {
    const off = relay.onMessage((m) => {
      if (m.type === 'hail:request' && m.driverId === userId && liveOnlineRef.current) {
        setRelayRequest((cur) => cur || { ...m.request, expiresAt: Date.now() + REQUEST_TTL_MS });
      }
      if (m.type === 'hail:cancelled' && m.driverId === userId) {
        setRelayRequest((cur) => (cur && (cur.id === m.requestId || m.requestId == null) ? null : cur));
        toast('Passenger cancelled the trip', 'info');
      }
    });
    return off;
  }, [userId, toast]);

  // Going offline / switching to scheduled auto-declines a pending request.
  useEffect(() => {
    if (!liveOnline && relayRequest) {
      relay.send('hail:decline', { requestId: relayRequest.id });
      setRelayRequest(null);
    }
  }, [liveOnline, relayRequest]);

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
    primeAudio(); // unlock sound on this gesture so a later pop-up can chime
    driver.setOnline(!online);
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

  // Real passenger request (relay): accepting lets them proceed to payment.
  const acceptRelay = (id) => {
    relay.send('hail:accept', { requestId: id });
    driver.recordAccept();
    setRelayRequest(null);
    toast('Trip accepted — meet your passenger', 'success');
  };
  const declineRelay = (id) => {
    relay.send('hail:decline', { requestId: id });
    driver.recordDecline();
    setRelayRequest(null);
  };

  const tripCta =
    status === 'scheduled'
      ? { label: 'View manifest', onClick: () => navigate(`/driver/trip/${trip.id}/manifest`) }
      : { label: 'Continue trip', onClick: () => navigate(`/driver/trip/${trip.id}`) };

  const vehicleSetupNeeded = !user.operatorId || !user.busTypeId || !user.vehiclePlate || !user.vehicleModel;

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

      {/* Vehicle-setup nudge — a driver whose profile is incomplete will
          appear to passengers with synthesized details; fixing this is a
          one-tap trip to /driver/setup. */}
      {vehicleSetupNeeded && (
        <button
          className="card card-pressable flex items-center gap-3 mb-3 w-full"
          style={{ textAlign: 'left', background: 'var(--primary-light)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' }}
          onClick={() => navigate('/driver/setup')}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldAlert size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="semibold t-sm">Complete your vehicle profile</div>
            <div className="t-xs muted">Company, bus type, plate — shown to passengers on their ticket.</div>
          </div>
          <ChevronRight size={18} className="muted" />
        </button>
      )}

      {/* Travel mode */}
      <div className="mb-3">
        <SegmentedTabs
          value={mode}
          onChange={driver.setMode}
          options={[
            { value: 'live', label: 'Live rides', icon: Zap },
            { value: 'scheduled', label: 'Scheduled trip', icon: CalendarClock },
          ]}
        />
      </div>

      {/* Live destination — driver picks a nearby suburb, not an intercity city */}
      {mode === 'live' && (() => {
        const dest = localDestinationById(driver.liveDestinationId);
        return (
          <button className="card card-pressable flex items-center gap-3 mb-3 w-full" style={{ textAlign: 'left' }} onClick={() => setPickDest(true)}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-xs muted">Heading to</div>
              <div className="semibold">{dest ? `${dest.name} · ${dest.area}` : 'Pick a nearby stop'}</div>
            </div>
            <ChevronRight size={18} className="muted" />
          </button>
        );
      })()}

      {/* Single online/offline toggle */}
      <div className="card flex items-center justify-between mb-4" style={{ padding: 16 }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: online ? 'var(--success-light)' : 'var(--surface-2)', color: online ? 'var(--success)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Power size={19} />
          </div>
          <div>
            <div className="semibold">{online ? "You're online" : "You're offline"}</div>
            <div className="t-xs muted">
              {!online
                ? 'Go online to start your day'
                : mode === 'live'
                  ? 'Receiving live ride requests'
                  : 'On duty for your scheduled trip'}
            </div>
          </div>
        </div>
        <Toggle on={online} onClick={toggleOnline} />
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

      {/* Manage scheduled trips */}
      <button
        className="card card-pressable flex items-center gap-3 mb-4 w-full"
        style={{ textAlign: 'left' }}
        onClick={() => navigate('/driver/manage-trips')}
      >
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarClock size={19} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="semibold t-sm">Manage scheduled trips</div>
          <div className="t-xs muted">Create, view, or cancel upcoming trips</div>
        </div>
        <ChevronRight size={18} className="muted" />
      </button>

      {/* Live requests status */}
      <h3 className="mb-2">Live requests</h3>
      {mode === 'scheduled' ? (
        <div className="card flex items-center gap-2" style={{ padding: 14 }}>
          <CalendarClock size={16} className="muted" />
          <span className="t-sm semibold">Scheduled mode — live requests are off today.</span>
        </div>
      ) : liveOnline ? (
        <div className="card flex items-center gap-2" style={{ padding: 14 }}>
          <span className="live-dot" />
          <span className="t-sm semibold">Online — waiting for a ride request…</span>
        </div>
      ) : (
        <EmptyState icon={Power} title="You're offline" message="Go online in Live mode to receive ride requests." />
      )}

      {relayRequest ? (
        <IncomingRequestOverlay request={relayRequest} onAccept={acceptRelay} onDecline={declineRelay} />
      ) : liveOnline && !hail.activeRequest && hail.requests[0] ? (
        <IncomingRequestOverlay request={hail.requests[0]} onAccept={acceptRequest} onDecline={declineRequest} />
      ) : null}

      <LocalDestinationPicker
        open={pickDest}
        position={position}
        onSelect={(d) => driver.setLiveDestination(d.id)}
        onClose={() => setPickDest(false)}
      />
    </div>
  );
};

export default DriverDashboard;
