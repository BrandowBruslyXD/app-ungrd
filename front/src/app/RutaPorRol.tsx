import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import type { DemoView } from '@/shared/types';
import { useSesionDemo } from '@/shared/hooks/useSesionDemo';

interface RutaPorRolProps {
  permitidos: DemoView[];
  children: ReactNode;
}

/**
 * Bloquea una rama de rutas a los roles indicados.
 *
 * ⚠️ Es comodidad, no seguridad: la autorización real es el 403 del servidor.
 * Un rol se elige hoy desde el selector de demostración, así que esta guarda
 * solo evita que alguien llegue por accidente a una vista que no le sirve.
 */
export default function RutaPorRol({ permitidos, children }: RutaPorRolProps) {
  const { t } = useTranslation();
  const { rol } = useSesionDemo();

  if (permitidos.includes(rol)) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <ShieldAlert className="h-7 w-7 text-amber-700" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-bold text-slate-800">{t('acceso.sinPermisoTitulo')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('acceso.sinPermisoApoyo', { roles: permitidos.map((r) => t(`roles.${r}`)).join(' · ') })}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-ungrd-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ungrd-700"
      >
        {t('acceso.volverInicio')}
      </Link>
    </div>
  );
}
