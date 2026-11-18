// Staging integration helper. Its bearer permits ONLY control-*@example.invalid fixtures.
// No service-role key leaves this function. No mail is sent. No production deployment.
import { createClient } from "npm:@supabase/supabase-js@2.119.1";
const expectedProject = "xzfwcwfmnypgcunavmlc";
const tokenDigest = "__FIXTURE_TOKEN_SHA256__";
const reply = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
Deno.serve(async (req: Request) => {
  if (Deno.env.get("SUPABASE_URL") !== `https://${expectedProject}.supabase.co`)
    return reply(503, { error: "PROJECT_MISMATCH" });
  if (req.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" });
  const bearer = req.headers.get("authorization") || "";
  if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(bearer))
    return reply(401, { error: "UNAUTHORIZED" });
  const bytes = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(bearer.slice(7)),
    ),
  );
  const expected = Uint8Array.from(tokenDigest.match(/../g) || [], (p) =>
    parseInt(p, 16),
  );
  let diff = bytes.length ^ expected.length;
  for (let i = 0; i < bytes.length; i++) diff |= bytes[i] ^ (expected[i] || 0);
  if (diff) return reply(401, { error: "UNAUTHORIZED" });
  let count = 0,
    text = "";
  const reader = req.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return reply(400, { error: "INVALID_BODY" });
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    count += part.value.length;
    if (count > 16384) {
      await reader.cancel();
      return reply(413, { error: "BODY_TOO_LARGE" });
    }
    text += decoder.decode(part.value, { stream: true });
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return reply(400, { error: "INVALID_JSON" });
  }
  if (
    !data ||
    Object.keys(data).some(
      (k) => !["email", "full_name", "request_id", "password"].includes(k),
    ) ||
    !/^control-[a-z0-9-]+@example\.invalid$/.test(data.email || "") ||
    typeof data.full_name !== "string" ||
    data.full_name.length < 1 ||
    data.full_name.length > 120 ||
    !/^[a-f0-9-]{36}$/.test(data.request_id || "") ||
    (data.password !== undefined &&
      (typeof data.password !== "string" ||
        data.password.length < 24 ||
        data.password.length > 128))
  )
    return reply(400, { error: "FIXTURE_ONLY" });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (list.error) return reply(503, { error: "AUTH_UNAVAILABLE" });
  if (list.data.users.length >= 100)
    return reply(429, { error: "FIXTURE_LIMIT" });
  const existing = list.data.users.find((u) => u.email === data.email);
  if (existing) {
    if (existing.app_metadata?.control_request_id !== data.request_id)
      return reply(409, { error: "EXISTING_ACCOUNT" });
    return reply(200, { id: existing.id });
  }
  const password = data.password || crypto.randomUUID() + crypto.randomUUID();
  const result = await admin.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
    app_metadata: {
      control_request_id: data.request_id,
      control_fixture: true,
    },
  });
  if (result.error)
    return reply(result.error.status >= 500 ? 503 : 400, {
      error: "AUTH_CREATE_FAILED",
    });
  return reply(200, { id: result.data.user.id });
});
