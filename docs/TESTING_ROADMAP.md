# Akwaaba Express — Testing Roadmap

> Version 1.0 — September 2026

This document breaks the application into testable systems and catalogues every test to write, organised by layer: **unit**, **integration**, and **system (E2E)**. Use it to plan testing sessions — each section is scoped to fit within a single conversation.

---

## Table of Contents

- [Current State](#current-state)
- [Testing Stack](#testing-stack)
- [System Map](#system-map)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [System (E2E) Tests](#system-e2e-tests)
- [CI Pipeline](#ci-pipeline)
- [Session Planning Guide](#session-planning-guide)

---

## Current State

### Existing tests (11 files)

| File | Layer | What it covers |
|------|-------|----------------|
| `src/utils/format.test.js` | Unit | formatCedi, formatMinutes, minutesToClock, isValidGhanaCard, initialsOf |
| `src/utils/geo.test.js` | Unit | Geo utility functions |
| `src/utils/random.test.js` | Unit | UID generation |
| `src/services/storage.test.js` | Unit | localStorage wrapper |
| `src/services/paystack.test.js` | Unit | PAYSTACK_CHANNELS map, initPaystack setup |
| `src/services/notifications.test.js` | Unit | Notification permission and send |
| `src/services/routing.test.js` | Unit | Routing service |
| `src/services/api.test.js` | Unit | mapBooking mapper |
| `src/services/api.integration.test.js` | Integration | Full booking row mapping (scheduled, live, cancelled) |
| `src/context/BookingContext.test.jsx` | Integration | Draft lifecycle, localStorage persistence |
| `src/context/ThemeContext.test.jsx` | Unit | Theme toggle |
| `src/context/ToastContext.test.jsx` | Unit | Toast display |
| `e2e/auth.spec.js` | E2E | Welcome, sign-in, sign-up page structure + validation |
| `e2e/navigation.spec.js` | E2E | Page navigation, password toggle, password checklist |
| `e2e/payment.spec.js` | E2E | Payment redirect for unauthed user |

### Coverage gaps

- **No component tests** — zero React component render tests
- **No context tests** for AuthContext, TripsContext, DriverContext
- **No service tests** for adminApi, relay, liveTracking, driverHail, deepLink
- **No hook tests** — useGeolocation, useNearbyBuses, useRelay, useBriefLoad, useDriverHail
- **No page tests** — none of the 25+ page components have render tests
- **No driver-side E2E** — scan, manifest, trip management untested
- **No authenticated E2E flows** — booking funnel, trip viewing, profile update
- **No admin E2E** — dashboard, user management, booking management

---

## Testing Stack

| Tool | Purpose | Config |
|------|---------|--------|
| **Vitest 4.x** | Unit + integration tests | `vite.config.js` → `test` block |
| **@testing-library/react** | Component rendering | `src/test/setup.js` loads jest-dom matchers |
| **@testing-library/jest-dom** | DOM assertions | Auto-loaded via setup |
| **Playwright** | E2E browser tests | `playwright.config.js` (or defaults) |
| **renderWithProviders** | Test helper | `src/test/helpers.jsx` — wraps in MemoryRouter + ToastProvider |

### Test commands

```bash
npm test              # vitest run (all unit + integration)
npm run test:watch    # vitest in watch mode
npm run test:e2e      # playwright test (all E2E specs)
```

---

## System Map

The app divides into 7 systems. Each system is tested at all three layers.

```
┌─────────────────────────────────────────────────────┐
│                    SYSTEMS                          │
├──────────────┬──────────────┬───────────────────────┤
│ 1. Auth      │ 2. Booking   │ 3. Trips & Tickets   │
│   SignIn     │   Search     │   Trips (history)    │
│   SignUp     │   TripDetails│   Ticket             │
│   ResetPw    │   SeatSelect │   TicketDriver       │
│   VerifyOtp  │   Passengers │                      │
│   AuthContext│   Payment    │                      │
│              │   BookingCtx │                      │
├──────────────┼──────────────┼───────────────────────┤
│ 4. Live      │ 5. Driver    │ 6. Admin             │
│   LiveBuses  │   Dashboard  │   AdminOverview      │
│   LiveTrack  │   ActiveTrip │   AdminUsers         │
│   BusMap     │   Manifest   │   AdminBookings      │
│   liveTrack  │   ScanTicket │   AdminTrips         │
│   relay      │   TripMgr    │   AdminRoutes        │
│   driverHail │   Earnings   │   AdminDrivers       │
│              │   Profile    │   AdminDocuments     │
│              │   DriverCtx  │   adminApi           │
├──────────────┴──────────────┴───────────────────────┤
│ 7. Shared Infrastructure                            │
│   format, geo, random, sound, storage, notifications│
│   cities, operators, PasswordChecklist, Avatar      │
│   SeatMap, Header, EmptyState, BottomNav, Skeleton  │
│   OfflineBanner, OfflineGate, CityPicker, DatePicker│
└─────────────────────────────────────────────────────┘
```

---

## Unit Tests

Unit tests run in Vitest with JSDOM. No network, no Supabase, no browser. Mock external dependencies with `vi.mock()`.

### Session U1: Utility Functions (expand existing)

**Files:** `src/utils/format.js`, `src/utils/geo.js`, `src/utils/random.js`, `src/utils/sound.js`, `src/utils/driverInfo.js`

Already covered: `format.test.js`, `geo.test.js`, `random.test.js`

**New tests to write:**

```
src/utils/sound.test.js
├── playBeep — calls AudioContext when available
├── playBeep — no-ops when AudioContext is undefined
└── playBeep — handles AudioContext creation error

src/utils/driverInfo.test.js
├── driverInfoFor — returns driver name and phone from trip
├── driverInfoFor — returns fallback when trip has no driver
└── driverInfoFor — handles null trip
```

**Estimated: ~8 tests, 15 minutes**

---

### Session U2: Data Layer

**Files:** `src/data/cities.js`, `src/data/operators.js`, `src/data/liveBuses.js`, `src/data/localDestinations.js`, `src/data/driverTrips.js`

**Tests to write:**

```
src/data/cities.test.js
├── cityById — returns city object for valid ID
├── cityById — returns undefined for unknown ID
├── cityCode — returns 3-letter uppercase code
├── cityCode — handles null input
├── CITIES — contains Accra, Kumasi, Tamale (spot check)
└── CITIES — every city has id, name, region, lat, lng

src/data/operators.test.js
├── operatorById — returns operator for valid ID
├── operatorById — returns undefined for unknown ID
├── busTypeById — returns bus type for valid ID
├── busTypeById — returns undefined for unknown ID
├── OPERATORS_FALLBACK — has all required fields
├── BUS_TYPES_FALLBACK — each has seats, cols, amenities
└── BUS_TYPES — priceMult is numeric for all types
```

**Estimated: ~15 tests, 20 minutes**

---

### Session U3: Services (non-Supabase)

**Files:** `src/services/relay.js`, `src/services/liveTracking.js`, `src/services/nearbyBuses.js`, `src/services/driverHail.js`, `src/services/deepLink.js`

**Tests to write:**

```
src/services/relay.test.js
├── relay.send — dispatches BroadcastChannel message
├── relay.send — no-ops when BroadcastChannel unavailable
├── relay.on — registers listener
├── relay.off — removes listener
└── relay — handles unknown event types gracefully

src/services/liveTracking.test.js
├── getBuses — returns array of bus objects
├── getBuses — each bus has id, origin, operatorId, busTypeId
├── moveBuses — updates bus positions
├── bookSeat — decrements available seats
└── bookSeat — prevents booking when no seats left

src/services/nearbyBuses.test.js
├── generateNearbyBuses — returns buses near given position
├── generateNearbyBuses — returns empty array for null position
└── generateNearbyBuses — buses have required fields

src/services/driverHail.test.js
├── startHail — creates hail request with correct fields
├── cancelHail — marks hail as cancelled
└── acceptHail — returns driver assignment

src/services/deepLink.test.js
├── OAUTH_REDIRECT — contains correct redirect URL
├── setupDeepLinkListener — registers App listener on native
└── setupDeepLinkListener — no-ops on web
```

**Estimated: ~18 tests, 30 minutes**

---

### Session U4: Components (pure/presentational)

**Files:** `src/components/Header.jsx`, `src/components/EmptyState.jsx`, `src/components/Avatar.jsx`, `src/components/OperatorMark.jsx`, `src/components/Toggle.jsx`, `src/components/PasswordChecklist.jsx`, `src/components/SegmentedTabs.jsx`, `src/components/Skeleton.jsx`, `src/components/PhoneInput.jsx`

**Tests to write:**

```
src/components/Header.test.jsx
├── renders title text
├── renders back button when onBack provided
├── does not render back button by default
└── calls onBack when back button clicked

src/components/EmptyState.test.jsx
├── renders icon, title, and message
├── renders action button when provided
└── renders without action

src/components/Avatar.test.jsx
├── renders initials from name
├── renders with custom color
└── renders fallback for empty name

src/components/OperatorMark.test.jsx
├── renders operator mark text
├── renders with operator color background
└── renders fallback for null operator

src/components/Toggle.test.jsx
├── renders in off state
├── renders in on state
├── calls onChange on click
└── respects disabled prop

src/components/PasswordChecklist.test.jsx
├── shows all rules unchecked for empty password
├── checks length rule for 8+ chars
├── checks uppercase rule
├── checks lowercase rule
├── checks number rule
├── all rules checked for strong password
└── passwordMeetsRules returns true only when all rules pass

src/components/SegmentedTabs.test.jsx
├── renders all tab labels
├── highlights active tab
└── calls onChange with tab id on click

src/components/PhoneInput.test.jsx
├── renders with placeholder
├── accepts valid Ghana phone format
└── calls onChange with formatted value
```

**Estimated: ~28 tests, 45 minutes**

---

### Session U5: Complex Components

**Files:** `src/components/SeatMap.jsx`, `src/components/TripCard.jsx`, `src/components/LiveBusCard.jsx`, `src/components/CityPicker.jsx`, `src/components/DatePicker.jsx`, `src/components/BusMap.jsx`, `src/components/BottomNav.jsx`

**Tests to write:**

```
src/components/SeatMap.test.jsx
├── renders correct number of seats for bus type
├── marks taken seats as disabled
├── selects seat on click
├── deselects seat on second click
├── limits selection to max allowed
├── does not allow selecting taken seats
└── renders driver seat as non-interactive

src/components/TripCard.test.jsx
├── renders operator name and mark
├── renders route (from → to)
├── renders departure and arrival times
├── renders price in GHS
├── renders seats available count
├── calls onSelect when clicked
└── renders approved fare when provided (future)

src/components/LiveBusCard.test.jsx
├── renders bus route name
├── renders ETA
├── renders seat count
└── shows online indicator

src/components/CityPicker.test.jsx
├── renders city list
├── filters cities by search text
├── calls onSelect with city id
└── highlights currently selected city

src/components/DatePicker.test.jsx
├── renders calendar for current month
├── highlights selected date
├── calls onChange with date string
├── disables past dates
└── navigates between months

src/components/BottomNav.test.jsx
├── renders 4 nav items (Home, Live, Trips, Profile)
├── highlights active route
└── navigates on click
```

**Estimated: ~30 tests, 60 minutes**

---

### Session U6: Admin API

**File:** `src/services/adminApi.js`

**Tests to write (mock Supabase):**

```
src/services/adminApi.test.js
├── getStats — returns user, booking, trip counts + revenue
├── getStats — handles empty data gracefully
├── getRecentBookings — returns mapped booking list
├── getRecentBookings — respects limit parameter
├── getRecentTrips — returns trip list
├── getDailyRevenue — returns revenue by date for given days
├── getDailyRevenue — handles no bookings (returns zeros)
├── getUsers — returns paginated user list
├── getUsers — applies search filter
├── subscribeToBookings — returns cleanup function
├── subscribeToBookings — calls callback on new booking
└── subscribeToBookings — handles subscription error
```

**Estimated: ~12 tests, 30 minutes**

---

## Integration Tests

Integration tests run in Vitest but test multiple modules together. Supabase is mocked at the client level. React contexts are tested with real providers.

### Session I1: Auth Context

**File to create:** `src/context/AuthContext.test.jsx`

Mock `src/lib/supabase.js` to return controlled auth state.

```
src/context/AuthContext.test.jsx
├── provides null user when not authenticated
├── provides user object after successful sign-in
├── signUp creates profile and sets user
├── signUp with driver role sets verification_status to pending
├── signOut clears user state
├── updateProfile merges updated fields into user
├── handles session restore on mount (onAuthStateChange)
├── redirects to correct home based on role (passenger vs driver)
├── isAuthed is false during loading
├── handles sign-in error (invalid credentials)
├── handles sign-up error (duplicate email)
└── guest sign-in sets is_guest flag
```

**Estimated: ~12 tests, 45 minutes**

---

### Session I2: Trips Context

**File to create:** `src/context/TripsContext.test.jsx`

Mock Supabase to return controlled booking data.

```
src/context/TripsContext.test.jsx
├── fetches bookings on mount for authenticated user
├── bookings are mapped via mapBooking
├── addBooking appends to booking list
├── cancelBooking updates status to cancelled
├── cancelBooking removes booking from Supabase
├── refetch reloads bookings from Supabase
├── handles empty booking list
├── does not fetch when user is null
└── handles fetch error gracefully
```

**Estimated: ~9 tests, 30 minutes**

---

### Session I3: Driver Context

**File to create:** `src/context/DriverContext.test.jsx`

Mock Supabase for trips and profiles.

```
src/context/DriverContext.test.jsx
├── provides active trip from state
├── startTrip updates trip status to in_progress
├── completeTrip updates trip status to completed
├── rollDayIfNeeded handles date boundary
├── assigns incoming request to driver
├── rejects request when already on a trip
├── handles null user gracefully
├── persists state to localStorage
└── useMemo dependency includes user
```

**Estimated: ~9 tests, 30 minutes**

---

### Session I4: Booking Flow (multi-context)

**File to create:** `src/flows/booking.integration.test.jsx`

Test the complete booking data flow across BookingContext + api.createBooking.

```
src/flows/booking.integration.test.jsx
├── full scheduled booking: start → seats → passengers → payment → confirm
│   ├── draft accumulates correct state at each step
│   ├── createBooking sends correct payload to Supabase
│   ├── returned booking has id, qrValue, amount, status
│   └── reset clears draft after confirmation
├── full live booking: start → passengers → payment → confirm
│   ├── trip_id is null for live bookings
│   └── live_route is set from trip.routeName
├── booking with cancelled payment: draft persists, not reset
└── double-booking prevention: same ref returns existing booking
```

**Estimated: ~10 tests, 45 minutes**

---

### Session I5: Admin Dashboard Data

**File to create:** `src/pages/admin/AdminOverview.integration.test.jsx`

Test the AdminOverview page renders correctly with mocked adminApi data.

```
src/pages/admin/AdminOverview.integration.test.jsx
├── renders stat cards with correct counts
├── renders revenue chart with daily data
├── date range buttons update revenue query
├── global search finds users by name
├── global search finds bookings by route
├── global search shows empty state for no results
├── live feed renders new bookings in real time
├── auto-refresh updates stats every 30 seconds
└── handles API error gracefully (shows error state)
```

**Estimated: ~9 tests, 45 minutes**

---

### Session I6: Page Render Tests (Passenger)

**Files:** All passenger pages — verify they render without crashing with mocked data.

```
src/pages/Home.test.jsx
├── renders welcome message with user name
├── renders quick booking card
├── renders recent bookings section
└── renders live bus CTA

src/pages/Search.test.jsx
├── renders city selectors and date
├── renders trip cards for search results
├── renders empty state for no results
├── filter chips filter by bus type
└── sort chips reorder results

src/pages/SeatSelection.test.jsx
├── renders seat map for selected trip
├── renders empty state when no trip
└── proceed button disabled until seats selected

src/pages/Passengers.test.jsx
├── renders form for each selected seat
├── validates required name field
└── proceed button disabled until all names filled

src/pages/Profile.test.jsx
├── renders user info (name, email, phone)
├── renders password change section
├── requires current password for password change
├── shows password checklist
└── renders theme toggle
```

**Estimated: ~20 tests, 60 minutes**

---

### Session I7: Page Render Tests (Driver)

**Files:** All driver pages with mocked DriverContext.

```
src/pages/driver/DriverDashboard.test.jsx
├── renders greeting with driver name
├── renders active trip card when on a trip
├── renders "no active trip" when idle
├── renders today's completed trips count
└── handles null operator/busType gracefully

src/pages/driver/DriverScanTicket.test.jsx
├── renders scanner view
├── shows passenger info on valid scan
├── shows error on invalid QR
├── prevents double-scan of same ticket
└── scan-again button resets state

src/pages/driver/DriverTripManager.test.jsx
├── renders trip list for driver
├── cancel trip shows confirmation
├── cancel text says "This action cannot be undone"
└── handles empty trip list

src/pages/driver/DriverProfile.test.jsx
├── renders driver info
├── notification toggle persists to localStorage
└── shows vehicle plate when available
```

**Estimated: ~18 tests, 45 minutes**

---

## System (E2E) Tests

E2E tests run in Playwright against the dev server. They test real page navigation, form submission, and UI behaviour. Supabase calls hit the real API (use test accounts or mock at the network level).

### Session E1: Auth Flows (expand existing)

**File:** `e2e/auth.spec.js` — extend with authenticated flows.

```
e2e/auth.spec.js (new tests)
├── S15: Sign-up with valid data shows success or redirects
├── S16: Sign-in with valid test account reaches Home
├── S17: Sign-out returns to Welcome
├── S18: Password reset page loads and shows email field
├── S19: Role-based redirect — passenger goes to /, driver goes to /driver
└── S20: Protected route redirect — /trips without auth goes to /welcome
```

**Prerequisite:** Test Supabase account credentials stored in `.env.test` or Playwright config.

**Estimated: ~6 tests, 30 minutes**

---

### Session E2: Booking Funnel

**File to create:** `e2e/booking.spec.js`

The golden path: Home → Search → TripDetails → SeatSelection → Passengers → Payment → Ticket.

```
e2e/booking.spec.js
├── B1: Search page loads with default route (Accra → Kumasi)
├── B2: Changing cities updates search results
├── B3: Trip card click navigates to TripDetails
├── B4: TripDetails shows operator, times, amenities, price
├── B5: Select Seats button navigates to SeatSelection
├── B6: Seat map renders clickable seats
├── B7: Selecting seats enables Continue button
├── B8: Passengers page shows form per seat
├── B9: Filling passenger names enables Continue
├── B10: Payment page shows correct total (seats × price + fee)
├── B11: Payment method cards are selectable
└── B12: Cancelling payment returns to payment page (no booking created)
```

**Estimated: ~12 tests, 60 minutes**

---

### Session E3: Trips & Tickets

**File to create:** `e2e/trips.spec.js`

```
e2e/trips.spec.js
├── T1: Trips page shows upcoming and past tabs
├── T2: Switching tabs shows correct bookings
├── T3: Booking card shows route, date, seat count, amount
├── T4: Clicking booking navigates to Ticket page
├── T5: Ticket page shows QR code
├── T6: Ticket page shows passenger name and seat
├── T7: Ticket page shows operator and departure info
├── T8: Cancel booking button shows on upcoming tickets
├── T9: Cancelling a booking updates its status badge
└── T10: Countdown banner shows for upcoming scheduled trips
```

**Estimated: ~10 tests, 45 minutes**

---

### Session E4: Live Bus Tracking

**File to create:** `e2e/live.spec.js`

```
e2e/live.spec.js
├── L1: Live buses page renders map
├── L2: Bus cards appear below the map
├── L3: Clicking a bus card navigates to LiveTracking
├── L4: LiveTracking shows bus on map
├── L5: LiveTracking shows operator info in bottom sheet
├── L6: Book button navigates to Passengers page
└── L7: Back button returns to live buses list
```

**Estimated: ~7 tests, 30 minutes**

---

### Session E5: Driver Flows

**File to create:** `e2e/driver.spec.js`

**Prerequisite:** Test driver account.

```
e2e/driver.spec.js
├── D1: Driver dashboard loads with greeting
├── D2: Active trip card shows route and status
├── D3: Manifest page shows passenger list
├── D4: Scan page opens camera/scanner view
├── D5: Trip manager shows driver's trips
├── D6: Cancel trip shows confirmation dialog
├── D7: Earnings page shows summary
├── D8: Driver profile shows notification toggle
├── D9: Vehicle setup page loads
└── D10: Driver bottom nav highlights correct tab
```

**Estimated: ~10 tests, 45 minutes**

---

### Session E6: Admin Dashboard

**File to create:** `e2e/admin.spec.js`

**Prerequisite:** Test admin account (user with role='admin' in profiles table).

```
e2e/admin.spec.js
├── A1: /admin without auth redirects to /admin/login
├── A2: Admin login page loads
├── A3: Non-admin user redirected back to login
├── A4: Admin dashboard loads with stat cards
├── A5: Sidebar navigation works (Users, Bookings, Trips, Routes, Drivers)
├── A6: Users page shows user list with roles
├── A7: Bookings page shows booking list
├── A8: Trips page shows trip list
├── A9: Revenue chart renders with data
├── A10: Global search returns results
└── A11: Date range buttons update revenue chart
```

**Estimated: ~11 tests, 45 minutes**

---

### Session E7: Profile & Settings

**File to create:** `e2e/profile.spec.js`

```
e2e/profile.spec.js
├── P1: Profile page shows user name and email
├── P2: Edit name saves successfully
├── P3: Password change requires current password
├── P4: Wrong current password shows error
├── P5: Weak new password blocked by checklist
├── P6: Theme toggle switches dark/light mode
├── P7: Sign out button returns to Welcome
└── P8: Saved places section renders
```

**Estimated: ~8 tests, 30 minutes**

---

### Session E8: Edge Cases & Error States

**File to create:** `e2e/errors.spec.js`

```
e2e/errors.spec.js
├── X1: 404 page renders for unknown route
├── X2: Ticket page shows "not found" for invalid booking ID
├── X3: TripDetails shows "not found" for invalid trip ID
├── X4: Search with no results shows empty state
├── X5: Offline banner appears when network disconnected
├── X6: App recovers when network reconnects
└── X7: Deep link to /ticket/:id loads correct ticket
```

**Estimated: ~7 tests, 30 minutes**

---

## CI Pipeline

### GitHub Actions workflow

**File to create:** `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test -- --reporter=verbose --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: [lint, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  e2e-tests:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Pipeline stages

```
push/PR → lint → unit tests → build → E2E tests
                     │
                     └── coverage report (artifact)
```

---

## Session Planning Guide

Use this to decide which testing session to run next. Each session is designed to fit within a single conversation's token budget.

### Recommended order

| Order | Session | Tests | Time | Dependencies |
|-------|---------|-------|------|--------------|
| 1 | **U1** Utility functions | ~8 | 15m | None |
| 2 | **U2** Data layer | ~15 | 20m | None |
| 3 | **U4** Presentational components | ~28 | 45m | None |
| 4 | **U3** Services | ~18 | 30m | None |
| 5 | **I1** AuthContext | ~12 | 45m | Supabase mock pattern |
| 6 | **I2** TripsContext | ~9 | 30m | AuthContext mock |
| 7 | **I3** DriverContext | ~9 | 30m | AuthContext mock |
| 8 | **U5** Complex components | ~30 | 60m | Data mocks |
| 9 | **U6** Admin API | ~12 | 30m | Supabase mock |
| 10 | **I4** Booking flow | ~10 | 45m | BookingContext + api mocks |
| 11 | **I5** Admin dashboard | ~9 | 45m | adminApi mock |
| 12 | **I6** Passenger pages | ~20 | 60m | All context mocks |
| 13 | **I7** Driver pages | ~18 | 45m | DriverContext mock |
| 14 | **CI** Pipeline setup | — | 20m | None |
| 15 | **E1** Auth E2E | ~6 | 30m | Dev server + test accounts |
| 16 | **E2** Booking E2E | ~12 | 60m | Auth E2E (login helper) |
| 17 | **E3** Trips & Tickets E2E | ~10 | 45m | Booking E2E (needs bookings) |
| 18 | **E4** Live buses E2E | ~7 | 30m | Auth E2E |
| 19 | **E5** Driver E2E | ~10 | 45m | Driver test account |
| 20 | **E6** Admin E2E | ~11 | 45m | Admin test account |
| 21 | **E7** Profile E2E | ~8 | 30m | Auth E2E |
| 22 | **E8** Error states E2E | ~7 | 30m | Auth E2E |

### How to start a session

Paste this in your next conversation:

> Run testing session **[ID]** from `docs/TESTING_ROADMAP.md`. Write all tests listed for that session, run them, and fix any failures.

### Test count summary

| Layer | Sessions | Total tests |
|-------|----------|-------------|
| Unit | U1–U6 | ~111 |
| Integration | I1–I7 | ~87 |
| E2E | E1–E8 | ~71 |
| **Total** | **22 sessions** | **~269 tests** |
