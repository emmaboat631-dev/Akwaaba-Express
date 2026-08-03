import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Postgres columns are snake_case; the app-side user object is camelCase.
// These two mappers keep the DB ⇄ app boundary in one place, so screens
// can read `user.vehiclePlate` and pass `{ vehiclePlate: '...' }` while
// Postgres sees `vehicle_plate`.
const profileFromRow = (row) => row && ({
  id: row.id,
  role: row.role,
  name: row.name,
  phone: row.phone || '',
  email: row.email || '',
  isGuest: !!row.is_guest,
  regNo: row.reg_no,
  ghanaCard: row.ghana_card || '',
  avatarColor: row.avatar_color || '#06392F',
  joinedISO: row.created_at,
  // driver-only
  licenseNo: row.license_no || '',
  vehiclePlate: row.vehicle_plate || '',
  verificationStatus: row.verification_status,
  rating: row.rating,
  liveDestinationId: row.live_destination_id,
  operatorId: row.operator_id,
  busTypeId: row.bus_type_id,
  vehicleModel: row.vehicle_model || '',
  vehicleColor: row.vehicle_color || '',
});

// Fields a client is allowed to patch; everything else (id, role, email,
// reg_no, is_guest, created_at) is server-owned or immutable.
const CLIENT_TO_DB = {
  name: 'name',
  phone: 'phone',
  ghanaCard: 'ghana_card',
  avatarColor: 'avatar_color',
  licenseNo: 'license_no',
  vehiclePlate: 'vehicle_plate',
  verificationStatus: 'verification_status',
  liveDestinationId: 'live_destination_id',
  operatorId: 'operator_id',
  busTypeId: 'bus_type_id',
  vehicleModel: 'vehicle_model',
  vehicleColor: 'vehicle_color',
};

const profilePatchToDb = (patch) => {
  const out = {};
  for (const [k, v] of Object.entries(patch || {})) {
    const dbKey = CLIENT_TO_DB[k];
    if (dbKey && v !== undefined) out[dbKey] = v;
  }
  return out;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [places, setPlaces] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize session and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile, places, and methods when session changes
  useEffect(() => {
    let active = true;

    const fetchUserData = async () => {
      if (!session?.user) {
        if (active) {
          setProfile(null);
          setPlaces([]);
          setMethods([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      // Each query is independent — a missing side table (e.g. saved_places
      // not yet migrated) must NOT stall the whole app on a blank loading
      // screen. `allSettled` gives us each result, and `finally` guarantees
      // loading is released even if profile itself errors.
      try {
        const [profileRes, placesRes, methodsRes] = await Promise.allSettled([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          supabase.from('saved_places').select('*').eq('user_id', session.user.id),
          supabase.from('payment_methods').select('*').eq('user_id', session.user.id),
        ]);
        if (!active) return;
        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          setProfile(profileFromRow(profileRes.value.data));
        } else if (profileRes.status === 'fulfilled' && profileRes.value.error) {
          console.warn('profile fetch:', profileRes.value.error.message);
        } else if (profileRes.status === 'rejected') {
          console.warn('profile fetch rejected:', profileRes.reason);
        }
        if (placesRes.status === 'fulfilled' && placesRes.value.data) setPlaces(placesRes.value.data);
        if (methodsRes.status === 'fulfilled' && methodsRes.value.data) setMethods(methodsRes.value.data);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchUserData();

    return () => { active = false; };
  }, [session]);

  const value = useMemo(() => {
    // `profile` is already camelCase (mapped in fetch). Merge places/methods
    // and prefer the auth email over the profile row (source of truth).
    const user = profile ? {
      ...profile,
      email: session?.user?.email || profile.email,
      savedPlaces: places,
      paymentMethods: methods,
    } : null;

    return {
      user,
      isAuthed: !!user,
      loading,

      // Guest sign-in — Supabase Anonymous provider must be enabled in the
      // dashboard (Auth → Providers → Anonymous Sign-Ins). The metadata below
      // flows into raw_user_meta_data and the handle_new_user trigger uses it
      // to set the profile's name/role/is_guest fields on first insert.
      signInAsGuest: async () => {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: { name: 'Guest', role: 'passenger', is_guest: true },
          },
        });
        if (error) throw error;
        return data.user;
      },

      logout: async () => {
        await supabase.auth.signOut();
      },

      // Accepts a camelCase patch. Fields not in CLIENT_TO_DB (id, role,
      // email, regNo, isGuest, joinedISO, rating) are silently ignored —
      // server-owned. Ghana Card is set-once: once the profile has one,
      // further attempts to change it are dropped.
      updateUser: async (patch) => {
        if (!session?.user) return;
        const dbPatch = profilePatchToDb(patch);
        if ('ghana_card' in dbPatch && profile?.ghanaCard && profile.ghanaCard.trim()) {
          delete dbPatch.ghana_card;
        }
        if (Object.keys(dbPatch).length === 0) return;
        const { data, error } = await supabase
          .from('profiles')
          .update(dbPatch)
          .eq('id', session.user.id)
          .select()
          .single();
        if (error) { console.warn('updateUser:', error.message); return; }
        if (data) setProfile(profileFromRow(data));
      },

      addSavedPlace: async (place) => {
        if (!session?.user) return;
        const { data, error } = await supabase
          .from('saved_places')
          .insert([{ user_id: session.user.id, ...place }])
          .select()
          .single();
        if (!error && data) setPlaces((prev) => [...prev, data]);
      },

      removeSavedPlace: async (id) => {
        if (!session?.user) return;
        const { error } = await supabase.from('saved_places').delete().eq('id', id);
        if (!error) setPlaces((prev) => prev.filter((p) => p.id !== id));
      },

      addPaymentMethod: async (pm) => {
        if (!session?.user) return;
        const { data, error } = await supabase
          .from('payment_methods')
          .insert([{ user_id: session.user.id, ...pm }])
          .select()
          .single();
        if (!error && data) setMethods((prev) => [...prev, data]);
      },

      removePaymentMethod: async (id) => {
        if (!session?.user) return;
        const { error } = await supabase.from('payment_methods').delete().eq('id', id);
        if (!error) setMethods((prev) => prev.filter((p) => p.id !== id));
      },

      // Vehicle Setup writes the full driver profile at once. Any change
      // sends verification back to pending — treated as a resubmission.
      setVehicleInfo: async (patch) => {
        if (!session?.user) return;
        const dbPatch = { ...profilePatchToDb(patch), verification_status: 'pending' };
        const { data, error } = await supabase
          .from('profiles')
          .update(dbPatch)
          .eq('id', session.user.id)
          .select()
          .single();
        if (error) { console.warn('setVehicleInfo:', error.message); return; }
        if (data) setProfile(profileFromRow(data));
      },

      submitVerification: async () => {
        if (!session?.user) return;
        const { data, error } = await supabase
          .from('profiles')
          .update({ verification_status: 'verified' })
          .eq('id', session.user.id)
          .select()
          .single();
        if (error) { console.warn('submitVerification:', error.message); return; }
        if (data) setProfile(profileFromRow(data));
      },

      // Payout method not persisted server-side yet — kept in-memory so
      // driver profile UI has a place to store it until we add a column.
      setPayoutMethod: () => {},
    };
  }, [profile, session, places, methods, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
