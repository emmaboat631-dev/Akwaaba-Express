import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let authState;
vi.mock('./context/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }) => children,
}));

const { homeFor, RequireAuth } = await import('./App');

const asUser = (role) => ({ isAuthed: true, loading: false, user: { role } });

// Renders the guard at `at`, with the same guarded route registered at '/' so
// a role that redirects to '/' would loop here exactly as it did in the app.
const renderGuard = (opts) => {
  const { auth, at } = opts;
  // A default parameter would swallow an explicit `undefined`, which is
  // exactly the case one of these tests needs to exercise.
  const role = 'role' in opts ? opts.role : 'passenger';
  authState = auth;
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/" element={<RequireAuth role={role}><div>passenger home</div></RequireAuth>} />
        <Route path="/driver" element={<div>driver home</div>} />
        <Route path="/admin" element={<div>admin dashboard</div>} />
        <Route path="/welcome" element={<div>welcome</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('homeFor', () => {
  it('sends a driver to the driver dashboard', () => {
    expect(homeFor('driver')).toBe('/driver');
  });

  it('sends an admin to the admin dashboard', () => {
    expect(homeFor('admin')).toBe('/admin');
  });

  it('sends a passenger to the app root', () => {
    expect(homeFor('passenger')).toBe('/');
  });

  it('falls back to the app root for an unknown role', () => {
    expect(homeFor('inspector')).toBe('/');
  });

  it('falls back to the app root for a missing role', () => {
    expect(homeFor(undefined)).toBe('/');
    expect(homeFor(null)).toBe('/');
  });
});

describe('RequireAuth', () => {
  it('renders the route for a matching role', () => {
    renderGuard({ auth: asUser('passenger'), at: '/' });
    expect(screen.getByText('passenger home')).toBeInTheDocument();
  });

  it('renders nothing while auth is still loading', () => {
    const { container } = renderGuard({
      auth: { isAuthed: false, loading: true, user: null }, at: '/',
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('sends a signed-out visitor to welcome', () => {
    renderGuard({ auth: { isAuthed: false, loading: false, user: null }, at: '/' });
    expect(screen.getByText('welcome')).toBeInTheDocument();
  });

  it('sends a driver on a passenger route to the driver dashboard', () => {
    renderGuard({ auth: asUser('driver'), at: '/' });
    expect(screen.getByText('driver home')).toBeInTheDocument();
  });

  // AKW-01: an admin used to be redirected to '/', which is this very guard —
  // the two bounced until React threw "Maximum update depth exceeded".
  it('sends an admin on a passenger route to the admin dashboard, without looping', () => {
    renderGuard({ auth: asUser('admin'), at: '/' });
    expect(screen.getByText('admin dashboard')).toBeInTheDocument();
  });

  it('bails an unmapped role out to welcome rather than looping', () => {
    renderGuard({ auth: asUser('inspector'), at: '/' });
    expect(screen.getByText('welcome')).toBeInTheDocument();
  });

  it('does not redirect when no role is required', () => {
    renderGuard({ auth: asUser('admin'), at: '/', role: undefined });
    expect(screen.getByText('passenger home')).toBeInTheDocument();
  });
});
