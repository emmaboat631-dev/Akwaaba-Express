import { describe, it, expect, vi } from 'vitest';

// cities.js fires a Supabase query on import; stub it so the module keeps its
// hardcoded fallback list instead of hitting the network.
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null }) }) }),
  },
}));

const { CITIES, cityById } = await import('./cities');

describe('CITIES', () => {
  it('is a non-empty list', () => {
    expect(Array.isArray(CITIES)).toBe(true);
    expect(CITIES.length).toBeGreaterThan(0);
  });

  it('includes the major hubs', () => {
    const names = CITIES.map((c) => c.name);
    expect(names).toContain('Accra');
    expect(names).toContain('Kumasi');
    expect(names).toContain('Tamale');
    expect(names).toContain('Cape Coast');
  });

  it('gives every city an id, name, region, lat and lng', () => {
    CITIES.forEach((c) => {
      expect(typeof c.id).toBe('string');
      expect(c.id).not.toBe('');
      expect(typeof c.name).toBe('string');
      expect(c.name).not.toBe('');
      expect(typeof c.region).toBe('string');
      expect(typeof c.lat).toBe('number');
      expect(typeof c.lng).toBe('number');
    });
  });

  it('has unique ids', () => {
    const ids = CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('places every city within Ghana bounds', () => {
    CITIES.forEach((c) => {
      expect(c.lat).toBeGreaterThan(4);
      expect(c.lat).toBeLessThan(12);
      expect(c.lng).toBeGreaterThan(-4);
      expect(c.lng).toBeLessThan(2);
    });
  });
});

describe('cityById', () => {
  it('returns the city for a known id', () => {
    const accra = cityById('accra');
    expect(accra).toBeDefined();
    expect(accra.name).toBe('Accra');
    expect(accra.region).toBe('Greater Accra');
  });

  it('returns undefined for an unknown id', () => {
    expect(cityById('atlantis')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(cityById(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(cityById(undefined)).toBeUndefined();
  });

  it('is case sensitive', () => {
    expect(cityById('ACCRA')).toBeUndefined();
  });

  it('resolves every id in the list', () => {
    CITIES.forEach((c) => {
      expect(cityById(c.id)).toBe(c);
    });
  });
});
