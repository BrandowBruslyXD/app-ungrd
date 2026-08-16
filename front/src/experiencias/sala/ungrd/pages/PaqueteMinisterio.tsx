import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, PackageSearch } from 'lucide-react';
import { codigoPaquetePorDefecto, paquetesSembrados } from '@/experiencias/sala/ungrd/mocks/paquetes';
import { usePaqueteMinisterio } from '@/experiencias/sala/ungrd/hooks/usePaqueteMinisterio';
import { descargarCsvPaquete } from '@/experiencias/sala/ungrd/utils/csvPaquete';
import { formatearPesos } from '@/experiencias/sala/ungrd/utils/resumenPaquete';
import EncabezadoPaquete from '@/experiencias/sala/ungrd/components/EncabezadoPaquete';
import ResumenAfectacion from '@/experiencias/sala/ungrd/components/ResumenAfectacion';
import TotalesPorMunicipio from '@/experiencias/sala/ungrd/components/TotalesPorMunicipio';
import DetalleDanos from '@/experiencias/sala/ungrd/components/DetalleDanos';
import TablaNecesidades from '@/experiencias/sala/ungrd/components/TablaNecesidades';
import PanelEnvio from '@/experiencias/sala/ungrd/components/PanelEnvio';
import DialogoConfirmacion from '@/experiencias/sala/ungrd/components/DialogoConfirmacion';

/**
 * A3 · Paquete del ministerio.
 *
 * La UNGRD centraliza los daños pero no repara nada: cada uno le toca a un ministerio
 * distinto. Esta pantalla arma en segundos el reparto que hoy se hace a mano y que
 * demora cerca de un mes. Detalle del módulo en docs/REPARTO-SECTORIAL.md.
 */
export default function PaqueteMinisterio() {
  const { t } = useTranslation();
  const { codigo } = useParams<{ codigo: string }>();
  const { paquete, resumen, estadoCarga, enviando, aprobarYEnviar } = usePaqueteMinisterio(codigo);
  const [confirmando, setConfirmando] = useState(false);

  // El diálogo se cierra solo cuando el envío queda registrado: así el botón alcanza a
  // mostrar que está trabajando en vez de desaparecer al primer clic.
  const estadoPaquete = paquete?.estado;
  useEffect(() => {
    if (estadoPaquete === 'Enviado') setConfirmando(false);
  }, [estadoPaquete]);

  if (estadoCarga === 'cargando') {
    return <PaqueteCargando />;
  }

  if (estadoCarga === 'noEncontrado' || paquete === null || resumen === null) {
    return <PaqueteNoEncontrado codigo={codigo} />;
  }

  const otrosPaquetes = paquetesSembrados.filter((otro) => otro.codigo !== paquete.codigo);

  const asunto = t('paquete.correo.asunto', {
    sector: t(`paquete.sector.${paquete.sector}`),
    evento: paquete.evento.nombre,
    codigo: paquete.codigo,
  });

  const cuerpo = t('paquete.correo.cuerpo', {
    entidad: paquete.entidad,
    evento: paquete.evento.nombre,
    declaratoria: t(`paquete.declaratoria.${paquete.evento.declaratoria}`).toLowerCase(),
    decreto: paquete.evento.numeroDecreto ?? t('paquete.sinDecreto'),
    sector: t(`paquete.sector.${paquete.sector}`),
    danos: resumen.totalDanos,
    municipios: resumen.totalMunicipios,
    costo: formatearPesos(resumen.costoEstimadoTotal),
    verificados: resumen.porConfianza.Verificado,
    censados: resumen.porConfianza.Censado,
    autorreportados: resumen.porConfianza.Autorreportado,
    costoNecesidades: formatearPesos(resumen.costoNecesidades),
  });

  return (
    <div className="mx-auto max-w-[100rem] animate-fade-in space-y-4 pb-10">
      {paquete.estado === 'Enviado' && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('paquete.avisoEnviado')}
        </p>
      )}

      <EncabezadoPaquete paquete={paquete} otrosPaquetes={otrosPaquetes} />

      <ResumenAfectacion resumen={resumen} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <TotalesPorMunicipio resumen={resumen} />
          <DetalleDanos danos={paquete.danos} porConfianza={resumen.porConfianza} />
          <TablaNecesidades
            necesidades={paquete.necesidades}
            costoTotal={resumen.costoNecesidades}
          />
        </div>

        <aside className="xl:sticky xl:top-[4.5rem] xl:self-start">
          <PanelEnvio
            paquete={paquete}
            resumen={resumen}
            asunto={asunto}
            cuerpo={cuerpo}
            onDescargarCsv={() => descargarCsvPaquete(paquete, (clave) => t(clave))}
            onSolicitarEnvio={() => setConfirmando(true)}
          />
        </aside>
      </div>

      {confirmando && (
        <DialogoConfirmacion
          titulo={t('paquete.confirmarTitulo')}
          descripcion={t('paquete.confirmarDescripcion', { entidad: paquete.entidad })}
          textoConfirmar={t('paquete.confirmarAccion')}
          textoTrabajando={t('paquete.confirmarEnProceso')}
          trabajando={enviando}
          onConfirmar={aprobarYEnviar}
          onCancelar={() => setConfirmando(false)}
        >
          <dl className="space-y-1.5">
            <div className="flex gap-2">
              <dt className="font-semibold">{t('paquete.correoPara')}</dt>
              <dd className="break-all font-mono text-xs">{paquete.correoDestino}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">{t('paquete.confirmarContenido')}</dt>
              <dd>
                {t('paquete.firmaResumen', {
                  danos: resumen.totalDanos,
                  municipios: resumen.totalMunicipios,
                  costo: formatearPesos(resumen.costoEstimadoTotal),
                })}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs font-semibold text-ungrd-800">{t('paquete.simuladoEtiqueta')}</p>
        </DialogoConfirmacion>
      )}
    </div>
  );
}

/** Esqueleto mientras llega el paquete: la pantalla no salta al terminar de cargar. */
function PaqueteCargando() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-[100rem] space-y-4">
      <p role="status" className="text-sm text-slate-500">
        {t('paquete.cargando')}
      </p>
      <div className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="grid gap-4 lg:grid-cols-5">
        {[0, 1, 2].map((posicion) => (
          <div key={posicion} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70 lg:col-span-2" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70 xl:col-span-2" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}

/** El código no corresponde a ningún paquete: se dice en lenguaje comprensible y se ofrece salida. */
function PaqueteNoEncontrado({ codigo }: { codigo: string | undefined }) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <PackageSearch className="h-7 w-7 text-slate-500" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-bold text-slate-800">{t('paquete.noEncontradoTitulo')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('paquete.noEncontradoApoyo', { codigo: codigo ?? t('paquete.sinCodigo') })}
      </p>
      <Link
        to={`/panel/paquetes/${codigoPaquetePorDefecto}`}
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-ungrd-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ungrd-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400 focus-visible:ring-offset-2"
      >
        {t('paquete.verPaqueteEjemplo')}
      </Link>
    </div>
  );
}
