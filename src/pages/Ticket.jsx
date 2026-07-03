import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Download, Share2, Ticket as TicketIcon, Check } from 'lucide-react';

import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';
import { cityById } from '../data/cities';
import { operatorById, busTypeById } from '../data/operators';
import { formatCedi, minutesToClock } from '../utils/format';

import Header from '../components/Header';
import EmptyState from '../components/EmptyState';

const Ticket = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { getBooking } = useTrips();
  const toast = useToast();

  const booking = getBooking(bookingId);

  if (!booking) {
    return (
      <div className="screen has-nav">
        <Header title="Ticket" />
        <EmptyState icon={TicketIcon} title="Ticket not found" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/trips')}>My trips</button>} />
      </div>
    );
  }

  const { trip } = booking;
  const isLive = booking.type === 'live';
  const operator = operatorById(trip.operatorId);
  const busType = busTypeById(trip.busTypeId);
  const primary = booking.passengers[0];

  const fromName = isLive ? 'Your location' : cityById(trip.fromId)?.name;
  const toName = isLive ? trip.destinationName : cityById(trip.toId)?.name;
  const dateLabel = isLive
    ? format(new Date(booking.createdAt), 'd MMM yyyy')
    : format(new Date(trip.dateISO), 'd MMM yyyy');
  const departLabel = isLive ? 'Now' : minutesToClock(trip.departMins);
  const arriveLabel = isLive ? `~${trip.etaMin}m` : minutesToClock(trip.arriveMins);
  const seatsLabel = booking.seats.join(', ');

  return (
    <div className="screen has-nav fade-up" style={{ padding: 'calc(20px + var(--safe-top)) 16px 24px' }}>
      <Header title="Your ticket" onBack={() => navigate('/trips')} />

      <div style={{ background: 'var(--surface)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ background: operator.color, color: '#fff', padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="t-xs" style={{ opacity: 0.85 }}>{operator.name}</div>
            <div className="bold" style={{ fontSize: 17, letterSpacing: 0.5 }}>{booking.id}</div>
          </div>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}>
            {isLive ? <><span className="live-dot" style={{ background: '#fff' }} /> Live</> : busType.name}
          </span>
        </div>

        <div style={{ padding: 22 }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="bold t-num" style={{ fontSize: 24 }}>{departLabel}</div>
              <div className="t-sm muted">{fromName}</div>
            </div>
            <div className="flex flex-col items-center" style={{ flex: 1, padding: '0 12px' }}>
              <TicketIcon size={16} className="muted" />
              <div className="w-full" style={{ height: 2, background: 'var(--line)', margin: '6px 0' }} />
            </div>
            <div className="text-right">
              <div className="bold t-num" style={{ fontSize: 24 }}>{arriveLabel}</div>
              <div className="t-sm muted">{toName}</div>
            </div>
          </div>

          <div className="flex justify-between mt-5">
            <div><div className="t-xs muted">Date</div><div className="semibold t-sm">{dateLabel}</div></div>
            <div className="text-right"><div className="t-xs muted">Seat{booking.seats.length > 1 ? 's' : ''}</div><div className="semibold t-sm">{seatsLabel}</div></div>
          </div>
          <div className="flex justify-between mt-3">
            <div><div className="t-xs muted">Passenger</div><div className="semibold t-sm">{primary?.name}{booking.passengers.length > 1 ? ` +${booking.passengers.length - 1}` : ''}</div></div>
            <div className="text-right"><div className="t-xs muted">Paid</div><div className="semibold t-sm">{formatCedi(booking.amount)}</div></div>
          </div>
        </div>

        {/* Perforation */}
        <div style={{ position: 'relative', height: 36 }}>
          <div style={{ position: 'absolute', top: '50%', left: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--bg)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', top: '50%', right: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--bg)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 18, right: 18, borderTop: '2px dashed var(--line)', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ padding: '4px 22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ padding: 12, background: '#fff', borderRadius: 16 }}>
            <QRCodeSVG value={booking.qrValue} size={146} level="M" />
          </div>
          <div className="t-xs muted mt-3" style={{ letterSpacing: 2 }}>{booking.id} · {trip.plate}</div>

          <div className="flex w-full mt-5 gap-3">
            <button className="btn btn-ghost" onClick={() => toast('Ticket saved to device', 'success')}><Download size={18} /> Save</button>
            <button className="btn btn-ghost" onClick={() => toast('Share link copied', 'success')}><Share2 size={18} /> Share</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 t-sm" style={{ color: 'var(--success)' }}>
        <Check size={16} /> Booking confirmed
      </div>

      <div className="mt-auto" style={{ paddingTop: 16 }}>
        <button className="btn btn-dark" onClick={() => navigate('/trips')}>Done</button>
      </div>
    </div>
  );
};

export default Ticket;
