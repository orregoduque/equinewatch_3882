import { supabase, requireHorseAccess, type HorseViewer } from '../../utils/supabase';

export const CHECK_TASKS = ['herraduras', 'vacuna', 'concurso', 'dientes'] as const;
export type CheckTask = typeof CHECK_TASKS[number];

export interface HorseCheck {
  id: number | string;
  horse_id: string;
  task: CheckTask;
  performed_on: string;
  comments: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NewHorseCheck {
  horse_id: string;
  task: CheckTask;
  performed_on: string;
  comments?: string | null;
}

const COLUMNS = 'id,horse_id,task,performed_on,comments,created_by,created_at,updated_at';
const PAGE_SIZE = 25;

/** Local date, without the UTC offset shifting today to yesterday/tomorrow. */
export function localToday(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validateInput(input: NewHorseCheck) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.horse_id))
    throw new Error('Selecciona un caballo válido.');
  if (!CHECK_TASKS.includes(input.task))
    throw new Error('Selecciona una tarea válida.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.performed_on))
    throw new Error('Selecciona una fecha válida.');
  const parsed = new Date(`${input.performed_on}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.performed_on)
    throw new Error('Selecciona una fecha válida.');
  if (input.comments != null && typeof input.comments !== 'string')
    throw new Error('El comentario debe ser texto.');
}

async function authorize(horseId: string, viewer: HorseViewer, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const { data, error } = await supabase.auth.getSession();
  // Demonstration accounts and a stale session from another account must never
  // read or create real checks. Supabase RLS remains the server-side authority.
  if (error || !data.session || data.session.user.id !== viewer.id)
    throw new Error('Inicia sesión con tu cuenta para consultar o crear registros.');
  await requireHorseAccess(horseId, viewer);
  signal?.throwIfAborted();
}

export async function fetchHorseChecks(
  horseId: string, viewer: HorseViewer, page = 0, signal?: AbortSignal,
): Promise<{ records: HorseCheck[]; hasMore: boolean }> {
  if (!Number.isSafeInteger(page) || page < 0) throw new Error('Página de registros no válida.');
  await authorize(horseId, viewer, signal);
  let query = supabase.from('checks')
    .select(COLUMNS)
    .eq('horse_id', horseId)
    .order('performed_on', { ascending: false })
    .order('id', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  signal?.throwIfAborted();
  if (error) throw new Error(`No se pudieron cargar los registros: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Supabase no devolvió una lista de registros válida.');
  return { records: data.slice(0, PAGE_SIZE) as HorseCheck[], hasMore: data.length > PAGE_SIZE };
}

export async function createHorseCheck(
  input: NewHorseCheck, viewer: HorseViewer, signal?: AbortSignal,
): Promise<HorseCheck> {
  validateInput(input);
  await authorize(input.horse_id, viewer, signal);
  // Deliberately send only editable columns. Defaults/identity/auth.uid() and
  // database policies supply and validate the author, ID and timestamps.
  let query = supabase.from('checks').insert({
    horse_id: input.horse_id,
    task: input.task,
    performed_on: input.performed_on,
    comments: input.comments?.trim() || null,
  }).select(COLUMNS);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.single();
  if (error) throw new Error(`No se pudo guardar el registro: ${error.message}`);
  if (!data?.id || data.horse_id !== input.horse_id)
    throw new Error('No se pudo confirmar el registro guardado. Actualiza el historial antes de intentarlo de nuevo.');
  return data as HorseCheck;
}
