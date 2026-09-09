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

const { default: CharterRequest, routeEstimate } = await import('./CharterRequest');

const CITY = {
  accra: { lat: 5.6037, lng: -0.187 },
  tema: { lat: 5.6698, lng: -0.0166 },
  kumasi: { lat: 6.6885, lng: -1.6244 },
  tamale: { lat: 9.4008, lng: -0.8393 },
  bolgatanga: { lat: 10.7856, lng: -0.8514 },
};

const setup = async () => {
  render(<MemoryRouter><CharterRequest /></MemoryRouter>);
  // The form loads event types and pricing on mount.
  await waitFor(() => expect(screen.getByText('Group Charter')).toBeInTheDocument());
};

const nextBtn = () => screen.getByRole('button', { name: /next/i });
const returnToggle = () => screen.getByLabelText(/include return trip/i);

// AKW-04: the estimate used to be built from a hardcoded 200 km and 8 hours,
// so every route on the network quoted the same price.
describe('routeEstimate', () => {
  it('returns nulls until both cities are chosen', () => {
    expect(routeEstimate(null, CITY.kumasi)).toEqual({ distanceKm: null, durationHours: null });
    expect(routeEstimate(CITY.accra, null)).toEqual({ distanceKm: null, durationHours: null });
    expect(routeEstimate(null, null).distanceKm).toBeNull();
  });

  it('scales with the real distance between cities', () => {
    const short = routeEstimate(CITY.accra, CITY.tema).distanceKm;
    const mid = routeEstimate(CITY.accra, CITY.kumasi).distanceKm;
    const long = routeEstimate(CITY.accra, CITY.bolgatanga).distanceKm;
    expect(short).toBeLessThan(mid);
    expect(mid).toBeLessThan(long);
  });

  it('lands within 15% of real road distances', () => {
    // Accra–Tema ~25 km, Accra–Kumasi ~250 km, Accra–Tamale ~600 km.
    const within = (got, actual) => Math.abs(got - actual) / actual < 0.15;
    expect(within(routeEstimate(CITY.accra, CITY.tema).distanceKm, 25)).toBe(true);
    expect(within(routeEstimate(CITY.accra, CITY.kumasi).distanceKm, 250)).toBe(true);
    expect(within(routeEstimate(CITY.accra, CITY.tamale).distanceKm, 600)).toBe(true);
  });

  it('pads the great-circle distance for real roads', () => {
    // Straight-line Accra–Kumasi is about 199 km; the road is longer.
    expect(routeEstimate(CITY.accra, CITY.kumasi).distanceKm).toBeGreaterThan(200);
  });

  it('derives duration from distance, with time for boarding', () => {
    const { distanceKm, durationHours } = routeEstimate(CITY.accra, CITY.kumasi);
    expect(durationHours).toBeCloseTo(distanceKm / 55 + 1.5, 1);
  });

  it('never quotes less than the boarding allowance', () => {
    expect(routeEstimate(CITY.accra, CITY.tema).durationHours).toBeGreaterThan(1.5);
  });

  it('is symmetric', () => {
    expect(routeEstimate(CITY.accra, CITY.kumasi))
      .toEqual(routeEstimate(CITY.kumasi, CITY.accra));
  });
});

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
