# PD Car Center public website
Cloudflare Pages preview migration. The ERP and existing Vercel production are preserved.
Exact recovered Vercel source is on branch codex/vercel-production-source at f9722f6. Native Pages runtime renders the original public UI and hydrated filters without Vercel Image Optimization.
`npm ci`, `npm run verify`, `npm test`, `npm run test:browser` and `npm run build:next` run on Cloud through verify-pages-migration.yml. Do not build/test/edit source on the owner's Windows PC.
Runtime reads anonymous safe columns from public_vehicle_listings and public_approved_articles, and reads media through ERP's public image endpoint. No database migration or write is performed.
Production article approval, cron and postback flags are false and remain disabled in Pages. Original Node routes/library/tests are retained. Future activation needs separate review of scheduler, database/TLS and messaging; Pages cannot inherit Vercel Cron.
See CLOUDFLARE_WEBSITE_MIGRATION.md and docs/CLOUDFLARE_DNS_ROLLBACK.md. Do not merge or alter DNS until actual preview/media/Free runtime acceptance.
