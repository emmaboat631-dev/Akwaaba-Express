import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const load = async () => {
  vi.resetModules();
  return import('./driverHail');
};

const POS = [5.6037, -0.187];

describe('driverHail', () => {
  let driverHail;
  let REQUEST_TTL_MS;

  beforeEach(async () => {
    vi.useFakeTimers();
    ({ driverHail, REQUEST_TTL_MS } = await load());
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts offline with nothing pending', () => {
      expect(driverHail.getState()).toEqual({ online: false, requests: [], activeRequest: null });
    });
  });

  describe('goOnline', () => {
    it('marks the driver online', () => {
      driverHail.goOnline(POS);
      expect(driverHail.getState().online).toBe(true);
    });

    it('notifies subscribers', () => {
      const cb = vi.fn();
      driverHail.subscribe(cb);
      driverHail.goOnline(POS);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('spawns a request while online and idle', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // below SPAWN_CHANCE
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
      expect(driverHail.getState().requests).toHaveLength(1);
    });

    it('does not spawn when the dice roll fails', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // above SPAWN_CHANCE
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
      expect(driverHail.getState().requests).toHaveLength(0);
    });

    it('does not spawn a second request while one is pending', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000 * 3);
      expect(driverHail.getState().requests).toHaveLength(1);
    });
  });

  describe('spawned request shape', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
    });

    it('carries the fields the overlay renders', () => {
      const [req] = driverHail.getState().requests;
      expect(typeof req.id).toBe('string');
      expect(typeof req.passengerName).toBe('string');
      expect(typeof req.destinationName).toBe('string');
      expect(typeof req.distanceKm).toBe('number');
      expect(typeof req.fareEstimate).toBe('number');
    });

    it('places the pickup as a lat/lng pair', () => {
      const [req] = driverHail.getState().requests;
      expect(req.pickup).toHaveLength(2);
      expect(Number.isFinite(req.pickup[0])).toBe(true);
      expect(Number.isFinite(req.pickup[1])).toBe(true);
    });

    it('expires one TTL into the future', () => {
      const [req] = driverHail.getState().requests;
      expect(req.expiresAt).toBeGreaterThan(Date.now());
      expect(req.expiresAt - Date.now()).toBeLessThanOrEqual(REQUEST_TTL_MS);
    });
  });

  describe('goOffline', () => {
    it('clears online state and pending requests', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
      driverHail.goOffline();
      expect(driverHail.getState().online).toBe(false);
      expect(driverHail.getState().requests).toEqual([]);
    });

    it('stops spawning', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      driverHail.goOffline();
      vi.advanceTimersByTime(5000 * 3);
      expect(driverHail.getState().requests).toHaveLength(0);
    });
  });

  describe('accept', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
    });

    it('promotes the request to active', () => {
      const [req] = driverHail.getState().requests;
      driverHail.accept(req.id);
      expect(driverHail.getState().activeRequest.id).toBe(req.id);
    });

    it('clears the pending queue', () => {
      driverHail.accept(driverHail.getState().requests[0].id);
      expect(driverHail.getState().requests).toEqual([]);
    });

    it('keeps the current active request for an unknown id', () => {
      driverHail.accept('nope');
      expect(driverHail.getState().activeRequest).toBeNull();
    });
  });

  describe('decline', () => {
    it('removes the request from the queue', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
      const [req] = driverHail.getState().requests;
      driverHail.decline(req.id);
      expect(driverHail.getState().requests).toEqual([]);
    });

    it('leaves no active request behind', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
      driverHail.decline(driverHail.getState().requests[0].id);
      expect(driverHail.getState().activeRequest).toBeNull();
    });

    it('is a no-op for an unknown id', () => {
      expect(() => driverHail.decline('nope')).not.toThrow();
    });
  });

  describe('completeActive', () => {
    it('clears the active request', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      driverHail.goOnline(POS);
      vi.advanceTimersByTime(5000);
      driverHail.accept(driverHail.getState().requests[0].id);
      driverHail.completeActive();
      expect(driverHail.getState().activeRequest).toBeNull();
    });

    it('notifies subscribers', () => {
      const cb = vi.fn();
      driverHail.subscribe(cb);
      driverHail.completeActive();
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribe', () => {
    it('calls the listener immediately with current state', () => {
      const cb = vi.fn();
      driverHail.subscribe(cb);
      expect(cb).toHaveBeenCalledWith({ online: false, requests: [], activeRequest: null });
    });

    it('stops notifying after cleanup', () => {
      const cb = vi.fn();
      const off = driverHail.subscribe(cb);
      off();
      driverHail.goOnline(POS);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
