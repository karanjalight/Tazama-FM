-- Business Settings: Billing & Plans, Integrations, Business Settings.
-- (Backs the UI just built at app/business/settings/{billing,integrations,business}.)
--
-- Billing deliberately does NOT reuse the existing consumer `subscriptions`
-- table/`subscription_plan` enum — business tiers (locations/screens/
-- storage/team-member limits) are a materially different product from the
-- consumer free/individual/business plans, and widening a shared enum via
-- ALTER TYPE ... ADD VALUE is both awkward (can't run in the same
-- transaction as its own use) and conceptually muddies two unrelated
-- billing relationships. A parallel, business-scoped table is simpler and
-- lower-risk than mutating shared consumer billing.
--
-- No table anywhere stores a raw card number — `payment_methods` only ever
-- holds Paystack's tokenized authorization_code plus a display label, which
-- is the only PCI-compliant way to do this.
--
-- Run after business.sql (needs business_profiles).

create table if not exists public.business_subscriptions (
  business_id uuid primary key references public.business_profiles(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'business', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due')),
  paystack_customer_code text,
  paystack_subscription_code text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Plan limits are reference/config data (one row per plan), not per-business
-- — the Usage card computes `used` by counting the business's own rows
-- (branches, branch_devices, content_items.size_bytes, business_staff) and
-- compares against the row here for its plan.
create table if not exists public.plan_limits (
  plan text primary key check (plan in ('starter', 'business', 'enterprise')),
  max_locations integer,
  max_screens integer,
  max_storage_bytes bigint,
  max_team_members integer
);

insert into public.plan_limits (plan, max_locations, max_screens, max_storage_bytes, max_team_members) values
  ('starter', 5, 25, 10::bigint * 1024 * 1024 * 1024, 5),
  ('business', 10, 100, 50::bigint * 1024 * 1024 * 1024, 15),
  ('enterprise', null, null, null, null) -- null = unlimited
on conflict (plan) do nothing;

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  provider text not null check (provider in ('card', 'mpesa', 'bank')),
  paystack_authorization_code text,
  label text not null,
  expiry_month smallint,
  expiry_year smallint,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists payment_methods_business_idx on public.payment_methods(business_id);
create unique index if not exists payment_methods_one_primary_idx
  on public.payment_methods(business_id) where is_primary;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  paystack_invoice_reference text,
  description text not null,
  amount_kes numeric not null,
  status text not null default 'pending' check (status in ('paid', 'pending', 'failed')),
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  pdf_path text
);

create index if not exists invoices_business_idx on public.invoices(business_id, issued_at desc);

-- ── Integrations: static catalog + per-business connection state ──
create table if not exists public.integration_catalog (
  key text primary key, -- 'paystack' | 'youtube' | 'mpesa' | 'google' | 'whatsapp' | 'longi'
  name text not null,
  category text not null check (category in ('payments', 'music', 'devices', 'communication', 'analytics')),
  description text not null,
  availability text not null default 'available' check (availability in ('available', 'coming_soon'))
);

insert into public.integration_catalog (key, name, category, description, availability) values
  ('paystack', 'Paystack', 'payments', 'Collect payments and connect your business payment workflows.', 'available'),
  ('youtube', 'YouTube', 'music', 'Power music and video playback across Tazama.', 'available'),
  ('mpesa', 'M-Pesa', 'payments', 'Connect M-Pesa payments.', 'coming_soon'),
  ('google', 'Google', 'analytics', 'Connect Google services.', 'available'),
  ('whatsapp', 'WhatsApp', 'communication', 'Send customer-facing messages and business notifications.', 'coming_soon'),
  ('longi', 'Longi', 'devices', 'Connect supported smart metering/device systems.', 'available')
on conflict (key) do nothing;

-- Presence of a row = connected. No row = not connected. availability
-- (available/coming_soon) lives on the catalog above, not here.
create table if not exists public.business_integrations (
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  integration_key text not null references public.integration_catalog(key) on delete cascade,
  connected_at timestamptz not null default now(),
  account_label text,
  access_token text, -- encrypted at the application layer before write; never selected back to the client
  capabilities jsonb not null default '[]',
  primary key (business_id, integration_key)
);

-- ── Business Settings: profile/address/branding/preferences/privacy ──
create table if not exists public.business_settings (
  business_id uuid primary key references public.business_profiles(id) on delete cascade,

  -- profile (business_name/phone already live on business_profiles — not duplicated here)
  business_type text,
  description text,
  email text,
  website text,
  logo_path text,

  -- address
  country text,
  county text,
  city text,
  address text,
  postal_code text,

  -- branding
  primary_color text,
  secondary_color text,
  content_style text check (content_style in ('brand_focused', 'modern', 'minimal')),

  -- Tazama preferences
  default_volume smallint check (default_volume between 0 and 100),
  announcement_behavior text check (announcement_behavior in ('reduce_volume', 'pause_music')),
  content_transition text check (content_transition in ('fade', 'cut', 'slide', 'zoom')),
  timezone text not null default 'Africa/Nairobi',

  -- notifications
  notify_screen_offline boolean not null default true,
  notify_campaign_performance boolean not null default true,
  notify_weekly_reports boolean not null default true,
  notify_billing boolean not null default true,
  push_critical_device_alerts boolean not null default true,
  push_daily_summary boolean not null default false,

  -- privacy
  audience_insights_enabled boolean not null default true,
  analytics_retention_days integer not null default 90,

  updated_at timestamptz not null default now()
);

-- Business-wide default operating hours (per-location overrides are a
-- possible future addition — not asked for by the current UI, which only
-- gives locations a timezone/status, not their own hours).
create table if not exists public.business_hours (
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Monday
  open_time time,
  close_time time,
  is_open boolean not null default true,
  primary key (business_id, day_of_week)
);

-- ── RLS ──
alter table public.business_subscriptions enable row level security;
alter table public.payment_methods enable row level security;
alter table public.invoices enable row level security;
alter table public.business_integrations enable row level security;
alter table public.business_settings enable row level security;
alter table public.business_hours enable row level security;
-- plan_limits/integration_catalog are non-sensitive reference data — leave
-- RLS off, or add a permissive `using (true)` select policy if enabled.

drop policy if exists "business_subscriptions_select" on public.business_subscriptions;
create policy business_subscriptions_select on public.business_subscriptions
  for select
  using (public.is_business_member(business_subscriptions.business_id, auth.uid()));

drop policy if exists "payment_methods_select" on public.payment_methods;
create policy payment_methods_select on public.payment_methods
  for select
  using (public.is_business_member(payment_methods.business_id, auth.uid()));

drop policy if exists "invoices_select" on public.invoices;
create policy invoices_select on public.invoices
  for select
  using (public.is_business_member(invoices.business_id, auth.uid()));

drop policy if exists "business_integrations_select" on public.business_integrations;
create policy business_integrations_select on public.business_integrations
  for select
  using (public.is_business_member(business_integrations.business_id, auth.uid()));

drop policy if exists "business_settings_select" on public.business_settings;
create policy business_settings_select on public.business_settings
  for select
  using (public.is_business_member(business_settings.business_id, auth.uid()));

drop policy if exists "business_hours_select" on public.business_hours;
create policy business_hours_select on public.business_hours
  for select
  using (public.is_business_member(business_hours.business_id, auth.uid()));
