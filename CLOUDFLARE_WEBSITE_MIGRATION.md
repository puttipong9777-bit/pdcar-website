# Cloudflare Pages website migration

## Status / boundaries

Draft implementation and local QA delivered; live migration is BLOCKED. No deployment or cutover has occurred. Website repository only. ERP, Supabase schema/data, DNS, production domain, and Vercel projects are untouched. No paid resources or credentials requested/created. Baseline: `e14a409e5643c551aab98e10b263fba1e6c1d5ba`. Branch: `migration/cloudflare-pages`.

## Phase 1 — audit (2026-10-10, Codex Cloud)

PASS: clean repository checkout and `git ls-remote`; push dry-run accepted. No AGENTS.md or additional .agents skills found in checkout/workspace. Read `.ai/SYSTEM_CONTEXT.md`, `.ai/SECURITY.md`, `.ai/DATA_CONTRACT.md`, `.ai/WORKFLOWS.md`, `.ai/NEXT_STEPS.md`, README and `docs/PUBLIC-DATA-CONTRACT.md`, plus full supplied Library specification.

Routes: `/` and `/cars/[identifier]` use request-time Next rendering. `/api/health` returns JSON. `/robots.txt` allows crawling. No sitemap. Next 15.5.20 / React 19. No automated tests initially. `npm run verify` runs lint/typecheck/build.

Data: only public_vehicle_listings, currently select(*), all rows mapped. Detail matches exact Car ID or slug. Preserve allowed field contract including vertical_video. Bundled SQL drops/recreates public view and omits vertical_video; NEVER run this SQL in this migration. Production publication filtering remains the existing view's responsibility.

Environment names: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ERP_URL, NEXT_PUBLIC_SHOP_PHONE, NEXT_PUBLIC_LINE_URL. No production values available in cloud process or checkout. Never introduce service role or ERP credentials.

Images: next/image in homepage/header/cards/stories/detail. Photos formed exclusively as ERP `/api/public/vehicle-images/{encoded fileId}`. Existing map retains array order. Layout uses fill containers and CSS aspect ratios. ERP remains a Vercel bandwidth/runtime dependency after website migration. Current metadataBase points at old Vercel website; detail metadata inherits generic shop social image.

BLOCKED: real ERP/media availability: cloud curl to public media probe failed at outbound proxy CONNECT with HTTP 403, before reaching ERP; browser web fetch also inaccessible. This is not evidence of ERP pause or origin HTTP status. No valid public file ID available yet, so a real image success has NOT been tested. Moving the website alone cannot repair an unavailable ERP image origin.

## Architecture evaluation (before implementation)

- Next static export + generateStaticParams: built car routes/metadata become stale; new slugs require rebuild. No authorized ERP webhook change or existing deploy hook available. Does not satisfy immediate new-car URLs by itself.
- Static shell + browser-only reads: live visible data possible, but initial HTML/social metadata absent and deep routes require fallback; unacceptable SEO regression.
- Native Pages Functions with static assets and existing React presentation: selected for implementation/validation. Request-time public-view reads and HTML/social rendering preserve new URLs without rebuild, no data cache, status/unpublish visible on next navigation/refresh. Idle open tabs remain snapshots, matching baseline. No Next server adapter or Workers hosting.

Tradeoff: dynamic HTML consumes Pages Functions free request/CPU quota and Supabase reads; uncached reads add upstream latency, but avoid cache-delayed unpublishing. Static JS/CSS/images remain CDN assets. Full React SSR CPU must be measured locally and validated on actual Free preview before production approval. Existing JSX/CSS will be reused, replacing only Next runtime wrappers and request routing.

Official sources checked 2026-10-10:
- https://developers.cloudflare.com/pages/framework-guides/nextjs/ (Pages static export; full-stack recommendation is Workers, outside this authorization)
- https://nextjs.org/docs/15/app/guides/static-exports (unsupported dynamic features)
- https://developers.cloudflare.com/pages/functions/advanced-mode/ (native Pages `_worker.js` and ASSETS binding; filename does not mean Workers hosting)
- https://developers.cloudflare.com/pages/functions/pricing/

## Phase ledger

1. Audit completed and published.
2. Pages candidate architecture implemented and published; real Free CPU acceptance pending.
3. Public read boundary implemented/tested with mocks; live credentials/permissions blocked.
4. Direct ERP image handling implemented/tested with fixtures; live media blocked.
5. Deployment prepared; actual Cloudflare preview BLOCKED.
6. Local automated/browser QA completed; remote acceptance BLOCKED/NOT TESTED.
7. DNS/rollback plan prepared read-only; live DNS evidence BLOCKED.
8. Handoff prepared for draft PR; no merge or cutover. Actual preview URL: NONE.

## Phase 2 — native Pages implementation

Implemented Pages advanced-mode Functions with bundled React SSR, retaining original Next entry points for rollback verification. Home/detail JSX extracted without CSS changes; Next Link/Image replaced only in Pages bundle by small native wrappers. Added request-time metadata, canonical URLs, sitemap, preview noindex, real 404 for absent vehicles and 503 for unavailable data. No static car list generated. Navigation is full-document navigation so each click/refresh reads current data; back-forward cache restores reload.

Actual checks: dependency installation PASS using writable `/tmp/pdcar-npm-cache` (initial default-cache install failed due sandbox path). `npm run lint`, `npm run typecheck`, `npm run build` PASS after fixing initial lint/type errors. Built handler smoke test: health 200, preview robots 200, unconfigured home/detail 503; all dynamic responses no-store. Live data, CPU quota, browser and deployment checks pending.

## Phase 3 — public connectivity boundary

Replaced SDK select(*) with explicit contract columns, GET-only PostgREST requests, no-store and timeout. Pagination avoids silent default row-cap truncation (100 rows/page, maximum 40 pages; fail closed above that request budget). Anon JWT role/public publishable key accepted; service-role/secret keys refused before network. Response mapping never serializes raw rows or credentials. Existing production view still enforces website_published; app also discards statuses other than available/reserved. No SQL/schema/data mutation.

PASS: eight automated built-handler tests: allowed columns/GET/key non-disclosure, service-role refusal, new slug/ID/price/reserved/unpublish on next request, sold exclusion, server social metadata/photo order/video/JSON escaping, sitemap/robots/preview-noindex/HEAD/method handling, missing-config 503, pagination. These use mock fixtures only, not production writes or claims about production permissions. Lint/typecheck/build PASS.

BLOCKED: actual production URL/anon key/LINE value absent; live connection and anonymous access restrictions NOT TESTED. Need owner-approved existing public values supplied through secure Cloudflare configuration; never through commits or report. Zero-row/schema-only permission checks may establish denial but a 200 with zero rows does NOT prove sensitive rows inaccessible under RLS. Existing SQL is not proof of current deployed permissions. No private table data fetched.

## Phase 4 — image delivery

Pages aliases next/image to native img: eager/high-priority shop hero/logo, lazy/async other images, existing fill positioning/sizes/width/height and unchanged CSS aspect ratios. All public car images keep the ERP file-ID endpoint and source order. Also disabled Next image optimization in retained Next configuration, ensuring fallback builds do not generate /_next/image either.

PASS (automated fixture): initial HTML has direct ERP-origin image src, lazy loading, correct cover before gallery side image, video embed, no /_next/image. Real cover/gallery image bytes remain BLOCKED (no public file ID and outbound origin access denied). Do not interpret fixture images as live availability.

Bandwidth: browser downloads original ERP image bytes; no Cloudflare paid resizing enabled. Static shop images use Pages CDN. ERP image requests and Google Drive/storage retrieval remain on Vercel and may increase original-byte transfer compared with optimized thumbnails. No new image cache/mirror introduced because it could continue exposing unpublished car media. A future thumbnail service must honor ERP publication checks and is outside this migration; no private documents/files copied. An unavailable/paused ERP still prevents live photos.

## Phase 5 — deployment preparation

Prepared `wrangler.jsonc` with pages_build_output_dir=out, native Functions compatibility date, `.node-version` and `docs/CLOUDFLARE_DEPLOYMENT.md`. Preset None; build npm ci && npm run verify && npm test. No account IDs/credentials/bindings/resources created. Preview only, no main branch merge or custom domain.

PASS: actual local Wrangler 4.149.0/workerd compiled artifact; `/api/health` returned 200 JSON at localhost:8788. Wrangler's generated CF_PAGES_URL binding is a local placeholder, NOT an actual deployment URL. Remote request.cf lookup failed due restricted network and emulator used its documented local default.

BLOCKED: actual pages.dev deployment. No existing Cloudflare account ID/API token/OAuth session found; Cloudflare API CONNECT blocked by outbound proxy (403). No attempt to create credentials, login/OAuth, Git integration or paid resources. No real preview URL exists. Owner approval needed for connection/access and secure existing public configuration; cloud network access also needs restoration. Continue mock/local QA while blocked.

## Phase 6 — actual local QA and remaining remote gates

PASS: clean final `npm ci` (356 packages), `npm run lint`, `npm run typecheck`, `npm run build`, 11/11 built-handler automated tests. Retained Next build (`npm run build:next`) PASS. Node v24.19.0 / npm 11.9.0; Node 22 deployment setting still needs remote verification.

PASS: 4/4 Playwright tests using real local Wrangler/workerd, Chromium `/usr/bin/chromium`, desktop 1440x1000 and iPhone 13 viewport/device emulation. Tests cover homepage, search/model, brand/year/status filters, phone/LINE link destinations, direct detail/refresh, cover/gallery bytes/order, installment/price, video embedding, menu, no horizontal overflow, no console/page errors, no Next optimizer requests, new slug/price/reserved/unpublish without rebuild. Screenshots visually inspected. Source is local mock server; gallery fixtures intentionally use the existing shop photograph, and YouTube frame is mocked. This is not an iPhone Safari/hardware or live YouTube test.

Evidence: `artifacts/verify.log`, `npm-ci.log`, `unit-tests.log`, `next-build.log`, `browser-tests.log`, `browser-results.json`; `desktop-home-mock.jpg`, `desktop-detail-mock.jpg`, `mobile-home-mock.jpg`, `mobile-detail-mock.jpg`. Tests never modify production data. CSS unchanged from baseline; existing typography retained (baseline body font inheritance can depend on OS fonts).

CPU risk: `artifacts/local-cpu.json` measures Node process CPU, not Cloudflare billing. Median home request CPU: 1 car 4.209 ms, 10 cars 6.663 ms, 50 cars 8.557 ms, 100 cars 14.148 ms; several p95/initial samples exceed 10 ms. **Free runtime quota acceptance is BLOCKED**, not PASS. Must obtain actual preview CPU/startup metrics with real inventory size and cold/warm requests. If 10 ms exceeded consistently, optimize static shell rendering/dynamic islands before deployment acceptance; do not enable Paid or switch to Workers hosting. No production readiness claim.

| Test | Local/mock | Actual pages.dev / production source |
| --- | --- | --- |
| Homepage and inventory | PASS | BLOCKED: no deployment/config |
| Supabase public-view contract | PASS allowlist/read-only | BLOCKED: no credentials/network |
| Anon cannot access private rows | NOT TESTED | BLOCKED: live permission evidence absent |
| Search, brand/year/status filters | PASS | NOT TESTED |
| Direct slug/Car ID and refresh | PASS | NOT TESTED |
| New slug/car, price/status, unpublish | PASS mocks | NOT TESTED; never write-test production |
| Images, cover/order, lazy sizing | PASS fixtures | BLOCKED: ERP/media availability |
| Price and installments | PASS | NOT TESTED |
| Phone/LINE destinations | PASS fixture LINE | BLOCKED: actual LINE value absent |
| YouTube embed | PASS mocked frame | NOT TESTED playback |
| Desktop/mobile layout/screenshots | PASS Chromium + iPhone emulation | NOT TESTED actual device/remote |
| Console/page errors and missing fixture assets | PASS none observed | NOT TESTED live assets |
| SEO/social tags, canonical, robots, sitemap | PASS initial HTML | NOT TESTED Google/Facebook fetch/cache |
| ERP non-impact | PASS no writes, no ERP files changed | BLOCKED live ERP health read |
| npm ci/lint/typecheck/Pages build | PASS | BLOCKED remote build |
| Automated tests | PASS 11 unit + 4 browser | NOT TESTED remote |
| Retained Next build | PASS | NOT TESTED rollback deployment |
| Free resource quotas | Local CPU RISK | BLOCKED actual metrics/account plan |
| HTTPS/CDN/cache headers | PASS local no-store/routes | NOT TESTED remote TLS/CDN |

FAIL encountered and resolved: initial npm default-cache permission failure and initial TypeScript/lint issues. No known failing final functional local test. Live success criteria remain unfulfilled.

Phase 6 review correction: legacy view missing vertical_video now falls back only on PostgREST 400/code 42703 naming that optional column; explicit safe select remains, missing required columns still fail closed. Two additional tests PASS. No ERP schema changes.

Phase 6 additional review: detail requests now filter the same public view by safely quoted exact Car ID/slug instead of mapping all inventory; HEAD skips HTML/JSON rendering. npm start now starts Pages locally; start:next pairs explicitly with build:next. Added filter-escaping test; final 11 unit and 4 browser tests PASS. Actual Free CPU compliance remains NOT TESTED (preview access BLOCKED), not a demonstrated Cloudflare quota failure.

## Phase 7 — DNS/domain/TLS readiness (plan only)

Read-only A/AAAA/CNAME/NS/MX/TXT/CAA queries for apex/www and DMARC TXT all failed ECONNREFUSED in the cloud resolver. Current records and TLS/redirect chain are BLOCKED, not absent. Evidence: `artifacts/dns-readonly.json`. Prepared conditional external-DNS www CNAME association, apex redirect preserving path/query, mail/DNSSEC/CAA inventory and exact-record rollback in `docs/CLOUDFLARE_DNS_ROLLBACK.md`. Prefer no nameserver change. This plan is preparatory only; actual preview acceptance has not passed, so cutover must not proceed. No DNS changed.

`docs/CLOUDFLARE_ACCESS_HANDOFF.md` lists exact blocked destinations and secure setup route. Git executor credentials stopped authenticating after phase 5; later commits are published through the already-authorized connected GitHub app, with blob/tree hashes verified against the local checkout. No new GitHub credential created. A metadata upload was initially rejected by automatic review as a possible secret; read-only comparison confirmed the unchanged public Facebook verification meta tag already in public main, and the retry was approved. No secret exposed or approval bypassed.


## Phase 8 — handoff

**Actual preview URL: none. No Cloudflare deployment was performed.** This branch is a reviewable migration candidate, not a completed live migration. Existing website/ERP production state has not been changed.

### Files and reasons

| Files | Reason |
| --- | --- |
| app/page.tsx, app/cars/[identifier]/page.tsx | Thin retained Next entry points; reuse extracted presentation |
| components/home-content.tsx, components/vehicle-content.tsx | Existing JSX extracted for shared Pages/Next rendering |
| components/site-header.tsx, app/layout.tsx | Runtime public phone/LINE props; production metadata origin corrected |
| lib/vehicle-data.ts | Explicit public GET allowlist, anon-key check, pagination, exact detail filter, safe optional-video compatibility |
| pages-runtime/app.tsx, client.tsx | Shared page tree and hydration; fresh full-document navigation/back-forward restore |
| pages-runtime/worker.tsx | Native Pages request routing, request-time HTML/metadata/sitemap, HTTP errors, preview noindex, HEAD fast path |
| pages-runtime/image.tsx, link.tsx | Native images/anchors in Pages bundle, preserving layout/loading and fresh navigation |
| scripts/build-pages.mjs | Bundle static assets and native Pages _worker.js; route assets outside Functions |
| next.config.ts | Disable legacy Next optimizer in fallback build |
| package.json, package-lock.json | Reproducible esbuild/Wrangler/Playwright tools and explicit Pages/Next commands |
| wrangler.jsonc, .node-version | Pages output/runtime date and proposed Node 22 build setting |
| .gitignore, eslint.config.mjs | Ignore local secrets/build/test caches, lint source rather than bundles |
| playwright.config.ts, tests/fixtures.mjs, tests/mock-server.mjs, tests/pages.test.mjs, tests/browser/website.spec.ts | Isolated no-write regression and workerd/browser tests |
| artifacts/browser-results.json, browser-tests.log, unit-tests.log, verify.log, npm-ci.log, next-build.log | Actual command/test evidence |
| artifacts/desktop-home-mock.jpg, desktop-detail-mock.jpg, mobile-home-mock.jpg, mobile-detail-mock.jpg | Actual mock-only browser screenshots |
| artifacts/local-cpu.json, dns-readonly.json | Measured local CPU warning and failed read-only DNS evidence |
| docs/CLOUDFLARE_DEPLOYMENT.md, CLOUDFLARE_ACCESS_HANDOFF.md, CLOUDFLARE_DNS_ROLLBACK.md | Preview setup, secure approval/network handoff, conditional DNS/rollback |
| README.md, CLOUDFLARE_WEBSITE_MIGRATION.md | Correct run commands; remove dangerous production-SQL setup advice; complete status/handoff |

No CSS, public images, public data contract, SQL migration or ERP repository files were changed.

### Build / deployment / freshness

Preset None, repository root, `npm ci && npm run verify && npm test`, output `out`, Pages Functions advanced mode. Node 22 proposed; local tests used 24.19.0. Five existing public variable names are listed in phase 1; values are neither logged nor committed. Use runtime bindings, not a static inventory export. JS/CSS static assets revalidate; dynamic HTML/sitemap/health use no-store. Changes appear on next navigation/refresh, with no intentional cache delay, subject to Supabase response latency (8-second timeout per upstream page). Open idle tabs are snapshots just as in baseline. No polling or paid services added. Social platforms can retain their own preview caches independently of site headers.

### Free plan limits and remaining risks

Official sources checked 2026-10-10: Pages Functions pricing, Pages platform limits, and https://developers.cloudflare.com/workers/platform/limits/ . Functions share the account-wide 100,000 requests/day Free allowance (UTC reset); static requests that bypass Functions are free/unlimited. Runtime Free CPU 10 ms/request, memory 128 MB, external subrequests 50/request. Pages Free allows 500 builds/month, one concurrent build, 20-minute build timeout, 20,000 files/site, 25 MiB/asset. These are limits, not measurements of this account or a cost guarantee. No paid plan/resources enabled.

Actual Free CPU acceptance is NOT TESTED because deployment is blocked. Local CPU warning must be investigated with cold/warm real preview metrics; larger inventory may require build-time static-shell extraction and lighter dynamic rendering. Do not solve it by silently enabling Paid, switching hosting, caching unpublished data or dropping SEO. App caps list pagination at 40 requests (+ at most one legacy-video retry), failing visibly instead of truncating; realistic volume needs acceptance testing. Real API schema/grants and ERP photo availability remain unknown. Native original images may transfer more bytes; unavailable ERP photos cannot be repaired by this website move alone.

### Remaining owner/platform actions

Approve secure Cloudflare Pages access/Git integration (website only), provide existing public configuration via settings/secret UI, and restore allowed cloud network access listed in the access handoff. Then verify Free plan, deploy preview, record actual URL/commit, run live read-only data/media checks and remote browser/SEO/TLS/CPU QA. Live anon permission checks must avoid sensitive rows; zero-row success alone is inconclusive. DNS records/SSL/mail/redirect baseline require read-only access. Only after all gates pass should a separate explicit DNS/custom-domain cutover approval be sought. No raw tokens in chat. No merge, ERP changes, production write tests or Vercel deletion.
