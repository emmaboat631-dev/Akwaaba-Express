import React from 'react';

export const SkeletonLine = ({ w = '100%', h = 14, r = 8, style }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

export const TripCardSkeleton = () => (
  <div className="card flex flex-col gap-3">
    <div className="flex justify-between items-center">
      <SkeletonLine w="40%" h={16} />
      <SkeletonLine w="22%" h={26} r={14} />
    </div>
    <SkeletonLine w="70%" />
    <div className="divider" />
    <div className="flex gap-3">
      <SkeletonLine w="30%" h={12} />
      <SkeletonLine w="30%" h={12} />
    </div>
  </div>
);

// A card with a leading avatar/mark, two text lines and a trailing value —
// matches list rows (live buses, bookings, manifest).
export const ListRowSkeleton = () => (
  <div className="card flex items-center gap-3">
    <SkeletonLine w={46} h={46} r={14} />
    <div style={{ flex: 1 }} className="flex flex-col gap-2">
      <SkeletonLine w="55%" h={14} />
      <SkeletonLine w="35%" h={11} />
    </div>
    <SkeletonLine w={48} h={16} />
  </div>
);

// Render N of a skeleton, keyed — for lists.
export const SkeletonList = ({ count = 4, Item = ListRowSkeleton }) => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: count }).map((_, i) => <Item key={i} />)}
  </div>
);

