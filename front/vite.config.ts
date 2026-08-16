import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/*
 * GDACS responde 200 con JSON pero sin cabecera CORS, así que el navegador
 * bloquea la llamada directa. En producción la resuelve la función de
 * `api/gdacs.ts`; en desarrollo, este proxy. La ruta relativa `/api/gdacs` es la
 * misma en los dos entornos, de modo que el cliente no sabe dónde está.
 *
 * La dirección está repetida en `api/gdacs.ts` a propósito: la función
 * desplegada no debe importar código de la aplicación.
 */
const RUTA_PROXY_GDACS = '/api/gdacs';
const URL_GDACS =
  'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;DR;WF';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [RUTA_PROXY_GDACS]: {
        target: 'https://www.gdacs.org',
        changeOrigin: true,
        rewrite: () => URL_GDACS.replace('https://www.gdacs.org', ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
