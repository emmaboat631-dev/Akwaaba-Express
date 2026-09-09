import { describe, it, expect, vi } from 'vitest';

// The operators module queries Supabase on import; stub it so the fallback
// operator and bus-type lists stand.
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null }) }) }),
  },
}));

const { getNearbyBuses } = await import('./nearbyBuses');

const ACCRA = [5.6037, -0.187];
const KUMASI = [6.6885, -1.6244];

describe('getNearbyBuses', () => {
  it('returns between six and eight buses', () => {
    const buses = getNearbyBuses(ACCRA);
    expect(buses.length).toBeGreaterThanOrEqual(6);
    expect(buses.length).toBeLessThanOrEqual(8);
  });

  it('gives every bus the fields the card and map need', () => {
    getNearbyBuses(ACCRA).forEach((b) => {
      expect(typeof b.id).toBe('string');
      expect(b.type).toBe('live');
      expect(typeof b.operatorId).toBe('string');
      expect(typeof b.busTypeId).toBe('string');
      expect(typeof b.plate).toBe('string');
      expect(typeof b.destinationName).toBe('string');
      expect(typeof b.routeName).toBe('string');
      expect(typeof b.etaMin).toBe('number');
      expect(typeof b.seatsAvailable).toBe('number');
      expect(typeof b.pricePerSeat).toBe('number');
    });
  });

  it('names the route after the destination', () => {
    getNearbyBuses(ACCRA).forEach((b) => {
      expect(b.routeName).toBe(`To ${b.destinationName}`);
    });
  });

  it('gives every bus a unique id', () => {
    const ids = getNearbyBuses(ACCRA).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts by soonest arrival', () => {
    const etas = getNearbyBuses(ACCRA).map((b) => b.etaMin);
    expect([...etas].sort((a, b) => a - b)).toEqual(etas);
  });

  it('keeps every ETA at one minute or more', () => {
    getNearbyBuses(ACCRA).forEach((b) => expect(b.etaMin).toBeGreaterThanOrEqual(1));
  });

  it('sets a floor on the fare', () => {
    getNearbyBuses(ACCRA).forEach((b) => expect(b.pricePerSeat).toBeGreaterThanOrEqual(4));
  });

  it('routes each bus from its position to the user', () => {
    getNearbyBuses(ACCRA).forEach((b) => {
      expect(b.route).toHaveLength(2);
      expect(b.route[0]).toEqual(b.position);
      expect(b.route[1]).toEqual(ACCRA);
    });
  });

  it('places buses near the requested centre', () => {
    getNearbyBuses(ACCRA).forEach((b) => {
      expect(Math.abs(b.position[0] - ACCRA[0])).toBeLessThan(0.1);
      expect(Math.abs(b.position[1] - ACCRA[1])).toBeLessThan(0.1);
    });
  });

  it('never offers more seats than the bus holds', () => {
    getNearbyBuses(ACCRA).forEach((b) => {
      expect(b.seatsAvailable).toBeLessThanOrEqual(b.seatsTotal);
    });
  });

  it('is deterministic for the same location', () => {
    expect(getNearbyBuses(ACCRA)).toEqual(getNearbyBuses(ACCRA));
  });

  it('returns the cached array for a repeat call', () => {
    expect(getNearbyBuses(KUMASI)).toBe(getNearbyBuses(KUMASI));
  });

  it('regenerates for a different location', () => {
    const accra = getNearbyBuses(ACCRA);
    const kumasi = getNearbyBuses(KUMASI);
    expect(kumasi[0].position).not.toEqual(accra[0].position);
  });

  it('treats locations within the same rounded cell as one', () => {
    const a = getNearbyBuses([5.6037, -0.187]);
    const b = getNearbyBuses([5.6038, -0.1871]);
    expect(b).toEqual(a);
  });
});
