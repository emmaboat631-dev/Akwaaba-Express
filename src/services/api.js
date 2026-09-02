import { supabase } from '../lib/supabase';
import { liveTracking } from './liveTracking';
import { uid } from '../utils/random';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const mapTrip = (row) => ({
  id: row.id,
  type: 'scheduled',
  fromId: row.from_id,
  toId: row.to_id,
  dateISO: row.travel_date,
  operatorId: row.operator_id,
  busTypeId: row.bus_type_id,
  plate: row.plate,
  departMins: row.depart_mins,
  arriveMins: row.arrive_mins,
  durationMins: row.duration_mins,
  distanceKm: row.distance_km,
  price: row.price,
  seatsTotal: row.seats_total,
  amenities: row.busType?.amenities || row.bus_type?.amenities || [],
  operator: row.operator || row.bus_operator,
  busType: row.busType || row.bus_type,
});

// Maps a raw Supabase booking row to camelCase, including nested trip + passengers.
export const mapBooking = (row) => {
  const trip = row.trip ? mapTrip(row.trip) : null;
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id,
    type: row.type,
    status: row.status,
    seats: row.seats || [],
    amount: Number(row.amount),
    fee: Number(row.fee || 0),
    paymentLabel: row.payment_label,
    paymentRef: row.payment_ref,
    liveRoute: row.live_route,
    checkedInAt: row.checked_in_at,
    createdAt: row.created_at,
    qrValue: `https://akwaaba-express.app/t/${row.id}`,
    trip,
    passengers: (row.passengers || []).map((p) => ({
      name: p.name,
      phone: p.phone,
      idNo: p.id_no,
      seat: p.seat,
    })),
  };
};

export const api = {
  async searchTrips({ fromId, toId, dateISO }) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        operator:operator_id (*),
        busType:bus_type_id (*)
      `)
      .eq('from_id', fromId)
      .eq('to_id', toId)
      .eq('travel_date', dateISO)
      .order('depart_mins', { ascending: true });

    if (error) {
      console.error('Error fetching trips:', error);
      return [];
    }

    // For each trip, query actual booked seats so the seat map is real.
    const tripIds = data.map((t) => t.id);
    const { data: booked } = tripIds.length
      ? await supabase
          .from('bookings')
          .select('trip_id, seats')
          .in('trip_id', tripIds)
          .eq('status', 'confirmed')
      : { data: [] };

    const takenByTrip = {};
    (booked || []).forEach((b) => {
      if (!takenByTrip[b.trip_id]) takenByTrip[b.trip_id] = [];
      (b.seats || []).forEach((s) => {
        const n = typeof s === 'string' ? parseInt(s, 10) : s;
        if (!isNaN(n) && !takenByTrip[b.trip_id].includes(n)) takenByTrip[b.trip_id].push(n);
      });
    });

    return data.map((trip) => {
      const mapped = mapTrip(trip);
      const seatsTaken = takenByTrip[trip.id] || [];
      return {
        ...mapped,
        seatsTaken,
        seatsAvailable: mapped.seatsTotal - seatsTaken.length,
      };
    });
  },

  async getTrip(tripId) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        operator:operator_id (*),
        busType:bus_type_id (*)
      `)
      .eq('id', tripId)
      .single();

    if (error || !data) {
      console.error('Error fetching trip:', error);
      return null;
    }

    // Real booked seats for this trip.
    const { data: booked } = await supabase
      .from('bookings')
      .select('seats')
      .eq('trip_id', tripId)
      .eq('status', 'confirmed');

    const seatsTaken = [];
    (booked || []).forEach((b) => {
      (b.seats || []).forEach((s) => {
        const n = typeof s === 'string' ? parseInt(s, 10) : s;
        if (!isNaN(n) && !seatsTaken.includes(n)) seatsTaken.push(n);
      });
    });

    const mapped = mapTrip(data);
    return {
      ...mapped,
      seatsTaken,
      seatsAvailable: mapped.seatsTotal - seatsTaken.length,
    };
  },

  async getLiveBuses() {
    await delay(500);
    return liveTracking.getBuses();
  },

  async pay({ amount, method }) {
    await delay(1600);
    if (!method) throw new Error('No payment method selected');
    return { reference: uid('TXN').toUpperCase(), amount, method, status: 'paid' };
  },

  async createBooking(draft, userId) {
    if (draft?.type === 'live' && draft?.trip?.id) {
      liveTracking.bookSeat(draft.trip.id);
      const id = uid('AE').toUpperCase();
      return {
        ...draft,
        id,
        status: 'confirmed',
        qrValue: `https://akwaaba-express.app/t/${id}`,
        createdAt: new Date().toISOString(),
      };
    }

    if (!userId) {
      throw new Error("Must be logged in to book a scheduled trip");
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        user_id: userId,
        trip_id: draft.trip.id,
        type: 'scheduled',
        status: 'confirmed',
        seats: draft.seats,
        amount: draft.breakdown.total,
        fee: draft.breakdown.fee,
        payment_label: draft.paymentMethod?.label,
        payment_ref: uid('TXN').toUpperCase()
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    const passengersToInsert = draft.passengers.map(p => ({
      booking_id: booking.id,
      name: p.name,
      phone: p.phone,
      id_no: p.idNo,
      seat: p.seat
    }));

    const { error: passengersError } = await supabase
      .from('booking_passengers')
      .insert(passengersToInsert);

    if (passengersError) throw passengersError;

    return {
      ...draft,
      id: booking.id,
      status: 'confirmed',
      qrValue: `https://akwaaba-express.app/t/${booking.id}`,
      createdAt: booking.created_at,
    };
  },
};
