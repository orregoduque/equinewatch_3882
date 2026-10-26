import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Fixed allowlist: no customer files, .env, config, credentials or frontend.
const directory = resolve('generated-artifacts/hls-receiver');
await mkdir(`${directory}/services/hls-pilot`, { recursive: true });
for (const name of ['auth.mjs', 'receiver.mjs', 'stream-window.mjs', 'proxy-receiver.mjs'])
  await copyFile(`services/hls-pilot/${name}`, `${directory}/services/hls-pilot/${name}`);
await copyFile('pilot/RECEIVER-PUBLISH.md', `${directory}/README.md`);
await copyFile('pilot/TWO-CAMERAS.md', `${directory}/TWO-CAMERAS.md`);
await writeFile(`${directory}/package.json`, JSON.stringify({
  name: 'stableeye-private-hls-receiver', private: true, type: 'module',
  engines: { node: '>=20' },
  scripts: { start: 'node services/hls-pilot/proxy-receiver.mjs' },
}, null, 2) + '\n');
await writeFile(`${directory}/.replit`, `modules = ["nodejs-20"]
run = ["npm", "start"]

[[ports]]
localPort = 5000
externalPort = 80

[deployment]
deploymentTarget = "vm"
run = ["npm", "start"]
`);
await writeFile(`${directory}/.gitignore`, 'node_modules/\n.env\n*.local.json\n');
console.log('Paquete preparado en generated-artifacts/hls-receiver; no se ha publicado.');
