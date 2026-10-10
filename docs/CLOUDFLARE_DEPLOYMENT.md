# Preview deployment checklist (not yet deployed)

This is **Cloudflare Pages Free**, using native advanced-mode Pages Functions.
`out/_worker.js` is a Pages Functions artifact, not a Workers-hosted site.
Do not use `wrangler deploy`, Workers Builds, next-on-pages or an OpenNext adapter.

## Existing access prerequisite

The cloud executor has GitHub push access, but no Cloudflare API token/account ID,
saved Wrangler OAuth session or production public Supabase values. Its proxy also
denies outbound Cloudflare API/ERP origin access. Do not run `wrangler login` or
create persistent credentials/GitHub integrations without owner approval.

Owner must approve connecting the existing repository through Cloudflare Pages,
or supplying scoped existing Pages deployment access securely to this cloud
environment. Do not use the owner's Windows machine. Restrict access to this
website repository/project; never select ERP. Verify Free plan before creating
the project; no paid bindings, image resizing, databases or subscriptions.

## Git-integrated Pages (preferred)

After the owner approves GitHub integration, select `puttipong9777-bit/pdcar-website`.
Keep the production branch as `main`; disable automatic production deployments
during migration. Enable preview builds only for `migration/cloudflare-pages`.
Do not merge or associate a custom domain. The proposed project name in Wrangler
must be reconciled with the actual chosen name; no project currently exists here.

- Framework preset: **None** (custom native Functions build, not Next static export).
- Root: repository root.
- Node: 22, latest supported patch (local validation used Node 24.19.0).
- Build: `npm ci && npm run verify && npm test` (verify includes build).
- Output: `out`.
- Pages Functions compatibility date: `2026-10-10`.
- Fail closed if the Functions request allowance is exhausted; never serve a stale
  exported car detail page as fallback. There are no exported vehicle pages.

Set runtime bindings in the preview environment, using the existing values:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ERP_URL`,
`NEXT_PUBLIC_SHOP_PHONE`, `NEXT_PUBLIC_LINE_URL`. No values committed. Build needs
no inventory credentials and does not fetch production data. Only phone and LINE
are serialized to clients; public inventory is allowlisted. Do not add service-role
keys, OAuth secrets, Drive credentials or signed media URLs.

## Direct upload alternative

After authorized existing access is available and Free project is verified:

```sh
npm ci
npm run verify
npm test
npx wrangler pages deploy out --project-name <actual-pages-project> --branch migration/cloudflare-pages
```

Do not create a Direct Upload project if Git integration is required without
reviewing Cloudflare's project-type switching limitations. No credential/login
command is part of this repository. Record actual URL and deployment commit;
never invent a successful pages.dev URL.

## Required remote acceptance

Check deployment logs and exact commit, HTTPS, actual data, real ERP photo IDs,
direct existing/new slug and Car ID URLs, refresh, preview noindex, canonical,
sitemap, browser console/network, desktop/mobile screenshots and CPU metrics.
New-car/price/reserved/unpublish scenarios must use mocks or a separately approved
staging source; never modify production data. Free CPU/request behavior must be
validated before cutover. Record blocked checks rather than claiming success.

No DNS, custom domain, Vercel deletion, ERP changes or production cutover are
authorized by this checklist.
