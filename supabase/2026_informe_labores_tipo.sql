-- Informe de labores: tipo de actividad corregible en pantalla
--
-- Ejecutar una vez en el SQL Editor de Supabase (después de
-- 2026_informe_labores.sql). Agrega la columna `tipo` a los ajustes del informe
-- para guardar el tipo de actividad (Taller, Conferencia, Diplomado...) que se
-- elige en pantalla cuando la actividad no lo trae o venía equivocado.
-- Mientras no se ejecute, el tipo elegido se usa en el informe del momento
-- pero no queda guardado; los demás ajustes siguen guardándose.

alter table public.caeduc_informe_labores_ajustes
  add column if not exists tipo text;

notify pgrst, 'reload schema';
