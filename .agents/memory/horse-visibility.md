---
name: Horse visibility
description: Records the intended access model for the shared horse list.
---

All authenticated users should be able to view every horse; the horse list must not filter records by owner or email.

**Why:** The product uses a shared monitoring list, and Supabase has an authenticated SELECT policy with an unconditional visibility rule.

**How to apply:** Fetch the complete horses table through the authenticated Supabase client. Keep anonymous access blocked and do not introduce client-side owner filtering.