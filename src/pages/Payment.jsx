import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Check, Bus, ShieldCheck } from 'lucide-react';

import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { relay } from '../services/relay';
import { initPaystack, PAYSTACK_CHANNELS } from '../services/paystack';
import { requestPermission, notifyBookingConfirmed } from '../services/notifications';
import { operatorById } from '../data/operators';
import { cityById } from '../data/cities';
import { formatCedi } from '../utils/format';

import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import OperatorMark from '../components/OperatorMark';

const NETWORKS = [
  { type: 'card', label: 'Paystack (Card)', detail: 'Visa / Mastercard via Paystack', enabled: true },
  { type: 'momo', label: 'MTN MoMo', detail: 'Available soon', enabled: false },
  { type: 'telecel', label: 'Telecel Cash', detail: 'Available soon', enabled: false },
  { type: 'airteltigo', label: 'AirtelTigo Money', detail: 'Available soon', enabled: false },
];

const BOOKING_FEE = 2;

const Payment = () => {
  const navigate = useNavigate();
  const { draft, setPayment, reset } = useBooking();
  const { user } = useAuth();
  const { addBooking } = useTrips();
  const toast = useToast();
  const trip = draft.trip;

  const isLive = draft.type === 'live';
  const qty = isLive ? draft.passengers.length : draft.seats.length;
  const unit = isLive ? trip?.pricePerSeat : trip?.price;
  const subtotal = (unit || 0) * qty;
  const total = subtotal + BOOKING_FEE;

  const methods = useMemo(() => {
    const saved = user?.paymentMethods || [];
    const savedTypes = new Set(saved.map((m) => m.type));
    const extra = NETWORKS.filter((n) => !savedTypes.has(n.type)).map((n, i) => ({ id: `net_${i}`, ...n }));
    return [...saved, ...extra];
  }, [user]);

  const [selected, setSelected] = useState(methods[0]?.id || null);
  const [paying, setPaying] = useState(false);

  if (!trip) {
    return (
      <div className="screen">
        <Header title="Payment" />
        <EmptyState icon={Bus} title="Nothing to pay for" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Find a bus</button>} />
      </div>
    );
  }

  const finalize = async (reference, payment) => {
    try {
      const booking = await api.createBooking(
        { ...draft, paymentMethod: { ...payment, ref: reference }, breakdown: { total, fee: BOOKING_FEE, unit, qty } },
        user?.id,
      );
      addBooking(booking);
      relay.send('booking:new', { booking });
      reset();
      toast('Payment successful', 'success');
      notifyBookingConfirmed(routeLabel, total);
      navigate(`/ticket/${booking.id}`, { replace: true });
    } catch {
      toast('Booking failed after payment — contact support', 'error');
      setPaying(false);
    }
  };

  const pay = () => {
    const method = methods.find((m) => m.id === selected);
    if (!method) { toast('Choose a payment method', 'error'); return; }
    if (!user?.email) { toast('No email on your account — sign in again', 'error'); return; }
    setPaying(true);

    const payment = { type: method.type, label: method.label };
    const channels = PAYSTACK_CHANNELS[method.type] || ['card'];

    try {
      initPaystack({
        email: user.email,
        amount: total,
        channels,
        onSuccess: (reference) => {
          setPayment(payment);
          finalize(reference, payment);
        },
        onClose: () => {
          toast('Payment cancelled', 'info');
          setPaying(false);
        },
      });
    } catch {
      toast('Could not start payment — check Paystack key', 'error');
      setPaying(false);
    }
  };

  const routeLabel = isLive ? trip.routeName : `${cityById(trip.fromId)?.name} → ${cityById(trip.toId)?.name}`;
  const operator = operatorById(trip.operatorId);

  return (
    <div className="screen fade-up">
      <Header title="Payment" />

      {/* Summary */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <OperatorMark operator={operator} size={40} />
          <div style={{ flex: 1 }}>
            <div className="semibold t-sm">{routeLabel}</div>
            <div className="t-xs muted">{operator.name} · {qty} seat{qty === 1 ? '' : 's'}</div>
          </div>
          {isLive && <span className="badge badge-success"><span className="live-dot" /> Live</span>}
        </div>
        <div className="divider mb-3" />
        <div className="flex justify-between t-sm mb-2"><span className="muted">Seats ({qty} × {formatCedi(unit)})</span><span>{formatCedi(subtotal)}</span></div>
        <div className="flex justify-between t-sm mb-2"><span className="muted">Booking fee</span><span>{formatCedi(BOOKING_FEE)}</span></div>
        <div className="divider mb-2" />
        <div className="flex justify-between bold"><span>Total</span><span style={{ color: 'var(--primary-dark)' }}>{formatCedi(total)}</span></div>
      </div>

      <div className="semibold mb-3">Payment method</div>
      <div className="flex flex-col gap-3">
        {methods.map((m) => {
          const Icon = m.type === 'card' ? CreditCard : Smartphone;
          const active = selected === m.id;
          const disabled = m.enabled === false;
          return (
            <button
              key={m.id}
              className={`card flex items-center justify-between${active ? ' card-selected' : ''}`}
              style={{ padding: '14px 16px', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              onClick={() => { if (!disabled) setSelected(m.id); else toast('This method is coming soon', 'info'); }}
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={19} /></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="semibold t-sm">{m.label}</div>
                  <div className="t-xs muted">{m.detail}</div>
                </div>
              </div>
              {disabled ? (
                <span className="t-xs muted" style={{ fontStyle: 'italic' }}>Soon</span>
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: active ? '6px solid var(--primary)' : '2px solid var(--line)', transition: 'all .15s' }} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 t-xs muted mt-4"><ShieldCheck size={14} /> Secured by Paystack</div>

      <div className="mt-auto" style={{ paddingTop: 12 }}>
        <button className="btn btn-primary" onClick={pay} disabled={paying}>
          {paying ? <span className="spinner" /> : `Pay ${formatCedi(total)}`}
        </button>
      </div>
    </div>
  );
};

export default Payment;
