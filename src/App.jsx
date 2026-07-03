import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { TripsProvider } from './context/TripsContext';
import { BookingProvider } from './context/BookingContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import BottomNav from './components/BottomNav';

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
import Trips from './pages/Trips';
import Profile from './pages/Profile';

const NAV_ROUTES = ['/', '/live', '/trips', '/profile'];

const RequireAuth = ({ children }) => {
  const { isAuthed } = useAuth();
  const location = useLocation();
  if (!isAuthed) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  return children;
};

const Shell = () => {
  const location = useLocation();
  const showNav = NAV_ROUTES.includes(location.pathname);

  return (
    <div className="app-container">
      <ToastProvider>
        <div className="page">
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/live" element={<RequireAuth><LiveBuses /></RequireAuth>} />
            <Route path="/live/:busId" element={<RequireAuth><LiveTracking /></RequireAuth>} />
            <Route path="/search" element={<RequireAuth><Search /></RequireAuth>} />
            <Route path="/trip/:tripId" element={<RequireAuth><TripDetails /></RequireAuth>} />
            <Route path="/trip/:tripId/seats" element={<RequireAuth><SeatSelection /></RequireAuth>} />
            <Route path="/passengers" element={<RequireAuth><Passengers /></RequireAuth>} />
            <Route path="/payment" element={<RequireAuth><Payment /></RequireAuth>} />
            <Route path="/ticket/:bookingId" element={<RequireAuth><Ticket /></RequireAuth>} />
            <Route path="/trips" element={<RequireAuth><Trips /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        {showNav && <BottomNav />}
      </ToastProvider>
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <TripsProvider>
        <BookingProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </BookingProvider>
      </TripsProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
