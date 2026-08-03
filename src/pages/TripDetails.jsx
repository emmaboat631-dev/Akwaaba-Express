import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Check, Star, Clock } from 'lucide-react';

import { api } from '../services/api';
import { useBooking } from '../context/BookingContext';
import { cityById } from '../data/cities';
import { operatorById, busTypeById } from '../data/operators';
import { formatCedi, formatMinutes, minutesToClock } from '../utils/format';

import Header from '../components/Header';
import OperatorMark from '../components/OperatorMark';
import { SkeletonLine } from '../components/Skeleton';

const TripDetails = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const { state } = useLocation();
  const { startBooking } = useBooking();

  const [trip, setTrip] = useState(state?.trip || null);

  useEffect(() => {
    if (!trip) api.getTrip(tripId).then(setTrip);
  }, [trip, tripId]);

  if (!trip) {
    return (
      <div className="screen fade-up">
        <Header title="Trip details" />
        <div className="card mb-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <SkeletonLine w={46} h={46} r={14} />
            <div style={{ flex: 1 }} className="flex flex-col gap-2"><SkeletonLine w="50%" h={14} /><SkeletonLine w="30%" h={11} /></div>
          </div>
          <SkeletonLine w="80%" h={40} r={12} />
        </div>
        <div className="card mb-4 flex flex-col gap-3"><SkeletonLine w="40%" h={14} /><SkeletonLine w="70%" h={12} /><SkeletonLine w="60%" h={12} /></div>
        <div className="card flex justify-between items-center"><SkeletonLine w="30%" h={24} /><SkeletonLine w="24%" h={24} r={12} /></div>
      </div>
    );
  }

  const operator = operatorById(trip.operatorId);
  const busType = busTypeById(trip.busTypeId);
  const from = cityById(trip.fromId);
  const to = cityById(trip.toId);

  const proceed = () => {
    startBooking(trip, state?.pax || 1);
    navigate(`/trip/${trip.id}/seats`);
  };

  return (
    <div className="screen fade-up">
      <Header title="Trip details" />

      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-4">
          <OperatorMark operator={operator} size={46} />
          <div style={{ flex: 1 }}>
            <div className="semibold">{operator.name}</div>
            <div className="t-xs muted flex items-center gap-1"><Star size={11} fill="#F4C430" stroke="#F4C430" /> {operator.rating} · {trip.plate}</div>
          </div>
          <span className="badge badge-primary">{busType.name}</span>
        </div>

        {/* Route timeline */}
        <div className="flex">
          <div className="flex flex-col items-center" style={{ marginRight: 14 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '3px solid var(--primary)' }} />
            <div style={{ flex: 1, width: 2, background: 'var(--line)', margin: '4px 0' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--ink)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'auto' }}>
              <div>
                <div className="bold" style={{ fontSize: 18 }}>{minutesToClock(trip.departMins)}</div>
                <div className="t-sm muted">{from.name} · {from.region}</div>
              </div>
            </div>
            <div className="t-xs muted flex items-center gap-1" style={{ margin: '14px 0' }}><Clock size={12} /> {formatMinutes(trip.durationMins)} · {trip.distanceKm} km</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="bold" style={{ fontSize: 18 }}>{minutesToClock(trip.arriveMins)}</div>
                <div className="t-sm muted">{to.name} · {to.region}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="semibold mb-3">Onboard amenities</div>
        <div className="flex flex-col gap-2">
          {busType.amenities.map((a) => (
            <div key={a} className="flex items-center gap-2 t-sm">
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} /></div>
              {a}
            </div>
          ))}
        </div>
      </div>

      <div className="card flex justify-between items-center mb-4">
        <div>
          <div className="t-xs muted">Fare per seat</div>
          <div className="bold" style={{ fontSize: 22, color: 'var(--primary-dark)' }}>{formatCedi(trip.price)}</div>
        </div>
        <div className="badge badge-success">{trip.seatsAvailable} seats available</div>
      </div>

      <div className="mt-auto">
        <button className="btn btn-primary" onClick={proceed}>Select seats</button>
      </div>
    </div>
  );
};

export default TripDetails;
