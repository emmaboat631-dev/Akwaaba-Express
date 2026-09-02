import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

let hookResult;

const Consumer = () => {
  hookResult = useTheme();
  return null;
};

const setup = () => render(<ThemeProvider><Consumer /></ThemeProvider>);

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    hookResult = null;
  });

  it('defaults to light theme', () => {
    setup();
    expect(hookResult.theme).toBe('light');
    expect(hookResult.isDark).toBe(false);
  });

  it('toggleTheme switches to dark', () => {
    setup();
    act(() => hookResult.toggleTheme());
    expect(hookResult.isDark).toBe(true);
    expect(hookResult.theme).toBe('dark');
  });

  it('toggleTheme switches back to light', () => {
    setup();
    act(() => hookResult.toggleTheme());
    act(() => hookResult.toggleTheme());
    expect(hookResult.isDark).toBe(false);
  });

  it('persists theme to localStorage', () => {
    setup();
    act(() => hookResult.setTheme('dark'));
    expect(JSON.parse(localStorage.getItem('akwaaba:theme'))).toBe('dark');
  });

  it('restores theme from localStorage', () => {
    localStorage.setItem('akwaaba:theme', JSON.stringify('dark'));
    setup();
    expect(hookResult.isDark).toBe(true);
  });

  it('sets data-theme attribute on html', () => {
    setup();
    act(() => hookResult.setTheme('dark'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
