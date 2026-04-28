-- strory.fun — initial schema
-- Tables: profiles, characters, comics, panels, purchases
-- All tables protected by RLS keyed on auth.uid()

create extension if not exists "uuid-ossp";

-- ========== profiles ==========
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('active', 'inactive', 'canceled')),
  subscription_tier text check (subscription_tier in ('decouverte', 'famille')),
  subscription_id text,
  stripe_customer_id text,
  monthly_album_quota int not null default 0,
  albums_used_this_period int not null default 0,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== characters ==========
create table public.characters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  physical_description text not null,
  facial_reference_url text not null,
  style_preset text not null default 'watercolor'
    check (style_preset in ('watercolor', 'manga_kodomo', 'pixar_3d', 'ligne_claire', 'ghibli')),
  created_at timestamptz not null default now()
);

create index characters_user_id_idx on public.characters(user_id);

alter table public.characters enable row level security;

create policy "characters_select_own" on public.characters
  for select using (auth.uid() = user_id);
create policy "characters_insert_own" on public.characters
  for insert with check (auth.uid() = user_id);
create policy "characters_update_own" on public.characters
  for update using (auth.uid() = user_id);
create policy "characters_delete_own" on public.characters
  for delete using (auth.uid() = user_id);

-- ========== comics ==========
create table public.comics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  layout_type text not null default 'grid_2x3',
  is_public boolean not null default false,
  payment_type text check (payment_type in ('one_shot', 'subscription')),
  stripe_session_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index comics_user_id_idx on public.comics(user_id);
create index comics_is_public_idx on public.comics(is_public) where is_public = true;

alter table public.comics enable row level security;

create policy "comics_select_own_or_public" on public.comics
  for select using (auth.uid() = user_id or is_public = true);
create policy "comics_insert_own" on public.comics
  for insert with check (auth.uid() = user_id);
create policy "comics_update_own" on public.comics
  for update using (auth.uid() = user_id);
create policy "comics_delete_own" on public.comics
  for delete using (auth.uid() = user_id);

-- ========== panels ==========
create table public.panels (
  id uuid primary key default uuid_generate_v4(),
  comic_id uuid not null references public.comics(id) on delete cascade,
  image_url text not null,
  prompt_action text not null,
  order_index int not null,
  bubbles_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (comic_id, order_index)
);

create index panels_comic_id_idx on public.panels(comic_id);

alter table public.panels enable row level security;

create policy "panels_select_via_comic" on public.panels
  for select using (
    exists (
      select 1 from public.comics c
      where c.id = panels.comic_id
        and (c.user_id = auth.uid() or c.is_public = true)
    )
  );
create policy "panels_write_via_comic" on public.panels
  for all using (
    exists (
      select 1 from public.comics c
      where c.id = panels.comic_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.comics c
      where c.id = panels.comic_id and c.user_id = auth.uid()
    )
  );

-- ========== purchases ==========
create table public.purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comic_id uuid references public.comics(id) on delete set null,
  type text not null check (type in ('album', 'subscription')),
  amount_cents int not null,
  stripe_session_id text not null unique,
  created_at timestamptz not null default now()
);

create index purchases_user_id_idx on public.purchases(user_id);

alter table public.purchases enable row level security;

create policy "purchases_select_own" on public.purchases
  for select using (auth.uid() = user_id);
-- Inserts only happen via the Stripe webhook using the service role key,
-- which bypasses RLS — so no insert policy needed for end users.
