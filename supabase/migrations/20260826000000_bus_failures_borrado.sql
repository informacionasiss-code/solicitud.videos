-- ============================================================================
-- Permitir corregir la lista de buses sin disco
--
-- `bus_failures` sólo tenía políticas de lectura e inserción. Un bus mal
-- reportado quedaba marcado para siempre: la aplicación podía añadirlo pero no
-- quitarlo, y como el cruce usa esa tabla como respaldo, el bus seguía saliendo
-- como "sin disco" aunque su ficha en el padrón dijera lo contrario.
-- ============================================================================

alter table bus_failures enable row level security;

drop policy if exists "Allow public delete bus_failures" on bus_failures;
create policy "Allow public delete bus_failures"
  on bus_failures for delete
  to anon
  using (true);

drop policy if exists "Allow public update bus_failures" on bus_failures;
create policy "Allow public update bus_failures"
  on bus_failures for update
  to anon
  using (true);

-- Las búsquedas por patente y tipo son las que hace el cruce en cada carga.
create index if not exists bus_failures_ppu_idx on bus_failures (ppu);
create index if not exists bus_failures_tipo_ppu_idx on bus_failures (failure_type, ppu);
