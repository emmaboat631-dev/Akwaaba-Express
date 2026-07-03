import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage, KEYS } from '../services/storage';
import { uid, hashString, mulberry32, range } from '../utils/random';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const AVATAR_COLORS = ['#06392F', '#155844', '#B07D0F', '#CE1126', '#0F766E', '#B4532A'];

// Account fields that exist on every user; also backfills profiles saved
// before these fields existed. Defaults first so stored values win.
const withAccountFields = (u) =>
  u && {
    regNo: `AKW-${Math.floor(100000 + Math.random() * 900000)}`,
    ghanaCard: '',
    joinedISO: new Date().toISOString(),
    role: 'passenger',
    ...u,
  };

const makeUser = ({ name, phone, email, role }) => {
  const id = uid('usr');
  const isDriver = role === 'driver';
  return withAccountFields({
    id,
    name: name?.trim() || 'Traveller',
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    role: isDriver ? 'driver' : 'passenger',
    avatarColor: AVATAR_COLORS[hashString(name || phone || 'u') % AVATAR_COLORS.length],
    savedPlaces: [
      { id: uid('pl'), label: 'Home', address: 'East Legon, Accra', icon: 'home' },
      { id: uid('pl'), label: 'Work', address: 'Airport City, Accra', icon: 'work' },
    ],
    paymentMethods: [
      { id: uid('pm'), type: 'momo', label: 'MTN MoMo', detail: '024 •••• 88' },
    ],
    // Driver-only fields — left undefined for passengers rather than padding
    // every passenger record. `rating` is a cosmetic static seed (same
    // convention as OPERATORS.rating elsewhere), not derived from real
    // passenger feedback — there is no passenger-side rating flow.
    ...(isDriver
      ? {
          licenseNo: '',
          vehiclePlate: '',
          verificationStatus: 'pending',
          payoutMethod: null,
          rating: +range(mulberry32(hashString(id)), 4.3, 4.9).toFixed(1),
        }
      : {}),
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => withAccountFields(storage.get(KEYS.user, null)));

  useEffect(() => {
    if (user) storage.set(KEYS.user, user);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      authenticate: (profile) => {
        // Restore the stored profile if the phone OR email matches, else create one.
        // Role is decided once at signup and is immutable after — on a match,
        // the stored account's role always wins over whatever was picked on
        // the sign-in screen this time.
        const existing = storage.get(KEYS.user, null);
        const matches =
          existing &&
          ((profile.phone?.trim() && existing.phone === profile.phone.trim()) ||
            (profile.email?.trim() && existing.email === profile.email.trim()));
        const next = matches
          ? withAccountFields({ ...existing, ...(profile.name ? { name: profile.name } : {}) })
          : makeUser(profile);
        setUser(next);
        return next;
      },
      logout: () => {
        storage.remove(KEYS.user);
        setUser(null);
      },
      // Email, registration number and role are fixed; the Ghana Card can be
      // set once and is locked from then on.
      updateUser: (patch) =>
        setUser((u) => {
          const { email: _email, regNo: _regNo, role: _role, ghanaCard, ...allowed } = patch;
          const next = { ...u, ...allowed };
          if (ghanaCard?.trim() && !u.ghanaCard) next.ghanaCard = ghanaCard.trim();
          return next;
        }),
      addSavedPlace: (place) =>
        setUser((u) => ({ ...u, savedPlaces: [...u.savedPlaces, { id: uid('pl'), ...place }] })),
      removeSavedPlace: (id) =>
        setUser((u) => ({ ...u, savedPlaces: u.savedPlaces.filter((p) => p.id !== id) })),
      addPaymentMethod: (pm) =>
        setUser((u) => ({ ...u, paymentMethods: [...u.paymentMethods, { id: uid('pm'), ...pm }] })),
      removePaymentMethod: (id) =>
        setUser((u) => ({ ...u, paymentMethods: u.paymentMethods.filter((p) => p.id !== id) })),
      // Driver-only: editing vehicle/license sends verification back to
      // 'pending' (simulates resubmission — no real reviewer, see
      // submitVerification below).
      setVehicleInfo: ({ licenseNo, vehiclePlate }) =>
        setUser((u) => ({ ...u, licenseNo, vehiclePlate, verificationStatus: 'pending' })),
      submitVerification: () =>
        setUser((u) => ({ ...u, verificationStatus: 'verified' })),
      setPayoutMethod: (payoutMethod) =>
        setUser((u) => ({ ...u, payoutMethod })),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
