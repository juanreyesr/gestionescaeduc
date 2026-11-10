-- Sincronización Solicitud de publicación ↔ Planificación ↔ Expediente ↔ Aula
--
-- Ejecutar UNA vez en el SQL Editor de Supabase (proyecto de producción).
-- Es idempotente: si ya se ejecutó, no cambia nada.
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
