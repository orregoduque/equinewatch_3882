---
name: Multiple camera constraints
description: Operator constraints for adding Thunder without replacing Lucero or the photo pipeline.
---

Lucero's real camera must retain the legacy streaming identifier `bacata-mock`;
the name is not evidence that it still transmits a mock video.

**Why:** The user explicitly identified the active real-camera integration and
asked to retain its identifier to avoid breaking it.

**How to apply:** Never rename or replace Lucero's publisher when adding a camera.
Prepare a separate process, private credential, runtime spool and receiver
assignment for Thunder. Do not rotate the existing app-proxy credential or stop
the photo services. Photo capture/upload must not depend on video viewers.

Thunder's operator-verified video stream is H.264, 704×576, 24 fps.

**Why:** The user supplied that measurement, rather than an assumed 720p stream.

**How to apply:** Preserve the camera-native H.264 stream and use remuxing without
transcoding, retaining the existing FFmpeg timeout fix. Measure actual bitrate
and keyframe spacing on Bacatá before enabling the second publisher.

Supporting simultaneous authorized viewers is not permission to add users.

**Why:** The request requires independent concurrent streams but provides no new
Supabase user grants; the prior founder-only restriction remains in force.

**How to apply:** Preserve existing trusted receiver grants and require explicit
authorization and real UUIDs before adding other viewers. Separate real camera
acceptance from synthetic multi-camera tests; preparing a player is not evidence
that the Raspberry is publishing its stream.

The user separately authorized Casona live-video integration for Tessa and
Velvet, keeping their Wasabi photo associations and Bacatá unchanged. The
operator reports both real PoE cameras connected; this supersedes the earlier
JPEG-only camera assumption but does not prove receiver ingestion or playback.

**Why:** Photos and video are independently operated. The user requires a safe
merge of the existing receiver configuration, not replacement or new secrets.

**How to apply:** Preserve all existing grants and publisher hashes. Validate
capacity in the actual receiver project before adding both cameras; do not
increase limits or delete entries to make room. Only the operator's secure
merged config can establish Casona viewing grants. Receiver republish resets
volatile windows and needs an agreed interruption window. Confirm applied
config before starting new publishers. Never rotate the shared proxy key.

The user confirmed that the newly integrated live video works in preview after
the Casona receiver publication.

**Why:** This is user-observed playback, beyond the synthetic integration tests.

**How to apply:** Do not describe preview playback as entirely unverified.
This does not establish published-app playback, per-camera startup timings,
real-world latency, or Safari compatibility.

The user confirmed that Live video works for both Lucero and Thunder on
2026-10-26.

**Why:** This is user-observed playback, not merely a passing synthetic test.

**How to apply:** Do not continue describing Thunder as never verified to play.
This confirmation does not provide click-to-motion measurements, real-world
latency, concurrent-viewer results or long-running reliability evidence.
