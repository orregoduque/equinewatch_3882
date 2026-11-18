import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { openDemo, openProduction, DEMO_ADMIN } from "./db.mjs";
import { ControlStore, ControlError, fail, uuid } from "./store.mjs";

const assets = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
};
function equal(a, b) {
  return (
    typeof a === "string" &&
    typeof b === "string" &&
    a.length === b.length &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
async function jsonBody(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json"))
    fail(415, "JSON_REQUIRED");
  let size = 0,
    parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) fail(413, "BODY_TOO_LARGE");
    parts.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch {
    fail(400, "INVALID_JSON");
  }
}
export function createControlServer({
  store,
  mode = "demo",
  origin = "http://127.0.0.1:8899",
  verifyIdentity,
  env = {},
}) {
  if (!["demo", "staging"].includes(mode))
    throw Error("PRODUCTION_ACTIVATION_NOT_RELEASED");
  const sessions = new Map(),
    expectedHost = new URL(origin).host;
  const verify =
    verifyIdentity ||
    async function (req) {
      const header = req.headers.authorization || "";
      if (!/^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(header))
        fail(401, "SESSION_REQUIRED");
      const base = new URL(env.CONTROL_SUPABASE_URL || "");
      if (base.protocol !== "https:") fail(503, "AUTH_NOT_CONFIGURED");
      let response;
      try {
        response = await fetch(new URL("/auth/v1/user", base), {
          headers: {
            Authorization: header,
            apikey: env.CONTROL_SUPABASE_ANON_KEY,
          },
          signal: AbortSignal.timeout(5000),
          redirect: "error",
        });
      } catch {
        fail(503, "AUTH_UNAVAILABLE");
      }
      if (!response.ok)
        fail(response.status >= 500 ? 503 : 401, "SESSION_INVALID");
      const body = await response.json();
      return uuid(body.id);
    };
  function output(res, status, value) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  }
  async function identity(req, res, { bootstrap = false } = {}) {
    if (mode !== "demo") return verify(req);
    const cookie = String(req.headers.cookie || "")
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("se_control_session="))
      ?.split("=")[1];
    let session = sessions.get(cookie),
      token = cookie;
    for (const [k, v] of sessions)
      if (v.expiry < Date.now()) sessions.delete(k);
    if (!session && bootstrap) {
      token = randomBytes(24).toString("base64url");
      session = {
        csrf: randomBytes(24).toString("base64url"),
        expiry: Date.now() + 3600000,
      };
      sessions.set(token, session);
      res.setHeader(
        "Set-Cookie",
        `se_control_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`,
      );
    }
    if (!session || session.expiry < Date.now()) fail(401, "SESSION_REQUIRED");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      !equal(req.headers["x-csrf-token"], session.csrf)
    )
      fail(403, "CSRF_REQUIRED");
    return DEMO_ADMIN;
  }
  const server = createServer(async (req, res) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
      if (req.headers.host !== expectedHost) fail(403, "HOST_NOT_ALLOWED");
      if (req.headers.origin && req.headers.origin !== origin)
        fail(403, "ORIGIN_NOT_ALLOWED");
      const url = new URL(req.url, origin),
        path = url.pathname;
      if (req.method === "GET" && assets[path]) {
        const [name, type] = assets[path];
        res.writeHead(200, {
          "Content-Type": type,
          "Cache-Control": "no-store",
        });
        res.end(await readFile(new URL("../web/" + name, import.meta.url)));
        return;
      }
      if (req.method === "GET" && path === "/health") {
        output(res, 200, {
          status: "ok",
          mode,
          production_authority_enabled: false,
        });
        return;
      }
      const actor = await identity(req, res, {
        bootstrap: path === "/api/bootstrap" && req.method === "GET",
      });
      if (req.method === "GET" && path === "/api/bootstrap") {
        const snapshot = await store.snapshot(actor);
        const cookie = res.getHeader("Set-Cookie") || req.headers.cookie || "";
        const token = /se_control_session=([^;]+)/.exec(cookie)?.[1];
        output(res, 200, {
          ...snapshot,
          csrf: mode === "demo" ? sessions.get(token)?.csrf : undefined,
        });
        return;
      }
      if (req.method === "POST" && path === "/api/access/decision") {
        const data = await jsonBody(req);
        output(
          res,
          200,
          await store.decision(actor, data.horse_id, data.action),
        );
        return;
      }
      if (req.method === "POST" && path === "/api/simulate") {
        const data = await jsonBody(req);
        await store.db.tx(actor, (c) => store.admin(c));
        output(
          res,
          200,
          await store.decision(
            uuid(data.user_id),
            uuid(data.horse_id),
            data.action,
            { simulate: true },
          ),
        );
        return;
      }
      if (
        req.method === "GET" &&
        /^\/api\/cameras\/[a-f0-9-]+\/plan$/.test(path)
      ) {
        const snapshot = await store.snapshot(actor),
          id = uuid(path.split("/")[3]),
          camera = snapshot.cameras.find((c) => c.id === id);
        if (!camera) fail(404, "CAMERA_NOT_FOUND");
        output(res, 200, {
          version: 1,
          executable: false,
          production_authority_enabled: false,
          camera,
          binding: snapshot.bindings.find(
            (b) => b.camera_id === id && !b.ends_at,
          ),
          pending: [
            "Aislar una cámara nueva por vez",
            "Verificar MAC física",
            "Comprobar IP libre y persistencia",
            "Probar JPEG y H.264 sin recodificación",
            "Preparar IAM de Wasabi",
            "Preparar publicador y monitoreo",
            "Verificar antes de activar",
          ],
        });
        return;
      }
      const key = req.headers["idempotency-key"];
      let result;
      if (req.method === "POST" && path === "/api/grants")
        result = await store.createGrant(actor, key, await jsonBody(req));
      else if (req.method === "POST" && path === "/api/sites")
        result = await store.createSite(actor, key, await jsonBody(req));
      else if (req.method === "POST" && path === "/api/devices")
        result = await store.createDevice(actor, key, await jsonBody(req));
      else if (req.method === "POST" && path === "/api/cameras")
        result = await store.createCamera(actor, key, await jsonBody(req));
      else if (req.method === "PUT" && /^\/api\/grants\/[a-f0-9-]+$/.test(path))
        result = await store.updateGrant(
          actor,
          key,
          path.split("/")[3],
          await jsonBody(req),
        );
      else if (
        req.method === "POST" &&
        /^\/api\/grants\/[a-f0-9-]+\/revoke$/.test(path)
      )
        result = await store.revokeGrant(
          actor,
          key,
          path.split("/")[3],
          await jsonBody(req),
        );
      else fail(404, "NOT_FOUND");
      output(res, 200, result);
    } catch (error) {
      const status =
        error instanceof ControlError
          ? error.status
          : { 23505: 409, 23503: 400, 23514: 400, 42501: 403 }[error.code] ||
            500;
      const code =
        error instanceof ControlError
          ? error.code
          : {
              23505: "RESOURCE_CONFLICT",
              23503: "INVALID_RELATION",
              23514: "INVALID_VALUE",
              42501: "FORBIDDEN",
            }[error.code] || "INTERNAL_ERROR";
      if (status === 500)
        console.error(
          JSON.stringify({
            event: "CONTROL_ERROR",
            type: error.constructor.name,
          }),
        );
      output(res, status, { error: code });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 8000;
  server.maxConnections = 40;
  return server;
}

export async function start(env = process.env) {
  const mode = env.CONTROL_MODE || "demo",
    port = Number(env.CONTROL_PORT || 8899),
    host = env.CONTROL_HOST || "127.0.0.1";
  if (
    !["demo", "staging"].includes(mode) ||
    host !== "127.0.0.1" ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535
  )
    throw Error("ISOLATED_CONFIGURATION_REQUIRED");
  if (mode === "demo" && env.CONTROL_DATABASE_URL)
    throw Error("DEMO_REJECTS_EXTERNAL_DATABASE");
  const folder = resolve(
    fileURLToPath(new URL("../data/demo", import.meta.url)),
  );
  if (mode === "demo") await mkdir(folder, { recursive: true });
  const db =
    mode === "demo" ? await openDemo(folder) : await openProduction(env);
  const store = new ControlStore(db, { simulation: mode === "demo" }),
    server = createControlServer({
      store,
      mode,
      origin: `http://${host}:${port}`,
      env,
    });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  console.log(
    JSON.stringify({
      event: "CONTROL_READY",
      mode,
      address: `http://${host}:${port}`,
      production_authority_enabled: false,
    }),
  );
  const stop = () => {
    server.close(() => db.close().then(() => process.exit(0)));
    server.closeIdleConnections();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  start().catch((error) => {
    console.error(
      JSON.stringify({
        event: "CONTROL_START_FAILED",
        type: error.constructor.name,
      }),
    );
    process.exitCode = 1;
  });
