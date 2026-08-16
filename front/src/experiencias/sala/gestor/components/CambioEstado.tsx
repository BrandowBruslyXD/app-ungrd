import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EstadoReporte } from '@/shared/types/contrato';

/**
 * El formulario que cierra el ciclo: a qué estado avanza el reporte y qué va a leer el ciudadano.
 *
 * Las sugerencias no son adorno. Escribir bajo presión cuesta, y una nota tocable es la
 * diferencia entre una cronología con contexto y una llena de notas automáticas.
 */

const CLAVES_SUGERENCIAS: readonly string[] = [
  'gestor.sugerencia1',
  'gestor.sugerencia2',
  'gestor.sugerencia3',
  'gestor.sugerencia4',
];

interface Props {
  codigo: string;
  siguientes: EstadoReporte[];
  guardando: boolean;
  onGuardar: (estado: EstadoReporte, nota: string) => void;
  onCancelar: () => void;
}

export default function CambioEstado({
  codigo,
  siguientes,
  guardando,
  onGuardar,
  onCancelar,
}: Props) {
  const { t } = useTranslation();
  const [estadoElegido, setEstadoElegido] = useState<EstadoReporte | null>(null);
  const [nota, setNota] = useState('');

  const idNota = `nota-${codigo}`;

  return (
    <form
      className="border-t border-slate-200 bg-slate-50 p-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (estadoElegido !== null) {
          onGuardar(estadoElegido, nota);
        }
      }}
    >
      <fieldset disabled={guardando} className="min-w-0">
        <legend className="text-sm font-semibold text-slate-800">{t('gestor.elegirEstado')}</legend>

        <div className="mt-2 flex flex-wrap gap-2">
          {siguientes.map((estado) => {
            const elegido = estado === estadoElegido;
            return (
              <label
                key={estado}
                className={`flex min-h-[44px] cursor-pointer items-center rounded-xl border px-4 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-ungrd-400 ${
                  elegido
                    ? 'border-ungrd-600 bg-ungrd-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-ungrd-400 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name={`estado-${codigo}`}
                  value={estado}
                  checked={elegido}
                  onChange={() => setEstadoElegido(estado)}
                  className="sr-only"
                />
                {t(`status.${estado}`)}
              </label>
            );
          })}
        </div>

        <label htmlFor={idNota} className="mt-4 block text-sm font-semibold text-slate-800">
          {t('gestor.notaEtiqueta')}
        </label>
        <p className="text-xs text-slate-500">{t('gestor.notaAyuda')}</p>
        <textarea
          id={idNota}
          value={nota}
          onChange={(evento) => setNota(evento.target.value)}
          rows={2}
          maxLength={240}
          placeholder={t('gestor.notaMarcador')}
          className="textarea-field mt-2 text-sm"
        />

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('gestor.sugerenciasTitulo')}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {CLAVES_SUGERENCIAS.map((clave) => {
            const sugerencia = t(clave);
            return (
              <button
                key={clave}
                type="button"
                onClick={() => setNota(sugerencia)}
                aria-pressed={nota === sugerencia}
                aria-label={t('gestor.usarSugerencia', { nota: sugerencia })}
                className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400 ${
                  nota === sugerencia
                    ? 'border-ungrd-300 bg-ungrd-50 text-ungrd-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sugerencia}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={estadoElegido === null || guardando}
            className="btn-primary min-h-[44px] px-4 py-2 text-sm"
          >
            {guardando ? t('gestor.guardando') : t('gestor.confirmar')}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="btn-secondary min-h-[44px] px-4 py-2 text-sm"
          >
            {t('gestor.cancelar')}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
