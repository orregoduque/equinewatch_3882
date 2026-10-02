---
name: GitHub authentication
description: Distinguishes native Git push failures from GitHub App connection failures.
---

A native Git authentication failure does not establish that the installed
GitHub App connection needs reauthorization.

**Why:** Native push failed with an invalid-token error while the authenticated
GitHub App API successfully accessed the same repository with push permission.

**How to apply:** Check the existing connection before asking the user to
reconnect. When using the authenticated API to synchronize Git objects,
preserve commit history and validate object hashes. Never force-update a
branch to work around authentication.