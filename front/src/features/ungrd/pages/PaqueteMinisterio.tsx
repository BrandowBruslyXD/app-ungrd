import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PackageSearch } from 'lucide-react';
import Aviso from '@/components/ui/Aviso';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { usePaqueteMinisterio } from '../hooks/usePaqueteMinisterio';
import CorreoDelPaquete from '../components/paquete/CorreoDelPaquete';
import DistintivoEstadoPaquete from '../components/DistintivoEstadoPaquete';
import Entregables from '../components/paquete/Entregables';
import FichaDelPaquete from '../components/paquete/FichaDelPaquete';
import ResumenPaquete from '../components/paquete/ResumenPaquete';
import TablaDanos from '../components/paquete/TablaDanos';
import TablaMunicipios from '../components/paquete/TablaMunicipios';
import TablaNecesidades from '../components/paquete/TablaNecesidades';

/** A dónde se vuelve desde el paquete: la tabla de reparto del evento. */
const RUTA_PANEL = '/gestor/reparto';

/**
 * Quién firma en la demostración.
 *
 * No se inventa un nombre de funcionario. En producción esta firma sale del
 * token de la sesión —nunca del cliente— y aquí decirlo de frente es más
 * honesto que poner un nombre falso que alguien podría leer como un
 * responsable real.
 */
const FIRMA_DEMO = 'ungrd.paquete.firmaDemo';

function EnlaceVolver({ etiqueta }: { etiqueta: string }) {
  return (
    <Link
      to={RUTA_PANEL}
      className="-ml-3 mb-3 inline-flex min-h-control items-center gap-2 rounded-control px-3 text-base font-semibold text-azul-600 hover:bg-azul-50"
    >
      <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
      {etiqueta}
    </Link>
  );
}

/**
 * Pantalla B del reparto sectorial: **el paquete que le toca a un ministerio**.
 *
 * Es la pantalla que decide el módulo. Lo que aquí se lee en treinta segundos
 * —qué le corresponde a esta entidad, en qué municipios, con cuánta confianza y
 * qué cuesta— es lo que hoy tarda días en armarse a mano, y por eso el orden de
 * los bloques no es decorativo: se lee de arriba abajo como se toma la
 * decisión. Primero qué es y qué lo ampara, luego cuánto pesa, luego el
 * territorio —que es como el ministerio pide la información—, luego el detalle
 * con su nivel de confianza, y solo al final los archivos y la firma.
 */
export default function PaqueteMinisterio() {
  const { t } = useTranslation();
  const { sector } = useParams<{ sector: string }>();
  const { datos, envio, aprobarYEnviar, descargarCsv } = usePaqueteMinisterio(sector);

  useTituloPagina(
    t('meta.paqueteMinisterio.title'),
    t('meta.paqueteMinisterio.description'),
  );

  /*
   * El código de la URL es texto libre: alguien puede escribirlo a mano o
   * llegar de un enlace viejo. Se responde con lenguaje comprensible y una
   * salida, no con un número de error: quien usa esto es un funcionario en
   * mitad de una emergencia, no quien programó la ruta.
   */
  if (datos === null || envio === null) {
    return (
      <div className="animate-fade-in mx-auto w-full max-w-3xl px-4 py-8 lg:px-8 lg:py-10">
        <EnlaceVolver etiqueta={t('ungrd.paquete.volver')} />
        <h1 className="text-2xl sm:text-3xl">{t('ungrd.paquete.noEncontradoTitulo')}</h1>
        <div className="mt-4">
          <Aviso tono="alerta" urgente>
            <p>{t('ungrd.paquete.noEncontradoTexto', { sector: sector ?? '' })}</p>
          </Aviso>
        </div>
        <Link to={RUTA_PANEL} className="btn-primary mt-6">
          <PackageSearch className="h-5 w-5 shrink-0" aria-hidden="true" />
          {t('ungrd.paquete.noEncontradoVolver')}
        </Link>
      </div>
    );
  }

  const {
    paquete,
    ficha,
    evento,
    danos,
    municipios,
    necesidades,
    confianza,
    personasAfectadas,
    costoEstimado,
    danosSinCosto,
    correo,
    archivos,
  } = datos;

  const sinDanos = danos.length === 0;

  return (
    <div className="animate-fade-in mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
      <EnlaceVolver etiqueta={t('ungrd.paquete.volver')} />

      <BandaPortada
        titulo={t('ungrd.paquete.titulo', { entidad: paquete.entidad })}
        descripcion={t('ungrd.paquete.descripcion')}
        foto={FOTOS.puebloJerico}
        alt="Jericó, Antioquia: la iglesia del pueblo asomada sobre los tejados."
        icono={ficha.icono}
      >
        <DistintivoEstadoPaquete estado={envio.estado} />
      </BandaPortada>

      <div className="mt-6 space-y-6">
        <FichaDelPaquete paquete={paquete} evento={evento} envio={envio} />

        <ResumenPaquete
          totalDanos={danos.length}
          totalMunicipios={municipios.length}
          personasAfectadas={personasAfectadas}
          costoEstimado={costoEstimado}
          confianza={confianza}
        />

        {/*
          Que a un ministerio no le toque nada de esta emergencia es
          información, no un hueco que tapar: la fila existe en el reparto y el
          paquete se puede abrir. Lo que no tiene sentido es ofrecer descarga y
          envío de un consolidado vacío, así que esos dos bloques no se pintan.
        */}
        {sinDanos ? (
          <Aviso tono="info" titulo={t('ungrd.paquete.vacioTitulo')}>
            <p>{t('ungrd.paquete.vacioTexto')}</p>
          </Aviso>
        ) : (
          <>
            <TablaMunicipios municipios={municipios} />
            <TablaDanos danos={danos} />
            <TablaNecesidades necesidades={necesidades} danosSinCosto={danosSinCosto} />
            <Entregables nombreCsv={archivos[0]} onDescargarCsv={descargarCsv} />
            <CorreoDelPaquete
              correo={correo}
              archivos={archivos}
              envio={envio}
              entidad={paquete.entidad}
              totalDanos={danos.length}
              onAprobar={() => aprobarYEnviar(t(FIRMA_DEMO))}
            />
          </>
        )}
      </div>
    </div>
  );
}
