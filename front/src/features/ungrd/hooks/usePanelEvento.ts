import { useCallback, useMemo, useState } from 'react';
import { contarPendientesDeEnvio, resumenCobertura, type ResumenCobertura } from '@/lib/sectorial';
import {
  coberturaDelEvento,
  danosDelEvento,
  enviosDelEvento,
  eventoPorCodigo,
  paquetesDelEvento,
} from '@/mocks/mockSectorial';
import type {
  CoberturaMunicipio,
  DanoSectorizado,
  EnvioRegistrado,
  Evento,
  PaqueteMinisterio,
  Sector,
} from '@/types/sectorial';

/** Todo lo que el panel del desastre necesita, ya resuelto desde el código de la URL. */
export interface UsoPanelEvento {
  /** `null` cuando el código de la URL no corresponde a ningún desastre. */
  evento: Evento | null;
  cobertura: readonly CoberturaMunicipio[];
  resumen: ResumenCobertura;
  /** El consolidado del evento, con las reclasificaciones de esta sesión aplicadas. */
  danos: readonly DanoSectorizado[];
  sinClasificar: readonly DanoSectorizado[];
  paquetes: readonly PaqueteMinisterio[];
  envios: readonly EnvioRegistrado[];
  costoEstimado: number;
  informesPendientes: number;
  asignarSector: (danoId: string, sector: Sector) => void;
}

const COBERTURA_VACIA: ResumenCobertura = {
  totalMunicipios: 0,
  conEdan: 0,
  soloAutorreportes: 0,
  enSilencio: 0,
  conInformacion: 0,
};

/** Las reclasificaciones a mano de esta sesión, y de qué evento son. */
interface Reclasificados {
  eventoId: string;
  danos: readonly DanoSectorizado[];
}

/**
 * Resuelve el desastre que pide la URL y reúne sus cinco colecciones.
 *
 * El código viaja en la dirección, igual que el del reporte ciudadano, así que
 * es texto libre hasta que se compruebe: si no corresponde a nada, el hook
 * devuelve `evento` en `null` y la pantalla lo explica en vez de reventar.
 *
 * La lógica está aquí y no en la pantalla porque estas cifras son las que
 * deciden qué se le manda a un ministerio, y un componente que calcula mientras
 * pinta es un componente donde el error se ve cuando el oficio ya salió.
 */
export function usePanelEvento(codigo: string | undefined): UsoPanelEvento {
  const evento = useMemo(
    () => (codigo === undefined ? undefined : eventoPorCodigo(codigo)),
    [codigo],
  );

  /*
   * Las correcciones se guardan en memoria y se pierden al recargar: no hay
   * backend todavía y fingir que se guardó sería peor. Van marcadas con su
   * evento para que pasar a otro desastre no herede la clasificación que un
   * funcionario hizo en el anterior.
   */
  const [reclasificados, setReclasificados] = useState<Reclasificados | null>(null);

  const danos = useMemo<readonly DanoSectorizado[]>(() => {
    if (evento === undefined) return [];
    if (reclasificados !== null && reclasificados.eventoId === evento.id) {
      return reclasificados.danos;
    }
    return danosDelEvento(evento.id);
  }, [evento, reclasificados]);

  const cobertura = useMemo(
    () => (evento === undefined ? [] : coberturaDelEvento(evento.id)),
    [evento],
  );

  const paquetes = useMemo(
    () => (evento === undefined ? [] : paquetesDelEvento(evento.id)),
    [evento],
  );

  const envios = useMemo(() => (evento === undefined ? [] : enviosDelEvento(evento.id)), [evento]);

  const resumen = useMemo(
    () => (cobertura.length === 0 ? COBERTURA_VACIA : resumenCobertura(cobertura)),
    [cobertura],
  );

  const sinClasificar = useMemo(() => danos.filter((dano) => dano.sector === null), [danos]);

  const costoEstimado = useMemo(
    () => danos.reduce((total, dano) => total + (dano.costoEstimado ?? 0), 0),
    [danos],
  );

  const informesPendientes = useMemo(
    () => contarPendientesDeEnvio(danos, paquetes),
    [danos, paquetes],
  );

  const asignarSector = useCallback(
    (danoId: string, sector: Sector) => {
      if (evento === undefined) return;

      setReclasificados((previo) => {
        const base =
          previo !== null && previo.eventoId === evento.id
            ? previo.danos
            : danosDelEvento(evento.id);

        return {
          eventoId: evento.id,
          /* `map` devuelve un arreglo nuevo: los datos sembrados no se mutan,
             o el panel de al lado mostraría una corrección que esta sesión
             inventó. */
          danos: base.map((dano) =>
            dano.id === danoId ? { ...dano, sector, clasificadoPor: 'Funcionario' } : dano,
          ),
        };
      });
    },
    [evento],
  );

  return {
    evento: evento ?? null,
    cobertura,
    resumen,
    danos,
    sinClasificar,
    paquetes,
    envios,
    costoEstimado,
    informesPendientes,
    asignarSector,
  };
}
