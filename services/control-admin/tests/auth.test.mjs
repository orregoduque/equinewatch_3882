import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  BrowserAuth,
  stagingConfiguration,
  safeEqual,
  PRODUCTION_PROJECT,
} from "../src/auth.mjs";
import {
  openProduction,
  stagingDatabaseUrl,
  DEMO_ADMIN as ADMIN,
  DEMO_OWNER as OWNER,
} from "../src/db.mjs";
import { fail } from "../src/store.mjs";
import { totp } from "../tools/totp.mjs";
const REF = "xzfwcwfmnypgcunavmlc",
  FACTOR = "00000000-0000-4000-8000-000000000091";
function harness(options = {}) {
  let now = Date.now(),
    aal = "aal1";
  const sid = randomUUID(),
    state = {
      calls: 0,
      signedOut: 0,
      active: true,
      authDown: false,
      badPassword: false,
      revoked: false,
      ...options,
    };
  const token = () =>
    [
      "fixture",
      Buffer.from(
        JSON.stringify({
          sub: state.user || ADMIN,
          session_id: sid,
          exp: Math.floor(now / 1000) + 3600,
          aal,
        }),
      ).toString("base64url"),
      "signature-verified-by-test-double",
    ].join(".");
  const client = {
    auth: {
      signInWithPassword: async () =>
        state.badPassword
          ? { error: { status: 400 } }
          : {
              data: {
                user: { id: state.user || ADMIN },
                session: { access_token: token() },
              },
            },
      getUser: async () => {
        state.calls++;
        return state.authDown
          ? { error: { status: 503 } }
          : state.revoked
            ? { error: { status: 401 } }
            : {
                data: {
                  user: {
                    id: state.user || ADMIN,
                    user_metadata: { role: "admin" },
                  },
                },
              };
      },
      getSession: async () => ({
        data: {
          session: {
            access_token: token(),
            refresh_token: "server-only-test-refresh",
          },
        },
      }),
      signOut: async () => {
        state.signedOut++;
        return {};
      },
      mfa: {
        listFactors: async () => ({
          data: {
            totp: state.noMfa
              ? []
              : [{ id: FACTOR, status: "verified", friendly_name: "Prueba" }],
          },
        }),
        challengeAndVerify: async ({ code }) => {
          if (code !== "123456") return { error: { status: 400 } };
          aal = "aal2";
          return { data: {} };
        },
      },
    },
  };
  const manager = new BrowserAuth({
    config: {},
    origin: "https://control.example.invalid",
    clientFactory: () => client,
    now: () => now,
    authorize: async (actor, session) => {
      assert.equal(session, sid);
      if (actor !== ADMIN || !state.active) fail(403, "ADMIN_REQUIRED");
    },
  });
  const req = {
    headers: {},
    method: "POST",
    socket: { remoteAddress: "127.0.0.1" },
  };
  const headers = {};
  const res = { setHeader: (k, v) => (headers[k] = v) };
  return {
    manager,
    state,
    req,
    res,
    headers,
    advance: (ms) => (now += ms),
    credential: {
      email: "control-admin@example.invalid",
      password: "not-a-real-password",
    },
    cookie: () => headers["Set-Cookie"].split(";")[0],
  };
}
async function loggedIn(options = {}) {
  const h = harness(options);
  h.login = await h.manager.login(h.req, h.res, h.credential);
  h.req.headers.cookie = h.cookie();
  h.req.headers["x-csrf-token"] = h.login.csrf;
  return h;
}

test("configuración rechaza producción, orígenes alterados y claves secretas como públicas", async () => {
  const valid = {
    CONTROL_EXPECTED_PROJECT_REF: REF,
    CONTROL_SUPABASE_URL: `https://${REF}.supabase.co`,
    CONTROL_SUPABASE_ANON_KEY: "sb_publishable_not_a_real_key_123456",
  };
  assert.equal(stagingConfiguration(valid).ref, REF);
  for (const extra of [
    {
      CONTROL_EXPECTED_PROJECT_REF: PRODUCTION_PROJECT,
      CONTROL_SUPABASE_URL: `https://${PRODUCTION_PROJECT}.supabase.co`,
    },
    { CONTROL_SUPABASE_URL: `https://${REF}.supabase.co.evil.invalid` },
    { CONTROL_SUPABASE_URL: `https://${REF}.supabase.co/path` },
    { CONTROL_SUPABASE_URL: `https://${REF}.supabase.co?key=x` },
  ])
    assert.throws(() => stagingConfiguration({ ...valid, ...extra }));
  assert.throws(
    () =>
      stagingConfiguration({
        ...valid,
        CONTROL_SUPABASE_ANON_KEY: "sb_secret_never_use_as_public_1234567890",
      }),
    (e) => e.code === "PUBLIC_AUTH_KEY_REQUIRED",
  );
  await assert.rejects(
    openProduction({
      ...valid,
      CONTROL_EXPECTED_PROJECT_REF: PRODUCTION_PROJECT,
      CONTROL_SUPABASE_URL: `https://${PRODUCTION_PROJECT}.supabase.co`,
      CONTROL_DATABASE_URL: "invalid",
    }),
    (e) => e.code === "ISOLATED_PROJECT_REQUIRED",
  );
});
test("login entrega cookie opaca HttpOnly/Secure; nunca JWT o contraseña", async () => {
  const h = await loggedIn();
  assert.equal(h.login.authenticated, false);
  assert.equal(h.login.mfa_required, true);
  assert.match(h.headers["Set-Cookie"], /HttpOnly; SameSite=Strict/);
  assert.match(h.headers["Set-Cookie"], /Secure/);
  const output = JSON.stringify(h.login) + h.headers["Set-Cookie"];
  for (const secret of [
    "access_token",
    "refresh_token",
    "not-a-real-password",
    "server-only-test-refresh",
  ])
    assert.equal(output.includes(secret), false);
});
test("no admite metadatos admin de una cuenta sin membresía explícita", async () => {
  const h = harness({ user: OWNER });
  await assert.rejects(
    h.manager.login(h.req, h.res, h.credential),
    (e) => e.code === "ADMIN_REQUIRED",
  );
  assert.equal(h.manager.sessions.size, 0);
  assert.equal(h.state.signedOut, 1);
});
test("antes del segundo factor no hay acceso al panel", async () => {
  const h = await loggedIn();
  h.req.method = "GET";
  await assert.rejects(
    h.manager.authenticate(h.req),
    (e) => e.code === "MFA_REQUIRED",
  );
});
test("segundo factor verificado permite acceso y su código no se persiste", async () => {
  const h = await loggedIn();
  await h.manager.verifyMfa(h.req, { factor_id: FACTOR, code: "123456" });
  h.req.method = "GET";
  assert.equal(await h.manager.authenticate(h.req), ADMIN);
  assert.equal(
    JSON.stringify([...h.manager.sessions.values()]).includes("123456"),
    false,
  );
});
test("códigos erróneos y factor ajeno no abren sesión", async () => {
  const h = await loggedIn();
  await assert.rejects(
    h.manager.verifyMfa(h.req, { factor_id: FACTOR, code: "000000" }),
    (e) => e.code === "MFA_INVALID",
  );
  await assert.rejects(
    h.manager.verifyMfa(h.req, { factor_id: randomUUID(), code: "123456" }),
    (e) => e.code === "INVALID_MFA",
  );
});
test("cuenta sin autenticador queda pendiente, sin omitir MFA", async () => {
  const h = await loggedIn({ noMfa: true });
  assert.equal(h.login.mfa_enrollment_required, true);
  assert.equal(h.login.authenticated, false);
});
test("escrituras requieren CSRF aun con cookie válida", async () => {
  const h = await loggedIn();
  await h.manager.verifyMfa(h.req, { factor_id: FACTOR, code: "123456" });
  h.req.headers["x-csrf-token"] = "incorrect";
  await assert.rejects(
    h.manager.authenticate(h.req),
    (e) => e.code === "CSRF_REQUIRED",
  );
});
test("retirar administración o revocar Auth invalida una sesión ya abierta", async () => {
  const h = await loggedIn();
  await h.manager.verifyMfa(h.req, { factor_id: FACTOR, code: "123456" });
  h.req.method = "GET";
  h.state.active = false;
  await assert.rejects(
    h.manager.authenticate(h.req),
    (e) => e.code === "ADMIN_REQUIRED",
  );
  h.state.active = true;
  h.state.revoked = true;
  await assert.rejects(
    h.manager.authenticate(h.req),
    (e) => e.code === "SESSION_INVALID",
  );
});
test("caída del proveedor falla cerrado y no se confunde con credenciales inválidas", async () => {
  const h = await loggedIn();
  h.state.authDown = true;
  h.req.method = "GET";
  await assert.rejects(
    h.manager.authenticate(h.req),
    (e) => e.code === "AUTH_UNAVAILABLE",
  );
});
test("expiración y reinicio eliminan sesiones en memoria", async () => {
  const h = await loggedIn();
  h.advance(3600001);
  h.req.method = "GET";
  await assert.rejects(
    h.manager.authenticate(h.req),
    (e) => e.code === "SESSION_REQUIRED",
  );
  assert.equal(h.manager.sessions.size, 0);
  const fresh = harness();
  fresh.req.headers.cookie = h.cookie();
  await assert.rejects(
    fresh.manager.authenticate(fresh.req),
    (e) => e.code === "SESSION_REQUIRED",
  );
});
test("logout invalida cookie local incluso si el proveedor no responde", async () => {
  const h = await loggedIn();
  await h.manager.logout(h.req, h.res);
  assert.match(h.headers["Set-Cookie"], /Max-Age=0/);
  assert.equal(h.manager.sessions.size, 0);
});
test("limita intentos por IP y correo con mensaje genérico", async () => {
  const h = harness({ badPassword: true });
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      h.manager.login(h.req, h.res, h.credential),
      (e) => e.code === "LOGIN_FAILED",
    );
  await assert.rejects(
    h.manager.login(h.req, h.res, h.credential),
    (e) => e.code === "AUTH_RATE_LIMIT",
  );
  h.advance(60001);
  await assert.rejects(
    h.manager.login(h.req, h.res, h.credential),
    (e) => e.code === "LOGIN_FAILED",
  );
});
test("comparación de CSRF trata Unicode sin excepciones de longitud de bytes", () => {
  assert.equal(safeEqual("á", "a"), false);
  assert.equal(safeEqual("test", "test"), true);
});
test("generador del harness coincide con el vector público de TOTP SHA1", () => {
  assert.equal(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59000), "287082");
});
test("la conexión rechaza parámetros que desactiven TLS y destinos de otro proyecto", () => {
  const url = `postgresql://fixture.${REF}:not-real@aws-0-eu-central-2.pooler.supabase.com:5432/postgres`;
  assert.equal(stagingDatabaseUrl(url, REF), url);
  for (const invalid of [
    url + "?sslmode=no-verify",
    url + "?sslmode=require",
    url.replace(REF, PRODUCTION_PROJECT),
    url.replace("aws-0-eu-central-2.pooler.supabase.com", "127.0.0.1"),
  ])
    assert.throws(() => stagingDatabaseUrl(invalid, REF));
});
