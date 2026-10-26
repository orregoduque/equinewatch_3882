import { mkdir, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';

// Explicit allowlist: never include existing configs, keys, spools or .env.
const files = [
  'pilot/pi/agent.py', 'pilot/pi/media.py', 'pilot/pi/probe.py',
  'pilot/pi/prepare_thunder.py', 'pilot/pi/stableeye-hls-thunder.service',
  'pilot/TWO-CAMERAS.md', 'services/wasabi-photos/iam-replit-two-horses-readonly.json',
];
for (const source of files) {
  const destination = `generated-artifacts/two-cameras/${source}`;
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
console.log('Paquete local de preparación: generated-artifacts/two-cameras. No se modificaron servicios remotos.');
