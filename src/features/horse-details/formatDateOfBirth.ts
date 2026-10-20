/** A database date is a calendar day, never a local-time timestamp. */
export function formatDateOfBirth(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—';
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return '—';
  return value.split('-').reverse().join('/');
}
