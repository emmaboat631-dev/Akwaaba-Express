import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, MessageSquare, Car, Ticket as TicketIcon, ShieldCheck } from 'lucide-react';

import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';
import { operatorById } from '../data/operators';
import { formatCedi, initialsOf } from '../utils/format';
import { driverInfoFor } from '../utils/driverInfo';

import Header from '../components/Header';
import EmptyState from '../components/EmptyState';

// Driver contact page for a booked live trip. Split off from the Ticket
// screen so the boarding pass stays focused on the trip + QR, and the
// "who's coming to pick me up" details live one tap away.
const TicketDriver = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { getBooking } = useTrips();
  const toast = useToast();

  const booking = getBooking(bookingId);
  if (!booking) {
    return (
      <div className="screen">
        <Header title="Driver" />
        <EmptyState icon={TicketIcon} title="Ticket not found" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/trips')}>My trips</button>} />
      </div>
    );
  }

  // Only meaningful for live bookings.
  if (booking.type !== 'live') {
    return (
      <div className="screen">
        <Header title="Driver" onBack={() => navigate(`/ticket/${bookingId}`)} />
        <EmptyState
          icon={TicketIcon}
          title="No driver on this ticket"
          message="Scheduled coach tickets don't show individual driver contact — check with the operator at the terminal."
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate(`/ticket/${bookingId}`)}>Back to ticket</button>}
        />
      </div>
    );
  }

  const trip = booking.trip;
  const operator = operatorById(trip.operatorId);
  const driverInfo = driverInfoFor(trip);
  const telHref = driverInfo.phone ? `tel:${driverInfo.phone.replace(/\s+/g, '')}` : null;
  const smsHref = driverInfo.phone ? `sms:${driverInfo.phone.replace(/\s+/g, '')}` : null;

  const noPhone = (e) => {
    if (!driverInfo.phone) {
      e.preventDefault();
      toast('No phone number on file', 'info');
    }
  };

  return (
    <div className="screen fade-up">
      <Header title="Your driver" onBack={() => navigate(`/ticket/${bookingId}`)} />

      {/* Identity card */}
      <div className="card mb-4 flex flex-col items-center text-center" style={{ padding: 24 }}>
        <div
          style={{
            width: 84, height: 84, borderRadius: '50%',
            background: 'var(--surface-2)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 700, marginBottom: 12,
          }}
        >
          {initialsOf(driverInfo.name)}
        </div>
        <div className="bold" style={{ fontSize: 20 }}>{driverInfo.name}</div>
        {driverInfo.synthesized ? (
          <div className="t-xs muted mt-1">(simulated driver for this ride)</div>
        ) : (
          <span className="badge badge-success mt-2"><ShieldCheck size={11} /> Verified driver</span>
        )}
      </div>

      {/* Vehicle */}
      <h3 className="mb-2">Vehicle</h3>
      <div className="card mb-4 flex items-center gap-3">
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Car size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="semibold t-sm">
            {operator?.name}{trip.plate ? ` · ${trip.plate}` : ''}
          </div>
          <div className="t-xs muted">
            {[driverInfo.vehicleColor, driverInfo.vehicleModel].filter(Boolean).join(' ') || 'Model on request'}
          </div>
        </div>
      </div>

      {/* Trip context — a compact reminder of what they're picking you up for */}
      <h3 className="mb-2">Trip</h3>
      <div className="card mb-4">
        <div className="flex justify-between t-sm mb-2">
          <span className="muted">Destination</span>
          <span className="semibold">{trip.destinationName || trip.routeName}</span>
        </div>
        <div className="flex justify-between t-sm mb-2">
          <span className="muted">Booking</span>
          <span className="semibold">{booking.id}</span>
        </div>
        <div className="flex justify-between t-sm">
          <span className="muted">Fare paid</span>
          <span className="semibold">{formatCedi(booking.amount)}</span>
        </div>
      </div>

      {/* Big contact CTAs pinned to the bottom */}
      <div className="mt-auto" style={{ paddingTop: 12 }}>
        <div className="flex gap-3">
          <a
            href={telHref || undefined}
            onClick={noPhone}
            className="btn btn-primary"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <Phone size={18} /> Call
          </a>
          <a
            href={smsHref || undefined}
            onClick={noPhone}
            className="btn btn-outline"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <MessageSquare size={18} /> Text
          </a>
        </div>
        {driverInfo.phone && (
          <div className="t-xs muted text-center mt-3">Standard call/SMS rates apply.</div>
        )}
      </div>
    </div>
  );
};

export default TicketDriver;
