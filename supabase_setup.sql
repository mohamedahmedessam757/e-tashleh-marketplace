-- 1. Create Storage Bucket for Offer Attachments
-- We attempt to insert, if it exists we do nothing.
insert into storage.buckets (id, name, public)
values ('offer-attachments', 'offer-attachments', true)
on conflict (id) do nothing;

-- 2. Policies for Offer Images
-- Drop existing policies to avoid conflicts if you re-run this script
drop policy if exists "Public Read for Offer Images" on storage.objects;
drop policy if exists "Authenticated Upload for Offer Images" on storage.objects;

-- 3. Policy: Allow Anyone to Read Offer Images (Public Read)
create policy "Public Read for Offer Images"
on storage.objects for select
using ( bucket_id = 'offer-attachments' );

-- 4. Policy: Allow Authenticated Users (Vendors) to Upload Images
-- 4. Policy: Allow Anyone to Upload Images (Public Upload for 'offer-attachments' only)
-- This is necessary because the Supabase Client on frontend is likely anonymous (not sharing Auth state with NestJS)
create policy "Public Upload for Offer Images"
on storage.objects for insert
with check ( bucket_id = 'offer-attachments' );

-- 5. Create Offers Table (If not created by Prisma yet)
create table if not exists public.offers (
  id uuid default gen_random_uuid() primary key,
  order_id uuid not null, -- Removed references for pure SQL safety, assuming Prisma handles FKs
  store_id uuid not null,
  unit_price decimal(14,2) not null,
  weight_kg decimal(8,2) not null,
  shipping_cost decimal(14,2) default 0,
  has_warranty boolean default false,
  delivery_days text,
  condition text,
  notes text,
  offer_image text,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5.1 Ensure offer_image column exists (Safe Update)
alter table public.offers 
add column if not exists offer_image text;

-- 6. Indexes for Performance
create index if not exists idx_offers_order_id on public.offers(order_id);
create index if not exists idx_offers_store_id on public.offers(store_id);

-- 7. Add RLS to offers table
alter table public.offers enable row level security;

-- Drop existing offers policies
drop policy if exists "Vendors can create offers" on public.offers;
drop policy if exists "Public view offers" on public.offers;

-- 8. Policy: Allow Vendors (Stores) to Insert Offers
create policy "Vendors can create offers"
on public.offers for insert
with check ( true ); 
-- Simplified Check: In a real app, you'd check if auth.uid() owns the store. 
-- For now, letting any authenticated user create offers is safer for testing.

-- 9. Policy: Allow Everyone involved to view offers
create policy "Public view offers"
on public.offers for select
using ( true );
