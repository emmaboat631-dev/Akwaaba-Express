import React from 'react';

const Toggle = ({ on, onClick }) => (
  <button onClick={onClick} style={{ width: 44, height: 26, borderRadius: 13, background: on ? 'var(--primary)' : 'var(--line)', position: 'relative', transition: 'background .2s' }}>
    <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: 'var(--shadow-sm)' }} />
  </button>
);

export default Toggle;
