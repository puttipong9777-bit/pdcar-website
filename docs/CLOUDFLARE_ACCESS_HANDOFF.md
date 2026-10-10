# Access/setup handoff (no credentials included)

All work runs in Codex Cloud `/workspace/pdcar-website`; never on the owner's Windows computer.

## Destinations requiring cloud egress

- `https://api.cloudflare.com:443` — Pages account/project/preview deployment API;
  currently outbound CONNECT denied 403 before any authenticated request.
- `https://pdcar-platform.vercel.app:443` — read-only ERP/public image availability;
  currently outbound CONNECT denied 403, not an origin health verdict.
- `https://www.pdcarcenter.com:443` and `https://pdcarcenter.com:443` — read-only
  current-site HTTPS/redirect baseline.
- Existing Supabase project HTTPS hostname (must come from approved current
  NEXT_PUBLIC_SUPABASE_URL; not known here) — public PostgREST only.
- Actual project `*.pages.dev` preview hostname after creation — browser QA/HTTPS.
- Working recursive DNS resolution for read-only zone checks; current resolver
  returns ECONNREFUSED. Alternatively approve a specific HTTPS DNS resolver.
- `https://github.com:443` Git transport and `https://api.github.com:443` GitHub API
  if executor credential access is restored. Connected GitHub app remains available.

Do not bypass network policy using alternate tunnels/proxies or disable TLS checks.
Package registry access works; external YouTube playback still requires normal
YouTube/no-cookie access when performing the final live test.

## Secure owner action

No raw credentials in chat or Git. Owner approves the Cloudflare Pages GitHub
integration scoped to this website repository only, or authorizes a suitable
existing scoped Pages deployment credential/account in the Codex Cloud secret
setup. A login/OAuth or new token/persistent grant requires explicit approval.
No login, OAuth, new token or integration was performed by this task.

Use existing Supabase project values as Pages preview runtime configuration:
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ERP_URL,
NEXT_PUBLIC_SHOP_PHONE, NEXT_PUBLIC_LINE_URL. Only anonymous/public Supabase key,
never service_role, Google credentials or business data. These names are enough
for setup; values should be transferred through approved secret/settings UI.

Owner must verify account Free plan, Pages project identity and no paid bindings.
No DNS/main-domain association, ERP access expansion, Vercel deletion or merge.
Actual preview URL and Free CPU metrics must then be recorded and tested.
