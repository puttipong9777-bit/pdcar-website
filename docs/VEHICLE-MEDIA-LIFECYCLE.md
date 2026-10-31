# Vehicle media lifecycle proposal

Status: phase 1 implemented in code and synthetic tests; manifest storage remains design only. No production bucket, ERP data, permissions, or database rows are changed by this branch.

## Current risk

Before this branch, `GET /media/vehicle-images/{fileId}` returned `{fileId}.webp` from R2 before the ERP endpoint was asked whether that file still belonged to a published `available` or `reserved` vehicle. The admin media endpoint could also replace the same key. This made an old R2 object a second source of truth and could keep serving an image after publication eligibility changed.

## Required invariant

Supabase/ERP remains the source of truth for vehicle publication. R2 is a versioned derivative cache only. A public response must satisfy both conditions:

1. the ERP publication contract currently authorizes the file ID; and
2. the requested derivative belongs to the authorized source version.

## Phase 1 in this branch

- The public vehicle-image route uses only the existing ERP public endpoint. There is no vehicle R2 fallback or environment flag that can bypass current ERP eligibility.
- Before contacting ERP, the route performs one narrow, uncached lookup against `public_vehicle_listings`: it selects only `car_id`, requires the requested FILE ID inside the row's current `photos` array, and limits the result to one row. The public view already restricts rows to published `available|reserved` vehicles and its migration admits only the seven website main/gallery categories. A missing reference returns 404; missing configuration, timeout or public-view error returns 503 without contacting ERP.
- This membership check does not load the full inventory and uses a 1.5-second bounded timeout by default. It intentionally avoids a cross-request membership cache so removed references are not hidden behind another long stale authorization layer.
- ERP 401/403/404/410 results become a non-cacheable public 404. ERP 429 becomes 503; network, invalid content, oversize body and other upstream errors fail closed as 502/504.
- Successful ERP images use a 60-second, must-revalidate cache policy instead of the former `max-age=300, stale-while-revalidate=86400`. The route validates content type, reads at most 8 MiB under one bounded header-and-body timeout, and returns non-cacheable errors with `Retry-After` where appropriate.
- Safe response metrics are limited to outcome/source and `Server-Timing`; upstream bodies, storage keys, credentials and private identifiers are never logged or returned.
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

Phase 1 rollback is a reviewed code revert. There is intentionally no runtime switch back to unvalidated vehicle R2 objects. An ERP image outage therefore fails closed until ERP recovers or a separately reviewed manifest-backed cache is available.

## Manifest contract prepared for ERP review

The synthetic contract contains only `fileId`, `sourceVersion`, `derivativeVersion`, current publication eligibility and an authorization timestamp. `sourceVersion` must be a non-secret revision/hash; it must not contain a Drive ID, bucket path, credential or private source URL. `websitePublished=true` and status `available|reserved` are required before an entry exists.

The planned immutable derivative key is `vehicles/{fileId}/{sourceVersion}/{derivativeVersion}.webp`. A refresh skips an object already at that exact key, otherwise it writes a new key. It never overwrites or deletes the prior revision. Public resolution must use only the current manifest key, so old objects remain unreachable even during a rollback retention window.

A manifest older than the approved freshness threshold is `expired`, not silently eligible. An authorization timestamp more than 30 seconds in the future is `unavailable`; the 30-second allowance is only for bounded clock skew, not a stale or future eligibility window. Malformed timestamps and invalid thresholds also fail closed. Any stale-eligibility window requires a separate owner/security decision plus monitoring; this branch does not implement one.

## Safe operational outcomes

| Outcome | Public response | Vehicle R2 read |
| --- | --- | --- |
| FILE ID absent from current public listing photos | 404, `not-listed`, `no-store` | No |
| Public-list membership unavailable | 503, `no-store`, `Retry-After: 30` | No |
| ERP current image, valid body up to 8 MiB | 200, `erp-authority`, must-revalidate | No |
| ERP returns 401/403/404/410 after membership succeeds | 404, `no-store` | No |
| ERP rate limit (429) | 503, `no-store`, `Retry-After: 30` | No |
| ERP invalid content, oversize body or 5xx | 502, `no-store` | No |
| ERP header/body timeout | 504, `no-store`, `Retry-After: 30` | No |
| ERP network/body stream failure | 502, `no-store`, `Retry-After: 30` | No |

## Release limits

- The 60-second successful response cache reduces the exposure window but does not provide immediate revocation. A file may remain visible for that cache lifetime after ERP eligibility changes.
- Responses already cached under the old `max-age=300, stale-while-revalidate=86400` policy are not purged by this code change. This branch does not purge the real CDN cache; old responses may remain until existing cache behavior expires or a separately approved purge is performed.
- Tests use synthetic ERP responses. They prove website fail-closed behavior but do not prove that the real ERP endpoint enforces `website_published` plus `available|reserved` for every file ID. That ERP publication contract requires a separate read-only implementation review before release.
- ERP source review at commit `33ec17fc2c97dbd4585f4a9afa24acd4832b4d85` found that its normal full/thumb route does not perform this exact public-list membership check and catches all exceptions as 404. The website can therefore block unlisted categories itself, but an ERP 404 after membership succeeds remains ambiguous between a true denial/deletion and an ERP database/storage failure. The deployed ERP SHA was not verified.
- ERP source may issue a 307 redirect to a public object whose bytes can carry an immutable one-year cache. The website follows that redirect server-side and applies its own 60-second response cache, but this patch cannot revoke an already-known direct object URL, erase an existing immutable object cache, or prove that every previously public object is now private.
- No test in this branch changes a real vehicle status, publication flag, ERP row, R2 object or production cache.

## Tests required before approval

- synthetic available and reserved fixtures return the current image;
- allowed current main/gallery references reach ERP; linked repair/damage/document images absent from public listing photos and inventory outages fail closed before ERP;
- 401/403/404/410, rate limit, 5xx, network, body timeout, stream failure and oversize body cases fail closed without any R2 path;
- replacing a source changes the public version without overwriting the old object;
- a manifest outage fails closed or uses only a bounded, explicitly approved stale eligibility window;
- admin upload cannot target vehicle keys;
- no response exposes storage paths, credentials, or private source identifiers.

The phase-1 route and manifest tests cover these cases with synthetic fixtures. Real ERP publication enforcement, manifest integration, backfill, retention, purge events and production metrics aggregation remain approval-dependent.
