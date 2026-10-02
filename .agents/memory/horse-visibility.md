---
name: Horse visibility
description: Records the owner's restricted horse visibility and supersedes the former shared-list model.
---

The user requires: “el rol owner debe solo poder ver a su caballo.”
Horse owners must only see their assigned horses, including Horse List,
Timeline selectors, photos, video, and direct links to horse data.

**Why:** The user changed the former shared-list requirement after finding that
an owner could see other users' horses. The previous all-authenticated-users
visibility rule is superseded.

**How to apply:** Honor the horse's stored owner association throughout the
app, not merely by hiding cards. Preserve other roles' existing access unless
the user changes their scope. Client filtering and request guards do not
replace Supabase RLS; do not claim database isolation without verifying it.