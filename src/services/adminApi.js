import { supabase } from '../lib/supabase';

export const adminApi = {
  async getStats() {
    const [users, bookings, trips] = await Promise.all([
      supabase.from('profiles').select('id, role', { count: 'exact', head: true }),
      supabase.from('bookings').select('id, amount, status', { count: 'exact' }),
      supabase.from('trips').select('id, status', { count: 'exact', head: true }),
    ]);

    const bookingRows = bookings.data || [];
    const revenue = bookingRows
      .filter((b) => b.status === 'confirmed')
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    return {
      totalUsers: users.count || 0,
      totalBookings: bookings.count || 0,
      totalTrips: trips.count || 0,
      revenue,
    };
  },

  async getUsers({ page = 0, pageSize = 20, role } = {}) {
    let q = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (role) q = q.eq('role', role);
    const { data, count, error } = await q;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  async getBookings({ page = 0, pageSize = 20, status } = {}) {
    let q = supabase
      .from('bookings')
      .select(`
        *,
        trip:trip_id (
          id, from_id, to_id, travel_date, depart_mins,
          operator:operator_id (name),
          busType:bus_type_id (name)
        ),
        passengers:booking_passengers (name, seat)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (status) q = q.eq('status', status);
    const { data, count, error } = await q;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  async getTrips({ page = 0, pageSize = 20, status } = {}) {
    let q = supabase
      .from('trips')
      .select(`
        *,
        operator:operator_id (id, name, mark, color),
        busType:bus_type_id (id, name, seats)
      `, { count: 'exact' })
      .order('travel_date', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (status) q = q.eq('status', status);
    const { data, count, error } = await q;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  async updateBookingStatus(id, status) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTripStatus(id, status) {
    const { data, error } = await supabase
      .from('trips')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDriverVerifications({ page = 0, pageSize = 20, status } = {}) {
    let q = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'driver')
      .order('updated_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (status) q = q.eq('verification_status', status);
    const { data, count, error } = await q;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  async getTodayTrips() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        operator:operator_id (id, name, mark, color),
        busType:bus_type_id (id, name, seats)
      `)
      .eq('travel_date', today)
      .order('depart_mins', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getDailyRevenue(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('bookings')
      .select('amount, status, created_at')
      .eq('status', 'confirmed')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });
    if (error) throw error;

    const byDay = {};
    (data || []).forEach((b) => {
      const day = b.created_at.split('T')[0];
      byDay[day] = (byDay[day] || 0) + Number(b.amount || 0);
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, label: d.toLocaleDateString('en', { weekday: 'short' }), revenue: byDay[key] || 0 });
    }
    return result;
  },

  async getOnlineDriverCount() {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'driver')
      .eq('verification_status', 'verified');
    if (error) throw error;
    return count || 0;
  },

  async getTopRoutes(limit = 5) {
    const { data, error } = await supabase
      .from('bookings')
      .select('amount, status, trip:trip_id (from_id, to_id)')
      .eq('status', 'confirmed');
    if (error) throw error;

    const routes = {};
    (data || []).forEach((b) => {
      if (!b.trip) return;
      const key = `${b.trip.from_id}→${b.trip.to_id}`;
      if (!routes[key]) routes[key] = { fromId: b.trip.from_id, toId: b.trip.to_id, bookings: 0, revenue: 0 };
      routes[key].bookings += 1;
      routes[key].revenue += Number(b.amount || 0);
    });

    return Object.values(routes)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, limit);
  },

  async getRevenueTrend() {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    const { data, error } = await supabase
      .from('bookings')
      .select('amount, created_at')
      .eq('status', 'confirmed')
      .gte('created_at', lastWeekStart.toISOString());
    if (error) throw error;

    let thisWeek = 0, lastWeek = 0;
    (data || []).forEach((b) => {
      const d = new Date(b.created_at);
      if (d >= thisWeekStart) thisWeek += Number(b.amount || 0);
      else lastWeek += Number(b.amount || 0);
    });

    const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;
    return { thisWeek, lastWeek, trend };
  },

  async getUserTrend() {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    const { data, error } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', lastWeekStart.toISOString());
    if (error) throw error;

    let thisWeek = 0, lastWeek = 0;
    (data || []).forEach((p) => {
      const d = new Date(p.created_at);
      if (d >= thisWeekStart) thisWeek++;
      else lastWeek++;
    });

    const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;
    return { thisWeek, lastWeek, trend };
  },

  async getBookingTrend() {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    const { data, error } = await supabase
      .from('bookings')
      .select('created_at')
      .gte('created_at', lastWeekStart.toISOString());
    if (error) throw error;

    let thisWeek = 0, lastWeek = 0;
    (data || []).forEach((b) => {
      const d = new Date(b.created_at);
      if (d >= thisWeekStart) thisWeek++;
      else lastWeek++;
    });

    const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;
    return { thisWeek, lastWeek, trend };
  },

  async updateVerificationStatus(id, status, reason) {
    const patch = { verification_status: status };
    if (reason) patch.verification_note = reason;
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
