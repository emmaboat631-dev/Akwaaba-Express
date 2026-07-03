import React from 'react';

const EmptyState = ({ icon: Icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px', gap: 12 }}>
    {Icon && (
      <div
        className="flex items-center justify-center"
        style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--surface-2)', color: 'var(--muted)' }}
      >
        <Icon size={32} />
      </div>
    )}
    <h3>{title}</h3>
    {message && <p className="t-sm muted" style={{ maxWidth: 240 }}>{message}</p>}
    {action}
  </div>
);

export default EmptyState;
