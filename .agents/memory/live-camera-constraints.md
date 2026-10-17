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

HLS MediaSource playback must remain possible after navigation from any initial
page, including login, without requiring a document reload.

**Why:** This is a single-page app: the original document's CSP remains in force
after route changes. Adding blob media permission only to direct pilot-page
responses leaves playback broken when entering through another route.

**How to apply:** Keep the shared document's media policy limited to same-origin
and blob sources; test direct entry and navigation, not just a pilot deep link.

Treat fixed-length HLS fixtures as codec/playback checks, not evidence that live
window rollover or the actual Raspberry transmission works.

**Why:** Earlier checks used an ended playlist and passed while the user still
reported slow openings and no advancing frames from the Raspberry. A synthetic
pass cannot establish readiness of the separately hosted receiver and publisher.

**How to apply:** Include a rolling, non-ended receiver-style window and repeated
open/close attempts in native and MediaSource checks. State separately whether
the authorized end-to-end Raspberry feed was actually verified.

Preload the selected horse's authorized live video when entering its timeline.
Keep preloading bounded and cancel it when the page is hidden or left; do not
broaden founder-only access. Measure startup from the actual click, not from
the beginning of preloading.

**Why:** The user expects that someone viewing a horse will probably open Live
video and explicitly requested preparation before the click to reduce waiting.

**How to apply:** Reuse the prepared player rather than fetching and authorizing
again, retain a cold-start path after expiration, and explain that preloading
uses data even if the viewer never opens the video.

The user confirmed end-to-end playback of the Raspberry's synthetic source:
changing that source video was reflected in Live video.

**Why:** This is user-verified evidence that the Raspberry → receiver → app path
works, beyond local fixtures. It does not establish which earlier failure caused
the timeout, physical IP-camera compatibility, startup time or real-world delay.

**How to apply:** Preserve this distinction when moving from the synthetic source
to the physical camera; do not present the three-second target as measured.
