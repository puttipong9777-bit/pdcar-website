# Cloudflare Pages Free test deployment

Actual preview: https://pdcar-website-preview.pages.dev/
Current acceptance: [MIGRATION_CURRENT_STATUS.md](MIGRATION_CURRENT_STATUS.md). The preview reads 12 real public vehicles; media is blocked by ERP HTTP 402 and Free CPU charts have no data. This is not a completed production cutover.

## Project and source
- Repository: puttipong9777-bit/pdcar-website
- Pages project: pdcar-website-preview, Free/$0
- Isolated project's production branch: migration/cloudflare-pages
- Framework: None; build: npm run build; output: out
- Node: 22.23.3 via .node-version
- Compatibility date: 2026-10-10 via wrangler.jsonc
- Runtime: advanced-mode Pages Functions out/_worker.js, not a Workers-hosted project, Next static export, next-on-pages or OpenNext
- Other branch preview auto-deploys: None; build cache: Disabled; free limit policy: Fail closed

The existing authenticated Pages GitHub installation was reused. No new OAuth/token/access grant was created. “Production branch” is this separate pages.dev project's branch, not the original production domain or main. No custom domain is attached.

Verified working deployment ID: 3ad76bc6-d8ae-4b31-bc4d-f17f2eafa740.
Source: d9c32d8cc1a9a85ba803b16736a603cefedfe1e1.
Unique URL: https://3ad76bc6.pdcar-website-preview.pages.dev/
Successful CF logs detected Node 22.23.3, installed dependencies and compiled/deployed the Pages worker. Later evidence/docs commits can auto-deploy identical runtime code.

## Runtime configuration
The owner authorized transferring the existing public URL and publishable key from their open Supabase dashboard directly into this Pages project. Save the following as **encrypted Production dashboard bindings**, not GitHub values:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (existing anonymous/public publishable key)
- NEXT_PUBLIC_ERP_URL (existing public ERP URL)
- NEXT_PUBLIC_SHOP_PHONE (existing business contact)

Initial create-form Text settings were overridden by Wrangler's source configuration. Encrypted dashboard Secrets are now the verified runtime bindings; do not assume create-form Text values survive. Production Secrets are masked in the dashboard and no key values belong in source, reports, screenshots or PRs.
Never use service_role, Google/Drive credentials, article database/provider keys, cron, LINE callback or customer credentials. No new key was created/rotated; Supabase grants/schema/data were unchanged. Build reads no live inventory and requires no production-write credential.
The source public ERP URL is https://pdcar-platform.vercel.app and phone 0840079122. No production LINE URL was found, so no invented LINE destination was added. Original ARTICLE_APPROVAL_ENABLED, ARTICLE_DAILY_CRON_ENABLED and ARTICLE_LINE_POSTBACK_ENABLED are false and remain disabled.

## Cloud verification
All new code edits, lock generation, build and test operations were performed on Cloud. Original Windows source was transported read-only after 78 raw hash matches. No new Windows code edits/build/tests occurred.
Standard public-repository GitHub Linux runners are used; no paid runners, Actions package cache or upload-artifact storage is enabled. Successful mock screenshots and summary are committed with [skip ci].
- Source baseline workflow: https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38049576857
- Migration workflow (67 unit/8 browser, lint/typecheck, Pages + Next builds): https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38052534190
- Actual GET/HEAD QA (21 checks; media separately BLOCKED): https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38052534305

Preview blocks indexing and real Meta events. Production canonical/product identifiers and catalog behavior are preserved; production-host tracking is tested with mocks, not real customer events. The dependency audit has 8 inherited/toolchain findings; details and runtime distinctions are recorded in the current status.

## Acceptance and rollback
Real photos/video, actual stock freshness and measured cold/warm Free CPU remain acceptance gates. The ERP image origin returned HTTP 402; do not silently replace media URLs, migrate ERP or upgrade a plan. Dashboard CPU/duration “No data” is not a passing metric.
No DNS/custom-domain cutover, merge, Vercel deletion, production migration/write or paid upgrade is authorized. Keep the PR draft until gates pass. Preserve existing ERP and Vercel production.
Rollback is to retain the original domain/deployment and select an earlier working Pages deployment on this isolated project if needed; public read-only views have no schema migration to reverse. Domain work later follows [CLOUDFLARE_DNS_ROLLBACK.md](CLOUDFLARE_DNS_ROLLBACK.md).
Pages cannot inherit Vercel Cron; original Node integrations remain disabled pending separate activation review.
