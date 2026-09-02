-- Studio Jannah — tables objectives + objective_checkins (suivi de cadence,
-- score avance/retard, admin). À coller dans Supabase → SQL Editor → Run.

create extension if not exists "pgcrypto";

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  project text not null check (char_length(project) between 1 and 120),
  title text not null check (char_length(title) between 1 and 300),
  start_date date not null,
  end_date date, -- null = objectif continu, sans fin prévue
  target_per_week smallint not null default 6 check (target_per_week between 1 and 7),
  status text not null default 'actif' check (status in ('actif', 'pause', 'termine')),
  notes text,
  created_at timestamptz not null default now(),
  constraint objectives_dates_order check (end_date is null or end_date >= start_date)
);

create index if not exists objectives_project_idx on public.objectives (project);
create index if not exists objectives_status_idx on public.objectives (status);
create index if not exists objectives_end_date_idx on public.objectives (end_date);

create table if not exists public.objective_checkins (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives (id) on delete cascade,
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (objective_id, date) -- un seul pointage par jour et par objectif
);

create index if not exists objective_checkins_objective_idx on public.objective_checkins (objective_id);
create index if not exists objective_checkins_date_idx on public.objective_checkins (date);

alter table public.objectives enable row level security;
alter table public.objective_checkins enable row level security;

-- Même choix que veille_rss/tasks : aucune policy anon/authenticated, accès
-- service_role uniquement via l'Edge Function admin-objectives.
revoke all on table public.objectives from anon;
revoke all on table public.objectives from authenticated;
revoke all on table public.objective_checkins from anon;
revoke all on table public.objective_checkins from authenticated;
