import React, { useEffect, useRef, useState } from 'react';
import { X, Check, MapPin } from 'lucide-react';
import { formatCedi } from '../../utils/format';
import { playIncoming } from '../../utils/sound';
import { REQUEST_TTL_MS } from '../../services/driverHail';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Full-screen Uber/Bolt-style incoming request card. Owns the countdown
// timer itself and calls onDecline when it hits zero — the same code path
// as a manual decline tap (see services/driverHail.js).
const IncomingRequestOverlay = ({ request, onAccept, onDecline }) => {
  const [now, setNow] = useState(Date.now());
  const declinedRef = useRef(false);

  useEffect(() => {
    declinedRef.current = false;
    playIncoming();
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [request.id]);

  useEffect(() => {
    if (now >= request.expiresAt && !declinedRef.current) {
      declinedRef.current = true;
      onDecline(request.id);
    }
  }, [now, request, onDecline]);

  const remainingMs = Math.max(0, request.expiresAt - now);
  const pct = remainingMs / REQUEST_TTL_MS;
  const remainingSec = Math.ceil(remainingMs / 1000);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,20,14,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card pop-in" style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl)', padding: 22 }}>
        <div className="flex justify-between items-center mb-4">
          <span className="semibold t-sm flex items-center gap-2"><span className="live-dot" /> New ride request</span>
          <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
            <svg width="52" height="52" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="30" cy="30" r={RADIUS} fill="none" stroke="var(--line)" strokeWidth="4" />
              <circle
                cx="30" cy="30" r={RADIUS} fill="none" stroke="var(--primary)" strokeWidth="4"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - pct)} strokeLinecap="round"
              />
            </svg>
            <span className="bold t-num" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{remainingSec}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="semibold">{request.passengerName}</div>
            <div className="t-xs muted">{request.distanceKm} km away · To {request.destinationName}</div>
          </div>
          <div className="bold t-num" style={{ fontSize: 18, color: 'var(--primary-dark)' }}>{formatCedi(request.fareEstimate)}</div>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onDecline(request.id)}><X size={18} /> Decline</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onAccept(request.id)}><Check size={18} /> Accept</button>
        </div>
      </div>
    </div>
  );
};

export default IncomingRequestOverlay;
