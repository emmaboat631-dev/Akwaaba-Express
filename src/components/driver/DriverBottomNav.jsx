import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Wallet, Ticket, User } from 'lucide-react';

// Structural clone of components/BottomNav.jsx — same CSS classes, driver
// tabs. Profile is a nav tab here (unlike the passenger side's avatar
// shortcut) since the dashboard's online toggle occupies that top-corner spot.
const TABS = [
  { path: '/driver', icon: Home, label: 'Home' },
  { path: '/driver/earnings', icon: Wallet, label: 'Earnings' },
  { path: '/driver/trips', icon: Ticket, label: 'Trips' },
  { path: '/driver/profile', icon: User, label: 'Profile' },
];

const DriverBottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav">
      {TABS.map(({ path, icon: Icon, label }) => {
        const active = path === '/driver' ? pathname === '/driver' : pathname.startsWith(path);
        return (
          <button
            key={path}
            className={`bottom-nav-tab${active ? ' active' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
            title={label}
          >
            <Icon size={21} strokeWidth={active ? 2.3 : 2} />
          </button>
        );
      })}
    </nav>
  );
};

export default DriverBottomNav;
