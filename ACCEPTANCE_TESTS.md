# Acceptance Test Checklist — Akwaaba Express

Manual tests to verify the app meets all functional requirements before submission.
Test on Chrome (desktop) and Chrome (mobile/phone) for full coverage.

---

## A1: Authentication

- [ ] **A1.1** New passenger can sign up with name, email, phone, password
- [ ] **A1.2** New driver can sign up by selecting "Driver" role toggle
- [ ] **A1.3** Existing user can sign in with email and password
- [ ] **A1.4** Google OAuth sign-in works and creates a profile
- [ ] **A1.5** Guest sign-in works and lands on passenger home
- [ ] **A1.6** Password reset link can be requested via "Forgot password"
- [ ] **A1.7** Sign out clears session and redirects to welcome page
- [ ] **A1.8** Unauthenticated user is redirected to /welcome on any protected route

## A2: Trip Search & Booking (Passenger)

- [ ] **A2.1** Home page shows city picker (from/to) and date selector
- [ ] **A2.2** Search returns trips with correct route, operator, bus type, departure time
- [ ] **A2.3** Trip details page shows amenities, price, and available seats
- [ ] **A2.4** Seat selection allows picking available seats (taken seats are blocked)
- [ ] **A2.5** Passenger details form collects name, phone, and optional ID for each seat
- [ ] **A2.6** Multiple passengers can be added (one per seat)

## A3: Payment

- [ ] **A3.1** Payment page shows selected trip, passengers, and price breakdown
- [ ] **A3.2** Card payment via Paystack popup completes successfully (use test card 4084 0840 8408 4081)
- [ ] **A3.3** After payment, booking is created in Supabase with status "confirmed"
- [ ] **A3.4** Mobile money methods show "Available soon" badge and are disabled
- [ ] **A3.5** "Secured by Paystack" badge is visible

## A4: Ticket & QR

- [ ] **A4.1** After booking, ticket page shows QR code, trip details, and passenger info
- [ ] **A4.2** QR code contains a valid booking URL
- [ ] **A4.3** Ticket shows correct operator, bus type, plate, departure time, and seats
- [ ] **A4.4** Driver view of ticket (/ticket/:id/driver) shows passenger manifest

## A5: Trip History (Passenger)

- [ ] **A5.1** "Trips" tab shows all past and upcoming bookings
- [ ] **A5.2** Tapping a trip shows full ticket details
- [ ] **A5.3** Trips are sorted by date (newest first)

## A6: Live Buses (Passenger)

- [ ] **A6.1** Live tab shows map with bus markers
- [ ] **A6.2** Tapping a bus marker shows driver info, route, and available seats
- [ ] **A6.3** Passenger can book a seat on a live bus

## A7: Driver Dashboard

- [ ] **A7.1** Driver sees dashboard with today's assigned trip
- [ ] **A7.2** Online/offline toggle changes driver status
- [ ] **A7.3** Live mode vs scheduled mode toggle works
- [ ] **A7.4** Live destination picker opens and allows suburb selection
- [ ] **A7.5** Today's earnings, km, and trip count display correctly
- [ ] **A7.6** "View manifest" shows passengers booked on the trip

## A8: Driver Trip Management

- [ ] **A8.1** Driver can create a new scheduled trip with route, date, and time
- [ ] **A8.2** Driver can view upcoming trips list
- [ ] **A8.3** Driver can cancel an upcoming trip
- [ ] **A8.4** Driver earnings page shows today/weekly/history tabs with correct totals

## A9: Driver QR Scanner

- [ ] **A9.1** Scan ticket page opens camera (requires HTTPS)
- [ ] **A9.2** Scanning a valid booking QR checks in the passenger
- [ ] **A9.3** Check-in triggers a browser notification to the passenger

## A10: Vehicle Setup (Driver)

- [ ] **A10.1** Driver can set operator, bus type, plate, vehicle model, and color
- [ ] **A10.2** Saving sends verification status to "pending"
- [ ] **A10.3** Vehicle info appears on the driver's ticket view for passengers

## A11: Profile

- [ ] **A11.1** Profile page shows name, email, phone, and avatar
- [ ] **A11.2** User can update name and phone
- [ ] **A11.3** Ghana Card can be set once (then becomes read-only)
- [ ] **A11.4** Dark mode toggle works and persists
- [ ] **A11.5** Notification toggle enables/disables browser notifications
- [ ] **A11.6** Saved places can be added and removed

## A12: Notifications

- [ ] **A12.1** Browser notification permission is requested on sign-in
- [ ] **A12.2** Booking confirmation triggers a notification
- [ ] **A12.3** Check-in triggers a notification on the passenger's device
- [ ] **A12.4** Notification toggle in profile controls whether notifications are sent

## A13: Admin Dashboard (Web Only)

- [ ] **A13.1** /admin loads with sidebar navigation (Overview, Users, Bookings, Trips)
- [ ] **A13.2** Overview shows KPI cards: total users, bookings, trips, revenue
- [ ] **A13.3** Recent bookings table shows on overview page
- [ ] **A13.4** Users page lists all profiles with role filter and search
- [ ] **A13.5** Bookings page lists all bookings with status filter and cancel/restore actions
- [ ] **A13.6** Trips page lists all trips with status filter and cancel/reactivate actions
- [ ] **A13.7** Pagination works across all list pages
- [ ] **A13.8** Sidebar collapses to icons on narrow screens

## A14: PWA & Offline

- [ ] **A14.1** App can be installed as PWA (Add to Home Screen)
- [ ] **A14.2** App loads with splash screen animation (~3.5s)
- [ ] **A14.3** App icon and name appear correctly when installed
- [ ] **A14.4** Page transitions animate smoothly (slide + fade)

## A15: Cross-Device

- [ ] **A15.1** App renders correctly on iPhone Safari
- [ ] **A15.2** App renders correctly on Android Chrome
- [ ] **A15.3** App renders correctly on desktop Chrome (1920x1080)
- [ ] **A15.4** Admin dashboard is usable on tablet (768px+)

---

**Test environment:**
- Dev server: `https://localhost:5175`
- Supabase project: `gkjxfafapeiizojjrmzr`
- Paystack test card: `4084 0840 8408 4081`, Expiry: any future date, CVV: 408, OTP: 123456

**Tested by:** ___________________  **Date:** ___________________

**Result:** _____ / 55 passed
