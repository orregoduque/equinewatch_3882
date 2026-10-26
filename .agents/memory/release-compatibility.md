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

An optional HLS pilot failure must not prevent the customer-facing app from
starting or serving its existing routes. Video must fail closed, not substitute
a demo or weaken authorization.

**Why:** The user reiterated that publication must not affect the existing
production service and its customers. Coupling core startup to optional pilot
configuration would make an unrelated video problem an app-wide outage.

**How to apply:** Isolate optional-video configuration and receiver failures in
the main app. Keep strict validation in the receiver itself; test missing and
invalid video settings as well as receiver outages against ordinary app routes.

Photo-loading optimizations must preserve the existing private-photo API
semantics for already-open customer tabs; make reduced-signature responses
opt-in rather than changing the default response.

**Why:** The user requires compatibility with the prior publication. Retaining
old JavaScript files alone is insufficient if its API contract changes beneath
it.

**How to apply:** Keep legacy metadata and ID-signing requests valid. Any cache
hint may suppress redundant signing but must never bypass authorization. Bind
preview reuse to the image metadata version, not only its ID, so a changed
object path at the same ID still becomes visible.
