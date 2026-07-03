import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, SlidersHorizontal, CalendarDays, Frown } from 'lucide-react';

import { api } from '../services/api';
import { cityById } from '../data/cities';
import { BUS_TYPES } from '../data/operators';

import CityPicker from '../components/CityPicker';
import DatePicker from '../components/DatePicker';
import TripCard from '../components/TripCard';
import EmptyState from '../components/EmptyState';
import { TripCardSkeleton } from '../components/Skeleton';

const SORTS = [
  { id: 'earliest', label: 'Earliest', fn: (a, b) => a.departMins - b.departMins },
  { id: 'cheapest', label: 'Cheapest', fn: (a, b) => a.price - b.price },
  { id: 'fastest', label: 'Fastest', fn: (a, b) => a.durationMins - b.durationMins },
];

const Search = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [fromId, setFromId] = useState(state?.fromId || 'accra');
  const [toId, setToId] = useState(state?.toId || 'kumasi');
  const [dateISO, setDateISO] = useState(state?.dateISO || format(new Date(), 'yyyy-MM-dd'));
  const [picker, setPicker] = useState(null);
  const [showCal, setShowCal] = useState(false);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('earliest');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.searchTrips({ fromId, toId, dateISO }).then((res) => {
      if (active) { setTrips(res); setLoading(false); }
    });
    return () => { active = false; };
  }, [fromId, toId, dateISO]);

  const visible = useMemo(() => {
    const sorter = SORTS.find((s) => s.id === sort).fn;
    return trips
      .filter((t) => typeFilter === 'all' || t.busTypeId === typeFilter)
      .sort(sorter);
  }, [trips, typeFilter, sort]);

  return (
    <div className="screen has-nav fade-up">
      <div className="header">
        <button className="icon-btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <button className="card flex items-center gap-2" style={{ padding: '8px 14px', flex: 1, margin: '0 10px', justifyContent: 'center' }} onClick={() => setPicker('from')}>
          <span className="semibold t-sm">{cityById(fromId)?.name}</span>
          <ArrowRight size={14} className="muted" />
          <span className="semibold t-sm" onClick={(e) => { e.stopPropagation(); setPicker('to'); }}>{cityById(toId)?.name}</span>
        </button>
        <button className="icon-btn" onClick={() => setShowCal(true)} aria-label="Change date">
          <CalendarDays size={18} />
        </button>
      </div>

      <div className="t-sm muted mb-3">{format(new Date(dateISO), 'EEEE, d MMMM')} · {loading ? '…' : `${visible.length} buses`}</div>

      {/* Filters */}
      <div className="scroll-x mb-4">
        <span className="chip" style={{ pointerEvents: 'none', background: 'transparent', border: 'none', paddingLeft: 0 }}><SlidersHorizontal size={14} /></span>
        <button className={`chip${typeFilter === 'all' ? ' active' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
        {BUS_TYPES.map((b) => (
          <button key={b.id} className={`chip${typeFilter === b.id ? ' active' : ''}`} onClick={() => setTypeFilter(b.id)}>{b.name}</button>
        ))}
        <span style={{ width: 1, background: 'var(--line)', margin: '4px 2px' }} />
        {SORTS.map((s) => (
          <button key={s.id} className={`chip${sort === s.id ? ' active' : ''}`} onClick={() => setSort(s.id)}>{s.label}</button>
        ))}
      </div>

      <div className="flex flex-col gap-3" style={{ flex: 1 }}>
        {loading ? (
          [0, 1, 2, 3].map((i) => <TripCardSkeleton key={i} />)
        ) : visible.length === 0 ? (
          <EmptyState icon={Frown} title="No buses found" message="Try another date, city, or bus type for this route." />
        ) : (
          visible.map((trip) => (
            <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trip/${trip.id}`, { state: { trip, pax: state?.pax || 1 } })} />
          ))
        )}
      </div>

      <CityPicker open={picker === 'from'} title="Travelling from" exclude={toId} onSelect={(c) => setFromId(c.id)} onClose={() => setPicker(null)} />
      <CityPicker open={picker === 'to'} title="Travelling to" exclude={fromId} onSelect={(c) => setToId(c.id)} onClose={() => setPicker(null)} />
      <DatePicker open={showCal} value={dateISO} onSelect={setDateISO} onClose={() => setShowCal(false)} title="Travel date" />
    </div>
  );
};

export default Search;
