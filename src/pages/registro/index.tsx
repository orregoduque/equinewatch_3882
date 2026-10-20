import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ClipboardList,
  Clock3, LoaderCircle, Plus, RefreshCw,
} from 'lucide-react';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import { useAccessibleHorses } from '../../hooks/useAccessibleHorses';
import { CHECK_TASKS, createHorseCheck, fetchHorseChecks, localToday } from '../../features/checks/api';
import type { CheckTask, HorseCheck } from '../../features/checks/api';

const TASK_LABELS: Record<CheckTask, string> = {
  herraduras: 'Herraduras',
  vacuna: 'Vacuna',
  concurso: 'Concurso',
  dientes: 'Dientes',
  Terapias: 'Terapias',
  Odontologia: 'Odontologia',
  Purga: 'Purga',
  Medicamento: 'Medicamento',
  'Chequeo veterinario': 'Chequeo veterinario',
  'Cambio de comida': 'Cambio de comida',
  'Ajuste silla': 'Ajuste silla',
  'Cambio bocado': 'Cambio bocado',
};

const formatDate = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const errorMessage = (error: unknown) => error instanceof Error
  ? error.message
  : 'No se pudo completar la operación. Inténtalo de nuevo.';

const Registro: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { viewer, viewerKey, horses, isLoading: isLoadingHorses, error: horsesError } = useAccessibleHorses();
  const requestedHorseId = searchParams.get('horseId') || '';
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [task, setTask] = useState<CheckTask>(CHECK_TASKS[0]);
  const [performedOn, setPerformedOn] = useState(localToday);
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [noticeScope, setNoticeScope] = useState('');
  const [records, setRecords] = useState<HorseCheck[]>([]);
  const [recordsScope, setRecordsScope] = useState('');
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [recordsErrorScope, setRecordsErrorScope] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const [moreErrorScope, setMoreErrorScope] = useState('');
  const listRequest = useRef<AbortController | null>(null);
  const moreRequest = useRef<AbortController | null>(null);
  const saveRequest = useRef<AbortController | null>(null);
  const activeScope = useMemo(() => JSON.stringify([viewerKey, selectedHorseId]), [viewerKey, selectedHorseId]);
  const activeScopeRef = useRef(activeScope);
  activeScopeRef.current = activeScope;
  const selectedHorse = horses.find((horse) => horse.id === selectedHorseId);
  const visibleRecords = recordsScope === activeScope ? records : [];
  const visibleRecordsError = recordsErrorScope === activeScope ? recordsError : '';
  const visibleMoreError = moreErrorScope === activeScope ? moreError : '';
  const visibleSaveError = noticeScope === activeScope ? saveError : '';
  const visibleSavedMessage = noticeScope === activeScope ? savedMessage : '';
  const loadingCurrentRecords = isLoadingRecords || recordsScope !== activeScope;

  useEffect(() => {
    saveRequest.current?.abort();
    moreRequest.current?.abort();
    setIsSaving(false);
    setIsLoadingMore(false);
    setMoreError('');
    setSaveError('');
    setSavedMessage('');
    setNoticeScope(activeScope);
    setTask(CHECK_TASKS[0]);
    setPerformedOn(localToday());
    setComments('');
  }, [activeScope]);

  useEffect(() => {
    if (isLoadingHorses) {
      setSelectedHorseId('');
      return;
    }
    const chosenId = horses.some((horse) => horse.id === requestedHorseId)
      ? requestedHorseId
      : horses[0]?.id || '';
    setSelectedHorseId(chosenId);
    if (chosenId !== requestedHorseId) {
      setSearchParams(chosenId ? { horseId: chosenId } : {}, { replace: true });
    }
  }, [horses, isLoadingHorses, requestedHorseId, setSearchParams]);

  useEffect(() => {
    if (!viewer || !selectedHorseId || !selectedHorse) {
      listRequest.current?.abort();
      setRecords([]);
      setRecordsScope('');
      setIsLoadingRecords(false);
      setRecordsError('');
      setHasMore(false);
      setPage(0);
      return;
    }

    const controller = new AbortController();
    listRequest.current?.abort();
    listRequest.current = controller;
    const scope = JSON.stringify([viewerKey, selectedHorseId]);
    setRecords([]);
    setRecordsScope(scope);
    setIsLoadingRecords(true);
    setRecordsError('');
    setHasMore(false);
    setPage(0);
    setMoreError('');

    fetchHorseChecks(selectedHorseId, viewer, 0, controller.signal).then((result) => {
      if (controller.signal.aborted || scope !== activeScopeRef.current) return;
      setRecords(result.records);
      setHasMore(result.hasMore);
      setPage(0);
      setIsLoadingRecords(false);
    }).catch((error: unknown) => {
      if (controller.signal.aborted || scope !== activeScopeRef.current) return;
      setRecordsError(errorMessage(error));
      setRecordsErrorScope(scope);
      setIsLoadingRecords(false);
    });

    return () => controller.abort();
  }, [viewerKey, selectedHorseId, !!viewer, selectedHorse]);

  useEffect(() => () => {
    listRequest.current?.abort();
    moreRequest.current?.abort();
    saveRequest.current?.abort();
  }, []);

  const changeHorse = (horseId: string) => {
    setSelectedHorseId(horseId);
    setSearchParams(horseId ? { horseId } : {}, { replace: true });
    setSavedMessage('');
    setSaveError('');
  };

  const loadRecords = async () => {
    if (!viewer || !selectedHorseId || !selectedHorse || isLoadingRecords) return;
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    const scope = JSON.stringify([viewerKey, selectedHorseId]);
    setRecordsScope(scope);
    setRecords([]);
    setIsLoadingRecords(true);
    setRecordsError('');
    setHasMore(false);
    setPage(0);
    try {
      const result = await fetchHorseChecks(selectedHorseId, viewer, 0, controller.signal);
      if (controller.signal.aborted || scope !== activeScopeRef.current) return;
      setRecords(result.records);
      setHasMore(result.hasMore);
    } catch (error) {
      if (!controller.signal.aborted && scope === activeScopeRef.current) {
        setRecordsError(errorMessage(error));
        setRecordsErrorScope(scope);
      }
    } finally {
      if (!controller.signal.aborted && scope === activeScopeRef.current) setIsLoadingRecords(false);
    }
  };

  const loadMore = async () => {
    if (!viewer || !selectedHorseId || isLoadingMore || !hasMore) return;
    moreRequest.current?.abort();
    const controller = new AbortController();
    moreRequest.current = controller;
    const scope = activeScope;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    setMoreError('');
    try {
      const result = await fetchHorseChecks(selectedHorseId, viewer, nextPage, controller.signal);
      if (controller.signal.aborted || scope !== activeScopeRef.current) return;
      setRecords((previous) => {
        const knownIds = new Set(previous.map((record) => String(record.id)));
        return [...previous, ...result.records.filter((record) => !knownIds.has(String(record.id)))];
      });
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (error) {
      if (!controller.signal.aborted && scope === activeScopeRef.current) {
        setMoreError(errorMessage(error));
        setMoreErrorScope(scope);
      }
    } finally {
      if (!controller.signal.aborted && scope === activeScopeRef.current) setIsLoadingMore(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!viewer || !selectedHorse || isSaving || !performedOn || (saveRequest.current && !saveRequest.current.signal.aborted)) return;
    const horseId = selectedHorseId;
    const viewerAtSubmit = viewer;
    const scope = activeScope;
    const controller = new AbortController();
    saveRequest.current = controller;
    moreRequest.current?.abort();
    setIsLoadingMore(false);
    setMoreError('');
    setIsSaving(true);
    setSaveError('');
    setSavedMessage('');
    setNoticeScope(scope);
    try {
      await createHorseCheck({
        horse_id: horseId,
        task,
        performed_on: performedOn,
        comments: comments.trim() || null,
      }, viewerAtSubmit, controller.signal);
      if (controller.signal.aborted || scope !== activeScopeRef.current) return;
      setSavedMessage('Registro guardado. La actividad se confirmó en el servidor.');
      setComments('');

      // A confirmed save stands independently from the history refresh.
      const refresh = new AbortController();
      listRequest.current?.abort();
      listRequest.current = refresh;
      setRecords([]);
      setRecordsScope(scope);
      setIsLoadingRecords(true);
      setRecordsError('');
      setHasMore(false);
      setPage(0);
      try {
        const result = await fetchHorseChecks(horseId, viewerAtSubmit, 0, refresh.signal);
        if (!refresh.signal.aborted && scope === activeScopeRef.current) {
          setRecords(result.records);
          setHasMore(result.hasMore);
        }
      } catch (error) {
        if (!refresh.signal.aborted && scope === activeScopeRef.current) {
          setRecordsError(errorMessage(error));
          setRecordsErrorScope(scope);
        }
      } finally {
        if (!refresh.signal.aborted && scope === activeScopeRef.current) setIsLoadingRecords(false);
      }
    } catch (error) {
      if (!controller.signal.aborted && scope === activeScopeRef.current) setSaveError(errorMessage(error));
    } finally {
      if (saveRequest.current === controller) saveRequest.current = null;
      if (scope === activeScopeRef.current) setIsSaving(false);
    }
  };

  const inputClass = 'w-full appearance-none rounded-xl border px-4 py-3 text-[15px] text-[#40352C] outline-none transition focus:border-[#8C7350] focus:ring-2 focus:ring-[#8C7350]/15 disabled:opacity-60';
  const sectionLabel = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#827665]';

  return (
    <>
      <Helmet>
        <title>Registro de cuidados - Stable Eye</title>
        <meta name="description" content="Registra y consulta los cuidados realizados a cada caballo." />
      </Helmet>
      <div className="min-h-screen bg-[#F8F6F2] text-[#40352C]">
        <Header />
        <main className="px-4 pb-28 pt-28 sm:px-6 md:pb-12 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-12 w-1 shrink-0 rounded-full bg-[#8C7350]" />
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8668]">Historial de cuidados</p>
                  <h1 className="font-['Syne',sans-serif] text-3xl font-bold tracking-tight sm:text-[38px]">Registro</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#827665]">Anota las atenciones importantes y consulta cuándo se realizaron.</p>
                </div>
              </div>
              {!isLoadingHorses && horses.length > 0 && (
                <label className="relative w-full sm:w-72">
                  <span className={sectionLabel}>Caballo</span>
                  <select
                    value={selectedHorseId}
                    onChange={(event) => changeHorse(event.target.value)}
                    disabled={isSaving}
                    aria-label="Selecciona un caballo"
                    className={`${inputClass} pr-11`}
                    style={{ backgroundColor: '#FFFDF9', borderColor: 'rgba(64,53,44,0.14)' }}
                  >
                    {horses.map((horse) => <option key={horse.id} value={horse.id}>{horse.name}</option>)}
                  </select>
                  <ChevronDown size={17} className="pointer-events-none absolute bottom-3.5 right-4 text-[#8A7C69]" />
                </label>
              )}
            </div>

            {isLoadingHorses ? (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                {[0, 1].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-[#E9E3D8] bg-[#F1EDE5]" />)}
              </div>
            ) : horsesError ? (
              <section className="rounded-2xl border border-[#E8D9D2] bg-[#FBF4F0] p-6" role="alert">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 shrink-0 text-[#A35F4C]" size={20} />
                  <div>
                    <h2 className="font-semibold text-[#6E4035]">No se pudieron cargar los caballos</h2>
                    <p className="mt-1 text-sm text-[#80645B]">{horsesError}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#756044] hover:bg-[#F4E9E2]"
                    >
                      <RefreshCw size={15} /> Reintentar carga
                    </button>
                  </div>
                </div>
              </section>
            ) : horses.length === 0 ? (
              <section className="rounded-2xl border border-[#E7E0D5] bg-[#FFFDF9] px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EDE5] text-[#8C7350]">
                  <ClipboardList size={25} strokeWidth={1.7} />
                </div>
                <h2 className="font-['Syne',sans-serif] text-xl font-bold">Aún no hay caballos asignados</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#827665]">Cuando tengas acceso a un caballo, aquí podrás registrar y consultar sus cuidados.</p>
              </section>
            ) : selectedHorse ? (
              <div className="grid items-start gap-6 lg:grid-cols-[0.88fr_1.12fr]">
                <section className="overflow-hidden rounded-2xl border border-[#E7E0D5] bg-[#FFFDF9] shadow-[0_10px_30px_rgba(64,53,44,0.04)]">
                  <div className="border-b border-[#EEE8DE] px-6 py-5 sm:px-7">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EFE7] text-[#8C7350]">
                        <Plus size={19} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A8668]">Nueva anotación</p>
                        <h2 className="mt-0.5 font-['Syne',sans-serif] text-lg font-bold">Añadir cuidado</h2>
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-7">
                    <fieldset disabled={isSaving} className="space-y-5">
                    <div>
                      <label htmlFor="check-task" className={sectionLabel}>Tipo de cuidado</label>
                      <div className="relative">
                        <select
                          id="check-task"
                          value={task}
                          onChange={(event) => setTask(event.target.value as CheckTask)}
                          className={`${inputClass} pr-11`}
                          style={{ backgroundColor: '#FFFDF9', borderColor: 'rgba(64,53,44,0.14)' }}
                        >
                          {CHECK_TASKS.map((item) => <option key={item} value={item}>{TASK_LABELS[item]}</option>)}
                        </select>
                        <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A7C69]" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="performed-on" className={sectionLabel}>Fecha (de la tarea)</label>
                      <div className="relative">
                        <input
                          id="performed-on"
                          type="date"
                          required
                          value={performedOn}
                          onChange={(event) => setPerformedOn(event.target.value)}
                          className={`${inputClass} pr-12`}
                          style={{ backgroundColor: '#FFFDF9', borderColor: 'rgba(64,53,44,0.14)' }}
                        />
                        <CalendarDays size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A7C69]" />
                      </div>
                      {!performedOn && <p className="mt-1.5 text-xs text-[#A35F4C]">Selecciona una fecha para guardar.</p>}
                    </div>
                    <div>
                      <label htmlFor="check-comments" className={sectionLabel}>Comentarios <span className="font-medium normal-case tracking-normal text-[#A69B8A]">· opcional</span></label>
                      <textarea
                        id="check-comments"
                        value={comments}
                        onChange={(event) => setComments(event.target.value)}
                        rows={4}
                        placeholder="Añade un detalle que quieras recordar…"
                        className={`${inputClass} resize-y`}
                        style={{ backgroundColor: '#FFFDF9', borderColor: 'rgba(64,53,44,0.14)' }}
                      />
                    </div>
                    {visibleSaveError && (
                      <div className="flex gap-2.5 rounded-xl border border-[#E8D9D2] bg-[#FBF4F0] p-3.5 text-sm text-[#784B40]" role="alert">
                        <AlertCircle size={17} className="mt-0.5 shrink-0" />
                        <p>No se pudo guardar: {visibleSaveError} Tus datos siguen en el formulario; puedes volver a intentarlo.</p>
                      </div>
                    )}
                    {visibleSavedMessage && (
                      <div className="flex gap-2.5 rounded-xl border border-[#D7E4D7] bg-[#F2F7F0] p-3.5 text-sm text-[#496447]" role="status">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                        <p>{visibleSavedMessage}</p>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isSaving || !performedOn}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#40352C] px-5 py-3.5 text-sm font-semibold text-[#F8F6F2] transition hover:bg-[#594A3D] focus:outline-none focus:ring-2 focus:ring-[#8C7350] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? <><LoaderCircle size={17} className="animate-spin" /> Guardando…</> : <><Plus size={17} /> Guardar registro</>}
                    </button>
                    </fieldset>
                  </form>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#E7E0D5] bg-[#FFFDF9] shadow-[0_10px_30px_rgba(64,53,44,0.04)]">
                  <div className="flex items-center justify-between border-b border-[#EEE8DE] px-6 py-5 sm:px-7">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EFE7] text-[#8C7350]">
                        <Clock3 size={19} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A8668]">Actividad</p>
                        <h2 className="mt-0.5 font-['Syne',sans-serif] text-lg font-bold">Historial de {selectedHorse.name}</h2>
                      </div>
                    </div>
                    {!loadingCurrentRecords && !visibleRecordsError && (
                      <span className="rounded-full bg-[#F2EEE6] px-3 py-1 text-xs font-semibold text-[#756650]">{visibleRecords.length}</span>
                    )}
                  </div>
                  <div aria-live="polite">
                    {loadingCurrentRecords ? (
                      <div className="space-y-4 p-6 sm:p-7">
                        {[0, 1, 2].map((item) => (
                          <div key={item} className="flex animate-pulse gap-4">
                            <div className="h-9 w-9 rounded-xl bg-[#F1EDE5]" />
                            <div className="flex-1 space-y-2 pt-1"><div className="h-3 w-28 rounded bg-[#F1EDE5]" /><div className="h-3 w-2/3 rounded bg-[#F1EDE5]" /></div>
                          </div>
                        ))}
                      </div>
                    ) : visibleRecordsError ? (
                      <div className="px-6 py-12 text-center sm:px-8">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FBF1EC] text-[#A35F4C]"><AlertCircle size={20} /></div>
                        <h3 className="font-semibold">No se pudo cargar el historial</h3>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-[#827665]">{visibleRecordsError}</p>
                        <button type="button" onClick={loadRecords} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#756044] hover:bg-[#F4F0E9]">
                          <RefreshCw size={15} /> Reintentar
                        </button>
                      </div>
                    ) : visibleRecords.length === 0 ? (
                      <div className="px-6 py-14 text-center sm:px-8">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EFE7] text-[#9A8668]"><ClipboardList size={21} strokeWidth={1.7} /></div>
                        <h3 className="font-['Syne',sans-serif] text-base font-bold">Todavía no hay registros</h3>
                        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-[#827665]">Las anotaciones de {selectedHorse.name} aparecerán aquí.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#F0EBE2]">
                        {visibleRecords.map((record) => (
                          <article key={record.id} className="flex gap-4 px-6 py-5 sm:px-7">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3EFE7] text-[#8C7350]">
                              <ClipboardList size={17} strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                <h3 className="font-semibold text-[#40352C]">{TASK_LABELS[record.task]}</h3>
                                <time className="text-xs font-medium text-[#8A7C69]" dateTime={record.performed_on}>{formatDate(record.performed_on)}</time>
                              </div>
                              {record.comments && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#746B60]">{record.comments}</p>}
                              <p className="mt-2 text-[11px] text-[#AAA091]">Fecha de registro: {formatCreatedAt(record.created_at)}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                  {!loadingCurrentRecords && !visibleRecordsError && visibleRecords.length > 0 && hasMore && (
                    <div className="border-t border-[#EEE8DE] px-6 py-4 text-center">
                      {visibleMoreError && <p className="mb-2 text-sm text-[#A35F4C]" role="alert">{visibleMoreError}</p>}
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={isLoadingMore || isSaving}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#756044] transition hover:bg-[#F4F0E9] disabled:opacity-60"
                      >
                        {isLoadingMore ? <><LoaderCircle size={15} className="animate-spin" /> Cargando…</> : <><RefreshCw size={15} /> Cargar más</>}
                      </button>
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </main>
        <MobileNavigation />
      </div>
    </>
  );
};

export default Registro;
