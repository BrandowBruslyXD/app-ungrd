import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, CalendarDays, FileText, Mail, ScrollText } from 'lucide-react';
import type { PaqueteMinisterio } from '@/experiencias/sala/ungrd/types/paquete';
import { formatearFecha } from '@/experiencias/sala/ungrd/utils/resumenPaquete';
import InsigniaEstadoPaquete from '@/experiencias/sala/ungrd/components/InsigniaEstadoPaquete';

interface EncabezadoPaqueteProps {
  paquete: PaqueteMinisterio;
  /** Los demás paquetes del mismo evento, para saltar entre ministerios sin volver atrás. */
  otrosPaquetes: readonly PaqueteMinisterio[];
}

/** Quién recibe, por qué evento, bajo qué declaratoria y en qué estado va el paquete. */
export default function EncabezadoPaquete({ paquete, otrosPaquetes }: EncabezadoPaqueteProps) {
  const { t } = useTranslation();
  const { evento } = paquete;

  const declaratoria = [
    t(`paquete.declaratoria.${evento.declaratoria}`),
    evento.nivelDeclaratoria ? t(`paquete.nivelDeclaratoria.${evento.nivelDeclaratoria}`) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="card-pad">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
            <span>{t('paquete.migaPanel')}</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono text-slate-600">{paquete.codigo}</span>
          </p>

          <h1 className="mt-1.5 flex flex-wrap items-center gap-2.5 text-2xl font-bold text-slate-900">
            <Building2 className="h-6 w-6 shrink-0 text-ungrd-600" aria-hidden="true" />
            {paquete.entidad}
          </h1>

          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-ungrd-50 px-2.5 py-1 text-sm font-semibold text-ungrd-700">
              {t('paquete.etiquetaSector')} {t(`paquete.sector.${paquete.sector}`)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="break-all font-mono text-sm">{paquete.correoDestino}</span>
            </span>
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <InsigniaEstadoPaquete estado={paquete.estado} />
          {paquete.enviadoEn !== null && (
            <p className="text-sm text-slate-500">
              {t('paquete.enviadoEl', { fecha: formatearFecha(paquete.enviadoEn) })}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <DatoEncabezado
          icono={FileText}
          termino={t('paquete.evento')}
          descripcion={evento.nombre}
          apoyo={evento.codigo}
        />
        <DatoEncabezado
          icono={ScrollText}
          termino={t('paquete.declaratoriaTitulo')}
          descripcion={declaratoria}
          apoyo={evento.numeroDecreto ?? t('paquete.sinDecreto')}
        />
        <DatoEncabezado
          icono={CalendarDays}
          termino={t('paquete.fechaDeclaratoria')}
          descripcion={
            evento.fechaDeclaratoria ? formatearFecha(evento.fechaDeclaratoria) : t('paquete.sinFecha')
          }
          apoyo={t('paquete.amparaElEnvio')}
        />
      </dl>

      {otrosPaquetes.length > 0 && (
        <nav aria-label={t('paquete.otrosPaquetes')} className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-sm font-medium text-slate-500">{t('paquete.otrosPaquetes')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {otrosPaquetes.map((otro) => (
              <li key={otro.codigo}>
                <Link
                  to={`/panel/paquetes/${otro.codigo}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-ungrd-300 hover:bg-ungrd-50 hover:text-ungrd-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400 focus-visible:ring-offset-2"
                >
                  {t(`paquete.sector.${otro.sector}`)}
                  <span className="text-slate-500">{t(`paquete.estado.${otro.estado}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

interface DatoEncabezadoProps {
  icono: typeof FileText;
  termino: string;
  descripcion: string;
  apoyo: string;
}

function DatoEncabezado({ icono: Icono, termino, descripcion, apoyo }: DatoEncabezadoProps) {
  return (
    <div className="flex gap-2.5">
      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{termino}</dt>
        <dd className="text-base font-semibold text-slate-800">{descripcion}</dd>
        <dd className="text-sm text-slate-600">{apoyo}</dd>
      </div>
    </div>
  );
}
