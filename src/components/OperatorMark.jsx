import React from 'react';

// Operator monogram — a soft brand tint with a hairline ring reads like a
// logo lockup even without real operator artwork (styling in .op-mark).
const OperatorMark = ({ operator, size = 44 }) => (
  <div
    className="op-mark"
    style={{
      '--op': operator.color,
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.32),
      fontSize: Math.round(size * (operator.mark.length > 2 ? 0.27 : 0.33)),
    }}
  >
    {operator.mark}
  </div>
);

export default OperatorMark;
