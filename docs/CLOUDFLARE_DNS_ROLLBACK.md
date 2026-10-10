# DNS, TLS and rollback plan — READ ONLY

Current disposition: **DO NOT CUT OVER**. No actual pages.dev preview exists and
live data, images, anonymous permissions, TLS and Free CPU remain unverified.

## Read-only findings

On 2026-10-10, direct DNS A/AAAA/CNAME/NS/MX/TXT/CAA queries for pdcarcenter.com
and www.pdcarcenter.com, plus _dmarc TXT, all failed ECONNREFUSED in this cloud
network. This is NOT NXDOMAIN or proof of missing records. Export of the existing
DNS zone, current nameservers, TTLs and certificate/redirect behavior is required
before preparing exact record values. No DNS or Vercel changes performed.

## Conditional cutover after tests and explicit owner approval

1. Export all existing records and note old www target, apex target, proxy state,
   TTL, DNSSEC/DS and nameservers. Identify email provider and DKIM selectors;
   DKIM cannot be reliably enumerated from the domain alone. Preserve MX, SPF,
   DKIM, DMARC, verification TXT, SRV, CAA and unrelated subdomains verbatim.
2. Prefer retaining the current DNS provider/nameservers and moving only www.
   Cloudflare Pages supports an external-DNS subdomain CNAME. After approval,
   add www.pdcarcenter.com in the Pages project's Custom domains workflow first,
   then use the exact CNAME target supplied by that project. Never guess a target
   or point DNS at an unassociated Pages domain.
3. Lower only relevant web-record TTL in advance if approved. Wait for Pages
   domain ownership/TLS activation and inspect CAA restrictions. Validate HTTPS
   chain, hostname, expiry, redirects, 200/404, real images and no mixed content.
4. Keep canonical https://www.pdcarcenter.com. Preserve or explicitly configure an
   apex-to-www permanent redirect retaining path/query. Existing apex redirect
   service can remain where it is. Do not move the apex to Pages automatically:
   apex Pages hosting requires Cloudflare nameservers and a separate full-zone,
   email and DNSSEC migration review/approval. No such change is currently authorized.
5. After approval and verified preview, change only the reviewed www web record.
   Monitor data freshness/unpublish, CPU/errors/request allowance, media-origin
   availability, crawler HTML and domain redirects. Recheck mail records/delivery
   if any zone-level setting changed. Keep Vercel project/deployment intact.

## Rollback

Keep the original Vercel deployment and exact original DNS records. If the new
site fails, restore only approved changed web records/redirects to captured values;
allow for resolver TTL. Validate https://www.pdcarcenter.com and representative
existing Car ID/slug links and images. No database or ERP rollback is required,
because this migration changes neither. Baseline website code is
`e14a409e5643c551aab98e10b263fba1e6c1d5ba`; retained Next build can be built with
`npm run build:next` and served with `npm run start:next`, but the known-good existing
Vercel deployment is the preferred immediate fallback. Do not delete Pages or
Vercel while diagnosing; do not merge this branch as part of rollback.

Official sources checked:
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
