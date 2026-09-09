import React from 'react';
import { motion } from 'framer-motion';

// Animated segmented control. The active "thumb" slides between options and
// is also swipeable (drag horizontally to switch).

// Keep in sync with the .seg padding in index.css — the thumb math has to
// compensate for it, otherwise the pill sits off-centre against the buttons.
const SEG_PAD = 5;

const SegmentedTabs = ({ options, value, onChange }) => {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;

  // Buttons live inside the padded content box, so the thumb width matches
  // one nth of the CONTENT (100% minus both paddings), and the left offset
  // walks from the left padding across the same content width.
  const thumbWidth = `calc((100% - ${2 * SEG_PAD}px) / ${n})`;
  const thumbLeft = (i) => `calc(${SEG_PAD}px + ${i} * (100% - ${2 * SEG_PAD}px) / ${n})`;

  const handleDragEnd = (_e, info) => {
    if (info.offset.x < -40 && index < n - 1) onChange(options[index + 1].value);
    else if (info.offset.x > 40 && index > 0) onChange(options[index - 1].value);
  };

  return (
    <div className="seg">
      <motion.div
        className="seg-thumb"
        style={{ width: thumbWidth }}
        animate={{ left: thumbLeft(index) }}
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
