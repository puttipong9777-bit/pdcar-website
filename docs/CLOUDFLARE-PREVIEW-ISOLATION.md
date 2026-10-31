# Cloudflare Worker Preview isolation

Status: configuration and local synthetic verification only. This branch does not change production routes, bindings, credentials, database contents or DNS.

Cloudflare Worker Previews require a top-level `previews` block. Preview settings do not inherit production variables or data bindings. The branch therefore declares only read-only feature flags under `previews.vars` and intentionally omits production R2, Hyperdrive, routes and cron configuration.

## Preview behavior

- `SITE_ENV=preview` and `SITE_ANALYTICS_ENABLED=false` prevent first-party analytics and Meta Pixel loading. The Worker wrapper also checks the hostname and adds `X-Robots-Tag: noindex, nofollow` to Preview responses.
- `SITE_ADMIN_ENABLED=false` disables media uploads before authentication or bucket access.
- Article approval, daily cron and LINE postback flags stay false.
- The vehicle media route has no R2 fallback. Preview also declares no vehicle bucket binding.
- No `previews.r2_buckets`, `previews.hyperdrive`, production route or trigger is declared. Static assets stay top-level as required by Wrangler and are uploaded from the reviewed branch build.

Preview URLs are public by default. Read-only Dashboard inspection on 2026-10-31 verified that Preview Base metadata has exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as encrypted runtime entries and the same two build-variable names. Values were not unmasked. Preview Base has no connected bindings and no R2, Hyperdrive, service, admin or database secret. The public inventory shown by a remote Preview is therefore real public-view inventory, not the synthetic fixture used by local tests. Never add service-role keys, database credentials, production R2 or Hyperdrive bindings. Protect any non-public Preview with Cloudflare Access only after separate approval.

Cloudflare Builds currently runs `npm run build:cloudflare` and deploys branch previews with `npx wrangler preview`; `next build` alone does not create `.open-next/worker.js` and `.open-next/assets`. The reviewed Dashboard Preview Base supplies only the two public-read configuration entries above. This branch does not change either Dashboard command. `--ignore-base-config` would intentionally omit those reviewed public-read entries and is not required for this configuration.

The local test validates the built Worker wrapper with synthetic public inventory and no privileged bindings. It does not claim that a remote Preview was published or that the real ERP public endpoint enforces publication eligibility. A remote Preview has not been created from this branch and remains gated on explicit owner approval because pushing the branch automatically publishes a public, noindex URL backed by real public inventory.

## Verification and rollback

- Parse `wrangler.jsonc` and assert Preview vars/bindings are isolated.
- Build the OpenNext bundle and run the Worker locally with only Preview vars plus synthetic public inventory.
- Assert `noindex`, robots disallow, disabled admin/media writes, no Meta Pixel/analytics and no production bindings.
- Run Wrangler packaging dry-run for the production configuration and compare all top-level production settings with the base commit before review.

Rollback is a reviewed revert of the `previews` block. The branch does not modify Dashboard build commands. Do not copy production bindings into Preview as a workaround.
