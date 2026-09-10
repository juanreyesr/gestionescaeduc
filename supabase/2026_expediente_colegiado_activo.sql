-- Constancia de colegiado activo en el expediente del ponente.
--
-- La tabla de documentos limita los tipos permitidos con un CHECK, así que para
-- admitir el documento nuevo hay que reemplazar esa restricción. Se ejecuta una
-- vez en el SQL Editor de Supabase.
--
-- No toca ningún dato: los documentos ya cargados siguen igual.
alter table public.caeduc_expediente_documentos
  drop constraint if exists caeduc_expediente_documentos_tipo_check;

alter table public.caeduc_expediente_documentos
  add constraint caeduc_expediente_documentos_tipo_check
  check (tipo in ('cv', 'rtu', 'dpi', 'titulo', 'colegiado', 'factura', 'informe'));
