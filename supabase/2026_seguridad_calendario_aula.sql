-- Seguridad del calendario del aula virtual (aulacaeduc.cpg_content)
--
-- APLICADO en producción el 2026-11-10 (migración "aula_seguridad_calendario"), tras un
-- ensayo con rollback: anónimo y alumnos sin escritura ni funciones; admin del aula y
-- personal de gestiones sin cambios; 41 eventos y 39 videos intactos.
--
-- 1. aula_publicar_actividad / aula_actualizar_actividad (las usa gestiones para
--    publicar en el calendario del aula) se podían ejecutar sin sesión. Ahora solo
--    personal de gestiones o un administrador activo del aula. Misma lógica de siempre.
-- 2. cpg_content: la regla de escritura aceptaba a cualquier usuario con sesión
--    (cualquier colegiado registrado en el aula). Se AGREGA una regla restrictiva:
--    insertar/modificar/borrar solo administradores activos del aula
--    (aulacaeduc.is_active_admin()). La lectura pública no cambia y gestiones sigue
--    escribiendo a través de las funciones anteriores.
-- No se borra ninguna regla existente. REVERTIR al final.

create or replace function public.aula_publicar_actividad(p_evento jsonb)
returns text language plpgsql security definer set search_path to '' as $function$
declare
  v_id text;
  v_evento jsonb;
begin
  if not (public.es_personal_caeduc() or aulacaeduc.is_active_admin()) then
    raise exception 'No autorizado para publicar en el calendario del aula';
  end if;
  if p_evento is null or jsonb_typeof(p_evento) <> 'object' then
    raise exception 'evento invalido';
  end if;

  v_id := coalesce(p_evento->>'id', ((extract(epoch from now()) * 1000)::bigint)::text);
  v_evento := jsonb_set(p_evento, '{id}', to_jsonb((v_id)::bigint));

  update aulacaeduc.cpg_content
     set activities = coalesce(activities, '[]'::jsonb) || jsonb_build_array(v_evento)
   where id = 1;

  if not found then
    raise exception 'cpg_content id=1 no existe';
  end if;

  return v_id;
end;
$function$;

create or replace function public.aula_actualizar_actividad(p_event_id text, p_evento jsonb)
returns boolean language plpgsql security definer set search_path to '' as $function$
declare
  v_evento jsonb;
  v_nuevas jsonb;
  v_existia boolean;
begin
  if not (public.es_personal_caeduc() or aulacaeduc.is_active_admin()) then
    raise exception 'No autorizado para modificar el calendario del aula';
  end if;
  if p_evento is null or jsonb_typeof(p_evento) <> 'object' then
    raise exception 'evento invalido';
  end if;

  v_evento := jsonb_set(p_evento, '{id}', to_jsonb((p_event_id)::bigint));

  select coalesce(bool_or(elem->>'id' = p_event_id), false),
         coalesce(jsonb_agg(case when elem->>'id' = p_event_id then v_evento else elem end), '[]'::jsonb)
    into v_existia, v_nuevas
    from jsonb_array_elements((select activities from aulacaeduc.cpg_content where id = 1)) elem;

  if not v_existia then
    return false;
  end if;

  update aulacaeduc.cpg_content set activities = v_nuevas where id = 1;
  return true;
end;
$function$;

revoke all on function public.aula_publicar_actividad(jsonb) from public, anon;
revoke all on function public.aula_actualizar_actividad(text, jsonb) from public, anon;
grant execute on function public.aula_publicar_actividad(jsonb) to authenticated, service_role;
grant execute on function public.aula_actualizar_actividad(text, jsonb) to authenticated, service_role;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'aulacaeduc' and tablename = 'cpg_content' and policyname = 'cpg_content_solo_admin_inserta') then
    create policy cpg_content_solo_admin_inserta on aulacaeduc.cpg_content as restrictive for insert to anon, authenticated
      with check (aulacaeduc.is_active_admin());
    create policy cpg_content_solo_admin_modifica on aulacaeduc.cpg_content as restrictive for update to anon, authenticated
      using (aulacaeduc.is_active_admin()) with check (aulacaeduc.is_active_admin());
    create policy cpg_content_solo_admin_borra on aulacaeduc.cpg_content as restrictive for delete to anon, authenticated
      using (aulacaeduc.is_active_admin());
  end if;
end $$;

notify pgrst, 'reload schema';

-- ── REVERTIR ─────────────────────────────────────────────────────────────────
--   drop policy cpg_content_solo_admin_inserta on aulacaeduc.cpg_content;
--   drop policy cpg_content_solo_admin_modifica on aulacaeduc.cpg_content;
--   drop policy cpg_content_solo_admin_borra on aulacaeduc.cpg_content;
--   grant execute on function public.aula_publicar_actividad(jsonb) to anon;
--   grant execute on function public.aula_actualizar_actividad(text, jsonb) to anon;
--   (y volver a crear ambas funciones sin el bloque "No autorizado")
