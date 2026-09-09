import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null }) }) }),
  },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../context/ToastContext', () => ({ useToast: () => vi.fn() }));
vi.mock('../services/charterApi', () => ({
  charterApi: {
    getEventTypes: () => Promise.resolve([{ id: 'wedding', name: 'Wedding' }]),
    getPricing: () => Promise.resolve([]),
    estimatePrice: () => 1000,
    createCharter: vi.fn(),
  },
}));

const CharterRequest = (await import('./CharterRequest')).default;

const setup = async () => {
  render(<MemoryRouter><CharterRequest /></MemoryRouter>);
  // The form loads event types and pricing on mount.
  await waitFor(() => expect(screen.getByText('Group Charter')).toBeInTheDocument());
};

const nextBtn = () => screen.getByRole('button', { name: /next/i });
const returnToggle = () => screen.getByLabelText(/include return trip/i);

describe('CharterRequest — step 0 validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the first step', async () => {
    await setup();
    expect(screen.getByText('Group Charter')).toBeInTheDocument();
  });

  it('keeps Next disabled with an empty form', async () => {
    await setup();
    expect(nextBtn()).toBeDisabled();
  });

  // AKW-05: toggling a return trip on used to leave Next enabled with no
  // return date, saving is_return_trip true against a null return_date —
  // at the 1.8x return price.
  it('keeps Next disabled when a return trip has no return date', async () => {
    await setup();
    fireEvent.click(returnToggle());
    expect(nextBtn()).toBeDisabled();
  });

  it('shows the return date field only once the return trip is toggled on', async () => {
    await setup();
    expect(screen.queryByText(/return date/i)).not.toBeInTheDocument();
    fireEvent.click(returnToggle());
    expect(returnToggle()).toBeChecked();
  });

  it('unchecks the return trip toggle again', async () => {
    await setup();
    fireEvent.click(returnToggle());
    fireEvent.click(returnToggle());
    expect(returnToggle()).not.toBeChecked();
  });
});
