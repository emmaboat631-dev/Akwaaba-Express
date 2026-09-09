import React from 'react';

// Operator monogram — a soft brand tint with a hairline ring reads like a
// logo lockup even without real operator artwork (styling in .op-mark).
// Operators load from Supabase behind a hardcoded fallback list, so a lookup
// can miss for an id the fallback doesn't know yet — render a neutral mark
// rather than letting the whole page throw.
const OperatorMark = ({ operator, size = 44 }) => {
  const mark = operator?.mark || '—';
  const color = operator?.color || 'var(--muted)';
  return (
    <div
      className="op-mark"
      style={{
        '--op': color,
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        fontSize: Math.round(size * (mark.length > 2 ? 0.27 : 0.33)),
      }}
    >
      {mark}
    </div>
  );
};

export default OperatorMark;
