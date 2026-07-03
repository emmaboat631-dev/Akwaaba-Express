// Shared between passenger payment methods (Profile) and driver payout
// method (DriverProfile) — same providers, same shape.

export const PAYMENT_PROVIDERS = [
  { type: 'momo', label: 'MTN MoMo' },
  { type: 'telecel', label: 'Telecel Cash' },
  { type: 'airteltigo', label: 'AirtelTigo Money' },
  { type: 'card', label: 'Visa / Mastercard' },
];
