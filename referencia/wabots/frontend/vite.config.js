import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend corre en :5173 y proxya /api y /socket.io al backend (:3000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
    },
  },
  // Producción: sin sourcemaps (no se expone el código fuente original con sus
  // comentarios/estructura en el navegador) y sin logs de depuración en el
  // bundle. La minificación de esbuild renombra identificadores locales.
  esbuild: {
    legalComments: 'none',
    drop: ['debugger'],
    pure: ['console.log', 'console.debug', 'console.info'],
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    // Vendors pesados en chunks propios: mejor caché entre deploys y un
    // bundle inicial mucho más ligero (reactflow sólo lo baja el editor).
    rollupOptions: {
      output: {
        // Forma función (no objeto): así las dependencias compartidas (p. ej.
        // zustand) NO se arrastran dentro de vendor-flow, y reactflow queda
        // realmente aislado del bundle inicial (sin modulepreload en la landing).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // zustand lo usan authStore (eager) y reactflow: fijarlo en
          // vendor-react evita que caiga dentro de vendor-flow y lo encadene
          // al arranque.
          if (id.includes('zustand') || id.includes('use-sync-external-store')) {
            return 'vendor-react';
          }
          if (id.includes('reactflow') || id.includes('d3-')) return 'vendor-flow';
          if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-socket';
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('scheduler') ||
            /[\\/]node_modules[\\/]react[\\/]/.test(id)
          ) {
            return 'vendor-react';
          }
          return undefined; // resto (axios, zustand…) va con quien lo importe
        },
      },
    },
  },
});
