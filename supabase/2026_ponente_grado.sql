-- Grado académico del profesional en la solicitud de publicación.
--
-- Es un dato interno: NO se publica, no se envía en el mensaje de redes ni sale
-- de la comisión. Solo alimenta dos cosas:
--   1. el oficio de "Solicitud de pago de honorarios a ponentes" (calcula el
--      monto de cada actividad según el tarifario), y
--   2. el modelo de factura del Directorio.
--
-- Ejecutar una vez en el SQL Editor de Supabase.
alter table public.caeduc_publicaciones
  add column if not exists ponente_grado text;

comment on column public.caeduc_publicaciones.ponente_grado is
  'Grado academico del ponente (Licenciatura, Maestria, Doctorado, Post Doctorado). Uso interno: honorarios y facturacion. No se publica.';
