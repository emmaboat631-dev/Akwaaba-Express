import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordChecklist, { PASSWORD_RULES, passwordMeetsRules } from './PasswordChecklist';

const LENGTH = 'At least 8 characters';
const UPPER = 'One uppercase letter (A–Z)';
const LOWER = 'One lowercase letter (a–z)';
const NUMBER = 'One number (0–9)';

describe('PASSWORD_RULES', () => {
  it('has four rules with a key, label and test', () => {
    expect(PASSWORD_RULES).toHaveLength(4);
    PASSWORD_RULES.forEach((r) => {
      expect(typeof r.key).toBe('string');
      expect(typeof r.label).toBe('string');
      expect(typeof r.test).toBe('function');
    });
  });
});

describe('passwordMeetsRules', () => {
  it('rejects an empty password', () => {
    expect(passwordMeetsRules('')).toBe(false);
  });

  it('rejects a short password', () => {
    expect(passwordMeetsRules('Ab1')).toBe(false);
  });

  it('rejects a password with no uppercase', () => {
    expect(passwordMeetsRules('password1')).toBe(false);
  });

  it('rejects a password with no lowercase', () => {
    expect(passwordMeetsRules('PASSWORD1')).toBe(false);
  });

  it('rejects a password with no number', () => {
    expect(passwordMeetsRules('Passwordd')).toBe(false);
  });

  it('accepts a password meeting every rule', () => {
    expect(passwordMeetsRules('Password1')).toBe(true);
  });
});

describe('PasswordChecklist', () => {
  it('renders all four rules', () => {
    render(<PasswordChecklist value="" />);
    [LENGTH, UPPER, LOWER, NUMBER].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders with no value prop', () => {
    render(<PasswordChecklist />);
    expect(screen.getByText(LENGTH)).toBeInTheDocument();
  });

  it('marks unmet rules as muted', () => {
    render(<PasswordChecklist value="" />);
    expect(screen.getByText(LENGTH).closest('li')).toHaveStyle({ color: 'var(--muted)' });
  });

  it('marks the length rule met at 8 characters', () => {
    render(<PasswordChecklist value="abcdefgh" />);
    expect(screen.getByText(LENGTH).closest('li')).toHaveStyle({ color: 'var(--success)' });
  });

  it('marks the uppercase rule met', () => {
    render(<PasswordChecklist value="A" />);
    expect(screen.getByText(UPPER).closest('li')).toHaveStyle({ color: 'var(--success)' });
  });

  it('marks the number rule met', () => {
    render(<PasswordChecklist value="1" />);
    expect(screen.getByText(NUMBER).closest('li')).toHaveStyle({ color: 'var(--success)' });
  });

  it('marks every rule met for a strong password', () => {
    render(<PasswordChecklist value="Password1" />);
    [LENGTH, UPPER, LOWER, NUMBER].forEach((label) => {
      expect(screen.getByText(label).closest('li')).toHaveStyle({ color: 'var(--success)' });
    });
  });

  describe('confirm row', () => {
    it('is hidden when confirm is not passed', () => {
      render(<PasswordChecklist value="Password1" />);
      expect(screen.queryByText('Passwords match')).not.toBeInTheDocument();
    });

    it('is hidden while confirm is still empty', () => {
      render(<PasswordChecklist value="Password1" confirm="" />);
      expect(screen.queryByText('Passwords match')).not.toBeInTheDocument();
    });

    it('appears once the user starts typing the confirmation', () => {
      render(<PasswordChecklist value="Password1" confirm="P" />);
      expect(screen.getByText('Passwords match')).toBeInTheDocument();
    });

    it('is unmet while the values differ', () => {
      render(<PasswordChecklist value="Password1" confirm="Password2" />);
      expect(screen.getByText('Passwords match').closest('li')).toHaveStyle({ color: 'var(--muted)' });
    });

    it('is met once the values match', () => {
      render(<PasswordChecklist value="Password1" confirm="Password1" />);
      expect(screen.getByText('Passwords match').closest('li')).toHaveStyle({ color: 'var(--success)' });
    });
  });
});
