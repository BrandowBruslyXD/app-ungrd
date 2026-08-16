import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { FileSignature } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import type { EstadoEnvio } from '../../hooks/usePaqueteMinisterio';
import type { Evento, PaqueteMinisterio } from '@/types/sectorial';
import DistintivoEstadoPaquete from '../DistintivoEstadoPaquete';
import { formatearFechaHora, textoAmparo } from './formato';

interface FichaDelPaqueteProps {
  paquete: PaqueteMinisterio;
  evento: Evento;
  envio: EstadoEnvio;
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-tinta-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-tinta-900">{children}</dd>
    </div>
  );
}

/**
 * El encabezado documental: a quién va, de qué evento y **qué lo ampara**.
 *
 * El decreto no es un adorno legal. Un ministerio que recibe un consolidado de
 * daños necesita saber bajo qué declaratoria actúa, porque de eso dependen las
 * facultades con las que puede contratar. Sin esa línea, el oficio es un correo
 * con una tabla.
 */
export default function FichaDelPaquete({ paquete, evento, envio }: FichaDelPaqueteProps) {
  const { t } = useTranslation();

  const amparo = textoAmparo(evento, t);

  return (
    <Ficha
      titulo={t('ungrd.paquete.fichaTitulo')}
      icono={FileSignature}
      apunte={paquete.codigo}
    >
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Dato etiqueta={t('ungrd.paquete.etiquetaEntidad')}>{paquete.entidad}</Dato>

        <Dato etiqueta={t('ungrd.paquete.etiquetaSector')}>
          {t(`ungrd.sectores.${paquete.sector}`)}
        </Dato>

        <Dato etiqueta={t('ungrd.paquete.etiquetaEstado')}>
          <DistintivoEstadoPaquete estado={envio.estado} />
        </Dato>

        <Dato etiqueta={t('ungrd.paquete.etiquetaEvento')}>
          {evento.nombre}
          <span className="mt-0.5 block font-mono text-xs text-tinta-500">{evento.codigo}</span>
        </Dato>

        <Dato etiqueta={t('ungrd.paquete.etiquetaAmparo')}>
          {amparo.declaratoria}
          {amparo.decreto !== null && (
            <span className="mt-0.5 block text-sm text-tinta-600">{amparo.decreto}</span>
          )}
        </Dato>

        <Dato etiqueta={t('ungrd.paquete.etiquetaCorreo')}>
          <span className="break-all font-mono text-sm">{paquete.correoDestino}</span>
          <span className="mt-0.5 block text-sm text-tinta-600">
            {t('ungrd.paquete.correoEjemplo')}
          </span>
        </Dato>
      </dl>

      {envio.aprobadoPor !== undefined && envio.aprobadoEn !== undefined && (
        <p className="mt-4 border-t border-papel-borde pt-3 text-sm text-tinta-600">
          {t('ungrd.paquete.firmadoPor', {
            persona: envio.aprobadoPor,
            fecha: formatearFechaHora(envio.aprobadoEn),
          })}
        </p>
      )}
    </Ficha>
  );
}
