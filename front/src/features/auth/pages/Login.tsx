import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, User, Flame, ClipboardList, Building2, type LucideIcon } from 'lucide-react';
import Aviso from '@/components/ui/Aviso';
import Foto, { type FuenteFoto } from '@/components/ui/Foto';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { FOTOS } from '@/lib/fotos';
import { RUTA_POR_ROL } from '@/lib/rutasPorRol';
import type { DemoView } from '@/types';

interface LoginProps {
  onRoleChange: (role: DemoView) => void;
}

interface VistaDisponible {
  rol: DemoView;
  claveTitulo: string;
  claveCuerpo: string;
  icono: LucideIcon;
  foto: FuenteFoto;
  alt: string;
}

const VISTAS: readonly VistaDisponible[] = [
  {
    rol: 'Ciudadano',
    claveTitulo: 'login.roleCitizenTitle',
    claveCuerpo: 'login.roleCitizenBody',
    icono: User,
    foto: FOTOS.veredasAtardecer,
    alt: 'Vista aérea de viviendas y parcelas rurales al atardecer, en Tauramena.',
  },
  {
    rol: 'Socorro',
    claveTitulo: 'login.roleSocorroTitle',
    claveCuerpo: 'login.roleSocorroBody',
    icono: Flame,
    foto: FOTOS.rescateInundacion,
    alt: 'Equipo de socorro navegando en bote por una zona inundada.',
  },
  {
    rol: 'Brigadista',
    claveTitulo: 'login.roleBrigadistaTitle',
    claveCuerpo: 'login.roleBrigadistaBody',
    icono: ClipboardList,
    foto: FOTOS.recorridoEnCampo,
    alt: 'Un grupo de personas recorriendo un terreno verde en zona rural.',
  },
  {
    rol: 'Gestor',
    claveTitulo: 'login.roleGestorTitle',
    claveCuerpo: 'login.roleGestorBody',
    icono: Building2,
    foto: FOTOS.valleRioAereo,
    alt: 'Vista aérea de un río atravesando un valle entre montañas, en Medellín.',
  },
];

/**
 * Selector de vista.
 *
 * **No es un inicio de sesión y a propósito no pide usuario ni contraseña.**
 * El backend tiene `POST /api/auth/login` pero el frontend todavía no está
 * conectado a él: un formulario de credenciales aquí solo serviría para que la
 * gente se quede afuera intentando adivinar una clave que no existe.
 *
 * Lo que sí hace falta —y es lo que esta pantalla resuelve— es poder ver la
 * aplicación desde cada rol, porque cada uno ve algo distinto y esa es la
 * demostración. Cuando la autenticación real se conecte, esta pantalla se
 * convierte en el formulario y las tarjetas quedan solo para la demostración.
 */
export default function Login({ onRoleChange }: LoginProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useTituloPagina(t('meta.login.title'), t('meta.login.description'));

  function entrarComo(rol: DemoView): void {
    onRoleChange(rol);
    navigate(RUTA_POR_ROL[rol]);
  }

  return (
    <div className="mx-auto w-full max-w-6xl bg-papel px-4 shadow-[0_0_40px_rgba(4,25,60,0.10)] lg:my-8 lg:rounded-ficha lg:border lg:border-papel-borde lg:px-8 py-8 lg:py-12">
      <Link
        to="/"
        className="-ml-3 mb-4 inline-flex min-h-control items-center gap-2 rounded-control px-3 font-semibold text-azul-600 hover:bg-azul-50"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {t('login.backHome')}
      </Link>

      <h1 className="text-2xl sm:text-3xl">{t('login.title')}</h1>
      <p className="mt-2 max-w-2xl text-lg text-tinta-600">{t('login.subtitle')}</p>

      <div className="mt-6 max-w-2xl">
        <Aviso tono="info">{t('login.demoNote')}</Aviso>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {VISTAS.map(({ rol, claveTitulo, claveCuerpo, icono: Icono, foto, alt }) => (
          <button
            key={rol}
            type="button"
            onClick={() => entrarComo(rol)}
            className="ficha-pulsable group flex flex-col overflow-hidden text-left"
          >
            <Foto fuente={foto} alt={alt} proporcion="ancha" sizes="(min-width: 640px) 50vw, 100vw" />
            <span className="flex flex-1 flex-col p-4 sm:p-5">
              <span className="flex items-center gap-2.5">
                <Icono className="h-6 w-6 shrink-0 text-azul-600" aria-hidden="true" />
                <span className="text-lg font-bold">{t(claveTitulo)}</span>
              </span>
              <span className="mt-2 flex-1 leading-relaxed text-tinta-600">{t(claveCuerpo)}</span>
              <span className="mt-4 inline-flex items-center gap-2 font-bold text-azul-600 group-hover:text-azul-700">
                {t('login.enterAs', { role: t(`roles.${rol}`) })}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
