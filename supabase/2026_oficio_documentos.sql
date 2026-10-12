-- Documentos adjuntos de un oficio (varios por oficio)
--
-- Ejecutar una vez en el SQL Editor de Supabase.
-- Un oficio acumula documentos con el tiempo: el punto resolutivo, la respuesta
-- de Junta Directiva, una certificación... Cada archivo es una fila con su
-- etiqueta, así no hace falta una columna nueva por cada tipo de documento.
--
-- oficio_id es texto y sin llave foránea porque "oficios" es una vista; la app
-- guarda ahí el id del oficio tal cual. Los archivos van al bucket privado
-- caeduc-puntos-resolutivos (creado en 2026_puntos_resolutivos_y_expedientes.sql),
-- dentro de la carpeta oficios/<id del oficio>/.

create table if not exists public.caeduc_oficio_documentos (
  id uuid primary key default gen_random_uuid(),
  oficio_id text not null,
  etiqueta text,
  archivo_path text not null,
  archivo_nombre text,
  archivo_tamano bigint,
  -- Fecha de carga automática de cada documento.
  created_at timestamptz not null default now()
);

create index if not exists caeduc_oficio_documentos_oficio_idx
  on public.caeduc_oficio_documentos (oficio_id, created_at);

alter table public.caeduc_oficio_documentos enable row level security;

drop policy if exists caeduc_oficio_documentos_rw on public.caeduc_oficio_documentos;
create policy caeduc_oficio_documentos_rw on public.caeduc_oficio_documentos
  for all to authenticated using (true) with check (true);

-- Por si el bucket aún no existe en este proyecto.
insert into storage.buckets (id, name, public)
values ('caeduc-puntos-resolutivos', 'caeduc-puntos-resolutivos', false)
on conflict (id) do nothing;

drop policy if exists caeduc_puntos_resolutivos_objetos on storage.objects;
create policy caeduc_puntos_resolutivos_objetos on storage.objects
  for all to authenticated
  using (bucket_id = 'caeduc-puntos-resolutivos')
  with check (bucket_id = 'caeduc-puntos-resolutivos');

notify pgrst, 'reload schema';
