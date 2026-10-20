import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-registro.mjs https://YOUR-DEV-DOMAIN');
const directory = 'generated-artifacts/registro';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'],
});
const uid = '00000000-0000-4000-8000-000000000001';
const first = '00000000-0000-4000-8000-000000000010';
const second = '00000000-0000-4000-8000-000000000020';
const foreign = '00000000-0000-4000-8000-000000000030';
const results = [];
const expectedTasks = [
  'herraduras', 'vacuna', 'concurso', 'dientes',
  'Terapias', 'Odontologia', 'Purga', 'Medicamento',
  'Chequeo veterinario', 'Cambio de comida', 'Ajuste silla', 'Cambio bocado',
];

async function setup({
  mobile = false, role = 'horse_owner', readFailure = false, saveFailure = false,
  refreshFailure = false, slow = false, noSession = false, horseFailure = false,
  requested = first,
} = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile, hasTouch: mobile,
  });
  const page = await context.newPage(), errors = [], requests = [], inserted = [];
  let reads = 0, hasInserted = false, failedOnce = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ uid, role, noSession }) => {
    const payload = btoa(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).replaceAll('=', '');
    localStorage.setItem('stableEyeUser', JSON.stringify({
      id: uid, email: 'fixture@example.test', name: 'Usuario de prueba', role,
    }));
    if (!noSession) localStorage.setItem('sb-zmxppbpywizdjlhstfkf-auth-token', JSON.stringify({
      access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic-not-a-production-token`,
      token_type: 'bearer', refresh_token: 'synthetic-only',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test' },
    }));
  }, { uid, role, noSession });
  let rows = Array.from({ length: 26 }, (_, index) => ({
    id: index + 1, horse_id: first, task: ['herraduras', 'vacuna', 'concurso', 'dientes'][index % 4],
    performed_on: `2026-10-${String(26 - index).padStart(2, '0')}`,
    comments: index === 25 ? 'Registro de la página siguiente' : `Cuidado de Bacatá ${index + 1}`,
    created_by: uid, created_at: '2026-10-27T10:00:00Z', updated_at: '2026-10-27T10:00:00Z',
  }));
  await context.route('https://*.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const json = (data, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(data),
    });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (path.includes('/rest/v1/horses')) {
      if (horseFailure) return json({ message: 'Invalid API key' }, 401);
      let horses = [
        { id: first, name: 'Bacatá', owner_id: uid },
        { id: second, name: 'Luna', owner_id: uid },
        { id: foreign, name: 'Caballo ajeno', owner_id: null },
      ].map(horse => ({
        ...horse, breed: 'Synthetic', is_active: true, created_at: '2026-10-01T10:00:00Z',
      }));
      if (url.searchParams.has('owner_id')) horses = horses.filter(horse => horse.owner_id === uid);
      return json(horses);
    }
    if (path.includes('/rest/v1/user_profiles')) return json([{
      id: uid, email: 'fixture@example.test', full_name: 'Usuario de prueba', role,
    }]);
    if (!path.includes('/rest/v1/checks')) {
      return json(path.includes('/auth/v1/user') ? { id: uid, email: 'fixture@example.test' } : []);
    }
    requests.push({ method: request.method(), query: url.search });
    if (request.method() === 'POST') {
      const input = request.postDataJSON();
      inserted.push(input);
      await new Promise(resolve => setTimeout(resolve, 150));
      if (saveFailure) return json({ message: 'new row violates row-level security policy', code: '42501' }, 403);
      const record = {
        ...input, id: 100, created_by: uid,
        created_at: '2026-10-28T11:00:00Z', updated_at: '2026-10-28T11:00:00Z',
      };
      rows = [record, ...rows];
      hasInserted = true;
      return json(record, 201);
    }
    reads++;
    if ((readFailure && !failedOnce) || (refreshFailure && hasInserted)) {
      failedOnce = true;
      return json({ message: 'Historial temporalmente no disponible' }, 503);
    }
    if (slow && reads === 1) await new Promise(resolve => setTimeout(resolve, 800));
    const horseId = url.searchParams.get('horse_id')?.replace(/^eq\./, '');
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || 26);
    try { return await json(rows.filter(row => row.horse_id === horseId).slice(offset, offset + limit)); }
    catch { /* Abort on a deliberate horse switch is expected. */ }
  });
  await page.goto(`${base}/registro?horseId=${requested}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Registro', exact: true }).waitFor();
  return { context, page, errors, requests, inserted };
}

async function assertNoOverflow(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
async function submit(page, comments = 'Revisión registrada en prueba', task = 'dientes') {
  await page.getByLabel('Tipo de cuidado').selectOption(task);
  await page.getByLabel('Fecha (de la tarea)').fill('2026-10-28');
  await page.getByLabel(/^Comentarios/).fill(comments);
  await page.getByRole('button', { name: 'Guardar registro' }).click();
}
async function finish(test, name) {
  assert.equal(test.errors.length, 0, test.errors.join('\n'));
  results.push({ name, passed: true, syntheticOnly: true });
  await test.context.close();
}

try {
  for (const mobile of [false, true]) {
    const t = await setup({ mobile });
    await t.page.getByText('Cuidado de Bacatá 1', { exact: true }).waitFor();
    const options = await t.page.getByLabel('Tipo de cuidado').locator('option').evaluateAll(nodes => nodes.map(node => node.value));
    assert.deepEqual(options, expectedTasks);
    assert.equal(await t.page.getByRole('combobox', { name: 'Selecciona un caballo' }).locator('option').count(), 2);
    const navigation = mobile ? t.page.locator('nav.md\\:hidden') : t.page.locator('header nav');
    const links = await navigation.locator('a').allTextContents();
    assert.equal(links.findIndex(text => text.trim() === 'Registro'), links.findIndex(text => text.trim() === 'Insights') + 1);
    await t.page.getByRole('button', { name: 'Cargar más' }).click();
    await t.page.getByText('Registro de la página siguiente', { exact: true }).waitFor();
    await submit(t.page, '<script>not executable</script> Revisión dental');
    await t.page.getByText('Registro guardado.', { exact: false }).waitFor();
    await t.page.locator('article').getByText('<script>not executable</script> Revisión dental', { exact: true }).waitFor();
    assert.equal(t.inserted.length, 1);
    assert.deepEqual(Object.keys(t.inserted[0]).sort(), ['comments', 'horse_id', 'performed_on', 'task']);
    assert.equal(t.inserted[0].horse_id, first);
    assert.equal(t.inserted[0].task, 'dientes');
    await assertNoOverflow(t.page);
    await t.page.screenshot({ path: `${directory}/${mobile ? 'mobile' : 'desktop'}.png`, fullPage: false });
    await t.page.getByRole('combobox', { name: 'Selecciona un caballo' }).selectOption(second);
    await t.page.getByText('Todavía no hay registros').waitFor();
    assert.equal(await t.page.locator('article').count(), 0);
    assert.equal(await t.page.getByLabel(/^Comentarios/).inputValue(), '');
    assert.equal(await t.page.getByText('Registro guardado.', { exact: false }).count(), 0);
    await finish(t, mobile ? 'mobile-create-list-pagination-switch' : 'desktop-create-list-pagination-switch');
  }
  const expanded = await setup();
  await expanded.page.getByText('Cuidado de Bacatá 1', { exact: true }).waitFor();
  for (const task of expectedTasks) {
    const comment = `Prueba de tarea: ${task}`;
    await submit(expanded.page, comment, task);
    await expanded.page.locator('article').getByText(comment, { exact: true }).waitFor();
    assert.equal(expanded.inserted.at(-1).task, task);
    assert.deepEqual(Object.keys(expanded.inserted.at(-1)).sort(), ['comments', 'horse_id', 'performed_on', 'task']);
    await expanded.page.locator('article').filter({ hasText: comment })
      .getByRole('heading').waitFor();
  }
  await finish(expanded, 'all-twelve-exact-task-values-create-and-render');
  const denied = await setup({ requested: foreign });
  await denied.page.getByText('Cuidado de Bacatá 1', { exact: true }).waitFor();
  assert(!denied.requests.some(request => request.query.includes(foreign)));
  await finish(denied, 'owner-foreign-deep-link-is-not-queried');

  const admin = await setup({ role: 'admin', requested: foreign });
  await admin.page.getByText('Todavía no hay registros').waitFor();
  assert.equal(await admin.page.getByRole('combobox', { name: 'Selecciona un caballo' }).locator('option').count(), 3);
  assert.equal(await admin.page.getByRole('combobox', { name: 'Selecciona un caballo' }).inputValue(), foreign);
  await assertNoOverflow(admin.page);
  await finish(admin, 'admin-can-select-all-horses');

  const readRetry = await setup({ readFailure: true });
  await readRetry.page.getByRole('heading', { name: 'No se pudo cargar el historial' }).waitFor();
  await readRetry.page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await readRetry.page.getByText('Cuidado de Bacatá 1', { exact: true }).waitFor();
  await finish(readRetry, 'read-failure-is-visible-and-retryable');

  const saveError = await setup({ saveFailure: true });
  await saveError.page.getByText('Cuidado de Bacatá 1', { exact: true }).waitFor();
  await submit(saveError.page);
  await saveError.page.getByRole('alert').filter({ hasText: 'row-level security' }).waitFor();
  assert.equal(await saveError.page.getByLabel(/^Comentarios/).inputValue(), 'Revisión registrada en prueba');
  assert.equal(await saveError.page.getByText('Registro guardado.', { exact: false }).count(), 0);
  assert.equal(saveError.inserted.length, 1);
  await finish(saveError, 'failed-save-preserves-input-without-false-success');

  const refreshError = await setup({ refreshFailure: true });
  await refreshError.page.getByText('Cuidado de Bacatá 1', { exact: true }).waitFor();
  await submit(refreshError.page);
  await refreshError.page.getByText('Registro guardado.', { exact: false }).waitFor();
  await refreshError.page.getByRole('heading', { name: 'No se pudo cargar el historial' }).waitFor();
  assert.equal(refreshError.inserted.length, 1);
  await finish(refreshError, 'confirmed-save-distinct-from-failed-refresh');

  const stale = await setup({ slow: true });
  await stale.page.waitForRequest(request => request.url().includes('/rest/v1/checks'));
  await stale.page.getByRole('combobox', { name: 'Selecciona un caballo' }).selectOption(second);
  await stale.page.getByText('Todavía no hay registros').waitFor();
  await stale.page.waitForTimeout(900);
  assert.equal(await stale.page.locator('article').count(), 0);
  await finish(stale, 'late-response-does-not-leak-across-horses');

  const noSession = await setup({ noSession: true });
  await noSession.page.getByText('Inicia sesión con tu cuenta para consultar o crear registros.', { exact: true }).waitFor();
  assert.equal(noSession.requests.length, 0);
  await finish(noSession, 'missing-real-session-cannot-query-checks');

  const unavailable = await setup({ horseFailure: true });
  await unavailable.page.getByRole('heading', { name: 'No se pudieron cargar los caballos' }).waitFor();
  assert.equal(unavailable.requests.length, 0);
  await finish(unavailable, 'configuration-error-is-not-an-empty-history');
  console.log(JSON.stringify(results, null, 2));
} finally {
  await writeFile(`${directory}/report.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
