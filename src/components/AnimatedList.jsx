import React from 'react';
import { motion } from 'framer-motion';

// Reusable stagger animation wrappers.
// Wrap a list container in <AnimatedList> and each item in <AnimatedItem>.
// Works with framer-motion's propagation — children receive stagger automatically.

const listVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.047,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

export const AnimatedList = ({ children, className, style }) => (
  <motion.div
    variants={listVariants}
    initial="hidden"
    animate="show"
    className={className}
    style={style}
  >
    {children}
  </motion.div>
);

export const AnimatedItem = ({ children, className, style }) => (
  <motion.div variants={itemVariants} className={className} style={style}>
    {children}
  </motion.div>
);

// Standalone pop-in for single elements (e.g. empty states, confirmations).
export const PopIn = ({ children, delay = 0, style, className }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.88 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.37, ease: [0.16, 1, 0.3, 1], delay }}
    style={style}
    className={className}
  >
    {children}
  </motion.div>
);

// Press-scale wrapper — adds a spring scale-down on tap, like iOS.
export const PressScale = ({ children, scale = 0.97, style, className, onClick }) => (
  <motion.div
    whileTap={{ scale }}
    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
    style={{ ...style, cursor: 'pointer' }}
    className={className}
    onClick={onClick}
  >
    {children}
  </motion.div>
);
