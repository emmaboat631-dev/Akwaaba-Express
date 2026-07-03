// Namespaced localStorage wrapper with JSON + safe fallbacks.

const NS = 'akwaaba:';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
    } catch {
      /* ignore quota / private-mode errors */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(NS + key);
    } catch {
      /* noop */
    }
  },
};

export const KEYS = {
  user: 'user',
  trips: 'trips',
  recentSearches: 'recentSearches',
  draft: 'draft',
  theme: 'theme',
  driver: 'driver',
};
