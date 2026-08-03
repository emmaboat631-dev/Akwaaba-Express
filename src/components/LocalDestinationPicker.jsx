import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin } from 'lucide-react';
import { LOCAL_DESTINATIONS } from '../data/localDestinations';
import { haversineKm } from '../utils/geo';

// Live-mode destination picker: shows nearby suburbs/landmarks only, sorted
// by distance from `position`. Same open/onSelect/onClose API as CityPicker so
// the two are interchangeable at call sites.
const LocalDestinationPicker = ({ open, title = 'Where are you heading?', position, onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const list = useMemo(() => {
    const filtered = LOCAL_DESTINATIONS.filter((d) =>
      `${d.name} ${d.area}`.toLowerCase().includes(q.toLowerCase()),
    );
    if (!position) return filtered;
    return filtered
      .map((d) => ({ ...d, km: haversineKm(position, [d.lat, d.lng]) }))
      .sort((a, b) => a.km - b.km);
  }, [q, position]);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    const t = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
      inputRef.current?.focus({ preventScroll: true });
    }, 260);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 60, display: 'flex', flexDirection: 'column' }}
        >
          <div className="screen" style={{ paddingBottom: 16 }}>
            <div className="header">
              <div>
                <h2>{title}</h2>
                <div className="t-xs muted">Nearby stops · live rides only</div>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>

            <div className="field mb-4">
              <Search size={18} className="muted" />
              <input ref={inputRef} placeholder="Search a stop or area" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', margin: '0 -4px' }}>
              {list.map((d) => (
                <button
                  key={d.id}
                  className="flex items-center gap-3 w-full"
                  style={{ padding: '14px 4px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}
                  onClick={() => { onSelect(d); onClose(); setQ(''); }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <MapPin size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="semibold">{d.name}</div>
                    <div className="t-xs muted">{d.area}</div>
                  </div>
                  {d.km != null && (
                    <span className="t-xs muted no-shrink">{d.km < 1 ? `${Math.round(d.km * 1000)} m` : `${d.km.toFixed(1)} km`}</span>
                  )}
                </button>
              ))}
              {list.length === 0 && <div className="muted text-center mt-6">No stops match “{q}”.</div>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocalDestinationPicker;
