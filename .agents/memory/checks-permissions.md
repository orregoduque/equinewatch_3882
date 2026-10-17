---
name: Registro authorization contract
description: User-confirmed database rules for checks ownership, staff exceptions and automatic authorship.
---

The user confirmed that checks ownership is based on the horse's
`owner_id = auth.uid()`, not the check's author. Owners can read every check
for their own horses, including entries created by someone else. Active
admin/caretaker profiles have a database-level all-horse exception; this is
not permission to expand the application's role model or Live video access.

**Why:** The user supplied a read-only database review confirming authenticated
grants, forced RLS, owner restrictions and the active-staff exception.

**How to apply:** Retain horse-scoped queries and use the real authenticated
session. Anonymous denial is intentional. Do not filter an owner's history by
check author or weaken RLS to accommodate legacy profile/ownership mismatches.
The database review was relayed by the user, not independently tested here
with signed-in customer sessions.

Omit author, identity and timestamps from creation payloads; the database
supplies them. Author must match the authenticated user. Timestamp immutability
on update does not imply timestamps cannot be overridden on insert.

**Why:** The user confirmed auth-based author and time defaults, an INSERT
authorship check, and an UPDATE-only trigger preserving author/creation time.

**How to apply:** Do not add editable author/timestamp fields or infer stronger
database guarantees than the confirmed policies provide. Existing database
UPDATE/DELETE grants are not a request to add editing/deletion to Registro.
