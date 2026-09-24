-- Renombra "puesto" a "cargo" en los miembros de la comisión.
--
-- Es solo el nombre de la columna: no se pierde ni se cambia ningún dato.
-- Ejecutar una vez en el SQL Editor de Supabase.
--
-- El `if exists` deja correrlo sin miedo aunque ya se haya renombrado.
alter table public.caeduc_miembros_comision
  rename column puesto to cargo;

alter index if exists caeduc_miembros_comision_puesto_idx
  rename to caeduc_miembros_comision_cargo_idx;
