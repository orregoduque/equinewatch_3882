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

Gallery freshness follows uploaded_at, including incremental refresh boundaries,
while created_at remains the capture timestamp. Exclude rows without an enhanced
storage path; don't treat a delayed upload as an older, ignorable arrival.

**Why:** The user specified descending upload time for the restored camera gallery.
An upload can arrive after images with newer capture times.

**How to apply:** Keep query and merge ordering aligned, retain stable tie-breakers,
and preserve the explicit historical-selection and video-sequence rules above.

For strip performance, retain thumbnails after their first near-viewport visit
and defer first-time thumbnail sources until the displayed main photo loads or
fails. Keep same-account horse cards visible during background revalidation.

**Why:** Storage's no-cache responses make destroying visited images expensive;
thumbnail requests compete with the main photo. Uploads come from an external
process, so changing old objects or bucket settings cannot fix new uploads.

**How to apply:** Preserve the 240-photo live window, the two-minute video, polling,
authorization, original main/video URLs and Storage Cache-Control. Never retain
horse lists across account changes or skip fresh reads on later revisions.

The user says most Stable Eye users open it on a phone and need to inspect
earlier feeding, water and handling without having been connected then.

**Why:** A live-only window prevents those users from reviewing care earlier
in the day, even though the photos already exist.

**How to apply:** Treat 390px mobile use as the primary monitoring experience,
with finger-sized controls rather than hover-only actions. Keep retrospective
review separate from live following and bounded to the selected local hour;
do not download a full day or change the camera, JPEG, processing, profile photos
or Storage settings to implement browsing.
