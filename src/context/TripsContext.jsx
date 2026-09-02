import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { mapBooking } from '../services/api';
import { storage, KEYS } from '../services/storage';

const TripsContext = createContext(null);
export const useTrips = () => useContext(TripsContext);

export const TripsProvider = ({ children }) => {
  const { user, isAuthed } = useAuth();
  const [bookings, setBookings] = useState(() => storage.get(KEYS.bookings, []));
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!isAuthed || !user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        passengers:booking_passengers (*),
        trip:trip_id (
          *,
          operator:operator_id (*),
          busType:bus_type_id (*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
    }

    const mapped = (data || []).map(mapBooking);
    if (data && data.length > 0) {
      storage.set(KEYS.bookings, mapped);
    }
    setBookings(mapped.length > 0 ? mapped : bookings);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    fetchBookings().then(() => { if (!active) return; });
    return () => { active = false; };
  }, [user, isAuthed]);

  const value = useMemo(
    () => ({
      bookings,
      loading,
      refetch: fetchBookings,
      getBooking: (id) => bookings.find((b) => b.id === id),
      addBooking: (booking) => setBookings((list) => {
        const next = [booking, ...list];
        storage.set(KEYS.bookings, next);
        return next;
      }),
      cancelBooking: async (id) => {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', id);
        if (!error) {
          setBookings((list) => list.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)));
        }
      },
      markCheckedIn: async (id) => {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('bookings')
          .update({ checked_in_at: now })
          .eq('id', id);
        if (!error) {
          setBookings((list) => list.map((b) => (b.id === id ? { ...b, checkedInAt: b.checkedInAt || now } : b)));
        }
      },
      removeBooking: async (id) => {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (!error) {
          setBookings((list) => list.filter((b) => b.id !== id));
        }
      },
    }),
    [bookings, loading],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
};
