-- Documentos marcados como "incluidos dentro del Curriculum Vitae".
--
-- Algunos ponentes entregan el RTU, el DPI, el título y la constancia de
-- colegiado activo dentro del propio CV. En esos casos no se sube un archivo por
-- cada uno: se marcan aquí y cuentan como entregados en el resumen del
-- expediente (por ejemplo, 5 de 7 con un solo archivo cargado).
--
-- Ejecutar una vez en el SQL Editor de Supabase. No toca ningún dato.
alter table public.caeduc_expediente_ponentes
  add column if not exists incluidos_en_cv text[] not null default '{}'::text[];

comment on column public.caeduc_expediente_ponentes.incluidos_en_cv is
  'Tipos de documento que vienen dentro del CV (rtu, dpi, titulo, colegiado). Cuentan como entregados sin archivo propio.';
