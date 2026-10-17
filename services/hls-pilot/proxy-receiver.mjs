// Separate always-on receiver project only. Never use this entry point for the main app.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createReceiver } from './receiver.mjs';

export function proxyReceiverConfig(env) {
  if (env.HLS_TLS_TERMINATED_BY_PROXY !== 'true')
    throw new Error('Se requiere un proveedor que termine HTTPS antes del receptor.');
  let config;
  try { config = JSON.parse(env.HLS_RECEIVER_CONFIG || ''); }
  catch { throw new Error('Configurar HLS_RECEIVER_CONFIG en Secrets.'); }
  if (!config || !/^[a-f0-9]{64}$/.test(config.appProxyKeySha256 || ''))
    throw new Error('Configurar el hash de la credencial exclusiva de la app.');
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Puerto del receptor inválido.');
  return { config, port };
}

export async function startProxyReceiver(env = process.env) {
  const { config, port } = proxyReceiverConfig(env);
  const pilot = createReceiver(config);
  const server = createServer(pilot.handler);
  server.requestTimeout = 6000;
  server.headersTimeout = 5000;
  server.maxConnections = 64;
  server.on('close', pilot.close);
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '0.0.0.0', resolve);
    });
  } catch (error) { pilot.close(); throw error; }
  console.log('Receptor HLS aislado listo detrás del terminador HTTPS.');
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startProxyReceiver().then(server => {
    let closing = false;
    const stop = () => {
      if (closing) return;
      closing = true;
      server.close();
      server.closeIdleConnections();
      const timer = setTimeout(() => server.closeAllConnections(), 6500);
      timer.unref();
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
  }).catch(() => {
    // Never log JSON, tokens, upstream URLs, or errors containing secret values.
    console.error('No se pudo iniciar el receptor: revisar Secrets y la terminación HTTPS.');
    process.exitCode = 1;
  });
}
