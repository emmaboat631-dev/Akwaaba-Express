import { describe, it, expect } from 'vitest';
import { haversineKm, lerpPoint, routeLengthKm } from './geo';

describe('haversineKm', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm([5.6, -0.19], [5.6, -0.19])).toBe(0);
  });

  it('calculates Accra to Kumasi (~200km)', () => {
    const d = haversineKm([5.6037, -0.187], [6.6885, -1.6244]);
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(220);
  });

  it('is symmetric', () => {
    const a = [5.6, -0.19];
    const b = [6.7, -1.6];
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 5);
  });
});

describe('lerpPoint', () => {
  it('returns start at t=0', () => {
    expect(lerpPoint([0, 0], [10, 10], 0)).toEqual([0, 0]);
  });

  it('returns end at t=1', () => {
    expect(lerpPoint([0, 0], [10, 10], 1)).toEqual([10, 10]);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerpPoint([0, 0], [10, 10], 0.5)).toEqual([5, 5]);
  });

  it('interpolates correctly at t=0.25', () => {
    expect(lerpPoint([0, 0], [100, 200], 0.25)).toEqual([25, 50]);
  });
});

describe('routeLengthKm', () => {
  it('returns 0 for single point', () => {
    expect(routeLengthKm([[5.6, -0.19]])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(routeLengthKm([])).toBe(0);
  });

  it('sums segment distances', () => {
    const points = [[0, 0], [1, 0], [1, 1]];
    const total = routeLengthKm(points);
    const seg1 = haversineKm([0, 0], [1, 0]);
    const seg2 = haversineKm([1, 0], [1, 1]);
    expect(total).toBeCloseTo(seg1 + seg2, 5);
  });
});
