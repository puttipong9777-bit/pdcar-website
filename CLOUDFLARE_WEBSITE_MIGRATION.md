# Cloudflare Pages website migration

## Status / boundaries

Work in progress; no deployment or cutover has occurred. Website repository only. ERP, Supabase schema/data, DNS, production domain, and Vercel projects are untouched. No paid resources or credentials requested/created. Baseline: `e14a409e5643c551aab98e10b263fba1e6c1d5ba`. Branch: `migration/cloudflare-pages`.

## Phase 1 — audit (2026-10-10, Codex Cloud)

PASS: clean repository checkout and `git ls-remote`; push dry-run accepted. No AGENTS.md or additional .agents skills found in checkout/workspace. Read `.ai/SYSTEM_CONTEXT.md`, `.ai/SECURITY.md`, `.ai/DATA_CONTRACT.md`, `.ai/WORKFLOWS.md`, `.ai/NEXT_STEPS.md`, README and `docs/PUBLIC-DATA-CONTRACT.md`, plus full supplied Library specification.

Routes: `/` and `/cars/[identifier]` use request-time Next rendering. `/api/health` returns JSON. `/robots.txt` allows crawling. No sitemap. Next 15.5.20 / React 19. No automated tests initially. `npm run verify` runs lint/typecheck/build.

Data: only public_vehicle_listings, currently select(*), all rows mapped. Detail matches exact Car ID or slug. Preserve allowed field contract including vertical_video. Bundled SQL drops/recreates public view and omits vertical_video; NEVER run this SQL in this migration. Production publication filtering remains the existing view's responsibility.

Environment names: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ERP_URL, NEXT_PUBLIC_SHOP_PHONE, NEXT_PUBLIC_LINE_URL. No production values available in cloud process or checkout. Never introduce service role or ERP credentials.

Images: next/image in homepage/header/cards/stories/detail. Photos formed exclusively as ERP `/api/public/vehicle-images/{encoded fileId}`. Existing map retains array order. Layout uses fill containers and CSS aspect ratios. ERP remains a Vercel bandwidth/runtime dependency after website migration. Current metadataBase points at old Vercel website; detail metadata inherits generic shop social image.

BLOCKED: real ERP/media availability: cloud curl to public media probe failed at outbound proxy CONNECT with HTTP 403, before reaching ERP; browser web fetch also inaccessible. This is not evidence of ERP pause or origin HTTP status. No valid public file ID available yet, so a real image success has NOT been tested. Moving the website alone cannot repair an unavailable ERP image origin.

## Architecture evaluation (before implementation)

- Next static export + generateStaticParams: built car routes/metadata become stale; new slugs require rebuild. No authorized ERP webhook change or existing deploy hook available. Does not satisfy immediate new-car URLs by itself.
- Static shell + browser-only reads: live visible data possible, but initial HTML/social metadata absent and deep routes require fallback; unacceptable SEO regression.
- Native Pages Functions with static assets and existing React presentation: selected for implementation/validation. Request-time public-view reads and HTML/social rendering preserve new URLs without rebuild, no data cache, status/unpublish visible on next navigation/refresh. Idle open tabs remain snapshots, matching baseline. No Next server adapter or Workers hosting.

Tradeoff: dynamic HTML consumes Pages Functions free request/CPU quota and Supabase reads; uncached reads add upstream latency, but avoid cache-delayed unpublishing. Static JS/CSS/images remain CDN assets. Full React SSR CPU must be measured locally and validated on actual Free preview before production approval. Existing JSX/CSS will be reused, replacing only Next runtime wrappers and request routing.

Official sources checked 2026-10-10:
- https://developers.cloudflare.com/pages/framework-guides/nextjs/ (Pages static export; full-stack recommendation is Workers, outside this authorization)
- https://nextjs.org/docs/15/app/guides/static-exports (unsupported dynamic features)
- https://developers.cloudflare.com/pages/functions/advanced-mode/ (native Pages `_worker.js` and ASSETS binding; filename does not mean Workers hosting)
- https://developers.cloudflare.com/pages/functions/pricing/

## Phase ledger

1. Audit recorded; dependency installation running. All runtime/build/browser/live checks pending.
2–8. Pending. No preview URL exists.
