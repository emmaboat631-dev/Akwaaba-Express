import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin } from 'lucide-react';
import { CITIES } from '../data/cities';

// Ghana's 16 regions in display order (south → north broadly).
const REGION_ORDER = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Western North',
  'Central',
  'Eastern',
  'Volta',
  'Oti',
  'Bono',
  'Bono East',
  'Ahafo',
  'Northern',
  'Savannah',
  'North East',
  'Upper East',
  'Upper West',
];

// Full-screen city chooser used by Home and Search. Slides up over the frame.
const CityPicker = ({ open, title = 'Select city', exclude, onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Flat filtered list — shown when the user is typing
  const filtered = useMemo(
    () =>
      CITIES.filter(
        (c) => c.id !== exclude && `${c.name} ${c.region}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, exclude],
  );

  // Grouped list — shown when no search query is active
  const grouped = useMemo(() => {
    const available = CITIES.filter((c) => c.id !== exclude);
    const byRegion = {};
    for (const city of available) {
      if (!byRegion[city.region]) byRegion[city.region] = [];
      byRegion[city.region].push(city);
    }
    // Sort cities alphabetically within each region
    for (const region of Object.keys(byRegion)) {
      byRegion[region].sort((a, b) => a.name.localeCompare(b.name));
    }
    // Return regions in the defined order; any unlisted region goes at the end
    const ordered = REGION_ORDER.filter((r) => byRegion[r]);
    const extras = Object.keys(byRegion).filter((r) => !REGION_ORDER.includes(r)).sort();
    return [...ordered, ...extras].map((region) => ({ region, cities: byRegion[region] }));
  }, [exclude]);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    const t = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
      inputRef.current?.focus({ preventScroll: true });
    }, 260);
    return () => clearTimeout(t);
  }, [open]);

  const CityRow = ({ c }) => (
    <button
      className="flex items-center gap-3 w-full"
      style={{ padding: '12px 4px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}
      onClick={() => { onSelect(c); onClose(); setQ(''); }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: 'var(--surface-2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--primary)', flexShrink: 0,
      }}>
        <MapPin size={16} />
      </div>
      <div>
        <div className="semibold t-sm">{c.name}</div>
        <div className="t-xs muted">{c.region} Region</div>
      </div>
    </button>
  );

  const RegionHeader = ({ label }) => (
    <div style={{
      padding: '10px 4px 6px',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'var(--primary)',
      background: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 1,
      borderBottom: '2px solid var(--line)',
    }}>
      {label} Region
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'var(--bg)', zIndex: 60,
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div className="screen" style={{ paddingBottom: 16 }}>
            <div className="header">
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>

            <div className="field mb-4">
              <Search size={18} className="muted" />
              <input
                ref={inputRef}
                placeholder="Search a city or region…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button className="muted" onClick={() => setQ('')} aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </div>

            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', margin: '0 -4px' }}>
              {q ? (
                // ── Flat search results ──────────────────────────────────
                <>
                  {filtered.map((c) => <CityRow key={c.id} c={c} />)}
                  {filtered.length === 0 && (
                    <div className="muted text-center mt-6">No cities match "{q}".</div>
                  )}
                </>
              ) : (
                // ── Grouped by region ────────────────────────────────────
                grouped.map(({ region, cities }) => (
                  <div key={region}>
                    <RegionHeader label={region} />
                    {cities.map((c) => <CityRow key={c.id} c={c} />)}
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CityPicker;
