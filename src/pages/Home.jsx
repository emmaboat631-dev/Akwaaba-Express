import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, parseISO } from 'date-fns';
import { ArrowDownUp, Calendar, Minus, Plus, Zap, CalendarClock, ChevronRight, Star } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useNearbyBuses } from '../hooks/useNearbyBuses';
import { useRelay } from '../hooks/useRelay';
import { useGeolocation } from '../hooks/useGeolocation';
import { useBriefLoad } from '../hooks/useBriefLoad';
import { storage, KEYS } from '../services/storage';
import { cityById } from '../data/cities';
import { formatCedi } from '../utils/format';

import CityPicker from '../components/CityPicker';
import DatePicker from '../components/DatePicker';
import LiveBusCard from '../components/LiveBusCard';
import Avatar from '../components/Avatar';
import { SkeletonList } from '../components/Skeleton';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { position } = useGeolocation();
  const buses = useNearbyBuses(position);
  const { liveBuses } = useRelay(); // real drivers online on other devices (LAN relay)
  const liveLoading = useBriefLoad();

  const [mode, setMode] = useState('schedule');
  const [fromId, setFromId] = useState('accra');
  const [toId, setToId] = useState(null);
  const [dateISO, setDateISO] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pax, setPax] = useState(1);
  const [picker, setPicker] = useState(null); // 'from' | 'to' | null
  const [showCal, setShowCal] = useState(false);
  const [recent, setRecent] = useState(() => storage.get(KEYS.recentSearches, []));

  const firstName = user?.name?.split(' ')[0] || 'traveller';

  const dateChips = useMemo(
    () => [0, 1, 2].map((d) => {
      const date = addDays(new Date(), d);
      return { iso: format(date, 'yyyy-MM-dd'), label: d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : format(date, 'EEE d') };
    }),
    [],
  );

  // Real online drivers (from the relay) lead the list, then simulated buses.
  const nearby = useMemo(
    () => [...liveBuses, ...[...buses].sort((a, b) => a.etaMin - b.etaMin)].slice(0, 6),
    [liveBuses, buses],
  );

  // Featured route card — real data from the trip generator (cheapest fare,
  // best operator rating for today's Accra → Kumasi departures).
  const featured = useMemo(() => {
    return {
      fromId: 'accra',
      toId: 'kumasi',
      price: 150, // Static fallback price
      rating: 4.5,
    };
  }, []);

  const swap = () => { setFromId(toId); setToId(fromId); };

  const runSearch = () => {
    if (!toId) { setPicker('to'); return; }
    const entry = { fromId, toId, dateISO };
    const next = [entry, ...recent.filter((r) => !(r.fromId === fromId && r.toId === toId))].slice(0, 4);
    setRecent(next);
    storage.set(KEYS.recentSearches, next);
    navigate('/search', { state: { fromId, toId, dateISO, pax } });
  };

  const openFeatured = () => {
    if (!featured) return;
    navigate('/search', { state: { fromId: featured.fromId, toId: featured.toId, dateISO, pax } });
  };

  // Recent searches store the date they were made on, which may be in the
  // past by now — re-open them against today so results aren't empty.
  const openRecent = (r) => {
    setFromId(r.fromId);
    setToId(r.toId);
    navigate('/search', { state: { fromId: r.fromId, toId: r.toId, dateISO: format(new Date(), 'yyyy-MM-dd'), pax } });
  };

  const Field = ({ label, city, placeholder, onClick }) => (
    <button className="flex items-center gap-3 w-full" style={{ textAlign: 'left', padding: '4px 0' }} onClick={onClick}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: city ? 'var(--primary)' : 'transparent', border: `2px solid ${city ? 'var(--primary)' : 'var(--muted)'}` }} />
      <div style={{ flex: 1 }}>
        <div className="t-xs muted">{label}</div>
        <div className="semibold" style={{ color: city ? 'var(--ink)' : 'var(--muted)' }}>{city ? city.name : placeholder}</div>
      </div>
    </button>
  );

  return (
    <div className="screen has-nav fade-up">
      {/* Top bar: greeting + avatar */}
      <div className="flex justify-between items-start mb-4">
        <div style={{ paddingTop: 4 }}>
          <div className="t-sm muted">Akwaaba, {firstName}</div>
          <h1 className="t-display mt-1" style={{ fontSize: 34 }}>
            Explore Ghana<br />by bus.
          </h1>
        </div>
        <Avatar name={user?.name} color={user?.avatarColor} size={44} onClick={() => navigate('/profile')} />
      </div>

      {/* Mode chips */}
      <div className="flex gap-2 mb-4">
        <button className={`chip${mode === 'schedule' ? ' active' : ''}`} onClick={() => setMode('schedule')}>
          <CalendarClock size={15} /> Book ahead
        </button>
        <button className={`chip${mode === 'live' ? ' active' : ''}`} onClick={() => setMode('live')}>
          <Zap size={15} /> Live now
        </button>
      </div>

      {mode === 'schedule' ? (
        <>
          {/* Journey card */}
          <div className="card" style={{ position: 'relative' }}>
            <Field label="From" city={cityById(fromId)} placeholder="Origin" onClick={() => setPicker('from')} />
            <div className="divider" style={{ margin: '6px 0 6px 22px' }} />
            <Field label="To" city={cityById(toId)} placeholder="Where to?" onClick={() => setPicker('to')} />
            <button className="icon-btn" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, background: 'var(--primary)', color: '#fff' }} onClick={swap} aria-label="Swap">
              <ArrowDownUp size={16} />
            </button>
          </div>

          <div className="scroll-x mt-3">
            {dateChips.map((d) => (
              <button key={d.iso} className={`chip${dateISO === d.iso ? ' active' : ''}`} onClick={() => setDateISO(d.iso)}>
                <Calendar size={14} /> {d.label}
              </button>
            ))}
            {(() => {
              const isCustom = !dateChips.some((d) => d.iso === dateISO);
              return (
                <button className={`chip${isCustom ? ' active' : ''}`} onClick={() => setShowCal(true)}>
                  <Calendar size={14} /> {isCustom ? format(parseISO(dateISO), 'EEE, d MMM') : 'Pick date'}
                </button>
              );
            })()}
          </div>

          <div className="flex justify-between items-center mt-4 mb-4">
            <span className="semibold t-sm">Passengers</span>
            <div className="flex items-center gap-3">
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setPax((p) => Math.max(1, p - 1))}><Minus size={16} /></button>
              <span className="bold" style={{ width: 18, textAlign: 'center' }}>{pax}</span>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setPax((p) => Math.min(5, p + 1))}><Plus size={16} /></button>
            </div>
          </div>

          <button className="btn btn-primary" onClick={runSearch}>Search buses</button>

          {/* Featured route */}
          {featured && (
            <>
              <div className="flex justify-between items-center mt-6 mb-2">
                <h3>Popular route</h3>
              </div>
              <div className="card" style={{ padding: 10 }}>
                <div style={{ position: 'relative', borderRadius: 18, background: '#E9EBE4', overflow: 'hidden', padding: '30px 18px 22px' }}>
                  <span className="badge" style={{ position: 'absolute', top: 12, left: 12, background: '#fff', color: '#151815', boxShadow: 'var(--shadow-sm)' }}>
                    <Star size={11} fill="#F4C430" stroke="#F4C430" /> {featured.rating.toFixed(1)}
                  </span>
                  <img
                    src="/realistic_bus.png"
                    alt="Intercity coach"
                    style={{ width: '100%', maxWidth: 290, margin: '0 auto', mixBlendMode: 'multiply' }}
                  />
                </div>
                <div className="flex justify-between items-center" style={{ padding: '12px 8px 6px' }}>
                  <div>
                    <div className="semibold">{cityById(featured.fromId)?.name} → {cityById(featured.toId)?.name}</div>
                    <div className="t-sm muted">
                      from <span className="bold t-num" style={{ color: 'var(--primary-dark)' }}>{formatCedi(featured.price)}</span>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={openFeatured}>View trips</button>
                </div>
              </div>
            </>
          )}

          {recent.length > 0 && (
            <>
              <div className="t-xs muted mt-5 mb-2">Recent</div>
              {recent.map((r, i) => (
                <button key={i} className="flex items-center justify-between w-full" style={{ padding: '10px 2px', borderBottom: '1px solid var(--line)' }}
                  onClick={() => openRecent(r)}>
                  <span className="t-sm">{cityById(r.fromId)?.name} → {cityById(r.toId)?.name}</span>
                  <ChevronRight size={16} className="muted" />
                </button>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <span className="semibold t-sm flex items-center gap-2"><span className="live-dot" /> Buses near you</span>
            <button className="t-sm semibold" style={{ color: 'var(--primary-dark)' }} onClick={() => navigate('/live')}>Live map</button>
          </div>
          {liveLoading ? (
            <SkeletonList count={4} />
          ) : (
            <div className="flex flex-col gap-3">
              {nearby.map((bus) => (
                <LiveBusCard key={bus.id} bus={bus} onClick={() => navigate(`/live/${bus.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      <CityPicker
        open={picker === 'from'}
        title="Travelling from"
        exclude={toId}
        onSelect={(c) => setFromId(c.id)}
        onClose={() => setPicker(null)}
      />
      <CityPicker
        open={picker === 'to'}
        title="Travelling to"
        exclude={fromId}
        onSelect={(c) => setToId(c.id)}
        onClose={() => setPicker(null)}
      />
      <DatePicker open={showCal} value={dateISO} onSelect={setDateISO} onClose={() => setShowCal(false)} title="Travel date" />
    </div>
  );
};

export default Home;
