---
name: Daily detection summary
description: User's summary-only requirement, photo cadence, and interpretation limits.
---

The user requires: “elimina el detalle por foto, solo quiero el resumen”.
Keep `/daily-summary` focused on aggregates, including its downloadable report;
do not reintroduce a photo-by-photo list unless the user asks.

**Why:** The user explicitly replaced the proposed per-photo presentation with
a summary-only requirement.

**How to apply:** Add useful totals and human-readable estimates, not individual
analysis rows.

The user states: “cada foto se toma cada 10 segundos” and asks to calculate how
long the horse was in the stall. This cadence is a product fact, not something
to infer from the timestamp of an analysis.

**Why:** The analyzer's confidence score is not a measurement of elapsed time.
The supplied examples describe detection, confidence, threshold, and model,
not behavior or veterinary findings.

**How to apply:** Estimate observed presence from positive detections at the
stated cadence. Clearly label it an estimate, distinguish analyzed time from
full-day coverage, and never extend presence across missing photos. A failed
detection does not prove physical absence. Do not invent clinical conclusions.
