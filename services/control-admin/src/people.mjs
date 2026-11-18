import { randomUUID, randomBytes } from "node:crypto";
import { fail, uuid } from "./store.mjs";
import { normalizedEmail, administrativeAuthClient } from "./auth.mjs";

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
    /[\u0000-\u001f]/.test(value)
  )
    fail(400, "INVALID_TEXT");
  return value.trim();
}
export class SupabaseAccountProvider {
  constructor(config, key) {
    this.client = administrativeAuthClient(config, key);
  }
  async create({ email, full_name, request_id }) {
    const { data, error } = await this.client.auth.admin.createUser({
      email,
      password: randomBytes(36).toString("base64url"),
      email_confirm: false,
      user_metadata: { full_name },
      app_metadata: { control_request_id: request_id },
    });
    if (error || !data?.user?.id) {
      const e = Error("ACCOUNT_PROVIDER_FAILED");
      e.category = [401, 403].includes(error?.status)
        ? "AUTH_REJECTED"
        : error?.status >= 400 && error?.status < 500
          ? "AUTH_VALIDATION"
          : "AUTH_UNAVAILABLE";
      throw e;
    }
    return { id: uuid(data.user.id) };
  }
}
export class StagingFixtureProvider {
  constructor(config, token) {
    this.config = config;
    this.token = token;
    if (config.ref !== "xzfwcwfmnypgcunavmlc" || !token)
      throw Error("FIXTURE_PROJECT_REQUIRED");
  }
  async create(data) {
    const response = await fetch(
      `${this.config.url}/functions/v1/control-fixture-accounts`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + this.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) {
      const e = Error("FIXTURE_PROVIDER_FAILED");
      e.category = [401, 403].includes(response.status)
        ? "AUTH_REJECTED"
        : response.status >= 500
          ? "AUTH_UNAVAILABLE"
          : "AUTH_VALIDATION";
      throw e;
    }
    const result = await response.json();
    return { id: uuid(result.id) };
  }
}
class DemoAccountProvider {
  constructor(db) {
    this.db = db;
  }
  async create({ email, request_id }) {
    const id = randomUUID();
    await this.db.raw.query(
      "INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,$2,$3)",
      [id, email, JSON.stringify({ control_request_id: request_id })],
    );
    return { id };
  }
}
export class PeopleStore {
  constructor(store, { mode = "demo", provider = null } = {}) {
    this.store = store;
    this.db = store.db;
    this.mode = mode;
    if (mode === "demo" && this.db.kind !== "isolated-postgres")
      throw Error("DEMO_REJECTS_EXTERNAL_DATABASE");
    this.provider =
      mode === "demo" ? new DemoAccountProvider(this.db) : provider;
  }
  async allowed(c) {
    await this.store.admin(c);
    const guard = (
      await c.query("SELECT * FROM se_control_v1.deployment_guard WHERE id=1")
    ).rows[0];
    if (!guard || guard.environment !== this.mode || !guard.people_enabled)
      fail(503, "PEOPLE_NOT_ENABLED");
  }
  async capabilities(actor) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      const guard = (
        await c.query("SELECT * FROM se_control_v1.deployment_guard WHERE id=1")
      ).rows[0];
      const enabled =
        guard?.environment === this.mode && guard?.people_enabled === true;
      return {
        simulation: this.mode === "demo",
        create_horses: enabled,
        create_users: enabled && !!this.provider,
        invitations_enabled: false,
        fixture_only:
          this.mode === "demo" ||
          this.provider instanceof StagingFixtureProvider,
      };
    });
  }
  async createHorse(actor, key, data) {
    fields(data, ["name", "stall_number", "owner_id"]);
    const normalized = {
      name: text(data.name),
      stall_number: text(data.stall_number),
      owner_id: uuid(data.owner_id),
    };
    return this.store.mutate(
      actor,
      key,
      "horse.create",
      normalized,
      async (c) => {
        await this.allowed(c);
        return (
          await c.query(
            "SELECT se_control_v1.create_catalog_horse($1,$2,$3,$4) AS horse",
            [
              randomUUID(),
              normalized.name,
              normalized.stall_number,
              normalized.owner_id,
            ],
          )
        ).rows[0].horse;
      },
    );
  }
  async requestUser(actor, key, data) {
    fields(data, ["email", "full_name"]);
    const normalized = {
      email: normalizedEmail(data.email),
      full_name: text(data.full_name),
    };
    if (this.mode === "demo" && !normalized.email.endsWith("@example.invalid"))
      fail(400, "DEMO_EMAIL_REQUIRED");
    if (
      this.provider instanceof StagingFixtureProvider &&
      !/^control-[a-z0-9-]+@example\.invalid$/.test(normalized.email)
    )
      fail(400, "FIXTURE_EMAIL_REQUIRED");
    return this.store.mutate(
      actor,
      key,
      "user.request",
      normalized,
      async (c) => {
        await this.allowed(c);
        const previous = (
          await c.query(
            "SELECT id,email,full_name,state,auth_user_id,error_category FROM se_control_v1.user_requests WHERE email=$1",
            [normalized.email],
          )
        ).rows[0];
        if (previous) {
          if (previous.full_name !== normalized.full_name)
            fail(409, "USER_REQUEST_EXISTS");
          return previous;
        }
        return (
          await c.query(
            "INSERT INTO se_control_v1.user_requests(id,email,full_name,created_by) VALUES($1,$2,$3,$4) RETURNING id,email,full_name,state,auth_user_id,error_category",
            [randomUUID(), normalized.email, normalized.full_name, actor],
          )
        ).rows[0];
      },
    );
  }
  async list(actor, { after = null, limit = 20 } = {}) {
    if (after) uuid(after);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      fail(400, "INVALID_PAGE");
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      const rows = (
        await c.query(
          "SELECT id,email,full_name,state,auth_user_id,attempts,error_category,created_at FROM se_control_v1.user_requests WHERE ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT $2",
          [after, limit + 1],
        )
      ).rows;
      return {
        items: rows.slice(0, limit),
        next: rows.length > limit ? rows[limit - 1].id : null,
      };
    });
  }
  async event(c, actor, operation, id, details) {
    await c.query(
      "INSERT INTO se_control_v1.audit VALUES($1,$2,$3,$4,$5,now())",
      [randomUUID(), actor, operation, id, JSON.stringify(details)],
    );
  }
  async account(c, email) {
    return (
      await c.query("SELECT se_control_v1.inspect_account($1) AS account", [
        email,
      ])
    ).rows[0].account;
  }
  async claim(actor, id) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.allowed(c);
      const request = (
        await c.query(
          "SELECT *,lease_until<=now() AS expired FROM se_control_v1.user_requests WHERE id=$1 FOR UPDATE SKIP LOCKED",
          [uuid(id)],
        )
      ).rows[0];
      if (!request) fail(409, "REQUEST_BUSY");
      if (["ready", "existing_review", "failed"].includes(request.state))
        return { terminal: request };
      if (request.state === "processing" && !request.expired)
        fail(409, "REQUEST_BUSY");
      if (request.attempts >= 3) {
        const failed = (
          await c.query(
            "UPDATE se_control_v1.user_requests SET state='failed',error_category='RETRY_LIMIT',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 RETURNING *",
            [id],
          )
        ).rows[0];
        return { terminal: failed };
      }
      const token = randomUUID();
      await c.query(
        "UPDATE se_control_v1.user_requests SET state='processing',lease_token=$2,lease_until=now()+interval '30 seconds',attempts=attempts+1,updated_at=now() WHERE id=$1",
        [id, token],
      );
      return { ...request, token };
    });
  }
  async complete(actor, request, providerError = null) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.allowed(c);
      const current = (
        await c.query(
          "SELECT * FROM se_control_v1.user_requests WHERE id=$1 AND state='processing' AND lease_token=$2 AND lease_until>now() FOR UPDATE",
          [request.id, request.token],
        )
      ).rows[0];
      if (!current) fail(409, "LEASE_LOST");
      const account = await this.account(c, current.email);
      let state,
        category = null;
      if (account?.request_id === current.id) {
        await c.query("SELECT se_control_v1.finish_new_profile($1,$2,$3)", [
          current.id,
          request.token,
          uuid(account.id),
        ]);
        state = "ready";
      } else if (account) {
        state = "existing_review";
        category = "EXISTING_ACCOUNT";
      } else {
        category = [
          "AUTH_REJECTED",
          "AUTH_VALIDATION",
          "AUTH_UNAVAILABLE",
        ].includes(providerError?.category)
          ? providerError.category
          : "AUTH_UNAVAILABLE";
        state =
          category === "AUTH_UNAVAILABLE" && current.attempts < 3
            ? "reconcile"
            : "failed";
      }
      const result = (
        await c.query(
          "UPDATE se_control_v1.user_requests SET state=$2,error_category=$3,auth_user_id=$4,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 RETURNING id,email,full_name,state,auth_user_id,error_category",
          [current.id, state, category, account?.id || null],
        )
      ).rows[0];
      await this.event(c, actor, "user.request." + state, current.id, {
        reason: "Conciliación de cuenta y perfil",
        external_account_created: state === "ready",
        invitation_sent: false,
        category,
      });
      return {
        ...result,
        invitation_sent: false,
        activation_required: state === "ready",
        simulation: this.mode === "demo",
      };
    });
  }
  async process(actor, id) {
    if (!this.provider) fail(503, "AUTH_ADMIN_NOT_CONFIGURED");
    const request = await this.claim(actor, id);
    if (request.terminal)
      return {
        id: request.terminal.id,
        state: request.terminal.state,
        auth_user_id: request.terminal.auth_user_id,
        error_category: request.terminal.error_category,
      };
    const existing = await this.db.tx(uuid(actor), async (c) => {
      await this.allowed(c);
      return this.account(c, request.email);
    });
    if (existing) return this.complete(actor, request);
    let error = null;
    try {
      await this.provider.create({
        email: request.email,
        full_name: request.full_name,
        request_id: request.id,
      });
    } catch (caught) {
      error = { category: caught.category };
    }
    return this.complete(actor, request, error);
  }
}
