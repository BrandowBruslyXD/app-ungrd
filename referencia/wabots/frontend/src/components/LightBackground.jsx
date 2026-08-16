// Fondo claro compartido (landing + login): gradient-mesh con auroras.
// Rendimiento: en móvil sólo una aurora estática; animación y capas extra ≥sm.
export default function LightBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#eef6f2] via-[#eef3fb] to-[#f3eefb]">
      <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-brand/25 blur-3xl sm:animate-aurora" />
      <div className="absolute -right-40 top-20 hidden h-[36rem] w-[36rem] rounded-full bg-cyan-glow/25 blur-3xl sm:block sm:animate-aurora [animation-delay:-6s]" />
      <div className="absolute bottom-10 left-1/4 hidden h-[34rem] w-[34rem] rounded-full bg-accent/20 blur-3xl sm:block sm:animate-aurora [animation-delay:-10s]" />
    </div>
  );
}
