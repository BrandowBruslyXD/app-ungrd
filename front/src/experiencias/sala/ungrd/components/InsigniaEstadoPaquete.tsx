import { useTranslation } from 'react-i18next';
import type { EstadoPaquete } from '@/experiencias/sala/ungrd/types/paquete';

const estilos: Record<EstadoPaquete, string> = {
  Borrador: 'bg-slate-100 text-slate-600 ring-slate-200',
  EnRevision: 'bg-gold-100 text-ungrd-900 ring-gold-300',
  Aprobado: 'bg-blue-50 text-blue-700 ring-blue-200',
  Enviado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

interface InsigniaEstadoPaqueteProps {
  estado: EstadoPaquete;
}

/** Estado del paquete: dice si todavía se puede tocar o si ya salió. */
export default function InsigniaEstadoPaquete({ estado }: InsigniaEstadoPaqueteProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estilos[estado]}`}
    >
      {t(`paquete.estado.${estado}`)}
    </span>
  );
}
