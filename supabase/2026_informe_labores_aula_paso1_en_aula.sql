-- Informe de labores — PASO 1 de 2. Ejecutar en el SQL Editor del proyecto
-- Supabase del AULA VIRTUAL (ref ilyospunwucdojrnfgti, esquema aulacaeduc).
--
-- Gestiones (ref hfqfgldoibcfpbaaehsh) es otro proyecto, así que no puede leer
-- aulacaeduc directamente. Esta función entrega desde el aula solo lo que el
-- informe necesita (calendario y conteo de certificados por mes). Solo la
-- puede ejecutar service_role: ni visitantes ni usuarios del aula la ven.
-- No modifica nada del aula.

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
  select coalesce(c.activities, '[]'::jsonb) into v_actividades
  from aulacaeduc.cpg_content c
  where c.id = 1;

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

  return jsonb_build_object(
    'actividades', coalesce(v_actividades, '[]'::jsonb),
    'certificados', v_certificados,
    'certificados_unicos', coalesce(v_unicos, 0)
  );
end;
$$;

revoke all on function public.caeduc_informe_labores_datos(date, date) from public, anon, authenticated;
grant execute on function public.caeduc_informe_labores_datos(date, date) to service_role;

notify pgrst, 'reload schema';

-- Prueba (debe devolver actividades y certificados):
-- select public.caeduc_informe_labores_datos('2026-01-01', '2026-12-31');
