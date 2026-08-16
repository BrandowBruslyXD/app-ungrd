// Switch ON/OFF accesible. `on` controla el estado, `onChange` recibe el nuevo
// valor y `ariaLabel` describe la acción para lectores de pantalla.
export default function Toggle({ on, onChange, disabled, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 ${
        on ? 'bg-brand-gradient shadow-glow-brand' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-all duration-300 ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
