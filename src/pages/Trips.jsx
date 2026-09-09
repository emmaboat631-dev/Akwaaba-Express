import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Ticket as TicketIcon, ChevronRight, X, Bus, Clock, UsersRound } from 'lucide-react';

import { useTrips } from '../context/TripsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { charterApi } from '../services/charterApi';
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

const getCountdown = (dateISO, departMins) => {
  if (!dateISO || departMins == null) return null;
  const h = Math.floor(departMins / 60);
  const m = departMins % 60;
  const depart = new Date(`${dateISO}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  const diff = depart - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const isPast = (b) => b.status === 'cancelled' || (b.type === 'scheduled' && b.trip.dateISO < todayISO());

const BookingRow = ({ booking, onOpen, onCancel, countdown }) => {
  const { trip } = booking;
  const operator = operatorById(trip?.operatorId);
  const isLive = booking.type === 'live';
  const route = isLive ? trip.routeName : `${cityById(trip.fromId)?.name} → ${cityById(trip.toId)?.name}`;
  const when = isLive ? format(new Date(booking.createdAt), 'd MMM') : `${format(new Date(trip.dateISO), 'd MMM')} · ${minutesToClock(trip.departMins)}`;

  return (
    <div className="card">
      {countdown && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: 'var(--green-faint, #e8f5ee)', fontSize: 12, fontWeight: 600, color: 'var(--green, #1FA971)' }}>
          <Clock size={13} />
          <span>Departing in {countdown}</span>
        </div>
      )}
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

const STATUS_BADGE = {
  pending: { bg: '#FDF1E2', color: '#D48C00', label: 'Pending' },
  quoted: { bg: '#E2F0FD', color: '#1A73E8', label: 'Quoted' },
  confirmed: { bg: '#E8F5EE', color: '#1FA971', label: 'Confirmed' },
  completed: { bg: '#E8F5EE', color: '#1FA971', label: 'Completed' },
  cancelled: { bg: '#FBE9E9', color: 'var(--red)', label: 'Cancelled' },
};

const CharterRow = ({ charter, onOpen }) => {
  const route = `${cityById(charter.pickupCityId)?.name || '?'} → ${cityById(charter.destCityId)?.name || '?'}`;
  const badge = STATUS_BADGE[charter.status] || STATUS_BADGE.pending;
  return (
    <div className="card">
      <div className="flex items-center gap-3 card-pressable" onClick={onOpen}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-light, rgba(6,57,47,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UsersRound size={20} style={{ color: 'var(--primary)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="semibold t-sm">{route}</div>
          <div className="t-xs muted">{charter.departDate} · {charter.groupName} · {charter.passengerCount} pax</div>
        </div>
        <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
      </div>
    </div>
  );
};

const isCharterPast = (c) => c.status === 'cancelled' || c.status === 'completed' || c.departDate < todayISO();

const Trips = () => {
  const navigate = useNavigate();
  const { bookings, cancelBooking, refetch } = useTrips();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('upcoming');
  const loading = useBriefLoad();
  const [, setTick] = useState(0);
  const [charters, setCharters] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.id) {
      charterApi.getMyCharters(user.id).then(setCharters).catch(console.error);
    }
  }, [user?.id]);

  const { upcoming, past } = useMemo(() => ({
    upcoming: bookings.filter((b) => !isPast(b)),
    past: bookings.filter(isPast),
  }), [bookings]);

  const upcomingCharters = useMemo(() => charters.filter((c) => !isCharterPast(c)), [charters]);
  const pastCharters = useMemo(() => charters.filter(isCharterPast), [charters]);

  const list = tab === 'upcoming' ? upcoming : past;
  const charterList = tab === 'upcoming' ? upcomingCharters : pastCharters;

  const refresh = async () => {
    await refetch();
    if (user?.id) {
      charterApi.getMyCharters(user.id).then(setCharters).catch(console.error);
    }
    toast('Up to date', 'info');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'calc(20px + var(--safe-top)) 20px 8px' }}>
        <h1 className="mb-4">My Trips</h1>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[{ value: 'upcoming', label: `Upcoming${(upcoming.length + upcomingCharters.length) ? ` (${upcoming.length + upcomingCharters.length})` : ''}` }, { value: 'past', label: 'History' }]}
        />
      </div>

      <PullToRefresh onRefresh={refresh} className="has-nav" style={{ flex: 1, padding: '16px 20px 0' }}>
        {loading ? (
          <SkeletonList count={4} />
        ) : (list.length === 0 && charterList.length === 0) ? (
          <EmptyState
            icon={tab === 'upcoming' ? Bus : TicketIcon}
            title={tab === 'upcoming' ? 'No upcoming trips' : 'No past trips yet'}
            message={tab === 'upcoming' ? 'Book a live or scheduled bus to see it here.' : 'Your travel history will appear here.'}
            action={tab === 'upcoming' && <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Find a bus</button>}
          />
        ) : (
          <AnimatedList className="flex flex-col gap-3">
            {charterList.length > 0 && (
              <>
                <div className="t-xs muted semibold" style={{ paddingTop: 4 }}>Group Charters</div>
                {charterList.map((c) => (
                  <AnimatedItem key={`charter-${c.id}`}>
                    <CharterRow charter={c} onOpen={() => navigate(`/charter/${c.id}`)} />
                  </AnimatedItem>
                ))}
              </>
            )}
            {list.length > 0 && charterList.length > 0 && (
              <div className="t-xs muted semibold" style={{ paddingTop: 4 }}>Bookings</div>
            )}
            {list.map((b) => (
              <AnimatedItem key={b.id}>
                <BookingRow
                  booking={b}
                  onOpen={() => navigate(`/ticket/${b.id}`)}
                  onCancel={tab === 'upcoming' ? () => { cancelBooking(b.id); toast('Booking cancelled', 'info'); } : undefined}
                  countdown={tab === 'upcoming' && b.type === 'scheduled' ? getCountdown(b.trip.dateISO, b.trip.departMins) : null}
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
