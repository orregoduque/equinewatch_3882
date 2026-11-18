import { createHash, randomUUID } from "node:crypto";
export class ControlError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
export function fail(status, code) {
  throw new ControlError(status, code);
}
export function uuid(value) {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    fail(400, "INVALID_UUID");
  return value.toLowerCase();
}
function fields(data, allowed) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).some((k) => !allowed.includes(k))
  )
    fail(400, "INVALID_FIELDS");
}
function text(value, max = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(400, "INVALID_TEXT");
  return value.trim();
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, "REVISION_REQUIRED");
  return value;
}
function permissions(data) {
  if (
    typeof data.photos !== "boolean" ||
    typeof data.live !== "boolean" ||
    (!data.photos && !data.live)
  )
    fail(400, "SELECT_PERMISSION");
  let expires = null;
  if (data.expires_at) {
    const n = Date.parse(data.expires_at);
    if (!Number.isFinite(n) || n <= Date.now()) fail(400, "INVALID_EXPIRY");
    expires = new Date(n).toISOString();
  }
  return {
    photos: data.photos,
    live: data.live,
    expires_at: expires,
    reason: text(data.reason, 500),
  };
}
export class ControlStore {
  constructor(db, { simulation = false } = {}) {
    this.db = db;
    this.simulation = simulation;
  }
  async admin(c) {
    const r = await c.query("SELECT user_id FROM se_control_v1.admin_users");
    if (!r.rows.length) fail(403, "ADMIN_REQUIRED");
    if (
      !(
        await c.query("SELECT se_control_v1.current_profile_active() AS active")
      ).rows[0].active
    )
      fail(403, "INACTIVE_PROFILE");
  }
  async catalog(c) {
    return (await c.query("SELECT se_control_v1.operator_catalog() AS catalog"))
      .rows[0].catalog;
  }
  async snapshot(actor) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.admin(c);
      const result = {
        simulation: this.simulation,
        production_authority_enabled: false,
        bootstrap_limit: 100,
      };
      for (const kind of ["horses", "users"])
        result[kind] = (
          await c.query(
            "SELECT se_control_v1.operator_catalog_page($1,NULL,100,'') AS items",
            [kind],
          )
        ).rows[0].items;
      result.catalog_counts = (
        await c.query(
          "SELECT se_control_v1.operator_catalog_counts() AS counts",
        )
      ).rows[0].counts;
      for (const table of [
        "sites",
        "devices",
        "cameras",
        "bindings",
        "grants",
        "audit",
      ])
        result[table] = (
          await c.query(
            table === "bindings"
              ? "SELECT * FROM se_control_v1.bindings WHERE ends_at IS NULL AND camera_id IN(SELECT id FROM se_control_v1.cameras ORDER BY id LIMIT 100) ORDER BY id LIMIT 100"
              : `SELECT * FROM se_control_v1.${table} ORDER BY ${table === "audit" ? "created_at DESC,id" : "id"} LIMIT 100`,
          )
        ).rows;
      return result;
    });
  }
  async mutate(actor, key, operation, body, fn) {
    uuid(actor);
    if (typeof key !== "string" || !/^[a-zA-Z0-9_-]{12,100}$/.test(key))
      fail(400, "IDEMPOTENCY_KEY_REQUIRED");
    const hash = createHash("sha256")
      .update(JSON.stringify([operation, body]))
      .digest("hex");
    return this.db.tx(actor, async (c) => {
      await this.admin(c);
      const reservation = await c.query(
        "INSERT INTO se_control_v1.idempotency(actor_id,key,request_hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING key",
        [actor, key, hash],
      );
      if (!reservation.rows.length) {
        const previous = (
          await c.query(
            "SELECT request_hash,response FROM se_control_v1.idempotency WHERE actor_id=$1 AND key=$2",
            [actor, key],
          )
        ).rows[0];
        if (!previous || previous.request_hash !== hash)
          fail(409, "IDEMPOTENCY_CONFLICT");
        return previous.response;
      }
      const result = await fn(c);
      await c.query(
        "INSERT INTO se_control_v1.audit VALUES($1,$2,$3,$4,$5,now())",
        [
          randomUUID(),
          actor,
          operation,
          result.id,
          JSON.stringify({
            after: result,
            reason: body.reason || "Registro en preparación",
          }),
        ],
      );
      await c.query(
        "UPDATE se_control_v1.idempotency SET response=$3 WHERE actor_id=$1 AND key=$2",
        [actor, key, JSON.stringify(result)],
      );
      return result;
    });
  }
  async createGrant(actor, key, data) {
    fields(data, [
      "user_id",
      "horse_id",
      "photos",
      "live",
      "expires_at",
      "reason",
    ]);
    const user = uuid(data.user_id),
      horse = uuid(data.horse_id),
      p = permissions(data);
    return this.mutate(actor, key, "grant.create", data, async (c) => {
      if (
        !(
          await c.query(
            "SELECT se_control_v1.operator_identity_active('users',$1) AND se_control_v1.operator_identity_active('horses',$2) AS active",
            [user, horse],
          )
        ).rows[0].active
      )
        fail(400, "ACTIVE_IDENTITY_REQUIRED");
      const duplicate = await c.query(
        "SELECT id FROM se_control_v1.grants WHERE user_id=$1 AND horse_id=$2 AND revoked_at IS NULL",
        [user, horse],
      );
      if (duplicate.rows.length) fail(409, "GRANT_EXISTS");
      return (
        await c.query(
          "INSERT INTO se_control_v1.grants(id,user_id,horse_id,photos,live,expires_at,created_by,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
          [
            randomUUID(),
            user,
            horse,
            p.photos,
            p.live,
            p.expires_at,
            actor,
            p.reason,
          ],
        )
      ).rows[0];
    });
  }
  async updateGrant(actor, key, id, data) {
    uuid(id);
    fields(data, ["revision", "photos", "live", "expires_at", "reason"]);
    const version = revision(data.revision),
      p = permissions(data);
    return this.mutate(actor, key, "grant.update:" + id, data, async (c) => {
      const r = await c.query(
        "UPDATE se_control_v1.grants SET photos=$3,live=$4,expires_at=$5,reason=$6,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$2 AND revoked_at IS NULL RETURNING *",
        [id, version, p.photos, p.live, p.expires_at, p.reason],
      );
      if (!r.rows.length) fail(409, "STALE_REVISION");
      return r.rows[0];
    });
  }
  async revokeGrant(actor, key, id, data) {
    uuid(id);
    fields(data, ["revision", "reason"]);
    const version = revision(data.revision),
      reason = text(data.reason, 500);
    return this.mutate(actor, key, "grant.revoke:" + id, data, async (c) => {
      const r = await c.query(
        "UPDATE se_control_v1.grants SET revoked_at=now(),updated_at=now(),reason=$3,revision=revision+1 WHERE id=$1 AND revision=$2 AND revoked_at IS NULL RETURNING *",
        [id, version, reason],
      );
      if (!r.rows.length) fail(409, "STALE_REVISION");
      return r.rows[0];
    });
  }
  async createSite(actor, key, data) {
    fields(data, ["name"]);
    const name = text(data.name);
    return this.mutate(
      actor,
      key,
      "site.create",
      data,
      async (c) =>
        (
          await c.query(
            "INSERT INTO se_control_v1.sites(id,name) VALUES($1,$2) RETURNING *",
            [randomUUID(), name],
          )
        ).rows[0],
    );
  }
  async createDevice(actor, key, data) {
    fields(data, ["site_id", "name"]);
    const site = uuid(data.site_id),
      name = text(data.name);
    return this.mutate(
      actor,
      key,
      "device.prepare",
      data,
      async (c) =>
        (
          await c.query(
            "INSERT INTO se_control_v1.devices(id,site_id,name) VALUES($1,$2,$3) RETURNING *",
            [randomUUID(), site, name],
          )
        ).rows[0],
    );
  }
  async createCamera(actor, key, data) {
    fields(data, [
      "site_id",
      "device_id",
      "technical_id",
      "mac",
      "ip_address",
      "horse_id",
    ]);
    const site = uuid(data.site_id),
      device = uuid(data.device_id),
      horse = uuid(data.horse_id);
    if (!/^[a-z0-9][a-z0-9-]{2,47}$/.test(data.technical_id || ""))
      fail(400, "INVALID_CAMERA_ID");
    if (!/^([a-f0-9]{2}:){5}[a-f0-9]{2}$/.test(data.mac || ""))
      fail(400, "INVALID_MAC");
    const octets = String(data.ip_address).split(".").map(Number);
    if (
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(data.ip_address || "") ||
      octets.length !== 4 ||
      octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255) ||
      !(
        octets[0] === 10 ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      )
    )
      fail(400, "PRIVATE_IPV4_REQUIRED");
    return this.mutate(actor, key, "camera.prepare", data, async (c) => {
      if (
        !(
          await c.query(
            "SELECT se_control_v1.current_resource_active($1) AS active",
            [horse],
          )
        ).rows[0].active
      )
        fail(400, "ACTIVE_HORSE_REQUIRED");
      const camera = (
        await c.query(
          "INSERT INTO se_control_v1.cameras(id,site_id,device_id,technical_id,mac,ip_address) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
          [
            randomUUID(),
            site,
            device,
            data.technical_id,
            data.mac,
            data.ip_address,
          ],
        )
      ).rows[0];
      await c.query(
        "INSERT INTO se_control_v1.bindings(id,camera_id,horse_id) VALUES($1,$2,$3)",
        [randomUUID(), camera.id, horse],
      );
      return camera;
    });
  }
  async decision(actor, horse, action, { simulate = false } = {}) {
    uuid(actor);
    uuid(horse);
    if (!["photos", "live"].includes(action)) fail(400, "INVALID_ACTION");
    if (!simulate || !this.simulation)
      return {
        version: 1,
        horse_id: horse,
        action,
        allow: false,
        authority: "disabled",
        simulation: false,
      };
    return this.db.tx(actor, async (c) => {
      const active = (
        await c.query(
          "SELECT se_control_v1.current_profile_active() AND se_control_v1.current_resource_active($1) AS active",
          [horse],
        )
      ).rows[0].active;
      const result = active
        ? await c.query(
            `SELECT id FROM se_control_v1.grants WHERE user_id=$1 AND horse_id=$2 AND ${action}=true AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())`,
            [actor, horse],
          )
        : { rows: [] };
      return {
        version: 1,
        horse_id: horse,
        action,
        allow: result.rows.length > 0,
        authority: "simulation",
        simulation: true,
      };
    });
  }
}
