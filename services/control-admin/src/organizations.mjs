import { createHash, randomUUID } from "node:crypto";
import { fail, uuid } from "./store.mjs";

function fields(data, allowed) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).some((k) => !allowed.includes(k))
  )
    fail(400, "INVALID_FIELDS");
}
function name(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 120)
    fail(400, "INVALID_TEXT");
  return value.trim();
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, "REVISION_REQUIRED");
  return value;
}
export function organizationPage({ after = null, limit = 20, q = "" } = {}) {
  if (after) uuid(after);
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    typeof q !== "string" ||
    q.length > 120
  )
    fail(400, "INVALID_PAGE");
  return { after, limit, q: q.trim() };
}
export class OrganizationStore {
  constructor(store) {
    this.store = store;
    this.db = store.db;
  }
  async context(actor) {
    return this.db.tx(uuid(actor), async (c) => {
      const r = (
        await c.query(
          "SELECT se_control_v1.control_admin_active() AS global_admin, se_control_v1.panel_member_active() AS member",
        )
      ).rows[0];
      if (!r.member) fail(403, "PANEL_ACCESS_REQUIRED");
      return { global_admin: r.global_admin };
    });
  }
  async guard(c, id, { write = false } = {}) {
    const row = (
      await c.query(
        "SELECT id,name,state,revision,se_control_v1.organization_role(id) AS role FROM se_control_v1.organizations WHERE id=$1",
        [uuid(id)],
      )
    ).rows[0];
    // Same response for an unknown organization and one outside the actor scope.
    if (!row?.role) fail(404, "ORGANIZATION_NOT_FOUND");
    if (write && row.role === "viewer") fail(403, "ORG_WRITE_REQUIRED");
    return row;
  }
  async list(actor, page) {
    const { after, limit, q } = organizationPage(page);
    await this.context(actor);
    return this.db.tx(actor, async (c) => {
      const items = (
        await c.query(
          "SELECT id,name,state,revision,se_control_v1.organization_role(id) AS role FROM se_control_v1.organizations WHERE ($1::uuid IS NULL OR id>$1) AND strpos(lower(name),lower($2))>0 ORDER BY id LIMIT $3",
          [after, q, limit],
        )
      ).rows;
      return { items, next: items.length === limit ? items.at(-1).id : null };
    });
  }
  async create(actor, key, data) {
    fields(data, ["name"]);
    const value = name(data.name);
    return this.store.mutate(
      actor,
      key,
      "organization.create",
      data,
      async (c) =>
        (
          await c.query(
            "INSERT INTO se_control_v1.organizations(id,name,created_by) VALUES($1,$2,$3) RETURNING id,name,state,revision",
            [randomUUID(), value, actor],
          )
        ).rows[0],
    );
  }
  async update(actor, key, id, data) {
    uuid(id);
    fields(data, ["revision", "state"]);
    revision(data.revision);
    if (!["active", "suspended"].includes(data.state))
      fail(400, "INVALID_VALUE");
    return this.store.mutate(
      actor,
      key,
      "organization.update:" + id,
      data,
      async (c) => {
        const r = (
          await c.query(
            "UPDATE se_control_v1.organizations SET state=$2,revision=revision+1 WHERE id=$1 AND revision=$3 RETURNING id,name,state,revision",
            [id, data.state, data.revision],
          )
        ).rows[0];
        if (!r) fail(409, "STALE_REVISION");
        return r;
      },
    );
  }
  async member(actor, key, org, data, memberId = null) {
    uuid(org);
    if (memberId) uuid(memberId);
    fields(
      data,
      memberId
        ? ["role", "site_id", "active", "revision"]
        : ["user_id", "role", "site_id"],
    );
    if (!["org_admin", "installer", "viewer"].includes(data.role))
      fail(400, "INVALID_ROLE");
    const site = data.site_id ? uuid(data.site_id) : null;
    if (data.role === "org_admin" && site) fail(400, "INVALID_SCOPE");
    if (memberId && typeof data.active !== "boolean")
      fail(400, "INVALID_FIELDS");
    if (memberId) revision(data.revision);
    else uuid(data.user_id);
    return this.store.mutate(
      actor,
      key,
      "organization.member:" + org + ":" + (memberId || "new"),
      data,
      async (c) => {
        await this.guard(c, org);
        if (
          !memberId &&
          !(
            await c.query(
              "SELECT se_control_v1.operator_identity_active('users',$1) AS active",
              [data.user_id],
            )
          ).rows[0].active
        )
          fail(400, "ACTIVE_IDENTITY_REQUIRED");
        const r = memberId
          ? (
              await c.query(
                "UPDATE se_control_v1.organization_memberships SET role=$3,site_id=$4,active=$5,revision=revision+1 WHERE organization_id=$1 AND id=$2 AND revision=$6 RETURNING *",
                [org, memberId, data.role, site, data.active, data.revision],
              )
            ).rows[0]
          : (
              await c.query(
                "INSERT INTO se_control_v1.organization_memberships(id,organization_id,user_id,role,site_id) VALUES($1,$2,$3,$4,$5) RETURNING *",
                [randomUUID(), org, data.user_id, data.role, site],
              )
            ).rows[0];
        if (!r) fail(409, "STALE_REVISION");
        return r;
      },
    );
  }
  async assignHorse(actor, key, org, data) {
    uuid(org);
    fields(data, ["horse_id", "site_id"]);
    uuid(data.horse_id);
    uuid(data.site_id);
    return this.store.mutate(
      actor,
      key,
      "organization.horse:" + org,
      data,
      async (c) => {
        await this.guard(c, org);
        if (
          !(
            await c.query(
              "SELECT se_control_v1.operator_identity_active('horses',$1) AS active",
              [data.horse_id],
            )
          ).rows[0].active
        )
          fail(400, "ACTIVE_IDENTITY_REQUIRED");
        // Conflicting physical camera/site associations require a separate reviewed move workflow.
        if (
          (
            await c.query(
              "SELECT 1 FROM se_control_v1.bindings b JOIN se_control_v1.cameras c ON c.id=b.camera_id WHERE b.horse_id=$1 AND b.ends_at IS NULL AND c.site_id<>$2",
              [data.horse_id, data.site_id],
            )
          ).rows.length
        )
          fail(409, "HORSE_SITE_CONFLICT");
        const row = (
          await c.query(
            "INSERT INTO se_control_v1.organization_horses(horse_id,organization_id,site_id) VALUES($1,$2,$3) RETURNING *",
            [data.horse_id, org, data.site_id],
          )
        ).rows[0];
        return { ...row, id: row.horse_id };
      },
    );
  }
  async createSite(actor, key, org, data) {
    uuid(actor);
    uuid(org);
    fields(data, ["name"]);
    const value = name(data.name);
    if (typeof key !== "string" || !/^[a-zA-Z0-9_-]{12,100}$/.test(key))
      fail(400, "IDEMPOTENCY_KEY_REQUIRED");
    const hash = createHash("sha256")
      .update(JSON.stringify(["organization.site", data]))
      .digest("hex");
    return this.db.tx(actor, async (c) => {
      await this.guard(c, org, { write: true });
      const reserved = await c.query(
        "INSERT INTO se_control_v1.organization_idempotency(organization_id,actor_id,key,request_hash) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING key",
        [org, actor, key, hash],
      );
      if (!reserved.rows.length) {
        const previous = (
          await c.query(
            "SELECT request_hash,response FROM se_control_v1.organization_idempotency WHERE organization_id=$1 AND actor_id=$2 AND key=$3",
            [org, actor, key],
          )
        ).rows[0];
        if (!previous || previous.request_hash !== hash)
          fail(409, "IDEMPOTENCY_CONFLICT");
        return previous.response;
      }
      const result = (
        await c.query(
          "SELECT se_control_v1.create_organization_site($1,$2,$3) AS item",
          [org, randomUUID(), value],
        )
      ).rows[0].item;
      await c.query(
        "INSERT INTO se_control_v1.organization_events(id,organization_id,site_id,actor_id,operation,entity_id,details) VALUES($1,$2,$3,$4,$5,$3,$6)",
        [
          randomUUID(),
          org,
          result.id,
          actor,
          "site.create",
          JSON.stringify({ name: value }),
        ],
      );
      await c.query(
        "UPDATE se_control_v1.organization_idempotency SET response=$4 WHERE organization_id=$1 AND actor_id=$2 AND key=$3",
        [org, actor, key, JSON.stringify(result)],
      );
      return result;
    });
  }
  async workspace(actor, org) {
    return this.db.tx(uuid(actor), async (c) => {
      const organization = await this.guard(c, org);
      const member = (
        await c.query(
          "SELECT site_id FROM se_control_v1.organization_memberships WHERE organization_id=$1 AND user_id=$2 AND active",
          [org, actor],
        )
      ).rows[0];
      const manager = ["control_admin", "org_admin"].includes(
        organization.role,
      );
      const horseCapacity = manager
        ? (
            await c.query(
              "SELECT se_control_v1.organization_horse_capacity($1) AS item",
              [org],
            )
          ).rows[0].item
        : null;
      return {
        organization,
        horse_capacity: horseCapacity,
        capabilities: {
          create_sites:
            organization.role !== "viewer" &&
            (!member?.site_id || organization.role === "control_admin"),
          manage_members: organization.role === "control_admin",
          assign_horses: organization.role === "control_admin",
          manage_horses: manager,
          create_horses: manager && horseCapacity?.enabled === true,
        },
        production_authority_enabled: false,
      };
    });
  }
  async resources(actor, org, kind, page) {
    if (
      !["sites", "horses", "members", "devices", "cameras", "events"].includes(
        kind,
      )
    )
      fail(400, "INVALID_COLLECTION");
    const { after, limit, q } = organizationPage(page);
    return this.db.tx(uuid(actor), async (c) => {
      await this.guard(c, org);
      let items;
      if (kind === "horses")
        items = (
          await c.query(
            "SELECT se_control_v1.organization_horse_page($1,$2,$3,$4) AS items",
            [org, after, limit, q],
          )
        ).rows[0].items;
      else if (kind === "members")
        items = (
          await c.query(
            "SELECT * FROM se_control_v1.organization_memberships WHERE organization_id=$1 AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT $3",
            [org, after, limit],
          )
        ).rows;
      else if (kind === "events")
        items = (
          await c.query(
            "SELECT id,site_id,actor_id,operation,entity_id,details,created_at FROM se_control_v1.organization_events WHERE organization_id=$1 AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT $3",
            [org, after, limit],
          )
        ).rows;
      else {
        const table = kind === "sites" ? "sites" : kind;
        const column = kind === "cameras" ? "technical_id" : "name";
        items = (
          await c.query(
            `SELECT r.* FROM se_control_v1.${table} r JOIN se_control_v1.organization_sites m ON m.site_id=r.${kind === "sites" ? "id" : "site_id"} WHERE m.organization_id=$1 AND ($2::uuid IS NULL OR r.id>$2) AND strpos(lower(r.${column}),lower($3))>0 ORDER BY r.id LIMIT $4`,
            [org, after, q, limit],
          )
        ).rows;
      }
      return { items, next: items.length === limit ? items.at(-1).id : null };
    });
  }
}
