# PD Car Center customer website

**Production source gap: deployment is on hold.** The reported current Vercel source includes later commits absent from this checkout. Recover and reconcile the exact deployed source before any new deployment; see [PRODUCTION_SOURCE_GAP.md](docs/PRODUCTION_SOURCE_GAP.md). Earlier tests cover the supplied baseline/mocks only.

Public vehicle website, separate from ERP, reading only the existing Supabase
`public_vehicle_listings` view. Car IDs, slugs, ERP public media and business data
remain owned by the existing system.

This branch prepares a **Cloudflare Pages Free** migration using native Pages
Functions and the existing React presentation. It is a draft, not a production
cutover. No real pages.dev preview has been deployed; see
[CLOUDFLARE_WEBSITE_MIGRATION.md](CLOUDFLARE_WEBSITE_MIGRATION.md) for results and blockers.

## Cloud development

Use Node **22.23.3** as pinned in `.node-version`. The Pages build compiles the
fixed homepage and card/video markup from the same React JSX into escaped
templates; each request still fetches fresh public inventory and fills them.
Browser hydration, detail SSR and the original Next fallback remain React.

```sh
npm ci
npm run verify
npm test
npm start
```

`npm start` / `npm run dev:pages` serves the built `out/` through local Wrangler.
Configure approved existing public values in ignored `.dev.vars` for local Pages
runtime, or Pages preview runtime settings for deployment. Build itself requires
no Supabase credentials. Never commit `.dev.vars`, tokens or production values.

Names: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
NEXT_PUBLIC_ERP_URL, NEXT_PUBLIC_SHOP_PHONE, NEXT_PUBLIC_LINE_URL.
Missing data configuration returns HTTP 503 rather than pretending the inventory
is empty or unavailable cars are permanently removed.

## Tests

`npm run test:browser` runs mock-only Playwright tests against local workerd.
Install a Playwright Chromium browser, or point `PDCAR_CHROMIUM_PATH` at an existing
browser executable. The tests run local fixtures on ports 8789/8790 and never
write production data. Screenshots are labelled mock in `artifacts/`.

The retained Next application uses `npm run dev`, or
`npm run build:next && npm run start:next`. Do not pair the Pages build with Next
start. The unchanged production Vercel deployment remains the immediate rollback.

## Boundaries

**Do not run the bundled historical SQL migration on production.** The shared
public view already exists; the historical file drops/recreates it and predates
optional video fields. No schema or ERP mutation is part of this migration.
No production publish/unpublish or price changes should be used as test fixtures.

Read [.ai/SYSTEM_CONTEXT.md](.ai/SYSTEM_CONTEXT.md), [.ai/SECURITY.md](.ai/SECURITY.md)
and [docs/PUBLIC-DATA-CONTRACT.md](docs/PUBLIC-DATA-CONTRACT.md).
Deployment/access/DNS plans are in `docs/CLOUDFLARE_*.md`. No merge, DNS change,
paid resource, new credentials or ERP migration is authorized by these files.
