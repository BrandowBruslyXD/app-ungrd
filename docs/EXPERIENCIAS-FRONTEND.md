# Las dos experiencias del frontend

> Cómo conviven en una sola aplicación el que reporta desde la calle y el que decide desde la
> oficina. **Ninguna pantalla se elimina**: se organizan.
>
> Complementa a [ARQUITECTURA.md](ARQUITECTURA.md), que dice dónde va cada archivo.

---

## La decisión: una aplicación, dos experiencias

**No son dos frontends.** Es una aplicación con dos armazones distintos, que comparten datos,
tipos y sistema de diseño.

### Por qué no dos proyectos separados

El argumento habitual para separar —que el ciudadano no cargue el peso del panel— **ya está
resuelto**: cada pantalla viaja en su propio archivo gracias al *code splitting* que ya existe.

```
index.js                  255 kB   ← React + router + i18n: la base común
ManagerDashboard.js       9,3 kB   ← solo se descarga si entras al panel
FieldCensusWizard.js     40,6 kB   ← solo si entras al censo
CitizenDashboard.js       7,5 kB
```

Separar en dos proyectos **duplicaría esos 255 kB de base** sin ahorrarle nada al ciudadano.

Y costaría lo que más escasea: una sola fuente de verdad para los tipos del contrato, el cliente
HTTP, los catálogos de enums y los mocks. Duplicados, el día de la integración se cambia un campo
en un lado y el otro se rompe en silencio. A eso se suman dos despliegues, dos configuraciones de
CORS y dos variables de entorno.

Además, el momento del pitch —el gestor cambia el estado en una pestaña y el ciudadano lo ve en la
otra— se demuestra mejor con un solo dominio y una sola sesión de demo.

### Cuándo sí se separan

**Cuando el ciudadano se empaquete con Capacitor como app nativa** y el panel se quede en web. Ahí
la separación es real: distinto ciclo de vida, distinta tienda, distinto despliegue. Está en el
pitch como lo que sigue, y por eso este documento deja la costura marcada: separar después debe ser
mover carpetas, no reescribir.

---

## Las dos experiencias

### 🟠 Terreno — celular, una mano, bajo estrés

Quien está en el sitio de la emergencia.

| Rol | Qué hace |
|:---|:---|
| **Ciudadano** | Reporta, consulta su código, ve la cronología, mira el mapa |
| **Brigadista** | Censa damnificados en terreno (asistente de 5 pasos) |
| **Socorro** | Registra incidentes y evalúa habitabilidad |

**Cómo se siente:** una acción principal evidente por pantalla, navegación inferior fija al alcance
del pulgar, tipografía grande, área tocable de 44 px, funciona con red mala. Todo se diseña a
390 px y se escala hacia arriba.

### 🔵 Sala de crisis — escritorio, teclado, dos horas seguidas

Quien coordina y decide.

| Rol | Qué hace |
|:---|:---|
| **Gestor** (alcaldía / CMGRD) | Cola de reportes, prioriza, cambia estados |
| **UNGRD** (`Admin`) | Consolida el evento, clasifica por sector, arma y envía los paquetes a ministerios |

**Cómo se siente:** densidad alta de información, navegación lateral persistente, tablas con
filtros, atajos de teclado, varias cosas a la vista a la vez. Se diseña a 1440 px y aguanta hasta
1024 px.

> **Son dos productos distintos con los mismos datos.** Un funcionario que pasa el día en una tabla
> necesita lo contrario que alguien con el agua en los tobillos. Por eso dos armazones, no dos
> aplicaciones.

---

## Mapa de rutas

Prefijo por experiencia: **todo lo de sala de crisis cuelga de `/panel`**. Esa es la costura que
permite separarlo después.

### Terreno

| Ruta | Pantalla | Acceso |
|:---|:---|:---|
| `/` | Panel del ciudadano | Sesión |
| `/reportar` | Reportar emergencia | Ciudadano |
| `/reportes/:codigo` | **Seguimiento** | 🌐 Público — es el enlace compartible |
| `/mis-reportes` | Mis reportes | Sesión |
| `/mapa` | Mapa de riesgo | 🌐 Público |
| `/ayudas` · `/alertas` | Directorio de ayudas · Alertas | Sesión |
| `/brigada` | Tablero del brigadista | Brigadista |
| `/brigada/censo` | Censo de damnificados (5 pasos) | Brigadista |
| `/socorro` | Tablero de socorro | Socorro |
| `/socorro/incidente` | Bitácora de incidente | Socorro |
| `/socorro/evaluacion` | Evaluación de habitabilidad | Socorro |

### Sala de crisis

| Ruta | Pantalla | Acceso |
|:---|:---|:---|
| `/panel` | Cola de reportes del gestor | Gestor · Admin |
| `/panel/eventos` | Eventos declarados | Admin |
| `/panel/eventos/:codigo` | Consolidado del evento, con bandeja `Sin sector` | Admin |
| `/panel/paquetes/:codigo` | **Paquete del ministerio** | Admin |
| `/panel/envios` | Bitácora de envíos | Admin |

### Compartidas

`/entrar` · `/registro` · `/sin-permiso` · `*` (no encontrado).

> **`/reportes/:codigo` es la única pública con datos.** Se comparte por WhatsApp y abre sin cuenta.
> Hoy la ruta es `/reporte/:id` — hay que renombrarla al plural y al `codigo` del contrato, porque
> el `id` interno no debe aparecer nunca en una URL.

---

## Estructura de carpetas

La costura hecha carpeta. Si algún día se separan, `experiencias/terreno` y `experiencias/sala` se
van cada una a su proyecto y `shared/` se convierte en un paquete.

```
front/src/
├─ app/                     arranque: router, providers, sesión
│  ├─ App.tsx
│  ├─ rutasTerreno.tsx
│  └─ rutasSala.tsx
│
├─ layouts/
│  ├─ LayoutTerreno.tsx     móvil: cabecera mínima + navegación inferior
│  └─ LayoutSala.tsx        escritorio: navegación lateral + barra de contexto
│
├─ experiencias/
│  ├─ terreno/
│  │  ├─ ciudadano/         reportar, seguimiento, mis reportes, mapa, ayudas, alertas
│  │  ├─ brigada/           censo de damnificados
│  │  └─ socorro/           incidentes, habitabilidad
│  └─ sala/
│     ├─ gestor/            cola de reportes, cambio de estado
│     └─ ungrd/             eventos, consolidado, paquetes, envíos
│
└─ shared/                  lo ÚNICO que cruza entre experiencias
   ├─ api/                  cliente HTTP + una función por endpoint
   ├─ types/                espejo de los DTOs del contrato
   ├─ catalogos/            enum → etiqueta, color e icono
   ├─ components/           botones, insignias, campos, estados vacíos
   ├─ hooks/                sesión, red, formato de fechas
   ├─ i18n/ + locales/
   └─ mocks/
```

**La regla que mantiene la costura limpia:** una experiencia **nunca** importa de la otra. Si dos
necesitan lo mismo, sube a `shared/`. Si `terreno/ciudadano` necesita algo de `sala/ungrd`, está mal
planteado.

Hoy el código está a medio camino: `features/reportes/`, `features/gestor/` y varias páginas
sueltas en `pages/`. Esto lo termina de ordenar.

---

## Lo que comparten y lo que no

| | Compartido | Propio de cada experiencia |
|:---|:---|:---|
| **Datos** | Tipos, cliente HTTP, mocks, catálogos de enums | — |
| **Marca** | Paleta UNGRD, tipografía, iconografía | Densidad, escala, ritmo de espaciado |
| **Componentes** | Botón, insignia de estado, campo, estado vacío, esqueleto | Navegación, tablas, asistentes, mapa |
| **Sesión** | Token, usuario, rol, guardas | A dónde te lleva entrar |

Sobre la densidad: **el mismo botón no puede medir igual en las dos.** En terreno, 56 px de alto y
ancho completo; en sala, 36 px en una barra de acciones. Se resuelve con una variante en el
componente compartido, no con dos componentes.

---

## El selector de rol: es de demo, y hay que decirlo

Hoy el rol vive en un `useState` del `App.tsx` y se cambia desde un menú del encabezado. **Eso no es
autenticación**: cualquiera entra a `/panel` eligiéndolo del menú.

Dos cosas, y las dos importan:

1. **Para la demo el selector es oro.** Cambiar de rol en vivo delante del jurado, sin cerrar
   sesión, vale más que la pureza. Se conserva **detrás de `VITE_MODO_DEMO`**.
2. **Para todo lo demás hace falta sesión real.** Login, token, contexto y guardas por rol. Y la
   guarda del cliente es comodidad: **la autorización real es el `403` del servidor.**

---

## Plan de trabajo

Cinco pasos, cada uno termina en algo que se puede mostrar. Los dos primeros no cambian
funcionalidad: solo ordenan.

| # | Qué | Toca | Riesgo |
|:---:|:---|:---|:---|
| 1 | **La costura.** Mover páginas a `experiencias/`, crear los dos layouts, prefijo `/panel`, renombrar `/reporte/:id` → `/reportes/:codigo` | Mover archivos y ajustar importaciones | Bajo — conflictos de merge si alguien más edita a la vez |
| 2 | **Sesión real.** Login, contexto, guardas por rol, selector de demo tras bandera | `app/`, `shared/hooks/` | Bajo |
| 3 | **Cerrar el ciclo.** El gestor cambia el estado y la cronología del ciudadano avanza | `sala/gestor/`, `shared/api/` | Medio — es el pitch, hay que probarlo en dos dispositivos |
| 4 | **Paquete del ministerio.** La pantalla A3 con datos sembrados, PDF y CSV descargables | `sala/ungrd/` | Medio |
| 5 | **Resto del panel UNGRD.** Eventos, consolidado, bitácora | `sala/ungrd/` | Alto — es lo que se corta si el tiempo aprieta |

**El paso 1 hay que hacerlo antes de escribir el panel UNGRD, no después.** Meter cuatro pantallas
más en `pages/` con un `Header` que ya tiene cuatro condicionales de rol es cómo se llega a la hora
17 con un archivo que nadie entiende.

Y hay que coordinarlo: **es un movimiento masivo de archivos**. Si alguien está editando páginas al
mismo tiempo, cada conflicto es un archivo entero. Se hace en un PR propio, corto, sin mezclar
cambios de comportamiento.

---

## Despliegue

**Un solo proyecto en Vercel**, como está hoy (`conectariesgoai.vercel.app`). Las dos experiencias
son rutas de la misma aplicación.

El día que se separen: `app.dominio` para terreno y `panel.dominio` para sala de crisis. Hasta
entonces, un despliegue, una variable `VITE_API_BASE_URL`, un origen que autorizar en el CORS del
backend.
