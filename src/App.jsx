import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { AuthProvider, useAuth } from './context/AuthContext';
import { TripsProvider } from './context/TripsContext';
import { BookingProvider } from './context/BookingContext';
import { DriverProvider } from './context/DriverContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import BottomNav from './components/BottomNav';
import DriverBottomNav from './components/driver/DriverBottomNav';
import Splash from './components/Splash';
import RelayNotifications from './components/RelayNotifications';

import Welcome from './pages/Welcome';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import LiveBuses from './pages/LiveBuses';
import LiveTracking from './pages/LiveTracking';
import Search from './pages/Search';
import TripDetails from './pages/TripDetails';
import SeatSelection from './pages/SeatSelection';
import Passengers from './pages/Passengers';
import Payment from './pages/Payment';
import Ticket from './pages/Ticket';
import TicketDriver from './pages/TicketDriver';
import Trips from './pages/Trips';
import Profile from './pages/Profile';

import DriverDashboard from './pages/driver/DriverDashboard';
import DriverManifest from './pages/driver/DriverManifest';
import DriverActiveTrip from './pages/driver/DriverActiveTrip';
import DriverEarnings from './pages/driver/DriverEarnings';
import DriverTripHistory from './pages/driver/DriverTripHistory';
import DriverScanTicket from './pages/driver/DriverScanTicket';
import DriverVehicleSetup from './pages/driver/DriverVehicleSetup';
import DriverProfile from './pages/driver/DriverProfile';
import DriverTripManager from './pages/driver/DriverTripManager';
import ReportIncident from './pages/ReportIncident';

const NAV_ROUTES = ['/', '/live', '/trips', '/profile'];
const DRIVER_NAV_ROUTES = ['/driver', '/driver/earnings', '/driver/trips', '/driver/profile'];

const RequireAuth = ({ children, role }) => {
  const { isAuthed, user, loading } = useAuth();
  const location = useLocation();
  // Wait until the profile fetch settles before deciding — otherwise a
  // just-signed-in user (esp. guest via signInAnonymously) sees isAuthed=false
  // for one tick and gets bounced back to /welcome.
  if (loading) return null;
  if (!isAuthed) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  // Role is fixed at signup — a passenger hitting a driver route (or vice
  // versa) bounces to their own home instead of seeing the wrong shell.
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'driver' ? '/driver' : '/'} replace />;
  }
  return children;
};

// Catch-all lands each signed-in role on its own home, avoiding a redundant
// bounce through the other role's root.
const RoleHome = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'driver' ? '/driver' : '/'} replace />;
};

const Shell = () => {
  const location = useLocation();
  const showNav = NAV_ROUTES.includes(location.pathname);
  const showDriverNav = DRIVER_NAV_ROUTES.includes(location.pathname);

  // Brand splash on app open — animated sequence in Splash.jsx runs ~3.55s
  // (text cascade → morph → bus drive-off), then AnimatePresence plays the
  // 0.5s backdrop fade. Bumped to 3600ms to make sure the bus is fully off
  // screen before the fade starts. Total ≈ 4.1s, under the 5s cap.
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="app-container">
      <AnimatePresence>{showSplash && <Splash />}</AnimatePresence>
      <ToastProvider>
        <RelayNotifications />
        <div className="page">
          {/* Crossfade between screens on navigation. mode="wait" fully
              retires the outgoing screen before the next mounts, so map pages
              never render two Leaflet instances at once. Fixed nav bars sit
              outside this, so they stay steady during the swap. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%' }}
            >
              <Routes location={location}>
                <Route path="/welcome" element={<Welcome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Passenger */}
            <Route path="/" element={<RequireAuth role="passenger"><Home /></RequireAuth>} />
            <Route path="/live" element={<RequireAuth role="passenger"><LiveBuses /></RequireAuth>} />
            <Route path="/live/:busId" element={<RequireAuth role="passenger"><LiveTracking /></RequireAuth>} />
            <Route path="/search" element={<RequireAuth role="passenger"><Search /></RequireAuth>} />
            <Route path="/trip/:tripId" element={<RequireAuth role="passenger"><TripDetails /></RequireAuth>} />
            <Route path="/trip/:tripId/seats" element={<RequireAuth role="passenger"><SeatSelection /></RequireAuth>} />
            <Route path="/passengers" element={<RequireAuth role="passenger"><Passengers /></RequireAuth>} />
            <Route path="/payment" element={<RequireAuth role="passenger"><Payment /></RequireAuth>} />
            <Route path="/ticket/:bookingId" element={<RequireAuth role="passenger"><Ticket /></RequireAuth>} />
            <Route path="/ticket/:bookingId/driver" element={<RequireAuth role="passenger"><TicketDriver /></RequireAuth>} />
            <Route path="/trips" element={<RequireAuth role="passenger"><Trips /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth role="passenger"><Profile /></RequireAuth>} />
            <Route path="/report/:bookingId" element={<RequireAuth role="passenger"><ReportIncident /></RequireAuth>} />
            <Route path="/report" element={<RequireAuth role="passenger"><ReportIncident /></RequireAuth>} />

            {/* Driver */}
            <Route path="/driver" element={<RequireAuth role="driver"><DriverDashboard /></RequireAuth>} />
            <Route path="/driver/trip/:tripId/manifest" element={<RequireAuth role="driver"><DriverManifest /></RequireAuth>} />
            <Route path="/driver/trip/:tripId" element={<RequireAuth role="driver"><DriverActiveTrip /></RequireAuth>} />
            <Route path="/driver/request/:requestId" element={<RequireAuth role="driver"><DriverActiveTrip /></RequireAuth>} />
            <Route path="/driver/earnings" element={<RequireAuth role="driver"><DriverEarnings /></RequireAuth>} />
            <Route path="/driver/trips" element={<RequireAuth role="driver"><DriverTripHistory /></RequireAuth>} />
            <Route path="/driver/scan" element={<RequireAuth role="driver"><DriverScanTicket /></RequireAuth>} />
            <Route path="/driver/setup" element={<RequireAuth role="driver"><DriverVehicleSetup /></RequireAuth>} />
            <Route path="/driver/manage-trips" element={<RequireAuth role="driver"><DriverTripManager /></RequireAuth>} />
            <Route path="/driver/profile" element={<RequireAuth role="driver"><DriverProfile /></RequireAuth>} />

                <Route path="*" element={<RoleHome />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
        {showNav && <BottomNav />}
        {showDriverNav && <DriverBottomNav />}
      </ToastProvider>
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <TripsProvider>
        <BookingProvider>
          <DriverProvider>
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
          </DriverProvider>
        </BookingProvider>
      </TripsProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
