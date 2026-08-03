import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Check, AlertTriangle, X, Keyboard, ShieldAlert } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTrips } from '../../context/TripsContext';
import { useToast } from '../../context/ToastContext';
import { relay } from '../../services/relay';
import { findAssignedTripById, generateAssignedTrip, todayISO } from '../../data/driverTrips';
import { cityById } from '../../data/cities';
import { operatorById } from '../../data/operators';
import { formatCedi } from '../../utils/format';
import { playScanSuccess, playScanError } from '../../utils/sound';

import Header from '../../components/Header';
import QrScanner from '../../components/driver/QrScanner';

// Decodes a scanned ticket QR (or a manually typed booking id), then runs it
// through strict trip-scoped validation — a driver headed Accra → Koforidua
// must not be able to check in a ticket for Koforidua → Kumasi, a ticket for
// tomorrow, a different operator's ticket, a live-hail ticket, or a ticket
// that was already scanned. Each rejection has its own explicit reason.
const extractBookingId = (text) => {
  const match = String(text).match(/\/t\/([^/?#]+)/);
  return (match ? match[1] : String(text)).trim();
};

// Compares a scanned booking against the driver's current trip and returns
// either { status: 'valid' } or a rejection { status: '<reason>', ... } with
// enough context for the UI to show the mismatch clearly.
const validateAgainstTrip = (booking, expectedTrip) => {
  if (booking.status === 'cancelled') return { status: 'cancelled' };
  if (booking.checkedInAt) return { status: 'already-checked-in', at: booking.checkedInAt };

  // No expected trip → only sanity checks apply (the driver opened the scanner
  // from the dashboard without an active assignment). Better to be strict than
  // let anything through, so require the passenger's trip to match today at
  // minimum.
  const bTrip = booking.trip || {};
  const isLiveBooking = booking.type === 'live';

  if (!expectedTrip) {
    if (isLiveBooking) return { status: 'valid' };
    if (bTrip.dateISO !== todayISO()) return { status: 'wrong-date', bookingDateISO: bTrip.dateISO };
    return { status: 'valid' };
  }

  // A scheduled coach driver should never accept a live-hail ticket, and
  // vice versa — they represent completely different products.
  if (isLiveBooking) return { status: 'wrong-trip-type', expectedKind: 'scheduled' };

  // Route: from AND to must both match. Different route = different trip.
  if (bTrip.fromId !== expectedTrip.fromId || bTrip.toId !== expectedTrip.toId) {
    return {
      status: 'wrong-route',
      bookingRoute: { fromId: bTrip.fromId, toId: bTrip.toId },
      expectedRoute: { fromId: expectedTrip.fromId, toId: expectedTrip.toId },
    };
  }

  // Same route but wrong date — reject.
  if (bTrip.dateISO !== expectedTrip.dateISO) {
    return { status: 'wrong-date', bookingDateISO: bTrip.dateISO, expectedDateISO: expectedTrip.dateISO };
  }

  // Different operator on the same route (different company) — reject too.
  if (bTrip.operatorId !== expectedTrip.operatorId) {
    return {
      status: 'wrong-operator',
      bookingOperatorId: bTrip.operatorId,
      expectedOperatorId: expectedTrip.operatorId,
    };
  }

  return { status: 'valid' };
};

const DriverScanTicket = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tripId = params.get('tripId');
  const { user } = useAuth();
  const { getBooking, markCheckedIn } = useTrips();
  const toast = useToast();

  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // { status, booking?, id?, ...ctx }

  // The trip the driver is currently supposed to be running. From the manifest
  // it comes via ?tripId=; from the dashboard it's derived from the driver's
  // assignment for today.
  const expectedTrip = useMemo(() => {
    if (tripId) return findAssignedTripById(tripId);
    if (user?.id) return generateAssignedTrip(user.id, todayISO());
    return null;
  }, [tripId, user?.id]);

  const backTarget = tripId ? `/driver/trip/${tripId}/manifest` : '/driver';
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(backTarget, { replace: true });
  };

  const lookup = (text) => {
    const id = extractBookingId(text);
    if (!id) return;
    const booking = getBooking(id) || relay.getBooking(id);
    if (!booking) { 
      playScanError();
      setResult({ status: 'not-found', id }); 
      return; 
    }
    const verdict = validateAgainstTrip(booking, expectedTrip);
    if (verdict.status === 'valid') {
      playScanSuccess();
    } else {
      playScanError();
    }
    setResult({ ...verdict, booking });
  };

  const scanAgain = () => { setResult(null); setManualCode(''); };

  const checkIn = () => {
    const primary = result.booking.passengers?.[0];
    markCheckedIn(result.booking.id);
    relay.send('ticket:checkedin', { bookingId: result.booking.id, passengerName: primary?.name });
    toast(`Checked in — ${primary?.name || result.booking.id}`, 'success');
    navigate(backTarget, { replace: true });
  };

  // Compact "expected vs got" line, used across rejection cards so mismatches
  // are unambiguous.
  const routeLabel = (route) =>
    route ? `${cityById(route.fromId)?.name || route.fromId} → ${cityById(route.toId)?.name || route.toId}` : '—';

  const Rejection = ({ icon: Icon, tone, title, message, details, retry = true }) => (
    <div className="card text-center mt-4" style={{ padding: 24 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: tone === 'warn' ? '#FDF1E2' : 'var(--surface-2)',
        color: tone === 'warn' ? 'var(--warning)' : 'var(--red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
      }}>
        <Icon size={26} />
      </div>
      <div className="semibold mb-1">{title}</div>
      {message && <p className="t-xs muted mb-3">{message}</p>}
      {details && (
        <div className="card text-left mb-3" style={{ padding: 12, background: 'var(--surface-2)', boxShadow: 'none' }}>
          {details}
        </div>
      )}
      {retry && <button className="btn btn-outline" onClick={scanAgain}>Scan another</button>}
    </div>
  );

  return (
    <div className="screen fade-up">
      <Header title="Scan ticket" onBack={goBack} />

      {/* Constant reminder of what the driver is validating against. */}
      {expectedTrip && !result && (
        <div className="card mb-3 flex items-center gap-3" style={{ padding: 12 }}>
          <ShieldAlert size={16} className="muted" />
          <div className="t-xs muted" style={{ lineHeight: 1.4 }}>
            Accepting tickets for <span className="semibold" style={{ color: 'var(--ink)' }}>{routeLabel({ fromId: expectedTrip.fromId, toId: expectedTrip.toId })}</span> on{' '}
            <span className="semibold" style={{ color: 'var(--ink)' }}>{format(parseISO(expectedTrip.dateISO), 'd MMM')}</span> · {operatorById(expectedTrip.operatorId)?.name}
          </div>
        </div>
      )}

      {!result && (
        <>
          {!manualMode ? (
            <QrScanner onScan={lookup} onError={() => setManualMode(true)} />
          ) : (
            <div className="card text-center" style={{ padding: 24 }}>
              <Keyboard size={28} className="muted" style={{ margin: '0 auto 10px' }} />
              <div className="semibold t-sm mb-1">Enter ticket code</div>
              <p className="t-xs muted mb-4">Type the booking code shown under the passenger's QR.</p>
              <div className="field mb-3"><input placeholder="e.g. AE1A2B3C4D" value={manualCode} onChange={(e) => setManualCode(e.target.value)} /></div>
              <button className="btn btn-primary" onClick={() => lookup(manualCode)} disabled={!manualCode.trim()}>Check ticket</button>
            </div>
          )}

          {!manualMode && (
            <button
              className="t-sm semibold"
              style={{ color: 'var(--primary-dark)', display: 'block', margin: '16px auto 0' }}
              onClick={() => setManualMode(true)}
            >
              Enter code manually instead
            </button>
          )}
        </>
      )}

      {result?.status === 'valid' && (
        <div className="card text-center mt-4" style={{ padding: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Check size={26} />
          </div>
          <span className="badge badge-success" style={{ margin: '0 auto 12px', display: 'inline-flex' }}>Valid ticket</span>
          <div className="bold" style={{ fontSize: 18 }}>
            {result.booking.passengers?.[0]?.name}
            {result.booking.passengers.length > 1 ? ` +${result.booking.passengers.length - 1}` : ''}
          </div>
          <div className="t-sm muted mb-3">Seat{result.booking.seats.length > 1 ? 's' : ''} {result.booking.seats.join(', ')}</div>
          <div className="divider" style={{ margin: '14px 0' }} />
          <div className="flex justify-between t-sm mb-2"><span className="muted">Booking</span><span className="semibold">{result.booking.id}</span></div>
          <div className="flex justify-between t-sm"><span className="muted">Paid</span><span className="semibold">{formatCedi(result.booking.amount)}</span></div>
          <button className="btn btn-primary mt-4" onClick={checkIn}>Check in</button>
          <button className="btn btn-ghost mt-2" onClick={scanAgain}>Scan another</button>
        </div>
      )}

      {result?.status === 'cancelled' && (
        <Rejection
          icon={AlertTriangle}
          tone="warn"
          title="This ticket was cancelled"
          message={`Booking ${result.booking.id} is no longer valid.`}
        />
      )}

      {result?.status === 'already-checked-in' && (
        <Rejection
          icon={AlertTriangle}
          tone="warn"
          title="Already checked in"
          message={`This ticket was scanned at ${result.at ? format(new Date(result.at), 'HH:mm') : 'an earlier time'}. It can't be used again.`}
        />
      )}

      {result?.status === 'wrong-route' && (
        <Rejection
          icon={ShieldAlert}
          tone="red"
          title="Wrong route"
          message="This ticket is not for the trip you're running."
          details={(
            <div className="flex flex-col gap-2 t-sm">
              <div className="flex justify-between"><span className="muted">Ticket route</span><span className="semibold">{routeLabel(result.bookingRoute)}</span></div>
              <div className="flex justify-between"><span className="muted">Your trip</span><span className="semibold">{routeLabel(result.expectedRoute)}</span></div>
            </div>
          )}
        />
      )}

      {result?.status === 'wrong-date' && (
        <Rejection
          icon={ShieldAlert}
          tone="red"
          title="Wrong date"
          message="This ticket is for a different day."
          details={(
            <div className="flex flex-col gap-2 t-sm">
              <div className="flex justify-between"><span className="muted">Ticket date</span><span className="semibold">{result.bookingDateISO ? format(parseISO(result.bookingDateISO), 'd MMM yyyy') : '—'}</span></div>
              <div className="flex justify-between"><span className="muted">Your trip</span><span className="semibold">{result.expectedDateISO ? format(parseISO(result.expectedDateISO), 'd MMM yyyy') : format(new Date(), 'd MMM yyyy')}</span></div>
            </div>
          )}
        />
      )}

      {result?.status === 'wrong-operator' && (
        <Rejection
          icon={ShieldAlert}
          tone="red"
          title="Wrong company"
          message="This ticket was booked with a different operator."
          details={(
            <div className="flex flex-col gap-2 t-sm">
              <div className="flex justify-between"><span className="muted">Ticket company</span><span className="semibold">{operatorById(result.bookingOperatorId)?.name || result.bookingOperatorId || '—'}</span></div>
              <div className="flex justify-between"><span className="muted">Your company</span><span className="semibold">{operatorById(result.expectedOperatorId)?.name || result.expectedOperatorId || '—'}</span></div>
            </div>
          )}
        />
      )}

      {result?.status === 'wrong-trip-type' && (
        <Rejection
          icon={ShieldAlert}
          tone="red"
          title="Wrong trip type"
          message={result.expectedKind === 'scheduled'
            ? "This is a live-hail ticket, not for a scheduled coach."
            : "This is a scheduled-trip ticket, not for a live ride."}
        />
      )}

      {result?.status === 'not-found' && (
        <Rejection
          icon={X}
          tone="red"
          title="Ticket not recognized"
          message={`"${result.id}" doesn't match any booking.`}
        />
      )}
    </div>
  );
};

export default DriverScanTicket;
