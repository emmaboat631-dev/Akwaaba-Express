import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, AlertTriangle, X, Keyboard } from 'lucide-react';

import { useTrips } from '../../context/TripsContext';
import { useToast } from '../../context/ToastContext';
import { formatCedi } from '../../utils/format';

import Header from '../../components/Header';
import QrScanner from '../../components/driver/QrScanner';

// Decodes a scanned ticket QR (or a manually typed booking id) and looks it
// up via TripsContext.getBooking — the exact same lookup passengers use for
// their own ticket page. Since there's no backend, this genuinely verifies
// tickets booked in THIS browser's storage (the realistic ceiling for a
// no-backend prototype: book a ticket as a passenger, switch to a driver
// account on the same device, scan that exact ticket), not any ticket from
// any real passenger anywhere else.
const extractBookingId = (text) => {
  const match = String(text).match(/\/t\/([^/?#]+)/);
  return (match ? match[1] : String(text)).trim();
};

const DriverScanTicket = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tripId = params.get('tripId');
  const { getBooking } = useTrips();
  const toast = useToast();

  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // { status: 'valid'|'cancelled'|'not-found', booking?, id? }

  const backTarget = tripId ? `/driver/trip/${tripId}/manifest` : '/driver';

  const lookup = (text) => {
    const id = extractBookingId(text);
    if (!id) return;
    const booking = getBooking(id);
    if (!booking) { setResult({ status: 'not-found', id }); return; }
    setResult({ status: booking.status === 'cancelled' ? 'cancelled' : 'valid', booking });
  };

  const scanAgain = () => { setResult(null); setManualCode(''); };

  const checkIn = () => {
    const primary = result.booking.passengers?.[0];
    toast(`Checked in — ${primary?.name || result.booking.id}`, 'success');
    navigate(backTarget);
  };

  return (
    <div className="screen fade-up">
      <Header title="Scan ticket" onBack={() => navigate(backTarget)} />

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
        <div className="card text-center mt-4" style={{ padding: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FDF1E2', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <AlertTriangle size={26} />
          </div>
          <div className="semibold mb-1">This ticket was cancelled</div>
          <p className="t-xs muted mb-4">Booking {result.booking.id} is no longer valid.</p>
          <button className="btn btn-outline" onClick={scanAgain}>Scan another</button>
        </div>
      )}

      {result?.status === 'not-found' && (
        <div className="card text-center mt-4" style={{ padding: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <X size={26} />
          </div>
          <div className="semibold mb-1">Ticket not recognized</div>
          <p className="t-xs muted mb-4">"{result.id}" doesn't match any booking.</p>
          <button className="btn btn-outline" onClick={scanAgain}>Scan another</button>
        </div>
      )}
    </div>
  );
};

export default DriverScanTicket;
