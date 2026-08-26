-- ============================================================================
-- Poder volver a enviar una solicitud ya enviada
--
-- Un caso enviado con datos mal configurados quedaba cerrado sin vuelta atrás:
-- el estado 'enviado' lo saca de la bandeja de envíos y no había forma de
-- devolverlo. Estas columnas permiten reabrirlo sin perder la constancia de que
-- ya se había enviado antes.
-- ============================================================================

-- Momento en que se devolvió a la cola. Se conserva junto a `sent_at`, que
-- sigue guardando el último envío: saber que un caso se envió y luego se
-- reabrió es justamente lo que hay que poder reconstruir.
alter table solicitudes
  add column if not exists reopened_at timestamptz;

-- Cuántas veces se ha enviado. Distingue un envío normal de un reenvío, que es
-- lo que el destinatario necesita ver en el correo para no tratarlo como un
-- caso nuevo.
alter table solicitudes
  add column if not exists send_count integer not null default 0;

-- Los casos ya enviados antes de existir esta columna se cuentan como un envío;
-- dejarlos en cero haría pasar por primer envío lo que en realidad es el
-- segundo.
update solicitudes
   set send_count = 1
 where status = 'enviado'
   and send_count = 0;

create index if not exists solicitudes_reopened_at_idx
  on solicitudes (reopened_at)
  where reopened_at is not null;
