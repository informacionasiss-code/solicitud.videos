-- ============================================================================
-- Impugnaciones
--
-- Se sube un archivo con los requerimientos (fecha, unidad, servicio, sentido,
-- patente, hora, zona), se cruza contra el padrón de flota y el resultado queda
-- persistido: la tabla se va llenando a medida que avanzan las revisiones y se
-- exporta a Excel. No genera correos.
-- ============================================================================

create table if not exists impugnaciones (
  id uuid default uuid_generate_v4() primary key,

  -- Agrupa las filas que entraron en una misma carga, para poder listar,
  -- exportar o descartar un archivo completo.
  lote_id uuid not null,
  archivo text,
  -- Posición dentro del archivo ya ordenado; conserva el orden al releer.
  orden integer,

  -- Datos tal como vienen del archivo
  fecha date,
  unidad text,
  servicio text,
  sentido text,
  hora text,          -- se guarda como texto: llega en formatos variados
  zona text,

  -- PPU normalizada (sin guion, en mayúsculas) y la original para trazabilidad
  ppu text not null,
  ppu_original text,

  -- Resultado del cruce con el padrón, congelado al momento de la carga
  en_flota boolean not null default false,
  sin_disco boolean not null default false,
  interno text,

  -- Lo que se va completando con las revisiones
  video_url text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_revision', 'con_video', 'sin_disco', 'sin_video', 'no_aplica')),
  obs text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists impugnaciones_lote_idx on impugnaciones (lote_id, orden);
create index if not exists impugnaciones_ppu_idx on impugnaciones (ppu);
create index if not exists impugnaciones_estado_idx on impugnaciones (estado);

-- Una misma fila del archivo no debe entrar dos veces si se recarga el lote.
create unique index if not exists impugnaciones_lote_fila_key
  on impugnaciones (lote_id, ppu, fecha, hora);

create or replace function impugnaciones_touch()
returns trigger
language plpgsql
as $$
begin
  new.ppu := upper(regexp_replace(coalesce(new.ppu, ''), '[^A-Za-z0-9]', '', 'g'));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists impugnaciones_touch_trg on impugnaciones;
create trigger impugnaciones_touch_trg
  before insert or update on impugnaciones
  for each row execute function impugnaciones_touch();

-- ---------------------------------------------------------------------------
-- RLS (mismo criterio que el resto de las tablas)
-- ---------------------------------------------------------------------------
alter table impugnaciones enable row level security;

drop policy if exists "Allow public read impugnaciones" on impugnaciones;
create policy "Allow public read impugnaciones"
  on impugnaciones for select to anon using (true);

drop policy if exists "Allow public insert impugnaciones" on impugnaciones;
create policy "Allow public insert impugnaciones"
  on impugnaciones for insert to anon with check (true);

drop policy if exists "Allow public update impugnaciones" on impugnaciones;
create policy "Allow public update impugnaciones"
  on impugnaciones for update to anon using (true);

drop policy if exists "Allow public delete impugnaciones" on impugnaciones;
create policy "Allow public delete impugnaciones"
  on impugnaciones for delete to anon using (true);

do $$
begin
  alter publication supabase_realtime add table impugnaciones;
exception
  when duplicate_object then null;
end;
$$;
