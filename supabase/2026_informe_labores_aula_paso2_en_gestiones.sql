-- Informe de labores — PASO 2 de 2. Ejecutar en el SQL Editor del proyecto
-- Supabase de GESTIONES (ref hfqfgldoibcfpbaaehsh), después del paso 1.
--
-- Reemplaza la versión que leía aulacaeduc localmente (ese esquema no existe
-- aquí). Ahora pide los datos al aula por HTTP con la extensión http, usando
-- la service_role key del aula guardada en Vault. La pantalla no cambia: sigue
-- llamando caeduc_informe_labores_datos(p_desde, p_hasta).

-- 1) Extensión http (síncrona) en el esquema extensions.
create extension if not exists http with schema extensions;

-- 2) Guardar la service_role key del AULA en Vault (una sola vez).
--    Aula > Project Settings > API Keys > service_role (secret).
--    Si ya existe el secreto, use vault.update_secret en lugar de create.
-- select vault.create_secret('PEGUE_AQUI_LA_SERVICE_ROLE_KEY_DEL_AULA', 'aula_service_role_key');

-- 3) Función que usa la pantalla del informe.
create or replace function public.caeduc_informe_labores_datos(p_desde date, p_hasta date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_url constant text := 'https://ilyospunwucdojrnfgti.supabase.co/rest/v1/rpc/caeduc_informe_labores_datos';
  v_key text;
  v_resp extensions.http_response;
begin
  if auth.uid() is null then
    raise exception 'Se requiere iniciar sesión';
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'aula_service_role_key';

  if v_key is null then
    raise exception 'Falta el secreto aula_service_role_key en Vault';
  end if;

  v_resp := extensions.http((
    'POST',
    v_url,
    array[
      extensions.http_header('apikey', v_key),
      extensions.http_header('Authorization', 'Bearer ' || v_key),
      extensions.http_header('Content-Profile', 'public')
    ],
    'application/json',
    jsonb_build_object('p_desde', p_desde, 'p_hasta', p_hasta)::text
  )::extensions.http_request);

  if v_resp.status <> 200 then
    raise exception 'El aula respondió % al pedir los datos: %', v_resp.status, left(v_resp.content, 300);
  end if;

  return v_resp.content::jsonb;
end;
$$;

revoke all on function public.caeduc_informe_labores_datos(date, date) from public, anon;
grant execute on function public.caeduc_informe_labores_datos(date, date) to authenticated;

notify pgrst, 'reload schema';

-- Prueba desde el SQL Editor (auth.uid() es nulo ahí, así que esta prueba
-- llama directo al aula sin pasar por la verificación de sesión):
-- select status, left(content, 500)
-- from extensions.http((
--   'POST', 'https://ilyospunwucdojrnfgti.supabase.co/rest/v1/rpc/caeduc_informe_labores_datos',
--   array[
--     extensions.http_header('apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'aula_service_role_key')),
--     extensions.http_header('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'aula_service_role_key')),
--     extensions.http_header('Content-Profile', 'public')
--   ],
--   'application/json', '{"p_desde":"2026-01-01","p_hasta":"2026-12-31"}'
-- )::extensions.http_request);
