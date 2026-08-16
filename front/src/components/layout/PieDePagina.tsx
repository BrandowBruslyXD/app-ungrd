import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';
import FondoDeSeccion from '@/components/ui/FondoDeSeccion';
import Logotipo from '@/components/shared/Logotipo';
import { FOTOS } from '@/lib/fotos';

const ENLACES = [
  { to: '/', clave: 'nav.presentation' },
  { to: '/reportar', clave: 'nav.report' },
  { to: '/mis-reportes', clave: 'nav.myReports' },
  { to: '/ayudas', clave: 'nav.aid' },
  { to: '/alertas', clave: 'nav.alerts' },
] as const;

interface PieDePaginaProps {
  /**
   * Versión completa, con fondo fotográfico y el descargo legal.
   *
   * Solo en la portada. En las vistas internas va la barra delgada: quien está
   * llenando un censo casa por casa no necesita leer en cada pantalla qué es
   * ConectaRiesgo.
   */
  completo?: boolean;
}

export default function PieDePagina({ completo = false }: PieDePaginaProps) {
  const { t } = useTranslation();

  /* ── Barra delgada: lo mínimo que sirve tener siempre a mano ──────────── */
  if (!completo) {
    return (
      <footer className="mx-auto w-full max-w-6xl px-4 pb-6 lg:px-0">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-ficha border border-papel-borde bg-papel/85 px-4 py-3 backdrop-blur">
          <nav aria-label={t('footer.linksTitle')}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {ENLACES.map(({ to, clave }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm font-semibold text-azul-700 hover:underline hover:underline-offset-4"
                  >
                    {t(clave)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <a
            href="tel:123"
            className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-control bg-alerta-600 px-3 text-sm font-bold text-white hover:bg-alerta-700"
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('footer.emergencyLine')}
          </a>
        </div>
      </footer>
    );
  }

  /* ── Versión completa, solo en la portada ─────────────────────────────── */
  return (
    <footer className="sobre-oscuro relative isolate mt-12 text-white">
      <FondoDeSeccion fotos={[FOTOS.montanaEntreNubes]} velo="fuerte" />

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="flex items-center gap-2.5 text-lg font-bold">
              <Logotipo tamano="sm" />
              {t('brand.conecta')}
              {t('brand.riesgo')}
            </p>
            <p className="mt-2 leading-relaxed text-azul-100">{t('footer.what')}</p>
          </div>

          <nav aria-label={t('footer.linksTitle')}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 sm:flex-col sm:gap-y-1.5">
              {ENLACES.map(({ to, clave }) => (
                <li key={to}>
                  <Link to={to} className="font-semibold text-white hover:text-oro-300">
                    {t(clave)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <a
            href="tel:123"
            className="inline-flex min-h-control shrink-0 items-center gap-2 rounded-control bg-alerta-600 px-5 font-bold text-white hover:bg-alerta-700"
          >
            <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('footer.emergencyLine')}
          </a>
        </div>

        <p className="mt-7 border-t border-white/20 pt-5 text-sm leading-relaxed text-azul-200">
          {t('footer.disclaimer')} {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
