import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toggle from './Toggle';

describe('Toggle', () => {
  it('renders a button', () => {
    render(<Toggle on={false} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('uses the line colour when off', () => {
    render(<Toggle on={false} onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveStyle({ background: 'var(--line)' });
  });

  it('uses the primary colour when on', () => {
    render(<Toggle on onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveStyle({ background: 'var(--primary)' });
  });

  it('slides the knob right when on', () => {
    const { container } = render(<Toggle on onClick={() => {}} />);
    expect(container.querySelector('span')).toHaveStyle({ left: '21px' });
  });

  it('keeps the knob left when off', () => {
    const { container } = render(<Toggle on={false} onClick={() => {}} />);
    expect(container.querySelector('span')).toHaveStyle({ left: '3px' });
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Toggle on={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
