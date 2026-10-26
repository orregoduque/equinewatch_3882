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

The user confirmed that Live video works for both Lucero and Thunder on
2026-10-26.

**Why:** This is user-observed playback, not merely a passing synthetic test.

**How to apply:** Do not continue describing Thunder as never verified to play.
This confirmation does not provide click-to-motion measurements, real-world
latency, concurrent-viewer results or long-running reliability evidence.
