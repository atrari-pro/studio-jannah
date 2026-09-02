-- Studio Jannah — table projects (statut de premier niveau, admin)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Contexte : "project" existait déjà comme simple texte libre partagé par
-- tasks.project et objectives.project (voir tasks.sql / objectives.sql),
-- mais un projet lui-même n'avait pas de statut propre — impossible de
-- marquer "Landing Malt" comme fait une fois livré, indépendamment du
-- statut de chaque tâche/objectif qui le compose.
--
-- Choix : une table à part, liée par nom (pas de foreign key vers
-- tasks/objectives) plutôt qu'une migration des colonnes existantes. Pur
-- ajout, aucun risque sur les données déjà en prod (tasks/objectives ne
-- bougent pas). L'Edge Function admin-tasks / admin-objectives / admin-leads
-- crée automatiquement la ligne projects correspondante (upsert par nom) dès
-- qu'un projet est utilisé quelque part — pas de double saisie.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'actif' check (status in ('actif', 'pause', 'fait', 'abandonne')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Un seul projet par nom (insensible à la casse) — évite "Linkedin" et
-- "LinkedIn" de cohabiter côté statut même si tasks/objectives, en texte
-- libre, ne l'empêchent pas eux-mêmes.
create unique index if not exists projects_name_uidx on public.projects (lower(name));

alter table public.projects enable row level security;

-- Même choix que tasks/objectives/veille_rss : aucune policy anon/authenticated,
-- accès service_role uniquement via l'Edge Function admin-projects.
revoke all on table public.projects from anon;
revoke all on table public.projects from authenticated;

-- Lien Leads → Projets : un lead peut être rattaché à un projet (une fois
-- transformé en mission réelle), même mécanisme de liaison par nom.
alter table public.leads add column if not exists project text;
