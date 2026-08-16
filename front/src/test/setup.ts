import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { i18nReady } from '@/i18n';

/*
 * Node 22 expone un `localStorage` global experimental que pisa el de jsdom y
 * llega sin `setItem`. El resultado era que todo lo que persiste —reporte,
 * censo, incidente, habitabilidad— guardaba en el vacío y siete pruebas fallaban
 * sin que hubiera nada roto en la aplicación: en el navegador funciona.
 *
 * Se instala una implementación en memoria, que además conviene por sí sola:
 * cada prueba arranca con el almacenamiento limpio y no hereda lo que dejó la
 * anterior.
 */
function crearAlmacenamientoEnMemoria(): Storage {
  let datos = new Map<string, string>();

  return {
    get length() {
      return datos.size;
    },
    clear: () => {
      datos = new Map();
    },
    getItem: (clave: string) => datos.get(String(clave)) ?? null,
    key: (indice: number) => Array.from(datos.keys())[indice] ?? null,
    removeItem: (clave: string) => {
      datos.delete(String(clave));
    },
    setItem: (clave: string, valor: string) => {
      datos.set(String(clave), String(valor));
    },
  };
}

for (const nombre of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(window, nombre, {
    value: crearAlmacenamientoEnMemoria(),
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

await i18nReady;
