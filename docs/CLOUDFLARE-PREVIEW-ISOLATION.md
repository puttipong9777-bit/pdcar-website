# Cloudflare Worker Preview isolation

Status: configuration and local synthetic verification only. This branch does not change production routes, bindings, credentials, database contents or DNS.

Cloudflare Worker Previews require a top-level `previews` block. Preview settings do not inherit production variables or data bindings. The branch therefore declares only read-only feature flags under `previews.vars` and intentionally omits production R2, Hyperdrive, routes and cron configuration.

## Preview behavior

- `SITE_ENV=preview` and `SITE_ANALYTICS_ENABLED=false` prevent first-party analytics and Meta Pixel loading. The Worker wrapper also checks the hostname and adds `X-Robots-Tag: noindex, nofollow` to Preview responses.
- `SITE_ADMIN_ENABLED=false` disables media uploads before authentication or bucket access.
- Article approval, daily cron and LINE postback flags stay false.
- `VEHICLE_MEDIA_LEGACY_R2_FALLBACK_ENABLED=false` prevents a Preview outage from reading any vehicle object even if a binding were accidentally introduced later.
- No `previews.r2_buckets`, `previews.hyperdrive`, production route or trigger is declared. Static assets stay top-level as required by Wrangler and are uploaded from the reviewed branch build.

Preview URLs are public by default. Without separately configured public Supabase values, the Preview shows the safe inventory-unavailable state. If public inventory is later enabled, use only the existing publishable/anonymous public-view contract; never copy service-role keys, database credentials, production R2 or Hyperdrive bindings. Protect any non-public Preview with Cloudflare Access only after separate approval.

Cloudflare Builds must run `npm run build:cloudflare` before the Preview command; `next build` alone does not create `.open-next/worker.js` and `.open-next/assets`. The safe Preview command for this repository is `npx wrangler preview --ignore-base-config`. The flag prevents an unreviewed Dashboard Preview base config from silently adding secrets or data bindings omitted by this branch. Changing that Cloudflare Builds command is a separate Dashboard action and must be approved before a branch is pushed while automatic Preview builds are enabled.

The local test validates the built Worker wrapper with synthetic public inventory and no privileged bindings. It does not claim that a remote Preview was published. A remote Preview must not be created with the existing plain `npx wrangler preview` command until the Preview base config has been reviewed or the approved `--ignore-base-config` command is active.

## Verification and rollback

- Parse `wrangler.jsonc` and assert Preview vars/bindings are isolated.
- Build the OpenNext bundle and run the Worker locally with only Preview vars plus synthetic public inventory.
- Assert `noindex`, robots disallow, disabled admin/media writes, no Meta Pixel/analytics and no production bindings.
- Run Wrangler packaging dry-run for the production configuration and compare all top-level production settings with the base commit before review.

Rollback is a reviewed revert of the `previews` block plus restoration of the previously recorded Preview-only build command. Do not switch the Dashboard Preview command back to production-style versions or copy production bindings as a workaround.
