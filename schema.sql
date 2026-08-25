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
  taken_at timestamptz,

  -- Cruce contra el padrón de flota al registrar la solicitud
  fleet_status text check (fleet_status in ('en_flota', 'fuera_de_flota', 'desconocido')) default 'desconocido',
  -- El bus no tiene disco duro: no hay grabación posible
  sin_disco boolean not null default false,
  sin_disco_source text check (sin_disco_source in ('flota', 'bus_failures', 'manual'))
);

create index if not exists solicitudes_sin_disco_idx on solicitudes (sin_disco) where sin_disco = true;
create index if not exists solicitudes_fleet_status_idx on solicitudes (fleet_status);

-- Padrón de flota: la fuente de verdad sobre qué buses son nuestros y
-- cuáles cuentan con disco duro instalado.
create table padron_flota (
  id uuid default uuid_generate_v4() primary key,
  ppu text not null unique,   -- normalizada: sólo A-Z0-9, en mayúsculas
  interno text,
  terminal text,
  modelo text,
  tiene_disco boolean not null default true,
  activo boolean not null default true,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists padron_flota_ppu_idx on padron_flota (ppu);
create index if not exists padron_flota_tiene_disco_idx on padron_flota (tiene_disco) where tiene_disco = false;

create or replace function padron_padron_flota_normaliza_ppu()
returns trigger
language plpgsql
as $$
begin
  new.ppu := upper(regexp_replace(coalesce(new.ppu, ''), '[^A-Za-z0-9]', '', 'g'));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists padron_flota_normaliza_ppu_trg on padron_flota;
create trigger padron_flota_normaliza_ppu_trg
  before insert or update on padron_flota
  for each row execute function padron_padron_flota_normaliza_ppu();

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

-- RLS Policies for flota
alter table padron_flota enable row level security;

create policy "Allow public read padron_flota"
  on padron_flota for select
  to anon
  using (true);

create policy "Allow public insert padron_flota"
  on padron_flota for insert
  to anon
  with check (true);

create policy "Allow public update padron_flota"
  on padron_flota for update
  to anon
  using (true);

create policy "Allow public delete padron_flota"
  on padron_flota for delete
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
alter publication supabase_realtime add table padron_flota;

