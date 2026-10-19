# SEO review preview configuration

This local change adds an explicit `previews.vars` configuration to `wrangler.jsonc`. Production configuration is unchanged. Preview admin, analytics, article approval, cron and LINE postbacks are disabled. No preview routes, R2, Hyperdrive, service bindings or credentials are configured. No resource is provisioned by this change.

## Required build setting before authorized publication

The owner-confirmed Preview Base build command is currently `npm run build`; change it to `npm run build:cloudflare` after approval. Keep the Preview command `npx wrangler preview` and root `/`. Installed Wrangler 4.150.0 supports that command. `next build` alone does not generate the required `.open-next/worker.js` and `.open-next/assets`. The local config change does not change dashboard build settings.

Do not substitute `wrangler deploy` or `versions upload`. A push to the production branch `codex/cloudflare-workers` runs the production deploy command. Preview builds are enabled, so pushing a review branch triggers a build and attempts preview publication even without a PR. Obtain approval before any push; draft status does not prevent this. Build/runtime usage may consume account allowances.

## Public inventory without privileged access

For a real-data SEO preview, use only the existing approved public Supabase URL and anon/publishable key, supplied separately to preview build/runtime configuration after authorization. The application reads `public_vehicle_listings`; the article reader likewise uses its existing approved public interface. No service-role key, ERP login, direct database credential or new access grant is needed. Do not include credentials in Git. Next may inline `NEXT_PUBLIC_*` values at build time, so build and runtime configuration must agree.

Without those public values, a preview can still be built and published safely with this isolation configuration: home shows its existing unavailable-inventory notice, and detail/sitemap lookups fail rather than fabricate stock. Missing values limit content completeness, not the isolation safety of this configuration. Complete inventory/canonical/sitemap acceptance therefore still needs approved public configuration or the existing local fixture tests.

No R2 binding is needed for the limited SEO review: site media falls back to bundled images, while vehicle photo URLs use the existing public HTTPS delivery path. These are production public reads and consume normal request usage; this is not a network-isolated preview. Do not test admin/media writes or attach the production R2/Hyperdrive resources. Full admin tests require separately authorized test resources.

## Runtime safeguards and limits

The current Worker wrapper sends noindex/nofollow plus robots disallow on preview hosts. Layout code suppresses Meta Pixel and visit tracking on those hosts. The explicit false flags also disable server-side mutation features; noindex alone is not a write restriction. Regression tests verify that media uploads return disabled without bucket access, analytics requests do not open a database, and missing public inventory configuration never calls Supabase.

Preview runtime Variables/Secrets and Bindings are separate from Build variables/secrets. The screenshots did not establish all runtime settings. Review existing Preview Base secrets before the first publication; never copy production privileged secrets. New Worker Previews do not inherit top-level production variables and bindings. Any deliberately shared R2/Hyperdrive resource would still share its underlying data. This file does not alter or delete existing provider-side secrets.

The installed `wrangler preview` command has no dry-run option. The standard `npm run check:cloudflare` validates packaging/configuration without publishing, but does not establish that authenticated Preview Base setup, upload or runtime networking works. Actual preview publication/HTTP checks remain approval-gated.

References: [Worker Previews configuration](https://developers.cloudflare.com/workers/previews/configuration/), [resource isolation](https://developers.cloudflare.com/workers/previews/resources/), [build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/), [OpenNext environment variables](https://opennext.js.org/cloudflare/howtos/env-vars).

## Rollback

Revert this preview-isolation commit locally and review before publishing any reversal. It changes no production vars, bindings, routes or database state. Keep preview publishing disabled operationally until a safe preview configuration is restored; reverting removes the required previews block.

## Local verification, 17 October 2026

- `npm test`: 72 passed, 0 failed (four new preview isolation tests).
- `npm run verify`: lint, typecheck and Next production build passed.
- `XDG_CONFIG_HOME=/tmp/pdcar-config WRANGLER_LOG_PATH=/tmp/pdcar-isolation-wrangler.log NEXT_TELEMETRY_DISABLED=1 SITE_ENV=preview npm run build:cloudflare`: passed.
- `XDG_CONFIG_HOME=/tmp/pdcar-config WRANGLER_LOG_PATH=/tmp/pdcar-isolation-wrangler.log npm run check:cloudflare`: passed, packaging dry-run only.
- Parsed Wrangler configuration comparison with the parent commit, excluding the added `previews` block: all production configuration unchanged.
- `git diff --check`: passed. No authenticated preview upload, provider settings change or deployment performed.
