# Akwaaba Express

**Ghana's buses, on demand.** A mobile-first PWA for hailing live buses (Uber-style) and booking intercity trips (flight-style) across Ghana — installable on Android and iOS from one codebase.

## Features

### Passenger

- **Live bus map** — real-time Leaflet + OpenStreetMap view of Accra with moving buses; tap one to track its ETA, see available seats, and grab a ride
- **Intercity booking** — search routes (Accra ↔ Kumasi, Takoradi, Tamale, Cape Coast…), filter by operator/price/bus class, pick seats on an interactive seat map, add passengers, and pay
- **Mobile-money payments** — MTN MoMo, Telecel Cash, AirtelTigo Money, plus card payments (GH₵)
- **QR tickets** — boarding passes with QR codes saved to *My Trips* (upcoming and history)
- **Profile** — phone-based auth, saved places, payment methods, editable details
- **Incident reporting** — report issues on completed or in-progress trips

### Driver

- **Dashboard** — overview of active trips, hail requests, and today's stats
- **Trip management** — create, view, and manage scheduled trips
- **Live active trip** — real-time trip tracking with passenger manifest
- **QR scanner** — scan passenger tickets for boarding verification
- **Earnings** — view earnings breakdown and trip history
- **Vehicle setup** — register and manage vehicle details

### General

- **Dark mode** — system-aware theme with manual toggle
- **Gestures** — draggable bottom sheet, swipeable tabs, pull-to-refresh, tap-to-select seats
- **Page transitions** — smooth crossfade animations between screens
- **Installable PWA** — add to home screen, safe-area aware, portrait-locked
- **LAN sync** — dev-only relay server for multi-device testing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 8 |
| Routing | React Router 7 |
| Maps | Leaflet + react-leaflet |
| Animation | Framer Motion |
| Auth & DB | Supabase |
| Icons | lucide-react |
| Dates | date-fns |
| QR codes | qrcode.react + qr-scanner |
| PWA | vite-plugin-pwa |
| Linting | oxlint |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the URL Vite prints. For the best experience, use a phone or your browser's device toolbar (375×812).

The dev server uses a self-signed HTTPS certificate (required for camera access on non-localhost origins) and binds to your LAN, so phones on the same Wi-Fi can connect.

### Other commands

```bash
npm run build      # production build with PWA service worker
npm run preview    # serve the production build locally
npm run lint       # run oxlint
```

### Prototype mode

Any phone number works at login — no real SMS is sent. The backend is a mock service layer with simulated latency and a real-time bus simulation engine. Data resets on refresh.

## Project Structure

```
src/
├── context/           React Context providers
│   ├── AuthContext     user session & role (passenger/driver)
│   ├── BookingContext  in-progress booking flow state
│   ├── TripsContext    booked trips (upcoming + history)
│   ├── DriverContext   driver-side state
│   ├── ThemeContext    light/dark mode
│   └── ToastContext    app-wide notifications
├── data/              seed & mock data
│   ├── cities          Ghana city list with coordinates
│   ├── operators       bus operators (VIP, STC, OA, etc.)
│   ├── liveBuses       simulated bus fleet
│   └── driverTrips     mock driver trip data
├── services/          mock API & business logic
│   ├── api             trip search, booking, payments
│   ├── liveTracking    real-time bus position engine
│   ├── nearbyBuses     proximity-based bus discovery
│   ├── driverHail      ride-hail request handling
│   ├── routing         route geometry
│   ├── relay           WebSocket LAN sync
│   └── storage         localStorage persistence
├── hooks/             custom React hooks
├── components/        reusable UI components
│   ├── BusMap          Leaflet map wrapper
│   ├── BottomSheet     draggable sheet with gestures
│   ├── SeatMap         interactive seat picker
│   └── driver/         driver-specific components
├── pages/             route-level page components
│   └── driver/         driver portal pages
├── lib/               third-party clients (Supabase)
├── utils/             formatting, geo math, sound
└── assets/            images & icons

supabase/
└── migrations/        SQL schema migrations
```

## Design System

The app uses CSS custom properties defined in `src/index.css`:

- **Brand colors** — Tiber deep green (`#06392F`), Ghana gold (`#F4C430`), Ghana red (`#CE1126`)
- **Neutrals** — warm paper greys with no blue cast
- **Radii** — consistent border-radius scale (`--r-sm` through `--r-xl`)
- **Shadows** — subtle depth (`--shadow-sm`, `--shadow-md`)
- **Dark mode** — full dark palette with automatic system detection

## Going Native

The app is structured to wrap with [Capacitor](https://capacitorjs.com/) for App Store / Play Store builds:

```bash
npx cap init
# point webDir to dist/
npx cap add android
npx cap add ios    # requires macOS + Xcode
```

No React code changes needed.

## License

Private — all rights reserved.
