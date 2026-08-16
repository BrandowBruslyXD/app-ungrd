import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Check } from 'lucide-react';

interface BotonCompartirProps {
  titulo: string;
  texto: string;
  /** Si se omite, se comparte la dirección actual. */
  url?: string;
  className?: string;
}

/**
 * Botón de compartir.
 *
 * No está aquí por costumbre: en este dominio compartir el código de
 * seguimiento con un familiar es una necesidad real. Quien reporta puede no
 * tener con qué anotarlo, o puede estar hospitalizado y necesitar que otro
 * consulte por él.
 *
 * Usa la hoja de compartir del sistema cuando existe —que en Android abre
 * WhatsApp, el canal que de verdad usa la gente— y cae al portapapeles cuando
 * no. Si ninguna de las dos está disponible, el botón no se dibuja: es preferible
 * a un control que no hace nada.
 */
export default function BotonCompartir({ titulo, texto, url, className = '' }: BotonCompartirProps) {
  const { t } = useTranslation();
  const [copiado, setCopiado] = useState(false);

  const puedeCompartir = typeof navigator !== 'undefined' && !!navigator.share;
  const puedeCopiar = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

  if (!puedeCompartir && !puedeCopiar) {
    return null;
  }

  async function compartir(): Promise<void> {
    const destino = url ?? window.location.href;

    if (puedeCompartir) {
      try {
        await navigator.share({ title: titulo, text: texto, url: destino });
        return;
      } catch {
        // Cancelar la hoja de compartir lanza igual que un fallo real. En ambos
        // casos no hay nada que informar: la persona ya decidió.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${texto} ${destino}`);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button type="button" onClick={compartir} className={`btn-secondary ${className}`}>
      {copiado ? (
        <Check className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Share2 className="h-5 w-5" aria-hidden="true" />
      )}
      {copiado ? t('ui.share.copied') : t('ui.share.action')}
    </button>
  );
}
