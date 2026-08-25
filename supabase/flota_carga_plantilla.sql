-- ============================================================================
-- PLANTILLA DE CARGA DEL PADRÓN DE FLOTA
--
-- Ejecutar DESPUÉS de la migración
-- supabase/migrations/20260825000000_flota_y_control_disco.sql
--
-- Mientras esta tabla esté vacía, la app NO bloquea ninguna solicitud: no
-- puede afirmar que una PPU sea ajena si todavía no sabe cuáles son propias.
-- El bloqueo por "fuera de flota" se activa solo con el padrón cargado.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columnas
--   ppu          patente. Se normaliza sola (mayúsculas, sin puntos ni guiones)
--   interno      número interno del bus            (opcional)
--   terminal     terminal o base de operación      (opcional)
--   modelo       modelo del bus                    (opcional)
--   tiene_disco  false = EL BUS NO TIENE DISCO DURO  <<< el dato clave
--   activo       false = dado de baja              (por defecto true)
--   notas        texto libre                       (opcional)
-- ---------------------------------------------------------------------------

insert into padron_flota (ppu, interno, terminal, modelo, tiene_disco, activo, notas) values
  ('BXGH12', '1001', 'El Roble', 'Marcopolo', true,  true, null),
  ('CJKL34', '1002', 'El Roble', 'Caio',      true,  true, null),
  -- Ejemplo de bus SIN disco duro: genera el aviso y el correo
  -- "BUS NO TIENE DISCO PARA SU REVISION".
  ('DMNP56', '1003', 'El Roble', 'Marcopolo', false, true, 'Sin disco duro instalado')
on conflict (ppu) do update set
  interno     = excluded.interno,
  terminal    = excluded.terminal,
  modelo      = excluded.modelo,
  tiene_disco = excluded.tiene_disco,
  activo      = excluded.activo,
  notas       = excluded.notas,
  updated_at  = now();

-- ---------------------------------------------------------------------------
-- Si solo hay una lista de patentes y todas tienen disco:
-- ---------------------------------------------------------------------------
-- insert into padron_flota (ppu)
-- select unnest(array['BXGH12','CJKL34','DMNP56'])
-- on conflict (ppu) do nothing;

-- ---------------------------------------------------------------------------
-- Marcar buses sin disco duro sobre un padrón ya cargado:
-- ---------------------------------------------------------------------------
-- update padron_flota
--    set tiene_disco = false,
--        notas = coalesce(notas, 'Sin disco duro instalado')
--  where ppu in ('DMNP56', 'XXYY99');

-- ---------------------------------------------------------------------------
-- Verificaciones
-- ---------------------------------------------------------------------------
-- select count(*) as total_flota from padron_flota;
-- select count(*) as sin_disco from padron_flota where tiene_disco = false;
-- select ppu, interno, terminal from padron_flota where tiene_disco = false order by ppu;
