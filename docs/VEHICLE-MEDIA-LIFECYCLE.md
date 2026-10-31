# Vehicle media lifecycle proposal

Status: phase 1 implemented in code and synthetic tests; manifest storage remains design only. No production bucket, ERP data, permissions, or database rows are changed by this branch.

## Current risk

`GET /media/vehicle-images/{fileId}` currently returns `{fileId}.webp` from R2 before the ERP fallback is asked whether that file still belongs to a published `available` or `reserved` vehicle. The admin media endpoint can also replace the same key. This makes an old R2 object a second source of truth and can keep serving an image after publication eligibility changes.

## Required invariant

Supabase/ERP remains the source of truth for vehicle publication. R2 is a versioned derivative cache only. A public response must satisfy both conditions:

1. the ERP publication contract currently authorizes the file ID; and
2. the requested derivative belongs to the authorized source version.

## Phase 1 in this branch

- The public vehicle-image route asks the existing ERP public endpoint first on every request. It no longer serves a legacy `{fileId}.webp` R2 object before ERP eligibility is checked.
- ERP 401/403/404/410 results become a non-cacheable public 404 even when a legacy R2 object exists.
- Successful ERP images use a 60-second, must-revalidate cache policy instead of a one-day stale-while-revalidate window. The route validates the upstream content type, applies a bounded timeout, and returns non-cacheable 502/503/504 errors with `Retry-After` where appropriate.
- Safe response metrics are limited to outcome/source and `Server-Timing`; upstream bodies, storage keys, credentials and private identifiers are never logged or returned.
- The legacy R2 fallback is disabled by default. It can be enabled only with `VEHICLE_MEDIA_LEGACY_R2_FALLBACK_ENABLED=true` as an explicit rollback measure; fallback responses are marked stale and `no-store`, so every later request rechecks ERP.
- The website admin media endpoint now accepts only site-owned logo/storefront assets. Vehicle targets return `vehicle_media_managed_by_erp` and never write the bucket.
- The admin media screen keeps logo/storefront uploads unchanged, but shows vehicle photos read-only with a clear `จัดการใน ERP` label. Authenticated site administrators who previously replaced a vehicle image directly from this screen must now make that change in ERP so publication eligibility and image revision stay together. Direct legacy callers receive an explicit HTTP 409 instead of a silent success or overwrite.
- `lib/vehicle-media-lifecycle.ts` provides the reviewed, side-effect-free manifest contract and idempotent immutable-key refresh plan used by synthetic tests. It does not create a table, endpoint, bucket object or background job.

This is intentionally backward-compatible for public image URLs and for site logo/storefront uploads. It is not backward-compatible with the old administrator-only vehicle overwrite action: that action created the source-of-truth conflict this phase removes. No existing R2 object is changed or deleted, and no ERP row is written by this branch.

## Approval-dependent target design

- ERP writes a public media manifest containing only `file_id`, a non-secret source version/hash, derivative version, and current eligibility. It must inherit the same `website_published` plus `available|reserved` rules as `public_vehicle_listings`.
- R2 keys become immutable, for example `vehicles/{fileId}/{sourceVersion}.webp`. Replacing a file creates a new version instead of overwriting a public key.
- The website resolves eligibility and current version from that manifest before reading R2. A missing or ineligible manifest row returns 404 even if an old object exists.
- The admin website may update site-owned logo/storefront assets, but vehicle derivatives are generated through the ERP-owned publication workflow. It must not overwrite a vehicle file ID independently.
- Unpublish, sold, and deletion events invalidate the manifest immediately. Old immutable objects may be retained for a short rollback window but are unreachable publicly.
- CDN responses use the immutable version in the URL. Eligibility lookups use a short cache and purge/version switch on publication events.

## Migration and rollback

This requires a reviewed ERP/API contract, a database migration, R2 backfill, and an explicit retention decision. Rollout should dual-write the manifest, compare it with the existing public view, backfill versioned derivatives, switch reads behind a feature flag, and retain the current ERP fallback until acceptance passes. Rollback switches reads to the existing ERP-validated endpoint; it does not delete source files or database records.

Phase 1 rollback is a code revert. If the ERP public endpoint has a short recoverable outage and the owner separately approves the tradeoff, the legacy R2 fallback flag can be enabled temporarily without overwriting objects. This flag must not be treated as a permanent eligibility source and must be disabled again after the ERP endpoint recovers.

## Manifest contract prepared for ERP review

The synthetic contract contains only `fileId`, `sourceVersion`, `derivativeVersion`, current publication eligibility and an authorization timestamp. `sourceVersion` must be a non-secret revision/hash; it must not contain a Drive ID, bucket path, credential or private source URL. `websitePublished=true` and status `available|reserved` are required before an entry exists.

The planned immutable derivative key is `vehicles/{fileId}/{sourceVersion}/{derivativeVersion}.webp`. A refresh skips an object already at that exact key, otherwise it writes a new key. It never overwrites or deletes the prior revision. Public resolution must use only the current manifest key, so old objects remain unreachable even during a rollback retention window.

A manifest older than the approved freshness threshold is `expired`, not silently eligible. Any bounded stale-eligibility window requires a separate owner/security decision plus monitoring; this branch does not implement one.

## Safe operational outcomes

| Outcome | Public response | Legacy R2 read |
| --- | --- | --- |
| ERP current image | 200, `erp-authority`, must-revalidate | No |
| ERP says not public/missing | 404, `no-store` | No |
| ERP invalid content | 502, `no-store` | No |
| ERP timeout/network/5xx | 502/504, `Retry-After: 30` | No by default |
| Explicit rollback flag plus retryable ERP failure | 200 stale fallback, `no-store` and warning | Yes |

## Tests required before approval

- synthetic available and reserved fixtures return the current image;
- sold, unpublished, unknown, and removed files return 404 even when an R2 object exists;
- replacing a source changes the public version without overwriting the old object;
- a manifest outage fails closed or uses only a bounded, explicitly approved stale eligibility window;
- admin upload cannot target vehicle keys;
- no response exposes storage paths, credentials, or private source identifiers.

The phase-1 route and manifest tests cover these cases with synthetic fixtures. Real manifest integration, backfill, retention, purge events and production metrics aggregation remain approval-dependent.
