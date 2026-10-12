-- Columnas del punto resolutivo en oficios (ya aplicado en producción el 2026-10-12)
--
-- "oficios" es una vista, así que las columnas se agregan a su tabla de origen y
-- luego se recrea la vista con ellas al final. Es idempotente: si ya existen no
-- cambia nada.

do $$
declare
  v_def   text;
  v_base  regclass;
  v_nbase int;
  v_opts  text[];
begin
  select count(distinct d.refobjid), min(d.refobjid::regclass::text)::regclass
    into v_nbase, v_base
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class   c on c.oid = d.refobjid and c.relkind in ('r','p')
  where r.ev_class = 'public.oficios'::regclass;

  if v_nbase <> 1 then
    raise exception 'La vista oficios usa % tablas; hay que ajustarla a mano', v_nbase;
  end if;

  execute format('alter table %s add column if not exists numero_punto_resolutivo text,
                                 add column if not exists documento_resolutivo_url text', v_base);

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='oficios'
                   and column_name='documento_resolutivo_url') then
    select pg_get_viewdef('public.oficios'::regclass), reloptions
      into v_def, v_opts
    from pg_class where oid = 'public.oficios'::regclass;

    v_def := regexp_replace(rtrim(v_def, E'; \n'),
               E'\n\\s*FROM ',
               format(E',\n    %1$s.numero_punto_resolutivo,\n    %1$s.documento_resolutivo_url\n   FROM ', v_base));

    execute 'create or replace view public.oficios as ' || v_def;

    if v_opts is not null then
      execute format('alter view public.oficios set (%s)', array_to_string(v_opts, ','));
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';
