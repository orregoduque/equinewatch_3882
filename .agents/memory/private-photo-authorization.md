---
name: Private photo authorization
description: Why Wasabi photos require real server-verified sessions, independent of demo users and publicly readable metadata.
---

The user requires Lucero and Thunder's new private Wasabi photos without migrating other
horses, changing Raspberry services/HLS, changing ingestion policies, or changing
bucket retention, Versioning or Object Lock.

**Why:** The capture/upload pipeline is already operational. Other horses still
depend on their existing Supabase photographs, and ingestion uses policies that
must not be tightened as an incidental UI change.

**How to apply:** Keep this a read-only integration. Metadata visibility is not
photo authorization: the user confirmed an anonymous SELECT policy for the new
metadata table. Validate the actual Supabase session in the backend, check the
horse permission using trusted data, and sign only database-derived keys in the
approved scope. Demo identities and local roles never authorize private objects.
Do not change customer login or grant extra HLS access to make testing work.

Real download/access tests require credentials for a separate readonly Wasabi
identity and real permitted/denied Supabase sessions.

**Why:** SDK signatures and synthetic browser fixtures can pass without proving
an actual authorized JPEG GET or the real user's permission.

**How to apply:** Distinguish implementation/fixture validation from a verified
real GET; never claim a HEAD, mocked request, or locally stored user proved it.
Keep raw credentials and temporary URLs out of logs and persistent data.
