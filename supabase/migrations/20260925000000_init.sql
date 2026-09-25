-- PPLUL workout tracker: initial schema
-- Single-user app, but every table is scoped to auth.uid() via RLS.

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  day_key text not null check (day_key in ('push', 'pull', 'legs', 'upper', 'lower')),
  session_date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (user_id, session_date)
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_slug text not null,
  set_index smallint not null check (set_index >= 1),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  reps smallint not null check (reps >= 0),
  completed_at timestamptz not null default now(),
  unique (session_id, exercise_slug, set_index)
);

create table public.exercise_notes (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  exercise_slug text not null,
  note text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_slug)
);

create index set_logs_user_exercise_completed_idx
  on public.set_logs (user_id, exercise_slug, completed_at desc);

create index set_logs_session_idx
  on public.set_logs (session_id);

create index workout_sessions_user_date_idx
  on public.workout_sessions (user_id, session_date desc);

-- Row level security: a user only ever sees and touches their own rows.
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.exercise_notes enable row level security;

create policy "own sessions" on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own set logs" on public.set_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own notes" on public.exercise_notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No anonymous access at all.
revoke all on public.workout_sessions from anon;
revoke all on public.set_logs from anon;
revoke all on public.exercise_notes from anon;
