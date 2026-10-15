-- Informe de labores para Junta Directiva (pestaña nueva en Informes de actividades)
--
-- Ejecutar una vez en el SQL Editor de Supabase.
--
-- 1. caeduc_informe_labores_datos(desde, hasta): Gestiones lee del Aula Virtual
--    (esquema aulacaeduc) solo lo que el informe necesita: el calendario de
--    actividades y el conteo de certificados por mes. Es SECURITY DEFINER para
--    no depender de las políticas RLS del aula, y solo la pueden usar personas
--    con sesión iniciada en Gestiones. No modifica nada del aula.
-- 2. caeduc_informe_labores_ajustes: guarda lo que se corrige en pantalla por
--    actividad (participantes, modalidad o excluirla del informe) para no
--    volver a escribirlo cada vez que se genera.

create or replace function public.caeduc_informe_labores_datos(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, aulacaeduc
as $$
declare
  v_actividades jsonb := '[]'::jsonb;
  v_certificados jsonb := '[]'::jsonb;
  v_unicos int := 0;
begin
  if auth.uid() is null then
    raise exception 'Se requiere iniciar sesión';
  end if;

  if to_regclass('aulacaeduc.cpg_content') is not null then
    select coalesce(c.activities, '[]'::jsonb) into v_actividades
    from aulacaeduc.cpg_content c
    where c.id = 1;
  end if;

  if to_regclass('aulacaeduc.cpg_certificates') is not null then
    -- Certificados por contenido grabado (se excluyen los de voluntariado),
    -- contados en el mes de emisión según la hora de Guatemala.
    select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'total', total, 'unicos', unicos) order by mes), '[]'::jsonb)
      into v_certificados
    from (
      select to_char(issued_at at time zone 'America/Guatemala', 'YYYY-MM') as mes,
             count(*)::int as total,
             count(distinct collegiate_number)::int as unicos
      from aulacaeduc.cpg_certificates
      where coalesce(cert_type, '') <> 'volunteer'
        and (issued_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
      group by 1
    ) t;

    select count(distinct collegiate_number)::int into v_unicos
    from aulacaeduc.cpg_certificates
    where coalesce(cert_type, '') <> 'volunteer'
      and (issued_at at time zone 'America/Guatemala')::date between p_desde and p_hasta;
  end if;

  return jsonb_build_object(
    'actividades', coalesce(v_actividades, '[]'::jsonb),
    'certificados', v_certificados,
    'certificados_unicos', coalesce(v_unicos, 0)
  );
end;
$$;

revoke all on function public.caeduc_informe_labores_datos(date, date) from public, anon;
grant execute on function public.caeduc_informe_labores_datos(date, date) to authenticated;

create table if not exists public.caeduc_informe_labores_ajustes (
  clave text primary key,
  asistentes integer check (asistentes is null or asistentes >= 0),
  modalidad text check (modalidad is null or modalidad in ('Presencial', 'Virtual', 'Híbrida')),
  incluir boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.caeduc_informe_labores_ajustes enable row level security;

drop policy if exists caeduc_informe_labores_ajustes_rw on public.caeduc_informe_labores_ajustes;
create policy caeduc_informe_labores_ajustes_rw on public.caeduc_informe_labores_ajustes
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
