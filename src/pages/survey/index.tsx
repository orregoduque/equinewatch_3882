import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

type Profile = 'owner' | 'manager' | 'groom' | 'vet';
type Answer = string | string[];

interface Question {
  id: string;
  title: string;
  type: 'single' | 'multiple' | 'scale' | 'text';
  options?: string[];
  hint?: string;
}

const profileOptions = [
  { value: 'owner', label: 'Propietario de caballo' },
  { value: 'manager', label: 'Administrador de establo' },
  { value: 'groom', label: 'Groom' },
  { value: 'vet', label: 'Veterinario' },
] as const;

const profileQuestions: Record<Profile, Question[]> = {
  owner: [
    { id: 'horse-count', title: '¿Cuántos caballos tienes actualmente?', type: 'text', hint: 'Escribe tu respuesta' },
    { id: 'remote-care', title: 'Cuando no estás en el establo, ¿cómo sabes si tu caballo está bien?', type: 'multiple', options: ['Personal del establo', 'Cámaras', 'Llamadas o WhatsApp', 'Lo reviso al llegar', 'Otro'] },
    { id: 'owner-concern', title: '¿Qué situación te preocuparía más no detectar a tiempo?', type: 'multiple', options: ['Cólico', 'Caballo acostado o atrapado', 'Lesión', 'Salida no autorizada', 'Falta de comida o agua', 'Otra'] },
  ],
  manager: [
    { id: 'boxes', title: '¿Cuántos caballos y boxes supervisas normalmente?', type: 'single', options: ['1–20', '21–50', '51–100', 'Más de 100'] },
    { id: 'records', title: '¿Cómo se registran hoy las rutinas y alertas de cada caballo?', type: 'multiple', options: ['Papel', 'WhatsApp', 'Software', 'Depende del empleado', 'No se registra actualmente'] },
    { id: 'manager-challenge', title: '¿Cuál es el mayor reto al supervisar todos los caballos, especialmente fuera del horario normal?', type: 'multiple', options: ['Visibilidad', 'Falta de personal', 'Respuesta a emergencias', 'Comunicación con propietarios', 'Control de rutinas'] },
  ],
  groom: [
    { id: 'groom-count', title: 'Durante tu turno, ¿cuántos caballos cuidas habitualmente?', type: 'single', options: ['1–5', '6–10', '11–20', 'Más de 20'] },
    { id: 'groom-info', title: '¿Qué información de un caballo te ayudaría más a hacer mejor tu trabajo?', type: 'multiple', options: ['Última comida', 'Hora de salida', 'Comportamiento reciente', 'Alertas de salud', 'Instrucciones del propietario o veterinario'] },
    { id: 'report-ease', title: 'Cuando detectas algo fuera de lo normal, ¿qué tan fácil es avisar y dejar registrado lo ocurrido?', type: 'scale', options: ['1', '2', '3', '4', '5'], hint: 'Muy difícil|Muy fácil' },
  ],
  vet: [
    { id: 'early-signals', title: '¿Qué señales tempranas te gustaría poder conocer antes de llegar al establo?', type: 'multiple', options: ['Cambios de comportamiento', 'Tiempo acostado o de pie', 'Alimentación', 'Movimiento', 'Otra'] },
    { id: 'emergency-info', title: 'En una urgencia, ¿qué información del caballo te ayudaría más a evaluar el caso a distancia?', type: 'multiple', options: ['Foto o video reciente', 'Historial de actividad', 'Última comida', 'Hora de salida', 'Otra'] },
    { id: 'clinical-value', title: '¿En qué situaciones crees que un sistema de monitoreo continuo podría aportar más valor clínico?', type: 'multiple', options: ['Sospecha de cólico', 'Recuperación postoperatoria', 'Caballos mayores o de riesgo', 'Yeguas gestantes', 'Seguimiento nocturno'] },
  ],
};

const optionLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const Survey: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const questions = useMemo(() => profile ? profileQuestions[profile] : [], [profile]);
  const totalSteps = 5;

  const goTo = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(Math.max(0, Math.min(totalSteps - 1, nextStep)));
  };

  const chooseProfile = (value: Profile) => {
    setProfile(value);
    window.setTimeout(() => goTo(1), 180);
  };

  const chooseOption = (question: Question, option: string) => {
    if (question.type === 'multiple') {
      const current = (answers[question.id] as string[]) || [];
      setAnswers({ ...answers, [question.id]: current.includes(option) ? current.filter((item) => item !== option) : [...current, option] });
      return;
    }
    setAnswers({ ...answers, [question.id]: option });
    window.setTimeout(() => goTo(step + 1), 180);
  };

  const currentQuestion = step > 0 && step < 4 ? questions[step - 1] : null;
  const canContinue = step === 0
    ? Boolean(profile)
    : step === 4
      ? Boolean(contact.name.trim() && contact.phone.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
      : currentQuestion?.type === 'text'
        ? Boolean((answers[currentQuestion.id] as string)?.trim())
        : Boolean(currentQuestion && (Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id].length : answers[currentQuestion.id]));

  useEffect(() => {
    if (!started || submitted) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (event.key === 'Enter' && !typing && canContinue && step < 4) {
        event.preventDefault();
        goTo(step + 1);
      }
      if (!typing && currentQuestion?.options && event.key.length === 1) {
        const option = currentQuestion.options[optionLetters.indexOf(event.key.toUpperCase())];
        if (option) chooseOption(currentQuestion, option);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, submitted, step, currentQuestion, canContinue, answers]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { profile, ...answers, contact },
          submissionId: crypto.randomUUID(),
          website: '',
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'El envío aún no está configurado. Inténtalo de nuevo más tarde.');
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo enviar la encuesta. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const screenAnimation = reduceMotion ? {} : {
    initial: { opacity: 0, y: direction * 64 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: direction * -48 },
    transition: { duration: 0.34, ease: [0.2, 0.7, 0.2, 1] },
  };

  const renderOptions = (question: Question) => (
    <div className={question.type === 'scale' ? 'grid grid-cols-5 gap-2' : 'flex flex-col gap-2'}>
      {question.options?.map((option, index) => {
        const answer = answers[question.id];
        const selected = Array.isArray(answer) ? answer.includes(option) : answer === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => chooseOption(question, option)}
            className={`group flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-base md:text-lg transition-all duration-200 ${
              question.type === 'scale' ? 'justify-center' : ''
            }`}
            style={{
              color: '#40352C',
              borderColor: selected ? '#40352C' : 'rgba(64,53,44,0.14)',
              backgroundColor: selected ? 'rgba(64,53,44,0.1)' : 'rgba(64,53,44,0.045)',
              boxShadow: selected ? '0 0 0 1px #40352C' : 'none',
            }}
          >
            {question.type !== 'scale' && (
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded border text-xs"
                style={{ backgroundColor: selected ? '#40352C' : '#FFFFFF', color: selected ? '#FFFFFF' : '#40352C', borderColor: 'rgba(64,53,44,0.25)' }}
              >
                {selected ? '✓' : optionLetters[index]}
              </span>
            )}
            <span>{option}</span>
          </button>
        );
      })}
      {question.type === 'scale' && (
        <div className="col-span-5 mt-1 flex justify-between text-xs" style={{ color: 'rgba(64,53,44,0.55)' }}>
          {question.hint?.split('|').map((label) => <span key={label}>{label}</span>)}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Encuesta — Stable Eye</title>
        <meta name="description" content="Ayúdanos a construir una mejor forma de cuidar caballos." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <main className="relative min-h-[100svh] overflow-hidden bg-white text-[#40352C]">
        {started && !submitted && (
          <>
            <div className="fixed inset-x-0 top-0 z-30 h-1 bg-[#40352C]/15">
              <motion.div className="h-full bg-[#40352C]" animate={{ width: `${((step + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.35 }} />
            </div>
            <Link to="/" className="fixed left-5 top-5 z-30 grid h-10 w-10 place-items-center rounded-full border bg-white/90 backdrop-blur" style={{ borderColor: 'rgba(64,53,44,0.14)' }} aria-label="Volver al inicio">
              <Icon name="X" size={18} />
            </Link>
          </>
        )}

        <div className="flex min-h-[100svh] items-center justify-center px-6 py-20 md:px-12">
          <AnimatePresence mode="wait" initial={false}>
            {!started ? (
              <motion.section key="welcome" className="mx-auto w-full max-w-2xl text-center" {...screenAnimation}>
                <img src="/logo-icon-dark.png" alt="Stable Eye" className="mx-auto mb-8 h-24 w-auto md:h-32" />
                <h1 className="mb-4 text-3xl font-semibold leading-tight md:text-4xl" style={{ fontFamily: 'Syne, sans-serif' }}>Bienvenido a Stable Eye</h1>
                <p className="mx-auto mb-8 max-w-xl whitespace-pre-line text-base leading-relaxed md:text-lg" style={{ color: 'rgba(64,53,44,0.68)' }}>
                  El guardián invisible para caballos: una nueva forma de monitorear su bienestar, detectar señales tempranas y mantenerte informado, incluso cuando no estás en el establo.{'\n\n'}Tu experiencia nos ayudará a construir una solución útil para la realidad del cuidado equino.
                </p>
                <button type="button" onClick={() => setStarted(true)} className="rounded-lg bg-[#40352C] px-6 py-3 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0">Comenzar</button>
                <span className="mt-4 block text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>◷ Toma 2 minutos</span>
              </motion.section>
            ) : submitted ? (
              <motion.section key="success" className="mx-auto w-full max-w-xl text-center" {...screenAnimation}>
                <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[#40352C] text-2xl text-white">✓</div>
                <h1 className="mb-3 text-3xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>¡Gracias por tu tiempo!</h1>
                <p className="mb-8 text-lg" style={{ color: 'rgba(64,53,44,0.62)' }}>Tu experiencia nos ayuda a construir Stable Eye.</p>
                <Link to="/" className="inline-flex rounded-lg border px-5 py-2.5 font-medium" style={{ borderColor: 'rgba(64,53,44,0.2)' }}>Volver al inicio</Link>
              </motion.section>
            ) : (
              <motion.section key={step} className="mx-auto w-full max-w-2xl" {...screenAnimation}>
                <div className="relative mb-8">
                  <span className="absolute -left-7 top-1 hidden rounded bg-[#40352C] px-1.5 py-0.5 text-[11px] text-white sm:block">{step + 1}</span>
                  <h1 tabIndex={-1} className="text-2xl font-normal leading-snug outline-none md:text-[28px]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {step === 0 ? '¿Cuál es tu perfil?' : step === 4 ? 'Por favor, deja tus datos para que podamos contactarte' : currentQuestion?.title}
                  </h1>
                  {currentQuestion?.type === 'multiple' && <p className="mt-3 text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Selecciona todas las opciones que correspondan</p>}
                </div>

                {step === 0 && (
                  <div className="flex flex-col gap-2">
                    {profileOptions.map((option, index) => (
                      <button key={option.value} type="button" onClick={() => chooseProfile(option.value)} className="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-lg transition-colors hover:bg-[#40352C]/10" style={{ borderColor: profile === option.value ? '#40352C' : 'rgba(64,53,44,0.14)', backgroundColor: profile === option.value ? 'rgba(64,53,44,0.1)' : 'rgba(64,53,44,0.045)' }}>
                        <span className="grid h-6 w-6 place-items-center rounded border bg-white text-xs" style={{ borderColor: 'rgba(64,53,44,0.25)' }}>{optionLetters[index]}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion?.type === 'text' && (
                  <input autoFocus type="number" min="0" inputMode="numeric" value={(answers[currentQuestion.id] as string) || ''} onChange={(event) => setAnswers({ ...answers, [currentQuestion.id]: event.target.value })} placeholder="Escribe tu respuesta..." className="w-full border-b-2 bg-transparent py-3 text-2xl outline-none placeholder:text-[#40352C]/25" style={{ borderColor: '#40352C' }} />
                )}
                {currentQuestion && currentQuestion.type !== 'text' && renderOptions(currentQuestion)}

                {step === 4 && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input autoFocus required value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder="Nombre y apellido *" className="w-full rounded-lg border bg-white px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#40352C]/30" style={{ borderColor: 'rgba(64,53,44,0.2)' }} />
                    <input required type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder="Teléfono con prefijo internacional *" className="w-full rounded-lg border bg-white px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#40352C]/30" style={{ borderColor: 'rgba(64,53,44,0.2)' }} />
                    <input required type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="Correo electrónico *" className="w-full rounded-lg border bg-white px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#40352C]/30" style={{ borderColor: 'rgba(64,53,44,0.2)' }} />
                    {submitError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}
                    <button type="submit" disabled={!canContinue || isSubmitting} className="rounded-lg bg-[#40352C] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                      {isSubmitting ? 'Enviando…' : 'Enviar respuestas'}
                    </button>
                  </form>
                )}

                {step > 0 && step < 4 && currentQuestion?.type !== 'single' && currentQuestion?.type !== 'scale' && (
                  <button type="button" disabled={!canContinue} onClick={() => goTo(step + 1)} className="mt-6 rounded-lg bg-[#40352C] px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">
                    Aceptar <span className="ml-2 text-xs font-normal opacity-70">Enter ↵</span>
                  </button>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {started && !submitted && (
          <div className="fixed bottom-5 right-5 z-30 flex overflow-hidden rounded-lg border bg-white shadow-sm" style={{ borderColor: 'rgba(64,53,44,0.16)' }}>
            <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0} className="grid h-10 w-11 place-items-center border-r disabled:opacity-25" style={{ borderColor: 'rgba(64,53,44,0.12)' }} aria-label="Pregunta anterior"><Icon name="ChevronUp" size={18} /></button>
            <button type="button" onClick={() => goTo(step + 1)} disabled={!canContinue || step === 4} className="grid h-10 w-11 place-items-center disabled:opacity-25" aria-label="Pregunta siguiente"><Icon name="ChevronDown" size={18} /></button>
          </div>
        )}
      </main>
    </>
  );
};

export default Survey;