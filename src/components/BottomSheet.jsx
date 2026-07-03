import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, useDragControls } from 'framer-motion';

// Draggable bottom sheet with three snap points — full, half, and peek (just the
// grab bar) — sized relative to the screen. Drag the handle (or tap it to cycle)
// to move between them; the body scrolls independently.

const BottomSheet = ({ peek = 46, half = 0.55, full = 0.9, initial = 'half', bottomOffset = 0, children }) => {
  const ref = useRef(null);
  const inited = useRef(false);
  const controls = useDragControls();
  const y = useMotionValue(0);
  const [snaps, setSnaps] = useState({ full: 0, half: 240, peek: 480, fullH: 560 });

  useLayoutEffect(() => {
    const measure = () => {
      const H = ref.current?.offsetParent?.clientHeight || window.innerHeight;
      const fullH = Math.min(H * full, H - bottomOffset - 48); // always leave a map strip
      const peekH = Math.min(Math.max(peek <= 1 ? H * peek : peek, 38), fullH - 90);
      const halfH = Math.min(Math.max(half <= 1 ? H * half : half, peekH + 60), fullH - 20);
      const yPeek = fullH - peekH;
      const yHalf = Math.min(Math.max(fullH - halfH, 10), yPeek - 10);
      setSnaps({ full: 0, half: yHalf, peek: yPeek, fullH });
      if (!inited.current) {
        y.set(initial === 'full' ? 0 : initial === 'peek' ? yPeek : yHalf);
        inited.current = true;
      } else if (y.get() > yPeek) {
        y.set(yPeek);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [peek, half, full, bottomOffset, initial, y]);

  const points = () => [snaps.full, snaps.half, snaps.peek]; // ascending (top → bottom)
  const snapTo = (target) => animate(y, target, { type: 'spring', stiffness: 420, damping: 42 });

  const handleDragEnd = (_e, info) => {
    const cur = y.get();
    const v = info.velocity.y;
    const pts = points();
    let target;
    if (v < -450) target = [...pts].reverse().find((s) => s < cur - 6) ?? snaps.full;
    else if (v > 450) target = pts.find((s) => s > cur + 6) ?? snaps.peek;
    else target = pts.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
    snapTo(target);
  };

  // Tap the bar to cycle upward; wrap from full back to peek.
  const cycle = () => {
    const cur = y.get();
    const pts = points();
    const nearest = pts.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
    const idx = pts.indexOf(nearest);
    snapTo(idx === 0 ? snaps.peek : pts[idx - 1]);
  };

  return (
    <motion.div
      ref={ref}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: bottomOffset,
        height: snaps.fullH,
        y,
        background: 'var(--surface)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        boxShadow: '0 -12px 30px rgba(18,26,20,0.12)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
      }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: snaps.peek }}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
    >
      <div
        onPointerDown={(e) => controls.start(e)}
        onClick={cycle}
        style={{ padding: '12px 0 8px', display: 'flex', justifyContent: 'center', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 3, background: 'var(--line)' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 20px', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </motion.div>
  );
};

export default BottomSheet;
