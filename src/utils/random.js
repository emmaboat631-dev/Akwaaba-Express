// Tiny seeded PRNG so generated schedules stay stable across re-renders
// for the same route + date (deterministic prototype data).

export const hashString = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
};

export const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Seeded helpers built on a generator fn rng() -> [0,1).
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const range = (rng, min, max) => min + rng() * (max - min);
export const intRange = (rng, min, max) => Math.floor(range(rng, min, max + 1));

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
