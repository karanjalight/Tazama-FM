-- Advertisements: Campaigns (targeting the business's own locations/zones/
-- rooms, same pattern as Schedules/Announcements) + the cross-tenant Ad
-- Inventory marketplace (a business opts specific screens IN to sell ad
-- space to other advertisers — this is a genuinely separate, network-wide
-- concept per the mock data, not just "this business's own screens").
--
-- Campaign creatives reuse content_items (purpose = 'ad_creative') rather
-- than a duplicate `creatives` table — see business-content.sql.
--
-- Run after business-content.sql, business-analytics.sql (backfills the
-- content_play_events.campaign_id FK left null there).

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null,
  objective text not null default 'awareness'
    check (objective in ('awareness', 'promotion', 'product_launch', 'event', 'announcement')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),
  creative_id uuid references public.content_items(id) on delete set null,
  placement_type text not null default 'between_content'
    check (placement_type in ('between_content', 'during_playlist_rotation', 'dedicated_slot')),
  frequency text,
  max_plays_per_day integer,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  budget_type text not null default 'total' check (budget_type in ('total', 'daily')),
  budget_amount numeric,
  start_date date,
  end_date date,
  active_start_time time,
  active_end_time time,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_business_idx on public.campaigns(business_id, status);

alter table public.content_play_events drop constraint if exists content_play_events_campaign_fk;
alter table public.content_play_events
  add constraint content_play_events_campaign_fk
    foreign key (campaign_id) references public.campaigns(id) on delete set null;

-- Plays/reach/completionPct are deliberately NOT columns here — they're
-- `select ... from content_play_events where campaign_id = ... and
-- play_kind = 'ad'` aggregates, same reasoning as business-analytics.sql.

create table if not exists public.campaign_target_locations (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (campaign_id, branch_id)
);

create table if not exists public.campaign_target_zones (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  primary key (campaign_id, zone_id)
);

create table if not exists public.campaign_target_rooms (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  primary key (campaign_id, room_id)
);

-- ── Ad Inventory marketplace (cross-tenant) ──
-- A business opts a screen IN (the "Enable Ad Inventory" promo banner CTA
-- on the dashboard) to make it bookable by other advertisers' campaigns.
-- One row per opted-in device; absence = not listed.
create table if not exists public.ad_inventory_listings (
  device_id uuid primary key references public.branch_devices(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  indicative_cpm numeric not null default 0,
  availability text not null default 'available' check (availability in ('available', 'booked', 'restricted')),
  opted_in_at timestamptz not null default now()
);

create index if not exists ad_inventory_listings_business_idx on public.ad_inventory_listings(business_id);

-- When another business's campaign books third-party inventory (as opposed
-- to targeting its own locations/zones/rooms above).
create table if not exists public.campaign_inventory_bookings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  listing_device_id uuid not null references public.ad_inventory_listings(device_id) on delete cascade,
  booked_at timestamptz not null default now(),
  unique (campaign_id, listing_device_id)
);

comment on table public.ad_inventory_listings is
  'V1 marketplace scaffold — only the opt-in/listing side is modelled here. Booking flow, pricing, and payout to the listing business are a follow-up design, not built out in this pass.';

-- ── RLS ──
alter table public.campaigns enable row level security;
alter table public.campaign_target_locations enable row level security;
alter table public.campaign_target_zones enable row level security;
alter table public.campaign_target_rooms enable row level security;
alter table public.ad_inventory_listings enable row level security;
alter table public.campaign_inventory_bookings enable row level security;

drop policy if exists "campaigns_select" on public.campaigns;
create policy campaigns_select on public.campaigns
  for select
  using (public.is_business_member(campaigns.business_id, auth.uid()));

drop policy if exists "campaign_target_locations_select" on public.campaign_target_locations;
create policy campaign_target_locations_select on public.campaign_target_locations
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_target_locations.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));

drop policy if exists "campaign_target_zones_select" on public.campaign_target_zones;
create policy campaign_target_zones_select on public.campaign_target_zones
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_target_zones.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));

drop policy if exists "campaign_target_rooms_select" on public.campaign_target_rooms;
create policy campaign_target_rooms_select on public.campaign_target_rooms
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_target_rooms.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));

-- Inventory listings are the one place a business's row should be visible
-- to OTHER businesses too (that's the point of a marketplace) — readable by
-- any authenticated business staff, not just the owning business.
drop policy if exists "ad_inventory_listings_select" on public.ad_inventory_listings;
create policy ad_inventory_listings_select on public.ad_inventory_listings
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "campaign_inventory_bookings_select" on public.campaign_inventory_bookings;
create policy campaign_inventory_bookings_select on public.campaign_inventory_bookings
  for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_inventory_bookings.campaign_id
                   and public.is_business_member(c.business_id, auth.uid())));
