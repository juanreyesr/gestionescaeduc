-- Seguridad: los datos internos de CAEDUC solo para el personal de gestiones
--
-- PROBLEMA (verificado el 2026-11-10): con la clave pública de la app, SIN
-- iniciar sesión, se podían leer planificacion_* (presupuestos, montos, gastos)
-- y la vista oficios. Además, el aula virtual comparte este proyecto y permite
-- registrarse a cualquiera, así que las políticas "to authenticated using (true)"
-- dejaban expedientes, publicaciones, etc. al alcance de cualquier usuario del aula.
--
-- SOLUCIÓN: cada tabla interna queda con una sola política: acceso total para
-- public.es_personal_caeduc() (tiene fila en public.profiles o es la cuenta de
-- administración). Se quitan las políticas anteriores de esas tablas.
--
-- NO se tocan: avales (formulario y verificación públicos), cpg_* (aula
-- virtual), los buckets públicos (firmas-sellos, avales-files, plantillas).
--
-- ANTES DE EJECUTAR: confirma que cada persona que usa gestiones aparece en
-- Configuración → Usuarios (tabla profiles). Quien no esté ahí dejará de ver
-- la información. Ejecutar en el SQL Editor de Supabase; es idempotente.

-- 1. Función que identifica al personal (también está en 2026_sincronizacion_actividades.sql)
create or replace function public.es_personal_caeduc()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles p where p.id = auth.uid())
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'lic.juanreyesr@gmail.com'
  );
$$;
revoke all on function public.es_personal_caeduc() from public, anon;
grant execute on function public.es_personal_caeduc() to authenticated;

-- 2. Tablas internas: solo personal CAEDUC
do $$
declare
  v_tabla text;
  v_pol record;
  v_tablas text[] := array[
    'planificacion_actividades', 'planificacion_responsables', 'planificacion_rubros',
    'planificacion_gastos_rubro', 'planificacion_gastos_actividad',
    'planificacion_fondos_adicionales', 'planificacion_presupuesto_anual',
    'caeduc_publicaciones', 'caeduc_expediente_ponentes', 'caeduc_expediente_documentos',
    'caeduc_oficio_documentos', 'caeduc_puntos_resolutivos', 'caeduc_miembros_comision',
    'caeduc_informe_labores_ajustes', 'caeduc_informes_actividades',
    'caeduc_agenda_pendientes', 'caeduc_agenda_puntos', 'caeduc_agendas',
    'internal_documents', 'cartas', 'directorio_personas',
    'procedimientos', 'procedimiento_pasos',
    'proveedores', 'proveedor_categorias',
    'souvenirs', 'souvenir_compras', 'souvenir_descargos',
    'profiles'
  ];
  v_base regclass;
begin
  -- La vista "oficios" lee de una tabla base: también se protege esa tabla.
  if to_regclass('public.oficios') is not null then
    select min(d.refobjid)::regclass into v_base
    from pg_depend d
    join pg_rewrite r on r.oid = d.objid
    join pg_class c on c.oid = d.refobjid and c.relkind in ('r', 'p')
    where r.ev_class = 'public.oficios'::regclass;
    if v_base is not null then
      v_tablas := v_tablas || (select relname::text from pg_class where oid = v_base);
    end if;
    -- La vista respeta las políticas de quien consulta (no las del dueño).
    execute 'alter view public.oficios set (security_invoker = true)';
    execute 'revoke all on public.oficios from anon';
  end if;

  foreach v_tabla in array v_tablas loop
    if to_regclass('public.' || quote_ident(v_tabla)) is null then
      continue;
    end if;
    for v_pol in select policyname from pg_policies where schemaname = 'public' and tablename = v_tabla loop
      execute format('drop policy if exists %I on public.%I', v_pol.policyname, v_tabla);
    end loop;
    execute format('alter table public.%I enable row level security', v_tabla);
    execute format('revoke all on public.%I from anon', v_tabla);
    execute format('grant select, insert, update, delete on public.%I to authenticated', v_tabla);
    execute format(
      'create policy caeduc_solo_personal on public.%I for all to authenticated
         using (public.es_personal_caeduc()) with check (public.es_personal_caeduc())',
      v_tabla);
  end loop;
end $$;

-- 3. app_settings: lectura pública (la pantalla de inicio la necesita), escritura solo personal.
do $$
declare v_pol record;
begin
  if to_regclass('public.app_settings') is null then return; end if;
  for v_pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_settings' loop
    execute format('drop policy if exists %I on public.app_settings', v_pol.policyname);
  end loop;
  alter table public.app_settings enable row level security;
  create policy app_settings_lectura on public.app_settings for select to anon, authenticated using (true);
  create policy app_settings_escritura on public.app_settings for all to authenticated
    using (public.es_personal_caeduc()) with check (public.es_personal_caeduc());
end $$;

-- 4. Archivos privados (Storage): solo personal CAEDUC
do $$
declare
  v_pol record;
  v_buckets text[] := array['caeduc-puntos-resolutivos', 'caeduc-expedientes', 'caeduc-publicaciones', 'souvenirs-facturas'];
  v_bucket text;
begin
  for v_pol in
    select policyname, coalesce(qual, '') || coalesce(with_check, '') as def
    from pg_policies where schemaname = 'storage' and tablename = 'objects'
  loop
    foreach v_bucket in array v_buckets loop
      if v_pol.def like '%' || v_bucket || '%' then
        execute format('drop policy if exists %I on storage.objects', v_pol.policyname);
        exit;
      end if;
    end loop;
  end loop;
  create policy caeduc_archivos_solo_personal on storage.objects for all to authenticated
    using (bucket_id = any (array['caeduc-puntos-resolutivos', 'caeduc-expedientes', 'caeduc-publicaciones', 'souvenirs-facturas']) and public.es_personal_caeduc())
    with check (bucket_id = any (array['caeduc-puntos-resolutivos', 'caeduc-expedientes', 'caeduc-publicaciones', 'souvenirs-facturas']) and public.es_personal_caeduc());
end $$;

notify pgrst, 'reload schema';

-- ── Comprobación (ejecutar después) ──────────────────────────────────────────
-- Debe devolver una fila por tabla con la política caeduc_solo_personal:
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and policyname = 'caeduc_solo_personal' order by 1;
--
-- ── Si alguien del personal se queda sin acceso ──────────────────────────────
-- Agrégalo en Configuración → Usuarios de gestiones (crea su fila en profiles).
-- Emergencia (vuelve a abrir solo la planificación a cualquier usuario con sesión):
--   drop policy caeduc_solo_personal on public.planificacion_actividades;
--   create policy temporal on public.planificacion_actividades for all to authenticated using (true) with check (true);
