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

Encantador/Rancho is an explicitly approved additional photo scope. Its
preparation originally had to leave Supabase active; the user subsequently
confirmed Encantador now has photo_backend = wasabi and requested Wasabi
throughout live photos, the 20-photo gallery, hour review and hourly timelapse.

**Why:** The user confirmed the source activation separately from code
preparation. Its ingest identity does not grant viewing access. This request
covers photos only, not Live video, and must not mix the old Supabase buffer.

**How to apply:** Route by the horse's database photo_backend, never its name.
Do not delete/rewrite the old history, reuse Rancho publisher credentials in
Replit, or modify Lucero's bacata-mock.
Preserve Lucero/Thunder read scopes when adding the exclusive Rancho prefix.
Raw and enhanced may refer to the same single JPEG; do not require two objects.

Real download/access tests require credentials for a separate readonly Wasabi
identity and real permitted/denied Supabase sessions.

**Why:** SDK signatures and synthetic browser fixtures can pass without proving
an actual authorized JPEG GET or the real user's permission.

**How to apply:** Distinguish implementation/fixture validation from a verified
real GET; never claim a HEAD, mocked request, or locally stored user proved it.
Keep raw credentials and temporary URLs out of logs and persistent data.

The user now confirms Tessa/Casona is active in Wasabi on node 3. Preserve it
while preparing Velvet Vitalis on the same Raspberry, separate Casona node 1.
Velvet is approved for compatibility preparation only; the user will coordinate
its uploader cutover, pending captures and backend activation later. Do not
activate Velvet, alter Casona publishers, replace reader credentials with writer
credentials, or assign existing HLS streams to either horse.

**Why:** The user requires uninterrupted existing photos before the coordinated
cutover. Both Casona migrations provide ESP32/TCP JPEG photos, not streaming.

**How to apply:** Keep Velvet on Supabase until its separately coordinated
cutover; do not revert Tessa to Supabase. Add read scope without removing existing horse grants; distinguish
simulated migration tests from actual signed GET and real viewer authorization.

