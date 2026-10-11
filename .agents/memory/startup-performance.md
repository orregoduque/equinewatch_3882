---
name: Startup performance
description: Preserve lightweight startup boundaries and tree-shakable icons when extending the app.
---

Lazy route declarations alone do not guarantee a lightweight initial load.
Global error UI and forced shared vendor groups can pull dependencies used by
rarely visited pages into every visit.

**Why:** While investigating the user's slow page loads, several apparent
route-splitting changes left most of the weight in startup because a global
error helper still depended on the runtime whole-icon-library lookup.

**How to apply:** Check the emitted entry dependency graph, including HTML
module preloads, rather than assuming lazy declarations prevent eager loading.
Keep global recovery UI independent of large helpers used only inside pages.
Do not group unrelated route-specific libraries into a startup vendor bundle.

Prefer named icon imports and an explicit registry over runtime namespace
lookups into the entire icon package.

**Why:** This preserves the app's string-based icon interface while allowing
unused icons to be removed from production bundles.

**How to apply:** Register new icons explicitly and verify all names used by
conditional expressions and data-driven components, not just literal JSX
attributes. Preserve the fallback for unknown names.

Do not speed up access checks by retaining completed horse-authorization
results across later requests.

**Why:** Owners must only see their currently assigned horses; a cached
assignment can outlive a change in ownership. The performance improvement
must not weaken this product requirement.

**How to apply:** Share simultaneous reads only within the same account and
role, discard results after completion or failure, and keep later access
checks fresh. Parallelize independent data requests without removing their
authorization checks or hiding either request's errors.
