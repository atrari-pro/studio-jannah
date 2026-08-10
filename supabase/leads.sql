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
