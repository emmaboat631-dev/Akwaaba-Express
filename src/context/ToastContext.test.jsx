import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './ToastContext';

const Trigger = ({ message, type }) => {
  const toast = useToast();
  return <button onClick={() => toast(message, type)}>fire</button>;
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('shows a toast message', () => {
    render(
      <ToastProvider>
        <Trigger message="Hello" type="success" />
      </ToastProvider>,
    );
    act(() => screen.getByText('fire').click());
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('auto-dismisses after timeout', () => {
    render(
      <ToastProvider>
        <Trigger message="Bye" type="info" />
      </ToastProvider>,
    );
    act(() => screen.getByText('fire').click());
    expect(screen.getByText('Bye')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
  });

  it('shows multiple toasts', () => {
    const Multi = () => {
      const toast = useToast();
      return (
        <>
          <button onClick={() => toast('First', 'success')}>a</button>
          <button onClick={() => toast('Second', 'error')}>b</button>
        </>
      );
    };
    render(<ToastProvider><Multi /></ToastProvider>);
    act(() => screen.getByText('a').click());
    act(() => screen.getByText('b').click());
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('applies correct toast type class', () => {
    render(
      <ToastProvider>
        <Trigger message="Error msg" type="error" />
      </ToastProvider>,
    );
    act(() => screen.getByText('fire').click());
    const toast = screen.getByText('Error msg').closest('.toast');
    expect(toast.classList.contains('toast-error')).toBe(true);
  });
});
