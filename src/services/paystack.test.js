import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PAYSTACK_CHANNELS } from './paystack';

describe('PAYSTACK_CHANNELS', () => {
  it('maps momo to mobile_money', () => {
    expect(PAYSTACK_CHANNELS.momo).toEqual(['mobile_money']);
  });

  it('maps telecel to mobile_money', () => {
    expect(PAYSTACK_CHANNELS.telecel).toEqual(['mobile_money']);
  });

  it('maps airteltigo to mobile_money', () => {
    expect(PAYSTACK_CHANNELS.airteltigo).toEqual(['mobile_money']);
  });

  it('maps card to card', () => {
    expect(PAYSTACK_CHANNELS.card).toEqual(['card']);
  });
});

describe('initPaystack', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when PaystackPop is not loaded', async () => {
    vi.stubGlobal('PaystackPop', undefined);
    vi.stubEnv('VITE_PAYSTACK_PUBLIC_KEY', 'pk_test_123');

    const { initPaystack } = await import('./paystack');
    expect(() => initPaystack({
      email: 'test@test.com',
      amount: 100,
      channels: ['card'],
      onSuccess: vi.fn(),
      onClose: vi.fn(),
    })).toThrow('Paystack script not loaded');
  });

  it('calls PaystackPop.setup with correct params', async () => {
    const openIframe = vi.fn();
    vi.stubGlobal('PaystackPop', {
      setup: vi.fn().mockReturnValue({ openIframe }),
    });
    vi.stubEnv('VITE_PAYSTACK_PUBLIC_KEY', 'pk_test_abc');

    const { initPaystack } = await import('./paystack');
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    initPaystack({
      email: 'user@example.com',
      amount: 50.5,
      channels: ['mobile_money'],
      onSuccess,
      onClose,
    });

    expect(window.PaystackPop.setup).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        amount: 5050,
        currency: 'GHS',
        channels: ['mobile_money'],
      }),
    );
    expect(openIframe).toHaveBeenCalled();
  });
});
