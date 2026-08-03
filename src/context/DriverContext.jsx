import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage, KEYS } from '../services/storage';
import { todayISO } from '../data/driverTrips';

// Driver-side persisted state: today's assigned-trip progress, completed
// trips + earnings ledger, and the overview stats (km, acceptance rate,
// online hours, day-by-day history). Mirrors BookingContext/TripsContext's
// persist-on-change shape.

const DriverContext = createContext(null);
export const useDriver = () => useContext(DriverContext);

const EMPTY = {
  mode: 'live', // 'live' (accepting live hails) | 'scheduled' (on a fixed trip, no live pop-ups)
  liveDestinationId: null, // where the driver is heading while on live
  assignedTripId: null,
  assignedTripStatus: 'scheduled', // 'scheduled' | 'in-progress' | 'completed'
  completedTrips: [],
  earningsLedger: [],
  totalKm: 0,
  acceptedCount: 0,
  declinedCount: 0,
  onlineSince: null,
  onlineSecondsToday: 0,
  lastActiveDateISO: null,
  dailyHistory: [], // [{ dateISO, earnings, km, trips }], most recent first
};

export const DriverProvider = ({ children }) => {
  const [state, setState] = useState(() => storage.get(KEYS.driver, EMPTY));

  useEffect(() => {
    storage.set(KEYS.driver, state);
  }, [state]);

  const value = useMemo(
    () => ({
      ...state,

      // A trip's status only applies to that exact trip id — once the
      // calendar date rolls over, generateAssignedTrip() produces a
      // different trip id, so an old 'completed' flag doesn't leak onto it.
      getAssignedStatus: (tripId) => (state.assignedTripId === tripId ? state.assignedTripStatus : 'scheduled'),

      // Archives yesterday's totals into dailyHistory and resets today's
      // online-time counter the first time this fires on a new day. Call on
      // the Dashboard's mount.
      rollDayIfNeeded: () =>
        setState((s) => {
          const today = todayISO();
          if (s.lastActiveDateISO === today) return s;
          const yesterdaysTrips = s.lastActiveDateISO
            ? s.completedTrips.filter((t) => t.date.slice(0, 10) === s.lastActiveDateISO)
            : [];
          const dailyHistory = s.lastActiveDateISO
            ? [
                {
                  dateISO: s.lastActiveDateISO,
                  earnings: yesterdaysTrips.reduce((sum, t) => sum + t.amount, 0),
                  km: yesterdaysTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0),
                  trips: yesterdaysTrips.length,
                },
                ...s.dailyHistory,
              ].slice(0, 14)
            : s.dailyHistory;
          return { ...s, lastActiveDateISO: today, onlineSecondsToday: 0, dailyHistory };
        }),

      startTrip: (tripId) => setState((s) => ({ ...s, assignedTripId: tripId, assignedTripStatus: 'in-progress' })),

      completeTrip: (trip) =>
        setState((s) => {
          const entry = { id: trip.id, type: 'scheduled', amount: trip.earningsAmount, distanceKm: trip.distanceKm, date: new Date().toISOString() };
          return {
            ...s,
            assignedTripId: trip.id,
            assignedTripStatus: 'completed',
            completedTrips: [entry, ...s.completedTrips],
            earningsLedger: [entry, ...s.earningsLedger],
            totalKm: s.totalKm + (trip.distanceKm || 0),
          };
        }),

      completeHail: (request) =>
        setState((s) => {
          const entry = { id: request.id, type: 'live', amount: request.fareEstimate, distanceKm: request.distanceKm, date: new Date().toISOString() };
          return {
            ...s,
            completedTrips: [entry, ...s.completedTrips],
            earningsLedger: [entry, ...s.earningsLedger],
            totalKm: s.totalKm + (request.distanceKm || 0),
          };
        }),

      recordAccept: () => setState((s) => ({ ...s, acceptedCount: s.acceptedCount + 1 })),
      recordDecline: () => setState((s) => ({ ...s, declinedCount: s.declinedCount + 1 })),

      setMode: (mode) => setState((s) => ({ ...s, mode })),
      setLiveDestination: (liveDestinationId) => setState((s) => ({ ...s, liveDestinationId })),

      // Tracks time spent online today — called when the dashboard's toggle flips.
      setOnline: (isOnline) =>
        setState((s) => {
          if (isOnline) return { ...s, onlineSince: Date.now() };
          if (!s.onlineSince) return s;
          const elapsed = Math.round((Date.now() - s.onlineSince) / 1000);
          return { ...s, onlineSince: null, onlineSecondsToday: s.onlineSecondsToday + elapsed };
        }),
    }),
    [state],
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
};
