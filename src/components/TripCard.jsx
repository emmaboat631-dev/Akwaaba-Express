import React from 'react';
import { Star, Wifi, Snowflake, Clock } from 'lucide-react';
import { cityById } from '../data/cities';
import { operatorById, busTypeById } from '../data/operators';
import { formatCedi, formatMinutes, minutesToClock } from '../utils/format';
import OperatorMark from './OperatorMark';

const TripCard = ({ trip, onClick }) => {
  const operator = operatorById(trip.operatorId);
  const busType = busTypeById(trip.busTypeId);
  const from = cityById(trip.fromId);
  const to = cityById(trip.toId);

  return (
    <div className="card card-pressable" onClick={onClick}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <OperatorMark operator={operator} size={34} />
          <div>
            <div className="t-sm semibold">{operator.name}</div>
            <div className="t-xs muted flex items-center gap-1">
              <Star size={11} fill="#F4C430" stroke="#F4C430" /> {operator.rating}
            </div>
          </div>
        </div>
        <span className="badge badge-primary">{busType.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="bold t-num" style={{ fontSize: 19 }}>{minutesToClock(trip.departMins)}</div>
          <div className="t-xs muted">{from.name}</div>
        </div>

        <div className="flex flex-col items-center" style={{ flex: 1, padding: '0 10px' }}>
          <div className="t-xs muted flex items-center gap-1"><Clock size={11} /> {formatMinutes(trip.durationMins)}</div>
          <div className="w-full flex items-center gap-1" style={{ margin: '4px 0' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', border: '2px solid var(--primary)' }} />
            <div style={{ flex: 1, height: 2, background: 'var(--line)' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink)' }} />
          </div>
          <div className="t-xs muted">{trip.distanceKm} km</div>
        </div>

        <div className="text-center">
          <div className="bold t-num" style={{ fontSize: 19 }}>{minutesToClock(trip.arriveMins)}</div>
          <div className="t-xs muted">{to.name}</div>
        </div>
      </div>

      <div className="divider" style={{ margin: '14px 0' }} />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 muted t-xs">
          {busType.amenities.includes('Air conditioning') && <Snowflake size={14} />}
          {busType.amenities.includes('WiFi') && <Wifi size={14} />}
          <span>{trip.seatsAvailable} seats left</span>
        </div>
        <div className="bold t-num" style={{ fontSize: 18, color: 'var(--primary-dark)' }}>{formatCedi(trip.price)}</div>
      </div>
    </div>
  );
};

export default TripCard;
