-- Studio Jannah — compteur anti-abus du diagnostic externe public
-- À coller dans Supabase → SQL Editor → Run avant de déployer la fonction.
-- Pas de leads ni de rapports : IP et URL servent uniquement au débit.

create extension if not exists "pgcrypto";

create table if not exists public.agent_readiness_requests (
  id uuid primary key default gen_random_uuid(),
  requester_ip text,
  target_url text not null check (char_length(target_url) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists agent_readiness_requests_ip_created_idx
  on public.agent_readiness_requests (requester_ip, created_at desc);

alter table public.agent_readiness_requests enable row level security;

-- Aucune policy anon/authenticated : ni lecture ni écriture publique.
-- Seule la fonction Edge utilise service_role (bypass RLS).
revoke all on table public.agent_readiness_requests from anon, authenticated;
grant select, insert on table public.agent_readiness_requests to service_role;

-- Entretien via SQL Editor (ou tâche de maintenance existante) : supprimer
-- régulièrement les anciennes lignes ; seule la fenêtre de 10 min est utile.
-- delete from public.agent_readiness_requests where created_at < now() - interval '1 day';
