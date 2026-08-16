import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Send, TestTube } from 'lucide-react';
import Aviso from '@/components/ui/Aviso';
import Ficha from '@/components/ui/Ficha';
import type { CorreoCompuesto } from '@/lib/sectorial';
import type { EstadoEnvio } from '../../hooks/usePaqueteMinisterio';
import { formatearFechaHora } from './formato';

interface CorreoDelPaqueteProps {
  correo: CorreoCompuesto;
  archivos: readonly string[];
  envio: EstadoEnvio;
  entidad: string;
  totalDanos: number;
  /** Sin declaratoria no hay decreto que citar y el oficio no se puede remitir. */
  puedeRemitir: boolean;
  onAprobar: () => void;
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="border-b border-papel-borde px-4 py-3 sm:px-5">
      <p className="text-sm font-semibold text-tinta-500">{etiqueta}</p>
      <div className="mt-0.5 min-w-0 text-tinta-900">{children}</div>
    </div>
  );
}

/**
 * El correo tal como saldría, y la firma que lo autoriza.
 *
 * Dos cosas que no se negocian y por eso están escritas aquí:
 *
 * 1. **El envío es simulado y la pantalla lo dice**, con etiqueta visible y no
 *    en letra pequeña. Presentar como real un envío que no ocurrió es engañar
 *    a quien mira la demostración, y si preguntan, se nota.
 * 2. **El envío lo firma una persona**, nunca sale solo. El formato oficial
 *    exige que un gobernador o un alcalde aprueben la remisión del EDAN; un
 *    documento oficial que se va sin que nadie lo mire es un riesgo
 *    institucional, no una comodidad.
 * 3. **Sin declaratoria no se ofrece firmar.** El oficio cita el decreto que lo
 *    ampara; si el evento no tiene ninguno, el botón no aparece y en su lugar se
 *    explica qué falta. El panel del desastre ya lo advierte, y las dos
 *    pantallas tienen que decir lo mismo.
 *
 * La confirmación va en la propia página y no en un `window.confirm`: ese
 * diálogo no se puede leer con lupa, no respeta el tamaño de letra del sistema
 * y algunos navegadores lo bloquean sin avisar.
 */
export default function CorreoDelPaquete({
  correo,
  archivos,
  envio,
  entidad,
  totalDanos,
  puedeRemitir,
  onAprobar,
}: CorreoDelPaqueteProps) {
  const { t } = useTranslation();
  const [confirmando, setConfirmando] = useState(false);
  const botonConfirmar = useRef<HTMLButtonElement>(null);

  const enviado = envio.estado === 'Enviado';

  // Quien abre la confirmación con teclado tiene que quedar dentro de ella; si
  // no, el foco se queda en un botón que acaba de desaparecer de la pantalla.
  useEffect(() => {
    if (confirmando) botonConfirmar.current?.focus();
  }, [confirmando]);

  return (
    <Ficha
      titulo={t('ungrd.paquete.correoTitulo')}
      icono={Mail}
      apunte={t('ungrd.paquete.pasoTresApunte')}
      sinRelleno
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-papel-borde bg-papel-hueco px-4 py-3 sm:px-5">
        <span className="distintivo bg-espera-50 text-espera-700">
          <TestTube className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('ungrd.paquete.simuladoEtiqueta')}</span>
        </span>
        <p className="min-w-0 flex-1 text-sm text-tinta-600">{t('ungrd.paquete.simuladoTexto')}</p>
      </div>

      <Campo etiqueta={t('ungrd.paquete.correoDestinatario')}>
        <span className="break-all font-mono text-sm">{correo.destinatario}</span>
      </Campo>

      <Campo etiqueta={t('ungrd.paquete.correoAsunto')}>{correo.asunto}</Campo>

      <Campo etiqueta={t('ungrd.paquete.correoCuerpo')}>
        {/* El cuerpo se compone con saltos de línea reales: se muestra tal cual,
            no reflujado, porque es el texto que quedaría registrado. */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta-800">
          {correo.cuerpo}
        </p>
      </Campo>

      <Campo etiqueta={t('ungrd.paquete.correoAdjuntos')}>
        <ul className="space-y-0.5">
          {archivos.map((archivo) => (
            <li key={archivo} className="break-all font-mono text-sm">
              {archivo}
            </li>
          ))}
        </ul>
      </Campo>

      <div className="p-4 sm:p-5">
        {enviado ? (
          <Aviso tono="seguro" titulo={t('ungrd.paquete.enviadoTitulo')} urgente>
            <p>
              {envio.aprobadoPor === undefined || envio.aprobadoEn === undefined
                ? t('ungrd.paquete.enviadoSinFirma')
                : t('ungrd.paquete.enviadoTexto', {
                    persona: envio.aprobadoPor,
                    fecha: formatearFechaHora(envio.aprobadoEn),
                  })}
            </p>
          </Aviso>
        ) : !puedeRemitir ? (
          <Aviso tono="espera" titulo={t('ungrd.paquete.sinDecretoTitulo')}>
            <p>{t('ungrd.paquete.sinDecretoTexto')}</p>
          </Aviso>
        ) : confirmando ? (
          <div
            role="group"
            aria-labelledby="confirmar-envio"
            className="rounded-ficha border-2 border-azul-600 bg-azul-50 p-4"
          >
            <h3 id="confirmar-envio" className="text-base text-azul-900">
              {t('ungrd.paquete.confirmarTitulo')}
            </h3>
            <p className="mt-1 text-sm text-azul-900">
              {t('ungrd.paquete.confirmarTexto', { danos: totalDanos, entidad })}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                ref={botonConfirmar}
                onClick={() => {
                  setConfirmando(false);
                  onAprobar();
                }}
                className="btn-primary"
              >
                <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t('ungrd.paquete.confirmarSi')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="btn-secondary"
              >
                {t('ungrd.paquete.confirmarNo')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="btn-accent w-full sm:w-auto"
          >
            <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('ungrd.paquete.aprobarYEnviar')}
          </button>
        )}
      </div>
    </Ficha>
  );
}
