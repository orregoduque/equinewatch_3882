import { createHash, randomUUID } from "node:crypto";
import { fail, uuid } from "./store.mjs";
import { organizationPage } from "./organizations.mjs";
function fields(value, allowed) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !allowed.includes(k))
  )
    fail(400, "INVALID_FIELDS");
}
function text(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 120 ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    fail(400, "INVALID_TEXT");
  return value.trim();
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, "REVISION_REQUIRED");
  return value;
}
export class DelegatedHorseStore {
  constructor(organizations) {
    this.organizations = organizations;
    this.store = organizations.store;
    this.db = organizations.db;
  }
  async manager(c, org) {
    const scope = await this.organizations.guard(c, org);
    if (!["control_admin", "org_admin"].includes(scope.role))
      fail(403, "ORG_MANAGER_REQUIRED");
    return scope;
  }
  async capacity(actor, org) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.manager(c, org);
      return (
        await c.query(
          "SELECT se_control_v1.organization_horse_capacity($1) AS capacity",
          [uuid(org)],
        )
      ).rows[0].capacity;
    });
  }
  async setLimit(actor, key, org, data) {
    uuid(org);
    fields(data, ["horse_limit", "revision"]);
    revision(data.revision);
    if (
      !Number.isSafeInteger(data.horse_limit) ||
      data.horse_limit < 0 ||
      data.horse_limit > 100000
    )
      fail(400, "INVALID_LIMIT");
    return this.store.mutate(
      actor,
      key,
      "organization.horse-limit:" + org,
      data,
      async (c) => {
        await this.organizations.guard(c, org);
        return (
          await c.query(
            "SELECT se_control_v1.set_organization_horse_limit($1,$2,$3) AS item",
            [org, data.horse_limit, data.revision],
          )
        ).rows[0].item;
      },
    );
  }
  async owner(actor, key, org, data, id = null) {
    uuid(org);
    if (id) uuid(id);
    fields(
      data,
      id ? ["site_id", "active", "revision"] : ["user_id", "site_id"],
    );
    const site = data.site_id == null ? null : uuid(data.site_id);
    if (id) {
      revision(data.revision);
      if (typeof data.active !== "boolean") fail(400, "INVALID_FIELDS");
    } else uuid(data.user_id);
    return this.store.mutate(
      actor,
      key,
      "organization.owner:" + org + ":" + (id || "new"),
      data,
      async (c) => {
        await this.organizations.guard(c, org);
        if (
          !id &&
          !(
            await c.query(
              "SELECT se_control_v1.operator_identity_active('users',$1) AS active",
              [data.user_id],
            )
          ).rows[0].active
        )
          fail(400, "ACTIVE_IDENTITY_REQUIRED");
        const item = id
          ? (
              await c.query(
                "UPDATE se_control_v1.organization_owners SET site_id=$3,active=$4,revision=revision+1 WHERE organization_id=$1 AND id=$2 AND revision=$5 RETURNING *",
                [org, id, site, data.active, data.revision],
              )
            ).rows[0]
          : (
              await c.query(
                "INSERT INTO se_control_v1.organization_owners(id,organization_id,user_id,site_id,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",
                [randomUUID(), org, data.user_id, site, actor],
              )
            ).rows[0];
        if (!item) fail(409, "STALE_REVISION");
        return item;
      },
    );
  }
  async owners(actor, org, site, page) {
    uuid(site);
    const { after, limit, q } = organizationPage(page);
    return this.db.tx(uuid(actor), async (c) => {
      await this.manager(c, org);
      const items = (
        await c.query(
          "SELECT se_control_v1.organization_owner_page($1,$2,$3,$4,$5) AS items",
          [uuid(org), site, after, limit, q],
        )
      ).rows[0].items;
      return { items, next: items.length === limit ? items.at(-1).id : null };
    });
  }
  async ownerRecords(actor, org, page) {
    const { after, limit } = organizationPage(page);
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      await this.organizations.guard(c, org);
      const items = (
        await c.query(
          "SELECT * FROM se_control_v1.organization_owners WHERE organization_id=$1 AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT $3",
          [org, after, limit],
        )
      ).rows;
      return { items, next: items.length === limit ? items.at(-1).id : null };
    });
  }
  async create(actor, key, org, data) {
    uuid(actor);
    uuid(org);
    fields(data, ["site_id", "owner_id", "name", "stall_number"]);
    const site = uuid(data.site_id),
      owner = uuid(data.owner_id),
      horseName = text(data.name),
      stall = text(data.stall_number);
    if (typeof key !== "string" || !/^[a-zA-Z0-9_-]{12,100}$/.test(key))
      fail(400, "IDEMPOTENCY_KEY_REQUIRED");
    const hash = createHash("sha256")
      .update(JSON.stringify(["organization.horse.create", data]))
      .digest("hex");
    return this.db.tx(actor, async (c) => {
      await this.manager(c, org);
      const capacity = (
        await c.query(
          "SELECT se_control_v1.organization_horse_capacity($1) AS item",
          [org],
        )
      ).rows[0].item;
      if (!capacity?.enabled) fail(503, "PEOPLE_NOT_ENABLED");
      const inserted = await c.query(
        "INSERT INTO se_control_v1.organization_idempotency(organization_id,actor_id,key,request_hash) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING key",
        [org, actor, key, hash],
      );
      if (!inserted.rows.length) {
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
      const item = (
        await c.query(
          "SELECT se_control_v1.create_organization_horse($1,$2,$3,$4,$5,$6) AS item",
          [org, site, randomUUID(), horseName, stall, owner],
        )
      ).rows[0].item;
      await c.query(
        "UPDATE se_control_v1.organization_idempotency SET response=$4 WHERE organization_id=$1 AND actor_id=$2 AND key=$3",
        [org, actor, key, JSON.stringify(item)],
      );
      return item;
    });
  }
}
