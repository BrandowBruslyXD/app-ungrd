import { useTranslation } from 'react-i18next';

export interface Pregunta {
  q: string;
  a: string;
}

/**
 * Lee las preguntas frecuentes del archivo de textos, ya tipadas.
 *
 * Vive en su propio archivo y no junto al componente por dos razones: React
 * exige que los hooks empiecen por `use` —de ahí el nombre en inglés, contra la
 * convención en español del resto del proyecto— y porque exportar un hook desde
 * un archivo de componente rompe el refresco en caliente de Vite.
 */
export function usePreguntasFrecuentes(): Pregunta[] {
  const { t } = useTranslation();
  const items = t('faq.items', { returnObjects: true });
  return Array.isArray(items) ? (items as Pregunta[]) : [];
}
