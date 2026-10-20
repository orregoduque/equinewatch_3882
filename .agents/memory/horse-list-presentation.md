---
name: Horse list presentation
description: Keep each horse entry limited to its photo, name and profile link.
---

In horse-list, show the horse's photo as before, its name and “Ver ficha”.
Do not restore breed, clinical status, observation age or other
details to the list cards.

**Why:** The user requested only the name and profile link, then clarified
that the horse's photo should remain as before.

**How to apply:** Keep detailed information in the horse profile, with the
timeline accessible from there. Preserve active-horse filtering and permissions.

Use the saved horses.profile_photo_url directly in cards and profile headers.
Do not transform it through getImageUrl or replace it with the latest camera
image. Missing or broken profiles show the ordinary placeholder, not a capture.

**Why:** The user clarified that camera captures and the horse's profile photo
are different, then reiterated that cards and headers must use the profile
field directly and that the camera image belongs to the live monitor.

**How to apply:** Do not query camera images from the cards or profile headers.
Never upload or overwrite a profile photo to fix its presentation. Preserve
the monitor's images and paths unchanged.

When the reported image still looks like a camera capture, inspect the actual
bytes returned by the saved profile URL before changing the UI again. A
profiles/ path alone does not prove that the object contains a separate portrait.

**Why:** A profile URL supplied during diagnosis returned the camera snapshot
itself; a controlled render used that exact URL with zero images-table queries.

**How to apply:** Distinguish the rendered URL, the stored object's content and
stale client state. Do not overwrite Storage or hardcode another image without
the user's authorization.
