---
name: Horse visibility
description: Records the owner's restricted horse visibility and supersedes the former shared-list model.
---

The user requires: “el rol owner debe solo poder ver a su caballo.”
Horse owners must only see their assigned horses, including Horse List,
Timeline selectors, photos, video, Registro history and creation, and direct
links to horse data. The user explicitly confirmed that an owner only sees and
creates checks for their own horses.

The user also explicitly requires: “quiero que el rol admin pueda ver todos los caballos.”
Admin visibility must remain unrestricted by horse ownership, including
horses assigned to other owners and horses without an owner.

**Why:** The user changed the former shared-list requirement after finding that
an owner could see other users' horses. The previous all-authenticated-users
visibility rule is superseded. The user explicitly confirmed that admins
must still see all horses.

**How to apply:** Honor the horse's stored owner association throughout the
app, not merely by hiding cards. Preserve other roles' existing access unless
the user changes their scope. Client filtering and request guards do not
replace Supabase RLS; do not claim database isolation without verifying it.

Horse detail access must use the real authenticated Supabase session and let
the existing RLS decide owner/staff visibility, rather than granting access
from a locally stored role or demo identity.

**Why:** The user explicitly confirmed that RLS already limits horse details
to the owner/staff and prohibited changing policies, credentials or data.

**How to apply:** Keep detail reads session-bound, fail closed without a valid
matching session, and use a generic unavailable state for missing or hidden
horses. Do not introduce service-role reads to make the UI work.