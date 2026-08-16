import { Link } from 'react-router-dom';
import LightBackground from '../components/LightBackground';
import ParticlesBackground from '../components/ParticlesBackground';
import {
  IconArrowRight,
  IconBolt,
  IconChart,
  IconChat,
  IconCheck,
  IconFlow,
  IconLayers,
  IconLock,
  IconShield,
  IconSpark,
} from '../components/icons';
import { Reveal } from '../components/landing/motion';
import { ChatMock, FlowMock, StatsMock } from '../components/landing/mocks';
import HeroShowcase from '../components/landing/HeroShowcase';
import ConnectorsCarousel from '../components/landing/ConnectorsCarousel';
import HowItWorksFlow from '../components/landing/HowItWorksFlow';
import WhatsappFab from '../components/landing/WhatsappFab';
import { CASES, FEATURES, TINT, TRUST } from '../components/landing/landing.data';

/* Row de detalle con mockup (alterna lado) */
function DetailRow({ reverse, badge, title, desc, points, children }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={reverse ? 'lg:order-2' : ''}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">{badge}</span>
        <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h3>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{desc}</p>
        <ul className="mt-5 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><IconCheck className="h-3.5 w-3.5" /></span>
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={120} className={`flex justify-center ${reverse ? 'lg:order-1' : ''}`}>
        <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-[0_30px_70px_-30px_rgba(16,120,90,0.4)] backdrop-blur-md">{children}</div>
      </Reveal>
    </div>
  );
}

/* ─────────────────────────────── Página ────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#eef3f9] text-slate-800">
      {/* Fondo claro: gradient-mesh + red de nodos animada (IA/flujos) + retícula */}
      <LightBackground />
      <ParticlesBackground />
      {/* Retícula tenue exclusiva de la landing (sobre el fondo compartido). */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(100,116,139,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,.10) 1px, transparent 1px)', backgroundSize: '54px 54px', maskImage: 'radial-gradient(80% 50% at 50% 0%, #000 30%, transparent 90%)', WebkitMaskImage: 'radial-gradient(80% 50% at 50% 0%, #000 30%, transparent 90%)' }} />

      {/* NAV sticky */}
      <nav className="sticky top-0 z-40 border-b border-white/50 bg-white/60 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-5 py-3 sm:px-8 xl:px-[4vw]">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-lg font-extrabold text-ink-950 shadow-glow-brand">W</span>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight text-slate-800">WA Bots</p>
              <p className="text-[11px] text-slate-500">Plataforma empresarial</p>
            </div>
          </a>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#conexiones" className="transition hover:text-slate-900">Conexiones</a>
            <a href="#funciones" className="transition hover:text-slate-900">Funciones</a>
            <a href="#proceso" className="transition hover:text-slate-900">Cómo funciona</a>
            <a href="#producto" className="transition hover:text-slate-900">Producto</a>
            <a href="#casos" className="transition hover:text-slate-900">Casos de uso</a>
          </div>
          <Link to="/login" className="btn-primary-light px-4 py-2">
            <IconLock className="h-4 w-4" /> Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Contenedor SIN tope de ancho: el contenido usa TODA la pantalla con
          márgenes proporcionales (4vw crece con el monitor). Nada de "hoja"
          centrada con mares de margen a los lados. */}
      <div id="top" className="w-full px-5 sm:px-8 xl:px-[4vw]">
        {/* ═════════════════ HERO ═════════════════ */}
        <section className="relative grid items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:py-20">
          {/* glow decorativo detrás del hero */}
          <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
              <IconBolt className="h-3.5 w-3.5 text-brand" /> Automatización para WhatsApp Business
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl">
              Automatice la atención de su empresa en{' '}
              <span className="bg-gradient-to-r from-brand-dark via-brand to-cyan-glow bg-clip-text text-transparent">WhatsApp</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 xl:max-w-2xl xl:text-xl">
              Diseñe flujos conversacionales, responda con inteligencia artificial y agende citas de forma
              automática. Una sola plataforma para operar, con datos aislados por cliente y seguridad de
              nivel empresarial.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn-primary-light px-6 py-3">
                <IconLock className="h-4 w-4" /> Iniciar sesión
              </Link>
              <a href="#funciones" className="btn-ghost-light px-6 py-3">
                Ver funcionalidades <IconArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><IconCheck className="h-4 w-4 text-brand" /> Atención 24/7</span>
              <span className="inline-flex items-center gap-1.5"><IconCheck className="h-4 w-4 text-brand" /> Sin código</span>
              <span className="inline-flex items-center gap-1.5"><IconCheck className="h-4 w-4 text-brand" /> Cifrado de grado bancario</span>
            </div>
          </div>

          {/* Showcase 3D del producto (tarjetas clicables) */}
          <div className="relative animate-fade-in-up [animation-delay:0.12s]">
            <HeroShowcase />
          </div>
        </section>

        {/* ═════════════════ CONEXIONES (carrusel) ═════════════════ */}
        <section id="conexiones" className="scroll-mt-20 py-12 lg:py-16">
          <Reveal className="mx-auto max-w-2xl text-center xl:max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-teal-700 shadow-sm backdrop-blur"><IconLayers className="h-3.5 w-3.5" /> Conexiones e integraciones</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Conecte todo lo que su operación usa</h2>
            <p className="mt-3 text-base text-slate-600">WhatsApp por Evolution, Meta o Twilio; Gmail y Calendar por empresa; IA y procesamiento de medios — todo desde un panel.</p>
          </Reveal>
          <Reveal delay={120} className="relative mt-10">
            {/* glow suave detrás del carrusel */}
            <div className="pointer-events-none absolute inset-x-10 -top-6 h-24 rounded-full bg-brand/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-24 -bottom-6 h-24 rounded-full bg-accent/15 blur-3xl" />
            <ConnectorsCarousel />
          </Reveal>
        </section>

        {/* ═════════════════ CONFIANZA / SEGURIDAD ═════════════════ */}
        <Reveal className="py-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 p-6 shadow-[0_24px_60px_-30px_rgba(16,120,90,0.4)] backdrop-blur-md lg:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-cyan-glow/15 blur-3xl" />
            <div className="relative flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
              <div className="max-w-sm text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-700 backdrop-blur">
                  <IconShield className="h-3.5 w-3.5" /> Seguridad de nivel empresarial
                </span>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Construida para inspirar confianza</h3>
                <p className="mt-2 text-sm text-slate-600">Sus datos y los de sus clientes, protegidos y separados. Sin registros públicos: solo el administrador crea usuarios.</p>
              </div>
              <div className="grid w-full max-w-xl grid-cols-2 gap-3 lg:grid-cols-2">
                {TRUST.map((x) => (
                  <div key={x.t} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-dark"><x.icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{x.t}</p>
                      <p className="text-xs leading-snug text-slate-500">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ═════════════════ FUNCIONES ═════════════════ */}
        <section id="funciones" className="scroll-mt-20 py-16 lg:py-24">
          <Reveal className="mx-auto max-w-2xl text-center xl:max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur"><IconSpark className="h-3.5 w-3.5" /> Funcionalidades</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Todo lo que su operación necesita</h2>
            <p className="mt-3 text-base text-slate-600">Una plataforma completa para automatizar la atención, sin comprometer la calidad ni la seguridad.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="group h-full rounded-2xl border border-white/70 bg-white/60 p-6 shadow-[0_16px_40px_-24px_rgba(30,80,120,0.5)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_28px_55px_-24px_rgba(16,185,129,0.45)]">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${TINT[f.tint]} transition-transform group-hover:scale-110`}><f.icon className="h-6 w-6" /></span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═════════════════ CÓMO FUNCIONA ═════════════════ */}
        <section id="proceso" className="scroll-mt-20 py-16 lg:py-24">
          <Reveal className="mx-auto max-w-2xl text-center xl:max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm backdrop-blur"><IconFlow className="h-3.5 w-3.5" /> Así trabaja por dentro</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">De la conversación al resultado</h2>
            <p className="mt-3 text-base text-slate-600">Vea el flujo real de una conversación paso a paso. Toque cada etapa para verla.</p>
          </Reveal>
          <Reveal delay={120} className="mt-12">
            <HowItWorksFlow />
          </Reveal>
        </section>

        {/* ═════════════════ PRODUCTO (detalle con mockups) ═════════════════ */}
        <section id="producto" className="scroll-mt-20 space-y-20 py-16 lg:space-y-28 lg:py-24">
          <Reveal className="mx-auto max-w-2xl text-center xl:max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-teal-700 shadow-sm backdrop-blur"><IconChat className="h-3.5 w-3.5" /> Así se ve por dentro</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Una consola, todo el control</h2>
            <p className="mt-3 text-base text-slate-600">Conversaciones, flujos y resultados en un mismo lugar.</p>
          </Reveal>

          <DetailRow
            badge={<><IconChat className="h-3.5 w-3.5 text-brand" /> Conversaciones</>}
            title="Diálogos que se sienten humanos"
            desc="La inteligencia artificial responde con lenguaje natural y profesional, comprende audios, imágenes y texto, y jamás revela que es un sistema automatizado."
            points={['Comprensión de audio, imagen y texto', 'Reconocimiento de intención', 'Tono profesional y consistente']}
          ><ChatMock /></DetailRow>

          <DetailRow
            reverse
            badge={<><IconFlow className="h-3.5 w-3.5 text-accent" /> Editor visual</>}
            title="Diseñe la lógica sin escribir código"
            desc="Construya la ruta conversacional arrastrando nodos: mensajes, condiciones, integraciones y agendamiento, con vista previa en tiempo real."
            points={['Nodos de mensaje, condición e integración', 'Ramas por intención del usuario', 'Reutilizable entre empresas']}
          ><FlowMock /></DetailRow>

          <DetailRow
            badge={<><IconChart className="h-3.5 w-3.5 text-emerald-600" /> Métricas</>}
            title="Decisiones con datos en tiempo real"
            desc="Visualice conversaciones, citas agendadas y consumo de inteligencia artificial por cliente, con información actualizada al instante."
            points={['Actividad y conversiones por día', 'Consumo de IA por empresa', 'Datos completamente aislados']}
          ><StatsMock /></DetailRow>
        </section>

        {/* ═════════════════ CASOS DE USO ═════════════════ */}
        <section id="casos" className="scroll-mt-20 py-16 lg:py-24">
          <Reveal className="mx-auto max-w-2xl text-center xl:max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-violet-700 shadow-sm backdrop-blur"><IconLayers className="h-3.5 w-3.5" /> Casos de uso</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Pensado para cada industria</h2>
            <p className="mt-3 text-base text-slate-600">Adaptable a la operación de cualquier empresa que atienda por WhatsApp.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CASES.map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <div className="group h-full rounded-2xl border border-white/70 bg-white/60 p-6 shadow-[0_16px_40px_-24px_rgba(30,80,120,0.5)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-white/90">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${TINT[c.tint]} transition-transform group-hover:scale-110`}><c.icon className="h-6 w-6" /></span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═════════════════ MÉTRICAS ═════════════════ */}
        <Reveal className="py-8">
          <div className="grid gap-6 rounded-3xl border border-white/70 bg-white/60 p-8 shadow-[0_24px_60px_-30px_rgba(16,120,90,0.4)] backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4 lg:p-10">
            {[['24/7', 'Atención automatizada'], ['< 2 s', 'Tiempo de respuesta'], ['100%', 'Datos aislados por empresa'], ['∞', 'Empresas gestionables']].map(([k, v]) => (
              <div key={v} className="text-center">
                <p className="bg-gradient-to-r from-brand to-teal-400 bg-clip-text text-4xl font-extrabold text-transparent">{k}</p>
                <p className="mt-2 text-sm text-slate-600">{v}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ═════════════════ CTA FINAL ═════════════════ */}
        <Reveal className="py-16 lg:py-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-brand-dark via-emerald-600 to-teal-500 p-10 text-center shadow-[0_40px_90px_-40px_rgba(16,185,129,0.7)] lg:p-16">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-cyan-glow/25 blur-3xl" />
            <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">Lleve la atención de su empresa al siguiente nivel</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-base text-emerald-50/90">Acceda al panel de administración y comience a automatizar sus conversaciones hoy mismo.</p>
            <Link to="/login" className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-emerald-700 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 active:scale-[0.98]">
              <IconLock className="h-4 w-4" /> Iniciar sesión
            </Link>
          </div>
        </Reveal>

        {/* ═════════════════ FOOTER ═════════════════ */}
        <footer className="border-t border-slate-200/70 py-10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-sm font-extrabold text-ink-950">W</span>
              <span className="text-sm font-semibold text-slate-700">WA Bots</span>
            </div>
            <div className="flex items-center gap-5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><IconShield className="h-3.5 w-3.5" /> Seguridad empresarial</span>
              <span className="inline-flex items-center gap-1.5"><IconLayers className="h-3.5 w-3.5" /> Multi-empresa</span>
            </div>
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} WA Bots · Plataforma privada</p>
          </div>
        </footer>
      </div>

      {/* Botón flotante que transfiere al WhatsApp del negocio con un mensaje listo. */}
      <WhatsappFab />
    </div>
  );
}
