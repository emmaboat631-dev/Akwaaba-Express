import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import Header from './Header';

describe('Header', () => {
  it('renders the title', () => {
    renderWithProviders(<Header title="Payment" />);
    expect(screen.getByRole('heading', { name: 'Payment' })).toBeInTheDocument();
  });

  it('renders the subtitle when given', () => {
    renderWithProviders(<Header title="Trips" subtitle="2 upcoming" />);
    expect(screen.getByText('2 upcoming')).toBeInTheDocument();
  });

  it('omits the subtitle when not given', () => {
    renderWithProviders(<Header title="Trips" />);
    expect(screen.queryByText('2 upcoming')).not.toBeInTheDocument();
  });

  it('shows a back button by default', () => {
    renderWithProviders(<Header title="Trips" />);
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  });

  it('hides the back button when back is false', () => {
    renderWithProviders(<Header title="Home" back={false} />);
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    renderWithProviders(<Header title="Trips" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders a right-hand slot', () => {
    renderWithProviders(<Header title="Trips" right={<span>Edit</span>} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders without a title', () => {
    renderWithProviders(<Header />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
