// Mock async "backend". Returns promises with small delays so the UI exercises
// real loading states. Swap these for fetch() calls to wire a real API later.

import { generateTrips, findTripById } from '../data/scheduledTrips';
import { liveTracking } from './liveTracking';
import { uid } from '../utils/random';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async searchTrips({ fromId, toId, dateISO }) {
    await delay(650);
    return generateTrips(fromId, toId, dateISO);
  },

  async getTrip(tripId) {
    await delay(300);
    return findTripById(tripId);
  },

  async getLiveBuses() {
    await delay(500);
    return liveTracking.getBuses();
  },

  // Simulate a mobile-money / card charge.
  async pay({ amount, method }) {
    await delay(1600);
    if (!method) throw new Error('No payment method selected');
    return { reference: uid('TXN').toUpperCase(), amount, method, status: 'paid' };
  },

  async createBooking(draft) {
    await delay(500);
    const id = uid('AE').toUpperCase();
    if (draft?.type === 'live' && draft?.trip?.id) {
      liveTracking.bookSeat(draft.trip.id);
    }
    return {
      ...draft,
      id,
      status: 'confirmed',
      qrValue: `https://akwaaba-express.app/t/${id}`,
      createdAt: new Date().toISOString(),
    };
  },
};
