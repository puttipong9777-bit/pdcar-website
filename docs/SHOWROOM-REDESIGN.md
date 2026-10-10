# Showroom redesign — 2026-09-08

The homepage uses MotionSites **Interactive Discovery** (free prompt,
`https://motionsites.ai/?prompt=interactive-discovery`) as visual direction:
photographic spotlight, restrained entrance motion, midnight-blue surfaces.
The automotive premium prompt was locked and was not purchased or used.
Only the relevant visual ideas were adapted; the existing Next.js architecture,
storefront photo, Thai copy, public inventory, and brand remain authoritative.

## Preserved boundaries

- No database writes, migrations, credentials, environment, or ERP changes.
- Still reads `public_vehicle_listings` through the unchanged data adapter.
- Photos remain the existing public media URLs; no generated or altered cars.
- Existing detail routes, sell-car route, contact links, 9:16 videos, articles,
  metadata, and sitemap are retained.
- Filtering, sorting, and photo selection are transient browser state only.
- No MotionSites dependency or runtime API call is required by the public site.

## Checks

- `node --test tests/catalog.test.mjs`: search/filter combinations, unknown
  prices, sorting, immutable inventory, photo deduplication, and empty states.
- Existing lint, typecheck, and production build.
- CSS layouts: three columns above 1100px, two through tablet widths, one below
  621px; all photo controls remain visible on touch devices.
- Reduced-motion settings disable entrances, photo fades, and spotlight.

Browser visual QA has not been run as part of this change.
