# Publication compatibility checks

This app serves real customers. A clean build alone is not sufficient to check
a republish: already-open tabs can still request the previous version's lazy
JavaScript modules.

## Prepare and verify

1. Confirm the active production URL and successful deployment with the publishing
   service. The verified origin used for retaining old files is configured in
   `scripts/build-for-publish.mjs`; reverify it before a domain change.
2. Run `npm run build:publish`. This only reads public HTML and fingerprinted
   static assets from the live site; it does not publish, log in, query customer
   records, or modify Supabase.
3. Run `node --test tests/*.test.mjs`. The production-server test starts an isolated
   local process, checks deep routes, health, caching, malformed URLs, and verifies
   that the retained old files are still served.
4. Review source/configuration differences for authentication, permissions,
   database changes and the production run command before publishing.

The publishing configuration must use `npm run build:publish` as its build
command and `npm run serve` as its run command. Autoscale and port 5000 are
unchanged. Do not replace the prepared output with a later clean
`npm run build`, which removes the retained assets.

## Compatibility protections

- Login and Supabase session-storage keys are unchanged. Tests restore existing
  owner, stable-owner and admin session fixtures without signing them out.
- HTML and unversioned public files revalidate; fingerprinted assets remain
  immutable.
- Missing assets return 404 instead of the SPA's HTML.
- The published artifact contains the new build and up to two previous builds'
  static files. It does not archive customer data or previous HTML.
- If required live files cannot be copied, publication compilation fails rather
  than silently abandoning compatibility.
- No database migration or photo-processing worker is introduced by these changes.

## Limits and post-publication checks

Automated fixtures are not a real customer's authenticated session, a Supabase
RLS audit, or a production load test. Existing demo-login paths are unchanged;
their isolation from real data depends on the external database's policies and
has not been verified by these checks.

The public health endpoint confirms the web process, not Supabase or Resend
delivery. Replit may have a brief cutover interruption; do not promise zero
downtime. Tabs older than the retained generations are not covered indefinitely.

After a user-authorized publish, recheck the publishing service's build status,
`/api/health`, the root HTML and its JavaScript/CSS, the retained previous asset
URLs, and runtime logs. Verify owner/admin workflows with authorized sessions
when available; never bypass authentication or alter client records for a smoke
test.
