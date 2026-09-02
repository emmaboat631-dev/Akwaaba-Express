import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { BookingProvider, useBooking } from './BookingContext';

let hookResult;

const Consumer = () => {
  hookResult = useBooking();
  return null;
};

const setup = () => render(<BookingProvider><Consumer /></BookingProvider>);

describe('BookingContext', () => {
  beforeEach(() => {
    localStorage.clear();
    hookResult = null;
  });

  it('starts with empty draft', () => {
    setup();
    expect(hookResult.draft.type).toBeNull();
    expect(hookResult.draft.trip).toBeNull();
    expect(hookResult.draft.seats).toEqual([]);
    expect(hookResult.draft.passengers).toEqual([]);
    expect(hookResult.draft.payment).toBeNull();
  });

  it('startBooking sets trip and type', () => {
    setup();
    const trip = { id: 't1', type: 'scheduled', price: 100 };
    act(() => hookResult.startBooking(trip, 2));
    expect(hookResult.draft.trip).toEqual(trip);
    expect(hookResult.draft.type).toBe('scheduled');
    expect(hookResult.draft.pax).toBe(2);
  });

  it('setSeats updates seats', () => {
    setup();
    act(() => hookResult.setSeats([1, 2, 3]));
    expect(hookResult.draft.seats).toEqual([1, 2, 3]);
  });

  it('setPassengers updates passengers', () => {
    setup();
    const passengers = [{ name: 'Ama', phone: '0551234567' }];
    act(() => hookResult.setPassengers(passengers));
    expect(hookResult.draft.passengers).toEqual(passengers);
  });

  it('setPayment updates payment', () => {
    setup();
    const payment = { type: 'card', label: 'Visa' };
    act(() => hookResult.setPayment(payment));
    expect(hookResult.draft.payment).toEqual(payment);
  });

  it('reset clears the draft', () => {
    setup();
    act(() => hookResult.startBooking({ id: 't1', type: 'live' }));
    act(() => hookResult.setSeats([1]));
    act(() => hookResult.reset());
    expect(hookResult.draft.type).toBeNull();
    expect(hookResult.draft.trip).toBeNull();
    expect(hookResult.draft.seats).toEqual([]);
  });

  it('patchDraft merges fields', () => {
    setup();
    act(() => hookResult.patchDraft({ pax: 3 }));
    expect(hookResult.draft.pax).toBe(3);
  });

  it('persists draft to localStorage', () => {
    setup();
    act(() => hookResult.startBooking({ id: 't2', type: 'scheduled', price: 50 }));
    const stored = JSON.parse(localStorage.getItem('akwaaba:draft'));
    expect(stored.trip.id).toBe('t2');
  });

  it('restores draft from localStorage on mount', () => {
    const saved = { type: 'live', trip: { id: 'cached' }, pax: 1, seats: [5], passengers: [], payment: null };
    localStorage.setItem('akwaaba:draft', JSON.stringify(saved));
    setup();
    expect(hookResult.draft.trip.id).toBe('cached');
    expect(hookResult.draft.seats).toEqual([5]);
  });

  it('full booking lifecycle', () => {
    setup();
    const trip = { id: 'trip1', type: 'scheduled', price: 113 };
    act(() => hookResult.startBooking(trip, 2));
    act(() => hookResult.setSeats([10, 11]));
    act(() => hookResult.setPassengers([
      { name: 'Kofi', phone: '0241234567' },
      { name: 'Ama', phone: '0551234567' },
    ]));
    act(() => hookResult.setPayment({ type: 'card', label: 'Visa' }));

    expect(hookResult.draft.trip.id).toBe('trip1');
    expect(hookResult.draft.seats).toHaveLength(2);
    expect(hookResult.draft.passengers).toHaveLength(2);
    expect(hookResult.draft.payment.type).toBe('card');

    act(() => hookResult.reset());
    expect(hookResult.draft.trip).toBeNull();
  });
});
