// Durable planning and rehearsal only. This module has no network, SSH or cloud clients.
import { createHash, randomUUID } from "node:crypto";
import { fail, uuid } from "./store.mjs";

const GLOBAL = "00000000-0000-0000-0000-000000000000";
export const INSTALLATION_STEPS = [
  ["identity", "Confirmar caballo, propietario y equipo por UUID"],
  ["network", "Aislar cámara, verificar MAC y reservar IP"],
  ["media", "Comprobar JPEG y H.264 real sin alterar el principal"],
  ["wasabi_writer", "Preparar política del escritor de la Raspberry"],
  ["wasabi_reader", "Preparar política del lector de la app"],
  [
    "photo_ingestion",
    "Verificar metadatos, captura y subida cada diez segundos",
  ],
  ["hls_receiver", "Verificar capacidad, asociación y credencial del receptor"],
  ["publisher", "Preparar servicio exacto y búfer limitado"],
  ["end_to_end", "Probar fotos, movimiento y denegación a otro usuario"],
  ["recovery", "Comprobar recuperación de cámara, red y Raspberry"],
];
function object(value, allowed) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !allowed.includes(k))
  )
    fail(400, "INVALID_FIELDS");
}
function string(value, max = 120) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > max ||
    /[\u0000-\u001f]/.test(value)
  )
    fail(400, "INVALID_TEXT");
  return value.trim();
}
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
const hash = (value) =>
  createHash("sha256").update(canonical(value)).digest("hex");
function nodeId(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    fail(400, "INVALID_NODE_ID");
  return value;
}
function identity(value) {
  object(value, [
    "site_id",
    "horse_id",
    "technical_id",
    "mac",
    "ip_address",
    "node_id",
  ]);
  const site_id = uuid(value.site_id),
    horse_id = uuid(value.horse_id);
  if (site_id === GLOBAL || horse_id === GLOBAL) fail(400, "INVALID_UUID");
  if (!/^[a-z0-9][a-z0-9-]{2,47}$/.test(value.technical_id || ""))
    fail(400, "INVALID_CAMERA_ID");
  if (!/^([a-f0-9]{2}:){5}[a-f0-9]{2}$/.test(value.mac || ""))
    fail(400, "INVALID_MAC");
  const ip = String(value.ip_address),
    parts = ip.split(".");
  if (
    parts.length !== 4 ||
    parts.some((p) => !/^(0|[1-9][0-9]{0,2})$/.test(p) || Number(p) > 255)
  )
    fail(400, "PRIVATE_IPV4_REQUIRED");
  const [a, b] = parts.map(Number);
  if (!(
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  ))
    fail(400, "PRIVATE_IPV4_REQUIRED");
  return {
    site_id,
    horse_id,
    technical_id: value.technical_id,
    mac: value.mac,
    ip_address: ip,
    node_id: nodeId(value.node_id),
  };
}
function claims(spec) {
  return [
    ["camera_id", GLOBAL, spec.technical_id],
    ["mac", GLOBAL, spec.mac],
    ["ip", spec.site_id, spec.ip_address],
    ["horse", GLOBAL, spec.horse_id],
    ["node", spec.site_id, String(spec.node_id)],
  ];
}
function storage(data) {
  const bucket = string(data.bucket, 63);
  if (
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) ||
    ["..", ".-", "-."].some((s) => bucket.includes(s)) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(bucket)
  )
    fail(400, "INVALID_BUCKET");
  const region = string(data.wasabi_region, 32);
  if (!/^[a-z]{2}-[a-z]+-[1-9][0-9]?$/.test(region))
    fail(400, "INVALID_REGION");
  let url;
  try {
    url = new URL(data.receiver_origin);
  } catch {
    fail(400, "INVALID_RECEIVER_ORIGIN");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !url.hostname.includes(".")
  )
    fail(400, "INVALID_RECEIVER_ORIGIN");
  return { bucket, wasabi_region: region, receiver_origin: url.origin };
}
export function installationArtifacts(spec) {
  const prefix = `stable-eye/${spec.site_id}/node_${spec.node_id}/`;
  const bucketArn = `arn:aws:s3:::${spec.bucket}`;
  const list = {
    Effect: "Allow",
    Action: ["s3:ListBucket"],
    Resource: [bucketArn],
    Condition: { StringLike: { "s3:prefix": [prefix, prefix + "*"] } },
  };
  const policy = (actions) => ({
    Version: "2012-10-17",
    Statement: [
      list,
      {
        Effect: "Allow",
        Action: actions,
        Resource: [bucketArn + "/" + prefix + "*"],
      },
    ],
  });
  return {
    version: 1,
    executable: false,
    authority: "preparation",
    prefix,
    writer_policy: policy(["s3:PutObject", "s3:GetObject"]),
    reader_policy: policy(["s3:GetObject"]),
    association: {
      horse_id: spec.horse_id,
      site_id: spec.site_id,
      node_id: spec.node_id,
      camera_id: spec.technical_id,
    },
    camera: {
      expected_mac: spec.mac,
      proposed_ip: spec.ip_address,
      preserve_main_stream: true,
      live_codec: "h264",
      video_mode: "copy",
    },
    safeguards: [
      "existing_resources_remain_legacy",
      "no_credentials_in_plan",
      "no_iam_changes",
      "no_service_commands",
      "no_receiver_secret_replacement",
    ],
    required_evidence: INSTALLATION_STEPS.map(([key, label]) => ({
      key,
      label,
      state: "not_verified",
    })),
    receiver_capacity: {
      state: "not_verified",
      reference_implementation_limit: 7,
      scale_out_required: true,
    },
  };
}

export class InstallationStore {
  constructor(store) {
    this.store = store;
    this.db = store.db;
  }
  async event(c, actor, operation, id, details) {
    await c.query(
      "INSERT INTO se_control_v1.audit VALUES($1,$2,$3,$4,$5,now())",
      [randomUUID(), actor, operation, id, JSON.stringify(details)],
    );
  }
  async observe(actor, key, data) {
    object(data, ["source", "cameras"]);
    const source = string(data.source);
    if (
      !Array.isArray(data.cameras) ||
      !data.cameras.length ||
      data.cameras.length > 100
    )
      fail(400, "INVALID_INVENTORY_SIZE");
    const entries = data.cameras
      .map(identity)
      .sort((a, b) => a.technical_id.localeCompare(b.technical_id));
    const fingerprint = hash(entries);
    return this.store.mutate(
      actor,
      key,
      "inventory.observe",
      { source, cameras: entries },
      async (c) => {
        const previous = await c.query(
          "SELECT id,source,fingerprint,created_at FROM se_control_v1.inventory_observations WHERE fingerprint=$1",
          [fingerprint],
        );
        if (previous.rows.length)
          return {
            ...previous.rows[0],
            unchanged: true,
            managed_by: "legacy",
            executable: false,
          };
        const id = randomUUID();
        const record = (
          await c.query(
            "INSERT INTO se_control_v1.inventory_observations(id,source,fingerprint,entries,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,source,fingerprint,created_at",
            [id, source, fingerprint, JSON.stringify(entries), actor],
          )
        ).rows[0];
        for (const entry of entries)
          for (const [kind, scope, value] of claims(entry)) {
            const prior = (
              await c.query(
                "SELECT observation_id,plan_id FROM se_control_v1.resource_claims WHERE kind=$1 AND scope=$2 AND value=$3",
                [kind, scope, value],
              )
            ).rows[0];
            if (prior) fail(409, "INVENTORY_CONFLICT");
            await c.query(
              "INSERT INTO se_control_v1.resource_claims(kind,scope,value,observation_id) VALUES($1,$2,$3,$4)",
              [kind, scope, value, id],
            );
          }
        return {
          ...record,
          cameras: entries.length,
          managed_by: "legacy",
          executable: false,
        };
      },
    );
  }
  async createPlan(actor, key, data) {
    object(data, [
      "camera_id",
      "node_id",
      "bucket",
      "wasabi_region",
      "receiver_origin",
    ]);
    const camera = uuid(data.camera_id),
      node = nodeId(data.node_id),
      destination = storage(data);
    return this.store.mutate(
      actor,
      key,
      "installation.prepare",
      data,
      async (c) => {
        const r = (
          await c.query(
            "SELECT c.*,b.horse_id FROM se_control_v1.cameras c JOIN se_control_v1.bindings b ON b.camera_id=c.id AND b.ends_at IS NULL WHERE c.id=$1",
            [camera],
          )
        ).rows[0];
        if (!r) fail(404, "CAMERA_NOT_FOUND");
        if (
          !(
            await c.query(
              "SELECT se_control_v1.current_resource_active($1) AS active",
              [r.horse_id],
            )
          ).rows[0].active
        )
          fail(400, "ACTIVE_HORSE_REQUIRED");
        const spec = {
          version: 1,
          ...identity({
            site_id: r.site_id,
            horse_id: r.horse_id,
            technical_id: r.technical_id,
            mac: r.mac,
            ip_address: r.ip_address,
            node_id: node,
          }),
          device_id: r.device_id,
          camera_id: camera,
          ...destination,
          photo_interval_seconds: 10,
          preserve_main_stream: true,
          video_mode: "copy",
          live_codec: "h264",
        };
        const id = randomUUID();
        const plan = (
          await c.query(
            "INSERT INTO se_control_v1.installation_plans(id,camera_id,spec,spec_hash,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",
            [id, camera, JSON.stringify(spec), hash(spec), actor],
          )
        ).rows[0];
        for (const [kind, scope, value] of claims(spec)) {
          const previous = (
            await c.query(
              "SELECT observation_id,plan_id FROM se_control_v1.resource_claims WHERE kind=$1 AND scope=$2 AND value=$3",
              [kind, scope, value],
            )
          ).rows[0];
          if (previous)
            fail(
              409,
              previous.observation_id
                ? "LEGACY_RESOURCE_PROTECTED"
                : "RESOURCE_RESERVED",
            );
          await c.query(
            "INSERT INTO se_control_v1.resource_claims(kind,scope,value,plan_id) VALUES($1,$2,$3,$4)",
            [kind, scope, value, id],
          );
        }
        return plan;
      },
    );
  }
  async plan(c, id) {
    const p = (
      await c.query(
        "SELECT * FROM se_control_v1.installation_plans WHERE id=$1",
        [uuid(id)],
      )
    ).rows[0];
    if (!p) fail(404, "PLAN_NOT_FOUND");
    if (hash(p.spec) !== p.spec_hash) fail(409, "PLAN_HASH_MISMATCH");
    const current = (
      await c.query(
        "SELECT c.*,b.horse_id FROM se_control_v1.cameras c JOIN se_control_v1.bindings b ON b.camera_id=c.id AND b.ends_at IS NULL WHERE c.id=$1",
        [p.camera_id],
      )
    ).rows[0];
    if (
      !current ||
      [
        "site_id",
        "device_id",
        "technical_id",
        "mac",
        "ip_address",
        "horse_id",
      ].some((f) => current[f] !== p.spec[f])
    )
      fail(409, "PLAN_STALE");
    if (
      !(
        await c.query(
          "SELECT se_control_v1.current_resource_active($1) AS active",
          [p.spec.horse_id],
        )
      ).rows[0].active
    )
      fail(409, "PLAN_STALE");
    return p;
  }
  async detail(actor, id) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      const p = await this.plan(c, id);
      return { ...p, artifacts: installationArtifacts(p.spec) };
    });
  }
  async list(actor, type, { after = null, limit = 20, q = "" } = {}) {
    const tables = {
      grants: "grants",
      plans: "installation_plans",
      runs: "installation_runs",
      inventory: "inventory_observations",
      sites: "sites",
      devices: "devices",
      cameras: "cameras",
      horses: null,
      users: null,
    };
    if (!Object.hasOwn(tables, type)) fail(400, "INVALID_LIST");
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      typeof q !== "string" ||
      q.length > 120
    )
      fail(400, "INVALID_PAGE");
    const searchColumns = {
      sites: "name",
      devices: "name",
      cameras: "technical_id",
    };
    if (tables[type] && q && !searchColumns[type]) fail(400, "INVALID_PAGE");
    if (after) uuid(after);
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      let rows;
      if (tables[type]) {
        // Table names come only from the constant allowlist, never from request text.
        const projection =
          type === "inventory"
            ? "id,source,fingerprint,created_at,jsonb_array_length(entries) AS camera_count"
            : type === "runs"
              ? "id,plan_id,mode,state,attempts,total_claims,next_attempt_at,last_error,created_by,created_at,updated_at"
              : type === "plans"
                ? "p.*,(SELECT r.id FROM se_control_v1.installation_runs r WHERE r.plan_id=p.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) AS latest_run_id"
                : "*";
        const filter = searchColumns[type]
          ? ` AND ($3='' OR strpos(lower(${searchColumns[type]}),lower($3))>0)`
          : "";
        rows = (
          await c.query(
            `SELECT ${projection} FROM se_control_v1.${tables[type]} p WHERE ($1::uuid IS NULL OR p.id>$1)${filter} ORDER BY p.id LIMIT $2`,
            searchColumns[type] ? [after, limit + 1, q] : [after, limit + 1],
          )
        ).rows;
      } else
        rows = (
          await c.query(
            "SELECT se_control_v1.operator_catalog_page($1,$2,$3,$4) AS items",
            [type, after, limit + 1, q],
          )
        ).rows[0].items;
      const items = rows.slice(0, limit);
      return {
        items,
        next: rows.length > limit ? items.at(-1).id : null,
        limit,
      };
    });
  }
  async enqueue(actor, key, planId) {
    return this.store.mutate(
      actor,
      key,
      "installation.simulation.queue",
      { plan_id: uuid(planId) },
      async (c) => {
        const plan = await this.plan(c, planId),
          id = randomUUID();
        const run = (
          await c.query(
            "INSERT INTO se_control_v1.installation_runs(id,plan_id,created_by) VALUES($1,$2,$3) RETURNING *",
            [id, plan.id, actor],
          )
        ).rows[0];
        for (const [index, [step]] of INSTALLATION_STEPS.entries())
          await c.query(
            "INSERT INTO se_control_v1.installation_steps(run_id,ordinal,step_key) VALUES($1,$2,$3)",
            [id, index + 1, step],
          );
        return run;
      },
    );
  }
  async run(actor, id) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      const run = (
        await c.query(
          "SELECT * FROM se_control_v1.installation_runs WHERE id=$1",
          [uuid(id)],
        )
      ).rows[0];
      if (!run) fail(404, "RUN_NOT_FOUND");
      return {
        ...run,
        lease_token: undefined,
        steps: (
          await c.query(
            "SELECT ordinal,step_key,state,evidence FROM se_control_v1.installation_steps WHERE run_id=$1 ORDER BY ordinal",
            [id],
          )
        ).rows,
        executable: false,
      };
    });
  }
  async claim(actor, id) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      // FOR UPDATE + SKIP LOCKED supports multiple future workers. No daemon is installed.
      const r = (
        await c.query(
          "SELECT * FROM se_control_v1.installation_runs WHERE id=$1 FOR UPDATE SKIP LOCKED",
          [uuid(id)],
        )
      ).rows[0];
      if (!r) return null;
      if (["simulated", "failed", "cancelled"].includes(r.state)) return null;
      const expired = (
        await c.query(
          "SELECT ($1::timestamptz IS NULL OR $1::timestamptz<=now()) AS expired, $2::timestamptz<=now() AS due",
          [r.lease_until, r.next_attempt_at],
        )
      ).rows[0];
      if (!expired.expired || !expired.due) return null;
      if (r.attempts >= 3) {
        await c.query(
          "UPDATE se_control_v1.installation_runs SET state='failed',last_error='RETRY_LIMIT',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1",
          [id],
        );
        await this.event(c, actor, "installation.simulation.failed", id, {
          reason: "Límite de intentos consecutivos",
          category: "RETRY_LIMIT",
        });
        return null;
      }
      await this.plan(c, r.plan_id);
      const token = randomUUID();
      await c.query(
        "UPDATE se_control_v1.installation_runs SET state='running',lease_token=$2,lease_until=now()+interval '30 seconds',attempts=attempts+1,total_claims=total_claims+1,updated_at=now() WHERE id=$1",
        [id, token],
      );
      const step = (
        await c.query(
          "SELECT ordinal,step_key FROM se_control_v1.installation_steps WHERE run_id=$1 AND state='pending' ORDER BY ordinal LIMIT 1",
          [id],
        )
      ).rows[0];
      await this.event(c, actor, "installation.step.claimed", id, {
        step: step?.step_key,
        attempt: r.attempts + 1,
        reason: "Paso de ensayo reservado temporalmente",
      });
      return { run_id: id, plan_id: r.plan_id, token, step };
    });
  }
  async finish(actor, lease) {
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      const r = (
        await c.query(
          "SELECT * FROM se_control_v1.installation_runs WHERE id=$1 AND state='running' AND lease_token=$2 AND lease_until>now() FOR UPDATE",
          [uuid(lease.run_id), uuid(lease.token)],
        )
      ).rows[0];
      if (!r) fail(409, "LEASE_LOST");
      const plan = await this.plan(c, r.plan_id);
      // Worker chooses evidence itself; caller cannot submit successful external probes.
      const step = (
        await c.query(
          "SELECT ordinal,step_key FROM se_control_v1.installation_steps WHERE run_id=$1 AND state='pending' ORDER BY ordinal LIMIT 1",
          [r.id],
        )
      ).rows[0];
      if (
        !step ||
        step.ordinal !== lease.step?.ordinal ||
        step.step_key !== lease.step?.step_key
      )
        fail(409, "STEP_MISMATCH");
      const evidence = {
        mode: "simulation",
        external_action_performed: false,
        external_verification: "required",
        plan_hash: plan.spec_hash,
      };
      await c.query(
        "UPDATE se_control_v1.installation_steps SET state='simulated',evidence=$3 WHERE run_id=$1 AND ordinal=$2",
        [r.id, step.ordinal, JSON.stringify(evidence)],
      );
      const remaining = Number(
        (
          await c.query(
            "SELECT count(*) AS n FROM se_control_v1.installation_steps WHERE run_id=$1 AND state='pending'",
            [r.id],
          )
        ).rows[0].n,
      );
      await c.query(
        "UPDATE se_control_v1.installation_runs SET state=$2,lease_token=NULL,lease_until=NULL,attempts=0,last_error=NULL,next_attempt_at=now(),updated_at=now() WHERE id=$1",
        [r.id, remaining ? "queued" : "simulated"],
      );
      await this.event(c, actor, "installation.step.simulated", r.id, {
        step: step.step_key,
        external_action_performed: false,
        reason: "Paso simulado; verificación de campo pendiente",
      });
      return { remaining, state: remaining ? "queued" : "simulated" };
    });
  }
  async failAttempt(actor, lease, category) {
    if (
      !["TRANSIENT_UNAVAILABLE", "VALIDATION_FAILED", "AUTH_REJECTED"].includes(
        category,
      )
    )
      fail(400, "INVALID_ERROR_CATEGORY");
    return this.db.tx(uuid(actor), async (c) => {
      await this.store.admin(c);
      const r = (
        await c.query(
          "SELECT * FROM se_control_v1.installation_runs WHERE id=$1 AND lease_token=$2 AND state='running' AND lease_until>now() FOR UPDATE",
          [uuid(lease.run_id), uuid(lease.token)],
        )
      ).rows[0];
      if (!r) fail(409, "LEASE_LOST");
      const retry = category === "TRANSIENT_UNAVAILABLE" && r.attempts < 3;
      await c.query(
        "UPDATE se_control_v1.installation_runs SET state=$2,last_error=$3,lease_token=NULL,lease_until=NULL,next_attempt_at=now()+($4 * interval '1 second'),updated_at=now() WHERE id=$1",
        [r.id, retry ? "retry_wait" : "failed", category, 2 ** r.attempts],
      );
      await this.event(
        c,
        actor,
        retry
          ? "installation.simulation.retry"
          : "installation.simulation.failed",
        r.id,
        {
          reason: "Error clasificado durante ensayo",
          category,
          attempt: r.attempts,
        },
      );
      return { state: retry ? "retry_wait" : "failed", error: category };
    });
  }
  async advance(actor, id) {
    const lease = await this.claim(actor, id);
    if (lease) await this.finish(actor, lease);
    return this.run(actor, id);
  }
  async cancel(actor, key, id) {
    return this.store.mutate(
      actor,
      key,
      "installation.simulation.cancel",
      { run_id: uuid(id) },
      async (c) => {
        const run = (
          await c.query(
            "UPDATE se_control_v1.installation_runs SET state='cancelled',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 AND state IN ('queued','running','retry_wait') RETURNING *",
            [id],
          )
        ).rows[0];
        if (!run) fail(409, "RUN_TERMINAL");
        return { ...run, lease_token: undefined };
      },
    );
  }
}
