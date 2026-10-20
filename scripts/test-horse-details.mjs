import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-horse-details.mjs https://YOUR-DEV-DOMAIN');
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'],
});
const uid = '00000000-0000-4000-8000-000000000001';
const first = '00000000-0000-4000-8000-000000000010';
const second = '00000000-0000-4000-8000-000000000020';
const foreign = '00000000-0000-4000-8000-000000000030';
const profilePhotoUrl = 'https://zmxppbpywizdjlhstfkf.supabase.co/storage/v1/object/public/images/profiles/fixture-horse.png';
const labels = [
  'Nombre', 'Raza', 'Fecha de nacimiento', 'Edad', 'Sexo', 'Color', 'Box', 'Peso (kg)', 'Alzada (manos)',
  'Notas médicas', 'Número registro', 'Dieta', 'Contacto emergencia', 'Número emergencia',
  'Veterinario', 'Teléfono veterinario', 'Aseguradora',
];
const expectedColumns = [
  'id', 'name', 'breed', 'age', 'date_of_birth', 'gender', 'color', 'stall_number', 'weight',
  'height', 'medical_notes', 'registration_number', 'dietary_requirements',
  'emergency_contact', 'emergency_phone', 'veterinarian', 'veterinarian_phone',
  'insurance_details', 'profile_photo_url',
];
const blankHorse = Object.fromEntries(expectedColumns.map(key => [key, null]));
const horse = {
  ...blankHorse, id: first, name: 'Bacatá de prueba', breed: 'Criollo', age: 8,
  date_of_birth: '2015-07-12',
  gender: 'Macho', color: 'Castaño', stall_number: 'B-04', weight: 480, height: 15.2,
  medical_notes: 'Notas de prueba\n<script>no ejecutar</script>',
};
const results = [];
await mkdir('generated-artifacts/horse-details', { recursive: true });

async function setup({
  mobile = false, missingSession = false, loggedOut = false, mismatch = false,
  role = 'horse_owner', failOnce = false, nullValues = false, populated = false,
  timezoneId = 'America/Bogota', dateOfBirth = horse.date_of_birth,
  savedPhoto = profilePhotoUrl, brokenPhoto = false, cameraPhoto = false,
} = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    timezoneId,
  });
  const page = await context.newPage(), requests = [], errors = [], writes = [];
  let detailReads = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ uid, role, missingSession, loggedOut, mismatch }) => {
    if (!loggedOut) localStorage.setItem('stableEyeUser', JSON.stringify({
      id: uid, email: 'fixture@example.test', name: 'Fixture', role,
    }));
    if (!missingSession) {
      const id = mismatch ? '00000000-0000-4000-8000-000000000099' : uid;
      const payload = btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).replaceAll('=', '');
      localStorage.setItem('sb-zmxppbpywizdjlhstfkf-auth-token', JSON.stringify({
        access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic-only`,
        refresh_token: 'synthetic-only', token_type: 'bearer',
        expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
        user: { id, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test' },
      }));
    }
  }, { uid, role, missingSession, loggedOut, mismatch });
  await context.route('https://*.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (request.method() !== 'GET') {
      writes.push({ method: request.method(), path: url.pathname });
      return route.fulfill({ status: 405, body: 'No writes allowed in this test' });
    }
    requests.push({ path: url.pathname, query: url.search, authorization: !!request.headers().authorization });
    const json = (data, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(data),
    });
    if (brokenPhoto && url.pathname.startsWith('/storage/') && url.pathname.includes('/profiles/'))
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Profile photo missing' });
    if (url.pathname.startsWith('/storage/')) return route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#c9a962"/></svg>',
    });
    if (url.pathname.includes('/horses')) {
      const id = url.searchParams.get('id');
      if (id) {
        detailReads++;
        assert.equal(url.searchParams.get('select'), expectedColumns.join(','));
        assert(request.headers().authorization?.includes('synthetic-only'));
        if (failOnce && detailReads === 1) return json({ message: 'Fixture failure' }, 503);
        if (id !== `eq.${first}`) return json([]); // Simulate missing/foreign horse hidden by RLS.
        if (nullValues) return json([{ ...blankHorse, id: first, age: 0, weight: 0, height: 0 }]);
        const currentHorse = { ...horse, date_of_birth: dateOfBirth, profile_photo_url: savedPhoto };
        return json([populated ? {
          ...currentHorse, registration_number: 'REG-TEST', dietary_requirements: 'Dieta de prueba',
          emergency_contact: 'Contacto de prueba', emergency_phone: '000-TEST',
          veterinarian: 'Clínica veterinaria de prueba', veterinarian_phone: '111-TEST',
          insurance_details: 'Póliza de prueba',
        } : currentHorse]);
      }
      return json([
        { ...horse, profile_photo_url: savedPhoto, owner_id: uid, is_active: true, created_at: new Date().toISOString() },
        { ...horse, id: second, name: 'Caballo inactivo', owner_id: uid, is_active: false },
      ]);
    }
    if (url.pathname.includes('/user_profiles'))
      return json([{ id: uid, email: 'fixture@example.test', full_name: 'Fixture', role }]);
    if (url.pathname.endsWith('/images')) return json(cameraPhoto ? [{ storage_path_enhanced: 'camera/latest.jpg' }] : []);
    if (url.pathname.includes('/auth/v1/user')) return json({ id: uid, email: 'fixture@example.test' });
    return json([]);
  });
  return { page, context, requests, errors, writes, setPhotoUrl(url) { savedPhoto = url; } };
}
async function finish(t, name) {
  assert.deepEqual(t.errors, []);
  assert.deepEqual(t.writes, []);
  assert(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  results.push({ name, passed: true, syntheticOnly: true, writes: 0 });
  await t.context.close();
}
async function open(t, id = first) {
  await t.page.goto(`${base}/horses/${id}`);
}
try {
  for (const mobile of [false, true]) {
    const t = await setup({ mobile });
    await t.page.goto(`${base}/horse-list`);
    const link = t.page.getByRole('link', { name: 'Ver ficha de Bacatá de prueba', exact: true });
    await link.waitFor();
    assert.equal(await t.page.getByText('Caballo inactivo', { exact: true }).count(), 0);
    const card = t.page.locator('main article');
    assert.equal(await card.count(), 1);
    assert.equal((await card.innerText()).replace(/\s+/g, ' ').trim(), 'Bacatá de prueba Ver ficha');
    assert.equal(await card.locator('img').count(), 1);
    const photo = card.getByRole('img', { name: 'Bacatá de prueba', exact: true });
    assert.equal(await photo.getAttribute('src'), profilePhotoUrl);
    await photo.evaluate(image => image.decode());
    await t.page.screenshot({
      path: `generated-artifacts/horse-details/list-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
    await link.click();
    await t.page.locator('table').waitFor();
    const headerPhoto = t.page.locator('article header img');
    assert.equal(await headerPhoto.getAttribute('src'), profilePhotoUrl);
    await headerPhoto.evaluate(image => image.decode());
    assert(!t.requests.some(request => request.path.endsWith('/rest/v1/images')));
    assert.equal(new URL(t.page.url()).pathname, `/horses/${first}`);
    assert.deepEqual(await t.page.locator('table th').allTextContents(), labels);
    const values = await t.page.locator('table td').allTextContents();
    assert.deepEqual(values.slice(0, 9), [
      'Bacatá de prueba', 'Criollo', '12/07/2015', '8', 'Macho', 'Castaño', 'B-04', '480', '15.2',
    ]);
    assert.equal(values[9], horse.medical_notes);
    assert(values.slice(10).every(value => value === '—'));
    assert.equal(await t.page.locator('form,input,textarea,select').count(), 0);
    assert.equal(await t.page.getByRole('button', { name: /guardar|editar|crear/i }).count(), 0);
    await t.page.screenshot({
      path: `generated-artifacts/horse-details/${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true,
    });
    await finish(t, mobile ? 'mobile-17-fields-and-list-entry' : 'desktop-17-fields-and-list-entry');
  }
  for (const mobile of [false, true]) {
    const t = await setup({ mobile });
    await t.page.goto(`${base}/horse-list`);
    const portrait = t.page.getByRole('link', { name: 'Ver fotos de cámara de Bacatá de prueba', exact: true });
    await portrait.waitFor();
    assert.equal(await portrait.locator('img').getAttribute('src'), profilePhotoUrl);
    assert.equal(await portrait.getAttribute('href'), `/horse-timeline?horseId=${first}`);
    const cameraRequest = t.page.waitForRequest(request =>
      new URL(request.url()).pathname.endsWith('/rest/v1/images'));
    await portrait.click();
    await t.page.waitForURL(`**/horse-timeline?horseId=${first}`);
    const query = new URL((await cameraRequest).url()).searchParams;
    assert.equal(query.get('horse_id'), `eq.${first}`);
    assert.equal(query.get('storage_path_enhanced'), 'not.is.null');
    assert(query.get('order').startsWith('uploaded_at.desc'));
    assert(query.get('select').split(',').includes('storage_path_enhanced'));
    await finish(t, `${mobile ? 'mobile' : 'desktop'}-portrait-opens-same-horse-camera-not-profile`);
  }
  for (const path of ['/horse-list', `/horses/${first}`]) {
    const t = await setup();
    await t.page.goto(`${base}${path}`);
    const selector = path === '/horse-list' ? 'main article img' : 'article header img';
    await t.page.locator(selector).waitFor();
    const updatedPhoto = new URL('updated-portrait.jpg', profilePhotoUrl).href;
    t.setPhotoUrl(updatedPhoto);
    await t.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await t.page.waitForFunction(({ selector, src }) =>
      document.querySelector(selector)?.getAttribute('src') === src, { selector, src: updatedPhoto });
    assert(!t.requests.some(request => request.path.endsWith('/rest/v1/images')));
    await finish(t, `profile-field-revalidated-on-focus-${path}`);
  }
  for (const timezoneId of ['America/Los_Angeles', 'Pacific/Auckland']) {
    const t = await setup({ timezoneId, dateOfBirth: '2022-12-09' });
    await open(t);
    await t.page.getByRole('cell', { name: '09/12/2022', exact: true }).waitFor();
    assert.equal(await t.page.locator('tr').filter({ has: t.page.getByRole('rowheader', { name: 'Edad', exact: true }) }).locator('td').textContent(), '8');
    await finish(t, `birth-date-preserves-calendar-day-and-db-age-${timezoneId}`);
  }
  for (const missingPhoto of [null, '  ']) {
    const t = await setup({ savedPhoto: missingPhoto, cameraPhoto: true });
    await t.page.goto(`${base}/horse-list`);
    const cardPhoto = t.page.locator('main article img');
    await t.page.waitForFunction(() => document.querySelector('main article img')?.getAttribute('src') === '/assets/images/no_image.png');
    assert.equal(await cardPhoto.getAttribute('src'), '/assets/images/no_image.png');
    await t.page.getByRole('link', { name: 'Ver ficha de Bacatá de prueba', exact: true }).click();
    await t.page.waitForFunction(() => document.querySelector('article header img')?.getAttribute('src') === '/assets/images/no_image.png');
    assert(!t.requests.some(request => request.path.endsWith('/rest/v1/images')));
    await finish(t, `empty-profile-shows-placeholder-and-never-queries-camera-${JSON.stringify(missingPhoto)}`);
  }
  const broken = await setup({ brokenPhoto: true, cameraPhoto: true });
  await broken.page.goto(`${base}/horse-list`);
  await broken.page.waitForFunction(() => document.querySelector('main article img')?.getAttribute('src') === '/assets/images/no_image.png');
  await broken.page.getByRole('link', { name: 'Ver ficha de Bacatá de prueba', exact: true }).click();
  await broken.page.waitForFunction(() => document.querySelector('article header img')?.getAttribute('src') === '/assets/images/no_image.png');
  assert(!broken.requests.some(request => request.path.endsWith('/rest/v1/images')));
  await finish(broken, 'broken-saved-profile-does-not-query-camera');
  const populated = await setup({ populated: true, role: 'admin' });
  await open(populated);
  await populated.page.getByRole('cell', { name: 'Clínica veterinaria de prueba', exact: true }).waitFor();
  await populated.page.getByRole('cell', { name: '111-TEST', exact: true }).waitFor();
  await populated.page.getByRole('cell', { name: 'Póliza de prueba', exact: true }).waitFor();
  await finish(populated, 'staff-reads-real-veterinarian-and-other-optional-fields');

  const empty = await setup({ nullValues: true });
  await open(empty);
  await empty.page.locator('table').waitFor();
  const emptyValues = await empty.page.locator('table td').allTextContents();
  assert.equal(emptyValues.filter(v => v === '—').length, 14);
  assert.equal(emptyValues.filter(v => v === '0').length, 3);
  await finish(empty, 'all-rows-null-with-numeric-zero-preserved');

  const denied = await setup();
  await open(denied, foreign);
  await denied.page.getByRole('heading', { name: 'Caballo no encontrado' }).waitFor();
  assert.equal(await denied.page.locator('table').count(), 0);
  await finish(denied, 'rls-hidden-or-missing-horse-is-not-shown');

  for (const options of [{ missingSession: true }, { loggedOut: true }, { mismatch: true }]) {
    const t = await setup(options);
    await open(t);
    await t.page.getByRole('heading', { name: 'Inicia sesión para continuar' }).waitFor();
    assert(!t.requests.some(request => request.query.includes('id=eq.')));
    assert.equal(await t.page.locator('table').count(), 0);
    await finish(t, `no-anonymous-or-mismatched-read-${JSON.stringify(options)}`);
  }
  const retry = await setup({ failOnce: true });
  await open(retry);
  await retry.page.getByRole('heading', { name: 'No se pudo cargar la ficha', exact: true }).waitFor();
  await retry.page.getByRole('button', { name: 'Reintentar' }).click();
  await retry.page.locator('table').waitFor();
  await finish(retry, 'error-visible-and-retry-restores-details');

  const invalid = await setup();
  await open(invalid, 'invalid-id');
  await invalid.page.getByText('El identificador del caballo no es válido.', { exact: true }).waitFor();
  assert(!invalid.requests.some(request => request.query.includes('id=eq.')));
  await finish(invalid, 'invalid-id-does-not-query-database');

  const navigation = await setup();
  await navigation.page.goto(`${base}/horse-list`);
  await navigation.page.getByRole('link', { name: 'Ver ficha de Bacatá de prueba', exact: true }).click();
  await navigation.page.getByRole('link', { name: 'Ver línea de tiempo', exact: true }).click();
  await navigation.page.waitForURL(/horse-timeline\?horseId=/);
  await finish(navigation, 'timeline-remains-accessible-from-horse-details');
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
