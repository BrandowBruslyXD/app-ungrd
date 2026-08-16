import { useTranslation } from 'react-i18next';
import type { Evento, PaqueteMinisterio } from '@/types/sectorial';
import { formatearDia } from './formato';

interface PieImpresoProps {
  paquete: PaqueteMinisterio;
  evento: Evento;
}

/**
 * El pie del documento impreso: de dónde salieron estos datos y qué no son.
 *
 * Va en el papel porque el papel viaja solo. La hoja que un ministerio archiva
 * —o reenvía, o lleva a un comité— ya no tiene al lado la pantalla que explica
 * la escalera de confianza, así que la advertencia tiene que ir escrita en ella:
 * lo autorreportado es un indicio ciudadano sin verificar en terreno, y quien
 * lo lea impreso no puede confundirlo con un EDAN firmado.
 *
 * Y dice también que el envío es simulado. Que el aviso esté en la pantalla no
 * basta: el documento se puede imprimir y mostrar sin ella.
 */
export default function PieImpreso({ paquete, evento }: PieImpresoProps) {
  const { t } = useTranslation();
  const corte = evento.ultimoDatoEn ?? null;

  return (
    <div className="solo-impresion evitar-corte mt-5 border-t border-tinta-900 pt-3 text-xs">
      <p>
        {corte === null
          ? t('ungrd.paquete.impresoProcedenciaSinCorte', { evento: evento.codigo })
          : t('ungrd.paquete.impresoProcedencia', {
              evento: evento.codigo,
              fecha: formatearDia(corte),
            })}
      </p>
      <p className="mt-1">{t('ungrd.paquete.impresoAdvertencia')}</p>
      <p className="mt-1">{t('ungrd.paquete.impresoSimulado')}</p>
      <p className="mt-1 font-mono">
        {t('ungrd.paquete.impresoIdentidad', {
          paquete: paquete.codigo,
          entidad: paquete.entidad,
        })}
      </p>
    </div>
  );
}
