-- Review against the production schema before running.
-- This migration exposes only approved vehicle-listing fields to anonymous users.

alter table public.inventory
  add column if not exists website_published boolean not null default false,
  add column if not exists website_title text,
  add column if not exists website_slug text,
  add column if not exists website_featured boolean not null default false,
  add column if not exists website_published_at timestamptz;

create unique index if not exists inventory_website_slug_unique_idx
  on public.inventory (lower(website_slug))
  where website_slug is not null and btrim(website_slug) <> '';

drop view if exists public.public_vehicle_listings;

create view public.public_vehicle_listings
with (security_barrier = true)
as
select
  inventory.car_id,
  inventory.status::text as status,
  inventory.brand,
  inventory.model,
  inventory.variant,
  inventory.year,
  inventory.color,
  inventory.mileage,
  inventory.fuel_type,
  inventory.transmission,
  inventory.condition_summary,
  inventory.sale_price,
  inventory.listing_down_payment,
  inventory.listing_finance_amount,
  inventory.listing_installment,
  inventory.listing_monthly_payment,
  inventory.public_description,
  inventory.website_title,
  inventory.website_slug,
  inventory.website_featured,
  images.cover_image_url,
  coalesce(images.photos, '[]'::jsonb) as photos,
  inventory.updated_at
from public.inventory
left join lateral (
  select
    (array_agg(vehicle_files.public_url order by vehicle_files.is_primary desc, vehicle_files.sort_order, vehicle_files.created_at)
      filter (where vehicle_files.public_url is not null))[1] as cover_image_url,
    jsonb_agg(
      jsonb_build_object(
        'fileId', vehicle_files.file_id,
        'url', vehicle_files.public_url,
        'isPrimary', vehicle_files.is_primary,
        'sortOrder', vehicle_files.sort_order
      ) order by vehicle_files.is_primary desc, vehicle_files.sort_order, vehicle_files.created_at
    ) filter (where vehicle_files.public_url is not null) as photos
  from public.vehicle_files
  where vehicle_files.car_id = inventory.car_id
    and vehicle_files.mime_type like 'image/%'
    and vehicle_files.file_category in (
      'vehicle_image_front', 'vehicle_images', 'vehicle_image_rear',
      'vehicle_image_left', 'vehicle_image_right', 'vehicle_image_interior',
      'vehicle_image_mileage'
    )
) images on true
where inventory.website_published = true
  and inventory.status::text in ('available', 'reserved');

comment on view public.public_vehicle_listings is
  'Safe public vehicle data for pdcar-website. Never add customer, cost, profit, VIN, engine number, document, or storage credential fields.';

revoke all on public.inventory from anon;
revoke all on public.vehicle_files from anon;
revoke all on public.public_vehicle_listings from public;
grant select on public.public_vehicle_listings to anon, authenticated;
