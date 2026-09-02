import { describe, it, expect } from 'vitest';
import { formatCedi, formatMinutes, minutesToClock, isValidGhanaCard, initialsOf } from './format';

describe('formatCedi', () => {
  it('formats whole numbers with two decimals', () => {
    expect(formatCedi(100)).toMatch(/100\.00/);
  });

  it('formats zero', () => {
    expect(formatCedi(0)).toMatch(/0\.00/);
  });

  it('formats decimals', () => {
    expect(formatCedi(49.5)).toMatch(/49\.50/);
  });

  it('includes GH₵ prefix', () => {
    expect(formatCedi(10)).toContain('GH₵');
  });
});

describe('formatMinutes', () => {
  it('shows minutes only when under 60', () => {
    expect(formatMinutes(45)).toBe('45m');
  });

  it('shows hours only when exact', () => {
    expect(formatMinutes(120)).toBe('2h');
  });

  it('shows hours and minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
  });

  it('handles zero', () => {
    expect(formatMinutes(0)).toBe('0m');
  });
});

describe('minutesToClock', () => {
  it('converts 0 to 00:00', () => {
    expect(minutesToClock(0)).toBe('00:00');
  });

  it('converts 450 to 07:30', () => {
    expect(minutesToClock(450)).toBe('07:30');
  });

  it('converts 1439 to 23:59', () => {
    expect(minutesToClock(1439)).toBe('23:59');
  });

  it('wraps past midnight', () => {
    expect(minutesToClock(1500)).toBe('01:00');
  });

  it('handles negative values', () => {
    expect(minutesToClock(-60)).toBe('23:00');
  });
});

describe('isValidGhanaCard', () => {
  it('accepts valid format', () => {
    expect(isValidGhanaCard('GHA-123456789-0')).toBe(true);
  });

  it('accepts lowercase', () => {
    expect(isValidGhanaCard('gha-123456789-0')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidGhanaCard('GHA-12345-0')).toBe(false);
  });

  it('rejects missing prefix', () => {
    expect(isValidGhanaCard('123456789-0')).toBe(false);
  });

  it('returns true for empty string', () => {
    expect(isValidGhanaCard('')).toBe(true);
  });

  it('returns true for null/undefined', () => {
    expect(isValidGhanaCard(null)).toBe(true);
    expect(isValidGhanaCard(undefined)).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isValidGhanaCard('  GHA-123456789-0  ')).toBe(true);
  });
});

describe('initialsOf', () => {
  it('returns two initials for full name', () => {
    expect(initialsOf('Ama Mensah')).toBe('AM');
  });

  it('returns one initial for single name', () => {
    expect(initialsOf('Kwame')).toBe('K');
  });

  it('returns U for empty string', () => {
    expect(initialsOf('')).toBe('U');
  });

  it('handles three names (takes first two)', () => {
    expect(initialsOf('Kofi Adu Mensah')).toBe('KA');
  });

  it('uppercases lowercase names', () => {
    expect(initialsOf('ama mensah')).toBe('AM');
  });
});
