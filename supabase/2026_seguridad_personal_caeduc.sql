-- Seguridad de gestiones CAEDUC (proyecto Supabase compartido con aula virtual y créditos)
--
-- APLICADO en producción el 2026-11-10 (migración "gestiones_seguridad_personal_caeduc"),
-- después de un ensayo con rollback: anónimo y usuarios del aula bloqueados en datos
-- internos; personal con acceso completo; avales/configuración/aula sin cambios visibles.
--
-- Estructura real: las tablas de gestiones viven en el esquema `gestiones` y la
-- app las usa a través de vistas en `public`. Esas vistas se ejecutaban con los
-- permisos de su dueño (postgres), así que se saltaban las reglas de seguridad:
-- cualquiera con la clave pública (sin sesión) o cualquier usuario del aula podía
-- leer y MODIFICAR planificación, oficios, perfiles (incluso darse de alta como
-- personal), configuración, etc.
--
-- Qué hace este script (solo objetos de gestiones; nada del aula `aulacaeduc`/cpg_*
-- ni de créditos):
--   1. Vistas internas: se quita el acceso anónimo y la vista pasa a respetar las
--      reglas de la tabla (security_invoker). En la tabla base se AGREGA una regla
--      restrictiva: solo personal (fila activa en gestiones.profiles).
--   2. profiles: el personal puede administrar todos los perfiles; nadie más puede
--      verlos ni darse de alta.
--   3. avales: el formulario público y la verificación siguen funcionando (leer e
--      insertar); modificar/borrar queda solo para el personal.
--   4. app_settings: lectura pública (pantalla de inicio); escribir solo personal.
--   5. Tablas internas en public (caeduc_*, souvenirs, proveedores): sin acceso
--      anónimo y regla restrictiva de personal.
--   6. Archivos privados de gestiones (3 buckets caeduc-*): solo personal.
-- No se borra ninguna regla existente: todo lo nuevo se llama caeduc_personal_*.
-- Ver el bloque REVERTIR al final.

-- Requiere public.es_personal_caeduc() (creada en 2026_sincronizacion_actividades.sql).
-- IMPORTANTE: anon debe tener EXECUTE sobre esa función (ver
-- 2026_es_personal_ejecutable_anon.sql); si no, las reglas restrictivas hacen
-- fallar cualquier acceso anónimo a archivos.

do $$
declare
  v text;
  b text;
  vistas text[] := array[
    'activities','caeduc_agenda_pendientes','caeduc_agenda_puntos','caeduc_agendas',
    'caeduc_informes_actividades','cartas','directorio_personas','internal_documents','oficios',
    'planificacion_actividades','planificacion_fondos_adicionales','planificacion_gastos_actividad',
    'planificacion_gastos_rubro','planificacion_presupuesto_anual','planificacion_responsables',
    'planificacion_rubros','procedimiento_pasos','procedimientos','profiles','tasks'];
  tablas text[] := array[
    'caeduc_publicaciones','caeduc_expediente_ponentes','caeduc_expediente_documentos',
    'caeduc_oficio_documentos','caeduc_puntos_resolutivos','caeduc_miembros_comision',
    'caeduc_informe_labores_ajustes','souvenirs','souvenir_compras','souvenir_descargos',
    'proveedores','proveedor_categorias'];
  base_de text := $q$
    select min(d.refobjid::regclass::text) from pg_rewrite r
    join pg_depend d on d.objid = r.oid
    join pg_class c on c.oid = d.refobjid and c.relkind in ('r','p')
    where r.ev_class = $1::regclass $q$;
  tiene text := $q$ select exists (select 1 from pg_policies where schemaname || '.' || tablename = $1 and policyname = $2) $q$;
  existe boolean;
begin
  -- 1 y 2. Vistas internas de gestiones
  foreach v in array vistas loop
    if to_regclass('public.' || quote_ident(v)) is null then continue; end if;
    execute base_de into b using 'public.' || quote_ident(v);
    if b is null or b not like 'gestiones.%' then continue; end if;
    execute format('revoke all on public.%I from anon', v);
    execute format('alter view public.%I set (security_invoker = true)', v);
    execute tiene into existe using b, 'caeduc_personal_solo';
    if not existe then
      execute format('create policy caeduc_personal_solo on %s as restrictive for all to anon, authenticated
                      using (public.es_personal_caeduc()) with check (public.es_personal_caeduc())', b);
    end if;
  end loop;

  execute tiene into existe using 'gestiones.profiles', 'caeduc_personal_administra_perfiles';
  if not existe then
    create policy caeduc_personal_administra_perfiles on gestiones.profiles for all to authenticated
      using (public.es_personal_caeduc()) with check (public.es_personal_caeduc());
  end if;

  -- 3. avales: lectura e inserción públicas se mantienen; cambios solo personal
  revoke update, delete, truncate on public.avales from anon;
  alter view public.avales set (security_invoker = true);
  execute tiene into existe using 'gestiones.avales', 'caeduc_personal_modifica_avales';
  if not existe then
    create policy caeduc_personal_modifica_avales on gestiones.avales as restrictive for update to anon, authenticated
      using (public.es_personal_caeduc()) with check (public.es_personal_caeduc());
    create policy caeduc_personal_borra_avales on gestiones.avales as restrictive for delete to anon, authenticated
      using (public.es_personal_caeduc());
  end if;

  -- 4. app_settings: lectura pública; escritura solo personal
  revoke insert, update, delete, truncate on public.app_settings from anon;
  alter view public.app_settings set (security_invoker = true);
  execute tiene into existe using 'gestiones.app_settings', 'caeduc_personal_inserta_ajustes';
  if not existe then
    create policy caeduc_personal_inserta_ajustes on gestiones.app_settings as restrictive for insert to anon, authenticated
      with check (public.es_personal_caeduc());
    create policy caeduc_personal_modifica_ajustes on gestiones.app_settings as restrictive for update to anon, authenticated
      using (public.es_personal_caeduc()) with check (public.es_personal_caeduc());
    create policy caeduc_personal_borra_ajustes on gestiones.app_settings as restrictive for delete to anon, authenticated
      using (public.es_personal_caeduc());
  end if;

  -- 5. Tablas internas de gestiones en public
  foreach v in array tablas loop
    if to_regclass('public.' || quote_ident(v)) is null then continue; end if;
    execute format('revoke all on public.%I from anon', v);
    execute tiene into existe using 'public.' || v, 'caeduc_personal_solo';
    if not existe then
      execute format('create policy caeduc_personal_solo on public.%I as restrictive for all to anon, authenticated
                      using (public.es_personal_caeduc()) with check (public.es_personal_caeduc())', v);
    end if;
  end loop;

  -- 6. Archivos privados de gestiones (no afecta otros buckets)
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'caeduc_personal_archivos') then
    create policy caeduc_personal_archivos on storage.objects as restrictive for all to anon, authenticated
      using (bucket_id not in ('caeduc-puntos-resolutivos','caeduc-expedientes','caeduc-publicaciones') or public.es_personal_caeduc())
      with check (bucket_id not in ('caeduc-puntos-resolutivos','caeduc-expedientes','caeduc-publicaciones') or public.es_personal_caeduc());
  end if;
end $$;

notify pgrst, 'reload schema';

-- ── REVERTIR (deja las reglas como estaban; solo objetos de gestiones) ───────
--   do $$ declare r record; v text; begin
--     for r in select schemaname, tablename, policyname from pg_policies where policyname like 'caeduc_personal_%' loop
--       execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
--     end loop;
--     foreach v in array array['activities','caeduc_agenda_pendientes','caeduc_agenda_puntos','caeduc_agendas',
--       'caeduc_informes_actividades','cartas','directorio_personas','internal_documents','oficios',
--       'planificacion_actividades','planificacion_fondos_adicionales','planificacion_gastos_actividad',
--       'planificacion_gastos_rubro','planificacion_presupuesto_anual','planificacion_responsables',
--       'planificacion_rubros','procedimiento_pasos','procedimientos','profiles','tasks','avales','app_settings',
--       'caeduc_publicaciones','caeduc_expediente_ponentes','caeduc_expediente_documentos','caeduc_oficio_documentos',
--       'caeduc_puntos_resolutivos','caeduc_miembros_comision','caeduc_informe_labores_ajustes','souvenirs',
--       'souvenir_compras','souvenir_descargos','proveedores','proveedor_categorias'] loop
--       if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
--                  where n.nspname = 'public' and c.relname = v and c.relkind = 'v') then
--         execute format('alter view public.%I reset (security_invoker)', v);
--       end if;
--       execute format('grant all on public.%I to anon', v);
--     end loop; end $$;
