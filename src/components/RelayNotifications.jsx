import { useEffect } from 'react';
import { relay } from '../services/relay';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../context/ToastContext';

// App-level listener for relay events that should surface to THIS device as a
// toast — e.g. a driver checking in the passenger's ticket on another device.
// Renders nothing; only reacts to messages for bookings this device owns.
const RelayNotifications = () => {
  const { getBooking } = useTrips();
  const toast = useToast();

  useEffect(
    () =>
      relay.onMessage((m) => {
        if (m.type === 'ticket:checkedin' && m.bookingId && getBooking(m.bookingId)) {
          toast('Checked in — the driver has scanned your ticket. Safe travels!', 'success');
        }
      }),
    [getBooking, toast],
  );

  return null;
};

export default RelayNotifications;
