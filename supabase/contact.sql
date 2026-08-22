-- Contact-form submissions from the public marketing site.
--
-- Anonymous visitors never read this table — inserts happen through the
-- `submitContactMessage` server action using the service-role client, so no
-- public insert policy is needed. RLS stays fully locked down; only the
-- service role (which bypasses RLS) can read or write.
--
-- Run in the Supabase SQL editor (or psql) once. Safe to re-run (idempotent).

create table if not exists public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  business   text,
  message    text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_created_idx
  on public.contact_submissions (created_at desc);

alter table public.contact_submissions enable row level security;
-- No policies: only the service-role key (used server-side) can access this table.
