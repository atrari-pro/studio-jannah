-- Studio Jannah — table leads (contact)
-- À coller dans Supabase → SQL Editor → Run

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  message text not null check (char_length(message) between 1 and 8000),
  page_path text,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

-- Anon / authenticated : INSERT only (formulaire public)
drop policy if exists "leads_anon_insert" on public.leads;
create policy "leads_anon_insert"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- Pas de SELECT/UPDATE/DELETE pour anon (lecture via Dashboard / service_role)
revoke all on table public.leads from anon;
grant insert on table public.leads to anon;
grant insert on table public.leads to authenticated;

-- Admin (voir docs/ADMIN_LEADS.md) — la fonction admin-leads utilise le
-- service_role (bypass RLS) après avoir vérifié le JWT de l'appelant, donc
-- pas de nouvelle policy RLS nécessaire ici, juste les colonnes.
alter table public.leads add column if not exists status text;
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists updated_at timestamptz;

-- Notification (email + Telegram) sur nouveau lead — voir docs/LEAD_NOTIFICATIONS.md
--
-- Le Database Webhook via Dashboard (Integrations → Database Webhooks) peut
-- échouer avec l'erreur "3F000 schema supabase_functions does not exist" sur
-- certains projets (schéma interne absent). Contournement : trigger SQL qui
-- appelle net.http_post directement — même effet, ne dépend que de
-- l'extension pg_net (Database → Extensions → activer pg_net en préalable).
--
-- Remplacer <PROJECT_REF>, <SERVICE_ROLE_JWT> et <LEAD_WEBHOOK_SECRET>
-- (Project Settings → API pour les deux premiers ; le secret est celui posé
-- dans Edge Functions → notify-lead → Secrets) avant d'exécuter.
--
-- create or replace function public.notify_lead_webhook()
-- returns trigger
-- language plpgsql
-- security definer
-- as $$
-- begin
--   perform net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-lead',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_JWT>',
--       'x-webhook-secret', '<LEAD_WEBHOOK_SECRET>'
--     ),
--     body := jsonb_build_object(
--       'type', 'INSERT',
--       'table', 'leads',
--       'schema', 'public',
--       'record', to_jsonb(NEW)
--     )
--   );
--   return NEW;
-- end;
-- $$;
--
-- drop trigger if exists on_lead_insert_notify on public.leads;
-- create trigger on_lead_insert_notify
--   after insert on public.leads
--   for each row
--   execute function public.notify_lead_webhook();
