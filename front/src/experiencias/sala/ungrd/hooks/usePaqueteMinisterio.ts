import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaqueteMinisterio, ResumenPaquete } from '@/experiencias/sala/ungrd/types/paquete';
import { buscarPaquete } from '@/experiencias/sala/ungrd/mocks/paquetes';
import { resumirPaquete } from '@/experiencias/sala/ungrd/utils/resumenPaquete';

/** Estados posibles de la carga del paquete. */
export type EstadoCarga = 'cargando' | 'listo' | 'noEncontrado';

/** Espera simulada mientras el backend no expone `GET /api/paquetes/{codigo}`. */
const DEMORA_CONSULTA_MS = 220;

/** Espera simulada del registro del envío, para que el botón muestre su estado de trabajo. */
const DEMORA_ENVIO_MS = 700;

interface UsoPaqueteMinisterio {
  paquete: PaqueteMinisterio | null;
  resumen: ResumenPaquete | null;
  estadoCarga: EstadoCarga;
  /** Verdadero mientras se registra el envío simulado. */
  enviando: boolean;
  /** Aprueba el paquete y lo deja como `Enviado`. El envío es simulado. */
  aprobarYEnviar: () => void;
}

/**
 * Carga el paquete de un ministerio y permite aprobarlo.
 *
 * Trabaja contra datos sembrados con la forma exacta del contrato, así que el día de la
 * integración solo cambia de dónde salen los datos, no lo que la pantalla hace con ellos.
 */
export function usePaqueteMinisterio(codigo: string | undefined): UsoPaqueteMinisterio {
  const [paquete, setPaquete] = useState<PaqueteMinisterio | null>(null);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>('cargando');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    setEstadoCarga('cargando');
    setPaquete(null);
    setEnviando(false);

    const temporizador = window.setTimeout(() => {
      if (!vigente) return;
      const encontrado = codigo ? buscarPaquete(codigo) : null;
      setPaquete(encontrado);
      setEstadoCarga(encontrado ? 'listo' : 'noEncontrado');
    }, DEMORA_CONSULTA_MS);

    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [codigo]);

  const aprobarYEnviar = useCallback(() => {
    setEnviando(true);
    window.setTimeout(() => {
      setPaquete((anterior) =>
        anterior ? { ...anterior, estado: 'Enviado', enviadoEn: new Date().toISOString() } : anterior,
      );
      setEnviando(false);
    }, DEMORA_ENVIO_MS);
  }, []);

  const resumen = useMemo(() => (paquete ? resumirPaquete(paquete) : null), [paquete]);

  return { paquete, resumen, estadoCarga, enviando, aprobarYEnviar };
}
