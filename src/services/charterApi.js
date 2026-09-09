import { supabase } from '../lib/supabase';
import { uid } from '../utils/random';

const mapCharter = (row) => ({
  id: row.id,
  organiserId: row.organiser_id,
  status: row.status,
  pickupCityId: row.pickup_city_id,
  pickupAddress: row.pickup_address,
  destCityId: row.dest_city_id,
  destAddress: row.dest_address,
  departDate: row.depart_date,
  departTime: row.depart_time,
  returnDate: row.return_date,
  returnTime: row.return_time,
  isReturnTrip: row.is_return_trip,
  passengerCount: row.passenger_count,
  eventTypeId: row.event_type_id,
  groupName: row.group_name,
  specialRequests: row.special_requests,
  busTypeId: row.bus_type_id,
  operatorId: row.operator_id,
  driverId: row.driver_id,
  plate: row.plate,
  estimatedPrice: row.estimated_price ? Number(row.estimated_price) : null,
  quotedPrice: row.quoted_price ? Number(row.quoted_price) : null,
  depositAmount: row.deposit_amount ? Number(row.deposit_amount) : null,
  depositPaid: Number(row.deposit_paid || 0),
  balancePaid: Number(row.balance_paid || 0),
  paymentRef: row.payment_ref,
  depositRef: row.deposit_ref,
  balanceRef: row.balance_ref,
  charterRef: row.charter_ref,
  adminNotes: row.admin_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  passengers: (row.charter_passengers || []).map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    status: p.status,
    qrValue: p.qr_value,
    boardedAt: p.boarded_at,
  })),
});

export const charterApi = {
  async getEventTypes() {
    const { data, error } = await supabase
      .from('charter_event_types')
      .select('*')
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async getPricing() {
    const { data, error } = await supabase
      .from('charter_pricing')
      .select('*');
    if (error) throw error;
    return data || [];
  },

  estimatePrice(pricing, busTypeId, distanceKm, hours, isReturn) {
    const rate = pricing.find((p) => p.bus_type_id === busTypeId);
    if (!rate) return null;
    const base = Number(rate.charter_base);
    const dist = Number(rate.rate_per_km) * distanceKm;
    const time = Number(rate.rate_per_hour) * hours;
    const subtotal = base + dist + time;
    return Math.round(isReturn ? subtotal * 1.8 : subtotal);
  },

  async createCharter(draft, userId) {
    const charterRef = uid('CHR').toUpperCase();

    const { data, error } = await supabase
      .from('charters')
      .insert([{
        organiser_id: userId,
        pickup_city_id: draft.pickupCityId,
        pickup_address: draft.pickupAddress || '',
        dest_city_id: draft.destCityId,
        dest_address: draft.destAddress || '',
        depart_date: draft.departDate,
        depart_time: draft.departTime,
        return_date: draft.returnDate || null,
        return_time: draft.returnTime || null,
        is_return_trip: draft.isReturnTrip || false,
        passenger_count: draft.passengerCount,
        event_type_id: draft.eventTypeId,
        group_name: draft.groupName,
        special_requests: draft.specialRequests || '',
        bus_type_id: draft.busTypeId,
        estimated_price: draft.estimatedPrice || null,
        charter_ref: charterRef,
      }])
      .select()
      .single();

    if (error) throw error;
    return mapCharter(data);
  },

  async getMyCharters(userId) {
    const { data, error } = await supabase
      .from('charters')
      .select('*, charter_passengers(*)')
      .eq('organiser_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapCharter);
  },

  async getCharter(id) {
    const { data, error } = await supabase
      .from('charters')
      .select('*, charter_passengers(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data ? mapCharter(data) : null;
  },

  async addPassenger(charterId, passenger) {
    const qrValue = `${window.location.origin}/charter/${charterId}/ticket/${uid('CP')}`;
    const { data, error } = await supabase
      .from('charter_passengers')
      .insert([{
        charter_id: charterId,
        name: passenger.name,
        phone: passenger.phone || '',
        qr_value: qrValue,
      }])
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, name: data.name, phone: data.phone, status: data.status, qrValue: data.qr_value };
  },

  async removePassenger(passengerId) {
    const { error } = await supabase
      .from('charter_passengers')
      .delete()
      .eq('id', passengerId);
    if (error) throw error;
  },

  async updatePassengerStatus(passengerId, status) {
    const patch = { status };
    if (status === 'boarded') patch.boarded_at = new Date().toISOString();
    const { error } = await supabase
      .from('charter_passengers')
      .update(patch)
      .eq('id', passengerId);
    if (error) throw error;
  },

  async cancelCharter(id) {
    const { error } = await supabase
      .from('charters')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async recordDeposit(id, amount, ref) {
    const { error } = await supabase
      .from('charters')
      .update({
        deposit_paid: amount,
        deposit_ref: ref,
        status: 'deposit_paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async recordBalance(id, amount, ref) {
    const { error } = await supabase
      .from('charters')
      .update({
        balance_paid: amount,
        balance_ref: ref,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },
};

export const charterAdminApi = {
  async getCharters({ page = 0, pageSize = 15, status } = {}) {
    let q = supabase
      .from('charters')
      .select('*, charter_passengers(id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (status) q = q.eq('status', status);
    const { data, count, error } = await q;
    if (error) throw error;
    return { data: (data || []).map(mapCharter), total: count || 0 };
  },

  async getCharter(id) {
    const { data, error } = await supabase
      .from('charters')
      .select('*, charter_passengers(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data ? mapCharter(data) : null;
  },

  async updateCharter(id, updates) {
    const patch = { updated_at: new Date().toISOString() };
    if (updates.status) patch.status = updates.status;
    if (updates.quotedPrice !== undefined) patch.quoted_price = updates.quotedPrice;
    if (updates.depositAmount !== undefined) patch.deposit_amount = updates.depositAmount;
    if (updates.operatorId !== undefined) patch.operator_id = updates.operatorId;
    if (updates.driverId !== undefined) patch.driver_id = updates.driverId;
    if (updates.plate !== undefined) patch.plate = updates.plate;
    if (updates.adminNotes !== undefined) patch.admin_notes = updates.adminNotes;

    const { data, error } = await supabase
      .from('charters')
      .update(patch)
      .eq('id', id)
      .select('*, charter_passengers(*)')
      .single();
    if (error) throw error;
    return mapCharter(data);
  },

  async getDriverCharters(driverId) {
    const { data, error } = await supabase
      .from('charters')
      .select('*, charter_passengers(*)')
      .eq('driver_id', driverId)
      .in('status', ['confirmed', 'in_progress'])
      .order('depart_date', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapCharter);
  },
};
