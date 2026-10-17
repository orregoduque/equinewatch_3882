---
name: Camera pilot authorization
description: Why pilot camera access uses explicit trusted grants instead of inheriting current app role labels.
---

Do not silently migrate customer login or inherit client-side role labels when
extending the camera pilot. Treat its manually assigned real Auth identities as
provisional until the authoritative, server-controlled camera/horse permission
relationship has been verified.

**Why:** The existing application supports demonstration identities alongside
real customer sessions. Matching the interface's role label alone would either
grant video to an unverified identity or require a customer authentication change
that the camera pilot did not authorize.

**How to apply:** Verify real owner/stable/admin grants before replacing the
pilot allowlist with database-derived authorization; preserve existing customer
login behavior and never accept editable metadata as the authority.

Keep the volatile HLS receiver independently hosted rather than moving the
customer app from Autoscale or migrating the app structure to add video.

**Why:** The receiver requires a single always-on process, whereas the customer
app is already published on Autoscale. Replit artifacts share a publishing
lifecycle; separate projects allow the receiver's hosting and restarts to remain
independent of the live customer app.

**How to apply:** Prepare the receiver for a separate always-on project. Confirm
the additional hosting cost before provisioning; do not replace the main app's
publishing configuration with the receiver's configuration.
