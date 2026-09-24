-- Miembros de la Comisión (Directorio → Miembros).
--
-- Quién ocupa cada puesto, con su rol designado, cumpleaños, número de colegiado
-- y teléfono. El cumpleaños alimenta el aviso que aparece en el menú de inicio
-- la semana antes de la fecha.
--
-- Ejecutar una vez en el SQL Editor de Supabase.
create table if not exists public.caeduc_miembros_comision (
  id uuid primary key default gen_random_uuid(),
  cargo text not null,
  nombre text,
  rol_designado text,
  -- Solo importan el día y el mes; el año de nacimiento no se imprime.
  cumpleanos date,
  numero_colegiado text,
  telefono text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caeduc_miembros_comision_cargo_idx
  on public.caeduc_miembros_comision (cargo);

-- Reutiliza el disparador de updated_at creado con los expedientes; si esta
-- migración se corre sola, la función se crea aquí.
create or replace function public.caeduc_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists caeduc_miembros_comision_touch on public.caeduc_miembros_comision;
create trigger caeduc_miembros_comision_touch
  before update on public.caeduc_miembros_comision
  for each row execute function public.caeduc_touch_updated_at();

-- Datos internos de la comisión: solo con sesión iniciada.
alter table public.caeduc_miembros_comision enable row level security;

drop policy if exists caeduc_miembros_comision_rw on public.caeduc_miembros_comision;
create policy caeduc_miembros_comision_rw on public.caeduc_miembros_comision
  for all to authenticated using (true) with check (true);
