# Akwaaba Express

**Ghana's buses, on demand.** A mobile-first prototype for hailing live buses (Uber-style)
and booking future intercity trips (flight-style) across Ghana — built as an installable PWA
so it runs on both Android and iOS from one codebase.

## Features

- **Live buses** — a real map (Leaflet + OpenStreetMap) of Accra with buses moving in
  real time; tap one to track its ETA and grab a seat.
- **Book ahead** — search intercity routes (Accra ↔ Kumasi, Takoradi, Tamale, Cape Coast…)
  for any date, filter by operator/price/bus class, pick seats, add passengers, pay.
- **Profiles** — phone-based login, saved places, payment methods, editable details.
- **Mobile-money payments** — MTN MoMo, Telecel Cash, AirtelTigo Money + cards (GH₵).
- **Tickets** — QR boarding passes saved to *My Trips* (upcoming / history).
- **Gestures** — draggable bottom sheet, swipeable tabs, pull-to-refresh, tap-to-select seats.
- **Installable PWA** — add to home screen, safe-area aware, portrait-locked.

## Tech

React 19 · Vite · React Router · Leaflet/react-leaflet · Framer Motion · date-fns ·
qrcode.react · vite-plugin-pwa.

State lives in React Context + `localStorage`. The "backend" is a **mock service layer**
(`src/services/`) with simulated latency and a real-time bus engine — swap it for a real API later.

## Run

```bash
npm install
npm run dev        # start the dev server
npm run build      # production build (+ PWA service worker)
npm run lint       # oxlint
```

Open the URL Vite prints. For the best feel, use a phone or your browser's device toolbar.
Any phone number works at login — no real SMS is sent (prototype).

## Going native (later)

The app is structured to wrap with **Capacitor** (`npx cap init`, point it at `dist/`) for
App Store / Play Store builds without changing the React code. iOS builds require a Mac + Xcode.

## Project layout

```
src/
  context/   Auth, Booking, Trips, Toast providers
  data/      Ghana cities, operators, live-bus + scheduled-trip seeds
  services/  mock api, live-tracking engine, storage
  hooks/     useLiveBuses, useGeolocation
  components/ map, bottom sheet, seat map, cards, nav…
  pages/     Auth, Home, LiveBuses, LiveTracking, Search, TripDetails,
             SeatSelection, Passengers, Payment, Ticket, Trips, Profile
```
