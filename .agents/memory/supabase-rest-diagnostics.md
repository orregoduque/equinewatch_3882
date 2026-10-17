---
name: Supabase REST diagnostics
description: The REST root is not a reliable API-key validity probe for this project's Supabase.
---

Do not diagnose an invalid Supabase key from a failure at `/rest/v1/`.
Check a known table route with `select=id&limit=0` using the configured public
key, without returning customer rows.

**Why:** Both the user's Cursor check and a direct workspace check confirmed
that the app's public key succeeds against `horses`, despite the REST root
returning `401 Invalid API key`. The earlier root-only diagnosis was wrong.

**How to apply:** Distinguish gateway errors from Postgres permission errors.
An anonymous `checks` query returned `42501 permission denied for table checks`;
this does not establish what an authenticated customer may do. Verify session,
table grants and RLS separately. Never rotate keys, weaken policies or use a
service-role key in the browser to compensate for a misleading health probe.
