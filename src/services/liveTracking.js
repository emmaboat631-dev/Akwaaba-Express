// Simulated real-time tracking engine (singleton). Advances every live bus
// along its route polyline on a fixed tick and notifies subscribers, so the
// map markers and list ETAs animate as if fed by a live GPS feed.

import { seedLiveBuses } from '../data/liveBuses';
import { lerpPoint, haversineKm } from '../utils/geo';

const TICK_MS = 1500;

let buses = seedLiveBuses();
let timer = null;
const subscribers = new Set();

const remainingKm = (bus) => {
  const pts = bus.route;
  let total = 0;
  if (bus.direction === 1) {
    total += haversineKm(bus.position, pts[bus.segIndex + 1]);
    for (let i = bus.segIndex + 1; i < pts.length - 1; i++) {
      total += haversineKm(pts[i], pts[i + 1]);
    }
  } else {
    total += haversineKm(bus.position, pts[bus.segIndex]);
    for (let i = bus.segIndex; i > 0; i--) {
      total += haversineKm(pts[i], pts[i - 1]);
    }
  }
  return total;
};

const step = (bus) => {
  const pts = bus.route;
  let { segIndex, segT, direction } = bus;
  segT += bus.speed;

  while (segT >= 1) {
    segT -= 1;
    segIndex += direction;
    // Bounce at the ends of the route so the bus keeps circulating.
    if (segIndex >= pts.length - 1) {
      segIndex = pts.length - 1;
      direction = -1;
    } else if (segIndex <= 0) {
      segIndex = 0;
      direction = 1;
    }
  }

  const a = pts[segIndex];
  const b = pts[segIndex + direction] || pts[segIndex];
  const position = lerpPoint(a, b, segT);
  const km = remainingKm({ ...bus, segIndex, segT, direction, position });
  const etaMin = Math.max(1, Math.round((km / 22) * 60)); // ~22 km/h city avg

  return { ...bus, segIndex, segT, direction, position, etaMin };
};

const notify = () => subscribers.forEach((cb) => cb(buses));

const ensureRunning = () => {
  if (timer || subscribers.size === 0) return;
  timer = setInterval(() => {
    buses = buses.map(step);
    notify();
  }, TICK_MS);
};

const maybeStop = () => {
  if (subscribers.size === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
};

export const liveTracking = {
  getBuses: () => buses,
  getBus: (id) => buses.find((b) => b.id === id),
  subscribe(cb) {
    subscribers.add(cb);
    cb(buses);
    ensureRunning();
    return () => {
      subscribers.delete(cb);
      maybeStop();
    };
  },
  // Reduce seat availability when a live seat is booked.
  bookSeat(id) {
    buses = buses.map((b) =>
      b.id === id ? { ...b, seatsAvailable: Math.max(0, b.seatsAvailable - 1) } : b,
    );
    notify();
  },
};
