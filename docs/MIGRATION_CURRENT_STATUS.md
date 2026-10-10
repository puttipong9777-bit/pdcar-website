# Current Cloudflare Pages migration status — 2026-10-10

This file supersedes historical local verification and access statements in CLOUDFLARE_WEBSITE_MIGRATION.md. Historical artifacts describe an older candidate, not the recovered production site.

## Source and scope
Recovered exact Vercel CLI production source: f9722f6de2bb4f9eaa1959e91b0ca966bea06508, with 78 raw SHA-1 matches. Source provenance and baseline CI passed 46 tests, lint/typecheck and Next build:
https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38049576857

Migration changes restore the original showroom, carousel/filtering, detail galleries, sell-car page, public articles and metadata, Facebook catalog CSV/product identifiers and source assets. Native images bypass Vercel Image Optimization. A source JSX parity test and SSR/hydration tests guard the preserved presentation.

The ERP, Supabase production schema/data, main branch, domain/DNS, Vercel deployment, and the owner's dirty ERP OCR file are untouched. No production migrations, writes, real messages, new account access or paid services were performed. Only mock/in-memory fixtures are mutated by tests. The PR is a draft and remains unmerged.

## Actual Pages deployment and live acceptance
The isolated Free Pages project **pdcar-website-preview** is deployed and reads the existing anonymous/public Supabase views. Actual HTTPS alias:
https://pdcar-website-preview.pages.dev/

Verified successful deployment: **3ad76bc6-d8ae-4b31-bc4d-f17f2eafa740**, source **d9c32d8cc1a9a85ba803b16736a603cefedfe1e1**, unique URL:
https://3ad76bc6.pdcar-website-preview.pages.dev/
Cloudflare Git integration may also deploy evidence/documentation commits with identical runtime code. The IDs above identify the working deployment observed during live QA.

The owner's authenticated existing Cloudflare Pages GitHub installation already exposes this repository. Account Free/$0 was verified; no new OAuth grant or credentials were created. Production branch belongs only to this test project: migration/cloudflare-pages. Other branch preview auto-deploys are disabled, build cache is disabled, and Free usage-limit behavior is **Fail closed**. No paid resources were selected.

The owner expressly authorized transferring the existing Supabase URL and anonymous/public publishable key directly from their open Supabase dashboard into Cloudflare. The four Production runtime bindings are encrypted dashboard Secrets: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ERP_URL, NEXT_PUBLIC_SHOP_PHONE. The key was not printed, committed, created or rotated. No service_role key or production-write credential is present.
An initial copy included the key menu label; this was corrected using the exact public-key element. Successful real public-view reads verify the corrected binding. Initial setup-form Text values were overridden by wrangler configuration, so runtime configuration was saved in encrypted dashboard bindings instead. Preserve this distinction when reproducing deployment.

Read-only Supabase metadata confirmed both public views exist and anon can SELECT them; all required vehicle/article columns are present. No grants, schema changes, migrations or data writes were performed. ERP URL is https://pdcar-platform.vercel.app and source shop phone is 0840079122. Original metadata has no LINE URL, so that absence is preserved.

## Verification
- Recovered-source baseline: 46 tests, lint/typecheck and retained Next build passed on Cloud.
- Migration CI on d9c32d8: clean install, lint/typecheck, Pages build, **67/67 unit tests**, **8/8 browser cases**, and retained Next build passed:
  https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38052534190
- Desktop 1440x1000 and iPhone 13 Chromium tests use fixtures only; screenshot evidence and tested commit are in artifacts/cloud-qa-summary.json and artifacts/*-mock.jpg.
- Separate live read-only Cloud QA passed **21/21 checks**, reading **12 public vehicles**:
  https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38052534305
  See artifacts/live-preview-qa.json. GET/HEAD only, no production writes. This PASS covers HTML/routes/data/metadata, **not media or CPU acceptance**.
- Live browser inspection confirmed 12 cards, PD0026 search narrows to one and clearing restores 12; PD0026 detail preserves 17 photo entries. At 390x844 mobile layout, the gallery starts collapsed and expands via its original disclosure control. Temporary viewport override was reset.
- Preview has HTTPS, no-store dynamic HTML, noindex header/meta, robots disallow, no real Meta pixel and no serialized API key. Sell-car, articles, sitemaps, feed with quantity, vehicle slug and Car ID aliases, ordered photo references, HEAD and unknown-page 404 pass.
- New/price/reserved/unpublish scenarios remain mock-only; no production listing was changed to test freshness.
- The original www.pdcarcenter.com shows Deployment Paused, so a live visual baseline is unavailable. Raw source hashes, source JSX parity and original layout/behavior tests provide the available comparison.

## Remaining acceptance gates — migration is not complete
1. **Real media BLOCKED:** both sampled public image HEAD requests to the ERP origin returned HTTP **402**, not an image. The live browser shows broken vehicle images. Native image delivery avoids Vercel Image Optimization, but the existing public image URLs still depend on the paused ERP media endpoint. The hosting migration alone cannot resume that upstream endpoint. Fixing ERP availability or changing the media architecture requires work outside this website-only migration; do not change ERP, public media URLs/storage, production data, billing or DNS silently. No real video playback acceptance is claimed.
2. **Free CPU NOT MEASURED:** Cloudflare Production Metrics (Last 24 hours) displays “No data is available for this time range” for requests, CPU percentiles and duration. Zero chart placeholders are missing data, not measured zero usage. Real HTML requests succeeded, but cold/warm CPU with actual stock has not been certified against the Free 10ms budget. HTTP latency is not CPU.
3. Full media/video and freshness acceptance and CPU measurements must pass before DNS cutover or claiming completion. Keep this PR draft and unmerged; custom domain/DNS and existing Vercel deployments are unchanged. Original production can be retained/rolled back without schema changes.

## Disabled integrations
Production ARTICLE_APPROVAL_ENABLED, ARTICLE_DAILY_CRON_ENABLED and ARTICLE_LINE_POSTBACK_ENABLED were verified false via metadata. Pages keeps these integrations disabled and fails closed if someone toggles approval on without reviewing the retained Node backend. No article/provider/LINE/cron credentials were copied. Pages does not inherit Vercel Cron schedules.
The preview has noindex/robots disallow and does not send Meta Pixel events. Product/catalog behavior for the original production host is tested only with mocks.

## Dependency audit
Cloud npm audit found 8 inherited/toolchain advisories: 7 high and 1 moderate. Findings and exact affected ranges appear in the workflow audit step.
The high findings concern eslint/glob/braces, brace-expansion and source-map-js build tooling. Next 15.5.25 has a moderate SSG/ISR cache-poisoning advisory; the retained Next fallback uses this version. Native Pages runtime bundles React directly and aliases Next image/link; it does not run the Next server or SSG/ISR cache.
This is not a clean dependency-audit claim. Do not force an eslint/Next major downgrade with npm audit fix. Dependency remediation must be tested separately before activating the retained Next fallback.

## Native browser compatibility
Cloud browser tests uncovered modern Chromium hiding closed ::details-content even though the recovered desktop CSS sets the child gallery grid display: grid. A Pages-only CSS compatibility rule keeps the intended desktop photo grid visible at widths above 900px. The existing mobile disclosure/button behavior remains unchanged. The original source CSS/JSX files remain intact, and tests assert desktop visibility without JavaScript and mobile collapse/expand.
Reference: https://developer.chrome.com/blog/styling-details/
