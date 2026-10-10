# Current Pages access and handoff

The existing authenticated Cloudflare account and Pages GitHub installation were reused for pdcar-website-preview. No new OAuth/token/access grant was created.
Preview: https://pdcar-website-preview.pages.dev/
The selected website repo is puttipong9777-bit/pdcar-website, branch migration/cloudflare-pages. Actual project is Pages Free, not Workers-hosted; build npm run build, output out, Node 22.23.3. Free limit behavior is Fail closed.
The owner authorized direct transfer of the existing Supabase URL and anonymous/public key from their open dashboard. Four Production bindings are saved encrypted outside GitHub. No values were exposed or committed, and no key rotation, DB grant/schema/data mutation was performed. See CLOUDFLARE_DEPLOYMENT.md for binding names and Wrangler precedence.
Never use service_role, Google credentials, article provider/database keys or customer data.
Preview blocks indexing and Meta tracking. No DNS/domain changes, merge, Vercel deletion, paid upgrade or ERP writes occurred.
Cloud QA passes; media HTTP 402 and unmeasured Free CPU remain blockers. Current acceptance: MIGRATION_CURRENT_STATUS.md. Source provenance: PRODUCTION_SOURCE_GAP.md.
