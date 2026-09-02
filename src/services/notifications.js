const PERM_KEY = 'notif_enabled';

function isSupported() {
  return 'Notification' in window;
}

export async function requestPermission() {
  if (!isSupported()) return false;
  if (Notification.permission === 'granted') {
    localStorage.setItem(PERM_KEY, 'true');
    return true;
  }
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  const granted = result === 'granted';
  localStorage.setItem(PERM_KEY, granted ? 'true' : 'false');
  return granted;
}

export function isEnabled() {
  if (!isSupported()) return false;
  return Notification.permission === 'granted' && localStorage.getItem(PERM_KEY) !== 'false';
}

export function setEnabled(on) {
  localStorage.setItem(PERM_KEY, on ? 'true' : 'false');
}

export function send(title, options = {}) {
  if (!isEnabled()) return;
  try {
    const n = new Notification(title, {
      icon: '/pwa-icon.svg',
      badge: '/pwa-icon.svg',
      ...options,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Silent fail — SW-only context or blocked
  }
}

export function notifyBookingConfirmed(route, amount) {
  send('Booking Confirmed', {
    body: `${route} — GHS ${amount.toFixed(2)} paid. Your seat is reserved.`,
    tag: 'booking',
  });
}

export function notifyTripReminder(route, time) {
  send('Trip Reminder', {
    body: `Your ${route} trip departs at ${time}. Head to the station!`,
    tag: 'reminder',
  });
}

export function notifyDriverArriving(name, eta) {
  send('Driver Arriving', {
    body: `${name} is ${eta} min away. Be ready at your pickup point.`,
    tag: 'driver',
  });
}

export function notifyTripComplete(route) {
  send('Trip Complete', {
    body: `Your ${route} trip is complete. Thanks for riding with Akwaaba Express!`,
    tag: 'complete',
  });
}
