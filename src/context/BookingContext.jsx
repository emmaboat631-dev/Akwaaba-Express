import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage, KEYS } from '../services/storage';

// Holds the in-progress booking draft (selected trip, seats, passengers,
// payment) shared across the multi-step flow. Persisted so a refresh mid-flow
// doesn't lose the user's progress.

const BookingContext = createContext(null);
export const useBooking = () => useContext(BookingContext);

const EMPTY = { type: null, trip: null, pax: 1, seats: [], passengers: [], payment: null };

export const BookingProvider = ({ children }) => {
  const [draft, setDraft] = useState(() => storage.get(KEYS.draft, EMPTY));

  useEffect(() => {
    storage.set(KEYS.draft, draft);
  }, [draft]);

  const value = useMemo(
    () => ({
      draft,
      // Begin a booking from a chosen trip (live or scheduled).
      startBooking: (trip, pax = 1) =>
        setDraft({ ...EMPTY, type: trip.type, trip, pax }),
      setSeats: (seats) => setDraft((d) => ({ ...d, seats })),
      setPassengers: (passengers) => setDraft((d) => ({ ...d, passengers })),
      setPayment: (payment) => setDraft((d) => ({ ...d, payment })),
      patchDraft: (patch) => setDraft((d) => ({ ...d, ...patch })),
      reset: () => setDraft(EMPTY),
    }),
    [draft],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};
