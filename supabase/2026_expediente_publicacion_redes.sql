-- Registro de la publicación que salió en redes para cada actividad.
--
-- No es un requisito de Tesorería (no cuenta en el avance del expediente), pero
-- sí viaja dentro del paquete que se descarga para facturar. Como el tipo de
-- documento está limitado por un CHECK, hay que reemplazar esa restricción.
--
-- Ejecutar una vez en el SQL Editor de Supabase. No toca ningún dato.
alter table public.caeduc_expediente_documentos
  drop constraint if exists caeduc_expediente_documentos_tipo_check;

alter table public.caeduc_expediente_documentos
  add constraint caeduc_expediente_documentos_tipo_check
  check (tipo in ('cv', 'rtu', 'dpi', 'titulo', 'colegiado', 'factura', 'informe', 'redes'));
