import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de punta a punta: navegador real contra la aplicación real.
 *
 * Complementan a vitest, no lo reemplazan. Vitest comprueba piezas con datos que
 * él mismo inventa; esto comprueba que lo que hay en la base de datos termina
 * pintado en la pantalla, que es donde se rompen las integraciones.
 *
 * El servidor de desarrollo lo levanta Playwright solo. El **backend no**: tiene
 * que estar corriendo aparte y la base sembrada, porque el objetivo es ver los
 * datos de verdad. Si no está, las pruebas fallan al primer `request.get`, y eso
 * es correcto — significa que la integración no está en pie.
 */
const PUERTO = Number(process.env.PUERTO_WEB ?? 5199);

export default defineConfig({
  testDir: './e2e',
  // Un móvil de gama baja con mala señal es el caso real de esta aplicación.
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'es-CO',
  },

  projects: [
    {
      // Se prueba en móvil porque la aplicación es mobile-first: lo que cabe en
      // escritorio puede estar tapando media pantalla en un teléfono.
      name: 'movil',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
