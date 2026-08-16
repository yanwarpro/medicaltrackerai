-- ============================================================
-- MedTrack AI — Supabase SQL Schema
-- Copy and paste this script into Supabase SQL Editor and click Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES / PATIENTS
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

-- 2. DOCUMENTS
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

-- 3. LAB RESULTS
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

-- 4. HOSPITALIZATIONS
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

-- 5. TRANSFUSIONS
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

-- 6. MEDICATIONS
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

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.lab_results enable row level security;
alter table public.hospitalizations enable row level security;
alter table public.transfusions enable row level security;
alter table public.medications enable row level security;

-- Row Level Security Policies (Allow full access for anon/authenticated)
drop policy if exists "Allow all access on profiles" on public.profiles;
create policy "Allow all access on profiles" on public.profiles for all using (true) with check (true);

drop policy if exists "Allow all access on documents" on public.documents;
create policy "Allow all access on documents" on public.documents for all using (true) with check (true);

drop policy if exists "Allow all access on lab_results" on public.lab_results;
create policy "Allow all access on lab_results" on public.lab_results for all using (true) with check (true);

drop policy if exists "Allow all access on hospitalizations" on public.hospitalizations;
create policy "Allow all access on hospitalizations" on public.hospitalizations for all using (true) with check (true);

drop policy if exists "Allow all access on transfusions" on public.transfusions;
create policy "Allow all access on transfusions" on public.transfusions for all using (true) with check (true);

drop policy if exists "Allow all access on medications" on public.medications;
create policy "Allow all access on medications" on public.medications for all using (true) with check (true);
