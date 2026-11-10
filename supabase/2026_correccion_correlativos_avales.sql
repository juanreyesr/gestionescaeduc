-- Corrección de correlativos de avales (revisión del 2026-11-10)
-- APLICADO en producción el 2026-11-10 sobre gestiones.avales (3 filas actualizadas).
--
-- Solo modifica 3 filas de public.avales, identificadas por id Y por su
-- correlativo actual: si alguien ya las corrigió, no cambia nada.
-- No toca ninguna otra tabla ni otro sistema del proyecto.
--
--   id 33 · CAEDUC-27-2026 (2.º con ese número, 21-may-2026 23:00) → CAEDUC-57-2026
--   id 61 · CAEDUC-48-2026 (2.º con ese número, 10-sep-2026)       → CAEDUC-58-2026
--   id 47 · CAEDU-37-2026  (mal escrito)                           → CAEDUC-37-2026
--
-- Se mantienen: id 32 (CAEDUC-27-2026) y id 58 (CAEDUC-48-2026), los primeros
-- en recibir el número.

begin;

update gestiones.avales set correlativo = 'CAEDUC-57-2026'
where id = 33 and correlativo = 'CAEDUC-27-2026';

update gestiones.avales set correlativo = 'CAEDUC-58-2026'
where id = 61 and correlativo = 'CAEDUC-48-2026';

update gestiones.avales set correlativo = 'CAEDUC-37-2026'
where id = 47 and correlativo = 'CAEDU-37-2026';

-- Revisión: deben aparecer los 5 avales con su número final.
select id, correlativo, status, approval_date
from gestiones.avales
where id in (32, 33, 47, 58, 61)
order by correlativo;

commit;
