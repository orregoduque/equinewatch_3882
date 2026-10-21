// Construct calendar boundaries in the viewer's local timezone, then query UTC.
// Advancing the wall-clock hour also respects daylight-saving transitions.
export const localHourRange = (day: string, hour: number) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match || !Number.isInteger(hour) || hour < 0 || hour > 23)
    throw new Error('Selecciona un día y una hora válidos.');
  const [, y, m, d] = match;
  const midnight = new Date(+y, +m - 1, +d);
  if (midnight.getFullYear() !== +y || midnight.getMonth() !== +m - 1 || midnight.getDate() !== +d)
    throw new Error('Selecciona un día válido.');
  const start = new Date(+y, +m - 1, +d, hour);
  const end = new Date(+y, +m - 1, +d, hour + 1);
  if (start.getHours() !== hour || end <= start)
    throw new Error('Esta hora no existe en tu zona horaria por el cambio de horario.');
  return { start: start.toISOString(), end: end.toISOString() };
};

export const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
