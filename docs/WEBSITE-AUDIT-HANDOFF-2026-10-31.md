# Website audit implementation handoff — 2026-10-31

## Scope and release safety

- Working branch: `codex/website-audit-fixes-20261031`
- Production-source base: `66dab3ecf68471ae94717d51c9fee389f9ad5232` (`codex/cloudflare-workers`)
- Draft review: <https://github.com/puttipong9777-bit/pdcar-website/pull/4>
- No production merge, deployment, DNS change, credential change, database write, vehicle-data edit, or chatbot enablement was performed.
- Browser evidence uses clearly labelled synthetic vehicles and synthetic images. It does not submit customer forms or send LINE messages.

## Implemented in this review branch

- Verified public contact: LINE OA `@pdcar`, phone, shop map, ordinary opening hours, and appointment-only after-hours viewing.
- Business hours are represented as daily 08:00–17:00 in `AutoDealer` JSON-LD. Viewing until 19:00 is shown only as appointment-only text, never as ordinary opening hours.
- Home inventory outage no longer appears as a confirmed zero inventory or a no-results catalog. The degraded home remains HTTP 200 with explicit unavailable copy and direct contact options.
- Header “บทความ” leads to the useful reviewed quick guides on the home page. The empty full-article index now offers useful fallbacks without inventing articles.
- Vehicle detail puts the first real image before the price/status/contact summary and moves video below that summary. The gallery has an accessible full-screen viewer with close, previous/next, Escape, arrow-key, focus restoration, and pointer-swipe behavior.
- Vehicle cards label `ปีรุ่น` explicitly. Monthly payment shows only structured down-payment/term assumptions that exist; missing assumptions stay absent.
- Sitemap is an explicit route handler. Upstream failure returns 503 with `Retry-After: 60` rather than a false valid sitemap with all vehicles removed.
- Readiness upstream failure returns 503 with `Retry-After: 60`.
- Public vehicle fetch timeout is bounded and can be shortened only by the server-side `VEHICLE_DATA_TIMEOUT_MS` test/runtime setting.

## Verified HTTP failure behavior

| Endpoint | Synthetic upstream failure | Notes |
| --- | ---: | --- |
| `/` | 200 | Useful degraded page; no confirmed `0 คัน`, no misleading catalog empty state |
| `/cars/pd-synthetic-error` | 500 | Next App Router server-page error; noindex metadata/error UI; not a false 404 |
| `/sitemap.xml` | 503 | `Retry-After: 60`, `Cache-Control: no-store` |
| `/api/readiness` | 503 | `Retry-After: 60`, `Cache-Control: no-store` |

The detail route remains 500 on an upstream dependency failure. A server page cannot safely set a response status/header after render without an invasive middleware/proxy design. The branch therefore preserves honest 500 behavior and adds a real HTTP regression check instead of claiming 503 support. A true missing vehicle remains 404.

## Test evidence

- `npm test`: 72/72 passing.
- `npm run test:http-semantics -- --report /tmp/pdcar-audit-evidence/http-semantics.json`: passed against a real local Next HTTP server and synthetic upstream 503.
- `npm run test:browser-gallery -- /tmp/pdcar-audit-evidence`: passed in headless Chromium at 390, 768, 1165, and 1440 px with no horizontal overflow. Verified keyboard next, Escape close, focus restoration, pointer swipe, mobile content order, map/hours, filter deep link, card year and finance assumptions.
- `npm run verify`: lint, typecheck, and Next production build passed.
- Screenshots (synthetic fixtures):
  - `/tmp/pdcar-audit-evidence/pdcar-detail-390-updated.png`
  - `/tmp/pdcar-audit-evidence/pdcar-detail-lightbox-390.png`
  - `/tmp/pdcar-audit-evidence/pdcar-detail-1440-updated.png`
  - `/tmp/pdcar-audit-evidence/pdcar-home-1440-updated.png`

## Overlap and deferred work

- Draft PR #3 also introduced hours/map presentation. This branch did not merge PR #3; it integrated the verified facts in the audit branch. Reconcile duplicated files/content before either draft is merged.
- Media storage lifecycle/versioning is documented in `docs/VEHICLE-MEDIA-LIFECYCLE.md`; object migration/deletion and production database changes remain deferred.
- Per-user admin roles/revocation, privacy-aware attribution/retention, and edge-security settings remain approval-dependent architecture work in `docs/ADMIN-SECURITY-NEXT-STEPS.md`.
- Messenger remains absent because no verified public destination was supplied. Paused chatbots remain paused.
- A cleaner dependency-specific 503 for server-rendered vehicle detail would require a separately reviewed routing architecture change.

## Rollback

Before merge, close Draft PR #4 or reset the review branch to base `66dab3e`. After a future merge, revert the audit commit(s). No data rollback is required because this branch performs no database or storage mutation.
