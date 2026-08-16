import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta como pública, exenta del guard JWT global. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
