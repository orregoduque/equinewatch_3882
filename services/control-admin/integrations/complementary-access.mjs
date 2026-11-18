// Server-only adapter. Importing this module changes no existing behavior.
// First release cannot enforce; real migrations require a separately reviewed release.
export function createComplementaryAccess({
  mode = "off",
  evaluate,
  observe = () => {},
} = {}) {
  if (!["off", "shadow"].includes(mode))
    throw Error("ENFORCEMENT_NOT_RELEASED");
  function emit(event) {
    try {
      Promise.resolve(observe(event)).catch(() => {});
    } catch {}
  }
  return async function check({ horseId, action, legacyDecision, context }) {
    const previous = await legacyDecision();
    if (mode === "off") return previous; // No network or registry dependency when off.
    let timer;
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => evaluate({ horseId, action, context })),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("SHADOW_TIMEOUT")), 1500);
        }),
      ]);
      emit({
        horseId,
        action,
        legacyAllowed: Boolean(previous),
        proposedAllowed: result?.allow === true,
        applied: false,
      });
    } catch {
      emit({ horseId, action, shadowUnavailable: true, applied: false });
    } finally {
      clearTimeout(timer);
    }
    return previous; // Shadow failure never changes a production permission.
  };
}
