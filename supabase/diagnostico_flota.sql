-- Qué columnas tiene hoy la tabla `flota`
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'padron_flota'
 order by ordinal_position;

-- Cuántas filas trae y si hay algo cargado
select count(*) as filas from padron_flota;

-- Restricciones e índices existentes sobre flota
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and tablename = 'padron_flota';
