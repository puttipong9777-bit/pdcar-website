# Production source provenance — BLOCKED

**No new deployment or production-parity claim until the exact deployed source is recovered and reconciled.** Preserve the current migration branch/PR; do not invent missing features or change ERP.

## Evidence and scope (2026-10-10)

The parent relayed the user's Vercel Production screenshots for www.pdcarcenter.com. This executor has not independently inspected those screenshots or the Vercel deployment. Reported current source is `codex/sell-car-seo` at `cca3ad4`; the screenshot history lists the following changes:

| Screenshot source | Reported date/title | Read-only repository audit |
| --- | --- | --- |
| cca3ad4 | Oct 2 — Add Facebook catalog inventory quantity | Not present locally; GitHub commit lookup in the supplied repository returns 422, no commit found |
| 1cbe6fa | Oct 2 — Add Meta catalog feed and product view | Not present locally; same GitHub 422 result |
| b9b9494 | Sep 8 — Improve sell-car acquisition and SEO | Not present locally; same GitHub 422 result |
| 6b82915 | Aug 6 — fix: render linked YouTube videos dynamically | Present as 6b82915df2f9297642ff73c63249ae6e1c110b31; confirmed ancestor of supplied baseline |

GitHub lookup for `refs/heads/codex/sell-car-seo` in `puttipong9777-bit/pdcar-website` returns 404. The supplied baseline `e14a409e5643c551aab98e10b263fba1e6c1d5ba` has 11 commits through Aug 28. Its routes are home, car detail, health and robots; no sell-car/catalog/product-view implementation corresponding to the later titles was found in the supplied source or migration. Commit titles alone do not reveal exact routes, payloads, tracking behavior or acceptance criteria.

These lookup results establish that the reported later source is unavailable in this checkout/target repository through current access. They do not establish that the commits never existed, that they belong to another particular repository, or that any branch was deleted. No wider repo search or Vercel credential access was attempted here; the parent's separate review also reported no matching accessible source.

## Effect on migration readiness

Production feature/route/SEO/catalog parity is **BLOCKED**. Prior successful builds, 15 unit tests, 6 mock browser tests, byte-identical mock screenshots and CPU comparisons validate only the supplied baseline and local fixtures. They do not prove preservation of the actual deployed www.pdcarcenter.com source. The previous main SHA is a repository baseline, not a verified production-deployment baseline. In particular, the retained Next build at that baseline is not a verified equivalent of the current deployed application.

Keep the actual existing Vercel production deployment intact. Do not deploy this migration candidate, merge, cut over DNS, invent a catalog/feed/sell-car implementation, modify ERP, or change production data/schema to compensate for missing source.

## Smallest evidence needed

Preferred: the clickable **Source/commit link from the current Production deployment serving www.pdcarcenter.com**, identifying the exact repository and full commit SHA. Include the deployment URL/ID if the link does not establish which active deployment it belongs to. A short SHA or branch name alone is insufficient to identify an inaccessible source reliably.

If that link cannot yield accessible Git source: an owner-authorized cloud source archive/export of that exact deployed revision, including source files, package lockfile and build configuration, together with its deployment ID and repository/full SHA if available. Exclude .env files, credentials and private business data. Recover through Vercel/GitHub/cloud access; do not use the user's Windows computer or ask for raw secrets in chat.

After recovery: establish the production baseline, audit its routes/API/catalog/tracking/SEO/data contracts and build settings, compare against this candidate, reconcile actual differences, then rerun regression/SSR/browser tests and measure realistic inventory CPU. Only then revisit the separate preview-access/config/network gates. No new credential or persistent-access grant is implied by this evidence request.
