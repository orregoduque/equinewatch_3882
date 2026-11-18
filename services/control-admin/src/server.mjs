import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { openDemo, openProduction, DEMO_ADMIN } from "./db.mjs";
import { ControlStore, ControlError, fail, uuid } from "./store.mjs";
import { InstallationStore } from "./installations.mjs";
import { BrowserAuth, stagingConfiguration, safeEqual } from "./auth.mjs";
import {
  PeopleStore,
  SupabaseAccountProvider,
  StagingFixtureProvider,
} from "./people.mjs";

const assets = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
};
function equal(a, b) {
  return safeEqual(a, b);
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
  browserAuth,
  peopleProvider,
  env = {},
}) {
  if (!["demo", "staging"].includes(mode))
    throw Error("PRODUCTION_ACTIVATION_NOT_RELEASED");
  const sessions = new Map(),
    expectedHost = new URL(origin).host;
  const installations = new InstallationStore(store);
  const people = new PeopleStore(store, { mode, provider: peopleProvider });
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
    if (mode !== "demo")
      return browserAuth ? browserAuth.authenticate(req) : verify(req);
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
      if (req.method === "GET" && path === "/api/auth/config") {
        output(res, 200, {
          mode,
          login_required: mode === "staging",
          mfa_required: mode === "staging",
          production_authority_enabled: false,
        });
        return;
      }
      if (
        req.method === "POST" &&
        ["/api/auth/login", "/api/auth/mfa", "/api/auth/logout"].includes(path)
      ) {
        if (mode !== "staging" || !browserAuth) fail(404, "NOT_FOUND");
        if (req.headers.origin !== origin) fail(403, "ORIGIN_NOT_ALLOWED");
        const body = await jsonBody(req);
        const result = path.endsWith("/login")
          ? await browserAuth.login(req, res, body)
          : path.endsWith("/mfa")
            ? await browserAuth.verifyMfa(req, body)
            : await browserAuth.logout(req, res);
        output(res, 200, result);
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
          csrf:
            mode === "demo"
              ? sessions.get(token)?.csrf
              : browserAuth?.csrf(req),
          mode,
          people: await people.capabilities(actor),
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
        const id = uuid(path.split("/")[3]);
        const { camera, binding } = await store.db.tx(actor, async (c) => {
          await store.admin(c);
          return {
            camera: (
              await c.query("SELECT * FROM se_control_v1.cameras WHERE id=$1", [
                id,
              ])
            ).rows[0],
            binding: (
              await c.query(
                "SELECT * FROM se_control_v1.bindings WHERE camera_id=$1 AND ends_at IS NULL",
                [id],
              )
            ).rows[0],
          };
        });
        if (!camera) fail(404, "CAMERA_NOT_FOUND");
        output(res, 200, {
          version: 1,
          executable: false,
          production_authority_enabled: false,
          camera,
          binding,
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
      if (path === "/api/people/users" && req.method === "GET") {
        output(
          res,
          200,
          await people.list(actor, {
            after: url.searchParams.get("after") || null,
            limit: url.searchParams.has("limit")
              ? Number(url.searchParams.get("limit"))
              : 20,
          }),
        );
        return;
      }
      if (path === "/api/people/users" && req.method === "POST") {
        output(
          res,
          200,
          await people.requestUser(actor, key, await jsonBody(req)),
        );
        return;
      }
      if (path === "/api/people/horses" && req.method === "POST") {
        output(
          res,
          200,
          await people.createHorse(actor, key, await jsonBody(req)),
        );
        return;
      }
      const userRun = /^\/api\/people\/users\/([a-f0-9-]+)\/process$/.exec(
        path,
      );
      if (userRun && req.method === "POST") {
        const body = await jsonBody(req);
        if (
          !body ||
          Array.isArray(body) ||
          typeof body !== "object" ||
          Object.keys(body).length
        )
          fail(400, "INVALID_FIELDS");
        output(res, 200, await people.process(actor, userRun[1]));
        return;
      }
      const collection =
        /^\/api\/installations\/(plans|runs|inventory|horses|users|sites|devices|cameras|grants)$/.exec(
          path,
        );
      if (req.method === "GET" && collection) {
        if (
          [...url.searchParams.keys()].some(
            (k) => !["after", "limit", "q"].includes(k),
          )
        )
          fail(400, "INVALID_PAGE");
        output(
          res,
          200,
          await installations.list(actor, collection[1], {
            after: url.searchParams.get("after") || null,
            limit: url.searchParams.has("limit")
              ? Number(url.searchParams.get("limit"))
              : 20,
            q: url.searchParams.get("q") || "",
          }),
        );
        return;
      }
      if (path === "/api/installations/inventory" && req.method === "POST") {
        output(
          res,
          200,
          await installations.observe(actor, key, await jsonBody(req)),
        );
        return;
      }
      if (path === "/api/installations/plans" && req.method === "POST") {
        output(
          res,
          200,
          await installations.createPlan(actor, key, await jsonBody(req)),
        );
        return;
      }
      const planRoute =
        /^\/api\/installations\/plans\/([a-f0-9-]+)(\/simulations)?$/.exec(
          path,
        );
      if (planRoute && req.method === "GET" && !planRoute[2]) {
        output(res, 200, await installations.detail(actor, planRoute[1]));
        return;
      }
      const runRoute =
        /^\/api\/installations\/runs\/([a-f0-9-]+)(\/(advance|cancel))?$/.exec(
          path,
        );
      if (runRoute && req.method === "GET" && !runRoute[2]) {
        output(res, 200, await installations.run(actor, runRoute[1]));
        return;
      }
      if (
        req.method === "POST" &&
        ((planRoute && planRoute[2]) || (runRoute && runRoute[2]))
      ) {
        const body = await jsonBody(req);
        if (
          !body ||
          Array.isArray(body) ||
          typeof body !== "object" ||
          Object.keys(body).length
        )
          fail(400, "INVALID_FIELDS");
        const value = planRoute
          ? await installations.enqueue(actor, key, planRoute[1])
          : runRoute[3] === "cancel"
            ? await installations.cancel(actor, key, runRoute[1])
            : await installations.advance(actor, runRoute[1]);
        output(res, 200, value);
        return;
      }
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
    authConfig = mode === "staging" ? stagingConfiguration(env) : null,
    origin = env.CONTROL_PUBLIC_ORIGIN || `http://${host}:${port}`;
  if (mode === "demo" && origin !== `http://${host}:${port}`)
    throw Error("DEMO_REJECTS_PUBLIC_ORIGIN");
  const browserAuth =
    mode === "staging"
      ? new BrowserAuth({
          config: authConfig,
          origin,
          authorize: (actor, sessionId) =>
            db.tx(actor, async (c) => {
              await store.admin(c);
              if (
                !(
                  await c.query(
                    "SELECT se_control_v1.current_auth_session_active($1) AS active",
                    [sessionId],
                  )
                ).rows[0].active
              )
                fail(401, "SESSION_INVALID");
            }),
        })
      : null;
  const peopleProvider =
    authConfig && env.CONTROL_SUPABASE_SECRET_KEY
      ? new SupabaseAccountProvider(authConfig, env.CONTROL_SUPABASE_SECRET_KEY)
      : authConfig && env.CONTROL_STAGING_FIXTURE_TOKEN
        ? new StagingFixtureProvider(
            authConfig,
            env.CONTROL_STAGING_FIXTURE_TOKEN,
          )
        : null;
  const server = createControlServer({
    store,
    mode,
    origin,
    browserAuth,
    peopleProvider,
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
