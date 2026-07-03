import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage, KEYS } from '../services/storage';

// Confirmed bookings ("My Trips"), persisted to localStorage.

const TripsContext = createContext(null);
export const useTrips = () => useContext(TripsContext);

export const TripsProvider = ({ children }) => {
  const [bookings, setBookings] = useState(() => storage.get(KEYS.trips, []));

  useEffect(() => {
    storage.set(KEYS.trips, bookings);
  }, [bookings]);

  const value = useMemo(
    () => ({
      bookings,
      getBooking: (id) => bookings.find((b) => b.id === id),
      addBooking: (booking) => setBookings((list) => [booking, ...list]),
      cancelBooking: (id) =>
        setBookings((list) =>
          list.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
        ),
      removeBooking: (id) => setBookings((list) => list.filter((b) => b.id !== id)),
    }),
    [bookings],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
};
