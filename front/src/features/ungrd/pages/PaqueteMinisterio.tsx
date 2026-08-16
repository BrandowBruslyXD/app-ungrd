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
import FichaDelPaquete from '../components/paquete/FichaDelPaquete';
import MembreteImpreso from '../components/paquete/MembreteImpreso';
import PasosDelPaquete from '../components/paquete/PasosDelPaquete';
import PieImpreso from '../components/paquete/PieImpreso';
import ResumenPaquete from '../components/paquete/ResumenPaquete';
import TablaDanos from '../components/paquete/TablaDanos';
import TablaMunicipios from '../components/paquete/TablaMunicipios';
import TablaNecesidades from '../components/paquete/TablaNecesidades';

/** La lista de desastres. Es la salida cuando ni siquiera el evento existe. */
const RUTA_LISTA = '/gestor/reparto';

/** A dónde se vuelve desde el paquete: al reparto del desastre del que cuelga. */
function rutaDelEvento(codigo: string | undefined): string {
  return codigo === undefined ? RUTA_LISTA : `${RUTA_LISTA}/${encodeURIComponent(codigo)}`;
}

/**
 * Quién firma en la demostración.
 *
 * No se inventa un nombre de funcionario. En producción esta firma sale del
 * token de la sesión —nunca del cliente— y aquí decirlo de frente es más
 * honesto que poner un nombre falso que alguien podría leer como un
 * responsable real.
 */
const FIRMA_DEMO = 'ungrd.paquete.firmaDemo';

function EnlaceVolver({ a, etiqueta }: { a: string; etiqueta: string }) {
  return (
    <Link
      to={a}
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
 * decisión. Primero qué es y qué lo ampara, después los tres pasos de la
 * remisión —para que nadie tenga que deducir el proceso—, luego cuánto pesa, el
 * territorio —que es como el ministerio pide la información—, el detalle con su
 * nivel de confianza, y solo al final el correo y la firma.
 *
 * **Esta pantalla también es un documento.** De ella sale el PDF, y sale por la
 * impresión del navegador: lo que se ve en papel lo deciden `impresion.css` y
 * las dos piezas que solo existen ahí —el membrete y el pie—. Por eso los
 * bloques que son aplicación y no documento —la portada con foto, los pasos, el
 * correo— van envueltos en `no-imprimir`: en la hoja estorban.
 */
export default function PaqueteMinisterio() {
  const { t } = useTranslation();
  /*
   * Dos códigos, y el del desastre manda: el paquete de un ministerio cuelga de
   * una emergencia concreta. Sin él, dos desastres distintos abrirían el mismo
   * informe y a la entidad le llegarían los daños del que no era.
   */
  const { evento: codigoEvento, sector } = useParams<{ evento: string; sector: string }>();
  const { datos, envio, informe, generarInforme, aprobarYEnviar, descargarCsv, descargarPdf } =
    usePaqueteMinisterio(codigoEvento, sector);

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
        <EnlaceVolver a={RUTA_LISTA} etiqueta={t('ungrd.paquete.volverLista')} />
        <h1 className="text-2xl sm:text-3xl">{t('ungrd.paquete.noEncontradoTitulo')}</h1>
        <div className="mt-4">
          <Aviso tono="alerta" urgente>
            <p>{t('ungrd.paquete.noEncontradoTexto', { sector: sector ?? '' })}</p>
            {/* El enlace pudo fallar por cualquiera de los dos códigos, así que
                se nombran los dos en vez de acusar solo al sector. */}
            <p className="mt-2">
              {t('ungrd.paquete.noEncontradoEvento', { evento: codigoEvento ?? '' })}
            </p>
          </Aviso>
        </div>
        <Link to={RUTA_LISTA} className="btn-primary mt-6">
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
  const generado = informe.generadoEn !== null && informe.generadoPor !== null;

  /*
   * El oficio cita el decreto que lo ampara. Un evento sin declaratoria no tiene
   * ninguno, así que el tercer paso no procede: es la misma regla que el panel
   * del desastre advierte antes de entrar aquí, y si esta pantalla la ignorara,
   * el funcionario firmaría desde dentro lo que la anterior le dijo que no podía.
   */
  const puedeRemitir = evento.declaratoria !== 'Ninguna';

  return (
    <div className="hoja-impresa animate-fade-in mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
      <div className="no-imprimir">
        <EnlaceVolver a={rutaDelEvento(codigoEvento)} etiqueta={t('ungrd.paquete.volver')} />

        <BandaPortada
          titulo={t('ungrd.paquete.titulo', { entidad: paquete.entidad })}
          descripcion={t('ungrd.paquete.descripcion')}
          foto={FOTOS.puebloJerico}
          alt="Jericó, Antioquia: la iglesia del pueblo asomada sobre los tejados."
          icono={ficha.icono}
        >
          <DistintivoEstadoPaquete estado={envio.estado} />
        </BandaPortada>
      </div>

      {informe.generadoEn !== null && informe.generadoPor !== null && (
        <MembreteImpreso
          paquete={paquete}
          evento={evento}
          generadoEn={informe.generadoEn}
          generadoPor={informe.generadoPor}
        />
      )}

      <div className="mt-6 space-y-6">
        {/* Con el informe generado, el membrete de arriba ya dice todo esto en
            papel; repetirlo sería media hoja gastada en lo mismo. */}
        <div className={generado ? 'no-imprimir' : undefined}>
          <FichaDelPaquete paquete={paquete} evento={evento} envio={envio} />
        </div>

        {!sinDanos && (
          <div className="no-imprimir">
            <PasosDelPaquete
              generadoEn={informe.generadoEn}
              pdfAbiertoEn={informe.pdfAbiertoEn}
              enviadoEn={envio.aprobadoEn ?? null}
              enviado={envio.estado === 'Enviado'}
              puedeRemitir={puedeRemitir}
              nombreCsv={archivos[0]}
              onGenerar={() => generarInforme(t(FIRMA_DEMO))}
              onDescargarPdf={descargarPdf}
              onDescargarCsv={descargarCsv}
            />
          </div>
        )}

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

            <div className="no-imprimir">
              <CorreoDelPaquete
                correo={correo}
                archivos={archivos}
                envio={envio}
                entidad={paquete.entidad}
                totalDanos={danos.length}
                puedeRemitir={puedeRemitir}
                onAprobar={() => aprobarYEnviar(t(FIRMA_DEMO))}
              />
            </div>

            {generado && <PieImpreso paquete={paquete} evento={evento} />}
          </>
        )}
      </div>
    </div>
  );
}
