import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders initials from a full name', () => {
    render(<Avatar name="Kwame Mensah" />);
    expect(screen.getByText('KM')).toBeInTheDocument();
  });

  it('renders a single initial for a one-word name', () => {
    render(<Avatar name="Kwame" />);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('renders without a name', () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector('.avatar')).toBeInTheDocument();
  });

  it('applies the given background colour', () => {
    const { container } = render(<Avatar name="Ama" color="#CE1126" />);
    expect(container.querySelector('.avatar')).toHaveStyle({ background: '#CE1126' });
  });

  it('applies the given size', () => {
    const { container } = render(<Avatar name="Ama" size={64} />);
    expect(container.querySelector('.avatar')).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Avatar name="Ama" onClick={onClick} />);
    fireEvent.click(screen.getByText('A'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows a pointer cursor only when clickable', () => {
    const { container: withClick } = render(<Avatar name="Ama" onClick={() => {}} />);
    expect(withClick.querySelector('.avatar')).toHaveStyle({ cursor: 'pointer' });

    const { container: noClick } = render(<Avatar name="Ama" />);
    expect(noClick.querySelector('.avatar')).toHaveStyle({ cursor: 'default' });
  });
});
