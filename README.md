# RespondeYA

> Plataforma de gestión de desastres que **cierra el ciclo** del reporte ciudadano: de la alerta al seguimiento, con verificación satelital y transparencia del gasto público.

En Colombia ya existen apps para reportar emergencias (Yo Reporto de la UNGRD, Ideam en tu Mano). Ninguna le dice al ciudadano qué pasó con su reporte. **Ese hueco es el producto.**

| | |
|:---|:---|
| ✅ **Tu reporte fue recibido** | Código único y cronología de estados |
| 🛰️ **Verificado por satélite** | NASA FIRMS |
| 💰 **Tu alcaldía gastó $X en prevenir esto** | SECOP / Datos Abiertos |

---

## Stack

| Capa | Tecnología |
|:---|:---|
| Frontend | React + Vite + Tailwind (**mobile-first**, instalable como PWA) |
| Backend | .NET — ASP.NET Core Web API + EF Core |
| Base de datos | PostgreSQL |
| Mapas | Leaflet + OpenStreetMap |
| Integraciones | NASA FIRMS · SECOP (datos.gov.co) |

**Ruta a móvil nativo:** la app se construye mobile-first y se empaqueta con Capacitor para Android/iOS sin reescribir código. Fuera del alcance del hackathon, pero las decisiones técnicas de hoy mantienen esa puerta abierta.

---

## Estructura

```
app-ungrd/
├── backend/    # Solución .NET (Api · Domain · Infrastructure)
├── frontend/   # React + Vite
└── docs/
    ├── CONTRATO-API.md        ← fuente de verdad entre front y back
    └── REVISIONES-CRUZADAS.md ← quién revisa a quién
```

---

## Arrancar en local

```bash
# Backend
cd backend && dotnet restore && dotnet run     # → http://localhost:5000/swagger

# Frontend
cd frontend && npm install && npm run dev      # → http://localhost:5173
```

Copien `appsettings.Example.json` y `.env.example` y pidan las credenciales reales por el grupo. **Nunca las suban a un commit: este repositorio es público.**

---

## Cómo trabajamos

`main` está **protegida**. No se hace push directo: todo entra por Pull Request con **una aprobación de otra persona**.

```bash
git checkout -b feat/mi-tarea
# ... trabajar ...
gh pr create --fill        # el PR debe decir: Closes #<número del issue>
```

- **Nadie aprueba su propio trabajo.** El anillo de revisores está en [`docs/REVISIONES-CRUZADAS.md`](docs/REVISIONES-CRUZADAS.md).
- Máximo **15 minutos** para revisar un PR. Si nadie responde, se avisa por el grupo y cualquiera puede aprobar. Un PR bloqueado es tiempo muerto.
- PRs pequeños y frecuentes. Un PR gigante a la hora 17 no lo revisa nadie.
- Ojo: si subes un commit después de que te aprobaron, **la aprobación se borra**. Sube todo y *después* pide revisión.

---

## Plan de las 20 horas

El trabajo está en [issues](https://github.com/BrandowBruslyXD/app-ungrd/issues), organizado por [hitos](https://github.com/BrandowBruslyXD/app-ungrd/milestones) según la hora del hackathon:

| Hito | Qué tiene que estar listo |
|:---|:---|
| **H0–H2 · Arranque** | Contrato de API firmado, proyecto compilando en las 4 máquinas |
| **H2–H6 · Cimientos** | API con modelo de datos y CRUD · Front navegable con datos falsos |
| **H6–H10 · Núcleo** | Reportar de punta a punta · Mapa con marcadores |
| **H10–H14 · Integración** | Front conectado a la API real · Verificación satelital · Desplegado |
| **H14–H16 · Autoridad** | Panel del gestor · Transparencia SECOP |
| **H16–H18 · Estabilizar** | Congelación de funcionalidades. Solo bugs y pulido. |
| **H18–H20 · Pitch** | Guion, video de respaldo y ensayo. **No se toca código.** |

### Prioridades

| Etiqueta | Significado |
|:---|:---|
| `P0-demo` | Sin esto **no hay demo**. Innegociable. |
| `P1-importante` | Suma al pitch, pero la demo sobrevive sin ello. |
| `P2-opcional` | Solo si sobra tiempo. Se corta sin culpa. |

---

## Alcance: qué SÍ y qué NO

**Sí construimos:** reportar con foto y ubicación · seguimiento con código y cronología · mapa · panel del gestor · NASA FIRMS · SECOP.

**No construimos** (va en el pitch como lo que sigue): monitoreo automático de X/Twitter — la API v2 ya no permite *buscar* tweets en el plan gratuito, solo publicarlos, y pagarla no se justifica para un hackathon. También queda fuera el panel de administrador completo.

---

## Las tres reglas que salvan el proyecto

1. **Nadie espera a nadie.** El frontend trabaja contra datos falsos con la forma exacta del contrato de API.
2. **Desplegar temprano, no a la hora 19.** El wifi de un hackathon se cae; con URLs públicas la demo se abre desde cualquier celular.
3. **A la hora 16 se congela.** Lo que no esté empezado no entra. La causa número uno de equipos sin demo es meter una funcionalidad más a la hora 17.
