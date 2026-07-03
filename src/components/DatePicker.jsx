import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, addMonths, isSameMonth, isSameDay, isBefore, startOfDay, parseISO,
} from 'date-fns';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Simple, tap-friendly month calendar shown as a full panel. Past days are
// disabled; tapping a day selects it and closes.
const DatePicker = ({ open, value, min, onSelect, onClose, title = 'Select date' }) => {
  const selected = value ? parseISO(value) : new Date();
  const minDate = startOfDay(min ? parseISO(min) : new Date());
  const [month, setMonth] = useState(startOfMonth(selected));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  const prevDisabled = isBefore(startOfMonth(addMonths(month, -1)), startOfMonth(minDate));

  const choose = (d) => {
    onSelect(format(d, 'yyyy-MM-dd'));
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 70, display: 'flex', flexDirection: 'column' }}
        >
          <div className="screen">
            <div className="header">
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>

            {/* Month navigation */}
            <div className="flex justify-between items-center mb-4">
              <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} disabled={prevDisabled} style={{ opacity: prevDisabled ? 0.4 : 1 }} aria-label="Previous month">
                <ChevronLeft size={20} />
              </button>
              <div className="bold" style={{ fontSize: 17 }}>{format(month, 'MMMM yyyy')}</div>
              <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Weekday headings */}
            <div className="flex mb-2">
              {WEEKDAYS.map((w) => (
                <div key={w} className="t-xs muted text-center" style={{ flex: 1, fontWeight: 600 }}>{w}</div>
              ))}
            </div>

            {/* Day grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {days.map((d) => {
                const disabled = isBefore(d, minDate);
                const inMonth = isSameMonth(d, month);
                const isSel = value && isSameDay(d, selected);
                const today = isSameDay(d, new Date());
                return (
                  <button
                    key={d.toISOString()}
                    disabled={disabled}
                    onClick={() => choose(d)}
                    style={{
                      height: 44,
                      borderRadius: 'var(--r-sm)',
                      fontSize: 14,
                      fontWeight: isSel ? 700 : 500,
                      background: isSel ? 'var(--primary)' : 'transparent',
                      color: isSel ? '#fff' : !inMonth || disabled ? 'var(--muted)' : 'var(--ink)',
                      opacity: disabled ? 0.4 : 1,
                      border: today && !isSel ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>

            <div className="t-xs muted text-center mt-5">Tap a date to select it</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DatePicker;
