# Akwaaba Express — CLAUDE.md

## What this is

A mobile-first PWA for bus travel in Ghana — live bus hailing (Uber-style) and intercity trip booking (flight-style). Two user roles: **passenger** and **driver**, each with their own route tree and bottom nav.

## Commands

```bash
npm run dev      # Vite dev server (HTTPS via basicSsl plugin)
npm run build    # production build + PWA service worker
npm run lint     # oxlint
```

Dev server binds to LAN (`server.host: true`) so phones on the same Wi-Fi can test. HTTPS is self-signed — real Chrome/Edge accept it, but embedded preview browsers may not.

## Tech stack

- **React 19** with Vite 8, JSX (no TypeScript at runtime)
- **React Router 7** — route definitions in `src/App.jsx`
- **Framer Motion** — page transitions (AnimatePresence), gestures
- **Leaflet + react-leaflet** — live bus map
- **Supabase** — auth (email + anonymous sign-in) and database; client in `src/lib/supabase.js`
- **vite-plugin-pwa** — service worker, manifest, installability
- **date-fns** for date formatting, **lucide-react** for icons, **qrcode.react** / **qr-scanner** for tickets

## Architecture

State is managed through React Context providers, not a state library:
- `AuthContext` — user session, role (passenger/driver)
- `BookingContext` — in-progress booking flow
- `TripsContext` — booked trips (upcoming + history)
- `DriverContext` — driver-side state
- `ThemeContext` — light/dark mode
- `ToastContext` — app-wide toast notifications

The backend is a **mock service layer** in `src/services/` with simulated latency. `src/data/` holds seed data (cities, operators, live buses, driver trips). Swap services for real APIs without changing components.

A dev-only **relay plugin** (`relay-plugin.js`) runs a WebSocket server at `wss://<host>/relay` for LAN sync between devices.

## Project layout

```
src/
  context/       React Context providers (Auth, Booking, Trips, Driver, Theme, Toast)
  data/          seed/mock data (cities, operators, buses, trips, payment providers)
  services/      mock API layer, live tracking engine, storage, routing, relay
  hooks/         custom hooks (useLiveBuses, useGeolocation, useNearbyBuses, useRelay, etc.)
  components/    reusable UI (map, bottom sheet, seat map, cards, nav bars, date picker)
  components/driver/  driver-specific components (QR scanner, incoming request overlay)
  pages/         passenger pages (Home, LiveBuses, Search, Payment, Ticket, etc.)
  pages/driver/  driver pages (Dashboard, ActiveTrip, Earnings, Manifest, etc.)
  lib/           third-party clients (supabase.js)
  utils/         formatting, geo math, sound, driver info
  assets/        images
supabase/
  migrations/    SQL migrations (init, driver_vehicle, incidents_and_trip_mgmt)
```

## Conventions

- **Plain JSX** — `.jsx` for components/pages, `.js` for utilities/data/services. No TypeScript.
- **CSS variables** defined in `src/index.css` — brand colors (`--primary`, `--gold`, `--red`), neutrals, radii, shadows. Dark mode overrides included.
- **Functional components only** with hooks. No class components.
- **Icons** from `lucide-react`. Brand logos in `src/components/BrandIcons.jsx`.
- **Currency** is GH₵ (Ghana Cedis). Amounts formatted with `src/utils/format.js`.
- **Phone-based auth** — any phone number works in prototype mode (no real SMS).
- **Role-gated routes** — `RequireAuth` wrapper checks role and redirects mismatches.
- Linting with **oxlint**, not ESLint.

## Database

Supabase with migrations in `supabase/migrations/`. Tables cover users, profiles, bookings, vehicles, trips, incidents. Row-level security is enabled.

## Things to watch out for

- The self-signed HTTPS cert is required for `getUserMedia` (QR scanner) on non-localhost origins.
- Leaflet map instances are expensive — `AnimatePresence mode="wait"` ensures only one mounts at a time.
- The splash screen runs ~3.6s of animation before fading; the timeout in `Shell` must stay in sync.
- `localStorage` is used for offline persistence alongside Supabase.
