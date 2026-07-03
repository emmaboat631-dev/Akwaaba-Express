import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage, KEYS } from '../services/storage';

// Light / dark theme. Persists the choice and applies `data-theme` to <html>,
// which flips the CSS custom properties in index.css.

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const systemPref = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => storage.get(KEYS.theme, null) || systemPref());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    storage.set(KEYS.theme, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0F120F' : '#06392F');
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
