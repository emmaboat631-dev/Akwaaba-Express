import { describe, it, expect } from 'vitest';
import { mapBooking } from './api';

describe('mapBooking integration', () => {
  it('maps a full booking with trip and passengers end-to-end', () => {
    const row = {
      id: 'booking-uuid-1',
      user_id: 'user-uuid-1',
      trip_id: 'trip-uuid-1',
      type: 'scheduled',
      status: 'confirmed',
      seats: [10, 11],
      amount: '228.00',
      fee: '4.00',
      payment_label: 'Paystack (Card)',
      payment_ref: 'TXN_ABC123',
      live_route: null,
      checked_in_at: null,
      created_at: '2026-09-01T14:30:00Z',
      trip: {
        id: 'trip-uuid-1',
        from_id: 'accra',
        to_id: 'kumasi',
        travel_date: '2026-09-02',
        operator_id: 'vip',
        bus_type_id: 'standard',
        plate: 'GR 4932-10',
        depart_mins: 450,
        arrive_mins: 739,
        duration_mins: 289,
        distance_km: 250,
        price: 113,
        seats_total: 44,
        operator: { id: 'vip', name: 'VIP Jeoun' },
        busType: { id: 'standard', name: 'Standard Coach' },
      },
      passengers: [
        { name: 'Kofi Adu', phone: '0241234567', id_no: 'GHA-123456789-0', seat: 10 },
        { name: 'Ama Mensah', phone: '0551234567', id_no: null, seat: 11 },
      ],
    };

    const booking = mapBooking(row);

    expect(booking.id).toBe('booking-uuid-1');
    expect(booking.status).toBe('confirmed');
    expect(booking.amount).toBe(228);
    expect(booking.fee).toBe(4);
    expect(booking.seats).toEqual([10, 11]);

    expect(booking.trip).not.toBeNull();
    expect(booking.trip.fromId).toBe('accra');
    expect(booking.trip.toId).toBe('kumasi');
    expect(booking.trip.price).toBe(113);
    expect(booking.trip.plate).toBe('GR 4932-10');
    expect(booking.trip.departMins).toBe(450);
    expect(booking.trip.distanceKm).toBe(250);

    expect(booking.passengers).toHaveLength(2);
    expect(booking.passengers[0].name).toBe('Kofi Adu');
    expect(booking.passengers[0].idNo).toBe('GHA-123456789-0');
    expect(booking.passengers[0].seat).toBe(10);
    expect(booking.passengers[1].name).toBe('Ama Mensah');
    expect(booking.passengers[1].idNo).toBeNull();

    expect(booking.qrValue).toContain('booking-uuid-1');
    expect(booking.createdAt).toBe('2026-09-01T14:30:00Z');
  });

  it('handles live booking without trip', () => {
    const row = {
      id: 'live-booking-1',
      user_id: 'user-uuid-2',
      trip_id: null,
      type: 'live',
      status: 'confirmed',
      seats: [],
      amount: '35.00',
      fee: '2.00',
      payment_label: 'MTN MoMo',
      payment_ref: 'TXN_LIVE1',
      live_route: 'Accra Central → Madina',
      checked_in_at: '2026-09-01T15:00:00Z',
      created_at: '2026-09-01T14:45:00Z',
      trip: null,
      passengers: [{ name: 'Kwame Asante', phone: '0201234567', id_no: null, seat: null }],
    };

    const booking = mapBooking(row);

    expect(booking.type).toBe('live');
    expect(booking.trip).toBeNull();
    expect(booking.liveRoute).toBe('Accra Central → Madina');
    expect(booking.checkedInAt).toBe('2026-09-01T15:00:00Z');
    expect(booking.passengers[0].name).toBe('Kwame Asante');
  });

  it('handles cancelled booking', () => {
    const row = {
      id: 'cancelled-1',
      user_id: 'user-uuid-3',
      trip_id: 'trip-uuid-2',
      type: 'scheduled',
      status: 'cancelled',
      seats: [5],
      amount: '113.00',
      fee: '2.00',
      payment_label: 'Visa',
      payment_ref: 'TXN_CANCEL1',
      live_route: null,
      checked_in_at: null,
      created_at: '2026-08-30T09:00:00Z',
      trip: null,
      passengers: [],
    };

    const booking = mapBooking(row);
    expect(booking.status).toBe('cancelled');
    expect(booking.amount).toBe(113);
  });
});
