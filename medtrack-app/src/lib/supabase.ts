import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { settingsStorage } from './storage';

const DEFAULT_SUPABASE_URL = 'https://pqmxnlvvqghmhltmlhcb.supabase.co';

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const settings = settingsStorage.get();
  const url = settings.supabaseUrl || DEFAULT_SUPABASE_URL;
  const anonKey = settings.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!anonKey) {
    return null;
  }

  if (!cachedClient || cachedKey !== anonKey) {
    cachedClient = createClient(url, anonKey);
    cachedKey = anonKey;
  }

  return cachedClient;
}

export function isSupabaseConnected(): boolean {
  return getSupabaseClient() !== null;
}
