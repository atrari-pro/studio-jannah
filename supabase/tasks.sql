-- Studio Jannah — table tasks (suivi de tâches ponctuelles, admin)
-- À coller dans Supabase → SQL Editor → Run

create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project text not null check (char_length(project) between 1 and 120),
  title text not null check (char_length(title) between 1 and 300),
  start_date date not null,
  end_date date not null,
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'fait')),
  notes text,
  created_at timestamptz not null default now(),
  constraint tasks_dates_order check (end_date >= start_date)
);

create index if not exists tasks_project_idx on public.tasks (project);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_end_date_idx on public.tasks (end_date);

-- Catégorisation libre (refonte Planning) : texte optionnel défini par
-- l'utilisateur, pas d'enum ni de table à part — cohérent avec le choix déjà
-- fait pour "project" (texte libre, autocomplete côté client via datalist).
alter table public.tasks add column if not exists category text;
create index if not exists tasks_category_idx on public.tasks (category);

alter table public.tasks enable row level security;

-- Même choix que veille_rss : aucune policy anon/authenticated, accès
-- service_role uniquement via l'Edge Function admin-tasks (JWT vérifié côté
-- fonction, protection dans le code, pas dans une policy RLS).
revoke all on table public.tasks from anon;
revoke all on table public.tasks from authenticated;
