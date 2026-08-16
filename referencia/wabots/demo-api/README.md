# APIs de demostración

Datos realistas con la forma de Shopify y Melonn, para probar flujos de punta a punta sin
depender de autorizaciones del cliente.

**Los productos y precios son reales** (catálogo reconstruido del histórico: 133 productos).
El stock y los estados de guía son simulados pero **deterministas**: la misma entrada devuelve
siempre lo mismo, así las pruebas son reproducibles.

## Endpoints

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/health` | Comprobación de vida |
| GET | `/shopify/products?q=texto&limit=5` | Buscar en el catálogo |
| GET | `/shopify/products/:id` | Detalle con stock, preventa y voltaje |
| GET | `/shipping/quote?ciudad=&total=` | Costo y tiempo de envío |
| POST | `/shopify/orders` | Crear pedido en borrador |
| GET | `/shopify/orders/:numero` | Consultar un pedido creado |
| GET | `/melonn/tracking/:referencia` | Estado del envío |

## Detalles pensados para que el bot no invente

- La búsqueda sin resultados devuelve `mensaje: "No hay productos que coincidan. No ofrecer
  alternativas inventadas."`
- `/shipping/quote` incluye `exacto: true|false`: `true` para las ciudades con costo observado en
  el histórico, `false` cuando es una estimación regional. El flujo puede decidir si lo afirma o
  lo matiza.
- `POST /shopify/orders` crea el pedido en **borrador**, no en firme: el contraentrega sin
  validación humana es un riesgo de flete perdido.
- El 15% de los productos aparece agotado y un 10% en preventa, proporciones parecidas a las del
  negocio real, para que el flujo se pruebe también en el camino incómodo.

## Uso

Local, sin Docker:

```bash
node demo-api/server.js      # escucha en :4100
```

Con Docker (queda en la red interna, sin exponer puertos):

```bash
docker compose -f docker-compose.local.yml up -d demo-api
# el backend lo alcanza en http://demo-api:4100
```
