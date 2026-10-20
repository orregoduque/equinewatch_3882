---
name: Stored photo display
description: Distinguishes the requested Supabase enhanced variant from rejected additional effects.
---

Use the existing enhanced photos stored in Supabase for Timeline and its
slideshow, without adding further image-processing effects.

**Why:** The user rejected added enhancement experiments because the images
looked too dark and withdrew the AI-editing replacement. They subsequently
clarified that the app should use Supabase's enhanced variant, not RAW.

**How to apply:** Do not treat earlier enhancement plans as permission to add
OpenCV, gamma, brightness filters, or generative edits back into Timeline or
the slideshow. The existing enhanced variant is allowed; additional processing
requires a new explicit request. Retain the requested photo count and playback duration.

Resizing through Supabase's render endpoint is allowed for Timeline strip
thumbnails only. The large photo and slideshow must keep the original enhanced
JPEG; a failed resized thumbnail should retry that original before a placeholder.

**Why:** The requested download optimization must not reduce the quality of the
main photo or video, add image effects, or change the external uploader's Storage
cache configuration.

**How to apply:** Keep thumbnail URLs separate from full-size URLs, and preserve
the existing photo limit, slideshow duration, polling and horse authorization.