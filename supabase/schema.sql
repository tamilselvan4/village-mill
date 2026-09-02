create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  address text,
  pincode text,
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  description text,
  size text not null default '1 L',
  price_inr integer not null check (price_inr > 0),
  image_label text,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer jsonb not null,
  items jsonb not null,
  subtotal_inr integer not null,
  delivery_fee_inr integer not null default 0,
  total_inr integer not null,
  status text not null default 'placed' check (status in ('placed', 'paid', 'shipped', 'delivered')),
  payment_status text not null default 'created' check (payment_status in ('created', 'paid', 'failed', 'refunded')),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_tracks (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null check (status in ('placed', 'paid', 'shipped', 'delivered')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.order_tracks enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "products public read" on public.products;
create policy "products public read"
  on public.products
  for select
  using (active = true);

drop policy if exists "carts own row" on public.carts;
create policy "carts own row"
  on public.carts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "orders own read" on public.orders;
create policy "orders own read"
  on public.orders
  for select
  using (auth.uid() = user_id);

drop policy if exists "order tracks own read" on public.order_tracks;
create policy "order tracks own read"
  on public.order_tracks
  for select
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_tracks.order_id
      and orders.user_id = auth.uid()
    )
  );

insert into public.products (name, slug, description, size, price_inr, image_label, stock, active)
values
  ('Groundnut Oil', 'groundnut-oil-1l', 'Aromatic cold pressed groundnut oil for everyday Indian cooking.', '1 L', 399, 'Groundnut', 50, true),
  ('Coconut Oil', 'coconut-oil-1l', 'Fresh coconut oil for cooking, hair care, and traditional home use.', '1 L', 449, 'Coconut', 40, true),
  ('Sesame Oil', 'sesame-oil-1l', 'Nutty sesame oil pressed slowly from quality seeds.', '1 L', 499, 'Sesame', 40, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  size = excluded.size,
  price_inr = excluded.price_inr,
  image_label = excluded.image_label,
  stock = excluded.stock,
  active = excluded.active,
  updated_at = now();
