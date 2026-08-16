# Servicio de datos de demostración: sin dependencias, solo el http de Node.
FROM node:20-alpine
WORKDIR /app
COPY server.js catalogo.json ./
ENV PORT=4100
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:4100/health >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
