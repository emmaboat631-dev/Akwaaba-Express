import React from 'react';
import { motion } from 'framer-motion';

// Animated segmented control. The active "thumb" slides between options and
// is also swipeable (drag horizontally to switch).

const SegmentedTabs = ({ options, value, onChange }) => {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const width = 100 / options.length;

  const handleDragEnd = (_e, info) => {
    if (info.offset.x < -40 && index < options.length - 1) onChange(options[index + 1].value);
    else if (info.offset.x > 40 && index > 0) onChange(options[index - 1].value);
  };

  return (
    <div className="seg">
      <motion.div
        className="seg-thumb"
        style={{ width: `calc(${width}% - 4px)` }}
        animate={{ left: `calc(${index * width}% + 2px)` }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      />
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          className={`seg-btn${v === value ? ' active' : ''}`}
          onClick={() => onChange(v)}
        >
          {Icon && <Icon size={16} />}
          {label}
        </button>
      ))}
    </div>
  );
};

export default SegmentedTabs;
