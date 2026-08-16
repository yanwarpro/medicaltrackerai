import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Patient, AppSettings } from '../lib/types';
import { settingsStorage, patientStorage } from '../lib/storage';
import { getSupabaseClient } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  activePatient: Patient | null;
  patients: Patient[];
  setActivePatient: (id: string) => void;
  refreshPatients: () => void;
  user: User | null;
  session: Session | null;
  loadingAuth: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(settingsStorage.get());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatientState] = useState<Patient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Initialize Supabase Auth state listener
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoadingAuth(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoadingAuth(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setLoadingAuth(false);
    }
  }, []);

  const refreshPatients = useCallback(() => {
    const all = patientStorage.getAll();
    setPatients(all);
    const currentSettings = settingsStorage.get();
    if (currentSettings.activePatientId) {
      const p = all.find((p) => p.id === currentSettings.activePatientId);
      setActivePatientState(p || all[0] || null);
    } else if (all.length > 0) {
      setActivePatientState(all[0]);
    } else {
      setActivePatientState(null);
    }
  }, []);

  useEffect(() => {
    refreshPatients();
  }, [refreshPatients, user]);

  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    settingsStorage.save(updates);
    setSettings(settingsStorage.get());
  }, []);

  const setActivePatient = useCallback((id: string) => {
    settingsStorage.save({ activePatientId: id });
    const p = patientStorage.getById(id);
    setActivePatientState(p || null);
    setSettings(settingsStorage.get());
  }, []);

  const signIn = async (email: string, pass: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi') };
    const res = await supabase.auth.signInWithPassword({ email, password: pass });
    if (!res.error && res.data.user) {
      setUser(res.data.user);
      setSession(res.data.session);
    }
    return { error: res.error };
  };

  const signUp = async (email: string, pass: string, fullName: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi') };
    const res = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: res.error };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      activePatient,
      patients,
      setActivePatient,
      refreshPatients,
      user,
      session,
      loadingAuth,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
