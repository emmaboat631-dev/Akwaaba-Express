import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Lightweight pull-to-refresh. Wrap a scrollable area; when the user drags down
// from the very top past the threshold, onRefresh() runs (await-able).

const THRESHOLD = 70;

const PullToRefresh = ({ onRefresh, children, className, style }) => {
  const ref = useRef(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e) => {
    if (ref.current && ref.current.scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const onTouchMove = (e) => {
    if (!pulling.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(delta * 0.5, 90));
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(40);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    }
    setPull(0);
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{ overflowY: 'auto', position: 'relative', ...style }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          position: 'absolute', top: 8, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          opacity: pull > 10 || refreshing ? 1 : 0,
          transition: pulling.current ? 'none' : 'opacity .2s',
          color: 'var(--muted)', pointerEvents: 'none',
        }}
      >
        <Loader2 size={22} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none', transform: `rotate(${pull * 3}deg)` }} />
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: pulling.current ? 'none' : 'transform .25s ease' }}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
