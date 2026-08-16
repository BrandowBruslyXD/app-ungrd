import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartHandshake,
  Banknote,
  FileCheck,
  Stethoscope,
  ChevronDown,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { listAyudas } from '@/api/reportes';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import CampoTexto from '@/components/ui/CampoTexto';
import Aviso from '@/components/ui/Aviso';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { AidItem } from '@/types';

const ICONOS_CATEGORIA: Record<string, LucideIcon> = {
  'heart-handshake': HeartHandshake,
  banknote: Banknote,
  'file-check': FileCheck,
  stethoscope: Stethoscope,
};

/**
 * Una ayuda concreta, plegada hasta que alguien la abre.
 *
 * El bloque de «perdí mis documentos» va aparte y destacado a propósito: es la
 * situación más común después de una inundación o un incendio, y es justo donde
 * la gente asume que ya no califica para nada y deja de intentar.
 */
function TarjetaAyuda({ item }: { item: AidItem }) {
  const { t } = useTranslation();

  const estados = {
    disponible: {
      etiqueta: t('aid.available'),
      icono: CheckCircle2,
      clases: 'bg-seguro-50 text-seguro-700',
    },
    agotado: { etiqueta: t('aid.exhausted'), icono: AlertTriangle, clases: 'bg-alerta-50 text-alerta-700' },
    proximo: { etiqueta: t('aid.upcoming'), icono: Clock, clases: 'bg-espera-50 text-espera-700' },
  } as const;

  const estado = estados[item.status];
  const IconoEstado = estado.icono;

  return (
    <details className="group ficha overflow-hidden">
      <summary className="flex min-h-control cursor-pointer list-none items-center gap-3 p-4 hover:bg-tinta-50 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="h-6 w-6 shrink-0 text-azul-600 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">{item.title}</span>
          <span className="mt-1 flex items-center gap-1.5 text-sm text-tinta-600">
            <Building className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.entity}
          </span>
        </span>
        <span className={`distintivo shrink-0 ${estado.clases}`}>
          <IconoEstado className="h-4 w-4 shrink-0" aria-hidden="true" />
          {estado.etiqueta}
        </span>
      </summary>

      <div className="border-t border-papel-borde p-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-tinta-500">
          {t('aid.requirements')}
        </h4>
        <ul className="mt-2 space-y-2">
          {item.requirements.map((requisito) => (
            <li key={requisito} className="flex items-start gap-2.5 leading-snug">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-azul-600" aria-hidden="true" />
              {requisito}
            </li>
          ))}
        </ul>

        {item.lostDocsAlternative && (
          <div className="mt-4">
            <Aviso tono="espera" titulo={t('aid.lostDocs')}>
              {item.lostDocsAlternative}
            </Aviso>
          </div>
        )}
      </div>
    </details>
  );
}

export default function AidDirectory() {
  const { t } = useTranslation();
  const categorias = listAyudas();
  const [busqueda, setBusqueda] = useState('');

  useTituloPagina(t('meta.aid.title'), t('meta.aid.description'));

  const termino = busqueda.trim().toLowerCase();
  const filtradas = termino
    ? categorias
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.title.toLowerCase().includes(termino) ||
              item.entity.toLowerCase().includes(termino),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : categorias;

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <div className="mb-7">
        <BandaPortada
          titulo={t('aid.title')}
          descripcion={t('aid.subtitle')}
          foto={FOTOS.ganadoPastizal}
          alt="Ganado pastando en una finca de Antioquia."
          icono={HeartHandshake}
        />
      </div>

      {/* Lo primero, antes del listado: ninguna ayuda se paga. */}
      <div className="mb-6">
        <Aviso tono="seguro" titulo={t('aid.noticeTitle')}>
          {t('aid.noticeBody')}
        </Aviso>
      </div>

      <div className="mb-7">
        <CampoTexto
          etiqueta={t('aid.searchLabel')}
          valor={busqueda}
          onChange={setBusqueda}
          marcador={t('aid.searchPlaceholder')}
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="ficha p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-tinta-300" aria-hidden="true" />
          <p className="mt-4 text-lg font-bold">{t('aid.noResults', { query: busqueda })}</p>
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="btn-secondary mt-5 inline-flex"
          >
            {t('aid.clearSearch')}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filtradas.map((categoria) => {
            const Icono = ICONOS_CATEGORIA[categoria.icon] ?? HeartHandshake;
            return (
              <section key={categoria.id}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-azul-600 text-white">
                    <Icono className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl">{categoria.title}</h2>
                    <p className="text-tinta-600">{categoria.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {categoria.items.map((item) => (
                    <TarjetaAyuda key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
