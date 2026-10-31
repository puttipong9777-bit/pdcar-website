# Admin and attribution architecture (approval required)

This is implementation guidance only. The current session secret, credentials, Cloudflare settings, analytics collection, and production database are unchanged.

## Admin identity and revocation

- Replace the shared password/session with named users and least-privilege roles such as inventory editor, content reviewer, and owner administrator.
- Keep authorization in server-controlled app metadata or an internal membership table; do not trust user-editable profile metadata.
- Record actor, action, target, timestamp, and outcome in an append-only audit trail without storing secrets or document contents.
- Support immediate session revocation, short expiry for sensitive actions, and a documented offboarding procedure.
- Require step-up authentication for permission, credential, publication, and destructive changes.

## Privacy-aware sales attribution

- Treat website clicks as interaction signals, not customers, appointments, or sales.
- Use short-lived first-party identifiers and an explicit conversion record only when staff records a real lead or sale under an approved purpose.
- Define retention by event class, aggregate older reporting, and delete raw identifiers after the approved window.
- Do not add ad pixels, cross-site identifiers, message contents, phone numbers, or other personal data without separate owner and privacy review.

## Edge and operational controls

- Protect admin routes with per-user authentication, rate limits, CSRF/origin checks, secure cookies, and environment-separated secrets.
- Keep previews `noindex`, tracking-disabled, and disconnected from production writes.
- Monitor readiness, authentication failures, publication changes, and feed failures without logging credentials or customer data.
- Test backup restore and role revocation in a non-production environment before changing production access.
