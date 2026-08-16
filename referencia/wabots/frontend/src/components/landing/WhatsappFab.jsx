// Botón flotante de WhatsApp: no abre un chat dentro de la página, redirige
// (pestaña nueva) al WhatsApp del negocio con un mensaje ya preparado.
import { IconWhatsapp } from '../icons';
import { WA_MESSAGE, WA_NUMBER } from './landing.data';

export default function WhatsappFab() {
  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbanos por WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-brand-gradient py-2.5 pl-2.5 pr-3 text-ink-950 shadow-[0_18px_40px_-12px_rgba(37,211,102,0.7)] ring-1 ring-white/40 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:pr-5 hover:shadow-[0_24px_54px_-12px_rgba(37,211,102,0.9)]"
    >
      <span className="relative grid h-11 w-11 place-items-center rounded-full bg-white/25">
        <span className="absolute inset-0 rounded-full animate-pulse-ring" />
        <IconWhatsapp className="h-6 w-6" />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover:max-w-[9rem] group-hover:opacity-100 sm:max-w-[9rem] sm:opacity-100">
        Escríbanos
      </span>
    </a>
  );
}
