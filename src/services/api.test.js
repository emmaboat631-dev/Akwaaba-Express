import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapBooking } from './api';

describe('mapBooking', () => {
  it('maps snake_case row to camelCase', () => {
    const row = {
      id: 'b1',
      user_id: 'u1',
      trip_id: 't1',
      type: 'scheduled',
      status: 'confirmed',
      seats: [1, 2],
      amount: '115.00',
      fee: '2.00',
      payment_label: 'Visa',
      payment_ref: 'TXN_123',
      live_route: null,
      checked_in_at: null,
      created_at: '2026-08-01T10:00:00Z',
      trip: null,
      passengers: [],
    };
    const result = mapBooking(row);
    expect(result.id).toBe('b1');
    expect(result.userId).toBe('u1');
    expect(result.tripId).toBe('t1');
    expect(result.amount).toBe(115);
    expect(result.fee).toBe(2);
    expect(result.paymentLabel).toBe('Visa');
    expect(result.paymentRef).toBe('TXN_123');
    expect(result.qrValue).toContain('b1');
  });

  it('maps nested passengers', () => {
    const row = {
      id: 'b2',
      user_id: 'u1',
      trip_id: 't1',
      type: 'scheduled',
      status: 'confirmed',
      seats: [5],
      amount: '50',
      fee: '2',
      payment_label: 'MoMo',
      payment_ref: 'TXN_456',
      live_route: null,
      checked_in_at: null,
      created_at: '2026-08-01T10:00:00Z',
      trip: null,
      passengers: [
        { name: 'Kofi Mensah', phone: '0241234567', id_no: 'GHA-123456789-0', seat: 5 },
      ],
    };
    const result = mapBooking(row);
    expect(result.passengers).toHaveLength(1);
    expect(result.passengers[0].name).toBe('Kofi Mensah');
    expect(result.passengers[0].idNo).toBe('GHA-123456789-0');
    expect(result.passengers[0].seat).toBe(5);
  });

  it('handles missing trip gracefully', () => {
    const row = {
      id: 'b3',
      user_id: 'u1',
      trip_id: null,
      type: 'live',
      status: 'confirmed',
      seats: [],
      amount: '30',
      fee: '2',
      payment_label: 'Card',
      payment_ref: 'TXN_789',
      live_route: 'Accra → Tema',
      checked_in_at: null,
      created_at: '2026-08-01T10:00:00Z',
      trip: null,
      passengers: [],
    };
    const result = mapBooking(row);
    expect(result.trip).toBeNull();
    expect(result.liveRoute).toBe('Accra → Tema');
  });
});
