import { useTranslation } from 'react-i18next';

/**
 * El asterisco de campo obligatorio.
 *
 * Va en rojo 600 y no 500 (el 500 sobre blanco se queda en 3,7:1) y lleva la palabra
 * «obligatorio» para lector de pantalla: un asterisco de color no es una señal, es una decoración.
 */
export default function MarcaObligatorio() {
  const { t } = useTranslation();
  return (
    <>
      <span aria-hidden="true" className="text-red-600">
        {t('census.requiredMark')}
      </span>
      <span className="sr-only">{t('census.requiredLabel')}</span>
    </>
  );
}
