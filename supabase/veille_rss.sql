-- Studio Jannah — table veille_rss (agrégation flux RSS pour le pipeline éditorial)
-- À coller dans Supabase → SQL Editor → Run

create extension if not exists "pgcrypto";

create table if not exists public.veille_rss (
  id uuid primary key default gen_random_uuid(),
  source text not null check (char_length(source) between 1 and 200),
  title text not null check (char_length(title) between 1 and 500),
  link text not null unique check (char_length(link) between 1 and 2000),
  summary text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  status text not null default 'nouveau' check (status in ('nouveau', 'traite', 'ignore'))
);

create index if not exists veille_rss_status_idx on public.veille_rss (status);
create index if not exists veille_rss_fetched_at_idx on public.veille_rss (fetched_at desc);

alter table public.veille_rss enable row level security;

-- Aucune policy anon/authenticated : lecture ET écriture réservées au
-- service_role (bypass RLS), via les Edge Functions (fetch-veille,
-- admin-veille) et le script local `pnpm veille:list` — jamais exposé côté
-- client, contrairement à `leads` qui accepte un insert public depuis le
-- formulaire contact. Cohérent avec admin-leads (voir docs/ADMIN_LEADS.md) :
-- la protection vit dans la fonction, pas dans une policy RLS.
revoke all on table public.veille_rss from anon;
revoke all on table public.veille_rss from authenticated;
