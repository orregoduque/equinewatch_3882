/**
 * Presentation only. Never use aliases as database values, storage paths,
 * camera IDs or authorization identifiers.
 */
export function withHorseDisplayName<T extends { id: string; name: string | null }>(horse: T): T {
  switch (horse.id.toLowerCase()) {
    case 'd826a274-58ea-4a55-8fd2-1d4c78222ab1':
      return { ...horse, name: 'Sancho' };
    case 'a95f853c-e90b-4b6d-a4ea-f25cfa317119':
      return { ...horse, name: 'Destiny' };
    default:
      return horse;
  }
}
