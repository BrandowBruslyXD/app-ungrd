/**
 * Sistema de diseño de ConectaRiesgo.
 *
 * Dos restricciones mandan sobre la estética y explican casi todas las decisiones
 * de este archivo:
 *
 * 1. Quien usa esto puede tener 65 años, estar bajo el sol, con lluvia, un
 *    Android barato y sin haber usado una app antes. La escala tipografica
 *    arranca en 18px (no 16) y los controles miden 56-64px de alto.
 * 2. La red es mala o no hay. Cero fuentes externas: la pila del sistema pinta
 *    texto en el primer frame y funciona sin conexion.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Pila del sistema: sin descarga, sin bloqueo de render, sin fallo offline.
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Los codigos oficiales (RPT-2026-08-16-0003-3GG4, FR-1703-SMD-08) son
        // identificadores que la gente copia y dicta. Monoespaciada para que no
        // se confundan 0/O ni 1/l, y porque es el vernaculo real del dominio.
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'],
      },

      /*
       * Escala corrida un paso hacia arriba respecto a Tailwind por defecto.
       * `text-base` es 18px, no 16. Asi cualquier pantalla que todavia no se
       * haya migrado ya gana legibilidad sin tocarla.
       */
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.25rem' }], //  14px - solo metadatos
        sm: ['1rem', { lineHeight: '1.5rem' }], //  16px - texto secundario
        base: ['1.125rem', { lineHeight: '1.75rem' }], //  18px - piso del cuerpo
        lg: ['1.25rem', { lineHeight: '1.875rem' }], //  20px
        xl: ['1.5rem', { lineHeight: '2rem' }], //  24px
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }], //  30px
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }], //  36px
        '4xl': ['2.75rem', { lineHeight: '3rem' }], //  44px
        '5xl': ['3.5rem', { lineHeight: '1.05' }], //  56px
      },

      /*
       * ── Paleta: los colores de Colombia, vivos ─────────────────────────────
       *
       * Amarillo, azul y rojo de la bandera. No es decoracion patriotica: en una
       * herramienta de emergencia los tres ya significan algo por si solos
       * —el amarillo llama la atencion, el azul es la institucion, el rojo es el
       * peligro— asi que la identidad del pais y la semantica de la interfaz
       * coinciden sin forzar nada.
       *
       * Antes se probaron dos caminos y los dos fallaron. El azul corporativo
       * #003876 con amarillo neon se veia pegado encima de las fotos. Y una
       * version en verde petroleo desaturado dejaba la pagina apagada, que es
       * peor: una herramienta que la gente abre en el peor dia de su vida no
       * tiene por que verse triste encima. Estos tonos son saturados a proposito.
       */
      colors: {
        /* Azul de bandera, profundo y luminoso. Encabezado, bandas y accion
         * institucional. El 600 da mas de 10:1 sobre blanco. */
        azul: {
          50: '#eef3fc',
          100: '#d7e3f8',
          200: '#afc7f1',
          300: '#7fa4e6',
          400: '#4a7bd6',
          500: '#1f55be',
          600: '#0a3a8f',
          700: '#082e72',
          800: '#062355',
          900: '#04193c',
          950: '#020f26',
        },

        /* Amarillo de bandera. Es la energia de la pagina y el color de la
         * accion principal: lo primero que ve alguien con prisa.
         *
         * Del 400 hacia arriba no sirve como texto sobre blanco. El 700 se
         * oscurecio de #9e7800 a #8c6a00 porque el original daba 4,09:1 y se
         * quedaba corto de AA por poco — justo el tipo de detalle que no se ve
         * en el monitor del que diseña y si se sufre bajo el sol. Ahora da 5,03. */
        oro: {
          50: '#fffceb',
          100: '#fef6c7',
          200: '#fdec8a',
          300: '#fce04d',
          400: '#fcd116',
          500: '#edbe00',
          600: '#b98e00',
          700: '#8c6a00',
          800: '#6b5100',
          900: '#4a3800',
          950: '#2b2100',
        },

        /* Tinta: casi negro con matiz azul, para que el texto asiente junto al
         * azul de marca. Bajo sol directo los grises de Tailwind se lavan. */
        tinta: {
          50: '#f5f7fa',
          100: '#e8ecf3',
          200: '#d2d9e5',
          300: '#adb8cb',
          400: '#8291aa',
          500: '#64738d',
          600: '#4d5a71',
          700: '#3f4a5d',
          800: '#333c4c',
          900: '#0e1726',
          950: '#070d17',
        },

        /* Papel: blanco muy claro con una gota de azul. Deja saltar al amarillo
         * y al azul en vez de amortiguarlos como haria un beige. */
        papel: {
          DEFAULT: '#f5f7fb',
          hueco: '#e9eef7',
          borde: '#d8e0ed',
        },

        /* Semanticos. El rojo es el de la bandera. Todos pasan AA sobre blanco y
         * todos van con un icono al lado: el color nunca es el unico portador
         * del significado. */
        alerta: {
          50: '#fdf2f3',
          100: '#fce0e3',
          200: '#f8bfc5',
          600: '#ce1126',
          700: '#a50d1e',
          900: '#5c0710',
        },
        seguro: {
          50: '#ecfaf3',
          100: '#d0f2e0',
          200: '#a2e4c2',
          600: '#117a50',
          700: '#0d5f3e',
          900: '#073b27',
        },
        espera: {
          50: '#fff5eb',
          100: '#ffe6cc',
          200: '#ffc999',
          600: '#b35009',
          700: '#8a3e07',
          900: '#522305',
        },
      },

      /* Alturas minimas de control. WCAG pide 44px; aqui el piso es 56 y la
       * accion principal 64, porque el dedo puede venir mojado o temblando. */
      minHeight: {
        control: '3.5rem', // 56px
        'control-lg': '4rem', // 64px
      },
      minWidth: {
        control: '3.5rem',
      },

      spacing: {
        18: '4.5rem',
        88: '22rem',
      },

      borderRadius: {
        ficha: '0.625rem', // tarjetas: esquina de documento, no de burbuja
        control: '0.75rem',
      },

      boxShadow: {
        ficha: '0 1px 2px rgba(16, 26, 36, 0.06), 0 1px 3px rgba(16, 26, 36, 0.04)',
        'ficha-alta': '0 4px 12px rgba(16, 26, 36, 0.10)',
      },
    },
  },
  plugins: [],
};
