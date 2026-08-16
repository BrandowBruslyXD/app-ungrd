import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { Evento, PaqueteMinisterio } from '@/types/sectorial';
import { formatearFechaHora, textoAmparo } from './formato';

interface MembreteImpresoProps {
  paquete: PaqueteMinisterio;
  evento: Evento;
  /** ISO-8601 en UTC. El membrete solo se pinta si el informe ya se generó. */
  generadoEn: string;
  generadoPor: string;
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide">{etiqueta}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/**
 * El membrete del documento impreso: solo existe en papel.
 *
 * En pantalla esta información ya está en la ficha del paquete, con su banda de
 * color y su distintivo de estado. En papel eso no sirve: un oficio que llega a
 * un ministerio tiene que decir en la primera línea de qué evento habla, qué
 * decreto lo ampara, a quién va dirigido y quién lo generó, sin depender de
 * ningún color. Por eso el documento impreso no es la pantalla recortada: es
 * este bloque, y la ficha de pantalla se oculta al imprimir para no repetirlo.
 */
export default function MembreteImpreso({
  paquete,
  evento,
  generadoEn,
  generadoPor,
}: MembreteImpresoProps) {
  const { t } = useTranslation();
  const amparo = textoAmparo(evento, t);

  return (
    <div className="solo-impresion evitar-corte mb-5 border-b-2 border-tinta-900 pb-3">
      <p className="text-xs font-semibold uppercase tracking-wide">
        {t('ungrd.paquete.impresoOrganismo')}
      </p>

      <h2 className="mt-1 text-xl">{t('ungrd.paquete.impresoTitulo')}</h2>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Dato etiqueta={t('ungrd.paquete.etiquetaEntidad')}>
          {paquete.entidad}
          <span className="block">{t(`ungrd.sectores.${paquete.sector}`)}</span>
        </Dato>

        <Dato etiqueta={t('ungrd.paquete.etiquetaEvento')}>
          {evento.nombre}
          <span className="block font-mono text-xs">{evento.codigo}</span>
        </Dato>

        <Dato etiqueta={t('ungrd.paquete.etiquetaAmparo')}>
          {amparo.declaratoria}
          {amparo.decreto !== null && <span className="block">{amparo.decreto}</span>}
        </Dato>

        <Dato etiqueta={t('ungrd.paquete.impresoEtiquetaGenerado')}>
          {formatearFechaHora(generadoEn)}
          <span className="block">{t('ungrd.paquete.impresoPor', { persona: generadoPor })}</span>
          <span className="block font-mono text-xs">{paquete.codigo}</span>
        </Dato>
      </dl>
    </div>
  );
}
