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

export default SkeletonLine;
