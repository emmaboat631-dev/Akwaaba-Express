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
import { requestPermission } from './services/notifications';
import OfflineBanner from './components/OfflineBanner';
import OfflineGate from './components/OfflineGate';
import { setupDeepLinkListener } from './services/deepLink';

import Welcome from './pages/Welcome';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import VerifyOtp from './pages/VerifyOtp';
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
import NotFound from './pages/NotFound';

import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminTrips from './pages/admin/AdminTrips';
import AdminDocuments from './pages/admin/AdminDocuments';

const NAV_ROUTES = ['/', '/live', '/trips', '/profile'];
const DRIVER_NAV_ROUTES = ['/driver', '/driver/earnings', '/driver/trips', '/driver/profile'];

const RequireAuth = ({ children, role }) => {
  const { isAuthed, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthed) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'driver' ? '/driver' : '/'} replace />;
  }
  return children;
};

const OfflineWelcome = () => {
  const { isAuthed } = useAuth();
  if (isAuthed) return <Navigate to="/" replace />;
  return (
    <>
      <OfflineGate />
      <Welcome />
    </>
  );
};

// Catch-all lands each signed-in role on its own home, avoiding a redundant
// bounce through the other role's root.
const RoleHome = () => {
  const { user, isAuthed } = useAuth();
  if (!isAuthed) return <NotFound />;
  return <Navigate to={user?.role === 'driver' ? '/driver' : '/'} replace />;
};

const AdminGuard = ({ children }) => {
  const { isAuthed, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthed) return <Navigate to="/admin/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
};

const Shell = () => {
  const location = useLocation();
  const showNav = NAV_ROUTES.includes(location.pathname);
  const showDriverNav = DRIVER_NAV_ROUTES.includes(location.pathname);

  const { isAuthed } = useAuth();
  useEffect(() => {
    if (isAuthed) requestPermission();
  }, [isAuthed]);

  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="app-container">
      <AnimatePresence>{showSplash && <Splash />}</AnimatePresence>
      <OfflineBanner />
      <ToastProvider>
        <RelayNotifications />
        <div className="page">
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
                <Route path="/welcome" element={<OfflineWelcome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify" element={<VerifyOtp />} />

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

const AppRoutes = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <ToastProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="trips" element={<AdminTrips />} />
            <Route path="documents" element={<AdminDocuments />} />
          </Route>
        </Routes>
      </ToastProvider>
    );
  }

  return <Shell />;
};

setupDeepLinkListener();

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <TripsProvider>
        <BookingProvider>
          <DriverProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </DriverProvider>
        </BookingProvider>
      </TripsProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
