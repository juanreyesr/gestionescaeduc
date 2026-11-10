-- Gestiones CAEDUC: sincronización Solicitud de publicación ↔ Planificación ↔ Expediente ↔ Aula
--
-- APLICADO en producción el 2026-11-10 (migración "gestiones_sincronizacion_actividades").
-- Proyecto Supabase compartido (gestiones, aula virtual, créditos): solo AGREGA
-- columnas y funciones nuevas; no borra ni modifica datos.
--
-- Estructura real: las tablas de gestiones viven en el esquema `gestiones` y la app
-- las usa por vistas en `public`; el calendario del aula está en aulacaeduc.cpg_content.

alter table public.caeduc_publicaciones
  add column if not exists actividad_tipo text,
  add column if not exists area text,
  add column if not exists modalidad text,
  add column if not exists duracion_horas numeric,
  add column if not exists enlace_reunion text,
  add column if not exists enlace_inscripcion text,
  add column if not exists participantes_estimados integer,
  add column if not exists gastos_extra jsonb not null default '[]'::jsonb;

alter table gestiones.planificacion_actividades
  add column if not exists publicacion_id uuid,
  add column if not exists presupuesto_detalle jsonb;

create unique index if not exists planificacion_actividades_publicacion_idx
  on gestiones.planificacion_actividades (publicacion_id)
  where publicacion_id is not null;

-- La vista pública conserva todas sus columnas y agrega las dos nuevas al final.
create or replace view public.planificacion_actividades as
 SELECT id, numero, trimestre, area, actividad, tipo, fecha, monto, sede_modalidad, estado_general,
    t1_estado, t1_fecha, t1_obs, t2_estado, t2_fecha, t2_ponente, t3_estado, t3_fecha, t3_lugar,
    t4_estado, t4_fecha, t4_num_oficio, observaciones, created_at, updated_at, monto_gastado,
    aula_event_id, fecha_iso, publicacion_id, presupuesto_detalle
   FROM gestiones.planificacion_actividades;

-- Personal de gestiones = fila activa en gestiones.profiles (mismo criterio que ya
-- usaban las políticas de caeduc_publicaciones). Solo se crea si no existe.
do $$
begin
  if to_regprocedure('public.es_personal_caeduc()') is null then
    execute $f$
      create function public.es_personal_caeduc()
      returns boolean language sql stable security definer set search_path = '' as $b$
        select auth.uid() is not null and exists (
          select 1 from gestiones.profiles p
          where p.id = auth.uid() and coalesce(p.active, true)
        );
      $b$
    $f$;
    execute 'revoke all on function public.es_personal_caeduc() from public, anon';
    execute 'grant execute on function public.es_personal_caeduc() to authenticated';
  end if;
end $$;

-- Quita del calendario del aula SOLO el evento indicado (no toca videos ni nada más).
do $$
begin
  if to_regprocedure('public.aula_eliminar_actividad(text)') is not null then
    raise notice 'aula_eliminar_actividad ya existe: no se modifica.';
    return;
  end if;
  execute $f$
    create function public.aula_eliminar_actividad(p_event_id text)
    returns boolean language plpgsql security definer set search_path = '' as $b$
    declare
      v_antes int;
      v_despues int;
    begin
      if not public.es_personal_caeduc() then
        raise exception 'No autorizado para modificar el calendario del aula';
      end if;
      if coalesce(trim(p_event_id), '') = '' then
        return false;
      end if;
      select jsonb_array_length(coalesce(activities, '[]'::jsonb)) into v_antes
        from aulacaeduc.cpg_content where id = 1 for update;
      update aulacaeduc.cpg_content
         set activities = (
           select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
             from jsonb_array_elements(coalesce(activities, '[]'::jsonb)) with ordinality as t(elem, ord)
            where elem ->> 'id' is distinct from p_event_id)
       where id = 1;
      select jsonb_array_length(coalesce(activities, '[]'::jsonb)) into v_despues
        from aulacaeduc.cpg_content where id = 1;
      return coalesce(v_antes, 0) > coalesce(v_despues, 0);
    end;
    $b$
  $f$;
  execute 'revoke all on function public.aula_eliminar_actividad(text) from public, anon';
  execute 'grant execute on function public.aula_eliminar_actividad(text) to authenticated';
end $$;

notify pgrst, 'reload schema';
