import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Ticket as TicketIcon, ChevronRight, X, Bus } from 'lucide-react';

import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';
import { cityById } from '../data/cities';
import { operatorById } from '../data/operators';
import { formatCedi, minutesToClock } from '../utils/format';

import SegmentedTabs from '../components/SegmentedTabs';
import EmptyState from '../components/EmptyState';
import PullToRefresh from '../components/PullToRefresh';
import OperatorMark from '../components/OperatorMark';
import { SkeletonList } from '../components/Skeleton';
import { useBriefLoad } from '../hooks/useBriefLoad';
import { AnimatedList, AnimatedItem } from '../components/AnimatedList';

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

const isPast = (b) => b.status === 'cancelled' || (b.type === 'scheduled' && b.trip.dateISO < todayISO());

const BookingRow = ({ booking, onOpen, onCancel }) => {
  const { trip } = booking;
  const operator = operatorById(trip.operatorId);
  const isLive = booking.type === 'live';
  const route = isLive ? trip.routeName : `${cityById(trip.fromId)?.name} → ${cityById(trip.toId)?.name}`;
  const when = isLive ? format(new Date(booking.createdAt), 'd MMM') : `${format(new Date(trip.dateISO), 'd MMM')} · ${minutesToClock(trip.departMins)}`;

  return (
    <div className="card">
      <div className="flex items-center gap-3 card-pressable" onClick={onOpen}>
        <OperatorMark operator={operator} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="semibold t-sm">{route}</div>
          <div className="t-xs muted">{when} · {booking.seats.length} seat{booking.seats.length === 1 ? '' : 's'} · {formatCedi(booking.amount)}</div>
        </div>
        {booking.status === 'cancelled'
          ? <span className="badge" style={{ background: '#FBE9E9', color: 'var(--red)' }}>Cancelled</span>
          : <ChevronRight size={18} className="muted" />}
      </div>
      {onCancel && booking.status !== 'cancelled' && (
        <>
          <div className="divider" style={{ margin: '12px 0' }} />
          <button className="flex items-center gap-2 t-sm" style={{ color: 'var(--red)' }} onClick={onCancel}><X size={15} /> Cancel booking</button>
        </>
      )}
    </div>
  );
};

const Trips = () => {
  const navigate = useNavigate();
  const { bookings, cancelBooking, refetch } = useTrips();
  const toast = useToast();
  const [tab, setTab] = useState('upcoming');
  const loading = useBriefLoad();

  const { upcoming, past } = useMemo(() => ({
    upcoming: bookings.filter((b) => !isPast(b)),
    past: bookings.filter(isPast),
  }), [bookings]);

  const list = tab === 'upcoming' ? upcoming : past;

  const refresh = async () => {
    await refetch();
    toast('Up to date', 'info');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'calc(20px + var(--safe-top)) 20px 8px' }}>
        <h1 className="mb-4">My Trips</h1>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[{ value: 'upcoming', label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` }, { value: 'past', label: 'History' }]}
        />
      </div>

      <PullToRefresh onRefresh={refresh} className="has-nav" style={{ flex: 1, padding: '16px 20px 0' }}>
        {loading ? (
          <SkeletonList count={4} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={tab === 'upcoming' ? Bus : TicketIcon}
            title={tab === 'upcoming' ? 'No upcoming trips' : 'No past trips yet'}
            message={tab === 'upcoming' ? 'Book a live or scheduled bus to see it here.' : 'Your travel history will appear here.'}
            action={tab === 'upcoming' && <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Find a bus</button>}
          />
        ) : (
          <AnimatedList className="flex flex-col gap-3">
            {list.map((b) => (
              <AnimatedItem key={b.id}>
                <BookingRow
                  booking={b}
                  onOpen={() => navigate(`/ticket/${b.id}`)}
                  onCancel={tab === 'upcoming' ? () => { cancelBooking(b.id); toast('Booking cancelled', 'info'); } : undefined}
                />
              </AnimatedItem>
            ))}
          </AnimatedList>
        )}
      </PullToRefresh>
    </div>
  );
};

export default Trips;
