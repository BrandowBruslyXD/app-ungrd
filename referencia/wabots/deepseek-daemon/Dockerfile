# Daemon de sesión DeepSeek-web. Imagen de Playwright (trae Chromium + deps del
# sistema ya instalados) para poder refrescar el bearer headless con el perfil.
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app
ENV NODE_ENV=production
ENV DS_PROFILES_DIR=/profiles
# Los navegadores YA vienen en la imagen base (en /ms-playwright); no re-descargar
# en el postinstall del paquete npm (evita tiempo y desajuste de versión).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# x11vnc para el login interactivo por VNC (Xvfb ya viene en la imagen base).
RUN apt-get update && apt-get install -y --no-install-recommends x11vnc \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
# Solo dependencias de producción (pg + playwright).
RUN npm install --omit=dev --no-audit --no-fund

COPY index.mjs login.sh ./
RUN chmod +x login.sh

# Por defecto corre el daemon de refresco (headless). El login interactivo se
# lanza aparte: `docker exec -it wabots-deepseek-daemon /app/login.sh <label>`.
CMD ["node", "index.mjs"]
