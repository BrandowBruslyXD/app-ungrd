# ms-bot-api — API puente del bot de WhatsApp

API mínima que da **códigos de seguimiento reales** al bot de WhatsApp mientras el
backend .NET no expone sus casos de uso.

**Es temporal y está pensada para desaparecer.** Cuando el backend tenga
`POST /api/reportes` y `GET /api/reportes/{codigo}`, se cambia la URL en los cuatro
nodos `httpRequest` del flujo y este servicio se apaga.

---

## Dónde corre

| | |
|:---|:---|
| Servidor | VPS `bizz-prod-01` (`72.60.125.180`), acceso SSH `bizz` |
| Contenedor | `conectariesgo-api`, red Docker `edge` |
| Límites | 128 MB de RAM, 0.25 CPU |
| URL interna | `http://conectariesgo-api:3001` |
| Persistencia | volumen `conectariesgo_datos` montado en `/app/data` |

**No está expuesto a internet**: solo lo alcanza `wabots-backend` por la red interna de
Docker. Para que el nodo HTTP de wabots pueda llamarlo hubo que añadir el host a
`HTTP_NODE_ALLOWED_HOSTS` en `/opt/wabots/deploy/.env.server`.

## Endpoints

| Método | Ruta | Qué hace |
|:---|:---|:---|
| `GET` | `/health` | Estado y conteos |
| `POST` | `/reportes` | Crea y devuelve `RPT-2026-08-15-0001` |
| `GET` | `/reportes/:codigo` | Estado + cronología ya formateada para WhatsApp |
| `POST` | `/reportes/:codigo/estado` | **Avanza el estado — es el momento del pitch** |
| `POST` | `/censo` | Registro censal del brigadista |
| `GET` | `/todo` | Todo lo capturado, para revisar tras la demo |

## Dos decisiones que parecen raras y no lo son

**1. `GET /reportes/:codigo` responde 200 aunque el código no exista.**

El nodo `httpRequest` de wabots solo sale por `onError` cuando falla la red: un 404
saldría por la rama de éxito con los campos vacíos, y el ciudadano vería
`Estado: ` en blanco. Por eso, cuando no encuentra el reporte, esta API responde 200
con el mensaje ya redactado.

> ⚠️ El mismo problema aplica al backend .NET: **si `POST /api/reportes` devolviera 500,
> el bot diría «Reporte recibido» con el código vacío.** Hay que tenerlo en cuenta al
> conectar el flujo al backend real.

**2. `POST /censo` rechaza con 400 si falta el consentimiento.**

Ley 1581 de 2012: sin autorización no se persisten datos personales. El flujo ya no
llama a esta ruta cuando la persona no autoriza, pero la validación se repite aquí a
propósito — la protección del dato no puede depender de que el flujo esté bien armado.

## Levantarlo

```bash
docker build -t conectariesgo-api:latest .
docker run -d --name conectariesgo-api --restart unless-stopped \
  --network edge --memory 128m --cpus 0.25 \
  -v conectariesgo_datos:/app/data -e PORT=3001 \
  conectariesgo-api:latest
```

Sin dependencias: solo el `http` nativo de Node.

## Cómo se apaga cuando el backend esté listo

1. Cambiar la URL en los cuatro nodos `httpRequest` del flujo de wabots.
2. Añadir el host del backend a `HTTP_NODE_ALLOWED_HOSTS` y recrear `wabots-backend`.
3. `docker rm -f conectariesgo-api`.

El contrato es el mismo, así que el grafo del flujo no cambia.
