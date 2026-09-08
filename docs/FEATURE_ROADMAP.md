# Akwaaba Express — Feature Roadmap

> Version 1.0 — September 2026
> Reference: Feature Research v2 (September 2026)

This document describes planned features for Akwaaba Express, organised by implementation phase. Each feature includes its rationale, technical approach, affected files, database changes, and acceptance criteria.

---

## Table of Contents

- [Phase 1: Quick Wins](#phase-1-quick-wins-days)
  - [1.1 Offline Boarding Pass](#11-offline-boarding-pass)
  - [1.2 Seat Integrity Constraint](#12-seat-integrity-constraint)
  - [1.3 Approved Fare Display](#13-approved-fare-display)
  - [1.4 GitHub Actions Keep-Alive](#14-github-actions-keep-alive)
  - [1.5 Haptic Feedback](#15-haptic-feedback)
  - [1.6 Paystack Idempotency](#16-paystack-idempotency)
  - [1.7 Scheduled Database Backups](#17-scheduled-database-backups)
- [Phase 2: Medium Features](#phase-2-medium-features-weeks)
  - [2.1 Parcel Booking Module](#21-parcel-booking-module)
  - [2.2 Digital Queue Position](#22-digital-queue-position)
  - [2.3 Historical ETA Model](#23-historical-eta-model)
- [Phase 3: External Integrations](#phase-3-external-integrations)
  - [3.1 SMS Notifications](#31-sms-notifications)
  - [3.2 USSD Booking Channel](#32-ussd-booking-channel)
  - [3.3 Twi Localisation](#33-twi-localisation)
  - [3.4 Error Tracking (Sentry)](#34-error-tracking-sentry)
  - [3.5 Privacy-First Analytics](#35-privacy-first-analytics)

---

## Phase 1: Quick Wins (Days)

### 1.1 Offline Boarding Pass

**Rationale (Research §5):** A passenger out of data must still board. The boarding pass must work offline — non-negotiable differentiator. Terminal environments have unreliable connectivity, and passengers commonly run out of data mid-journey.

**What it does:** After a booking is confirmed, the app caches the QR code, booking reference, seat numbers, route, and departure time into IndexedDB. The Ticket page checks IndexedDB first and renders the boarding pass even with no network.

**Technical approach:**

```
New file: src/services/offlineStore.js
```

- Use the browser's native IndexedDB API (no library needed) with a `tickets` object store.
- On booking confirmation (`Payment.jsx`, after `setConfirmed(booking)`), write the complete ticket payload to IndexedDB:
  ```
  {
    id: booking.id,
    qrValue: booking.qrValue,
    seats: booking.seats,
    amount: booking.amount,
    status: booking.status,
    passengerName: booking.passengers[0]?.name,
    route: routeLabel,
    departTime: minutesToClock(trip.departMins),
    dateISO: trip.dateISO,
    operatorName: operator?.name,
    cachedAt: Date.now()
  }
  ```
- On `Ticket.jsx` mount, if the Supabase fetch fails or times out (3 seconds), fall back to IndexedDB lookup by booking ID.
- Display a subtle "Offline ticket" badge when rendering from cache so the user knows data may be stale.
- Clean up cached tickets older than 7 days on app launch.

**Files affected:**
| File | Change |
|------|--------|
| `src/services/offlineStore.js` | New — IndexedDB open/read/write/cleanup helpers |
| `src/pages/Payment.jsx` | Cache ticket after `setConfirmed()` |
| `src/pages/Ticket.jsx` | Add IndexedDB fallback on fetch failure |
| `src/components/OfflineBadge.jsx` | New — small badge component |

**Database changes:** None.

**Acceptance criteria:**
- [ ] Book a ticket, enable airplane mode, navigate to `/ticket/{id}` — QR code and details render
- [ ] Cached tickets older than 7 days are automatically removed
- [ ] Online tickets still fetch fresh data from Supabase (cache is fallback only)

---

### 1.2 Seat Integrity Constraint

**Rationale (Research §3):** "A boarding pass cryptographically tied to one seat, verified offline, with a stated refund if the seat isn't there. A database constraint as a marketing feature." The current booking path checks seat availability in application code on the client — exactly the bug that produces overbooking.

**What it does:** Adds a `UNIQUE` constraint on `(trip_id, seat_number)` in Postgres and wraps the booking insert in a database function (transaction), so two passengers can never hold the same seat on the same trip regardless of race conditions.

**Technical approach:**

```
New file: supabase/migrations/0009_seat_integrity.sql
```

- The `bookings` table currently stores seats as `text[]`. Seat integrity requires a normalised join table or a row-per-seat approach. The cleanest path:

  1. Create a `booked_seats` table:
     ```sql
     CREATE TABLE public.booked_seats (
       trip_id     uuid NOT NULL REFERENCES public.trips(id),
       seat_number int  NOT NULL,
       booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
       UNIQUE (trip_id, seat_number)
     );
     ```
  2. Create a Postgres function `book_seats(p_user_id, p_trip_id, p_seats, p_amount, ...)` that:
     - Opens a transaction
     - Inserts into `bookings`
     - Inserts each seat into `booked_seats`
     - If the UNIQUE constraint fires, the whole transaction rolls back and returns an error
     - Returns the new booking row on success
  3. Call this function from the client via `supabase.rpc('book_seats', {...})` instead of the current `supabase.from('bookings').insert(...)`.

- Backfill existing bookings: a one-time migration that iterates current `bookings` rows and inserts their `seats[]` into `booked_seats`.

**Files affected:**
| File | Change |
|------|--------|
| `supabase/migrations/0009_seat_integrity.sql` | New — table, constraint, RPC function, backfill |
| `src/services/api.js` (`createBooking`) | Replace `.insert()` with `supabase.rpc('book_seats', ...)` |
| `src/pages/SeatSelection.jsx` | Show error toast if seat conflict is returned |

**Database changes:** New `booked_seats` table; new `book_seats` RPC function; UNIQUE constraint on `(trip_id, seat_number)`.

**Acceptance criteria:**
- [ ] Two users selecting the same seat concurrently — second user gets "Seat already taken" error, not a double booking
- [ ] Cancelling a booking removes the `booked_seats` rows (CASCADE)
- [ ] Existing bookings are backfilled into `booked_seats` without duplicates

---

### 1.3 Approved Fare Display

**Rationale (Research §3):** "Show the approved fare next to the charged fare. Near-zero cost, directly addresses the top complaint in the market." June 2026 reporting documents fares charged at nearly double approved rates.

**What it does:** Trip cards and the TripDetails page show both the operator's listed fare and the government-approved fare for the route, giving passengers transparency.

**Technical approach:**

- Add an `approved_fare` column to the `trips` table (nullable integer, in pesewas like `price`).
- Alternatively, create an `approved_fares` reference table keyed on `(from_id, to_id)` with the GPRTU/government-approved fare per route. This is more maintainable since approved fares don't change per trip.

  ```sql
  CREATE TABLE public.approved_fares (
    from_id  text NOT NULL REFERENCES public.cities(id),
    to_id    text NOT NULL REFERENCES public.cities(id),
    fare     int  NOT NULL,
    source   text DEFAULT 'GPRTU',
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (from_id, to_id)
  );
  ```

- Seed with known approved fares (e.g., Kaneshie-Kasoa: GHS 8.50).
- On the `TripCard` component, if `approvedFare` exists for the route and differs from the trip price, show it:
  ```
  GHS 45  (approved: GHS 38)
  ```
- On `TripDetails.jsx`, show the approved fare below the main fare with a shield/check icon and "GPRTU approved fare" label.

**Files affected:**
| File | Change |
|------|--------|
| `supabase/migrations/00XX_approved_fares.sql` | New table + seed data |
| `src/services/api.js` (`searchTrips`, `getTrip`) | Join/fetch approved fares |
| `src/components/TripCard.jsx` | Show approved fare when available |
| `src/pages/TripDetails.jsx` | Show approved fare section |

**Database changes:** New `approved_fares` table with RLS (readable by everyone).

**Acceptance criteria:**
- [ ] Trip cards show "Approved: GHS X" when an approved fare exists for that route
- [ ] Routes without approved fare data show only the operator fare (no empty badge)
- [ ] Admin can update approved fares via Supabase dashboard

---

### 1.4 GitHub Actions Keep-Alive

**Rationale (Research §10):** "Free projects with no database activity for seven consecutive days are automatically paused and must be manually resumed. For a project being demonstrated after a quiet week, that is a catastrophic failure mode."

**What it does:** A scheduled GitHub Actions workflow pings the Supabase database every 3 days to prevent auto-pause. Also serves as CI evidence.

**Technical approach:**

```
New file: .github/workflows/keep-alive.yml
```

```yaml
name: Supabase Keep-Alive
on:
  schedule:
    - cron: '0 6 */3 * *'   # Every 3 days at 06:00 UTC
  workflow_dispatch:          # Manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          curl -sf "${{ secrets.SUPABASE_URL }}/rest/v1/cities?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

**Setup required:**
1. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository secrets in GitHub Settings > Secrets
2. These are the same values already in the app's `.env` file

**Files affected:**
| File | Change |
|------|--------|
| `.github/workflows/keep-alive.yml` | New workflow |

**Database changes:** None.

**Acceptance criteria:**
- [ ] Workflow runs every 3 days (visible in GitHub Actions tab)
- [ ] Manual trigger works via `workflow_dispatch`
- [ ] Supabase project does not auto-pause after inactivity

---

### 1.5 Haptic Feedback

**Rationale (Research §11):** "Capacitor's Haptics plugin on three moments only — booking confirmed, QR scanned, payment success. Restraint reads as polish; ubiquitous animation reads as a student project."

**What it does:** Adds a brief vibration on exactly three user actions: booking confirmed, QR ticket scanned by driver, and payment success.

**Technical approach:**

```
New file: src/services/haptics.js
```

- Install `@capacitor/haptics`:
  ```bash
  npm install @capacitor/haptics
  npx cap sync
  ```

- Create a thin wrapper that no-ops on web (PWA in browser has no haptics):
  ```js
  import { Capacitor } from '@capacitor/core';
  import { Haptics, ImpactStyle } from '@capacitor/haptics';

  export const hapticSuccess = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: 'success' });
    }
  };

  export const hapticLight = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };
  ```

- Call `hapticSuccess()` in:
  1. `Payment.jsx` — inside `finalize()` after `setConfirmed(booking)`
  2. `DriverScanTicket.jsx` — after successful QR scan validation
  3. `Payment.jsx` — inside `onSuccess` callback from Paystack

**Files affected:**
| File | Change |
|------|--------|
| `src/services/haptics.js` | New — haptic wrapper |
| `src/pages/Payment.jsx` | Add hapticSuccess() on confirm |
| `src/pages/driver/DriverScanTicket.jsx` | Add hapticSuccess() on valid scan |
| `package.json` | Add @capacitor/haptics |
| `android/` | `npx cap sync` updates native project |

**Database changes:** None.

**Acceptance criteria:**
- [ ] Android APK vibrates on booking confirmation, scan success, and payment success
- [ ] No crash on web/PWA (graceful no-op)
- [ ] No haptics on any other interaction (restraint)

---

### 1.6 Paystack Idempotency

**Rationale (Research §6):** "Ghanaian network conditions produce duplicate submissions. Key every charge on the booking reference and reject repeats server-side."

**What it does:** Ensures that if a payment request is sent twice (due to network retry, double-tap, etc.), only one booking is created.

**Technical approach:**

- The app already generates a `payment_ref` via `uid('TXN')` in `api.js`. This is the idempotency key.
- Add a `UNIQUE` constraint on `bookings.payment_ref`:
  ```sql
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payment_ref_unique UNIQUE (payment_ref);
  ```
- In `createBooking`, if the insert fails with a unique violation on `payment_ref`, query the existing booking with that ref and return it instead of throwing. This makes the operation safely retryable.
- On the Paystack side, pass the `reference` parameter to `initPaystack()` with the pre-generated booking ref so Paystack itself deduplicates charges:
  ```js
  initPaystack({
    reference: bookingRef,  // AKWAABA-XXXXXX
    email: user.email,
    amount: total,
    ...
  });
  ```

**Files affected:**
| File | Change |
|------|--------|
| `supabase/migrations/00XX_idempotency.sql` | Add UNIQUE on payment_ref |
| `src/services/api.js` | Generate ref before insert; handle duplicate gracefully |
| `src/pages/Payment.jsx` | Pass reference to initPaystack() |
| `src/services/paystack.js` | Accept reference parameter |

**Database changes:** UNIQUE constraint on `bookings.payment_ref`.

**Acceptance criteria:**
- [ ] Tapping "Pay" rapidly never creates duplicate bookings
- [ ] Paystack receives a consistent reference per booking attempt
- [ ] If the insert detects a duplicate ref, the existing booking is returned

---

### 1.7 Scheduled Database Backups

**Rationale (Research §10):** "The free tier also has no backups and no point-in-time recovery. A scheduled pg_dump via GitHub Actions to private storage is sufficient and demonstrable."

**What it does:** A GitHub Actions workflow runs `pg_dump` against the Supabase database on a schedule and stores the SQL dump as a workflow artifact (retained for 30 days).

**Technical approach:**

```
New file: .github/workflows/backup.yml
```

```yaml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * 0'    # Weekly, Sunday 02:00 UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install PostgreSQL client
        run: sudo apt-get install -y postgresql-client

      - name: Dump database
        run: |
          pg_dump "${{ secrets.SUPABASE_DB_URL }}" \
            --no-owner --no-privileges \
            -f backup_$(date +%Y%m%d_%H%M%S).sql

      - name: Upload backup artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: backup_*.sql
          retention-days: 30
```

**Setup required:**
1. Add `SUPABASE_DB_URL` as a repository secret (found in Supabase Dashboard > Settings > Database > Connection string > URI)
2. Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

**Files affected:**
| File | Change |
|------|--------|
| `.github/workflows/backup.yml` | New workflow |

**Database changes:** None (read-only operation).

**Acceptance criteria:**
- [ ] Backup runs weekly and on manual trigger
- [ ] SQL dump artifact is downloadable from GitHub Actions
- [ ] Dump is restorable: `psql < backup.sql` against a fresh database succeeds

---

## Phase 2: Medium Features (Weeks)

### 2.1 Parcel Booking Module

**Rationale (Research §3):** "The strongest differentiator is parcels, not seats." Sending goods by intercity bus is mass-market and entirely analogue in Ghana. STC runs a formal parcel division; VIP does it too. No tracking, no proof of delivery, no prepayment, no dispute record. Better margin than seats, no seat consumed, and it gives users a reason to open the app between journeys (retention).

**What it does:** Passengers can book a parcel shipment on any scheduled trip. The flow: describe the parcel (size category, description), enter recipient details, pay via Paystack, receive a QR waybill. Driver scans at load, scans at collection. Recipient gets SMS on dispatch and arrival. Photo proof of collection.

**Technical approach:**

**Database — new tables:**

```sql
-- Parcel size categories with pricing
CREATE TABLE public.parcel_categories (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  max_kg      numeric NOT NULL,
  base_price  int NOT NULL        -- pesewas
);

INSERT INTO public.parcel_categories VALUES
  ('small',  'Small',  'Documents, small packages (up to 5kg)', 5,  1500),
  ('medium', 'Medium', 'Medium boxes (5-15kg)',                 15, 3000),
  ('large',  'Large',  'Large items (15-30kg)',                 30, 5000);

-- Parcel bookings
CREATE TABLE public.parcels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL REFERENCES public.trips(id),
  category_id     text NOT NULL REFERENCES public.parcel_categories(id),
  description     text NOT NULL,
  status          text NOT NULL DEFAULT 'booked'
                    CHECK (status IN ('booked','loaded','in_transit','arrived','collected','disputed')),
  -- Sender
  sender_name     text NOT NULL,
  sender_phone    text NOT NULL,
  -- Recipient
  recipient_name  text NOT NULL,
  recipient_phone text NOT NULL,
  -- Payment
  amount          numeric NOT NULL,
  payment_ref     text UNIQUE,
  -- Tracking
  waybill_ref     text NOT NULL UNIQUE,   -- e.g. AKW-P-XXXXXX
  loaded_at       timestamptz,
  loaded_photo    text,                    -- Supabase Storage URL
  arrived_at      timestamptz,
  collected_at    timestamptz,
  collection_photo text,                   -- proof of collection
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX parcels_user_idx ON public.parcels(user_id);
CREATE INDEX parcels_trip_idx ON public.parcels(trip_id);
CREATE INDEX parcels_waybill_idx ON public.parcels(waybill_ref);
```

**New pages and components:**

| File | Purpose |
|------|---------|
| `src/pages/Parcels.jsx` | Parcel history list (like Trips.jsx for parcels) |
| `src/pages/SendParcel.jsx` | Multi-step form: select route/date, category, description, recipient, pay |
| `src/pages/ParcelTracking.jsx` | Track a single parcel by waybill ref |
| `src/components/ParcelCard.jsx` | Summary card for parcel list |
| `src/components/ParcelStatus.jsx` | Status stepper (booked > loaded > in transit > arrived > collected) |
| `src/pages/driver/DriverParcelScan.jsx` | Driver scans QR at load and at collection, takes photo |

**App changes:**

- Add "Send Parcel" button on Home page alongside "Book a Seat"
- Add parcel tab to BottomNav or as a section in the existing Trips page
- Add `/parcels`, `/send-parcel`, `/parcel/:waybillRef` routes
- Driver side: add parcel scan option alongside ticket scan
- Generate QR waybill containing `{origin}/parcel/{waybillRef}` — reuses existing QR infrastructure
- Two scan events per parcel: `scan-at-load` (driver loads onto bus) and `scan-at-collection` (recipient collects)

**Acceptance criteria:**
- [ ] Passenger can book a parcel on a scheduled trip, pay via Paystack, receive QR waybill
- [ ] Driver scans waybill QR at loading — parcel status updates to "loaded"
- [ ] Driver scans waybill QR at destination — parcel status updates to "arrived"
- [ ] Photo proof captured at collection
- [ ] Parcel history visible on passenger's Parcels page
- [ ] Waybill reference is human-readable (can be read aloud at a station)

---

### 2.2 Digital Queue Position

**Rationale (Research §3):** "Passengers queue one to three hours; paper numbering collapses when a bus arrives. Take a position from the app or by USSD, get an SMS when your bus is 20 minutes out. Novel, cheap, and grounded in observed behaviour."

**What it does:** Before arriving at the terminal, a passenger joins a virtual queue for their route and departure. They receive a queue number and a notification when their bus is within 20 minutes of boarding.

**Technical approach:**

**Database:**

```sql
CREATE TABLE public.queue_positions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id     uuid NOT NULL REFERENCES public.trips(id),
  position    int NOT NULL,
  status      text NOT NULL DEFAULT 'waiting'
                CHECK (status IN ('waiting','called','boarded','expired')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  called_at   timestamptz,
  UNIQUE (trip_id, user_id)  -- one position per user per trip
);

-- Function to atomically assign next position
CREATE FUNCTION public.join_queue(p_user_id uuid, p_trip_id uuid)
RETURNS int AS $$
DECLARE
  next_pos int;
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos
  FROM public.queue_positions WHERE trip_id = p_trip_id;

  INSERT INTO public.queue_positions (user_id, trip_id, position)
  VALUES (p_user_id, p_trip_id, next_pos);

  RETURN next_pos;
END;
$$ LANGUAGE plpgsql;
```

**New pages:**

| File | Purpose |
|------|---------|
| `src/pages/QueuePosition.jsx` | Shows the passenger's queue number, estimated wait, and position in line |
| `src/components/QueueBadge.jsx` | Small badge on trip card showing "Queue #4" |

**Flow:**
1. On `TripDetails.jsx`, add a "Join Queue" button (alongside "Select Seats")
2. Calls `supabase.rpc('join_queue', { p_user_id, p_trip_id })`
3. Returns the position number — navigate to `QueuePosition.jsx`
4. QueuePosition subscribes to Supabase Realtime on the `queue_positions` table for updates
5. When the driver starts the trip (status changes to `in_progress`), passengers in the queue with positions near the front get a push notification: "Your bus is boarding — you're #3 in line"
6. Queue expires automatically after the trip departs

**Acceptance criteria:**
- [ ] Passenger can join queue for a trip and sees their position number
- [ ] Position number updates in real time as others join
- [ ] Notification fires when the trip status changes to boarding
- [ ] Queue positions expire after trip departure
- [ ] One position per user per trip (no duplicates)

---

### 2.3 Historical ETA Model

**Rationale (Research §9):** "You already collect driver GPS traces through live tracking. That telemetry is a proprietary ETA dataset for exactly the corridors you serve. Compute historical median travel times per route per departure hour from your own data. It costs nothing, improves with usage, and no competitor can replicate it without your fleet."

**What it does:** Instead of relying on static distance-based duration estimates, the app builds a historical ETA model from actual trip completion data. Over time, ETAs become more accurate based on real travel times by route and time of day.

**Technical approach:**

**Database:**

```sql
-- Store completed trip telemetry
CREATE TABLE public.trip_telemetry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES public.trips(id),
  from_id       text NOT NULL,
  to_id         text NOT NULL,
  depart_hour   int NOT NULL,           -- 0-23, hour of departure
  actual_mins   int NOT NULL,           -- actual travel time in minutes
  day_of_week   int NOT NULL,           -- 0=Sunday, 6=Saturday
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX telemetry_route_idx ON public.trip_telemetry(from_id, to_id, depart_hour);

-- View for median travel times
CREATE VIEW public.route_eta_stats AS
SELECT
  from_id,
  to_id,
  depart_hour,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_mins) AS median_mins,
  COUNT(*) AS sample_count
FROM public.trip_telemetry
GROUP BY from_id, to_id, depart_hour;
```

**How data flows in:**
1. When a driver completes a trip (`DriverContext.jsx` — `completeTrip`), record the actual duration:
   ```js
   const actualMins = Math.round((Date.now() - tripStartTime) / 60000);
   supabase.from('trip_telemetry').insert({
     trip_id: trip.id,
     from_id: trip.fromId,
     to_id: trip.toId,
     depart_hour: Math.floor(trip.departMins / 60),
     actual_mins: actualMins,
     day_of_week: new Date().getDay()
   });
   ```

**How data flows out:**
1. `api.searchTrips()` and `api.getTrip()` query `route_eta_stats` for the route and departure hour
2. If `sample_count >= 5`, use `median_mins` as the displayed duration instead of the static `duration_mins`
3. Show a small label: "Based on 23 trips" to build trust

**Files affected:**
| File | Change |
|------|--------|
| `supabase/migrations/00XX_telemetry.sql` | New table + view |
| `src/context/DriverContext.jsx` | Record actual duration on trip completion |
| `src/services/api.js` | Blend historical ETA into trip results |
| `src/components/TripCard.jsx` | Show "Based on N trips" when available |

**Acceptance criteria:**
- [ ] Completed trips record actual travel time to `trip_telemetry`
- [ ] After 5+ data points, trip cards show the historical median instead of static estimate
- [ ] Static estimate is still used as fallback when insufficient data exists
- [ ] "Based on N trips" label visible when historical data is used

---

## Phase 3: External Integrations

These features require external service accounts or resources beyond the codebase.

### 3.1 SMS Notifications

**Rationale (Research §7):** Confirmation, departure reminder, parcel dispatch/arrival. Not marketing — transactional messages only.

**What it does:** Send SMS to passengers on four events: booking confirmed, departure reminder (1 hour before), parcel dispatched, parcel arrived at destination.

**Prerequisite:** Arkesel account with API key (free signup with sandbox). SMS costs from GHS 0.02 per message.

**Technical approach:**

```
New file: src/services/sms.js (or Supabase Edge Function)
```

- Use Arkesel's REST API: `POST https://sms.arkesel.com/api/v2/sms/send`
- Sender ID: `AKWAABA` (must be registered with Arkesel)
- SMS should be sent server-side (Edge Function or webhook) to protect the API key
- Messages are short and actionable:
  ```
  Booking confirmed! Accra→Kumasi, 14 Sep, 7:30am.
  Seat 12. Ref: AKW-X4F92K. Show QR at boarding.
  ```
  ```
  Reminder: Your bus departs in 1 hour.
  Accra→Kumasi, Seat 12. Ref: AKW-X4F92K.
  ```

**Setup steps:**
1. Create Arkesel account at arkesel.com
2. Register sender ID `AKWAABA`
3. Add API key as Supabase Edge Function secret or environment variable
4. Create Edge Functions for each SMS trigger
5. Set up Supabase database webhooks to trigger Edge Functions on booking/parcel status changes

**Acceptance criteria:**
- [ ] SMS sent on booking confirmation with reference and details
- [ ] Departure reminder SMS sent 1 hour before travel time
- [ ] Parcel dispatch and arrival SMS sent to recipient
- [ ] No SMS sent for cancelled bookings

---

### 3.2 USSD Booking Channel

**Rationale (Research §7):** "At ~55% of MoMo transactions, this is the credibility feature." A complete journey without a smartphone: search by route and date, view fares, reserve, pay by MoMo, receive the reference by SMS.

**Prerequisite:** Arkesel USSD setup (requires short code registration with NCA Ghana).

**What it does:** Feature phone users dial a short code (e.g., `*713*46#`) and navigate a text menu to search trips, select a seat, pay via MoMo prompt, and receive a booking reference by SMS.

**Technical approach:**

- Arkesel provides a USSD callback URL model: each user interaction hits your endpoint with `sessionId`, `phoneNumber`, `text` (accumulated input), and `serviceCode`
- Implement as a Supabase Edge Function or standalone Node.js service
- Menu flow:
  ```
  Welcome to Akwaaba Express
  1. Book a trip
  2. Check booking
  3. Send parcel

  [1] Select origin
  1. Accra  2. Kumasi  3. Tamale ...

  [1] Select destination
  ...

  [1] Select date
  1. Today  2. Tomorrow  3. Enter date

  Available trips:
  1. STC 7:30am GHS45 (12 seats)
  2. VIP 9:00am GHS72 (8 seats)

  [1] Confirm: Accra→Kumasi, 7:30am, GHS45
  Pay with MoMo? (1=Yes, 2=Cancel)
  ```
- On confirmation, trigger MoMo payment prompt via Paystack, then send booking reference by SMS

**Setup steps:**
1. Register USSD short code with NCA via Arkesel
2. Configure callback URL to Edge Function endpoint
3. Implement session-based menu state machine
4. Integrate with existing booking API

**Acceptance criteria:**
- [ ] Full booking flow completable via USSD on a feature phone
- [ ] Booking reference sent by SMS after successful payment
- [ ] Booking reference can be read aloud to station officer for boarding (no QR needed)
- [ ] USSD session times out gracefully after 3 minutes of inactivity

---

### 3.3 Twi Localisation

**Rationale (Research §5):** "Twi first if anything, then Ewe or Ga. Be honest: a half-translated interface is worse than an English one." The document recommends scoping translation to SMS and USSD copy first if native speaker review is not available.

**Prerequisite:** Native Twi speaker to review all translations. `react-i18next` library.

**What it does:** Adds Twi as a language option in the app, with a toggle in Profile settings. All user-facing strings are externalised to translation files.

**Technical approach:**

- Install `react-i18next` and `i18next`:
  ```bash
  npm install react-i18next i18next i18next-browser-languagedetector
  ```
- Create translation files:
  ```
  src/locales/en/translation.json
  src/locales/tw/translation.json
  ```
- Wrap the app with `I18nextProvider`
- Replace hardcoded strings with `t('key')` calls
- Add language toggle in `Profile.jsx`
- Store preference in localStorage

**Phased approach (per the research document):**
1. **Phase A (SMS/USSD only):** Translate the ~30 SMS templates and USSD menu strings. Fewest strings, audience most likely to need it.
2. **Phase B (Core app):** Translate booking flow, ticket, and navigation strings (~150 keys).
3. **Phase C (Full app):** Translate all remaining UI strings (~400 keys).

**Acceptance criteria:**
- [ ] Language toggle in Profile switches between English and Twi
- [ ] All user-facing strings in the booking flow render in the selected language
- [ ] SMS messages sent in the user's preferred language
- [ ] All translations reviewed by a native Twi speaker

---

### 3.4 Error Tracking (Sentry)

**Rationale:** Production error monitoring is essential for a transport app where failures affect real journeys. The research document lists Sentry as a recommended tool.

**Prerequisite:** Sentry account (free tier: 5K errors/month, 10K transactions/month).

**What it does:** Automatically captures unhandled exceptions, promise rejections, and API errors with full stack traces, device info, and user context.

**Technical approach:**

- Install `@sentry/react`:
  ```bash
  npm install @sentry/react
  ```
- Initialise in `main.jsx`:
  ```js
  import * as Sentry from '@sentry/react';
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
  ```
- Wrap `<App />` with `Sentry.ErrorBoundary` for React component errors
- Add Sentry user context after login: `Sentry.setUser({ id: user.id })`
- Add breadcrumbs for key actions: booking, payment, scan

**Setup steps:**
1. Create Sentry project (React platform)
2. Add `VITE_SENTRY_DSN` to `.env`
3. Configure source maps upload in the Vite build (optional but recommended)

**Acceptance criteria:**
- [ ] Unhandled errors appear in Sentry dashboard with stack traces
- [ ] Errors include user ID and device info
- [ ] No sensitive data (passwords, payment details) sent to Sentry
- [ ] Error boundary shows a friendly fallback UI instead of a white screen

---

### 3.5 Privacy-First Analytics

**Rationale:** Understanding usage patterns (which routes are popular, where users drop off in the booking flow) without compromising user privacy. The research document recommends Umami or Plausible as privacy-first alternatives to Google Analytics.

**Prerequisite:** Self-hosted Umami instance (free, open source) or Plausible Cloud ($9/month).

**What it does:** Tracks page views, booking funnel completion rates, and feature usage without cookies or personal data collection. GDPR-compliant by design.

**Technical approach (Umami):**

- Deploy Umami to a free hosting platform (Vercel, Railway, or Supabase Edge)
- Add the tracking script to `index.html`:
  ```html
  <script async defer
    data-website-id="YOUR_WEBSITE_ID"
    src="https://your-umami-instance.vercel.app/script.js">
  </script>
  ```
- Track custom events for key funnel steps:
  ```js
  // In booking flow pages
  window.umami?.track('booking-started', { route: 'accra-kumasi' });
  window.umami?.track('seats-selected', { count: 2 });
  window.umami?.track('payment-completed', { method: 'card', amount: 45 });
  ```

**Key metrics to track:**
- Booking funnel: Search > Trip Details > Seat Selection > Passengers > Payment > Confirmed
- Drop-off points in the funnel
- Most popular routes and times
- Feature adoption: live tracking, parcel booking, queue position
- Device and browser distribution

**Setup steps:**
1. Deploy Umami instance (one-click deploy to Vercel)
2. Create website in Umami dashboard
3. Add tracking script to `index.html`
4. Add custom event tracking to key pages

**Acceptance criteria:**
- [ ] Page views tracked without cookies or personal data
- [ ] Booking funnel metrics visible in Umami dashboard
- [ ] No impact on app performance (async script loading)
- [ ] Analytics data accessible to the project team

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| 1.1 Offline Boarding Pass | High | Small | P0 |
| 1.2 Seat Integrity Constraint | High | Small | P0 |
| 1.3 Approved Fare Display | Medium | Small | P1 |
| 1.4 GitHub Actions Keep-Alive | Critical | Tiny | P0 |
| 1.5 Haptic Feedback | Low | Tiny | P2 |
| 1.6 Paystack Idempotency | High | Small | P0 |
| 1.7 Scheduled Backups | Medium | Tiny | P1 |
| 2.1 Parcel Booking Module | Very High | Large | P1 |
| 2.2 Digital Queue Position | High | Medium | P2 |
| 2.3 Historical ETA Model | Medium | Medium | P2 |
| 3.1 SMS Notifications | High | Medium | P1 |
| 3.2 USSD Booking Channel | High | Large | P3 |
| 3.3 Twi Localisation | Medium | Large | P3 |
| 3.4 Error Tracking (Sentry) | Medium | Small | P2 |
| 3.5 Privacy-First Analytics | Low | Small | P3 |

**P0** = Before demonstration. **P1** = Before submission. **P2** = If time permits. **P3** = Post-submission.
