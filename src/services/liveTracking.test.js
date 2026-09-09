import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// liveTracking is a singleton driven by a setInterval, so each test gets a
// fresh module and fake timers.
const load = async () => {
  vi.resetModules();
  const { liveTracking } = await import('./liveTracking');
  return liveTracking;
};

describe('liveTracking', () => {
  let lt;

  beforeEach(async () => {
    vi.useFakeTimers();
    lt = await load();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('getBuses', () => {
    it('returns a non-empty fleet', () => {
      expect(lt.getBuses().length).toBeGreaterThan(0);
    });

    it('gives every bus the fields the map and list need', () => {
      lt.getBuses().forEach((b) => {
        expect(typeof b.id).toBe('string');
        expect(typeof b.operatorId).toBe('string');
        expect(typeof b.busTypeId).toBe('string');
        expect(Array.isArray(b.position)).toBe(true);
        expect(b.position).toHaveLength(2);
        expect(Array.isArray(b.route)).toBe(true);
        expect(typeof b.seatsAvailable).toBe('number');
      });
    });

    it('gives every bus a unique id', () => {
      const ids = lt.getBuses().map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getBus', () => {
    it('finds a bus by id', () => {
      const first = lt.getBuses()[0];
      expect(lt.getBus(first.id)).toBe(first);
    });

    it('returns undefined for an unknown id', () => {
      expect(lt.getBus('nope')).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('calls the listener immediately with the current fleet', () => {
      const cb = vi.fn();
      lt.subscribe(cb);
      expect(cb).toHaveBeenCalledWith(lt.getBuses());
    });

    it('notifies on each tick', () => {
      const cb = vi.fn();
      lt.subscribe(cb);
      vi.advanceTimersByTime(1500);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('stops notifying after cleanup', () => {
      const cb = vi.fn();
      const off = lt.subscribe(cb);
      off();
      vi.advanceTimersByTime(4500);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('supports multiple listeners', () => {
      const a = vi.fn();
      const b = vi.fn();
      lt.subscribe(a);
      lt.subscribe(b);
      vi.advanceTimersByTime(1500);
      expect(a).toHaveBeenCalledTimes(2);
      expect(b).toHaveBeenCalledTimes(2);
    });

    it('keeps ticking while one of two listeners remains', () => {
      const a = vi.fn();
      const b = vi.fn();
      const offA = lt.subscribe(a);
      lt.subscribe(b);
      offA();
      vi.advanceTimersByTime(1500);
      expect(b).toHaveBeenCalledTimes(2);
    });
  });

  describe('movement', () => {
    it('advances bus positions on a tick', () => {
      const before = lt.getBuses()[0].position;
      lt.subscribe(() => {});
      vi.advanceTimersByTime(1500);
      expect(lt.getBuses()[0].position).not.toEqual(before);
    });

    it('keeps every ETA at one minute or more', () => {
      lt.subscribe(() => {});
      vi.advanceTimersByTime(1500 * 5);
      lt.getBuses().forEach((b) => expect(b.etaMin).toBeGreaterThanOrEqual(1));
    });

    it('keeps buses on their route across many ticks', () => {
      lt.subscribe(() => {});
      vi.advanceTimersByTime(1500 * 40);
      lt.getBuses().forEach((b) => {
        expect(b.segIndex).toBeGreaterThanOrEqual(0);
        expect(b.segIndex).toBeLessThan(b.route.length);
        expect(Number.isFinite(b.position[0])).toBe(true);
        expect(Number.isFinite(b.position[1])).toBe(true);
      });
    });
  });

  describe('bookSeat', () => {
    it('decrements the seat count', () => {
      const bus = lt.getBuses()[0];
      const before = bus.seatsAvailable;
      lt.bookSeat(bus.id);
      expect(lt.getBus(bus.id).seatsAvailable).toBe(before - 1);
    });

    it('never goes below zero', () => {
      const bus = lt.getBuses()[0];
      for (let i = 0; i < bus.seatsAvailable + 5; i++) lt.bookSeat(bus.id);
      expect(lt.getBus(bus.id).seatsAvailable).toBe(0);
    });

    it('leaves other buses untouched', () => {
      const [first, second] = lt.getBuses();
      const before = second.seatsAvailable;
      lt.bookSeat(first.id);
      expect(lt.getBus(second.id).seatsAvailable).toBe(before);
    });

    it('notifies subscribers', () => {
      const cb = vi.fn();
      lt.subscribe(cb);
      lt.bookSeat(lt.getBuses()[0].id);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('is a no-op for an unknown id', () => {
      const before = lt.getBuses().map((b) => b.seatsAvailable);
      lt.bookSeat('nope');
      expect(lt.getBuses().map((b) => b.seatsAvailable)).toEqual(before);
    });
  });
});
