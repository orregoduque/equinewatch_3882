import { spawn } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Verified with the publishing service; never use a development preview domain here.
const PRODUCTION_ORIGIN = 'https://stableeye.co';
const HISTORY_PATH = '/deployment-assets.json';
const MAX_FILES = 300;
const MAX_BYTES = 25 * 1024 * 1024;
const assetPath = /^\/assets\/[\w.-]+-[\w-]{8}\.\w+$/;

export function assetReferences(text, sourcePath, origin) {
  const paths = new Set();
  const pattern = /["'`(]((?:\/?assets\/|\.\.?\/)?[\w./-]+-[\w-]{8}\.(?:js|css|woff2?|png|svg|webp|jpg|jpeg|ico))(?=["'`)])/g;
  for (const [, reference] of text.matchAll(pattern)) {
    const url = new URL(reference.startsWith('assets/') ? `/${reference}` : reference, origin + sourcePath);
    if (url.origin === origin && assetPath.test(url.pathname)) paths.add(url.pathname);
  }
  return [...paths];
}

export function moduleEntry(html) {
  return html.match(/<script\b[^>]*\bsrc=["'](\/assets\/[^"']+\.js)["']/)?.[1];
}

/** Only public, fingerprinted static files are read; never accounts or client data. */
export async function captureLiveAssets(origin = PRODUCTION_ORIGIN, fetcher = fetch) {
  const get = async path => {
    const response = await fetcher(origin + path, {
      signal: AbortSignal.timeout(20_000), cache: 'no-store', redirect: 'error',
    });
    return response;
  };
  const root = await get('/');
  if (!root.ok) throw new Error(`La versión pública no responde: HTTP ${root.status}. No se publicará.`);
  const html = await root.text();
  const entry = moduleEntry(html);
  if (!entry || !assetPath.test(entry)) throw new Error('No se pudo identificar la versión pública. No se publicará.');

  const historyResponse = await get(HISTORY_PATH);
  let builds;
  // The pre-compatibility server returns the SPA HTML for an unknown JSON URL.
  if (historyResponse.ok && historyResponse.headers.get('content-type')?.includes('application/json')) {
    const history = await historyResponse.json();
    if (history.format !== 1 || !Array.isArray(history.builds) || history.builds[0]?.entry !== entry) {
      throw new Error('El historial de archivos no coincide con la versión pública. No se publicará.');
    }
    builds = history.builds.slice(0, 2);
    for (const build of builds) {
      if (!assetPath.test(build.entry) || !Array.isArray(build.assets) || !build.assets.includes(build.entry)
        || build.assets.some(path => typeof path !== 'string' || !assetPath.test(path))) {
        throw new Error('Historial de archivos inválido. No se publicará.');
      }
    }
  } else if (!historyResponse.ok && historyResponse.status !== 404) {
    throw new Error('No se pudo consultar el historial de archivos. No se publicará.');
  }

  const queue = [...new Set(builds ? builds.flatMap(build => build.assets) : assetReferences(html, '/', origin))];
  const seen = new Set(queue);
  const files = new Map();
  let bytes = 0;
  while (queue.length) {
    if (seen.size > MAX_FILES) throw new Error('Demasiados archivos anteriores; revisar antes de publicar.');
    const results = await Promise.all(queue.splice(0, 4).map(async path => {
      const response = await get(path);
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`No se pudo conservar ${path}. No se publicará.`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 4 * 1024 * 1024) throw new Error(`Archivo anterior demasiado grande: ${path}`);
      return [path, buffer];
    }));
    for (const [path, buffer] of results) {
      bytes += buffer.length;
      if (bytes > MAX_BYTES) throw new Error('El archivo de compatibilidad supera el límite. Revisar antes de publicar.');
      files.set(path, buffer);
      if (!builds && /\.(js|css)$/.test(path)) {
        for (const reference of assetReferences(buffer.toString('utf8'), path, origin)) {
          if (!seen.has(reference)) { seen.add(reference); queue.push(reference); }
        }
      }
    }
  }
  return { files, builds: builds || [{ entry, assets: [...files.keys()].sort() }] };
}

export async function restoreAssets(archive, directory = 'build') {
  const html = await readFile(`${directory}/index.html`, 'utf8');
  const entry = moduleEntry(html);
  if (!entry) throw new Error('La nueva compilación no tiene un punto de entrada válido.');
  const ownAssets = (await readdir(`${directory}/assets`))
    .map(name => `/assets/${name}`).filter(path => assetPath.test(path)).sort();
  if (!ownAssets.includes(entry)) throw new Error('Falta el archivo principal de la nueva compilación.');
  await mkdir(`${directory}/assets`, { recursive: true });
  for (const [path, buffer] of archive.files) {
    if (!assetPath.test(path)) throw new Error('Ruta de archivo anterior inválida.');
    if (ownAssets.includes(path)) {
      if (!(await readFile(directory + path)).equals(buffer)) {
        throw new Error(`Colisión entre archivos de versiones distintas: ${path}`);
      }
    } else {
      await writeFile(directory + path, buffer);
    }
  }
  const builds = [{ entry, assets: ownAssets }, ...archive.builds.filter(build => build.entry !== entry)].slice(0, 3);
  await writeFile(directory + HISTORY_PATH, JSON.stringify({ format: 1, builds }, null, 2));
}

async function main() {
  console.log('Comprobando y conservando los archivos de la versión pública antes de compilar...');
  const archive = await captureLiveAssets();
  await new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    build.on('error', reject);
    build.on('exit', code => code === 0 ? resolve() : reject(new Error(`La compilación falló: ${code}`)));
  });
  await restoreAssets(archive);
  console.log(`Compatibilidad preparada: ${archive.files.size} archivos anteriores conservados.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
