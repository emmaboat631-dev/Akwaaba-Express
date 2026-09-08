# Akwaaba Express

**Ghana's buses, on demand.** A mobile-first Progressive Web App for hailing live buses (Uber-style) and booking intercity trips (flight-style) across Ghana — available as a PWA and as a native Android APK via Capacitor.

## Features

### Passenger

- **Live bus map** — real-time Leaflet + OpenStreetMap view of Accra with moving buses; tap one to track its ETA, see available seats, and grab a ride
- **Intercity booking** — search routes (Accra ↔ Kumasi, Takoradi, Tamale, Cape Coast…), filter by operator/price/bus class, pick seats on an interactive seat map, add passengers, and pay
- **Paystack payments** — secure card payments via Paystack (GH₵), with mobile money support planned
- **Email OTP verification** — 6-digit email verification on sign-up for account security
- **QR tickets** — boarding passes with QR codes saved to *My Trips* (upcoming and history)
- **Profile** — saved places, payment methods, password change, editable details
- **Booking confirmation** — success screen with booking summary after payment
- **Incident reporting** — report issues on completed or in-progress trips
- **Push notifications** — booking confirmations and trip reminders

### Driver

- **Dashboard** — overview of active trips, hail requests, and today's stats
- **Trip management** — create, view, and manage scheduled trips
- **Live active trip** — real-time trip tracking with passenger manifest
- **QR scanner** — scan passenger tickets for boarding verification
- **Earnings** — view earnings breakdown and trip history
- **Vehicle setup** — register and manage vehicle details
- **Document verification** — submit license and vehicle documents for admin approval

### Admin Dashboard

- **Overview** — key metrics: total users, bookings, revenue, active trips
- **User management** — view and manage all registered users
- **Booking management** — view all bookings with filtering and search
- **Trip management** — monitor and manage all trips
- **Document verification** — review and approve/reject driver documents

### General

- **Google & Apple OAuth** — social sign-in with deep link support in the Android APK
- **Dark mode** — system-aware theme with manual toggle
- **Gestures** — draggable bottom sheet, swipeable tabs, pull-to-refresh, tap-to-select seats
- **Page transitions** — smooth crossfade animations between screens
- **Installable PWA** — add to home screen, safe-area aware, portrait-locked
- **Offline awareness** — offline banner and gate for graceful degradation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 8 |
| Routing | React Router 7 |
| Backend & Auth | Supabase (PostgreSQL, Auth, RLS, Realtime) |
| Payments | Paystack |
| Maps | Leaflet + react-leaflet |
| Animation | Framer Motion |
| Native wrapper | Capacitor 8 (Android) |
| Icons | lucide-react |
| Dates | date-fns |
| QR codes | qrcode.react + qr-scanner |
| PWA | vite-plugin-pwa |
| Linting | oxlint |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com/) project (free tier works)

### Environment Setup

1. Create a Supabase project and run the SQL migrations in `supabase/migrations/` in order (starting from `0001`)
2. In Supabase Dashboard → Authentication → URL Configuration, add your redirect URLs:
   - For web: your app's origin (e.g. `https://localhost:5173`)
   - For Android APK: `com.akwaabaexpress.app://callback`
3. Enable Google OAuth in Supabase → Authentication → Providers
4. Enable email confirmation in Supabase → Authentication → Email to activate OTP verification
5. Create a `.env` file (or set env vars) with your Supabase and Paystack keys:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_PAYSTACK_KEY=pk_test_xxxxx
   ```

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

### Building the Android APK

```bash
npm run build
npx cap sync android
```

Then open `android/` in Android Studio and build the APK. The Capacitor config is already set up with the app ID `com.akwaabaexpress.app` and deep link intent filters for OAuth.

## Project Structure

```
src/
├── context/           React Context providers
│   ├── AuthContext     user session, profile, saved places, payment methods
│   ├── BookingContext  in-progress booking flow state
│   ├── TripsContext    booked trips (upcoming + history)
│   ├── DriverContext   driver-side state
│   ├── ThemeContext    light/dark mode
│   └── ToastContext    app-wide notifications
├── data/              static reference data
│   ├── cities          Ghana city list with coordinates
│   ├── operators       bus operators (VIP, STC, OA, etc.)
│   ├── liveBuses       simulated bus fleet for live tracking
│   └── paymentProviders  payment provider definitions
├── services/          API & business logic
│   ├── api             Supabase queries: trip search, booking creation
│   ├── adminApi        admin dashboard queries
│   ├── paystack        Paystack payment integration
│   ├── deepLink        Capacitor deep link handler for OAuth
│   ├── liveTracking    real-time bus position engine
│   ├── nearbyBuses     proximity-based bus discovery
│   ├── notifications   push notification service
│   ├── relay           WebSocket LAN sync (dev)
│   └── storage         localStorage persistence
├── hooks/             custom React hooks
├── components/        reusable UI components
│   ├── BusMap          Leaflet map wrapper
│   ├── BottomSheet     draggable sheet with gestures
│   ├── SeatMap         interactive seat picker
│   └── driver/         driver-specific components
├── pages/             route-level page components
│   ├── admin/          admin dashboard pages
│   └── driver/         driver portal pages
├── lib/               third-party clients (Supabase)
├── utils/             formatting, geo math, sound
└── assets/            images & icons

android/               Capacitor Android project
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

## Authors

- **Emmanuel Boateng** — Developer & Designer
- **Joseph Engmann** — Developer & Designer
- **Prince Gebu** — Developer & Designer

## License

Private — all rights reserved.
