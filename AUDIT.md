# Akwaaba Express — Full Codebase Audit

## 1. What Already Exists

### Passenger Flow

| Area | Screen / File | Status |
|------|--------------|--------|
| **Auth** | `SignIn.jsx`, `SignUp.jsx`, `ResetPassword.jsx` | Email + password sign-in/up via Supabase. Guest (anonymous) sign-in for passengers. Password reset with real Supabase recovery emails. Google/Apple OAuth buttons exist but show "not set up" toast. |
| **Role gate** | `RequireAuth` in `App.jsx` | Checks `user.role` and redirects mismatches (`/driver` ↔ `/`). Works correctly. |
| **Home** | `Home.jsx` | Two-mode landing: "Book ahead" (schedule search) and "Live now" (nearby buses). City pickers, date chips, passenger counter, recent searches (localStorage). Featured route card (hardcoded Accra→Kumasi). |
| **Trip search** | `Search.jsx` → `api.searchTrips` | Queries Supabase `trips` table with operator/busType joins. Filters (bus type) and sorts (earliest/cheapest/fastest). Loading skeletons and empty state present. |
| **Trip details** | `TripDetails.jsx` | Operator, route timeline, amenities, fare display. "Select seats" CTA. |
| **Seat selection** | `SeatSelection.jsx` + `SeatMap` component | Interactive seat grid from `busType.cols` layout. Enforces seats = passenger count. Shows running total. |
| **Passenger info** | `Passengers.jsx` | Booker pre-filled from profile. Extra passengers with name/phone/Ghana Card. Live mode: seat count stepper (no fixed seats). Relay path: sends `hail:request`, waits 18 s for driver accept/decline. |
| **Payment** | `Payment.jsx` → `api.pay` | MTN MoMo, Telecel Cash, AirtelTigo Money, Visa/Mastercard options. Merges saved methods from profile. GH₵2 booking fee. **Payment is 100 % mock** — `api.pay` sleeps 1600 ms and returns a fake reference. |
| **Booking creation** | `api.createBooking` | **Scheduled trips**: full Supabase insert (`bookings` + `booking_passengers`). **Live trips**: in-memory only (`liveTracking.bookSeat`), never persisted to DB. |
| **Ticket** | `Ticket.jsx` | Boarding-pass UI with QR code (`qrcode.react`), live countdown, cancel option, report link. Save/Share buttons are mock (toast only). |
| **My trips** | `Trips.jsx` → `TripsContext` | Upcoming / History tabs. Pull-to-refresh. Cancel inline. Fetches from Supabase with nested passengers, trip, operator, busType. |
| **Live bus map** | `LiveBuses.jsx` | Full-screen Leaflet map with bus markers. BottomSheet with sorted bus list. Combines relay drivers + simulated buses from `nearbyBuses.js`. |
| **Live tracking** | `LiveTracking.jsx` | Single-bus tracking with animated movement along route. Map + route polyline. BottomSheet: ETA, seats, price. "Book a seat" starts live booking. |
| **Profile** | `Profile.jsx` | Edit name/phone, set Ghana Card (immutable after first write). Saved places CRUD. Payment methods CRUD. Dark mode toggle (functional). Push notifications / email updates toggles (UI only). |
| **Incident report** | `ReportIncident.jsx` | 8 categories. Saves to Supabase `incidents` table. Min 10-char description. |
| **Maps / routing** | `routing.js` → OSRM | Real road routing via OSRM public demo API. In-memory cache with coordinate rounding. Deduplicates in-flight requests. |
| **PWA** | `vite.config.js` VitePWA | Manifest, service worker (autoUpdate strategy), installable. |

### Driver Flow

| Area | Screen / File | Status |
|------|--------------|--------|
| **Dashboard** | `DriverDashboard.jsx` | Online/offline toggle. Live / Scheduled mode selector. Live destination picker (local suburbs). Today's stats strip (earnings, km, trips). Today's assigned trip (deterministically generated per driver per day — **mock**). Vehicle setup nudge. Incoming request overlay (simulated + relay). |
| **Active trip** | `DriverActiveTrip.jsx` | Map-centric view for scheduled trips and live hail rides. BottomSheet with details. Hail: two-step "Arrived → Complete". Scheduled: "Complete trip". Listens for passenger cancellation via relay. |
| **Manifest** | `DriverManifest.jsx` | Generated passenger list (**mock** via `generateManifest`). Tap to toggle boarded/waiting (session-only). Start/Continue trip CTA. Link to QR scan. |
| **QR scanner** | `DriverScanTicket.jsx` | Camera scanner (`qr-scanner`) + manual code entry. Validates route, date, operator, trip type, cancellation, already-checked-in. Looks up booking from TripsContext or relay. Check-in updates Supabase + broadcasts via relay. Sound feedback. |
| **Earnings** | `DriverEarnings.jsx` | Today / This week / History tabs. Stats grid. Acceptance rate, online hours, rating. All from localStorage-persisted `DriverContext`. |
| **Trip manager** | `DriverTripManager.jsx` | Create scheduled trips in Supabase (from/to, date, time, operator, bus type, plate, price). Cancel trips with confirmation modal. Lists upcoming driver trips. Distance via equirectangular approximation; duration at 56 km/h. |
| **Trip history** | `DriverTripHistory.jsx` | Today / All tabs from `DriverContext.completedTrips`. Pull-to-refresh is mock (toast only). |
| **Vehicle setup** | `DriverVehicleSetup.jsx` | Company (operators list), bus class, plate, model, color, license number. Saves via `setVehicleInfo` (resets verification to pending). |
| **Profile** | `DriverProfile.jsx` | Edit name/phone. Vehicle & license display with verification badge. Submit for verification (**auto-approves — no real verification**). Payout method (**no-op**, `setPayoutMethod` not persisted). Dark mode toggle. Push notifications toggle (UI only). |
| **Hail engine** | `driverHail.js` | Simulated incoming ride requests every 5 s (50 % chance) while idle. 15 s TTL. **Not wired to real passenger bookings.** |
| **Relay** | `relay.js` | Supabase Realtime: "drivers" channel (Presence + Broadcast), "hail" channel (Broadcast). Handles driver:online/offline/position, booking:new, hail:*, ticket:checkedin. Presence sync rebuilds driver list on reconnect. |

### Supabase Schema (migrations)

| Migration | Tables / Changes |
|-----------|-----------------|
| `0001_init.sql` | `profiles`, `cities`, `operators`, `bus_types`, `trips`, `bookings`, `booking_passengers`, `saved_places`, `payment_methods`. Trigger `handle_new_user` auto-creates profile. RLS on all tables. Seed data: 25 cities, 5 operators, 3 bus types, ~420 trips (15 routes × 14 days × 2 types). |
| `0002_driver_vehicle.sql` | Adds `operator_id`, `bus_type_id`, `vehicle_model`, `vehicle_color` to `profiles`. FKs to operators/bus_types. |
| `0003_incidents_and_trip_mgmt.sql` | `incidents` table. Adds `driver_id` and `status` to `trips`. RLS for driver trip insert/update. |

---

## 2. What Is Missing or Broken

### 2a. Role Enforcement

**Verdict: Properly implemented.**

- `RequireAuth` in `App.jsx:47-61` checks `user.role` and redirects mismatches.
- Supabase RLS policies enforce row-level access.
- `AuthContext` fetches role from `profiles` table on sign-in.

**Minor gap:** Guest users (`signInAsGuest`) get `role: 'passenger'` via metadata but the profile insert relies on the `handle_new_user` trigger reading `raw_user_meta_data.role`. If that trigger fails silently, a guest could end up with no profile row. There's a fallback in `SignIn.jsx` that creates a profile, but `signInAsGuest` goes through `AuthContext` directly, which fetches but doesn't create on miss — it just sets `profile: null`.

### 2b. VIP / STC Schedules

**Seeded, not connected to real operator APIs.**

- `0001_init.sql` seeds ~420 trips across 5 operators and 14 days.
- `api.searchTrips` queries these from Supabase — functional for the prototype.
- No real-time schedule sync with VIP, STC, OA, Metro Mass, or Aaba Express.
- Drivers can create their own trips via `DriverTripManager.jsx`, which inserts into the same `trips` table.

**What's needed for production:** An operator admin portal or API integration to manage schedules, pricing, and seat inventory per bus.

### 2c. Live Bus Booking (Leaflet Integration)

**Functional but simulated.**

- `liveTracking.js` runs a 1500 ms tick loop bouncing mock buses along polylines.
- `nearbyBuses.js` generates 6-8 static buses around user's position using seeded RNG.
- ETA calculated at ~22 km/h average (hardcoded).
- Real relay drivers (via Supabase Presence) are mixed with simulated buses on the map.

**Critical issue:** `liveTracking.bookSeat` only decrements `seatsAvailable` in memory. The booking is never written to Supabase. On page refresh, the seat count resets and the booking is lost. See `api.createBooking` in [api.js](src/services/api.js) lines 73-78: the `live` path calls `liveTracking.bookSeat(busId)` and returns an in-memory object.

### 2d. Payment Integration

**Entirely mock.**

- `api.pay` in [api.js](src/services/api.js) line 55: `await delay(1600)` then returns `{ ok: true, ref: 'AKW-...' }`.
- No Paystack, Hubtel, or any real payment gateway.
- No payment verification, no webhook handling, no refund flow.
- The GH₵2 booking fee is calculated client-side but never charged.
- Payout to drivers (`setPayoutMethod` in `AuthContext.jsx`) is a no-op — the function body is empty, nothing is persisted.

### 2e. Driver Dashboard

**Built and functional for the prototype.**

- Online/offline toggle, live/scheduled mode, local destination picker, incoming request overlay, today's stats, assigned trip, trip management link — all present.

**Gaps:**
1. **Assigned trip is mock** — `generateAssignedTrip` in `data/driverTrips.js` deterministically generates a fake trip per driver per day. No real dispatch system.
2. **Earnings are localStorage only** — `DriverContext` persists to `akwaaba:driver`. No server-side earnings ledger. A browser clear wipes all history.
3. **Manifest is mock** — `generateManifest` creates fake passengers. Real bookings from Supabase are not pulled into the manifest.
4. **Boarded/waiting status is session-only** — toggling a passenger's status in `DriverManifest.jsx` is local state, not persisted.

### 2f. Loading States & Empty States

**Present throughout — well handled.**

- `TripCardSkeleton` in Search
- Loading spinners in DriverTripManager, Trips, Profile
- `EmptyState` component used in Search, Trips, DriverDashboard, DriverTripManager, DriverEarnings, DriverTripHistory
- Pull-to-refresh in Trips (real refetch) and DriverTripHistory (mock toast)

**Gap:** `DriverTripHistory.jsx` pull-to-refresh shows a "Refreshed" toast but doesn't actually refetch — it reads from `DriverContext.completedTrips` which is localStorage.

### 2g. PWA (Offline & Install)

**Install: configured. Offline: minimal.**

- `VitePWA` in `vite.config.js` with `autoUpdate` strategy, manifest with name/icons/theme.
- Service worker caches the app shell (JS/CSS/HTML).
- **No offline data support.** All Supabase queries fail without network. No cached trips, no queued bookings, no offline ticket display.
- `localStorage` holds some state (driver context, booking draft, recent searches, theme) but it's not an offline-first strategy.

### 2h. Push Notifications

**UI-only toggles, no real implementation.**

- `Profile.jsx` and `DriverProfile.jsx` have "Push notifications" and "Email updates" toggles.
- These set local state only. No `Notification.requestPermission()`, no FCM/web-push registration, no Supabase Edge Function for sending.
- The relay (Supabase Realtime) handles real-time sync between devices, but only while the app is open.

### 2i. Supabase Schema & RLS

**Well-structured with RLS on all tables.**

Tables with RLS:
- `profiles` — users can read/update their own
- `cities`, `operators`, `bus_types` — anyone can read
- `trips` — anyone can read; drivers can insert/update their own (migration 0003)
- `bookings` — users can read/insert their own
- `booking_passengers` — users can read/insert for their own bookings
- `saved_places` — users can CRUD their own
- `payment_methods` — users can CRUD their own
- `incidents` — users can read/insert their own

**Issues found:**

1. **No `status` default on `trips`** — Migration 0003 adds `status text` to trips but doesn't set a default. Existing seeded trips have `null` status. The `DriverTripManager` doesn't set status on insert either, so new driver-created trips also get `null`. Only `cancelTrip` sets `status = 'cancelled'`. This means there's no way to distinguish "active" from "completed" trips at the DB level.

2. **`bookings.status` CHECK constraint is permissive** — Allows `confirmed`, `cancelled`, `checked_in`, `completed`. But nothing in the code ever sets `completed`. Trips end via `DriverContext.completeTrip` which is localStorage only.

3. **No index on `bookings(trip_id)`** — `api.searchTrips` counts booked seats per trip with a subquery. At scale this becomes a sequential scan per trip.

4. **No index on `trips(driver_id, travel_date)`** — `DriverTripManager.fetchTrips` filters on both columns.

5. **`incidents` table has no FK to `bookings`** — The `booking_id` column references nothing, so orphaned incidents are possible.

---

## 3. Prioritized Completion Roadmap

### 🔴 Critical — Must fix before any real user touches it

| # | Item | Files | Effort |
|---|------|-------|--------|
| C1 | **Integrate a real payment gateway** (Paystack or Hubtel). Replace `api.pay` mock. Add webhook verification endpoint (Supabase Edge Function). Handle payment failures, timeouts, and refunds on cancellation. | `services/api.js`, new Edge Function, `Payment.jsx` | Large |
| C2 | **Persist live bookings to Supabase.** `api.createBooking` for `type === 'live'` currently only calls `liveTracking.bookSeat` in memory. Must insert into `bookings` + `booking_passengers` like the scheduled path. | `services/api.js` lines 73-78 | Small |
| C3 | **Remove auto-approve from driver verification.** `submitVerification` in `AuthContext.jsx` directly sets `verification_status: 'verified'`. This should submit for review (set to `pending`) and require admin approval. | `AuthContext.jsx` `submitVerification` | Medium |
| C4 | **Add `trips.status` default and lifecycle.** Set default to `'scheduled'`. Add transitions: `scheduled → boarding → in_progress → completed → cancelled`. Update `DriverActiveTrip` to write status changes to Supabase, not just localStorage. | Migration, `DriverActiveTrip.jsx`, `DriverContext.jsx` | Medium |
| C5 | **Persist driver earnings server-side.** Create an `earnings` or `trip_completions` table. `completeTrip` / `completeHail` must write to Supabase. localStorage is the cache, not the source of truth. | New migration, `DriverContext.jsx`, `api.js` | Medium |
| C6 | **Wire manifest to real bookings.** `DriverManifest.jsx` should query `booking_passengers` for the current trip instead of calling `generateManifest`. Boarding status should be persisted (update `booking_passengers.checked_in` or similar). | `DriverManifest.jsx`, possibly new column in `booking_passengers` | Medium |
| C7 | **Implement driver payout method persistence.** `setPayoutMethod` in `AuthContext.jsx` is an empty function. Add a `payout_methods` table or column on `profiles`, and persist the selection to Supabase. | `AuthContext.jsx`, new migration | Small |

### 🟡 Important — Needed for a credible product

| # | Item | Files | Effort |
|---|------|-------|--------|
| I1 | **Offline ticket display.** Cache the user's upcoming bookings in localStorage/IndexedDB so they can show their QR code without network. | `TripsContext.jsx`, `Ticket.jsx`, `services/storage.js` | Medium |
| I2 | **Real push notifications.** Register for web push via `Notification.requestPermission()` + FCM or Supabase Edge Function. Notify on: booking confirmed, trip cancelled, driver approaching, check-in complete. | New service, `Profile.jsx`, `DriverProfile.jsx`, Edge Function | Large |
| I3 | **OAuth sign-in (Google/Apple).** The buttons exist but show a toast. Configure Supabase OAuth providers and handle the redirect flow. | `SignIn.jsx`, `SignUp.jsx`, Supabase dashboard config | Medium |
| I4 | **Replace OSRM demo server.** The public demo API (`router.project-osrm.org`) has no SLA, rate limits, and returns CORS errors intermittently. Self-host OSRM or use a commercial routing API (Mapbox, Google). | `services/routing.js` | Small (config) |
| I5 | **Add database indexes.** `bookings(trip_id)`, `trips(driver_id, travel_date)`, `trips(from_id, to_id, travel_date)`, `booking_passengers(booking_id)`. | New migration | Small |
| I6 | **Admin dashboard.** No admin UI exists. Need: trip management, driver verification approval queue, incident review, operator management, booking oversight. | New route tree | Large |
| I7 | **Rate limiting on booking creation.** Nothing prevents a user from creating hundreds of bookings. Add a Supabase RLS policy or Edge Function check (e.g., max 5 active bookings per user). | RLS policy or Edge Function | Small |
| I8 | **Ticket save/share.** `Ticket.jsx` Save and Share buttons just show a toast. Implement `navigator.share()` for share and generate a downloadable image/PDF for save. | `Ticket.jsx` | Medium |
| I9 | **Pull-to-refresh in DriverTripHistory.** Currently shows "Refreshed" toast but doesn't refetch. Should read from Supabase (once C5 is done). | `DriverTripHistory.jsx` | Small |
| I10 | **Ghana Card validation.** Currently accepts any string. Should validate the Ghana Card format (GHA-XXXXXXXXX-X). | `Profile.jsx`, `Passengers.jsx` | Small |

### 🟢 Nice to Have — Polish and delight

| # | Item | Files | Effort |
|---|------|-------|--------|
| N1 | **Real GPS tracking for drivers.** Replace simulated bus movement with actual device GPS piped through Supabase Realtime. The relay infrastructure already exists — just need real position data. | `DriverDashboard.jsx`, `liveTracking.js` | Medium |
| N2 | **Operator API integrations.** Connect to VIP, STC, etc. for real-time schedules, pricing, and seat availability. | `services/api.js`, new service per operator | Large |
| N3 | **Multi-language support (i18n).** Ghana has English as official language, but Twi/Ga/Ewe/Hausa support would widen reach. | All pages (string extraction) | Large |
| N4 | **Trip sharing.** Let passengers share their live trip location with contacts for safety. | `LiveTracking.jsx`, `Ticket.jsx` | Medium |
| N5 | **In-app chat.** Driver ↔ passenger messaging for live trips. The relay channel infrastructure exists. | New component, relay extension | Medium |
| N6 | **Loyalty / frequent traveler program.** Track rides, award points, offer discounts. | New tables, new UI section | Large |
| N7 | **Accessibility audit.** Add ARIA labels, keyboard navigation, screen reader support throughout. Some buttons lack `aria-label`. | All components | Medium |
| N8 | **Analytics / telemetry.** No tracking exists. Add basic usage analytics (screens viewed, booking funnel drop-off, search patterns). | New service, all pages | Medium |

---

## 4. Bad Patterns That Will Break Under Real Users or Scale

### 4.1 Live bookings vanish on refresh
**File:** `services/api.js:73-78`
`createBooking` for live trips calls `liveTracking.bookSeat(busId)` which decrements an in-memory counter. Nothing is written to Supabase. The passenger gets a ticket, but the booking exists only in the browser tab that created it. Refresh = gone. Another device = invisible.

### 4.2 Driver state lives in localStorage
**File:** `context/DriverContext.jsx`
Earnings, completed trips, online time, acceptance rate — all persisted via `storage.set('driver', ...)`. A browser clear, a new device, or a private browsing session starts the driver at zero. There's no server-side record of a driver's trip completions or earnings.

### 4.3 Payment is fake but the booking is real
**File:** `services/api.js:55-62`
`api.pay` always succeeds after 1600 ms. A user can "pay" with any method and get a confirmed booking with a QR code. In production, this means unpaid bookings filling seats that paying passengers can't get.

### 4.4 Auto-verification is a security hole
**File:** `context/AuthContext.jsx`, `submitVerification`
Any driver can click "Submit for verification" and be instantly verified. There's no document upload, no admin review, no KYC. A malicious user could sign up as a driver and appear to passengers as verified.

### 4.5 OSRM demo server is unreliable
**File:** `services/routing.js`
The public demo at `router.project-osrm.org` explicitly says "not for production use." It rate-limits, goes down periodically, and has no CORS guarantees. Every route polyline and ETA depends on it.

### 4.6 No rate limiting or duplicate prevention on bookings
**File:** `services/api.js`, `createBooking`
There's no check for duplicate bookings (same user, same trip, same seats). No rate limit. A fast double-tap on "Confirm" could create two bookings. The Supabase insert has no unique constraint on (user_id, trip_id, seat combination).

### 4.7 Seat availability is racey
**File:** `services/api.js`, `searchTrips` and `createBooking`
Seat availability is checked at search time (`bookedSeats` subquery) but not re-validated at booking time. Two users searching simultaneously see the same seats available. Both can book seat 12A. No optimistic locking, no Supabase function with a transaction.

### 4.8 `todayISO()` is called at module load time
**File:** `pages/driver/DriverTripManager.jsx:19`
`const todayISO = () => format(new Date(), 'yyyy-MM-dd')` is fine (it's a function), but `DriverContext.jsx` and `DriverDashboard.jsx` import `todayISO` from `data/driverTrips.js` where it's also a function. However, the assigned trip is memoized with `useMemo(() => generateAssignedTrip(userId, todayISO()), [userId])` — the dependency array doesn't include the date. If a driver leaves the app open past midnight, they'll see yesterday's assigned trip until they refresh.

### 4.9 Relay broadcasts are unauthenticated
**File:** `services/relay.js`
Any connected client can broadcast `hail:accept`, `ticket:checkedin`, `driver:online`, etc. on the Supabase Realtime channel. There's no server-side validation that the broadcaster is who they claim to be. A malicious client could spoof driver positions, accept hails for other drivers, or mark tickets as checked in.

### 4.10 No error boundaries
**File:** `App.jsx`
There are no React error boundaries. A runtime error in any component (e.g., a null access in a deeply nested trip object) crashes the entire app with a white screen. At minimum, wrap each route in an error boundary that shows a "something went wrong" screen and a retry button.

### 4.11 Supabase anon key is in client-side code
**File:** `lib/supabase.js`
This is expected for Supabase (the anon key is designed to be public), but it means **RLS is the only security boundary**. Every RLS policy must be airtight. Currently they are reasonable, but any new table must have RLS enabled and policies added — there's no safety net if someone forgets.

### 4.12 Distance calculation is approximate
**File:** `pages/driver/DriverTripManager.jsx:76-80`
Uses equirectangular approximation for distance (straight-line with cos correction). For Ghana's road network, actual driving distance can be 1.3-2x the straight-line distance. Passengers and drivers see misleadingly low distances and durations (estimated at 56 km/h on the straight-line distance).
