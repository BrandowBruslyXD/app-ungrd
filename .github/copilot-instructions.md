# Copilot Instructions — ConectaRiesgo

## El proyecto

Asistente ciudadano de gestión de emergencias accesible por WhatsApp: el ciudadano reporta
afectaciones por texto, audio, foto o ubicación, la IA clasifica y prioriza, orienta sobre ayudas y
trámites, y el caso avanza por estados (`Reportado → Validado → Priorizado → Ayuda asignada →
En atención → Entregado → Confirmado`). Es un hackatón: prioriza lo pragmático y lo que se puede
demostrar funcionando, y no asumas infraestructura ni catálogos que el repo todavía no tiene.

- **Backend:** .NET, en `backend/src`. **Frontend:** React + TypeScript, en `frontend`.
- Documentación, comentarios y mensajes al usuario en español neutro; mantén tildes (UTF-8).
- Los mensajes de commit explican el PORQUÉ del cambio, no el QUÉ.
- Nunca commitees secretos ni archivos `.env*`: van por variables de entorno o gestor de secretos.

## Arquitectura: Vertical Slice (no DDD por capas, no Clean Architecture por capas)

```
backend/src/
  Features/<Feature>/<CasoDeUso>/   # p. ej. Reportes/CrearReporte
      <CasoDeUso>Endpoint.cs        # transporte: minimal API / controller delgado
      <CasoDeUso>Request.cs / Response.cs   # entrada y salida (records inmutables)
      <CasoDeUso>Handler.cs         # la lógica del caso de uso, de punta a punta
      <CasoDeUso>Validator.cs       # validación de entrada
  Features/<Feature>/<Feature>Entity.cs   # modelo persistido de la feature
  Shared/            # transversal real: auth, errores, paginación, logging
  Infrastructure/    # acceso a datos, clientes externos, wiring
  Program.cs
```

1. **La rebanada es la unidad:** un caso de uso vive completo en su carpeta y se lee de arriba abajo.
2. **Cero acoplamiento entre rebanadas:** no referencies tipos de otra — o duplicas (barato y
   explícito) o subes a `Shared/`.
3. **Duplicar vale; abstraer antes de tiempo, no:** extrae en la tercera repetición, no en la segunda.
4. **`Shared/` es solo lo genuinamente transversal.** Si algo ahí lo usa una sola rebanada, sobra.
5. **El endpoint es delgado:** traduce HTTP ↔ handler, sin lógica de negocio.
6. **El handler es dueño de la regla de negocio;** la invariante que vale para varias rebanadas vive
   en la entidad de la feature.
7. **Nada de capas fantasma:** ni `Application`/`Domain`/`Infrastructure` por rebanada, ni
   repositorios genéricos, ni un mediator si no aporta.
8. Al revisar pregunta *"¿es autocontenida?"* y *"¿lo que subió a `Shared/` lo usan varias?"*.
9. Sin motor de datos decidido: persistencia agnóstica, con `IQueryable`/EF Core como ejemplo neutro.

## Convenciones — C#

- Un tipo público por archivo, con el nombre del archivo igual al del tipo.
- Tipos explícitos en vez de `var`, salvo proyecciones anónimas de LINQ (proyectos `.Tests` exentos).
- Campos privados `_camelCase`, el resto `PascalCase`. DTOs `record` inmutables. Timestamps
  ISO-8601 UTC. Tests: `[Método]_[Condición]_[ResultadoEsperado]`.
- XML docs en español en tipos y miembros con lógica (`.Tests` exentos; `<inheritdoc />` basta al
  implementar un contrato). Verifica siempre que quien consulta o modifica un dato pueda hacerlo.
- Logging: plantilla constante con placeholders con nombre (nada de interpolación), la excepción
  como primer argumento de `LogError`, contexto para diagnosticar sin depurar, sin datos sensibles.

## Convenciones — TypeScript / React

- Nada de `any`; TypeScript strict. Sin textos de UI hardcodeados: todo por i18n.
- La lógica de negocio va en hooks, no en componentes. Store solo cuando de verdad hace falta.

## Fuente única

Esto es un resumen. La guía completa vive en `CLAUDE.md` en la raíz: ante cualquier duda o
discrepancia, manda `CLAUDE.md`.
