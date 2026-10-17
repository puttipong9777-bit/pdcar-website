# SEO / AEO / GEO review — 17 October 2026

## Scope and publication status

Implemented locally in cloud on `codex/seo-aeo-geo-review-20261017`, based on production branch `codex/cloudflare-workers` at `06ca61412a8b1fa5f668a991392926e59556114d`. Not pushed, merged or deployed. No ERP/database records, credentials, domains, DNS, billing, paid services or Cloudflare configuration changed. Obtain approval before publication.

The saved checkout initially contained old `main` (`e14a409`), which targets Vercel and does not contain current SEO. Read-only remote branch inspection and fetch established the Cloudflare Workers source. `docs/CLOUDFLARE-WORKERS.md` identifies its production branch and OpenNext architecture. Historical `codex/sell-car-seo` is no longer a remote branch; `docs/VERCEL_SOURCE_RECOVERY.json` records recovered source provenance at historical SHA `cca3ad4477c9b5c836dc16d0826ddaa27527bb30`. Its existing changes are already incorporated; they were not recreated. No AGENTS.md or .agents/skills files were found in the workspace; `.ai` system, data, workflow and security instructions were reviewed.

## Findings and changes

- Existing canonical www URLs, Thai language, robots/sitemaps, AutoDealer/WebSite graph, vehicle Product/Vehicle schema, sell-car Service/BreadcrumbList and server-rendered catalog are retained.
- Homepage H1 now expresses “รถมือสอง / นครปฐม”; inventory heading identifies the dealership. Sell-car H1 names “รับซื้อรถมือสองนครปฐม”. Existing page serves selling intent; no duplicate location pages added.
- Added visible server-rendered answers about stock status, the existing public address, appointments and selling preparation, with links to inventory and `/sell-car`. Existing sell-car FAQ now explains the photo submission channel. No special AI files, fabricated reviews or ranking promises.
- LINE buttons now fall back to `https://line.me/R/ti/p/%40pdcar` on homepage, sell-car, vehicle details and navigation. This is the standard profile destination for the @pdcar ID verified by the parent’s authenticated OA audit. Existing environment override is retained. Tests inspect hrefs; they do not open chat, call or send messages.
- Reserved cars now use schema.org OutOfStock, agreeing with the visible “ติดจอง” label and existing Meta feed/product metadata. Missing prices no longer become zero in metadata. Per-car Twitter cards no longer inherit homepage copy. Missing vehicle metadata explicitly requests noindex.
- Public vehicle reader defensively retains only `available`/`reserved`, consistent with the existing approved view. This does not change publication rules or ERP state. Sold/unpublished cars remain absent from catalog/sitemap and return 404; no redirect to unrelated inventory and no invented sold-stock archive.
- Data lookup failure now throws for detail and vehicle sitemap instead of presenting a permanent missing-car result or a successful empty vehicle sitemap. Homepage retains the existing outage notice. Operators must restore the existing public-view configuration if missing; this intentionally surfaces configuration failures.

## Factual boundaries and unresolved content

Parent public audit corroborates phone 0840079122 and the existing address: 23/2 หมู่ 13 ต.โพรงมะเดื่อ อ.เมืองนครปฐม จ.นครปฐม 73000. It reported 12 current public cars and matching sitemap on 17 October; that count is an audit snapshot, not a hardcoded claim. No new address, map coordinate, hours, warranty or finance promise added.

PD0027: title/name is “HONDA 1.8EL 2017” and model field is “1.8EL”, while description names Civic. This requires owner-approved correction of structured ERP fields/title. Code deliberately does not infer model from free text. Earlier PD0026 year/registration disagreement is historical; parent confirms it is now absent, and user reported Attrage sold. No stock correction was made.

Opening hours and a verified map/business-profile URL remain missing. Obtain these from the owner before adding them. Public `/articles` browsing was not attempted due to the earlier denial; existing repository code and its tests remain in scope, with no article-content edits.

## Verification

Run in cloud with Node 24.19.0; all data-dependent QA used fixtures, never production writes:

- `npm ci --cache /tmp/pdcar-npm-cache --no-audit --no-fund`: passed. First default-cache attempt failed because `/home/agent/.npm` is not writable; temporary cache resolved it, no lockfile changes.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 66 passed, 0 failed, including 11 new SEO/Worker regression tests.
- `NEXT_TELEMETRY_DISABLED=1 SITE_ENV=preview npm run build:cloudflare`: passed, including production Next build and OpenNext bundle. Wrangler log-path warning from the unwritable home config was environmental.
- `XDG_CONFIG_HOME=/tmp/pdcar-config WRANGLER_LOG_PATH=/tmp/pdcar-wrangler.log npm run check:cloudflare`: passed; packaging only, no deployment. Initial default-config attempt failed before dry-run completion; temporary config resolved it.
- `git -c core.whitespace=cr-at-eol diff --check`: passed. Existing CRLF files were preserved.
- Chromium fixture browser: 9 page/viewport combinations (home, sell-car, reserved detail at 390/768/1440 px) passed; canonical URLs and parseable schema checked; LINE destinations present; mobile menu and FAQ work; no horizontal overflow. External browser requests blocked, media replaced with neutral placeholders. Screenshot evidence is not a live-media quality check.
- Raw local HTTP homepage HTML contains inventory links and answers before JavaScript. Fixture sitemap includes public cars and excludes sold; sold fixture detail returns 404. Unit tests confirm unavailable-data failure, safe JSON-LD escaping, missing-price omission and status consistency.
- Worker unit tests cover apex-to-www HTTPS redirect preserving path/query, preview noindex/disallow, and absence of the preview override on production host. These are source tests, not verification of deployed headers or CDN bot rules.

Local evidence and screenshots: `/workspace/pdcar-seo-review/`. Reproducible committed regression tests: `tests/seo.test.mjs` and `tests/seo-worker.test.mjs`.

## Performance and remaining release checks

Source audit: hero/primary detail images have priority, gallery uses responsive sizes, catalog images are lazy, videos lazy, and existing R2/native media path remains unchanged. Catalog already server-renders all initial links. No new client dependencies, font downloads, third-party scripts or database queries were added. No claim of measured speed improvement: Lighthouse, field Core Web Vitals, production media latency, live CDN caching/bot rules and production CPU were not measured. Check these on an approved preview/release with real media, particularly first-image LCP and mobile layout with all production titles. Placeholder-image layout checks cannot establish live performance.

Before publishing: review this diff against `codex/cloudflare-workers` (not stale `main`), verify production branch has not advanced, confirm owner content corrections separately, and approve publication. After authorized deployment, inspect actual response status/headers, robots and both sitemaps, sample available/reserved/removed cars and image delivery, run Rich Results Test and Search Console URL Inspection, submit/recheck sitemaps and observe indexing/query/call/LINE trends. Search Console, Google Business Profile and Bing Webmaster actions were not performed. No promise of indexing, rich results or AI recommendations.

## Rollback

Before publication, retain the current deployed Worker version. If the approved change causes regressions, restore that prior Worker version or revert the SEO review commit on a review branch, rerun checks and obtain approval before publishing the revert. No database migration, DNS change or credential rollback is needed. Do not use the old Vercel `main` branch as a rollback target.

## Official documentation consulted

- [Google AI features](https://developers.google.com/search/docs/appearance/ai-features): standard SEO, accessible textual content/internal links and accurate structured data apply; no special AI schema or text file is required and inclusion is not guaranteed.
- [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): markup must reflect visible, current content.
- [Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet): product/offer markup and availability.
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): canonical URLs and meaningful modification dates.
- [Canonical consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): consistent canonical signals.
- [HTTP status handling](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes): distinguish removed content from service failure.
