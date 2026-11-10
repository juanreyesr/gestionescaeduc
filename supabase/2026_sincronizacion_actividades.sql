-- Sincronización Solicitud de publicación ↔ Planificación ↔ Expediente ↔ Aula
--
-- Ejecutar UNA vez en el SQL Editor de Supabase (proyecto de producción).
-- Es idempotente: si ya se ejecutó, no cambia nada.
-- PROYECTO COMPARTIDO: este script solo AGREGA columnas nuevas a dos tablas de
-- gestiones (caeduc_publicaciones y planificacion_actividades) y crea dos
-- funciones si no existen. No borra ni modifica datos, tablas ni funciones de
-- ningún otro sistema.
--
-- 1. caeduc_publicaciones gana los datos que la planificación y el calendario
--    del aula virtual necesitan, para pedirlos una sola vez.
-- 2. planificacion_actividades guarda con qué publicación está enlazada y el
--    desglose del presupuesto (honorario del ponente + gastos extra).

alter table public.caeduc_publicaciones
  add column if not exists actividad_tipo text,
  add column if not exists area text,
  add column if not exists modalidad text,
  add column if not exists duracion_horas numeric,
  add column if not exists enlace_reunion text,
  add column if not exists enlace_inscripcion text,
  add column if not exists participantes_estimados integer,
  add column if not exists gastos_extra jsonb not null default '[]'::jsonb;

comment on column public.caeduc_publicaciones.modalidad is
  'Virtual, Presencial o Híbrida. Si es presencial se piden gastos extra (alimentación, souvenirs, etc.).';
comment on column public.caeduc_publicaciones.gastos_extra is
  'Gastos estimados además del honorario: [{"concepto": "Alimentación", "monto": 1500}, ...]';

alter table public.planificacion_actividades
  add column if not exists publicacion_id uuid,
  add column if not exists presupuesto_detalle jsonb;

create unique index if not exists planificacion_actividades_publicacion_idx
  on public.planificacion_actividades (publicacion_id)
  where publicacion_id is not null;

comment on column public.planificacion_actividades.publicacion_id is
  'Solicitud de publicación (caeduc_publicaciones.id) con la que se sincroniza esta actividad.';

notify pgrst, 'reload schema';

-- ── Personal de gestiones CAEDUC ─────────────────────────────────────────────
-- Este proyecto de Supabase es COMPARTIDO por varios sistemas. Las funciones
-- siguientes solo se crean si no existen: nunca reemplazan algo de otro sistema.
--
-- El aula virtual permite que cualquiera se registre, así que "authenticated"
-- NO basta para distinguir al personal. Personal = tiene fila en public.profiles
-- (usuarios creados en gestiones) o es la cuenta de administración principal.
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

-- ── Quitar una actividad del calendario del aula ─────────────────────────────
-- Solo quita del arreglo cpg_content.activities el evento con ese id (el que
-- gestiones publicó y cuyo id guarda en planificacion_actividades.aula_event_id).
-- No toca videos, certificados ni ningún otro dato del aula.
do $$
begin
  if to_regprocedure('public.aula_eliminar_actividad(text)') is not null then
    raise notice 'aula_eliminar_actividad ya existe: no se modifica.';
    return;
  end if;
  execute $f$
    create function public.aula_eliminar_actividad(p_event_id text)
    returns boolean language plpgsql security definer set search_path = public as $b$
    declare
      v_tipo text;
      v_antes int;
      v_despues int;
    begin
      if not public.es_personal_caeduc() then
        raise exception 'No autorizado para modificar el calendario del aula';
      end if;
      if coalesce(trim(p_event_id), '') = '' then
        return false;
      end if;
      select data_type into v_tipo from information_schema.columns
      where table_schema = 'public' and table_name = 'cpg_content' and column_name = 'activities';

      select jsonb_array_length(coalesce(activities::jsonb, '[]'::jsonb)) into v_antes
      from public.cpg_content where id = 1 for update;

      execute format(
        'update public.cpg_content set activities = (
           select coalesce(jsonb_agg(a order by o), ''[]''::jsonb)
           from jsonb_array_elements(coalesce(activities::jsonb, ''[]''::jsonb)) with ordinality as t(a, o)
           where a ->> ''id'' is distinct from %L
         )::%s where id = 1',
        p_event_id, case when v_tipo = 'json' then 'json' else 'jsonb' end);

      select jsonb_array_length(coalesce(activities::jsonb, '[]'::jsonb)) into v_despues
      from public.cpg_content where id = 1;
      return coalesce(v_antes, 0) > coalesce(v_despues, 0);
    end;
    $b$
  $f$;
  execute 'revoke all on function public.aula_eliminar_actividad(text) from public, anon';
  execute 'grant execute on function public.aula_eliminar_actividad(text) to authenticated';
end $$;

notify pgrst, 'reload schema';
