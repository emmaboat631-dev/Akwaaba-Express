// Currency, time & date formatting helpers (Ghana Cedi).

export const formatCedi = (amount) =>
  `GH₵${Number(amount).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Minutes since midnight -> "11:05"
export const minutesToClock = (mins) => {
  const total = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = Math.floor(total % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const isValidGhanaCard = (value) => {
  if (!value) return true;
  return /^GHA-\d{9}-\d$/i.test(value.trim());
};

export const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';
