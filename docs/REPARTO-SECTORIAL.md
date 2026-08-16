# Reparto sectorial — el panel de la UNGRD

> El módulo que convierte la información dispersa de una emergencia en **el paquete que le toca a
> cada ministerio**, listo para enviar.
>
> Fuente del problema: [Gestion_Riesgo_Desastres.md](Gestion_Riesgo_Desastres.md) (transcripción de
> los audios con la ingeniera de la UNGRD) y
> [SISTEMA-REPORTES-COLOMBIA.md](SISTEMA-REPORTES-COLOMBIA.md) (investigación del EDAN y el PAE).

---

## El problema, en una frase

**La UNGRD centraliza la información de daños, pero no repara nada: cada daño le toca a un
ministerio distinto, y hoy ese reparto se hace a mano.**

Lo dijo la ingeniera con todas las letras:

> «Los hospitales los atiende el Ministerio de Salud, los colegios el Ministerio de Educación,
> todos los centros culturales el Ministerio de Cultura, coliseos el Ministerio del Deporte, toda
> la caída de las antenas y pérdida de internet, Ministerio TIC, todo lo de energía, Ministerio de
> Energía. Cada uno de ellos va a tener que clasificar los daños para ver cuáles les corresponden,
> en qué ubicaciones, qué sucedió y plantear proyectos para poder reparar esos daños.»

Y la consecuencia:

> «Ese plan específico se demora **más o menos un mes** en consolidarse mientras llega toda la
> información de todos los daños.»

Un mes sin Plan de Acción Específico es un mes sin proyectos y sin presupuesto ejecutable. Mientras
tanto, de **1.120 municipios, 400 afectados, hay información de 5**.

La frase que define este módulo entero:

> «Esa información que ustedes piensan recolectar **tiene que ser etiquetada para que vaya a la
> entidad correspondiente**.»

Y el efecto secundario, que no es menor: si los daños están cuantificados y trazados, **inflar
cifras se nota**. Eso es veeduría, y es el mismo argumento del bloque de transparencia SECOP.

---

## Lo que ya existe y no hay que inventar

El reparto **no es una idea nuestra**: el formato oficial de la UNGRD ya viene seccionado por
sector. El **FR-1703-SMD-09 — «Formato para consolidar la información sobre daños y necesidades»**
tiene 15 secciones, y cada una corresponde a un ministerio. Además, cada bloque sectorial cierra con
la misma tabla: **`Necesidad | Equipos o elementos requeridos | Costo estimado`**.

Ese formato es el mapa. El módulo solo lo automatiza.

### Mapa sector → ministerio

Derivado de las secciones del formato oficial y confirmado con el reparto del desastre nacional de
2026 (vivienda atiende vivienda; transporte, las vías; salud, la infraestructura sanitaria;
educación, los establecimientos).

| Sección del formato oficial | Sector | Entidad responsable |
|:---|:---|:---|
| Instalaciones de salud · heridos · muertos | `Salud` | Ministerio de Salud y Protección Social |
| Establecimientos educativos | `Educacion` | Ministerio de Educación Nacional |
| Hábitat y vivienda (averiadas / destruidas) | `Vivienda` | Ministerio de Vivienda, Ciudad y Territorio |
| Acueducto · alcantarillado · saneamiento · basuras | `AguaYSaneamiento` | Ministerio de Vivienda, Ciudad y Territorio |
| Energía eléctrica · gas | `Energia` | Ministerio de Minas y Energía |
| Telecomunicaciones (telefonía, internet, emisoras, radio) | `Telecomunicaciones` | Ministerio TIC |
| Vías, puentes, túneles, terminales, puertos, aeropuertos | `Transporte` | Ministerio de Transporte |
| Agricultura · ganadería · piscícola · porcícola · avícola | `Agropecuario` | Ministerio de Agricultura y Desarrollo Rural |
| Industria, comercio, turismo, minería, sector informal | `ComercioIndustria` | Ministerio de Comercio, Industria y Turismo |
| Iglesias · instalaciones de cultura | `Cultura` | Ministerio de Cultura |
| Escenarios deportivos | `Deporte` | Ministerio del Deporte |
| Instalaciones del ICBF · población vulnerable | `InclusionSocial` | ICBF · Prosperidad Social |
| Alcaldía y edificaciones públicas de gobierno | `Gobierno` | Ministerio del Interior |

**Trece sectores.** Un daño puede tocar más de uno: un colegio que se quedó sin agua es `Educacion`
**y** `AguaYSaneamiento`. El modelo lo permite y el reporte del ministerio lo refleja.

---

## De dónde salen los datos — tres fuentes, tres niveles de confianza

Esta era la pregunta abierta. La respuesta honesta: **el reporte ciudadano solo no alcanza**, porque
un ciudadano no reporta «instalación de salud con uso restringido», reporta «se inundó la vía». Pero
tampoco sirve esperar el EDAN oficial, que es justo lo que tarda un mes.

Por eso el módulo consolida **tres fuentes y las distingue siempre**:

| Fuente | Quién la genera | Nivel de confianza | Qué aporta |
|:---|:---|:---|:---|
| **Reporte ciudadano** | Cualquiera, por la app o WhatsApp | `Autorreportado` | Velocidad y cobertura. Es lo que hoy no existe: información de los 395 municipios de los que nadie sabe nada |
| **Registro de damnificado** | Brigadista certificado, en terreno | `Censado` | Personas afectadas, daños de vivienda y necesidades, con documento |
| **Carga EDAN municipal** | Funcionario del CMGRD | `Verificado` | Las 15 secciones sectoriales completas, que es lo que el ministerio necesita de verdad |

**La regla que sostiene la credibilidad del módulo:** cada dato viaja con su nivel de confianza
hasta el reporte del ministerio, y el PDF lo dice explícitamente. Un ministerio tiene que poder
distinguir «12 viviendas destruidas, verificadas por el CMGRD» de «37 reportes ciudadanos sin
verificar en esta zona». **Mezclarlos sin decirlo sería exactamente el problema que venimos a
resolver.**

> Esto encaja con lo que ya está en el modelo de datos: el reporte tiene estados
> (`Reportado` → `Verificado` → …) y la persona afectada tiene `Estado: Borrador · Completo ·
> Verificado · Rechazado`. El nivel de confianza sale de ahí, no es un campo nuevo inventado.

---

## Cómo funciona el panel — cinco pasos

```
1. CONSOLIDAR      Todo lo que entró de un evento, en una sola bandeja
        ↓
2. CLASIFICAR      Cada daño queda etiquetado con su sector (automático + corrección humana)
        ↓
3. ARMAR           El sistema agrupa por ministerio y calcula totales por municipio
        ↓
4. REVISAR         El funcionario de la UNGRD ve el paquete y lo aprueba
        ↓
5. ENVIAR          Se genera el PDF y el CSV, y se registra el envío
```

**El paso 4 no se salta.** Lo decidiste tú y es lo correcto: el formato oficial exige que el
gobernador o el alcalde aprueben el envío del EDAN a la UNGRD. Un reporte oficial que sale solo,
sin que nadie lo mire, es un riesgo institucional serio. El sistema arma el 95 % del trabajo; la
firma es humana.

### 1 · Clasificar: cómo se etiqueta cada daño

Tres mecanismos, en este orden:

1. **Determinista, por estructura.** Todo lo que entra por el EDAN o por el censo ya viene con su
   categoría: `DanoRegistrado.Categoria = Vivienda` → sector `Vivienda`. No hay ambigüedad y no
   hace falta IA. **Cubre la mayor parte del volumen.**
2. **Por tipo de emergencia.** Un reporte ciudadano de tipo `ViaAfectada` va a `Transporte`;
   `ColapsoEstructural`, a `Vivienda` y `Gobierno` para revisión. Es una tabla de correspondencia,
   no un modelo.
3. **Sugerencia sobre el texto libre.** *«Se cayó el puente de la vereda y el colegio quedó sin
   techo»* toca `Transporte` **y** `Educacion`. Aquí sí ayuda un clasificador, pero **su salida es
   una sugerencia marcada como tal**, que el funcionario confirma en el paso 2. Nunca entra sola al
   paquete de un ministerio.

Todo daño sin clasificar cae en una bandeja **`Sin sector`** que el funcionario resuelve a mano. Es
preferible una bandeja visible a un dato mal enviado.

### 2 · Qué recibe el ministerio

Dos archivos. Nada de pedirle que entre a una plataforma nueva: **el correo con los adjuntos es todo
el contacto**. Un ministerio adopta un correo; no adopta un sistema.

| Archivo | Qué es | Para qué |
|:---|:---|:---|
| **PDF — oficio de remisión** | La carta formal: evento, declaratoria que lo ampara, sector, resumen de afectación, totales por municipio, necesidades con costo estimado, y quién lo remite | Es el documento que se archiva y que sustenta la actuación |
| **CSV** | El detalle línea a línea: municipio, tipo de daño, cantidad, nivel, fuente, nivel de confianza, coordenadas, fecha | Para que el ministerio lo trabaje en Excel y arme su parte del PAE |

**CSV y no `.xlsx`**: se abre en Excel igual, se genera sin librerías, no se corrompe y cualquier
sistema lo importa. Con separador `;` y codificación UTF-8 con BOM, que es lo que Excel en español
espera — sin eso, las tildes salen rotas y el archivo pierde credibilidad al abrirlo.

El PDF sigue la estructura del formato oficial: secciones del FR-1703-SMD-09 que corresponden al
sector, y la tabla de cierre `Necesidad | Equipos requeridos | Costo estimado`.

### 3 · El envío es simulado, y se dice

**No se conecta un proveedor de correo.** El sistema:

1. Compone el correo real (destinatario, asunto, cuerpo, adjuntos) y **lo muestra completo**.
2. Al aprobar, registra el envío en la **bandeja de envíos** con fecha, funcionario, sector,
   destinatario y los archivos generados, que quedan descargables.
3. Marca el envío como **`Simulado`**, visible en la interfaz.

Así se demuestra el flujo entero sin dominio, sin credenciales y sin mandarle un correo de prueba a
un ministerio de verdad. Conectar un proveedor después es media hora de trabajo: el punto de
integración queda aislado en un solo sitio.

> **En el pitch, decirlo.** Igual que con el respaldo de SECOP (decisión D9): presentar como real
> un envío que no ocurrió es engañar al jurado, y si preguntan, se nota.

---

## Modelo de datos nuevo

Cuatro entidades. Se agregan a [MODELO-DATOS.md](MODELO-DATOS.md) cuando esto se apruebe.

### Evento

La emergencia declarada. **Es la unidad de agrupación**: un ministerio quiere «lo suyo del evento»,
no reportes sueltos.

| Campo | Tipo | Notas |
|:---|:---|:---|
| `Id` · `Codigo` | int · string(24) | `EVT-2026-08-15-003` |
| `Nombre` | string(160) | «Inundaciones Córdoba, agosto 2026» |
| `TipoEvento` | enum | Las 16 del formato oficial: Sismo, Inundación, Deslizamiento, Avalancha, … |
| `Declaratoria` | enum | `Ninguna` · `CalamidadPublica` · `Desastre` |
| `NivelDeclaratoria` | enum? | `Municipal` · `Departamental` · `Nacional` |
| `NumeroDecreto` · `FechaDeclaratoria` | string(60) · datetime? | Lo que ampara el envío |
| `Departamentos` · `Municipios` | string | Alcance territorial |
| `Estado` | enum | `Activo` · `EnRecuperacion` · `Cerrado` |

### DanoSectorizado

La pieza central: un daño ya etiquetado con su sector.

| Campo | Tipo | Notas |
|:---|:---|:---|
| `Id` | int | |
| `EventoId` | int | |
| `Sector` | enum | Los 13 de la tabla de arriba |
| `Origen` | enum | `ReporteCiudadano` · `RegistroDamnificado` · `CargaEdan` |
| `OrigenId` | int | Trazabilidad hasta el dato original |
| `NivelConfianza` | enum | `Autorreportado` · `Censado` · `Verificado` |
| `Municipio` · `Departamento` | string(80) | |
| `Descripcion` | string(500) | Qué se dañó |
| `Cantidad` · `Unidad` | int · string(40) | «12 viviendas», «3 km de vía» |
| `Nivel` | enum? | `Leve` · `Moderado` · `Grave` · `DestruccionTotal` |
| `CostoEstimado` | decimal? | Si se puede estimar |
| `ClasificadoPor` | enum | `Regla` · `Sugerencia` · `Funcionario` |
| `RevisadoPorId` | int? | Quién lo confirmó |

### PaqueteMinisterio

Lo que se le arma a un ministerio para un evento.

| Campo | Tipo | Notas |
|:---|:---|:---|
| `Id` · `Codigo` | int · string(24) | `PQT-2026-08-15-0007` |
| `EventoId` · `Sector` | int · enum | |
| `Entidad` · `CorreoDestino` | string(160) | Configurable, ver abajo |
| `TotalDanos` · `TotalMunicipios` · `CostoEstimadoTotal` | int · int · decimal | |
| `Estado` | enum | `Borrador` · `EnRevision` · `Aprobado` · `Enviado` |
| `AprobadoPorId` · `AprobadoEn` | int? · datetime? | **La firma humana** |
| `UrlPdf` · `UrlCsv` | string(500) | Los dos archivos generados |

### EnvioRegistrado

La bitácora. Un envío que no queda registrado no ocurrió.

| Campo | Tipo | Notas |
|:---|:---|:---|
| `Id` · `PaqueteId` | int | |
| `Destinatario` · `Asunto` · `Cuerpo` | string | El correo tal cual se compuso |
| `EnviadoPorId` · `EnviadoEn` | int · datetime | |
| `Modo` | enum | **`Simulado`** · `Real` — hoy siempre `Simulado` |

### Y una tabla de configuración

`Ministerio`: sector, nombre oficial, correo de contacto. **Los correos no van quemados en el
código**: se configuran, y en la demo son direcciones de ejemplo (`salud@ejemplo.gov.co`). Mandarle
un correo de prueba a un ministerio real sería un problema de verdad.

---

## Las pantallas

Cuatro, todas de escritorio: un funcionario de la UNGRD trabaja en computador.

| # | Pantalla | Qué lleva |
|:---:|:---|:---|
| A1 | **Eventos** | Lista de emergencias con su declaratoria, municipios afectados, cuántos daños entraron y cuántos paquetes están sin enviar |
| A2 | **Consolidado del evento** | El grano fino: tabla de daños con sector, origen, nivel de confianza, municipio. Filtros por sector y por fuente. **Bandeja `Sin sector` arriba**, porque es lo que bloquea el envío |
| A3 | **Paquete del ministerio** | Lo que va a recibir: resumen, totales por municipio, necesidades con costo, previsualización del PDF y del CSV, y el correo compuesto. Botón **Aprobar y enviar** |
| A4 | **Bitácora de envíos** | Qué se envió, a quién, cuándo, quién lo aprobó, con los archivos descargables. Todo marcado como `Simulado` |

**La pantalla que decide el módulo es A3.** Es donde el funcionario ve, en treinta segundos, algo
que hoy le toma días armar a mano. Ese es el momento del pitch.

---

## Endpoints nuevos

Se agregan a [CONTRATO-API.md](CONTRATO-API.md) cuando esto se apruebe. Todos 🔒 y solo rol
`Admin` (funcionario UNGRD).

| Endpoint | Qué hace |
|:---|:---|
| `GET /api/eventos` | Lista de eventos |
| `GET /api/eventos/{codigo}/consolidado` | Daños sectorizados, con filtros por sector y origen |
| `PATCH /api/danos/{id}/sector` | Corregir la clasificación de un daño |
| `GET /api/eventos/{codigo}/paquetes` | Los paquetes por ministerio, con sus totales |
| `GET /api/paquetes/{codigo}` | El detalle de un paquete |
| `GET /api/paquetes/{codigo}/csv` | Descarga el CSV |
| `GET /api/paquetes/{codigo}/pdf` | Descarga el oficio |
| `POST /api/paquetes/{codigo}/enviar` | Aprueba y registra el envío simulado |
| `GET /api/envios` | La bitácora |

---

## Lo que este módulo NO hace

Escrito para que nadie lo prometa en el pitch:

- **No arma el Plan de Acción Específico.** El PAE lo formula cada ministerio con sus proyectos y su
  presupuesto. Este módulo le entrega el insumo clasificado, que es justo lo que hoy tarda un mes.
- **No reemplaza el EDAN oficial.** Lo alimenta y lo acelera.
- **No envía correos de verdad.** Decisión tomada, y se dice en la demo.
- **No estima costos por su cuenta.** El costo viene del dato de origen. Inventar cifras en un
  documento oficial sería grave.
- **No decide declaratorias.** Eso es del alcalde, el gobernador o el presidente, según la ley 1523.
- **No cuenta daños con imágenes satelitales.** La ingeniera lo mencionó como oportunidad; queda
  como visión, no como promesa.

---

## Qué desplaza esto — hay que decidirlo

Ser claros: **este módulo es más grande que el registro de damnificados**, que ya era la fase que se
cortaba primero.

Y choca de frente con dos cosas escritas:

| Qué dice hoy | Qué implica este módulo |
|:---|:---|
| **D4 — sin panel de administrador**, «no aporta al pitch y cuesta horas» | Este panel **es** el panel de administrador. La decisión hay que revertirla explícitamente, con su porqué |
| **Fase 3 — registro de damnificados**, la primera que se corta | El reparto sectorial depende de que existan daños que repartir. Si no hay censo ni carga EDAN, solo quedan reportes ciudadanos autorreportados — que es la fuente **menos** útil para un ministerio |

**La pregunta de fondo, y es tuya:** ¿cuál es el diferenciador del pitch?

- **A · El ciudadano ve avanzar su caso.** Lo que está escrito hoy. Emociona, se demuestra en dos
  pantallas, y está casi construido.
- **B · La UNGRD reparte en minutos lo que hoy tarda un mes.** Le habla directo al dolor de la
  entidad, sale de una entrevista con alguien que vive el problema, y **nadie más lo va a
  presentar**. Pero necesita datos de entrada que hoy no existen y un panel entero.

No pueden ser los dos con el tiempo que queda. Mi lectura: **B es mejor propuesta de valor y A es
más seguro de demostrar.** El camino intermedio realista es hacer A completo y de B **solo la
pantalla A3** —el paquete del ministerio, con datos sembrados— y contar el resto como lo que sigue.
Una pantalla que se ve funcionando vale más que cuatro a medias.

---

## Alcance por etapas

Si esto entra, entra así — cada etapa termina en algo demostrable.

### Etapa 1 · El paquete del ministerio (mínimo demostrable)

Datos sembrados de un evento, clasificación determinista, pantalla **A3** y generación de **PDF +
CSV** reales que se descargan. Sin bandeja de correcciones, sin bitácora.

**Terminado cuando:** se abre el paquete del Ministerio de Educación, se ve el resumen, se descarga
el CSV y se abre en Excel con las tildes bien.

### Etapa 2 · El flujo completo

Pantallas **A1, A2 y A4**, corrección manual del sector, aprobación y bitácora de envíos simulados.

### Etapa 3 · Las fuentes de verdad

Carga del EDAN municipal y conexión con el censo de damnificados. Sin esto el módulo funciona con
datos sembrados; con esto funciona con datos reales.

### Etapa 4 · Visión, no se construye

Clasificación con IA del texto libre · envío real por correo · conteo de viviendas con imágenes
satelitales · cruce con SECOP para ver si la obra de prevención existía · seguimiento de la
ejecución del PAE por ministerio.

---

## Decisiones tomadas

Para no volver a discutirlas. Se copian a `CONTROL.md` cuando esto se apruebe.

| # | Decisión | Por qué |
|:---|:---|:---|
| 1 | **El envío de correo se simula** | Sin proveedor, sin dominio, sin credenciales. Y se marca como simulado en la interfaz |
| 2 | **Entregable: PDF (oficio) + CSV (detalle)** | El PDF es el documento formal que se archiva; el CSV es lo que el ministerio manipula. CSV con `;` y UTF-8 con BOM, o Excel rompe las tildes |
| 3 | **El envío lo aprueba un funcionario**, nunca es automático | El formato oficial exige aprobación de gobernador o alcalde. Un documento oficial que sale solo es un riesgo institucional |
| 4 | **Los ministerios no entran al sistema** | Reciben correo con adjuntos. Un ministerio adopta un correo, no una plataforma nueva |
| 5 | **Tres fuentes con nivel de confianza visible** | Mezclar un autorreporte con un dato verificado sin decirlo es el problema que venimos a resolver |
| 6 | **Clasificación determinista primero**; la IA solo sugiere sobre texto libre | Lo que viene estructurado no necesita modelo. Y una sugerencia nunca entra sola a un documento oficial |
| 7 | **La unidad de agrupación es el evento**, no el municipio ni el reporte | Es como el ministerio pide la información: «lo mío de esta emergencia, desglosado por municipio» |
| 8 | **Trece sectores**, los del formato oficial FR-1703-SMD-09 | No inventamos taxonomía: usamos la que la UNGRD ya usa |
| 9 | **Correos de ministerio configurables y falsos en la demo** | Mandarle un correo de prueba a un ministerio real sería un problema de verdad |

---

**Fuentes:** [Decreto 1171 de 2026 — régimen de desastre nacional (Crowe)](https://www.crowe.com/co/news/decreto-1171-de-2026-colombia-activa-el-regimen-de-desastre-nacional) ·
[Plan Estratégico UNGRD 2022-2026](https://portal.gestiondelriesgo.gov.co/Documents/Plan-Estrategico/Plan-Estrategico-UNGRD-2022-2026.pdf) ·
[Portal UNGRD](https://portal.gestiondelriesgo.gov.co/)
