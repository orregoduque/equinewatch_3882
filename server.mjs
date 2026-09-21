import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { ReplitConnectors } from '@replit/connectors-sdk';

const PORT = Number(process.env.PORT || 5000);
const production = process.env.NODE_ENV === 'production';
const buildDirectory = resolve('build');
const connectors = new ReplitConnectors();
const recipient = 'founder@stable-eye.co';
const allowedProfiles = new Set(['owner', 'manager', 'groom', 'vet']);
const allowedQuestionKeys = {
  owner: new Set(['horse-count', 'remote-care', 'owner-concern']),
  manager: new Set(['boxes', 'records', 'manager-challenge']),
  groom: new Set(['groom-count', 'groom-info', 'report-ease']),
  vet: new Set(['early-signals', 'emergency-info', 'clinical-value']),
};
const completed = new Map();
const rateLimits = new Map();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('INVALID_JSON');
  }
}

export function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Solicitud inválida.');
  if (body.website) throw new Error('No se pudo verificar el envío.');
  if (typeof body.submissionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.submissionId)) throw new Error('Identificador de envío inválido.');
  const answers = body.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Respuestas inválidas.');
  if (!allowedProfiles.has(answers.profile)) throw new Error('Selecciona un perfil válido.');
  const contact = answers.contact;
  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) throw new Error('Completa tus datos de contacto.');
  const name = String(contact.name || '').trim();
  const phone = String(contact.phone || '').trim();
  const email = String(contact.email || '').trim().toLowerCase();
  if (!name || name.length > 120) throw new Error('Escribe un nombre válido.');
  if (!/^\+?[0-9\s().-]{7,25}$/.test(phone)) throw new Error('Escribe un teléfono válido.');
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) throw new Error('Escribe un correo electrónico válido.');

  const permitted = allowedQuestionKeys[answers.profile];
  const cleaned = {};
  for (const [key, rawValue] of Object.entries(answers)) {
    if (key === 'profile' || key === 'contact') continue;
    if (!permitted.has(key)) throw new Error('Las respuestas no corresponden al perfil seleccionado.');
    if (Array.isArray(rawValue)) {
      if (rawValue.length > 10 || rawValue.some((value) => typeof value !== 'string' || value.length > 160)) throw new Error('Una respuesta no es válida.');
      cleaned[key] = rawValue.map((value) => value.trim());
    } else if (typeof rawValue === 'string' && rawValue.length <= 500) {
      cleaned[key] = rawValue.trim();
    } else {
      throw new Error('Una respuesta no es válida.');
    }
  }
  if (Object.keys(cleaned).length !== 3) throw new Error('Completa todas las preguntas antes de enviar.');
  return { profile: answers.profile, answers: cleaned, contact: { name, phone, email } };
}

function formatLabel(key) {
  return key.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildEmail(submission, submissionId) {
  const answerRows = Object.entries(submission.answers).map(([key, value]) => {
    const text = Array.isArray(value) ? value.join(', ') : value;
    return `<tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:600">${escapeHtml(formatLabel(key))}</td><td style="padding:10px;border-bottom:1px solid #eee">${escapeHtml(text)}</td></tr>`;
  }).join('');
  const textAnswers = Object.entries(submission.answers)
    .map(([key, value]) => `${formatLabel(key)}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join('\n');

  return {
    from: process.env.MAIL_FROM || 'Stable Eye <onboarding@resend.dev>',
    to: [recipient],
    reply_to: submission.contact.email,
    subject: `Nueva respuesta de encuesta — ${submission.contact.name}`,
    text: `Nueva respuesta de la encuesta Stable Eye\n\nPerfil: ${submission.profile}\nNombre: ${submission.contact.name}\nTeléfono: ${submission.contact.phone}\nCorreo: ${submission.contact.email}\n\n${textAnswers}\n\nID: ${submissionId}`,
    html: `<div style="font-family:Arial,sans-serif;color:#40352C;max-width:680px;margin:auto"><h1>Nueva respuesta de la encuesta</h1><p><strong>Perfil:</strong> ${escapeHtml(submission.profile)}</p><p><strong>Nombre:</strong> ${escapeHtml(submission.contact.name)}<br><strong>Teléfono:</strong> ${escapeHtml(submission.contact.phone)}<br><strong>Correo:</strong> ${escapeHtml(submission.contact.email)}</p><table style="width:100%;border-collapse:collapse">${answerRows}</table><p style="color:#777;font-size:12px">ID: ${escapeHtml(submissionId)}</p></div>`,
  };
}

function checkRateLimit(request) {
  const now = Date.now();
  const ip = request.socket.remoteAddress || 'unknown';
  const current = rateLimits.get(ip);
  if (!current || current.expiresAt <= now) {
    rateLimits.set(ip, { count: 1, expiresAt: now + 15 * 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 20;
}

async function handleSubmit(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Método no permitido.' });
  if (!request.headers['content-type']?.startsWith('application/json')) return json(response, 415, { error: 'Se requiere JSON.' });
  if (request.headers['sec-fetch-site'] === 'cross-site') return json(response, 403, { error: 'Origen no permitido.' });
  if (!checkRateLimit(request)) return json(response, 429, { error: 'Demasiados intentos. Vuelve a intentarlo más tarde.' });

  try {
    const body = await readJson(request);
    const submission = validateSubmission(body);
    if (completed.has(body.submissionId)) return json(response, 200, { ok: true });

    const resendResponse = await connectors.proxy('resend', '/emails', {
      method: 'POST',
      headers: { 'Idempotency-Key': `stable-eye/${body.submissionId}` },
      body: buildEmail(submission, body.submissionId),
    });
    const result = await resendResponse.json().catch(() => null);
    if (!resendResponse.ok || !result?.id) {
      console.error('Resend rejected survey email with status', resendResponse.status);
      return json(response, 502, { error: 'No se pudo enviar el correo. Tus respuestas siguen aquí; vuelve a intentarlo.' });
    }
    completed.set(body.submissionId, Date.now());
    return json(response, 200, { ok: true });
  } catch (error) {
    if (error.message === 'PAYLOAD_TOO_LARGE') return json(response, 413, { error: 'La solicitud es demasiado grande.' });
    if (error.message === 'INVALID_JSON') return json(response, 400, { error: 'El contenido enviado no es JSON válido.' });
    console.error('Survey submission failed:', error instanceof Error ? error.message : 'Unknown error');
    return json(response, 400, { error: error instanceof Error ? error.message : 'No se pudo procesar la encuesta.' });
  }
}

function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const requested = resolve(join(buildDirectory, pathname === '/' ? 'index.html' : pathname.slice(1)));
  const file = requested.startsWith(buildDirectory) && existsSync(requested) && statSync(requested).isFile()
    ? requested
    : join(buildDirectory, 'index.html');
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream',
    'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') return response.end();
  createReadStream(file).pipe(response);
}

let vite;
if (!production) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/api/submit') return handleSubmit(request, response);
  if (pathname === '/api/health') return json(response, 200, { ok: true, emailProvider: 'resend' });
  if (!production) return vite.middlewares(request, response);
  if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'Método no permitido.' });
  return serveStatic(request, response);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Stable Eye listening on port ${PORT} (${production ? 'production' : 'development'})`);
});