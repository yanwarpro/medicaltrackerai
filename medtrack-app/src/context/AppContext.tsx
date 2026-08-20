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
  signUp: (email: string, pass: string, fullName: string, geminiApiKey?: string) => Promise<{ error: any }>;
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

  // Initialize Supabase Auth state listener and sync user settings
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      const syncUserApiKey = (currentUser: User | null) => {
        if (currentUser?.user_metadata?.gemini_api_key) {
          const cloudKey = currentUser.user_metadata.gemini_api_key;
          const currentSettings = settingsStorage.get();
          if (currentSettings.geminiApiKey !== cloudKey) {
            settingsStorage.save({ geminiApiKey: cloudKey });
            setSettings(settingsStorage.get());
          }
        }
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        syncUserApiKey(session?.user ?? null);
        setLoadingAuth(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        syncUserApiKey(session?.user ?? null);
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
    const updated = settingsStorage.get();
    setSettings(updated);

    // If logged in and geminiApiKey is updated, persist to Supabase user_metadata
    if (updates.geminiApiKey !== undefined) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.auth.updateUser({
          data: { gemini_api_key: updates.geminiApiKey.trim() }
        }).catch((err) => {
          console.warn('Failed to sync API key to Supabase user metadata:', err);
        });
      }
    }
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
      // Sync cloud API key to local storage on login
      if (res.data.user.user_metadata?.gemini_api_key) {
        settingsStorage.save({ geminiApiKey: res.data.user.user_metadata.gemini_api_key });
        setSettings(settingsStorage.get());
      }
    }
    return { error: res.error };
  };

  const signUp = async (email: string, pass: string, fullName: string, geminiApiKey?: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi') };
    
    const metadata: Record<string, any> = { full_name: fullName };
    if (geminiApiKey && geminiApiKey.trim()) {
      metadata.gemini_api_key = geminiApiKey.trim();
      settingsStorage.save({ geminiApiKey: geminiApiKey.trim() });
      setSettings(settingsStorage.get());
    }

    const res = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: metadata,
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
