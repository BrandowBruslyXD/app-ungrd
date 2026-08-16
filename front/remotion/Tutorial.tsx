import type { CSSProperties, ReactNode } from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  ArrowRight,
  Camera,
  Check,
  ClipboardCheck,
  FileText,
  MapPin,
  Radio,
  Satellite,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';

const C = {
  blue: '#0a3a8f',
  blueDark: '#04193c',
  blueLight: '#eef3fc',
  gold: '#fcd116',
  red: '#ce1126',
  green: '#117a50',
  ink: '#0e1726',
  muted: '#64738d',
  paper: '#f5f7fb',
  border: '#d8e0ed',
  white: '#ffffff',
} as const;

const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const enter = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });

const Brand = ({ light = false }: { light?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <Img src={staticFile('marca/escudo-96.png')} style={{ width: 62, height: 62 }} />
    <div style={{ color: light ? C.white : C.blueDark, fontWeight: 850, fontSize: 32 }}>
      Conecta<span style={{ color: C.red }}>Riesgo</span>
    </div>
  </div>
);

const Scene = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
  <AbsoluteFill
    style={{
      background: dark ? C.blueDark : C.paper,
      color: dark ? C.white : C.ink,
      fontFamily: font,
      overflow: 'hidden',
    }}
  >
    {children}
  </AbsoluteFill>
);

const Eyebrow = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
  <div
    style={{
      color: dark ? C.gold : C.blue,
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: 3,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const Cursor = ({ x, y, click = false }: { x: number; y: number; click?: boolean }) => {
  const frame = useCurrentFrame();
  const pulse = click ? 1 + Math.sin(frame * 0.35) * 0.18 : 1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${pulse})`, zIndex: 20 }}>
      {click && (
        <div
          style={{
            position: 'absolute',
            width: 70,
            height: 70,
            borderRadius: 99,
            border: `5px solid ${C.gold}`,
            left: -27,
            top: -27,
            opacity: 0.55,
          }}
        />
      )}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: '34px solid white',
          borderRight: '22px solid transparent',
          filter: 'drop-shadow(0 3px 2px rgba(0,0,0,.45))',
          transform: 'rotate(-25deg)',
        }}
      />
    </div>
  );
};

const Browser = ({ children, title }: { children: ReactNode; title: string }) => (
  <div
    style={{
      width: 1110,
      height: 720,
      background: C.white,
      borderRadius: 22,
      boxShadow: '0 28px 80px rgba(4,25,60,.22)',
      overflow: 'hidden',
      border: `1px solid ${C.border}`,
    }}
  >
    <div
      style={{
        height: 64,
        background: '#e9eef7',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
      }}
    >
      {['#ce1126', '#f0b90b', '#117a50'].map((color) => (
        <div key={color} style={{ width: 16, height: 16, borderRadius: 99, background: color }} />
      ))}
      <div
        style={{
          marginLeft: 16,
          background: C.white,
          borderRadius: 10,
          color: C.muted,
          fontSize: 19,
          padding: '10px 22px',
          width: 720,
        }}
      >
        conectariesgo.gov.co/{title}
      </div>
    </div>
    <div style={{ height: 656, position: 'relative', overflow: 'hidden' }}>{children}</div>
  </div>
);

const StepLabel = ({ number, children }: { number: string; children: ReactNode }) => (
  <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: 99,
        background: C.gold,
        color: C.blueDark,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 900,
        fontSize: 27,
      }}
    >
      {number}
    </div>
    <div style={{ fontSize: 33, fontWeight: 820 }}>{children}</div>
  </div>
);

const Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps);
  return (
    <Scene dark>
      <Img
        src={staticFile('imagenes/ladera-viviendas-1600.jpg')}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28, transform: 'scale(1.05)' }}
      />
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, #04193cf2 0%, #04193cb8 60%, transparent)' }} />
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 110,
          width: 1050,
          opacity: a,
          transform: `translateY(${interpolate(a, [0, 1], [55, 0])}px)`,
        }}
      >
        <Brand light />
        <div style={{ marginTop: 110 }}>
          <Eyebrow dark>Tutorial en vivo · 45 segundos</Eyebrow>
          <h1 style={{ fontSize: 92, lineHeight: 1.02, margin: '28px 0 30px', letterSpacing: -4 }}>
            De un reporte ciudadano<br />a una respuesta coordinada.
          </h1>
          <p style={{ fontSize: 34, lineHeight: 1.45, color: '#d7e3f8', maxWidth: 940 }}>
            Conoce el flujo completo de ConectaRiesgo: reportar, verificar, atender y consolidar.
          </p>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 56, right: 72, fontSize: 22, color: '#afc7f1' }}>
        Usa datos ficticios durante la demostración
      </div>
    </Scene>
  );
};

const ReportScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps);
  const cursorX = interpolate(frame, [35, 105], [1370, 1115], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cursorY = interpolate(frame, [35, 105], [770, 642], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Scene>
      <div style={{ position: 'absolute', left: 90, top: 92, width: 500, opacity: a }}>
        <Eyebrow>Paso 1</Eyebrow>
        <h2 style={{ fontSize: 66, lineHeight: 1.08, margin: '22px 0 28px' }}>Reporta lo que está pasando</h2>
        <p style={{ fontSize: 28, lineHeight: 1.5, color: C.muted }}>
          El formulario guía a la persona con opciones grandes, ubicación, foto y necesidades urgentes.
        </p>
        <div style={{ marginTop: 50 }}><StepLabel number="1">Toca “Reportar emergencia”</StepLabel></div>
      </div>
      <div style={{ position: 'absolute', right: 80, top: 100, transform: `translateX(${interpolate(a, [0, 1], [90, 0])}px)` }}>
        <Browser title="reportar">
          <div style={{ height: 82, background: C.blueDark, padding: '0 34px', display: 'flex', alignItems: 'center' }}><Brand light /></div>
          <div style={{ padding: 34 }}>
            <div style={{ color: C.blue, fontWeight: 800, fontSize: 21 }}>REPORTE CIUDADANO · PASO 2 DE 5</div>
            <h3 style={{ fontSize: 38, margin: '14px 0 24px' }}>¿Qué tipo de emergencia ocurrió?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Inundación', '💧'], ['Deslizamiento', '⛰️'], ['Incendio', '🔥'], ['Vía afectada', '🚧'],
              ].map(([label, icon], index) => (
                <div key={label} style={{ border: `${index === 1 ? 4 : 2}px solid ${index === 1 ? C.blue : C.border}`, background: index === 1 ? C.blueLight : C.white, borderRadius: 14, padding: '21px 24px', fontSize: 24, fontWeight: 750 }}>
                  <span style={{ marginRight: 16 }}>{icon}</span>{label}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 26, display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, border: `2px dashed ${C.border}`, borderRadius: 14, padding: 22, color: C.muted, fontSize: 22 }}><Camera size={28} style={{ verticalAlign: 'middle', marginRight: 12 }} />Agregar foto</div>
              <div style={{ flex: 1, border: `2px solid ${C.border}`, borderRadius: 14, padding: 22, color: C.muted, fontSize: 22 }}><MapPin size={28} style={{ verticalAlign: 'middle', marginRight: 12 }} />Usar mi ubicación</div>
            </div>
            <div style={{ marginTop: 26, marginLeft: 'auto', width: 290, background: C.gold, borderRadius: 13, padding: 19, textAlign: 'center', fontSize: 24, fontWeight: 850 }}>Continuar <ArrowRight size={25} style={{ verticalAlign: 'middle' }} /></div>
          </div>
          <Cursor x={cursorX - 700} y={cursorY - 100} click={frame > 95} />
        </Browser>
      </div>
    </Scene>
  );
};

const TrackingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps);
  const stages = ['Reportado', 'Verificado', 'Asignado', 'En atención', 'Atendido'];
  const progress = Math.floor(interpolate(frame, [50, 245], [0, stages.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <Scene dark>
      <div style={{ position: 'absolute', left: 105, top: 90 }}><Brand light /></div>
      <div style={{ position: 'absolute', left: 120, top: 245, width: 610, opacity: a }}>
        <Eyebrow dark>Paso 2</Eyebrow>
        <h2 style={{ fontSize: 68, lineHeight: 1.08, margin: '22px 0 28px' }}>Guarda tu código y sigue el caso</h2>
        <p style={{ color: '#d7e3f8', fontSize: 29, lineHeight: 1.5 }}>
          La persona no pierde el rastro: cada cambio aparece en una cronología clara.
        </p>
      </div>
      <div style={{ position: 'absolute', right: 105, top: 150, width: 980, background: C.white, color: C.ink, borderRadius: 24, padding: 52, boxShadow: '0 35px 90px #020f2677' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div><div style={{ color: C.muted, fontSize: 20 }}>CÓDIGO DE SEGUIMIENTO</div><div style={{ color: C.blue, fontFamily: 'monospace', fontWeight: 900, fontSize: 40, marginTop: 8 }}>RPT-2026-0816-3GG4</div></div>
          <div style={{ background: '#ecfaf3', color: C.green, padding: '12px 18px', borderRadius: 99, fontSize: 20, fontWeight: 800 }}><ShieldCheck size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Datos recibidos</div>
        </div>
        <div style={{ height: 2, background: C.border, margin: '34px 0' }} />
        <div style={{ fontSize: 26, fontWeight: 820, marginBottom: 28 }}>Avance de la atención</div>
        {stages.map((stage, index) => {
          const done = index < progress;
          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 24, opacity: done ? 1 : 0.42 }}>
              <div style={{ width: 44, height: 44, borderRadius: 99, background: done ? C.green : C.border, color: C.white, display: 'grid', placeItems: 'center' }}>{done ? <Check size={28} strokeWidth={3} /> : index + 1}</div>
              <div style={{ fontSize: 25, fontWeight: done ? 800 : 600 }}>{stage}</div>
              {done && index === progress - 1 && <div style={{ marginLeft: 'auto', color: C.green, fontWeight: 800 }}>Actualizado ahora</div>}
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

const VerifyScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps);
  const cards = [
    { icon: Satellite, title: 'Señal satelital', text: 'NASA FIRMS', color: C.green },
    { icon: Radio, title: 'Alerta externa', text: 'GDACS / USGS', color: C.red },
    { icon: Users, title: 'Reporte ciudadano', text: 'Ubicación coincidente', color: C.blue },
  ];
  return (
    <Scene>
      <div style={{ position: 'absolute', left: 90, top: 72 }}><Brand /></div>
      <div style={{ position: 'absolute', left: 105, top: 230, width: 560, opacity: a }}>
        <Eyebrow>Paso 3 · Sala de crisis</Eyebrow>
        <h2 style={{ fontSize: 66, lineHeight: 1.08, margin: '22px 0 26px' }}>Cruza señales antes de decidir</h2>
        <p style={{ fontSize: 28, lineHeight: 1.5, color: C.muted }}>El gestor ve reportes, alertas y observación satelital en un mismo contexto.</p>
      </div>
      <div style={{ position: 'absolute', right: 85, top: 110, width: 1120, height: 830, borderRadius: 26, overflow: 'hidden', boxShadow: '0 28px 75px rgba(4,25,60,.2)' }}>
        <Img src={staticFile('imagenes/valle-rio-aereo-800.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.75)' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #04193c22, #04193c77)' }} />
        {[{x: 260,y: 280,c:C.red},{x: 720,y: 220,c:C.blue},{x: 540,y: 480,c:C.gold},{x: 850,y: 590,c:C.green}].map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: 42, height: 42, borderRadius: '50% 50% 50% 0', background: p.c, border: '5px solid white', transform: 'rotate(-45deg) scale(1.25)', boxShadow: '0 8px 20px #0005' }} />
        ))}
        <div style={{ position: 'absolute', left: 34, right: 34, bottom: 32, display: 'flex', gap: 18 }}>
          {cards.map(({ icon: Icon, title, text, color }, index) => (
            <div key={title} style={{ flex: 1, background: '#fffffff2', borderRadius: 16, padding: 24, opacity: enter(frame, fps, 35 + index * 12), transform: `translateY(${interpolate(enter(frame, fps, 35 + index * 12), [0, 1], [40, 0])}px)` }}>
              <Icon size={30} color={color} /><div style={{ fontWeight: 850, fontSize: 22, marginTop: 12 }}>{title}</div><div style={{ color: C.muted, fontSize: 18, marginTop: 4 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
};

const ConsolidateScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps);
  const stats = [['11 de 24', 'municipios con información'], ['2.840', 'personas afectadas'], ['$ 1.240 M', 'costo estimado']];
  return (
    <Scene>
      <div style={{ position: 'absolute', left: 95, top: 80 }}><Brand /></div>
      <div style={{ position: 'absolute', left: 100, top: 220, width: 480, opacity: a }}>
        <Eyebrow>Paso 4 · UNGRD</Eyebrow>
        <h2 style={{ fontSize: 64, lineHeight: 1.08, margin: '22px 0 25px' }}>Consolida y reparte por sector</h2>
        <p style={{ fontSize: 27, lineHeight: 1.5, color: C.muted }}>Cobertura, daños, necesidades y paquetes para cada ministerio, sin perder la fuente del dato.</p>
      </div>
      <div style={{ position: 'absolute', right: 90, top: 105, width: 1190, height: 840, background: C.white, borderRadius: 24, boxShadow: '0 28px 80px rgba(4,25,60,.18)', overflow: 'hidden' }}>
        <div style={{ background: C.blueDark, padding: '32px 40px', color: C.white }}><div style={{ color: C.gold, fontSize: 18, fontWeight: 800 }}>EVENTO COL-ANT-2026-014</div><div style={{ fontSize: 34, fontWeight: 850, marginTop: 7 }}>Inundaciones · Suroeste antioqueño</div></div>
        <div style={{ padding: 34 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {stats.map(([value, label], index) => <div key={label} style={{ background: index === 0 ? '#fdf2f3' : C.blueLight, borderRadius: 14, padding: 24 }}><div style={{ color: index === 0 ? C.red : C.blue, fontSize: 34, fontWeight: 900 }}>{value}</div><div style={{ marginTop: 7, fontSize: 18, color: C.muted }}>{label}</div></div>)}
          </div>
          <div style={{ marginTop: 28, fontSize: 25, fontWeight: 850 }}>Reparto por sector</div>
          {[
            ['Vivienda', 86, 'Listo para revisar'], ['Salud', 64, 'Faltan 3 municipios'], ['Transporte', 42, 'Requiere clasificación'],
          ].map(([label, percent, status], index) => (
            <div key={String(label)} style={{ display: 'grid', gridTemplateColumns: '210px 1fr 255px', alignItems: 'center', gap: 18, marginTop: 22, opacity: enter(frame, fps, 28 + index * 10) }}>
              <div style={{ fontWeight: 800, fontSize: 21 }}>{label}</div>
              <div style={{ height: 18, background: C.border, borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${percent}%`, background: index === 0 ? C.green : index === 1 ? C.gold : C.red, borderRadius: 99 }} /></div>
              <div style={{ color: C.muted, fontSize: 18 }}>{status}</div>
            </div>
          ))}
          <div style={{ marginTop: 38, display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: C.blue, color: C.white, borderRadius: 13, padding: '18px 25px', fontSize: 21, fontWeight: 850 }}><Send size={23} style={{ verticalAlign: 'middle', marginRight: 10 }} />Preparar paquete ministerial</div></div>
        </div>
      </div>
    </Scene>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps);
  const items = [
    [FileText, 'Reporta'], [ShieldCheck, 'Verifica'], [ClipboardCheck, 'Atiende'], [Send, 'Coordina'],
  ] as const;
  return (
    <Scene dark>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 75% 30%, #0a3a8f 0, #04193c 58%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center', opacity: a }}>
        <div style={{ display: 'inline-flex' }}><Brand light /></div>
        <h2 style={{ fontSize: 74, margin: '80px auto 24px', maxWidth: 1200, lineHeight: 1.08 }}>Una sola historia, desde el territorio hasta la decisión.</h2>
        <p style={{ fontSize: 30, color: '#d7e3f8' }}>Ahora abre la app y recorre el flujo con tu equipo.</p>
        <div style={{ margin: '80px auto 0', display: 'flex', justifyContent: 'center', gap: 26 }}>
          {items.map(([Icon, label], index) => (
            <div key={label} style={{ width: 245, padding: '30px 24px', borderRadius: 18, background: '#ffffff12', border: '1px solid #ffffff26', opacity: enter(frame, fps, 18 + index * 8) }}>
              <Icon size={40} color={C.gold} /><div style={{ marginTop: 16, fontSize: 25, fontWeight: 850 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 62, left: 0, right: 0, textAlign: 'center', color: '#afc7f1', fontSize: 21 }}>ConectaRiesgo · Preparados antes, conectados durante, transparentes después.</div>
    </Scene>
  );
};

const transitionStyle = (frame: number, duration: number): CSSProperties => {
  const opacity = interpolate(frame, [0, 12, duration - 12, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { opacity };
};

const Timed = ({ duration, children }: { duration: number; children: ReactNode }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={transitionStyle(frame, duration)}>{children}</AbsoluteFill>;
};

export const ConectaRiesgoTutorial = () => (
  <AbsoluteFill style={{ background: C.blueDark }}>
    <Sequence from={0} durationInFrames={180}><Timed duration={180}><Intro /></Timed></Sequence>
    <Sequence from={180} durationInFrames={270}><Timed duration={270}><ReportScene /></Timed></Sequence>
    <Sequence from={450} durationInFrames={270}><Timed duration={270}><TrackingScene /></Timed></Sequence>
    <Sequence from={720} durationInFrames={240}><Timed duration={240}><VerifyScene /></Timed></Sequence>
    <Sequence from={960} durationInFrames={240}><Timed duration={240}><ConsolidateScene /></Timed></Sequence>
    <Sequence from={1200} durationInFrames={150}><Timed duration={150}><Outro /></Timed></Sequence>
  </AbsoluteFill>
);
