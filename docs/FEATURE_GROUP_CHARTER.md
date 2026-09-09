# Group Charter — Feature Specification

> Akwaaba Express — Smart Mobility, Group Charter, Ghanaian Hospitality

## Overview

Group Charter lets organisations (churches, schools, companies, event planners, wedding parties, tour groups) book an entire bus for a private trip. Unlike seat-by-seat booking, a charter is a single transaction for the whole vehicle, with one person acting as the **Group Organiser** who manages the passenger list, receives a quotation, and handles payment.

This feature reuses existing infrastructure (QR tickets, driver scanner, live tracking, Paystack) while adding a new booking flow, pricing engine, and passenger management layer.

---

## User Roles

| Role | Who | Capabilities |
|------|-----|-------------|
| **Group Organiser** | Any registered passenger | Creates charter request, manages passenger list, pays |
| **Admin** | Akwaaba staff | Reviews charter requests, assigns buses, approves quotations |
| **Driver** | Assigned driver | Receives charter assignment, scans passenger QR codes, runs trip |

---

## User Flow

### Organiser Side

```
Home page
  └─ "Group Charter" chip (alongside "Book ahead" and "Live now")
      └─ Charter Request form
          ├─ Trip details (pickup, destination, date, return date)
          ├─ Group details (passengers, event type, special requirements)
          └─ Submit request
              └─ Quotation screen (estimated price)
                  ├─ Accept → Payment (deposit or full)
                  │   └─ Charter confirmed
                  │       └─ Passenger Management page
                  │           ├─ Add passengers manually
                  │           ├─ Share invite link
                  │           └─ Each passenger gets QR boarding pass
                  └─ Reject / Negotiate
```

### Admin Side

```
Admin Dashboard → Charters tab
  ├─ Pending requests (review, assign bus, set final price)
  ├─ Active charters (ongoing trips)
  └─ Completed / Cancelled
```

### Driver Side

```
Driver Dashboard → Charter assignment notification
  ├─ View charter details (route, passenger count, organiser contact)
  ├─ Scan passenger QR codes at boarding
  └─ Start / complete trip (same as regular trips)
```

---

## Database Schema

### New tables

```sql
-- Charter event types
CREATE TABLE public.charter_event_types (
  id    text PRIMARY KEY,
  label text NOT NULL
);

INSERT INTO public.charter_event_types (id, label) VALUES
  ('church',     'Church / Religious'),
  ('school',     'School / Educational'),
  ('corporate',  'Corporate / Business'),
  ('wedding',    'Wedding / Ceremony'),
  ('funeral',    'Funeral'),
  ('excursion',  'Tour / Excursion'),
  ('sports',     'Sports Team'),
  ('other',      'Other');

-- Charter requests
CREATE TABLE public.charters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending',      -- waiting for admin review
                        'quoted',       -- admin set price, waiting for organiser
                        'accepted',     -- organiser accepted quote
                        'deposit_paid', -- partial payment received
                        'confirmed',    -- fully paid, bus assigned
                        'in_progress',  -- trip started
                        'completed',    -- trip finished
                        'cancelled'     -- cancelled by either party
                      )),
  -- Trip details
  pickup_city_id    text REFERENCES public.cities(id),
  pickup_address    text NOT NULL,
  dest_city_id      text REFERENCES public.cities(id),
  dest_address      text NOT NULL,
  depart_date       date NOT NULL,
  depart_time       text NOT NULL,           -- e.g. "07:30"
  return_date       date,                    -- null = one-way
  return_time       text,
  is_return_trip    boolean NOT NULL DEFAULT false,
  -- Group details
  passenger_count   int NOT NULL,
  event_type_id     text REFERENCES public.charter_event_types(id),
  group_name        text NOT NULL,           -- "Grace Baptist Church"
  special_requests  text DEFAULT '',         -- "wheelchair access, cooler box"
  -- Assignment (filled by admin)
  bus_type_id       text REFERENCES public.bus_types(id),
  operator_id       text REFERENCES public.operators(id),
  driver_id         uuid REFERENCES auth.users(id),
  plate             text,
  -- Pricing
  estimated_price   numeric,                 -- auto-calculated estimate
  quoted_price      numeric,                 -- admin-set final price
  deposit_amount    numeric,                 -- required deposit (e.g. 50%)
  deposit_paid      numeric DEFAULT 0,
  balance_paid      numeric DEFAULT 0,
  -- Payment
  payment_ref       text UNIQUE,
  deposit_ref       text,
  balance_ref       text,
  -- Metadata
  charter_ref       text NOT NULL UNIQUE,    -- e.g. "AKW-C-XXXXXX"
  admin_notes       text DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX charters_organiser_idx ON public.charters(organiser_id);
CREATE INDEX charters_status_idx ON public.charters(status);
CREATE INDEX charters_date_idx ON public.charters(depart_date);

-- Charter passengers (managed by the organiser)
CREATE TABLE public.charter_passengers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charter_id  uuid NOT NULL REFERENCES public.charters(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text DEFAULT '',
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'boarded', 'no_show')),
  qr_value    text,                          -- unique QR for this passenger
  boarded_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX charter_passengers_charter_idx ON public.charter_passengers(charter_id);

-- RLS policies
ALTER TABLE public.charter_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charter_passengers ENABLE ROW LEVEL SECURITY;

-- Event types: readable by everyone
CREATE POLICY "charter_event_types_readable"
  ON public.charter_event_types FOR SELECT USING (true);

-- Charters: organisers see their own; drivers see assigned; admins see all
CREATE POLICY "own_charters_select"
  ON public.charters FOR SELECT
  USING (
    auth.uid() = organiser_id
    OR auth.uid() = driver_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "own_charters_insert"
  ON public.charters FOR INSERT
  WITH CHECK (auth.uid() = organiser_id);

CREATE POLICY "own_charters_update"
  ON public.charters FOR UPDATE
  USING (
    auth.uid() = organiser_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Charter passengers: organiser and driver of that charter can read/write
CREATE POLICY "charter_passengers_select"
  ON public.charter_passengers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.charters c
    WHERE c.id = charter_id
    AND (c.organiser_id = auth.uid() OR c.driver_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  ));

CREATE POLICY "charter_passengers_insert"
  ON public.charter_passengers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.charters c
    WHERE c.id = charter_id AND c.organiser_id = auth.uid()
  ));

CREATE POLICY "charter_passengers_update"
  ON public.charter_passengers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.charters c
    WHERE c.id = charter_id
    AND (c.organiser_id = auth.uid() OR c.driver_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  ));
```

### Migration file

```
supabase/migrations/00XX_group_charter.sql
```

---

## Pricing Engine

The estimated price is computed client-side to give the organiser an instant ballpark. The admin can override with a final quoted price.

### Formula

```
estimatedPrice = baseFare + distanceCost + durationCost + returnMultiplier

Where:
  baseFare      = busType.charterBase         (e.g. GHS 2,000 for standard)
  distanceCost  = distance_km × ratePerKm     (e.g. GHS 5/km)
  durationCost  = estimated_hours × ratePerHr (e.g. GHS 100/hr for driver + fuel)
  returnMultiplier = isReturn ? 1.8 : 1.0     (not 2x — return leg is faster)
```

### Bus type base rates (seed data)

| Bus Type | Seats | Charter Base (GHS) | Per Km (GHS) | Per Hour (GHS) |
|----------|-------|--------------------|--------------|----------------|
| Mini Coach | 18 | 1,200 | 3.50 | 60 |
| Standard | 44 | 2,000 | 5.00 | 100 |
| VIP | 33 | 3,000 | 7.00 | 140 |

These rates are stored in a new `charter_rates` column group on `bus_types` or a separate `charter_pricing` table so the admin can update them from the dashboard.

### Deposit

Default deposit is 50% of the quoted price. The organiser pays the deposit to confirm, then the balance is due 24 hours before departure. Both payments go through Paystack.

---

## New Pages

### Passenger Side

| Route | Page | Purpose |
|-------|------|---------|
| `/charter` | `CharterRequest.jsx` | Multi-step form to create a charter request |
| `/charter/:charterId` | `CharterDetails.jsx` | View charter status, quotation, payment, passenger list |
| `/charter/:charterId/passengers` | `CharterPassengers.jsx` | Add/edit/remove passengers, share invite link |
| `/charter/:charterId/ticket/:passengerId` | `CharterTicket.jsx` | Individual passenger boarding pass with QR |

### Admin Side

| Route | Page | Purpose |
|-------|------|---------|
| `/admin/charters` | `AdminCharters.jsx` | List all charter requests with status filters |
| `/admin/charters/:charterId` | `AdminCharterDetail.jsx` | Review request, assign bus/driver, set price, approve |

### Driver Side

| Route | Page | Purpose |
|-------|------|---------|
| `/driver/charter/:charterId` | `DriverCharterTrip.jsx` | View charter details, scan passengers, start/complete trip |

---

## Page Designs

### CharterRequest.jsx — Multi-step Form

**Step 1: Trip Details**
```
┌─────────────────────────────┐
│  ← Group Charter            │
│                              │
│  Pickup location             │
│  ┌─────────────────────────┐ │
│  │ 📍 Accra (Kaneshie)     │ │
│  └─────────────────────────┘ │
│                              │
│  Destination                 │
│  ┌─────────────────────────┐ │
│  │ 📍 Kumasi (Kejetia)     │ │
│  └─────────────────────────┘ │
│                              │
│  Departure date    Time      │
│  ┌────────────┐ ┌──────────┐ │
│  │ 20 Sep 2026│ │ 06:00 AM │ │
│  └────────────┘ └──────────┘ │
│                              │
│  ☐ Return trip               │
│  Return date       Time      │
│  ┌────────────┐ ┌──────────┐ │
│  │ 22 Sep 2026│ │ 04:00 PM │ │
│  └────────────┘ └──────────┘ │
│                              │
│  [ Next → ]                  │
└─────────────────────────────┘
```

**Step 2: Group Details**
```
┌─────────────────────────────┐
│  ← Group Details             │
│                              │
│  Group / organisation name   │
│  ┌─────────────────────────┐ │
│  │ Grace Baptist Church     │ │
│  └─────────────────────────┘ │
│                              │
│  Number of passengers        │
│  ┌──────┐                    │
│  │  60  │  [-] [+]           │
│  └──────┘                    │
│                              │
│  Event type                  │
│  [Church] [School] [Corp]    │
│  [Wedding] [Excursion] [+]   │
│                              │
│  Special requirements        │
│  ┌─────────────────────────┐ │
│  │ Wheelchair access,       │ │
│  │ cooler box for drinks    │ │
│  └─────────────────────────┘ │
│                              │
│  [ Get Quotation → ]         │
└─────────────────────────────┘
```

**Step 3: Quotation**
```
┌─────────────────────────────┐
│  ← Your Charter Quote        │
│                              │
│  ┌─────────────────────────┐ │
│  │  🚌 Standard Coach       │ │
│  │  44 seats                │ │
│  │  Accra → Kumasi          │ │
│  │  Return trip             │ │
│  │                          │ │
│  │  Estimated Cost          │ │
│  │  ┌───────────────────┐   │ │
│  │  │   GHS 8,500.00    │   │ │
│  │  └───────────────────┘   │ │
│  │                          │ │
│  │  Distance: 250 km        │ │
│  │  Duration: ~5 hrs        │ │
│  │  Bus type: Standard 44   │ │
│  │  Deposit (50%): GHS 4,250│ │
│  └─────────────────────────┘ │
│                              │
│  This is an estimate. Final  │
│  price confirmed by admin.   │
│                              │
│  [ Accept & Pay Deposit ]    │
│  [ Request Different Bus ]   │
└─────────────────────────────┘
```

### CharterPassengers.jsx — Passenger Management

```
┌─────────────────────────────┐
│  ← Passengers (12/60)        │
│                              │
│  ┌─────────────────────────┐ │
│  │ 🔗 Share invite link     │ │
│  │ Anyone with this link    │ │
│  │ can add themselves       │ │
│  └─────────────────────────┘ │
│                              │
│  [ + Add passenger ]         │
│                              │
│  1. John Mensah      ✅      │
│     024-XXX-XXXX   Confirmed │
│                              │
│  2. Ama Boateng      ✅      │
│     055-XXX-XXXX   Confirmed │
│                              │
│  3. Kofi Asante      ⏳      │
│     020-XXX-XXXX   Pending   │
│                              │
│  ...                         │
│                              │
│  [ Send QR to All ✉ ]        │
└─────────────────────────────┘
```

---

## API Functions

### New file: `src/services/charterApi.js`

```js
// Charter API — all Supabase calls for the charter feature

export const charterApi = {

  // Organiser creates a new charter request
  async createCharter(data, userId) { ... },

  // Fetch organiser's charters
  async getMyCharters(userId) { ... },

  // Fetch single charter with passengers
  async getCharter(charterId) { ... },

  // Calculate estimated price
  estimatePrice({ busTypeId, distanceKm, durationMins, isReturn }) { ... },

  // Add passengers (bulk)
  async addPassengers(charterId, passengers) { ... },

  // Remove passenger
  async removePassenger(passengerId) { ... },

  // Update passenger status (driver scans QR → 'boarded')
  async boardPassenger(passengerId) { ... },

  // Organiser accepts quote and pays deposit
  async payDeposit(charterId, paymentRef) { ... },

  // Pay remaining balance
  async payBalance(charterId, paymentRef) { ... },

  // Admin: list all charters with filters
  async listCharters(filters) { ... },

  // Admin: assign bus and driver, set quoted price
  async assignCharter(charterId, { busTypeId, operatorId, driverId, plate, quotedPrice }) { ... },

  // Admin: update charter status
  async updateCharterStatus(charterId, status) { ... },

  // Generate invite link for passenger self-registration
  getInviteLink(charterId) {
    return `${window.location.origin}/charter/${charterId}/join`;
  },

  // Subscribe to charter status changes (Realtime)
  subscribeToCharter(charterId, callback) { ... },
};
```

---

## Integration with Existing Systems

### Home Page

Add a third mode chip on `Home.jsx`:

```jsx
<button className={`chip${mode === 'charter' ? ' active' : ''}`}
  onClick={() => navigate('/charter')}>
  <Users size={15} /> Group Charter
</button>
```

### App.jsx — New Routes

```jsx
// Passenger charter routes
<Route path="/charter" element={<RequireAuth role="passenger"><CharterRequest /></RequireAuth>} />
<Route path="/charter/:charterId" element={<RequireAuth role="passenger"><CharterDetails /></RequireAuth>} />
<Route path="/charter/:charterId/passengers" element={<RequireAuth role="passenger"><CharterPassengers /></RequireAuth>} />
<Route path="/charter/:charterId/join" element={<RequireAuth role="passenger"><CharterJoin /></RequireAuth>} />
<Route path="/charter/:charterId/ticket/:passengerId" element={<RequireAuth role="passenger"><CharterTicket /></RequireAuth>} />

// Driver charter route
<Route path="/driver/charter/:charterId" element={<RequireAuth role="driver"><DriverCharterTrip /></RequireAuth>} />

// Admin charter routes (inside AdminLayout)
<Route path="charters" element={<AdminCharters />} />
<Route path="charters/:charterId" element={<AdminCharterDetail />} />
```

### Admin Sidebar

Add "Charters" nav item in `AdminLayout.jsx` between "Bookings" and "Trips".

### Driver Dashboard

Show assigned charters on `DriverDashboard.jsx` — a "Charter Assignment" card when the driver has an upcoming charter, with the group name, route, date, and passenger count.

### QR Scanning

The driver's existing `DriverScanTicket.jsx` scanner reads QR codes. Charter passenger QR codes use the same format:
```
{origin}/charter/{charterId}/ticket/{passengerId}
```
The scan handler checks if the URL contains `/charter/` and calls `charterApi.boardPassenger()` instead of the regular check-in flow.

### Notifications

Reuse `src/services/notifications.js` for:
- Organiser: "Your charter quote is ready" / "Charter confirmed" / "Driver assigned"
- Passengers: "You've been added to [Group Name] charter" / "Your boarding pass is ready"
- Driver: "New charter assignment: [Route] on [Date]"

### Paystack

Reuse `src/services/paystack.js` — charter payments are identical to regular booking payments, just larger amounts. Two transactions per charter:
1. Deposit payment (on acceptance)
2. Balance payment (before departure)

Both use the existing `initPaystack()` with the charter ref as the Paystack reference.

---

## New Files Summary

| File | Type | Purpose |
|------|------|---------|
| `supabase/migrations/00XX_group_charter.sql` | Migration | Tables, indexes, RLS policies, seed data |
| `src/services/charterApi.js` | Service | All charter Supabase calls and pricing |
| `src/pages/CharterRequest.jsx` | Page | Multi-step charter booking form |
| `src/pages/CharterDetails.jsx` | Page | View charter status, quote, payments |
| `src/pages/CharterPassengers.jsx` | Page | Manage passenger list |
| `src/pages/CharterJoin.jsx` | Page | Self-registration via invite link |
| `src/pages/CharterTicket.jsx` | Page | Individual passenger boarding pass |
| `src/pages/admin/AdminCharters.jsx` | Page | Admin charter list with filters |
| `src/pages/admin/AdminCharterDetail.jsx` | Page | Admin review, assign, price |
| `src/pages/driver/DriverCharterTrip.jsx` | Page | Driver charter trip view + scan |
| `src/components/CharterCard.jsx` | Component | Charter summary card for lists |
| `src/components/CharterStatus.jsx` | Component | Status stepper (pending → confirmed → completed) |
| `src/components/PassengerRow.jsx` | Component | Passenger list row with status badge |

### Modified files

| File | Change |
|------|--------|
| `src/pages/Home.jsx` | Add "Group Charter" mode chip |
| `src/App.jsx` | Add charter routes (passenger, driver, admin) |
| `src/pages/admin/AdminLayout.jsx` | Add "Charters" sidebar nav item |
| `src/pages/driver/DriverDashboard.jsx` | Show charter assignment card |
| `src/pages/driver/DriverScanTicket.jsx` | Handle charter QR format |
| `src/components/BottomNav.jsx` | No change needed (charters accessed from Home) |

---

## Status Flow Diagram

```
                    ┌──────────┐
          ┌────────>│ cancelled │
          │         └──────────┘
          │              ▲
          │              │ (either party)
          │              │
     ┌────┴───┐    ┌─────┴──┐    ┌──────────┐    ┌────────────┐
     │pending │───>│ quoted  │───>│ accepted │───>│deposit_paid│
     └────────┘    └────────┘    └──────────┘    └────────────┘
       organiser     admin sets    organiser       organiser
       submits       price         accepts         pays 50%
                                                       │
                                                       ▼
     ┌──────────┐    ┌────────────┐    ┌───────────┐
     │completed │<───│in_progress │<───│ confirmed │
     └──────────┘    └────────────┘    └───────────┘
       driver ends     driver starts    balance paid
       trip            trip             + bus assigned
```

---

## Acceptance Criteria

### Organiser
- [ ] Can create a charter request from Home page
- [ ] Sees estimated price instantly after entering trip details
- [ ] Can accept quotation and pay deposit via Paystack
- [ ] Can add passengers manually (name + phone)
- [ ] Can share invite link for passengers to self-register
- [ ] Each passenger receives a unique QR boarding pass
- [ ] Can view charter status updates in real time
- [ ] Can pay remaining balance before departure
- [ ] Can cancel charter (refund policy shown)

### Admin
- [ ] Sees all charter requests in admin dashboard
- [ ] Can assign bus type, operator, driver, and plate
- [ ] Can set final quoted price (overriding estimate)
- [ ] Can approve or reject charter requests
- [ ] Can add admin notes

### Driver
- [ ] Sees charter assignment on dashboard
- [ ] Can view passenger list and group details
- [ ] Can scan individual passenger QR codes at boarding
- [ ] Scan updates passenger status to "boarded" in real time
- [ ] Can start and complete charter trip
- [ ] Passenger board count visible: "23/60 boarded"

### System
- [ ] Charter ref format: `AKW-C-XXXXXX` (distinguishable from booking refs)
- [ ] Deposit and balance are separate Paystack transactions
- [ ] QR codes work offline (cached in IndexedDB like regular tickets)
- [ ] RLS prevents organisers from seeing other organisers' charters
- [ ] Charter status changes are broadcast via Supabase Realtime

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | Database migration (tables, RLS, seed) | Small |
| 2 | `charterApi.js` service + pricing engine | Medium |
| 3 | `CharterRequest.jsx` multi-step form | Medium |
| 4 | `CharterDetails.jsx` status + quotation view | Medium |
| 5 | `CharterPassengers.jsx` passenger management | Medium |
| 6 | `CharterTicket.jsx` QR boarding pass | Small |
| 7 | `AdminCharters.jsx` + `AdminCharterDetail.jsx` | Medium |
| 8 | `DriverCharterTrip.jsx` + scan integration | Small |
| 9 | Home page integration + route wiring | Small |
| 10 | Realtime subscriptions + notifications | Small |

**Total estimated effort:** 3–5 sessions
