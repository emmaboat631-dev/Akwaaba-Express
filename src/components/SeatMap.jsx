import React from 'react';
import { Armchair } from 'lucide-react';
import { motion } from 'framer-motion';

// Interactive seat picker. `cols` describes the layout either side of the aisle
// (e.g. [2,2] standard, [2,1] VIP). Free seats report taps via onToggle;
// selection limits are the caller's policy.

const SeatMap = ({ cols = [2, 2], total = 44, taken = [], selected = [], onToggle }) => {
  const takenSet = new Set(taken);
  const selSet = new Set(selected);
  const perRow = cols[0] + cols[1];
  const rows = Math.ceil(total / perRow);

  const renderSeat = (n) => {
    if (n > total) return <div key={`pad-${n}`} style={{ width: 38 }} />;
    const isTaken = takenSet.has(n);
    const isSel = selSet.has(n);
    const cls = `seat${isTaken ? ' taken' : ''}${isSel ? ' selected' : ''}`;
    const handle = () => {
      if (isTaken) return;
      onToggle?.(n);
    };
    return (
      <motion.div
        key={n}
        className={cls}
        onClick={handle}
        whileTap={isTaken ? {} : { scale: 0.82 }}
        animate={isSel ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22, duration: 0.29 }}
      >
        {isSel ? <Armchair size={16} /> : n}
      </motion.div>
    );
  };

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="flex justify-between items-center mb-4">
        <div className="t-xs muted">Front of bus</div>
        <div className="flex items-center gap-1 t-xs muted">
          <div style={{ width: 26, height: 18, borderRadius: 5, border: '2px solid var(--line)' }} /> Driver
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center">
        {Array.from({ length: rows }).map((_, r) => {
          const base = r * perRow;
          return (
            <div key={r} className="flex items-center gap-2">
              {Array.from({ length: cols[0] }).map((_, i) => renderSeat(base + i + 1))}
              <div style={{ width: 18 }} />
              {Array.from({ length: cols[1] }).map((_, i) => renderSeat(base + cols[0] + i + 1))}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 mt-5 t-xs muted">
        <span className="flex items-center gap-1"><span className="seat" style={{ width: 16, height: 16 }} /> Free</span>
        <span className="flex items-center gap-1"><span className="seat selected" style={{ width: 16, height: 16 }} /> Yours</span>
        <span className="flex items-center gap-1"><span className="seat taken" style={{ width: 16, height: 16 }} /> Taken</span>
      </div>
    </div>
  );
};

export default SeatMap;
