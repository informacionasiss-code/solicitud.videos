-- ============================================================================
-- Flota propia + control de disco duro
--
-- Contexto: hasta ahora la única lista de buses era `bus_failures`, que es un
-- historial de fallas, no un padrón. Sin un padrón no se puede responder la
-- pregunta "¿esta PPU es nuestra?", que es justamente lo que hay que saber
-- antes de tramitar una solicitud de video.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Padrón de flota
--
-- La tabla se llama `padron_flota` y no `flota` a propósito: en esta base ya
-- existe una tabla `flota` de otro sistema, y un nombre compartido llevaría a
-- que una migración de aquí modificara datos ajenos.
-- ---------------------------------------------------------------------------
create table if not exists padron_flota (
  id uuid default uuid_generate_v4() primary key,

  -- PPU normalizada: solo A-Z y 0-9, en mayúsculas, sin puntos ni guiones.
  -- La app normaliza antes de consultar; el trigger de abajo garantiza que
  -- una carga por SQL crudo no rompa esa invariante.
  ppu text not null unique,

  interno text,          -- número interno del bus
  terminal text,         -- terminal / base de operación
  modelo text,

  -- El dato central de este cambio: si el bus tiene disco duro instalado.
  -- false => no hay grabación posible, la solicitud se responde igual pero
  -- indicando que el bus no tiene disco para su revisión.
  tiene_disco boolean not null default true,

  -- Baja de flota. Se conserva el registro: un incidente antiguo puede
  -- referirse a un bus que hoy ya no opera, y ese caso sigue siendo nuestro.
  activo boolean not null default true,

  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists padron_flota_ppu_idx on padron_flota (ppu);
create index if not exists padron_flota_tiene_disco_idx on padron_flota (tiene_disco) where tiene_disco = false;

-- Normalización defensiva de la PPU en cualquier insert/update.
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

-- ---------------------------------------------------------------------------
-- 2. Campos de control en solicitudes
-- ---------------------------------------------------------------------------

-- Resultado del cruce contra el padrón al momento de registrar la solicitud.
-- 'desconocido' cubre el período en que el padrón todavía no está cargado.
alter table solicitudes
  add column if not exists fleet_status text
  check (fleet_status in ('en_flota', 'fuera_de_flota', 'desconocido'))
  default 'desconocido';

-- Marca explícita de "este bus no tiene disco duro". Se guarda aparte de
-- failure_type porque failure_type lo edita el operador y puede cambiar,
-- mientras que este hecho proviene del padrón y debe sobrevivir esa edición.
alter table solicitudes
  add column if not exists sin_disco boolean not null default false;

-- De dónde salió la marca: 'flota' (padrón), 'bus_failures' (reporte previo)
-- o 'manual' (lo marcó el operador en el formulario).
alter table solicitudes
  add column if not exists sin_disco_source text
  check (sin_disco_source in ('flota', 'bus_failures', 'manual'));

create index if not exists solicitudes_sin_disco_idx on solicitudes (sin_disco) where sin_disco = true;
create index if not exists solicitudes_fleet_status_idx on solicitudes (fleet_status);

-- ---------------------------------------------------------------------------
-- 3. RLS (mismo criterio que las tablas existentes)
-- ---------------------------------------------------------------------------
alter table padron_flota enable row level security;

drop policy if exists "Allow public read padron_flota" on padron_flota;
create policy "Allow public read padron_flota"
  on padron_flota for select
  to anon
  using (true);

drop policy if exists "Allow public insert padron_flota" on padron_flota;
create policy "Allow public insert padron_flota"
  on padron_flota for insert
  to anon
  with check (true);

drop policy if exists "Allow public update padron_flota" on padron_flota;
create policy "Allow public update padron_flota"
  on padron_flota for update
  to anon
  using (true);

drop policy if exists "Allow public delete padron_flota" on padron_flota;
create policy "Allow public delete padron_flota"
  on padron_flota for delete
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- 4. Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table padron_flota;
exception
  when duplicate_object then null;
end;
$$;
