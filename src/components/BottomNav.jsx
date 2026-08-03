import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Ticket, MapPin, User } from 'lucide-react';

const TABS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/live', icon: MapPin, label: 'Live' },
  { path: '/trips', icon: Ticket, label: 'Trips' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav">
      {TABS.map(({ path, icon: Icon, label }) => {
        const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
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

export default BottomNav;
