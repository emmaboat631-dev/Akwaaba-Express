import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonLine, TripCardSkeleton, ListRowSkeleton, SkeletonList } from './Skeleton';

describe('SkeletonLine', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<SkeletonLine />);
    expect(container.querySelector('.skeleton')).toHaveStyle({ width: '100%', height: '14px' });
  });

  it('honours custom width, height and radius', () => {
    const { container } = render(<SkeletonLine w="50%" h={20} r={4} />);
    expect(container.querySelector('.skeleton')).toHaveStyle({
      width: '50%', height: '20px', borderRadius: '4px',
    });
  });

  it('merges extra styles', () => {
    const { container } = render(<SkeletonLine style={{ opacity: 0.5 }} />);
    expect(container.querySelector('.skeleton')).toHaveStyle({ opacity: '0.5' });
  });
});

describe('TripCardSkeleton', () => {
  it('renders a card of placeholder lines', () => {
    const { container } = render(<TripCardSkeleton />);
    expect(container.querySelector('.card')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });
});

describe('ListRowSkeleton', () => {
  it('renders a leading mark, two text lines and a trailing value', () => {
    const { container } = render(<ListRowSkeleton />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(4);
  });
});

describe('SkeletonList', () => {
  it('renders four rows by default', () => {
    const { container } = render(<SkeletonList />);
    expect(container.querySelectorAll('.card')).toHaveLength(4);
  });

  it('honours a custom count', () => {
    const { container } = render(<SkeletonList count={2} />);
    expect(container.querySelectorAll('.card')).toHaveLength(2);
  });

  it('renders nothing for a count of zero', () => {
    const { container } = render(<SkeletonList count={0} />);
    expect(container.querySelectorAll('.card')).toHaveLength(0);
  });

  it('accepts a custom item component', () => {
    const { container } = render(<SkeletonList count={3} Item={TripCardSkeleton} />);
    expect(container.querySelectorAll('.card')).toHaveLength(3);
  });
});
