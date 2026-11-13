-- Alta de miembros cuando el correo YA tiene cuenta (aplicado en producción).
--
-- Gestiones y el aula virtual comparten las cuentas de Supabase (auth.users).
-- Si se da de alta en Gestiones un correo que ya existe (p. ej. alguien que se
-- registró en el aula con Google), supabase.auth.signUp() NO crea la cuenta:
-- responde con un usuario "ofuscado" (identities = []) cuyo id es inventado.
-- Gestiones guardaba ese id falso en gestiones.profiles, y como
-- es_personal_caeduc() compara profiles.id = auth.uid(), la persona quedaba sin
-- permisos; además, si la cuenta era solo de Google, no tenía contraseña.
--
-- Esta función, solo para personal de CAEDUC, devuelve el id real de la cuenta
-- y, si la cuenta no tiene contraseña, le asigna la que se escribió en el alta.
-- Nunca sobrescribe una contraseña existente.

create or replace function public.caeduc_vincular_cuenta_existente(p_email text, p_password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_tiene_password boolean;
begin
  if not public.es_personal_caeduc() then
    raise exception 'No autorizado';
  end if;

  select u.id, coalesce(u.encrypted_password, '') <> ''
    into v_id, v_tiene_password
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_id is null then
    return json_build_object('encontrada', false);
  end if;

  if not v_tiene_password then
    if p_password is null or length(p_password) < 6 then
      raise exception 'La contraseña debe tener al menos 6 caracteres';
    end if;
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;
  end if;

  return json_build_object(
    'encontrada', true,
    'id', v_id,
    'password_asignada', not v_tiene_password
  );
end;
$$;

revoke all on function public.caeduc_vincular_cuenta_existente(text, text) from public, anon;
grant execute on function public.caeduc_vincular_cuenta_existente(text, text) to authenticated;

-- Corrección de datos aplicada el 2026-11-13: perfiles que apuntaban a ids
-- inexistentes se volvieron a ligar a la cuenta real con el mismo correo.
-- update gestiones.profiles p set id = u.id
-- from auth.users u
-- where lower(u.email) = lower(p.email)
--   and not exists (select 1 from auth.users x where x.id = p.id)
--   and not exists (select 1 from gestiones.profiles q where q.id = u.id);
