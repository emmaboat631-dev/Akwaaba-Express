import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Bus } from 'lucide-react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No trips yet" />);
    expect(screen.getByRole('heading', { name: 'No trips yet' })).toBeInTheDocument();
  });

  it('renders the message when given', () => {
    render(<EmptyState title="No trips yet" message="Book one to get started." />);
    expect(screen.getByText('Book one to get started.')).toBeInTheDocument();
  });

  it('omits the message when not given', () => {
    const { container } = render(<EmptyState title="No trips yet" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the icon when given', () => {
    const { container } = render(<EmptyState icon={Bus} title="No trips" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders without an icon', () => {
    const { container } = render(<EmptyState title="No trips" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders the action when given', () => {
    render(<EmptyState title="No trips" action={<button>Find a bus</button>} />);
    expect(screen.getByRole('button', { name: 'Find a bus' })).toBeInTheDocument();
  });

  it('renders without an action', () => {
    render(<EmptyState title="No trips" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
