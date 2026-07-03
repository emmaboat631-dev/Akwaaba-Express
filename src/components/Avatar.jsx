import React from 'react';
import { initialsOf } from '../utils/format';

const Avatar = ({ name = '', color = '#06392F', size = 40, onClick }) => (
  <div
    className="avatar"
    onClick={onClick}
    style={{ width: size, height: size, background: color, fontSize: size * 0.4, cursor: onClick ? 'pointer' : 'default' }}
  >
    {initialsOf(name)}
  </div>
);

export default Avatar;
