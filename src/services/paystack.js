const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

export function initPaystack({ email, amount, channels, onSuccess, onClose }) {
  if (!PAYSTACK_KEY) {
    throw new Error('Paystack public key not configured');
  }

  if (!window.PaystackPop) {
    throw new Error('Paystack script not loaded');
  }

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_KEY,
    email,
    amount: Math.round(amount * 100),
    currency: 'GHS',
    channels,
    callback: (response) => {
      onSuccess(response.reference);
    },
    onClose: () => {
      onClose();
    },
  });

  handler.openIframe();
}

export const PAYSTACK_CHANNELS = {
  momo: ['mobile_money'],
  telecel: ['mobile_money'],
  airteltigo: ['mobile_money'],
  card: ['card'],
};
