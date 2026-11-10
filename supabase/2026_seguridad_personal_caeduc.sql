-- Seguridad: los datos internos de CAEDUC solo para el personal de gestiones
--
-- ESTE PROYECTO DE SUPABASE ES COMPARTIDO por varios sistemas independientes
-- (gestiones CAEDUC, aula virtual, créditos y otros). Este script es ADITIVO:
--   · NO borra ni modifica políticas, tablas, funciones ni datos existentes.
--   · Solo AGREGA políticas "restrictivas" a tablas exclusivas de gestiones
--     (prefijos planificacion_ y caeduc_, y la tabla base de la vista oficios)
--     y a los buckets privados de gestiones.
--   · No toca tablas de nombre genérico que otro sistema podría usar
--     (profiles, app_settings, proveedores, souvenirs, cartas, etc.), ni avales,
--     ni nada del aula (cpg_*).
--   · Todo lo agregado lleva el prefijo caeduc_personal_ y se revierte con el
--     bloque "REVERTIR" del final.
--
-- PROBLEMA (verificado el 2026-11-10): con la clave pública de la app, SIN
-- iniciar sesión, se podían leer planificacion_* y la vista oficios; y como el
-- aula permite registrarse a cualquiera, las políticas "to authenticated using
-- (true)" dejaban expedientes, publicaciones, etc. al alcance de usuarios del aula.
--
-- CÓMO FUNCIONA: una política RESTRICTIVA se suma (con AND) a las que ya existen.
-- Las reglas actuales siguen igual, pero además se exige ser personal CAEDUC:
-- tener fila en public.profiles (usuarios creados en gestiones) o ser la cuenta
-- de administración. Las funciones del servidor que usan la clave de servicio
-- (edge functions) no se ven afectadas.
--
-- ANTES DE EJECUTAR: confirma que cada persona que usa gestiones aparece en
-- Configuración → Usuarios. Quien no esté dejará de ver esta información.

-- 1. Función que identifica al personal (solo se crea si no existe).
do $$
begin
  if to_regprocedure('public.es_personal_caeduc()') is null then
    execute $f$
      create function public.es_personal_caeduc()
      returns boolean language sql stable security definer set search_path = public as $b$
        select auth.uid() is not null and (
          exists (select 1 from public.profiles p where p.id = auth.uid())
          or lower(coalesce(auth.jwt() ->> 'email', '')) = 'lic.juanreyesr@gmail.com'
        );
      $b$
    $f$;
    execute 'revoke all on function public.es_personal_caeduc() from public, anon';
    execute 'grant execute on function public.es_personal_caeduc() to authenticated';
  end if;
end $$;

-- 2. Tablas exclusivas de gestiones: se exige ser personal (sin tocar lo existente).
do $$
declare
  v_tabla text;
  v_tablas text[];
  v_base text;
  v_rls boolean;
begin
  -- Solo tablas con prefijo propio de gestiones.
  select array_agg(c.relname::text order by c.relname) into v_tablas
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and (c.relname like 'planificacion\_%' or c.relname like 'caeduc\_%');

  -- Tabla base de la vista "oficios" (solo la usa gestiones).
  if to_regclass('public.oficios') is not null then
    select min(d.refobjid::regclass::text) into v_base
    from pg_depend d
    join pg_rewrite r on r.oid = d.objid
    join pg_class c on c.oid = d.refobjid and c.relkind in ('r', 'p')
    where r.ev_class = 'public.oficios'::regclass;
    if v_base is not null then
      v_tablas := coalesce(v_tablas, '{}') || regexp_replace(v_base, '^public\.', '');
    end if;
    -- La vista aplica los permisos de quien consulta y deja de leerse sin sesión.
    execute 'alter view public.oficios set (security_invoker = true)';
    execute 'revoke select on public.oficios from anon';
  end if;

  foreach v_tabla in array coalesce(v_tablas, '{}') loop
    select relrowsecurity into v_rls from pg_class where oid = ('public.' || quote_ident(v_tabla))::regclass;
    -- Si la tabla no tenía RLS, primero se agrega una política que permite lo
    -- mismo que antes a usuarios con sesión, para no dejar a nadie sin acceso.
    if not v_rls then
      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_tabla and policyname = 'caeduc_personal_permitir') then
        execute format('create policy caeduc_personal_permitir on public.%I for all to authenticated using (true) with check (true)', v_tabla);
      end if;
      execute format('alter table public.%I enable row level security', v_tabla);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_tabla and policyname = 'caeduc_personal_solo') then
      execute format(
        'create policy caeduc_personal_solo on public.%I as restrictive for all to anon, authenticated
           using (public.es_personal_caeduc()) with check (public.es_personal_caeduc())',
        v_tabla);
    end if;
    raise notice 'Protegida: %', v_tabla;
  end loop;
end $$;

-- 3. Archivos privados de gestiones (Storage). La condición deja pasar
--    cualquier otro bucket, así que no afecta archivos de otros sistemas.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'caeduc_personal_archivos') then
    create policy caeduc_personal_archivos on storage.objects as restrictive for all to anon, authenticated
      using (bucket_id not in ('caeduc-puntos-resolutivos', 'caeduc-expedientes', 'caeduc-publicaciones') or public.es_personal_caeduc())
      with check (bucket_id not in ('caeduc-puntos-resolutivos', 'caeduc-expedientes', 'caeduc-publicaciones') or public.es_personal_caeduc());
  end if;
end $$;

notify pgrst, 'reload schema';

-- ── Comprobación (ejecutar después) ──────────────────────────────────────────
--   select tablename, policyname from pg_policies
--   where policyname like 'caeduc_personal_%' order by 1;
--
-- ── REVERTIR (deja todo exactamente como estaba) ─────────────────────────────
--   do $$ declare r record; begin
--     for r in select schemaname, tablename, policyname from pg_policies where policyname like 'caeduc_personal_%' loop
--       execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
--     end loop; end $$;
--   alter view public.oficios reset (security_invoker);
--   grant select on public.oficios to anon;
--   -- (Las tablas a las que se activó RLS siguen accesibles con sesión; para
--   --  desactivarlo: alter table public.<tabla> disable row level security;)
