import { useTranslation } from 'react-i18next';
import { FileDown, FileText, Paperclip } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';

interface EntregablesProps {
  nombreCsv: string;
  onDescargarCsv: () => void;
}

/**
 * Los dos archivos que recibe el ministerio. Hoy uno funciona y el otro no.
 *
 * El botón del PDF va **visible y deshabilitado, con el motivo escrito al
 * lado**. La alternativa era esconderlo, y esconderlo es peor: el oficio de
 * remisión es el documento que se archiva, y quien revisa esta pantalla tiene
 * que saber que todavía no existe antes de aprobar el envío, no descubrirlo
 * después. Un botón honesto vale más que uno decorativo que abre un archivo
 * vacío.
 */
export default function Entregables({ nombreCsv, onDescargarCsv }: EntregablesProps) {
  const { t } = useTranslation();

  return (
    <Ficha titulo={t('ungrd.paquete.entregablesTitulo')} icono={Paperclip}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <button type="button" onClick={onDescargarCsv} className="btn-primary w-full">
            <FileDown className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('ungrd.paquete.descargarCsv')}
          </button>
          <p className="mt-2 break-all font-mono text-xs text-tinta-500">{nombreCsv}</p>
          <p className="mt-1 text-sm text-tinta-600">{t('ungrd.paquete.csvAyuda')}</p>
        </div>

        <div className="min-w-0">
          <button
            type="button"
            disabled
            aria-describedby="pdf-pendiente"
            className="btn-secondary w-full"
          >
            <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('ungrd.paquete.descargarPdf')}
          </button>
          <p id="pdf-pendiente" className="mt-2 text-sm text-tinta-600">
            {t('ungrd.paquete.pdfPendiente')}
          </p>
        </div>
      </div>
    </Ficha>
  );
}
