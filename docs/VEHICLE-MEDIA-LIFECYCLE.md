# Vehicle media lifecycle proposal

Status: design only. No production bucket, ERP data, permissions, or database rows are changed by this document.

## Current risk

`GET /media/vehicle-images/{fileId}` currently returns `{fileId}.webp` from R2 before the ERP fallback is asked whether that file still belongs to a published `available` or `reserved` vehicle. The admin media endpoint can also replace the same key. This makes an old R2 object a second source of truth and can keep serving an image after publication eligibility changes.

## Required invariant

Supabase/ERP remains the source of truth for vehicle publication. R2 is a versioned derivative cache only. A public response must satisfy both conditions:

1. the ERP publication contract currently authorizes the file ID; and
2. the requested derivative belongs to the authorized source version.

## Approval-dependent target design

- ERP writes a public media manifest containing only `file_id`, a non-secret source version/hash, derivative version, and current eligibility. It must inherit the same `website_published` plus `available|reserved` rules as `public_vehicle_listings`.
- R2 keys become immutable, for example `vehicles/{fileId}/{sourceVersion}.webp`. Replacing a file creates a new version instead of overwriting a public key.
- The website resolves eligibility and current version from that manifest before reading R2. A missing or ineligible manifest row returns 404 even if an old object exists.
- The admin website may update site-owned logo/storefront assets, but vehicle derivatives are generated through the ERP-owned publication workflow. It must not overwrite a vehicle file ID independently.
- Unpublish, sold, and deletion events invalidate the manifest immediately. Old immutable objects may be retained for a short rollback window but are unreachable publicly.
- CDN responses use the immutable version in the URL. Eligibility lookups use a short cache and purge/version switch on publication events.

## Migration and rollback

This requires a reviewed ERP/API contract, a database migration, R2 backfill, and an explicit retention decision. Rollout should dual-write the manifest, compare it with the existing public view, backfill versioned derivatives, switch reads behind a feature flag, and retain the current ERP fallback until acceptance passes. Rollback switches reads to the existing ERP-validated endpoint; it does not delete source files or database records.

## Tests required before approval

- synthetic available and reserved fixtures return the current image;
- sold, unpublished, unknown, and removed files return 404 even when an R2 object exists;
- replacing a source changes the public version without overwriting the old object;
- a manifest outage fails closed or uses only a bounded, explicitly approved stale eligibility window;
- admin upload cannot target vehicle keys;
- no response exposes storage paths, credentials, or private source identifiers.
