import { useState } from 'react';
import { Eye, EyeOff, Save, Key, CheckCircle, AlertTriangle, Trash2, Database, Copy, ExternalLink, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isSupabaseConnected } from '../lib/supabase';

const DEFAULT_SUPABASE_URL = 'https://pqmxnlvvqghmhltmlhcb.supabase.co';

const SQL_SCHEMA_SCRIPT = `-- MedTrack AI — Supabase SQL Schema
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  nickname text,
  gender text default 'female',
  date_of_birth date not null,
  blood_type text default 'unknown',
  height numeric,
  weight numeric,
  allergies text[] default '{}',
  medical_history text[] default '{}',
  surgical_history text[] default '{}',
  general_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text,
  file_data_url text,
  file_type text,
  document_date date not null,
  upload_date timestamp with time zone default timezone('utc'::text, now()) not null,
  processing_status text default 'uploaded',
  ocr_text text,
  extraction_status text,
  extraction_confidence numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.lab_results (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  test_date date not null,
  test_name text not null,
  normalized_name text not null,
  value_numeric numeric,
  value_text text,
  unit text,
  reference_low numeric,
  reference_high numeric,
  abnormal_flag text,
  confidence numeric default 1.0,
  verified boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.hospitalizations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) on delete cascade,
  admission_date date not null,
  discharge_date date,
  hospital text not null,
  reason text,
  symptoms text[] default '{}',
  doctor_diagnosis text,
  hb_on_admission numeric,
  hb_on_discharge numeric,
  medications text[] default '{}',
  procedures text[] default '{}',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.transfusions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) on delete cascade,
  hospitalization_id uuid references public.hospitalizations(id) on delete set null,
  transfusion_date date not null,
  product_type text not null,
  units integer default 1,
  hb_before numeric,
  hb_after numeric,
  indication text,
  hospital text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.medications (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.profiles(id) on delete cascade,
  medication_name text not null,
  dosage text,
  frequency text,
  start_date date not null,
  end_date date,
  prescribed_by text,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.lab_results enable row level security;
alter table public.hospitalizations enable row level security;
alter table public.transfusions enable row level security;
alter table public.medications enable row level security;

create policy "Allow all access on profiles" on public.profiles for all using (true) with check (true);
create policy "Allow all access on documents" on public.documents for all using (true) with check (true);
create policy "Allow all access on lab_results" on public.lab_results for all using (true) with check (true);
create policy "Allow all access on hospitalizations" on public.hospitalizations for all using (true) with check (true);
create policy "Allow all access on transfusions" on public.transfusions for all using (true) with check (true);
create policy "Allow all access on medications" on public.medications for all using (true) with check (true);`;

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || DEFAULT_SUPABASE_URL);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');
  const [showKey, setShowKey] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  function handleSave() {
    updateSettings({
      geminiApiKey: apiKey.trim(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      theme,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleCopySql() {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  }

  function handleClearData() {
    if (confirm('PERINGATAN: Ini akan menghapus SEMUA data pasien, dokumen, hasil lab, dan pengaturan dari browser. Yakin?')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  const supabaseActive = isSupabaseConnected();

  return (
    <div className="page-container max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="text-slate-400 text-sm mt-1">Konfigurasi Tampilan, AI, dan Database Supabase</p>
      </div>

      {/* Theme Mode Selector */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
            {theme === 'light' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-amber-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Tampilan Mode (Theme)</h3>
            <p className="text-xs text-slate-400">Pilih mode tampilan gelap atau terang</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setTheme('dark'); updateSettings({ theme: 'dark' }); }}
            id="theme-dark-btn"
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'dark'
                ? 'bg-accent-500/20 border-accent-500 text-accent-400 font-semibold shadow-glow-teal'
                : 'bg-bg-elevated border-bg-border text-slate-400 hover:border-slate-500'
            }`}
          >
            <Moon size={24} />
            <span className="text-xs">Mode Gelap (Dark)</span>
          </button>

          <button
            type="button"
            onClick={() => { setTheme('light'); updateSettings({ theme: 'light' }); }}
            id="theme-light-btn"
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'light'
                ? 'bg-amber-500/20 border-amber-500 text-amber-500 font-semibold shadow-card'
                : 'bg-bg-elevated border-bg-border text-slate-400 hover:border-slate-500'
            }`}
          >
            <Sun size={24} />
            <span className="text-xs">Mode Terang (Light)</span>
          </button>
        </div>
      </div>

      {/* Supabase Configuration */}
      <div className="glass-card p-6 space-y-5 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Database size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Database Supabase</h3>
              <p className="text-xs text-slate-400">Penyimpanan cloud PostgreSQL</p>
            </div>
          </div>
          {supabaseActive ? (
            <span className="badge badge-green flex items-center gap-1">
              <CheckCircle size={12} /> Terhubung
            </span>
          ) : (
            <span className="badge badge-yellow">Memerlukan Anon Key</span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-text">Supabase URL</label>
            <input
              type="text"
              className="input-field"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              id="supabase-url-input"
            />
          </div>

          <div>
            <label className="label-text">Supabase Anon Key (Public Key)</label>
            <div className="relative">
              <input
                type={showSupabaseKey ? 'text' : 'password'}
                className="input-field pr-10"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                id="supabase-anon-key-input"
              />
              <button
                type="button"
                onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                id="toggle-supabase-key-visibility"
              >
                {showSupabaseKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dapatkan Anon Key di <strong>Project Settings → API</strong> di dasbor Supabase Anda.
            </p>
          </div>
        </div>

        {/* Step-by-step Setup Helper */}
        <div className="p-4 rounded-lg bg-bg-primary/70 border border-bg-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider">Langkah Setup Database SQL:</span>
            <button onClick={handleCopySql} id="copy-sql-script-btn" className="btn-secondary text-xs py-1 px-2.5">
              <Copy size={12} />
              {copiedSql ? 'SQL Tersalin!' : 'Salin SQL Schema'}
            </button>
          </div>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
            <li>Buka dasbor Supabase Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-accent-400 hover:underline">supabase.com</a></li>
            <li>Pilih project <code className="text-emerald-400 font-mono">pqmxnlvvqghmhltmlhcb</code></li>
            <li>Masuk ke <strong>SQL Editor</strong> → Tempelkan SQL Schema yang disalin di atas → Klik <strong>Run</strong></li>
            <li>Salin <strong>anon key</strong> dari <strong>Settings → API</strong> dan tempelkan di kolom di atas.</li>
          </ol>
        </div>
      </div>

      {/* Gemini API Key */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-accent flex items-center justify-center">
            <Key size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Google Gemini API Key</h3>
            <p className="text-xs text-slate-500">Untuk fitur AI extraction dan ringkasan</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="label-text">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className="input-field pr-10"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              id="gemini-api-key-input"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              id="toggle-key-visibility"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Dapatkan API key gratis di{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline" id="gemini-api-link">
              Google AI Studio <ExternalLink size={10} className="inline ml-0.5" />
            </a>
          </p>
        </div>

        {settings.geminiApiKey && (
          <div className="flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle size={13} />
            Gemini API key sudah dikonfigurasi
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} id="save-settings-btn" className="btn-primary">
          <Save size={14} />
          {saved ? 'Semua Pengaturan Tersimpan!' : 'Simpan Semua Pengaturan'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-6 space-y-4 border border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h3 className="text-sm font-semibold text-red-400">Zona Berbahaya</h3>
        </div>
        <p className="text-xs text-slate-500">Hapus semua data tersimpan dari browser. Tindakan ini tidak dapat dibatalkan.</p>
        <button onClick={handleClearData} id="clear-all-data-btn" className="btn-danger">
          <Trash2 size={14} />
          Hapus Semua Data Lokal
        </button>
      </div>
    </div>
  );
}
