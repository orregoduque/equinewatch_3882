---
name: Live camera constraints
description: User-specified hardware, camera preservation and live video startup requirements.
---

The latest hardware report supplied by the user identifies the pilot device as
a Raspberry Pi 4 Model B, 2 GB RAM, aarch64, not a Pi 5. This supersedes the
earlier Pi 5 specification. The secondary camera stream
previously advertised 640 × 480; do not assume it supports 720p. Preserve
the main stream's configuration and prioritize camera-native H.264 with
retransmission without re-encoding.

**Why:** The user supplied a hardware verification report correcting the earlier
device identification, corrected the secondary stream resolution assumption,
and asked to preserve the main stream.

**How to apply:** Inspect the real secondary URL and encoded stream before
choosing resolution or bitrate; measure keyframe intervals rather than relying
only on camera settings. The Raspberry must initiate outbound connections;
the camera must not be exposed directly to the Internet.

The startup target is at most 3 seconds from clicking “Ver vídeo” until
video frames visibly advance, including authentication and connection.
Measure delay relative to reality separately; a poster or ready event does
not count as motion. Do not assume cold on-demand publication meets this target.

**Why:** The user explicitly distinguished startup time from live latency.

**How to apply:** Test continuously prepared HLS first, count threshold
failures rather than replacing the target with an average, and begin with
functional desktop/mobile checks before a large measurement campaign.
