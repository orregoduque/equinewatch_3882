// Server-owned expectations. Other existing receiver assignments are preserved.
export const EXPECTED_CAMERAS = Object.freeze({
  'a95f853c-e90b-4b6d-a4ea-f25cfa317119': 'bacata-mock',
  'd826a274-58ea-4a55-8fd2-1d4c78222ab1': 'bacata-thunder',
});

export function resolveHorseCamera(cameras, horseId) {
  if (!Array.isArray(cameras)) throw Error('Invalid camera discovery');
  const matches = cameras.filter(camera => camera.horseId === horseId);
  if (matches.length !== 1) return null;
  const camera = matches[0];
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(camera.id)
    || (EXPECTED_CAMERAS[horseId] && EXPECTED_CAMERAS[horseId] !== camera.id)) return null;
  return camera;
}
