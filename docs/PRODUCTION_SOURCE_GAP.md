# Production source recovered
The deployment hold has been resolved for source provenance. Vercel CLI deployment DaSYLUKx3KHctLaCdNQ9ZMtxKzSV contains files beyond metadata Git commit cca3ad4477c9b5c836dc16d0826ddaa27527bb30.
Recovered source snapshot: [f9722f6](https://github.com/puttipong9777-bit/pdcar-website/commit/f9722f6de2bb4f9eaa1959e91b0ca966bea06508), branch codex/vercel-production-source.
All 78 source/assets files were checked against Vercel raw-content digests. Read-only source transport used the original website directory on Windows; no Windows source edits, builds or tests were run.
Cloud [verification run](https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38049576857) passed hashes, clean install, lint, typecheck, Next build and 46 tests.
Migration now retains the recovered public showroom, sell-car, catalog, product tracking and article pages.
Original approval/cron/postback flags are false in Vercel Production. Pages preserves this disabled state. Original Node backend and tests remain for rollback/future activation review; Pages does not support the Vercel cron scheduler and will fail closed if approval is enabled accidentally.
Outstanding gates: real Pages deployment, actual public-data/media freshness, desktop/mobile preview QA and actual Free CPU metrics. No main merge, domain change, paid plan or ERP/schema changes authorized.
