-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Solicitudes Table
create table solicitudes (
  id uuid default uuid_generate_v4() primary key,
  case_number text not null unique,
  incident_at timestamptz,
  ingress_at timestamptz,
  ppu text,
  incident_point text,
  reason text,
  detail text,
  video_url text,
  video_url_uploaded_at timestamptz,
  status text not null default 'pendiente' check (status in ('pendiente', 'en_revision', 'revisado', 'pendiente_envio', 'enviado')),
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  taken_by text,
  taken_at timestamptz
);

-- RLS Policies (Simplified for 'public' app usage as requested - Use with Caution)
alter table solicitudes enable row level security;

-- Allow read access to everyone
create policy "Allow public read access"
  on solicitudes for select
  to anon
  using (true);

-- Allow insert access to everyone
create policy "Allow public insert access"
  on solicitudes for insert
  to anon
  with check (true);

-- Allow update access to everyone
create policy "Allow public update access"
  on solicitudes for update
  to anon
  using (true);

-- Realtime
alter publication supabase_realtime add table solicitudes;
