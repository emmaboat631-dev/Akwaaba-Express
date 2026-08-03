import React from 'react';
import { Check, Circle } from 'lucide-react';

// Password requirements, in display order. Each rule's `test` returns true
// when the value satisfies it. Exported so submit-time validators can use
// the exact same rules the UI displays — no drift.
export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters',      test: (v) => v.length >= 8 },
  { key: 'upper',  label: 'One uppercase letter (A–Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower',  label: 'One lowercase letter (a–z)', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number (0–9)',           test: (v) => /\d/.test(v) },
];

export const passwordMeetsRules = (v) => PASSWORD_RULES.every((r) => r.test(v));

// Live checklist rendered below a password field. `confirm` is optional —
// if provided, adds a "Passwords match" row that only appears once the user
// starts typing the confirm value (avoids a red-fail flash before they've
// had a chance).
const PasswordChecklist = ({ value = '', confirm }) => {
  const rules = [
    ...PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(value) })),
    ...(confirm !== undefined && confirm.length > 0
      ? [{ key: 'match', label: 'Passwords match', ok: value.length > 0 && value === confirm }]
      : []),
  ];
  return (
    <ul
      className="flex flex-col gap-2"
      style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}
    >
      {rules.map((r) => (
        <li
          key={r.key}
          className="flex items-center gap-2 t-xs"
          style={{
            color: r.ok ? 'var(--success)' : 'var(--muted)',
            transition: 'color .2s ease',
          }}
        >
          {r.ok
            ? <Check size={14} strokeWidth={3} />
            : <Circle size={14} strokeWidth={2} />}
          <span>{r.label}</span>
        </li>
      ))}
    </ul>
  );
};

export default PasswordChecklist;
