-- Per-part order chats: one order chat per (order, vendor, part).
-- Support chats (type <> 'order') keep their previous uniqueness semantics.
begin;

alter table public.order_chats
  add column if not exists order_part_id uuid null
  references public.order_parts(id) on delete set null;

alter table public.order_chats
  drop constraint if exists order_chats_order_id_vendor_id_type_key;
drop index if exists public.order_chats_order_id_vendor_id_type_key;

create unique index if not exists order_chats_order_vendor_part_uniq
  on public.order_chats (
    order_id,
    vendor_id,
    coalesce(order_part_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where type = 'order';

create unique index if not exists order_chats_non_order_uniq
  on public.order_chats (order_id, vendor_id, type)
  where type <> 'order';

create index if not exists order_chats_order_part_id_idx
  on public.order_chats (order_part_id);

-- Backfill: existing chats where the vendor offered on exactly one part of that order
update public.order_chats c
set order_part_id = s.order_part_id
from (
  select o.order_id, o.store_id, (array_agg(distinct o.order_part_id))[1] as order_part_id
  from public.offers o
  where o.order_part_id is not null
  group by o.order_id, o.store_id
  having count(distinct o.order_part_id) = 1
) s
where c.type = 'order'
  and c.order_part_id is null
  and c.order_id = s.order_id
  and c.vendor_id = s.store_id;

commit;
