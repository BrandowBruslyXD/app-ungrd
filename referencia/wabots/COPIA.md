# Copia de referencia de wabots

**Esto no es parte de ConectaRiesgoAI.** Es una copia del código de **wabots**, la plataforma que
orquesta el flujo conversacional de WhatsApp, guardada aquí para que el equipo pueda leerla sin
depender de que alguien tenga acceso al servidor.

El porqué está en [`docs/CANALES-CONVERSACIONALES.md`](../../docs/CANALES-CONVERSACIONALES.md):
**el flujo de wabots no está versionado en ninguna parte** —se edita en su interfaz web— y si se
pierde el servidor, se pierde el flujo. Esta copia cubre el código de la plataforma; el flujo en
sí sigue sin exportar.

---

## Qué NO se copió, y por qué

El repositorio de ConectaRiesgoAI es **público**, y el historial de Git no olvida: un archivo
subido por error sigue siendo recuperable aunque después se borre. Por eso quedó fuera:

| Qué | Por qué |
|:---|:---|
| **`data/backups/`** — 15 volcados de PostgreSQL de producción (`.dump`, 29 MB) | Son la base de datos completa de una plataforma que opera WhatsApp para negocios reales: contienen conversaciones, números de teléfono y datos de personas. **Publicarlos sería una brecha de datos personales** |
| **`.env`, `.env.local`, `.env.server`** y sus copias de respaldo | Traen `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` y `ADMIN_PASSWORD` reales |
| **`pruebas/`** — 1.017 turnos de conversación en 15 casos | Mensajes reales de clientes finales de un negocio. Están anonimizados —sin teléfonos ni nombres—, pero siguen siendo conversaciones ajenas y no aportan nada técnico aquí |
| **`investigacion-clientes.md`** | Documento estratégico sobre clientes de wabots. No es asunto de este proyecto |
| `respaldo/`, `*.bak`, `traefik-dynamic.backup.yml` | Copias de configuración de infraestructura |
| `node_modules/`, `dist/`, `*.log` | Ruido |

Sí se conservaron los **`.env.example`**: documentan qué variables hacen falta y traen
`CAMBIA_ESTO` en lugar de valores.

---

## Antes de tocar nada

1. **Si hay que actualizar esta copia, se repite el filtrado.** Un `cp -r` del repositorio
   completo mete los volcados de la base de datos y las credenciales de un golpe.
2. **La IP `72.60.125.180`** aparece en el código de esta copia: es el VPS donde corre todo. Ya
   estaba en `servicios/ms-bot-api/README.md`, así que no es nueva — pero conviene saber que está.
3. **Esta copia envejece.** No se sincroniza sola: es una foto del día que se tomó, no un espejo.

---

## Qué hay dentro

| Carpeta | Qué es |
|:---|:---|
| `backend/` | La API de wabots (NestJS + Prisma) |
| `frontend/` | El panel de administración |
| `cli/` | Utilidades de línea de comandos |
| `demo-api/` | API de demostración |
| `deepseek-daemon/` | Proceso auxiliar del modelo |
| `deploy/` | Scripts de despliegue y los `.env.example` |
| `*.md` | Arquitectura, estado de desarrollo y errores conocidos |
