import React, { useRef } from 'react';

const PREFIX = '+233';
const MAX_DIGITS = 9;

const stripNonDigits = (s) => s.replace(/\D/g, '');

// Normalise stored value → display value. Stored values may be raw digits,
// prefixed with +233, or prefixed with 0. We always show "+233 " followed by
// the local digits (max 9).
const toDisplay = (value) => {
  let raw = stripNonDigits(value || '');
  if (raw.startsWith('233')) raw = raw.slice(3);
  else if (raw.startsWith('0') && raw.length > 1) raw = raw.slice(1);
  return raw ? `${PREFIX} ${raw.slice(0, MAX_DIGITS)}` : PREFIX + ' ';
};

// Display value → stored value (digits only, no prefix).
const toStored = (display) => {
  const after = display.slice((PREFIX + ' ').length);
  return stripNonDigits(after).slice(0, MAX_DIGITS);
};

const PhoneInput = ({ value, onChange, placeholder, ...rest }) => {
  const ref = useRef(null);

  const display = toDisplay(value);

  const handleChange = (e) => {
    const input = e.target;
    const raw = input.value;

    // Don't let the user delete the prefix.
    if (!raw.startsWith(PREFIX)) {
      // Restore display and put cursor right after prefix.
      e.target.value = display;
      requestAnimationFrame(() => {
        const pos = (PREFIX + ' ').length;
        input.setSelectionRange(pos, pos);
      });
      return;
    }

    const digits = stripNonDigits(raw.slice(PREFIX.length)).slice(0, MAX_DIGITS);
    onChange(digits);
  };

  const handleKeyDown = (e) => {
    const input = e.target;
    const pos = input.selectionStart;
    const prefixLen = (PREFIX + ' ').length;

    // Prevent deleting into the prefix area.
    if ((e.key === 'Backspace' && pos <= prefixLen) ||
        (e.key === 'Delete' && pos < PREFIX.length)) {
      e.preventDefault();
    }
  };

  const handleFocus = (e) => {
    const input = e.target;
    const prefixLen = (PREFIX + ' ').length;
    requestAnimationFrame(() => {
      if (input.selectionStart < prefixLen) {
        input.setSelectionRange(prefixLen, prefixLen);
      }
    });
  };

  const handleClick = (e) => {
    const input = e.target;
    const prefixLen = (PREFIX + ' ').length;
    if (input.selectionStart < prefixLen) {
      input.setSelectionRange(prefixLen, prefixLen);
    }
  };

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onClick={handleClick}
      maxLength={PREFIX.length + 1 + MAX_DIGITS} // "+233 " + 9 digits
      placeholder={placeholder || '+233 24 000 0000'}
      {...rest}
    />
  );
};

export const isValidGhPhone = (value) => stripNonDigits(value || '').length === MAX_DIGITS;

export default PhoneInput;
