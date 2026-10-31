/**
 * Presentation only. Never use aliases as database values, storage paths,
 * camera IDs or authorization identifiers.
 */
export function withHorseDisplayName<T extends { id: string; name: string | null }>(horse: T): T {
  if (horse.id.toLowerCase() !== 'd826a274-58ea-4a55-8fd2-1d4c78222ab1') return horse;
  return { ...horse, name: 'Sancho' };
}
