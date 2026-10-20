---
name: Horse profile dates
description: Birth dates are calendar dates; the database remains authoritative for derived age.
---

Treat a horse's birth date as a calendar date, not a local-time timestamp.
Display it as dd/mm/yyyy without timezone shifts and show “—” when null.
Display the age returned by Supabase; do not recalculate it in the browser.

**Why:** The user confirmed that Supabase derives integer age from the birth
date and has already corrected the stored values. This feature is read-only.

**How to apply:** Preserve stored values and database authority when displaying
the profile. Never write back a browser-calculated age or birth date.
