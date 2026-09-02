import { describe, it, expect, beforeEach } from 'vitest';
import { storage, KEYS } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('get', () => {
    it('returns fallback when key does not exist', () => {
      expect(storage.get('missing', 'default')).toBe('default');
    });

    it('returns null as default fallback', () => {
      expect(storage.get('missing')).toBeNull();
    });

    it('returns stored value', () => {
      localStorage.setItem('akwaaba:test', JSON.stringify({ a: 1 }));
      expect(storage.get('test')).toEqual({ a: 1 });
    });

    it('returns fallback for invalid JSON', () => {
      localStorage.setItem('akwaaba:bad', '{invalid');
      expect(storage.get('bad', 'safe')).toBe('safe');
    });
  });

  describe('set', () => {
    it('stores value as JSON', () => {
      storage.set('key', [1, 2, 3]);
      expect(JSON.parse(localStorage.getItem('akwaaba:key'))).toEqual([1, 2, 3]);
    });

    it('stores strings', () => {
      storage.set('s', 'hello');
      expect(storage.get('s')).toBe('hello');
    });

    it('overwrites existing value', () => {
      storage.set('x', 1);
      storage.set('x', 2);
      expect(storage.get('x')).toBe(2);
    });
  });

  describe('KEYS', () => {
    it('has expected keys', () => {
      expect(KEYS.recentSearches).toBe('recentSearches');
      expect(KEYS.draft).toBe('draft');
      expect(KEYS.theme).toBe('theme');
      expect(KEYS.driver).toBe('driver');
      expect(KEYS.bookings).toBe('bookings');
    });
  });
});
