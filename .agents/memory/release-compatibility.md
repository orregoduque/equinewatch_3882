---
name: Release compatibility
description: Customer continuity and the rationale for retaining previous frontend assets.
---

The user states that the app already has several customers and publication
must not damage the service.

**Why:** “ya tengo varios clientes y no puedo danar el servicio”.

**How to apply:** Treat publication compatibility as a customer-continuity
requirement. Check the current public version and protect existing sessions,
permissions, deep links and data; do not equate a successful build with proof
that real authenticated workflows or production capacity were verified.

Retaining previous fingerprinted frontend assets is intentional. Do not remove
them as unused files or replace the prepared publication artifact with a
subsequent clean development build.

**Why:** An already-open tab retains its original module URLs. Revalidating the
HTML does not help that tab until it reloads; navigating to another lazy route
can otherwise break after a republish.

**How to apply:** Preserve the publication-specific preparation and test the
actual prepared artifact. If old files cannot be retained, fail compilation
rather than silently dropping compatibility. Reverify the external production
origin when changing domains. Do not promise zero downtime or claim a database
security audit from client-side permission tests.
