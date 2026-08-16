# Tutorial Remotion

Tutorial animado de 45 segundos basado en los flujos y el sistema visual de ConectaRiesgo.

```powershell
npm run tutorial
npm run tutorial:render
```

`tutorial` abre Remotion Studio para presentar y ajustar la composición en vivo. `tutorial:render`
genera `out/conectariesgo-tutorial.mp4` en 1920 × 1080, 30 fps.

La composición principal es `ConectaRiesgoTutorial`. Todas las escenas son deterministas y usan
únicamente recursos locales de `public/`, por lo que no dependen de la API ni de conexión de red.

La misma composición se reproduce dentro de la aplicación en la ruta pública `/tutorial`,
accesible mediante **Ver tutorial** en la portada. El MP4 es un artefacto opcional de exportación:
no se versiona ni se necesita para reproducir el tutorial en la UI.
