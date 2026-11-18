import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { uuid } from "../src/store.mjs";
export function planLegacy(config) {
  if (!config || !Array.isArray(config.cameras) || !config.cameras.length)
    throw Error("CAMERAS_REQUIRED");
  const cameras = new Set(),
    horses = new Set(),
    hashes = new Set(),
    grants = [];
  for (const id of config.adminUserIds || []) uuid(id);
  for (const c of config.cameras) {
    if (
      !/^[a-z0-9][a-z0-9-]{0,47}$/.test(c.id || "") ||
      cameras.has(c.id) ||
      horses.has(c.horseId) ||
      !/^[a-f0-9]{64}$/.test(c.publisherKeySha256 || "") ||
      hashes.has(c.publisherKeySha256)
    )
      throw Error("INVALID_CAMERA_OR_COLLISION");
    uuid(c.horseId);
    cameras.add(c.id);
    horses.add(c.horseId);
    hashes.add(c.publisherKeySha256);
    if (!Array.isArray(c.ownerUserIds) || !Array.isArray(c.stableOwnerUserIds))
      throw Error("EXPLICIT_GRANTS_REQUIRED");
    const users = new Set(
      [
        ...(config.adminUserIds || []),
        ...c.ownerUserIds,
        ...c.stableOwnerUserIds,
      ].map(uuid),
    );
    for (const user of users)
      grants.push({
        user_id: user,
        horse_id: c.horseId,
        camera_id: c.id,
        live: true,
        photos: false,
        panel_admin: false,
        source: "legacy-hls",
      });
  }
  return {
    version: 1,
    executable: false,
    production_authority_enabled: false,
    camera_count: cameras.size,
    live_grants: grants,
    photos_review_required: true,
    panel_admin_review_required: true,
    credentials_copied: false,
    receiver_modified: false,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [input, output] = process.argv.slice(2);
    if (
      !input ||
      !output ||
      !output.endsWith(".private.json") ||
      resolve(input) === resolve(output)
    )
      throw Error("PRIVATE_INPUT_AND_NEW_OUTPUT_REQUIRED");
    const plan = planLegacy(JSON.parse(await readFile(input, "utf8")));
    await writeFile(output, JSON.stringify(plan, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    console.log(
      JSON.stringify({
        plan_saved: true,
        cameras: plan.camera_count,
        live_grants: plan.live_grants.length,
        credentials_printed: false,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        plan_failed: true,
        type: error.constructor.name,
        credentials_printed: false,
      }),
    );
    process.exitCode = 1;
  }
}
