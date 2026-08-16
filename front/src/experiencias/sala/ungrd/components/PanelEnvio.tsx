import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, FileDown, FlaskConical, Info, Send } from 'lucide-react';
import type { PaqueteMinisterio, ResumenPaquete } from '@/experiencias/sala/ungrd/types/paquete';
import { formatearFechaHora, formatearPesos } from '@/experiencias/sala/ungrd/utils/resumenPaquete';
import { nombreArchivoCsv } from '@/experiencias/sala/ungrd/utils/csvPaquete';

interface PanelEnvioProps {
  paquete: PaqueteMinisterio;
  resumen: ResumenPaquete;
  asunto: string;
  cuerpo: string;
  onDescargarCsv: () => void;
  onSolicitarEnvio: () => void;
}

/**
 * Columna de salida: los archivos, el correo tal como se compuso y la firma humana.
 *
 * El envío es simulado y la interfaz lo dice con una etiqueta visible: presentar como
 * real un envío que no ocurrió sería engañar a quien mira la pantalla.
 */
export default function PanelEnvio({
  paquete,
  resumen,
  asunto,
  cuerpo,
  onDescargarCsv,
  onSolicitarEnvio,
}: PanelEnvioProps) {
  const { t } = useTranslation();
  const yaEnviado = paquete.estado === 'Enviado';

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl bg-gold-100 px-3 py-2.5 text-xs font-semibold text-ungrd-900 ring-1 ring-gold-300">
        <FlaskConical className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {t('paquete.simuladoEtiqueta')}
          <span className="mt-0.5 block font-normal text-ungrd-800">
            {t('paquete.simuladoApoyo')}
          </span>
        </span>
      </p>

      <section
        aria-labelledby="titulo-entregables"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 id="titulo-entregables" className="text-sm font-bold text-slate-800">
          {t('paquete.entregablesTitulo')}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{t('paquete.entregablesApoyo')}</p>

        <button
          type="button"
          onClick={onDescargarCsv}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-ungrd-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ungrd-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400 focus-visible:ring-offset-2"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {t('paquete.descargarCsv')}
        </button>
        <p className="mt-1.5 text-xs text-slate-500">
          {t('paquete.csvApoyo', { archivo: nombreArchivoCsv(paquete), filas: resumen.totalDanos })}
        </p>

        <button
          type="button"
          disabled
          className="mt-3 inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          {t('paquete.descargarPdf')}
        </button>
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          {t('paquete.pdfPendiente')}
        </p>
      </section>

      <section
        aria-labelledby="titulo-correo"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 id="titulo-correo" className="text-sm font-bold text-slate-800">
          {t('paquete.correoTitulo')}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{t('paquete.correoApoyo')}</p>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('paquete.correoPara')}
            </dt>
            <dd className="min-w-0 break-all font-mono text-xs text-slate-700">
              {paquete.correoDestino}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('paquete.correoAsunto')}
            </dt>
            <dd className="min-w-0 text-sm font-semibold text-slate-800">{asunto}</dd>
          </div>
        </dl>

        <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
          {cuerpo}
        </div>
      </section>

      <section
        aria-labelledby="titulo-firma"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 id="titulo-firma" className="text-sm font-bold text-slate-800">
          {t('paquete.firmaTitulo')}
        </h2>

        {yaEnviado ? (
          <div className="mt-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('paquete.envioRegistrado')}
            </p>
            <dl className="mt-2 space-y-1 text-xs text-emerald-900">
              <div className="flex gap-1.5">
                <dt className="font-semibold">{t('paquete.envioFecha')}</dt>
                <dd>
                  {paquete.enviadoEn ? formatearFechaHora(paquete.enviadoEn) : t('paquete.sinFecha')}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-semibold">{t('paquete.envioAprobadoPor')}</dt>
                <dd>{t('paquete.aprobadoPorDemo')}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-semibold">{t('paquete.envioModo')}</dt>
                <dd>{t('paquete.envioModoSimulado')}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-500">{t('paquete.firmaApoyo')}</p>
            <button
              type="button"
              onClick={onSolicitarEnvio}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {t('paquete.aprobarYEnviar')}
            </button>
            <p className="mt-1.5 text-xs text-slate-500">
              {t('paquete.firmaResumen', {
                danos: resumen.totalDanos,
                municipios: resumen.totalMunicipios,
                costo: formatearPesos(resumen.costoEstimadoTotal),
              })}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
