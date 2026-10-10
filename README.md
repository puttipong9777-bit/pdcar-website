# PD Car Center public website

Cloudflare Pages Free preview: https://pdcar-website-preview.pages.dev/
Public inventory is connected. Migration is **not complete**: ERP image origin HTTP 402 and unavailable CPU metrics block final acceptance. See [current status](docs/MIGRATION_CURRENT_STATUS.md).

Exact recovered Vercel source is on branch codex/vercel-production-source at f9722f6. Native Pages runtime preserves the original public presentation and hydrated filters without Vercel Image Optimization. ERP and existing Vercel production are preserved.

New code edits/build/tests run on Cloud. The verify-pages-migration.yml workflow runs npm ci, npm run verify, npm test, npm run test:browser and npm run build:next. Current tested commit d9c32d8 passed 67 unit/8 browser cases and both builds. verify-live-preview.yml uses GET/HEAD only against the actual preview.

Runtime reads anonymous safe columns from public_vehicle_listings and public_approved_articles. Existing media URLs use ERP's public image endpoint. No database migration/write is performed. Public configuration is encrypted Cloudflare runtime bindings, never GitHub values.

Production article approval, cron and postback flags are false and remain disabled. Original Node implementation is retained; future activation needs separate scheduler/database/TLS/messaging review. Pages cannot inherit Vercel Cron.

Keep PR #1 draft; do not merge or change DNS until actual media/freshness and Free CPU gates pass. Deployment and rollback: docs/CLOUDFLARE_DEPLOYMENT.md and docs/CLOUDFLARE_DNS_ROLLBACK.md.
