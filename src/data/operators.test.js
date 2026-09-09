import { describe, it, expect, vi } from 'vitest';

// operators.js queries Supabase on import; stub it so the fallback data stands.
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null }) }) }),
  },
}));

const { OPERATORS, BUS_TYPES, operatorById, busTypeById, FARE } = await import('./operators');

describe('OPERATORS', () => {
  it('is a non-empty list', () => {
    expect(OPERATORS.length).toBeGreaterThan(0);
  });

  it('gives every operator an id, name, mark, colour and rating', () => {
    OPERATORS.forEach((o) => {
      expect(typeof o.id).toBe('string');
      expect(typeof o.name).toBe('string');
      expect(typeof o.mark).toBe('string');
      expect(o.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(typeof o.rating).toBe('number');
    });
  });

  it('keeps ratings within a 0-5 scale', () => {
    OPERATORS.forEach((o) => {
      expect(o.rating).toBeGreaterThanOrEqual(0);
      expect(o.rating).toBeLessThanOrEqual(5);
    });
  });

  it('has unique ids', () => {
    const ids = OPERATORS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('operatorById', () => {
  it('returns the operator for a known id', () => {
    const stc = operatorById('stc');
    expect(stc).toBeDefined();
    expect(stc.name).toBe('STC Intercity');
  });

  it('returns undefined for an unknown id', () => {
    expect(operatorById('nope')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(operatorById(null)).toBeUndefined();
  });

  it('resolves every id in the list', () => {
    OPERATORS.forEach((o) => expect(operatorById(o.id)).toBe(o));
  });
});

describe('BUS_TYPES', () => {
  it('is a non-empty list', () => {
    expect(BUS_TYPES.length).toBeGreaterThan(0);
  });

  it('gives every type a numeric priceMult and seat count', () => {
    BUS_TYPES.forEach((b) => {
      expect(typeof b.priceMult).toBe('number');
      expect(b.priceMult).toBeGreaterThan(0);
      expect(typeof b.seats).toBe('number');
      expect(b.seats).toBeGreaterThan(0);
    });
  });

  it('describes a seat layout as a two-column split', () => {
    BUS_TYPES.forEach((b) => {
      expect(Array.isArray(b.cols)).toBe(true);
      expect(b.cols).toHaveLength(2);
      b.cols.forEach((n) => expect(typeof n).toBe('number'));
    });
  });

  it('lists at least one amenity per type', () => {
    BUS_TYPES.forEach((b) => {
      expect(Array.isArray(b.amenities)).toBe(true);
      expect(b.amenities.length).toBeGreaterThan(0);
    });
  });

  it('prices VIP above standard and mini below it', () => {
    const mult = (id) => BUS_TYPES.find((b) => b.id === id)?.priceMult;
    expect(mult('vip')).toBeGreaterThan(mult('standard'));
    expect(mult('mini')).toBeLessThan(mult('standard'));
  });

  it('has unique ids', () => {
    const ids = BUS_TYPES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('busTypeById', () => {
  it('returns the bus type for a known id', () => {
    const vip = busTypeById('vip');
    expect(vip).toBeDefined();
    expect(vip.name).toBe('VIP');
    expect(vip.seats).toBe(33);
  });

  it('returns undefined for an unknown id', () => {
    expect(busTypeById('rocket')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(busTypeById(null)).toBeUndefined();
  });

  it('resolves every id in the list', () => {
    BUS_TYPES.forEach((b) => expect(busTypeById(b.id)).toBe(b));
  });
});

describe('FARE', () => {
  it('exposes a positive base and per-km rate', () => {
    expect(FARE.base).toBeGreaterThan(0);
    expect(FARE.perKm).toBeGreaterThan(0);
  });
});
