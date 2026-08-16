import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  FileText,
  Search,
  ShieldAlert,
  Flame,
  ClipboardList,
  Building2,
  ArrowRight,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';
import Foto from '@/components/ui/Foto';
import Aviso from '@/components/ui/Aviso';
import EscaleraConfianza from '@/components/ui/EscaleraConfianza';
import PreguntasFrecuentes from '@/components/ui/PreguntasFrecuentes';
import { usePreguntasFrecuentes } from '@/hooks/usePreguntasFrecuentes';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { useDatosEstructurados } from '@/hooks/useDatosEstructurados';
import RevelarAlBajar from '@/components/ui/RevelarAlBajar';
import FondoDeSeccion from '@/components/ui/FondoDeSeccion';
import { FOTOS, FONDOS_PORTADA } from '@/lib/fotos';
import type { DemoView } from '@/types';

interface LandingProps {
  onRoleChange: (role: DemoView) => void;
}

interface TarjetaRol {
  rol: Extract<DemoView, 'Socorro' | 'Brigadista' | 'Gestor'>;
  claveTitulo: string;
  claveCuerpo: string;
  icono: LucideIcon;
  foto: (typeof FOTOS)[keyof typeof FOTOS];
  alt: string;
}

const ROLES: readonly TarjetaRol[] = [
  {
    rol: 'Socorro',
    claveTitulo: 'landing.roleSocorroTitle',
    claveCuerpo: 'landing.roleSocorroBody',
    icono: Flame,
    foto: FOTOS.rescateInundacion,
    alt: 'Equipo de socorro navegando en bote por una zona inundada.',
  },
  {
    rol: 'Brigadista',
    claveTitulo: 'landing.roleBrigadistaTitle',
    claveCuerpo: 'landing.roleBrigadistaBody',
    icono: ClipboardList,
    foto: FOTOS.recorridoEnCampo,
    alt: 'Un grupo de personas recorriendo un terreno verde en zona rural.',
  },
  {
    rol: 'Gestor',
    claveTitulo: 'landing.roleGestorTitle',
    claveCuerpo: 'landing.roleGestorBody',
    icono: Building2,
    foto: FOTOS.valleRioAereo,
    alt: 'Vista aérea de un río atravesando un valle entre montañas, en Medellín.',
  },
];

/**
 * Página de entrada pública.
 *
 * Sirve a dos públicos con necesidades opuestas y por eso el orden de la página
 * no es negociable:
 *
 * 1. Primero el ciudadano en emergencia, que llega con prisa y puede no saber
 *    leer bien. Su acción está arriba, es la única grande, y no le pide cuenta.
 * 2. Después el personal de respuesta, que entra con usuario y sabe lo que
 *    busca. Va al final porque no necesita que lo convenzan de nada.
 *
 * El aviso del 123 va antes que todo lo demás: si hay una vida en riesgo, esta
 * página es el lugar equivocado y hay que decírselo de una.
 */
export default function Landing({ onRoleChange }: LandingProps) {
  const { t } = useTranslation();
  const preguntas = usePreguntasFrecuentes();

  useTituloPagina(t('meta.landing.title'), t('meta.landing.description'));

  // El esquema de preguntas se arma con las mismas preguntas que se pintan, no
  // con una copia escrita aparte que tarde o temprano se desincroniza.
  useDatosEstructurados(
    'faq-landing',
    useMemo(
      () => ({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: 'es-CO',
        mainEntity: preguntas.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      }),
      [preguntas],
    ),
  );

  return (
    <div className="animate-fade-in pb-20 lg:pb-0">
      {/* ── Portada ────────────────────────────────────────────────────── */}
      <section className="sobre-oscuro relative isolate">
        {/* El fondo va cambiando de fotografía cada pocos segundos: es el
            territorio al que sirve la herramienta, no un color plano. */}
        <FondoDeSeccion fotos={FONDOS_PORTADA} velo="medio" />

        <div className="mx-auto max-w-7xl px-4 py-12 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-20">
          <div className="lg:col-span-7">
            <p className="text-sm font-bold uppercase tracking-widest text-oro-400">
              {t('landing.eyebrow')}
            </p>
            <h1 className="mt-3 text-3xl text-white sm:text-4xl lg:text-5xl">{t('landing.title')}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-azul-100">
              {t('landing.subtitle')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/reportar" className="btn-accent btn-grande sm:w-auto sm:px-8">
                <FileText className="h-6 w-6" aria-hidden="true" />
                {t('landing.reportNow')}
              </Link>
              <Link
                to="/mis-reportes"
                className="btn btn-grande border-2 border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto sm:px-8"
              >
                <Search className="h-6 w-6" aria-hidden="true" />
                {t('landing.checkCode')}
              </Link>
              <Link
                to="/tutorial"
                className="btn btn-grande border-2 border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto sm:px-8"
              >
                <PlayCircle className="h-6 w-6" aria-hidden="true" />
                Ver tutorial
              </Link>
            </div>

            <p className="mt-4 text-azul-200">{t('landing.noAccount')}</p>
          </div>

          {/*
            El talón como prueba de la promesa: esto es lo que usted recibe.
            Va suelto sobre la portada, sin caja de vidrio alrededor. Antes
            estaba metido dentro de un marco translúcido y quedaban dos bordes
            encajados uno dentro del otro, con tratamientos distintos: se leía
            como un error, no como un diseño.
          */}
          <div className="mt-10 lg:col-span-5 lg:mt-0 lg:pl-4">
            <div className="mx-auto max-w-sm">
              <div className="talon px-6 py-6 shadow-2xl shadow-azul-950/40">
                <p className="text-sm font-bold uppercase tracking-wider text-oro-300">
                  {t('ui.stub.label')}
                </p>
                <p className="talon-codigo mt-2">RPT-2026-08-16-0042-K7M4</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-oro-400 px-3 py-1.5 text-sm font-bold text-tinta-900">
                    {t('trust.verificado')}
                  </span>
                  <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold text-white">
                    {t('status.EnAtencion')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Riesgo de vida ─────────────────────────────────────────────── */}
      <section className="border-b-4 border-alerta-600 bg-alerta-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center lg:px-8">
          <ShieldAlert className="h-9 w-9 shrink-0 text-alerta-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg text-alerta-900">{t('landing.emergencyTitle')}</h2>
            <p className="mt-1 text-alerta-900">{t('landing.emergencyBody')}</p>
          </div>
          <a href="tel:123" className="btn-danger shrink-0 sm:min-w-[12rem]">
            <Phone className="h-6 w-6" aria-hidden="true" />
            {t('landing.emergencyCall')}
          </a>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl bg-papel px-4 shadow-[0_0_40px_rgba(4,25,60,0.10)] lg:my-8 lg:rounded-ficha lg:border lg:border-papel-borde lg:px-8">
        {/* ── En resumen ───────────────────────────────────────────────
            Lo esencial en cuatro frases, arriba del todo. Sirve a quien tiene
            prisa y a quien lee con dificultad: si solo lee esto, ya sabe lo
            necesario para actuar. */}
        <RevelarAlBajar>
        <section className="py-8 sm:py-12">
          <div className="ficha overflow-hidden">
            <div className="ficha-banda">
              <h2 className="text-lg font-bold text-white">{t('landing.tldrTitle')}</h2>
            </div>
            <ul className="divide-y divide-papel-borde">
              {['tldr1', 'tldr2', 'tldr3', 'tldr4'].map((clave) => (
                <li key={clave} className="flex gap-3 px-4 py-3.5 sm:px-5">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-oro-500" aria-hidden="true" />
                  <span className="text-lg leading-snug">{t(`landing.${clave}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </RevelarAlBajar>

      <RevelarAlBajar>
        {/* ── La distinción que gobierna el producto ───────────────────── */}
        <section className="pb-10 sm:pb-14">
          <Aviso tono="espera" titulo={t('landing.distinctionTitle')}>
            <p className="leading-relaxed">{t('landing.distinctionBody')}</p>
            <p className="mt-2 font-bold">{t('landing.distinctionFree')}</p>
          </Aviso>
        </section>
      </RevelarAlBajar>

        {/* ── Cómo funciona ────────────────────────────────────────────── */}
        <RevelarAlBajar>
        <section className="pb-12 sm:pb-16">
          <h2 className="text-2xl sm:text-3xl">{t('landing.howTitle')}</h2>
          <p className="mt-2 text-lg text-tinta-600">{t('landing.howLead')}</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-center">
            <ol className="space-y-4">
              {[
                { n: 1, titulo: 'landing.how1Title', cuerpo: 'landing.how1Body' },
                { n: 2, titulo: 'landing.how2Title', cuerpo: 'landing.how2Body' },
                { n: 3, titulo: 'landing.how3Title', cuerpo: 'landing.how3Body' },
              ].map(({ n, titulo, cuerpo }) => (
                <li key={n} className="ficha flex gap-4 p-4 sm:p-5">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-azul-600 text-xl font-bold text-white"
                    aria-hidden="true"
                  >
                    {n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg">{t(titulo)}</h3>
                    <p className="mt-1 leading-relaxed text-tinta-600">{t(cuerpo)}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Foto
              fuente={FOTOS.puebloJerico}
              alt="La iglesia de Jericó sobresaliendo entre los tejados del pueblo."
              proporcion="ancha"
              className="rounded-ficha"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        </section>
        </RevelarAlBajar>

        {/* ── La escalera de confianza ─────────────────────────────────── */}
        <RevelarAlBajar>
        <section className="pb-12 sm:pb-16">
          <div className="ficha overflow-hidden">
            <div className="ficha-banda">
              <h2 className="text-lg font-bold text-white">{t('landing.trustTitle')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="mb-5 max-w-2xl text-tinta-600">{t('landing.trustLead')}</p>
              <div className="max-w-2xl">
                <EscaleraConfianza nivel="verificado" />
              </div>
            </div>
          </div>
        </section>
        </RevelarAlBajar>

        {/* ── Personal de respuesta ────────────────────────────────────── */}
        <RevelarAlBajar>
        <section className="pb-14 sm:pb-20">
          <h2 className="text-2xl sm:text-3xl">{t('landing.staffTitle')}</h2>
          <p className="mt-2 max-w-2xl text-lg text-tinta-600">{t('landing.staffLead')}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map(({ rol, claveTitulo, claveCuerpo, icono: Icono, foto, alt }) => (
              <Link
                key={rol}
                to="/entrar"
                onClick={() => onRoleChange(rol)}
                className="ficha-pulsable group flex flex-col overflow-hidden"
              >
                <Foto fuente={foto} alt={alt} proporcion="ancha" sizes="(min-width: 640px) 33vw, 100vw" />
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-center gap-2.5">
                    <Icono className="h-6 w-6 shrink-0 text-azul-600" aria-hidden="true" />
                    <h3 className="text-lg">{t(claveTitulo)}</h3>
                  </div>
                  <p className="mt-2 flex-1 leading-relaxed text-tinta-600">{t(claveCuerpo)}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-bold text-azul-600 group-hover:text-azul-700">
                    {t('landing.staffEnter')}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        </RevelarAlBajar>

        {/* ── Preguntas frecuentes ─────────────────────────────────────── */}
        <RevelarAlBajar>
        <section className="pb-14 sm:pb-20">
          <h2 className="text-2xl sm:text-3xl">{t('faq.title')}</h2>
          <p className="mt-2 max-w-2xl text-lg text-tinta-600">{t('faq.lead')}</p>
          <div className="mt-6 max-w-3xl">
            <PreguntasFrecuentes preguntas={preguntas} />
            <p className="mt-4 text-tinta-500">{t('landing.faqMore')}</p>

            {/* La aclaración de qué es y qué no es esta herramienta cierra la
                portada. También va en el pie de toda la aplicación, pero aquí
                tiene que estar sí o sí: es la página que se comparte. */}
            <div className="mt-6">
              <Aviso tono="info">{t('landing.footerNote')}</Aviso>
            </div>
          </div>
        </section>
        </RevelarAlBajar>
      </div>

      {/* El pie de página lo pone la estructura de la aplicación, no esta
          pantalla: antes solo existía aquí y el resto de las vistas terminaban
          en blanco al llegar al final. */}

      {/*
        Acción fija en móvil.
        Aparece solo en pantallas pequeñas y solo en la portada: quien llegó
        aquí con una emergencia no debería tener que volver arriba a buscar el
        botón después de leer. En escritorio no se muestra porque el encabezado
        y la portada ya están a la vista.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-azul-700 bg-white/95 p-3 backdrop-blur lg:hidden">
        <Link to="/reportar" className="btn-accent btn-grande">
          <FileText className="h-6 w-6" aria-hidden="true" />
          {t('landing.stickyCta')}
        </Link>
      </div>
    </div>
  );
}
