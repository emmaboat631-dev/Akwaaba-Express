import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus } from 'lucide-react';

import { useBooking } from '../context/BookingContext';
import { busTypeById } from '../data/operators';
import { formatCedi } from '../utils/format';

import Header from '../components/Header';
import SeatMap from '../components/SeatMap';
import EmptyState from '../components/EmptyState';

const SeatSelection = () => {
  const navigate = useNavigate();
  const { draft, setSeats } = useBooking();
  const trip = draft.trip;
  // One seat per passenger (never more than the seats still free).
  const freeSeats = trip ? trip.seatsTotal - trip.seatsTaken.length : 1;
  const pax = Math.max(1, Math.min(draft.pax || 1, freeSeats));
  const [selected, setSelected] = useState(() => (draft.seats || []).slice(0, pax));

  if (!trip) {
    return (
      <div className="screen">
        <Header title="Select seats" />
        <EmptyState icon={Bus} title="No trip selected" message="Pick a trip first." action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Find a bus</button>} />
      </div>
    );
  }

  const busType = busTypeById(trip.busTypeId);

  // Tap a selected seat to free it. At the passenger cap, picking another
  // seat swaps out the oldest selection instead of adding a seat.
  const toggle = (n) =>
    setSelected((s) => {
      if (s.includes(n)) return s.filter((x) => x !== n);
      if (s.length >= pax) return [...s.slice(s.length - pax + 1), n];
      return [...s, n];
    });

  const proceed = () => {
    setSeats(selected);
    navigate('/passengers');
  };

  const total = selected.length * trip.price;

  return (
    <div className="screen fade-up">
      <Header title="Choose your seats" subtitle={`${busType.name} · ${pax} passenger${pax === 1 ? '' : 's'}`} />

      <SeatMap
        cols={busType.cols}
        total={trip.seatsTotal}
        taken={trip.seatsTaken}
        selected={selected}
        onToggle={toggle}
      />

      <div className="mt-auto">
        <div className="flex justify-between items-center mb-3 mt-4">
          <div className="t-sm muted">
            {selected.length ? `Seat${selected.length === 1 ? '' : 's'} ${[...selected].sort((a, b) => a - b).join(', ')}` : `Pick ${pax} seat${pax === 1 ? '' : 's'}`}
          </div>
          <div className="bold t-num" style={{ fontSize: 18 }}>{formatCedi(total)}</div>
        </div>
        <button className="btn btn-primary" onClick={proceed} disabled={selected.length !== pax}>
          {selected.length === pax
            ? `Continue with ${pax} seat${pax === 1 ? '' : 's'}`
            : `Select ${pax - selected.length} more seat${pax - selected.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
};

export default SeatSelection;
