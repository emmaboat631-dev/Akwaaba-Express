import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Ticket, Bus, FileCheck, LogOut, Menu, X, Sun, Moon, Route, UserCheck, UsersRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/bookings', icon: Ticket, label: 'Bookings' },
  { to: '/admin/trips', icon: Bus, label: 'Trips' },
  { to: '/admin/routes', icon: Route, label: 'Routes' },
  { to: '/admin/drivers', icon: UserCheck, label: 'Drivers' },
  { to: '/admin/documents', icon: FileCheck, label: 'Verification' },
  { to: '/admin/charters', icon: UsersRound, label: 'Charters' },
];

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('adm-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.body.classList.add('adm-active');
    return () => document.body.classList.remove('adm-active');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('adm-theme', dark ? 'dark' : 'light');
    return () => document.documentElement.removeAttribute('data-theme');
  }, [dark]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="adm">
      {!mobileOpen && (
        <button className="adm-burger" onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
      )}

      <aside className={`adm-side${mobileOpen ? ' open' : ''}`}>
        <div className="adm-brand">
          <div className="adm-brand-icon">AE</div>
          <span className="adm-brand-name">Akwaaba Express</span>
          <button className="adm-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="adm-nav-label">Menu</div>
        <nav className="adm-links">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `adm-link${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adm-theme-toggle">
          <button
            className={`adm-theme-btn${!dark ? ' active' : ''}`}
            onClick={() => setDark(false)}
            title="Light mode"
          >
            <Sun size={15} /> <span>Light</span>
          </button>
          <button
            className={`adm-theme-btn${dark ? ' active' : ''}`}
            onClick={() => setDark(true)}
            title="Dark mode"
          >
            <Moon size={15} /> <span>Dark</span>
          </button>
        </div>

        <div className="adm-side-foot">
          <div className="adm-who">
            <div className="adm-who-avatar">{(user?.name || 'A')[0].toUpperCase()}</div>
            <div>
              <div className="adm-who-name">{user?.name || 'Admin'}</div>
              <div className="adm-who-role">{user?.email || user?.role}</div>
            </div>
          </div>
          <button className="adm-logout" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="adm-overlay" onClick={() => setMobileOpen(false)} />}

      <main className="adm-body">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
