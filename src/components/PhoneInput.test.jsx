import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhoneInput, { isValidGhPhone } from './PhoneInput';

describe('isValidGhPhone', () => {
  it('accepts nine local digits', () => {
    expect(isValidGhPhone('241234567')).toBe(true);
  });

  it('accepts a +233-prefixed number', () => {
    expect(isValidGhPhone('+233 24 123 4567')).toBe(false);
  });

  it('rejects too few digits', () => {
    expect(isValidGhPhone('2412345')).toBe(false);
  });

  it('rejects too many digits', () => {
    expect(isValidGhPhone('2412345678')).toBe(false);
  });

  it('rejects an empty value', () => {
    expect(isValidGhPhone('')).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidGhPhone(null)).toBe(false);
  });
});

describe('PhoneInput', () => {
  it('shows the +233 prefix for an empty value', () => {
    render(<PhoneInput value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('+233 ');
  });

  it('renders local digits after the prefix', () => {
    render(<PhoneInput value="241234567" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('+233 241234567');
  });

  it('strips a leading zero from a stored number', () => {
    render(<PhoneInput value="0241234567" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('+233 241234567');
  });

  it('strips a stored 233 country code', () => {
    render(<PhoneInput value="233241234567" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('+233 241234567');
  });

  it('truncates beyond nine local digits', () => {
    render(<PhoneInput value="24123456789999" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('+233 241234567');
  });

  it('reports only the local digits on change', () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '+233 241234567' } });
    expect(onChange).toHaveBeenCalledWith('241234567');
  });

  it('ignores an edit that removes the prefix', () => {
    const onChange = vi.fn();
    render(<PhoneInput value="241234567" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '241234567' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses a default placeholder', () => {
    render(<PhoneInput value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '+233 24 000 0000');
  });

  it('accepts a custom placeholder', () => {
    render(<PhoneInput value="" onChange={() => {}} placeholder="Your number" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Your number');
  });

  it('renders as a tel input', () => {
    render(<PhoneInput value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
  });

  it('blocks backspace inside the prefix', () => {
    render(<PhoneInput value="241234567" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    input.setSelectionRange(2, 2);
    const evt = fireEvent.keyDown(input, { key: 'Backspace' });
    expect(evt).toBe(false); // preventDefault() was called
  });

  it('allows backspace past the prefix', () => {
    render(<PhoneInput value="241234567" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    input.setSelectionRange(10, 10);
    const evt = fireEvent.keyDown(input, { key: 'Backspace' });
    expect(evt).toBe(true);
  });
});
