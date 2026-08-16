# Fases del proyecto — ConectaRiesgo

> Qué se construye, en qué orden y **qué se corta si el tiempo aprieta**.
>
> Este documento y `CONTROL.md` son los que hay que mirar cuando alguien pregunte "¿en qué vamos?".

---

## El principio que manda sobre todo lo demás

**Una cosa completa vale más que dos a medias.**

Cada fase termina en algo que se puede mostrar funcionando. Si el tiempo se acaba en mitad de la Fase 3, se presenta la Fase 2 completa y se habla de la 3 como lo que sigue. Lo que nunca puede pasar es llegar a la demo con cinco cosas al 60%.

---

## Fase 0 · Cimientos
**Estado: ✅ terminada**

Sin esto no existe nada más.

| Qué | Estado |
|:---|:---|
| Contrato de API cerrado | ✅ Escrito, falta que el equipo lo confirme |
| Modelo de datos definido | ✅ En `MODELO-DATOS.md` |
| Estructura del proyecto compilando en las 4 máquinas | ✅ |
| PostgreSQL accesible para todos | ✅ |
| Roles repartidos | ✅ |
| Credenciales tramitadas | ⬜ Ver `CONTROL.md` |

**Cómo se sabe que terminó:** las cuatro personas corren el proyecto y saben cuál es su tarea.

---

## Fase 1 · Reporte ciudadano de punta a punta
**Estado: 🟡 casi — funciona por WhatsApp y teléfono; falta conectar la app web**

Lo mínimo que convierte esto en un producto y no en una maqueta.

**Ciudadano:**
- Inicia sesión
- Reporta: foto, ubicación por GPS, descripción, categoría — **por la web o por WhatsApp**, canal
  disponible desde esta fase
- Recibe un **código único** y ve la confirmación
- Consulta el seguimiento con la cronología
- Ve el mapa con las emergencias cercanas

**Autoridad:**
- Ve los reportes entrantes, sin importar si llegaron por la web o por WhatsApp
- Cambia el estado, y **el ciudadano lo ve avanzar**

**Cómo se sabe que terminó:** una persona reporta desde un celular, otra lo atiende desde un computador, y la primera ve el cambio en su pantalla. **Ese contraste en vivo es el momento decisivo del pitch.**

> Si solo alcanzara a existir la Fase 1, el proyecto ya es presentable y compite.

---

## Fase 2 · Lo que nos diferencia
**Estado: 🟡 parcial — la estructura de integraciones ya existe**

Aquí es donde dejamos de parecernos a las apps que ya existen.

| Qué | Estado |
|:---|:---|
| Verificación satelital NASA FIRMS | 🟡 `Integrations/Nasa` implementado (cliente NASA FIRMS + `GET /api/verificacion/satelital` + `GET /api/reportes/{codigo}` ya lo consume, issue #18), **falta la MapKey real** |
| Transparencia del gasto con SECOP | 🟡 `Integrations/Secop` listo y probado, con respaldo |
| Monitoreo de redes sociales | 🟡 Falta cuenta de Bluesky |
| Que el backend consuma las integraciones | 🟡 SECOP y NASA ya conectados en `GET /api/reportes/{codigo}` (issue #18) |
| Instalable como PWA | ⬜ |

**Cómo se sabe que terminó:** en el detalle de un reporte aparecen los bloques de satélite y de contratos públicos, y si un servicio externo se cae, el bloque desaparece sin romper la pantalla.

---

## Fase 3 · Registro de damnificados
**Estado: 🟡 el censo del brigadista funciona por WhatsApp y el backend lo recibe; la pantalla web está maquetada**

El flujo de 5 pasos del boceto: brigadista que registra personas afectadas con documentos, núcleo familiar y evaluación de daños.

| Paso | Qué captura |
|:---|:---|
| 1 | Datos de la persona afectada |
| 2 | Núcleo familiar y ubicación |
| 3 | Daños materiales y su nivel |
| 4 | Evidencias fotográficas |
| 5 | Confirmación y declaración de veracidad |

**Por qué va en tercer lugar y no antes:** es mucho más trabajo que la Fase 1 (cinco pantallas con validación por paso, contra una), y **la Fase 1 sola ya es demostrable**. Empezar por aquí es apostar todo a terminar algo grande.

**Decisión tomada:** el **modo offline** (guardar sin señal y sincronizar después) **queda fuera del hackathon**. Requiere almacenamiento local, cola de sincronización y resolución de conflictos: cinco o seis horas bien hechas, y es donde más fácil se rompe todo en vivo. Se muestra el indicador en la interfaz y se presenta como capacidad diseñada, sin construirla.

---

## Fase 3.5 · Reparto sectorial a ministerios — el panel de la UNGRD
**Estado: 🟠 propuesta escrita · pendiente de una decisión del equipo**

Convierte la información consolidada de una emergencia en **el paquete que le toca a cada
ministerio** (PDF de oficio + CSV de detalle), listo para que un funcionario lo apruebe y lo envíe.

Sale de la entrevista con la ingeniera de la UNGRD: hoy ese reparto se hace a mano y **el Plan de
Acción Específico tarda cerca de un mes en consolidarse**. Diseño completo, con las nueve decisiones
ya tomadas, en **[REPARTO-SECTORIAL.md](REPARTO-SECTORIAL.md)**.

**Por qué lleva número intermedio y no es la Fase 4:** no es visión, es construible — pero depende
de que existan daños que repartir, y esos vienen de la Fase 3 o de una carga de EDAN municipal. Con
solo reportes ciudadanos, lo que le llega al ministerio es la fuente **menos** útil para él.

**La decisión pendiente, y es del equipo:** cuál es el diferenciador del pitch.

| | Diferenciador | A favor | En contra |
|:---|:---|:---|:---|
| **A** | El ciudadano ve avanzar su caso | Casi construido, emociona, se demuestra en dos pantallas | Es lo que cualquiera esperaría de una app de reportes |
| **B** | La UNGRD reparte en minutos lo que hoy tarda un mes | Le habla al dolor real de la entidad, sale de una entrevista, nadie más lo va a presentar | Necesita datos que hoy no existen y un panel entero |

**Camino intermedio recomendado:** terminar A completo y de B construir **solo la pantalla del
paquete del ministerio** con datos sembrados, contando el resto como lo que sigue. Una pantalla
funcionando vale más que cuatro a medias.

> ⚠️ Esta fase **revierte la decisión D4** («sin panel de administrador»). No se empieza hasta que
> el equipo lo confirme y quede anotado en `CONTROL.md`.

---

## Fase 4 · Lo que viene después
**Estado: ⬜ solo para el pitch — no se construye**

Lo que se cuenta al final para mostrar que hay producto más allá de la demo:

- **Modo offline real** para brigadas en zonas sin señal
- **Android e iOS** con Capacitor, reutilizando esta misma base
- **Notificaciones push** de emergencias cercanas
- **Monitoreo automático de X**, cuando el presupuesto lo permita
- Panel de administración y reportes para entidades
- Cruce automático entre damnificados registrados y ayudas entregadas

---

## Cómo agregar una funcionalidad nueva

Para que el plan no se desordene cada vez que a alguien se le ocurre algo:

1. **¿En qué fase entra?** Si es Fase 1 o 2, se hace. Si es Fase 3, va al final de la cola. Si es Fase 4, se anota y no se construye.
2. **¿Qué datos necesita?** Se agregan a `MODELO-DATOS.md` **antes** de escribir código.
3. **¿Cambia el contrato de API?** Se avisa en el grupo antes de tocarlo.
4. **Se crea el issue** con criterios de aceptación verificables.
5. **Se registra la decisión** en `CONTROL.md`.

> **Después de la hora 16 no entra nada nuevo.** Ni una funcionalidad más, por pequeña que parezca. La causa número uno de equipos que llegan sin demo es meter "una cosita rápida" al final y romper lo que ya servía.

---

## Semáforo

| | |
|:---|:---|
| ✅ | Terminado y verificado |
| 🟡 | En curso o parcial |
| ⬜ | No empezado |
| ❌ | Descartado (con el motivo anotado en `CONTROL.md`) |
