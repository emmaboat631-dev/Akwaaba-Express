import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion, useMotionValue, useTransform, useDragControls, animate } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowLeft, Bus, Download, Share2, Ticket as TicketIcon, Check, ChevronRight, X, User, ShieldAlert } from 'lucide-react';

import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';
import { cityById } from '../data/cities';
import { operatorById, busTypeById } from '../data/operators';
import { formatCedi, minutesToClock, formatMinutes } from '../utils/format';
import { relay } from '../services/relay';

import EmptyState from '../components/EmptyState';

// ---------------------------------------------------------------------------
// Boarding-pass-inspired ticket. The dark top stub is the trip info (from →
// to, times, code). The lower half is a real draggable sheet — swipe down
// for compact-detail view, swipe up to blow the QR up (matches the reference
// two-phone comparison). Driver contact moved off to /ticket/:id/driver.
// ---------------------------------------------------------------------------

// City name → 3-letter "airport code" (derived on the fly).
const cityCode = (city) => {
  if (!city) return '—';
  const compact = city.name.replace(/[^A-Za-z]/g, '');
  return compact.slice(0, 3).toUpperCase();
};

// "STC-8801"-style route code — decorative, gives the stub boarding-pass feel.
const routeCode = (booking, operator) => {
  const tail = String(booking.id).slice(-4).toUpperCase();
  return `${operator?.mark || 'AKW'}-${tail}`;
};

// Ticks every second so live countdowns re-render.
const useCountdown = (targetMs) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetMs) return null;
  const delta = targetMs - Date.now();
  if (delta <= 0) return { label: '—', expired: true };
  const totalSec = Math.floor(delta / 1000);
  const days = Math.floor(totalSec / 86400);
  if (days >= 1) return { label: `${days}d ${Math.floor((totalSec % 86400) / 3600)}h` };
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` };
};

// Soft rounded value pill (a column inside a PillRow).
const Pill = ({ label, value }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div className="t-xs muted">{label}</div>
    <div className="semibold" style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
  </div>
);

const PillRow = ({ children }) => (
  <div className="flex items-center gap-4" style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '12px 16px', marginBottom: 10 }}>
    {children}
  </div>
);

const Ticket = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { getBooking, cancelBooking } = useTrips();
  const toast = useToast();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const booking = getBooking(bookingId);

  // Departure timestamp for the live countdown; live bookings use etaMin
  // relative to createdAt as a proxy.
  const departureTs = booking?.trip
    ? booking.type === 'live'
      ? new Date(booking.createdAt).getTime() + (booking.trip.etaMin || 0) * 60_000
      : (() => {
          const d = new Date(booking.trip.dateISO + 'T00:00:00');
          d.setMinutes(d.getMinutes() + (booking.trip.departMins || 0));
          return d.getTime();
        })()
    : null;
  const departureCountdown = useCountdown(departureTs);

  // ------- Drag sheet: two snap points (half + full), QR scales with y --------
  const sheetRef = useRef(null);
  const controls = useDragControls();
  const y = useMotionValue(0);
  const [snaps, setSnaps] = useState({ full: 0, half: 260, height: 560 });

  useLayoutEffect(() => {
    const measure = () => {
      const H = sheetRef.current?.offsetParent?.clientHeight || window.innerHeight;
      const fullH = Math.round(Math.min(H * 0.94, H - 22));
      const halfH = Math.round(H * 0.55); // dark stub above is ~45% visible
      const yFull = 0;
      const yHalf = Math.max(20, fullH - halfH);
      setSnaps({ full: yFull, half: yHalf, height: fullH });
      // Land on half by default.
      y.set(yHalf);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR scales linearly with sheet position — at full it grows to ~1.72×.
  const qrScale = useTransform(y, [snaps.full, snaps.half], [1.72, 1]);

  const snapTo = (target) => animate(y, target, { type: 'spring', stiffness: 420, damping: 42 });
  const handleDragEnd = (_e, info) => {
    const cur = y.get();
    const v = info.velocity.y;
    if (v < -400) snapTo(snaps.full);
    else if (v > 400) snapTo(snaps.half);
    else snapTo(Math.abs(cur - snaps.full) < Math.abs(cur - snaps.half) ? snaps.full : snaps.half);
  };
  const toggle = () => {
    const cur = y.get();
    snapTo(cur > (snaps.full + snaps.half) / 2 ? snaps.full : snaps.half);
  };

  if (!booking) {
    return (
      <div className="screen">
        <EmptyState icon={TicketIcon} title="Ticket not found" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/trips')}>My trips</button>} />
      </div>
    );
  }

  const { trip } = booking;
  const isLive = booking.type === 'live';
  const operator = operatorById(trip.operatorId);
  const busType = busTypeById(trip.busTypeId);
  const primary = booking.passengers[0];
  const isConfirmed = booking.status === 'confirmed';

  const fromCity = !isLive ? cityById(trip.fromId) : null;
  const toCity = !isLive ? cityById(trip.toId) : null;
  const fromCode = isLive ? 'YOU' : cityCode(fromCity);
  const toCode = isLive ? (trip.destinationName || 'BUS').slice(0, 3).toUpperCase() : cityCode(toCity);
  const fromCityLabel = isLive ? 'Your location' : fromCity?.name;
  const toCityLabel = isLive ? trip.destinationName : toCity?.name;
  const departLabel = isLive ? 'Now' : minutesToClock(trip.departMins);
  const arriveLabel = isLive ? `~${trip.etaMin}m` : minutesToClock(trip.arriveMins);

  const seatsLabel = booking.seats.join(', ');
  const passengerName = primary?.name + (booking.passengers.length > 1 ? ` +${booking.passengers.length - 1}` : '');
  const dateLabel = isLive
    ? format(new Date(booking.createdAt), 'd MMM yyyy')
    : format(new Date(trip.dateISO), 'd MMM yyyy');
  const durationLabel = !isLive && trip.durationMins ? formatMinutes(trip.durationMins) : `${trip.etaMin || 0} min`;

  const doCancel = () => {
    cancelBooking(booking.id);
    if (isLive && trip.driverId) {
      relay.send('hail:cancelled', { driverId: trip.driverId, requestId: booking.hailRequestId || null, bookingId: booking.id });
    }
    toast('Trip cancelled', 'info');
    navigate('/trips', { replace: true });
  };

  const ACCENT = 'var(--red)';

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: 'var(--forest)' }}>
      {/* ---------- Dark trip stub — sits behind the sheet ---------- */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--forest)', color: '#fff', padding: 'calc(20px + var(--safe-top)) 22px 0' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <button
            className="icon-btn"
            onClick={() => navigate('/trips')}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', boxShadow: 'none' }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TicketIcon size={14} style={{ opacity: 0.7 }} />
            <span className="semibold" style={{ letterSpacing: 0.4, fontSize: 14 }}>BOARDING PASS</span>
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* Route code + date badge */}
        <div className="flex items-center justify-center gap-3" style={{ marginBottom: 14 }}>
          <span style={{ background: 'rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: 6, fontSize: 11, letterSpacing: 1.5, fontWeight: 600 }}>{routeCode(booking, operator)}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{dateLabel}</span>
        </div>

        {/* City codes with route line */}
        <div className="flex items-center justify-between" style={{ padding: '0 4px' }}>
          <div style={{ flex: 1 }}>
            <div className="wordmark" style={{ fontSize: 46, lineHeight: 1, letterSpacing: -1 }}>{fromCode}</div>
            <div className="t-xs" style={{ opacity: 0.65, marginTop: 4 }}>{fromCityLabel}</div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 8px' }}>
            <div className="t-xs t-num" style={{ opacity: 0.7 }}>{durationLabel}</div>
            <div style={{ position: 'relative', width: '100%', height: 14, display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1.5px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', left: 0, width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', background: 'var(--forest)', padding: '0 4px', display: 'flex' }}>
                <Bus size={16} strokeWidth={2.2} />
              </div>
              <div style={{ position: 'absolute', right: 0, width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #fff', background: 'transparent' }} />
            </div>
          </div>

          <div style={{ flex: 1, textAlign: 'right' }}>
            <div className="wordmark" style={{ fontSize: 46, lineHeight: 1, letterSpacing: -1 }}>{toCode}</div>
            <div className="t-xs" style={{ opacity: 0.65, marginTop: 4 }}>{toCityLabel}</div>
          </div>
        </div>

        {/* Depart / Arrive times row */}
        <div className="flex justify-between" style={{ padding: '14px 4px 0' }}>
          <div>
            <div className="t-xs" style={{ opacity: 0.5, letterSpacing: 0.5 }}>DEPART</div>
            <div className="bold t-num" style={{ fontSize: 20 }}>{departLabel}</div>
          </div>
          <div className="text-right">
            <div className="t-xs" style={{ opacity: 0.5, letterSpacing: 0.5 }}>ARRIVE</div>
            <div className="bold t-num" style={{ fontSize: 20 }}>{arriveLabel}</div>
          </div>
        </div>
      </div>

      {/* ---------- Draggable ticket sheet ---------- */}
      <motion.div
        ref={sheetRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: snaps.height,
          y,
          background: 'var(--surface)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: '0 -18px 40px rgba(0,0,0,0.35)',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
        }}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: snaps.full, bottom: snaps.half }}
        dragElastic={0.06}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle / tap-to-cycle bar */}
        <div
          onPointerDown={(e) => controls.start(e)}
          onClick={toggle}
          style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
        >
          <div style={{ width: 46, height: 5, borderRadius: 3, background: 'var(--line)' }} />
        </div>

        {/* Scrolling body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 22px', WebkitOverflowScrolling: 'touch' }}>
          <div className="t-xs muted">Passenger</div>
          <div className="bold" style={{ fontSize: 22, color: ACCENT, lineHeight: 1.2, marginTop: 2 }}>
            {passengerName}
          </div>

          <div style={{ marginTop: 16 }}>
            <PillRow>
              <Pill label="Operator" value={operator.name.split(' ')[0]} />
              <Pill label={isLive ? 'Type' : 'Class'} value={busType.name} />
              <Pill label="Group" value={String.fromCharCode(65 + (booking.id.charCodeAt(2) % 4))} />
            </PillRow>
            <PillRow>
              <Pill label={isLive ? 'Booked' : 'Depart'} value={isLive ? format(new Date(booking.createdAt), 'HH:mm') : departLabel} />
              <Pill label={booking.seats.length > 1 ? 'Seats' : 'Seat'} value={seatsLabel || '—'} />
              <Pill label="Paid" value={formatCedi(booking.amount)} />
            </PillRow>
          </div>

          <div className="flex" style={{ gap: 24, padding: '14px 4px 4px' }}>
            <div style={{ flex: 1 }}>
              <div className="t-xs muted">{departureCountdown?.expired ? 'Departed' : (isLive ? 'Arriving in' : 'Departs in')}</div>
              <div className="bold t-num" style={{ fontSize: 22, color: ACCENT, marginTop: 2 }}>
                {departureCountdown?.expired ? '—' : (departureCountdown?.label || '…')}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="t-xs muted">{isLive ? 'Trip length' : 'Trip duration'}</div>
              <div className="bold t-num" style={{ fontSize: 22, color: ACCENT, marginTop: 2 }}>
                {durationLabel}
              </div>
            </div>
          </div>

          {/* Contact driver — moved OFF the ticket to /driver, per user
              request. Only shown for live bookings and only while confirmed. */}
          {isLive && isConfirmed && (
            <button
              onClick={() => navigate(`/ticket/${booking.id}/driver`)}
              className="card card-pressable flex items-center gap-3 w-full"
              style={{ textAlign: 'left', padding: 14, marginTop: 12, background: 'var(--surface-2)', boxShadow: 'none' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="semibold t-sm">Contact driver</div>
                <div className="t-xs muted">Call or message about your ride</div>
              </div>
              <ChevronRight size={16} className="muted" />
            </button>
          )}

          {/* Perforation tear line — semicircle notches + dashed rule */}
          <div style={{ position: 'relative', height: 28, marginTop: 16, marginLeft: -22, marginRight: -22 }}>
            <div style={{ position: 'absolute', top: '50%', left: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--forest)', transform: 'translateY(-50%)', boxShadow: 'inset 0 0 4px rgba(0,0,0,0.15)' }} />
            <div style={{ position: 'absolute', top: '50%', right: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--forest)', transform: 'translateY(-50%)', boxShadow: 'inset 0 0 4px rgba(0,0,0,0.15)' }} />
            <div style={{ position: 'absolute', top: '50%', left: 20, right: 20, borderTop: '2px dashed var(--line)', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
            <div className="t-xs semibold" style={{ color: 'var(--ink-2)', letterSpacing: 1, marginBottom: 14 }}>SCAN AT BOARDING</div>
            <div style={{ marginBottom: 130 }}>
              <motion.div style={{ scale: qrScale, transformOrigin: 'top center', padding: 14, background: '#fff', borderRadius: 16, border: '1px solid var(--line)' }}>
                <QRCodeSVG value={booking.qrValue} size={148} level="M" fgColor="#0B2E1C" bgColor="#ffffff" />
              </motion.div>
            </div>
            <div className="t-xs muted" style={{ letterSpacing: 1.5 }}>
              {booking.id}
            </div>
            <div className="t-xs muted" style={{ marginTop: 2 }}>
              {trip.plate} · {dateLabel}
            </div>

            <div className="flex w-full mt-4 gap-3">
              <button className="btn btn-ghost" onClick={() => toast('Ticket saved to device', 'success')}><Download size={18} /> Save</button>
              <button className="btn btn-ghost" onClick={() => toast('Share link copied', 'success')}><Share2 size={18} /> Share</button>
            </div>

            <button
              className="btn btn-ghost w-full mt-3"
              style={{ color: 'var(--ink-2)', fontSize: 13 }}
              onClick={() => navigate(`/report/${booking.id}`)}
            >
              <ShieldAlert size={16} /> Report an issue
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 t-sm" style={{ color: booking.status === 'cancelled' ? 'var(--red)' : 'var(--success)' }}>
            {booking.status === 'cancelled' ? <><X size={16} /> Booking cancelled</> : <><Check size={16} /> Booking confirmed</>}
          </div>

          <div style={{ paddingTop: 12 }}>
            {isLive && isConfirmed ? (
              <div className="flex gap-3">
                <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'rgba(206,17,38,0.25)' }} onClick={() => setConfirmCancel(true)}>
                  <X size={18} /> Cancel trip
                </button>
                <button className="btn btn-dark" onClick={() => navigate('/trips')}>Done</button>
              </div>
            ) : (
              <button className="btn btn-dark" onClick={() => navigate('/trips')}>Done</button>
            )}
          </div>
        </div>
      </motion.div>

      {confirmCancel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,20,14,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card pop-in" style={{ maxWidth: 340, width: '100%', padding: 24, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FDF1E2', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <X size={22} />
            </div>
            <div className="semibold mb-1">Cancel this trip?</div>
            <p className="t-xs muted mb-4">The driver will be notified you're no longer boarding.</p>
            <div className="flex gap-3">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)}>Keep trip</button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--red)' }} onClick={doCancel}>Cancel trip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ticket;
