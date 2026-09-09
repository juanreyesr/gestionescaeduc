-- Puntos resolutivos y Expediente de ponentes (pestañas nuevas de Oficios y Cartas)
--
-- Ejecutar una vez en el SQL Editor de Supabase.
-- Todo queda privado y detrás del inicio de sesión: aquí se guardan DPI, RTU y
-- documentos personales de los ponentes, así que los buckets NO son públicos y
-- la app los lee siempre con enlaces firmados de corta duración.

-- ── 1. Puntos resolutivos ────────────────────────────────────────────────────
create table if not exists public.caeduc_puntos_resolutivos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  fecha_resolucion date,
  notas text,
  documento_path text,
  documento_nombre text,
  -- Fecha de carga del documento escaneado. La registra la app sola cada vez
  -- que se sube o se reemplaza el archivo; no se escribe a mano.
  documento_cargado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caeduc_puntos_resolutivos_fecha_idx
  on public.caeduc_puntos_resolutivos (fecha_resolucion desc nulls last);

-- ── 2. Expediente de ponentes ────────────────────────────────────────────────
-- Un expediente por actividad de "Solicitud de publicación". Los datos de la
-- actividad se copian al crearlo para que el expediente conserve lo que se pidió
-- aunque después se edite o se borre la solicitud original.
create table if not exists public.caeduc_expediente_ponentes (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid,
  ponente_nombre text,
  ponente_grado text,
  actividad_nombre text,
  actividad_fecha text,
  actividad_hora text,
  actividad_lugar text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists caeduc_expediente_ponentes_publicacion_idx
  on public.caeduc_expediente_ponentes (publicacion_id)
  where publicacion_id is not null;

-- Los documentos van en su propia tabla, no en columnas fijas: así se cargan de
-- a poco y un mismo tipo admite varios archivos (por ejemplo, ambos lados del
-- DPI) sin cambiar el esquema.
create table if not exists public.caeduc_expediente_documentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null
    references public.caeduc_expediente_ponentes (id) on delete cascade,
  tipo text not null check (tipo in ('cv', 'rtu', 'dpi', 'titulo', 'factura', 'informe')),
  archivo_path text not null,
  archivo_nombre text,
  archivo_tamano bigint,
  -- Fecha de carga automática de cada documento.
  created_at timestamptz not null default now()
);

create index if not exists caeduc_expediente_documentos_expediente_idx
  on public.caeduc_expediente_documentos (expediente_id, tipo);

-- ── 3. Fila de actualización automática de updated_at ────────────────────────
create or replace function public.caeduc_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists caeduc_puntos_resolutivos_touch on public.caeduc_puntos_resolutivos;
create trigger caeduc_puntos_resolutivos_touch
  before update on public.caeduc_puntos_resolutivos
  for each row execute function public.caeduc_touch_updated_at();

drop trigger if exists caeduc_expediente_ponentes_touch on public.caeduc_expediente_ponentes;
create trigger caeduc_expediente_ponentes_touch
  before update on public.caeduc_expediente_ponentes
  for each row execute function public.caeduc_touch_updated_at();

-- ── 4. Seguridad: solo personas con sesión iniciada ──────────────────────────
alter table public.caeduc_puntos_resolutivos    enable row level security;
alter table public.caeduc_expediente_ponentes   enable row level security;
alter table public.caeduc_expediente_documentos enable row level security;

drop policy if exists caeduc_puntos_resolutivos_rw on public.caeduc_puntos_resolutivos;
create policy caeduc_puntos_resolutivos_rw on public.caeduc_puntos_resolutivos
  for all to authenticated using (true) with check (true);

drop policy if exists caeduc_expediente_ponentes_rw on public.caeduc_expediente_ponentes;
create policy caeduc_expediente_ponentes_rw on public.caeduc_expediente_ponentes
  for all to authenticated using (true) with check (true);

drop policy if exists caeduc_expediente_documentos_rw on public.caeduc_expediente_documentos;
create policy caeduc_expediente_documentos_rw on public.caeduc_expediente_documentos
  for all to authenticated using (true) with check (true);

-- ── 5. Buckets privados de archivos ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('caeduc-puntos-resolutivos', 'caeduc-puntos-resolutivos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('caeduc-expedientes', 'caeduc-expedientes', false)
on conflict (id) do nothing;

drop policy if exists caeduc_puntos_resolutivos_objetos on storage.objects;
create policy caeduc_puntos_resolutivos_objetos on storage.objects
  for all to authenticated
  using (bucket_id = 'caeduc-puntos-resolutivos')
  with check (bucket_id = 'caeduc-puntos-resolutivos');

drop policy if exists caeduc_expedientes_objetos on storage.objects;
create policy caeduc_expedientes_objetos on storage.objects
  for all to authenticated
  using (bucket_id = 'caeduc-expedientes')
  with check (bucket_id = 'caeduc-expedientes');
