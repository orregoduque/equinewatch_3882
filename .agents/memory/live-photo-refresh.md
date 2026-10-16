---
name: Live photo refresh
description: Reliability and viewing-mode decisions for automatically arriving horse photos.
---

Keep an automatic refresh baseline that works with the existing authorized
Supabase reads. Do not replace it with a Realtime-only solution without
verifying publication configuration and event delivery in the external project.

**Why:** The user requires new photos to appear without manually refreshing.
Polling matches the capture cadence and does not depend on unverified external
database configuration. Realtime can be added later, but missing events must
not silently leave the viewing screen stale.

**How to apply:** Preserve automatic refresh while actively viewing, recovery
after returning to the app or reconnecting, and cancellation on leaving or
changing account/horse. Avoid repeatedly downloading the entire photo history.

Distinguish following the newest photo from deliberately inspecting a
historical photo.

**Why:** Replacing a manually selected historical photo interrupts inspection;
automatic updates should not override that explicit selection.

**How to apply:** Follow incoming photos by default, keep the gallery current
while a historical selection stays pinned, and provide an explicit return to
the latest photo. A running video should retain its original frame sequence.
