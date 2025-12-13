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
  obs text, -- Observaciones generales
  operator_name text, -- Nombre del operador (DATOS OB)
  operator_rut text, -- RUT del operador
  failure_type text check (failure_type in ('disco_danado', 'bus_sin_disco', 'video_sobreescrito', 'error_lectura', 'no_disponible')),
  status text not null default 'pendiente' check (status in ('pendiente', 'en_revision', 'revisado', 'pendiente_envio', 'enviado')),
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  taken_by text,
  taken_at timestamptz
);

-- Bus Failures History Table (track issues per bus)
create table bus_failures (
  id uuid default uuid_generate_v4() primary key,
  ppu text not null,
  failure_type text not null,
  case_number text,
  notes text,
  created_at timestamptz default now()
);

-- RLS Policies for solicitudes
alter table solicitudes enable row level security;

create policy "Allow public read access"
  on solicitudes for select
  to anon
  using (true);

create policy "Allow public insert access"
  on solicitudes for insert
  to anon
  with check (true);

create policy "Allow public update access"
  on solicitudes for update
  to anon
  using (true);

create policy "Allow public delete access"
  on solicitudes for delete
  to anon
  using (true);

-- RLS Policies for bus_failures
alter table bus_failures enable row level security;

create policy "Allow public read bus_failures"
  on bus_failures for select
  to anon
  using (true);

create policy "Allow public insert bus_failures"
  on bus_failures for insert
  to anon
  with check (true);

-- Realtime
alter publication supabase_realtime add table solicitudes;
alter publication supabase_realtime add table bus_failures;

