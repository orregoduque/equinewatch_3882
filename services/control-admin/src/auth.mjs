import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fail, uuid } from "./store.mjs";

export const PRODUCTION_PROJECT = "zmxppbpywizdjlhstfkf";
export function stagingConfiguration(env) {
  let url;
  try {
    url = new URL(env.CONTROL_SUPABASE_URL);
  } catch {
    fail(503, "AUTH_NOT_CONFIGURED");
  }
  const ref = env.CONTROL_EXPECTED_PROJECT_REF;
  if (
    !/^[a-z]{20}$/.test(ref || "") ||
    ref === PRODUCTION_PROJECT ||
    url.origin !== `https://${ref}.supabase.co` ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    typeof env.CONTROL_SUPABASE_ANON_KEY !== "string" ||
    env.CONTROL_SUPABASE_ANON_KEY.length < 20
  )
    fail(503, "ISOLATED_PROJECT_REQUIRED");
  const key = env.CONTROL_SUPABASE_ANON_KEY;
  if (!key.startsWith("sb_publishable_")) {
    try {
      if (
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role !== "anon"
      )
        throw Error();
    } catch {
      fail(503, "PUBLIC_AUTH_KEY_REQUIRED");
    }
  }
  return { ref, url: url.origin, publicKey: env.CONTROL_SUPABASE_ANON_KEY };
}
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
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
export function normalizedEmail(value) {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )
    fail(400, "INVALID_EMAIL");
  return value.trim().toLowerCase();
}
const sdkOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (input, options = {}) =>
      fetch(input, {
        ...options,
        redirect: "error",
        signal: options.signal
          ? AbortSignal.any([options.signal, AbortSignal.timeout(8000)])
          : AbortSignal.timeout(8000),
      }),
  },
};
export function publicAuthClient(config) {
  return createClient(config.url, config.publicKey, sdkOptions);
}
export function administrativeAuthClient(config, key) {
  if (typeof key !== "string" || key.length < 30)
    fail(503, "AUTH_ADMIN_NOT_CONFIGURED");
  return createClient(config.url, key, sdkOptions);
}
function verifiedClaims(token, user, now) {
  try {
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    if (
      claims.sub !== user ||
      !Number.isFinite(claims.exp) ||
      claims.exp * 1000 <= now
    )
      throw Error();
    return claims;
  } catch {
    fail(401, "SESSION_INVALID");
  }
}
export class BrowserAuth {
  constructor({
    config,
    authorize,
    origin,
    clientFactory = publicAuthClient,
    now = () => Date.now(),
    requireMfa = true,
  }) {
    this.config = config;
    this.authorize = authorize;
    this.origin = origin;
    this.factory = clientFactory;
    this.now = now;
    this.requireMfa = requireMfa;
    this.sessions = new Map();
    this.attempts = new Map();
    this.cookieName = "se_control_auth";
    const url = new URL(origin);
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && url.hostname === "127.0.0.1")
    )
      throw Error("HTTPS_REQUIRED");
  }
  prune() {
    for (const [key, s] of this.sessions)
      if (s.expires <= this.now()) this.sessions.delete(key);
    for (const [key, a] of this.attempts)
      if (a.until <= this.now()) this.attempts.delete(key);
  }
  rate(key) {
    this.prune();
    const digest = createHash("sha256").update(key).digest("hex");
    if (!this.attempts.has(digest) && this.attempts.size >= 2000)
      fail(429, "AUTH_RATE_LIMIT");
    const a = this.attempts.get(digest) || {
      count: 0,
      until: this.now() + 60000,
    };
    this.attempts.set(digest, a);
    if (++a.count > 5) fail(429, "AUTH_RATE_LIMIT");
  }
  writeCookie(res, token, maxAge = 3600) {
    res.setHeader(
      "Set-Cookie",
      `${this.cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${this.origin.startsWith("https:") ? "; Secure" : ""}`,
    );
  }
  session(req) {
    this.prune();
    const cookie = String(req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(this.cookieName + "="))
      ?.slice(this.cookieName.length + 1);
    const session = this.sessions.get(cookie);
    if (!session) fail(401, "SESSION_REQUIRED");
    return { cookie, session };
  }
  csrf(req) {
    return this.session(req).session.csrf;
  }
  checkCsrf(req, session) {
    if (!safeEqual(req.headers["x-csrf-token"], session.csrf))
      fail(403, "CSRF_REQUIRED");
  }
  async inspect(session) {
    // getUser verifies the access token with Auth. JWT fields are read only after that succeeds.
    let result;
    try {
      result = await session.client.auth.getUser();
    } catch {
      fail(503, "AUTH_UNAVAILABLE");
    }
    const { data, error } = result;
    if (error || !data?.user?.id)
      fail(
        error?.status >= 500 ? 503 : 401,
        error?.status >= 500 ? "AUTH_UNAVAILABLE" : "SESSION_INVALID",
      );
    const actor = uuid(data.user.id);
    if (actor !== session.actor) fail(401, "SESSION_INVALID");
    let snapshot;
    try {
      snapshot = await session.client.auth.getSession();
    } catch {
      fail(503, "AUTH_UNAVAILABLE");
    }
    if (snapshot.error || !snapshot.data?.session?.access_token)
      fail(401, "SESSION_INVALID");
    const claims = verifiedClaims(
      snapshot.data.session.access_token,
      actor,
      this.now(),
    );
    await this.authorize(actor, uuid(claims.session_id));
    return { actor, aal: claims.aal };
  }
  async login(req, res, data) {
    fields(data, ["email", "password"]);
    const email = normalizedEmail(data.email);
    if (
      typeof data.password !== "string" ||
      data.password.length < 8 ||
      data.password.length > 1024
    )
      fail(401, "LOGIN_FAILED");
    this.rate("ip:" + String(req.socket?.remoteAddress || "unknown"));
    this.rate("email:" + email);
    this.prune();
    if (this.sessions.size >= 128) fail(503, "AUTH_CAPACITY");
    const client = this.factory(this.config);
    let result;
    try {
      result = await client.auth.signInWithPassword({
        email,
        password: data.password,
      });
    } catch {
      fail(503, "AUTH_UNAVAILABLE");
    }
    if (result.error || !result.data?.user?.id || !result.data?.session)
      fail(
        result.error?.status >= 500 ? 503 : 401,
        result.error?.status >= 500 ? "AUTH_UNAVAILABLE" : "LOGIN_FAILED",
      );
    const session = {
      client,
      actor: uuid(result.data.user.id),
      csrf: randomBytes(24).toString("base64url"),
      expires: this.now() + 3600000,
      mfa: false,
      factors: [],
    };
    try {
      const verified = await this.inspect(session);
      session.mfa = !this.requireMfa || verified.aal === "aal2";
      if (!session.mfa) {
        const f = await client.auth.mfa.listFactors();
        if (f.error) fail(503, "MFA_UNAVAILABLE");
        session.factors = (f.data?.totp || [])
          .filter((factor) => factor.status === "verified")
          .map((factor) => ({
            id: uuid(factor.id),
            name: factor.friendly_name || "Autenticador",
          }));
      }
    } catch (error) {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      throw error;
    }
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(token, session);
    this.writeCookie(res, token);
    return {
      authenticated: session.mfa,
      mfa_required: !session.mfa,
      mfa_enrollment_required: !session.mfa && !session.factors.length,
      factors: session.factors,
      csrf: session.csrf,
    };
  }
  async verifyMfa(req, data) {
    fields(data, ["factor_id", "code"]);
    const { session } = this.session(req);
    this.checkCsrf(req, session);
    this.rate("mfa:" + session.actor);
    if (
      !session.factors.some((f) => f.id === uuid(data.factor_id)) ||
      !/^[0-9]{6}$/.test(data.code || "")
    )
      fail(400, "INVALID_MFA");
    const result = await session.client.auth.mfa.challengeAndVerify({
      factorId: data.factor_id,
      code: data.code,
    });
    if (result.error) fail(401, "MFA_INVALID");
    const verified = await this.inspect(session);
    if (verified.aal !== "aal2") fail(403, "MFA_REQUIRED");
    session.mfa = true;
    return { authenticated: true, csrf: session.csrf };
  }
  async authenticate(req) {
    const { session } = this.session(req);
    if (!["GET", "HEAD"].includes(req.method)) this.checkCsrf(req, session);
    const verified = await this.inspect(session);
    if (this.requireMfa && (!session.mfa || verified.aal !== "aal2"))
      fail(403, "MFA_REQUIRED");
    return verified.actor;
  }
  async logout(req, res) {
    const { session, cookie } = this.session(req);
    this.checkCsrf(req, session);
    this.sessions.delete(cookie);
    this.writeCookie(res, "", 0);
    try {
      await session.client.auth.signOut({ scope: "local" });
    } catch {}
    return { authenticated: false };
  }
}
