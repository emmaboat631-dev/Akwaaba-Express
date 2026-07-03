import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin } from 'lucide-react';
import { CITIES } from '../data/cities';

// Full-screen city chooser used by Home and Search. Slides up over the frame.
const CityPicker = ({ open, title = 'Select city', exclude, onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const list = CITIES.filter(
    (c) => c.id !== exclude && `${c.name} ${c.region}`.toLowerCase().includes(q.toLowerCase()),
  );

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
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>

            <div className="field mb-4">
              <Search size={18} className="muted" />
              <input autoFocus placeholder="Search a city or region" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', margin: '0 -4px' }}>
              {list.map((c) => (
                <button
                  key={c.id}
                  className="flex items-center gap-3 w-full"
                  style={{ padding: '14px 4px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}
                  onClick={() => { onSelect(c); onClose(); setQ(''); }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="semibold">{c.name}</div>
                    <div className="t-xs muted">{c.region}</div>
                  </div>
                </button>
              ))}
              {list.length === 0 && <div className="muted text-center mt-6">No cities match “{q}”.</div>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CityPicker;
