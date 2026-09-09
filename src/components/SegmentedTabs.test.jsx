import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Bus, Users } from 'lucide-react';
import SegmentedTabs from './SegmentedTabs';

const OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'history', label: 'History' },
];

describe('SegmentedTabs', () => {
  it('renders every option label', () => {
    render(<SegmentedTabs options={OPTIONS} value="upcoming" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Upcoming' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
  });

  it('marks the selected option active', () => {
    render(<SegmentedTabs options={OPTIONS} value="upcoming" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Upcoming' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'History' })).not.toHaveClass('active');
  });

  it('moves the active class when the value changes', () => {
    const { rerender } = render(<SegmentedTabs options={OPTIONS} value="upcoming" onChange={() => {}} />);
    rerender(<SegmentedTabs options={OPTIONS} value="history" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'History' })).toHaveClass('active');
  });

  it('calls onChange with the option value on click', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs options={OPTIONS} value="upcoming" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(onChange).toHaveBeenCalledWith('history');
  });

  it('renders option icons when provided', () => {
    const withIcons = [
      { value: 'bus', label: 'Buses', icon: Bus },
      { value: 'group', label: 'Groups', icon: Users },
    ];
    const { container } = render(<SegmentedTabs options={withIcons} value="bus" onChange={() => {}} />);
    expect(container.querySelectorAll('.seg-btn svg')).toHaveLength(2);
  });

  it('renders a sliding thumb', () => {
    const { container } = render(<SegmentedTabs options={OPTIONS} value="upcoming" onChange={() => {}} />);
    expect(container.querySelector('.seg-thumb')).toBeInTheDocument();
  });

  it('falls back to the first option when the value is unknown', () => {
    render(<SegmentedTabs options={OPTIONS} value="nope" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Upcoming' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'History' })).not.toHaveClass('active');
  });

  it('handles a three-option control', () => {
    const three = [...OPTIONS, { value: 'cancelled', label: 'Cancelled' }];
    render(<SegmentedTabs options={three} value="cancelled" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Cancelled' })).toHaveClass('active');
  });
});
