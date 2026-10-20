import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import { useHorseDetails } from '../../features/horse-details/useHorseDetails';
import { formatDateOfBirth } from '../../features/horse-details/formatDateOfBirth';
import Image from '../../components/AppImage';

const detailRows = [
  { label: 'Nombre', key: 'name' },
  { label: 'Raza', key: 'breed' },
  { label: 'Fecha de nacimiento', key: 'date_of_birth' },
  { label: 'Edad', key: 'age' },
  { label: 'Sexo', key: 'gender' },
  { label: 'Color', key: 'color' },
  { label: 'Box', key: 'stall_number' },
  { label: 'Peso (kg)', key: 'weight' },
  { label: 'Alzada (manos)', key: 'height' },
  { label: 'Notas médicas', key: 'medical_notes' },
  { label: 'Número registro', key: 'registration_number' },
  { label: 'Dieta', key: 'dietary_requirements' },
  { label: 'Contacto emergencia', key: 'emergency_contact' },
  { label: 'Número emergencia', key: 'emergency_phone' },
  { label: 'Veterinario', key: 'veterinarian' },
  { label: 'Teléfono veterinario', key: 'veterinarian_phone' },
  { label: 'Aseguradora', key: 'insurance_details' },
] as const;

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  return String(value);
};

const HorseDetailsPage: React.FC = () => {
  const { horse, isLoading, error, retry, needsLogin } = useHorseDetails();

  return (
    <div className="min-h-[100dvh] bg-[#F8F6F2] text-[#40352C]">
      <Header />
      <main className="px-4 pb-28 pt-28 sm:px-6 md:pb-12 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/horse-list"
            className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-[#756044] transition-colors hover:text-[#40352C] focus:outline-none focus:ring-2 focus:ring-[#8C7350] focus:ring-offset-2"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Volver a caballos
          </Link>

          {isLoading ? (
            <section aria-label="Cargando ficha" className="overflow-hidden rounded-2xl border border-[#E7E0D5] bg-[#FFFDF9]">
              <div className="flex flex-col gap-6 border-b border-[#EEE8DE] p-6 sm:flex-row sm:items-center sm:p-8">
                <div className="h-28 w-28 shrink-0 animate-pulse rounded-2xl bg-[#F1EDE5]" />
                <div className="w-full space-y-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-[#F1EDE5]" />
                  <div className="h-8 w-2/3 animate-pulse rounded bg-[#F1EDE5]" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#F1EDE5]" />
                </div>
              </div>
              <div className="space-y-0 px-6 py-3 sm:px-8">
                {detailRows.slice(0, 7).map(({ label }) => (
                  <div key={label} className="flex animate-pulse justify-between gap-6 border-b border-[#F0EBE2] py-4">
                    <div className="h-3 w-32 rounded bg-[#F1EDE5]" />
                    <div className="h-3 w-40 rounded bg-[#F1EDE5]" />
                  </div>
                ))}
              </div>
            </section>
          ) : needsLogin ? (
            <section className="rounded-2xl border border-[#E7E0D5] bg-[#FFFDF9] px-6 py-14 text-center sm:px-10" role="status">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8668]">Acceso a la ficha</p>
              <h1 className="mt-3 font-['Syne',sans-serif] text-2xl font-bold">Inicia sesión para continuar</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#827665]">La información del caballo solo está disponible para usuarios autenticados.</p>
              <Link to="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#40352C] px-5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#594A3D] focus:outline-none focus:ring-2 focus:ring-[#8C7350] focus:ring-offset-2">
                Ir a iniciar sesión
              </Link>
            </section>
          ) : error ? (
            <section className="rounded-2xl border border-[#E8D9D2] bg-[#FBF4F0] p-6 sm:p-8" role="alert">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A35F4C]">No se pudo cargar</p>
              <h1 className="mt-2 font-['Syne',sans-serif] text-2xl font-bold text-[#6E4035]">No se pudo cargar la ficha</h1>
              <p className="mt-2 text-sm leading-6 text-[#80645B]">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#756044] transition-colors hover:bg-[#F4E9E2] focus:outline-none focus:ring-2 focus:ring-[#8C7350]"
              >
                <RefreshCw size={15} aria-hidden="true" />
                Reintentar
              </button>
            </section>
          ) : !horse ? (
            <section className="rounded-2xl border border-[#E7E0D5] bg-[#FFFDF9] px-6 py-14 text-center sm:px-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8668]">Ficha no disponible</p>
              <h1 className="mt-3 font-['Syne',sans-serif] text-2xl font-bold">Caballo no encontrado</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#827665]">No se encontró el caballo o no tienes acceso a su información.</p>
              <Link to="/horse-list" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DED6C9] px-5 text-sm font-semibold text-[#756044] transition-colors hover:bg-[#F4F0E9] focus:outline-none focus:ring-2 focus:ring-[#8C7350] focus:ring-offset-2">
                Volver a caballos
              </Link>
            </section>
          ) : (
            <article className="overflow-hidden rounded-2xl border border-[#E7E0D5] bg-[#FFFDF9] shadow-[0_10px_30px_rgba(64,53,44,0.05)]">
              <header className="flex flex-col gap-6 border-b border-[#EEE8DE] bg-[#F4F0E9] p-6 sm:flex-row sm:items-center sm:p-8">
                  <Image
                    src={horse.profile_photo_url?.trim() ? horse.profile_photo_url : '/assets/images/no_image.png'}
                    alt={`Retrato de ${horse.name}`}
                    className="h-28 w-28 shrink-0 rounded-2xl border border-[#E5DDD0] object-cover"
                  />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8668]">Ficha del caballo</p>
                  <h1 className="mt-2 break-words font-['Syne',sans-serif] text-3xl font-bold tracking-tight sm:text-4xl">{horse.name || '—'}</h1>
                  <p className="mt-2 text-sm text-[#827665]">Información de cuidado y contacto</p>
                </div>
                <Link
                  to={`/horse-timeline?horseId=${encodeURIComponent(horse.id)}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#40352C] px-4 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#594A3D] focus:outline-none focus:ring-2 focus:ring-[#8C7350] focus:ring-offset-2 sm:ml-auto"
                >
                  Ver línea de tiempo
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <tbody className="divide-y divide-[#F0EBE2]">
                    {detailRows.map(({ label, key }) => (
                      <tr key={key} className="align-top transition-colors hover:bg-[#FBF9F5]">
                        <th scope="row" className="w-[42%] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A7C69] sm:w-[34%] sm:px-8">
                          {label}
                        </th>
                        <td className="whitespace-pre-wrap break-words px-6 py-4 text-sm leading-6 text-[#40352C] sm:px-8">
                          {key === 'date_of_birth' ? formatDateOfBirth(horse.date_of_birth) : displayValue(horse[key])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
};

export default HorseDetailsPage;
