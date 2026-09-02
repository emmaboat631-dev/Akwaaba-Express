import { describe, it, expect } from 'vitest';
import { hashString, mulberry32, pick, range, intRange, uid } from './random';

describe('hashString', () => {
  it('returns a number', () => {
    expect(typeof hashString('test')).toBe('number');
  });

  it('is deterministic', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('differs for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('mulberry32', () => {
  it('returns values between 0 and 1', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic with same seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const rng = mulberry32(1);
    const arr = ['a', 'b', 'c'];
    const result = pick(rng, arr);
    expect(arr).toContain(result);
  });
});

describe('range', () => {
  it('returns values within min and max', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 50; i++) {
      const v = range(rng, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });
});

describe('intRange', () => {
  it('returns integers within min and max', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 50; i++) {
      const v = intRange(rng, 1, 5);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('uid', () => {
  it('starts with given prefix', () => {
    expect(uid('TXN').startsWith('TXN_')).toBe(true);
  });

  it('uses default prefix', () => {
    expect(uid().startsWith('id_')).toBe(true);
  });

  it('generates unique values', () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });
});
