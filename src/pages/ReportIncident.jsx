import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, Shield, Package, Clock, DollarSign, Truck, UserX, HelpCircle } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

import Header from '../components/Header';
import EmptyState from '../components/EmptyState';

const CATEGORIES = [
  { id: 'safety', label: 'Safety concern', icon: Shield, desc: 'Unsafe driving, vehicle issues' },
  { id: 'harassment', label: 'Harassment', icon: UserX, desc: 'Verbal, physical, or sexual harassment' },
  { id: 'lost_item', label: 'Lost item', icon: Package, desc: 'Left something on the bus' },
  { id: 'delay', label: 'Major delay', icon: Clock, desc: 'Significant departure/arrival delay' },
  { id: 'overcharge', label: 'Overcharge', icon: DollarSign, desc: 'Charged more than the listed fare' },
  { id: 'vehicle_condition', label: 'Vehicle condition', icon: Truck, desc: 'Broken seats, AC, cleanliness' },
  { id: 'driver_behavior', label: 'Driver behavior', icon: AlertTriangle, desc: 'Rude, unprofessional conduct' },
  { id: 'other', label: 'Other', icon: HelpCircle, desc: 'Something else' },
];

const ReportIncident = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { user } = useAuth();
  const { getBooking } = useTrips();
  const toast = useToast();

  const booking = bookingId ? getBooking(bookingId) : null;

  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!category) { toast('Select a category', 'error'); return; }
    if (description.trim().length < 10) { toast('Please describe the issue (at least 10 characters)', 'error'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('incidents').insert([{
      booking_id: booking?.id || null,
      user_id: user.id,
      category,
      description: description.trim(),
    }]);

    if (error) {
      toast('Failed to submit report', 'error');
      setSubmitting(false);
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="screen fade-up">
        <Header title="Report submitted" />
        <EmptyState
          icon={Check}
          title="Report received"
          message="We'll review your report and take appropriate action. You can check the status in your profile."
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/trips')}>Back to trips</button>}
        />
      </div>
    );
  }

  return (
    <div className="screen fade-up">
      <Header title="Report an issue" onBack={() => navigate(-1)} />

      {booking && (
        <div className="card mb-4" style={{ padding: 12 }}>
          <div className="t-xs muted">Reporting about</div>
          <div className="semibold t-sm">Booking {booking.id}</div>
          {booking.trip && (
            <div className="t-xs muted">{booking.trip.routeName || `${booking.trip.fromId} → ${booking.trip.toId}`}</div>
          )}
        </div>
      )}

      <div className="semibold mb-3">What happened?</div>
      <div className="flex flex-col gap-2 mb-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              className={`card flex items-center gap-3${active ? ' card-selected' : ''}`}
              style={{ padding: '12px 14px', textAlign: 'left' }}
              onClick={() => setCategory(cat.id)}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: active ? 'var(--primary)' : 'var(--surface-2)',
                color: active ? '#fff' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all .15s',
              }}>
                <Icon size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="semibold t-sm">{cat.label}</div>
                <div className="t-xs muted">{cat.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {category && (
        <>
          <div className="field-label">Describe the issue</div>
          <div className="field mb-4" style={{ alignItems: 'flex-start' }}>
            <textarea
              rows={4}
              placeholder="Tell us what happened so we can investigate…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', resize: 'vertical', minHeight: 80 }}
            />
          </div>
        </>
      )}

      <div className="mt-auto" style={{ paddingTop: 12 }}>
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={submitting || !category}
        >
          {submitting ? <span className="spinner" /> : 'Submit report'}
        </button>
      </div>
    </div>
  );
};

export default ReportIncident;
