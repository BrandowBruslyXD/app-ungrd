# ── Build ──
FROM node:20-slim AS build
WORKDIR /app
# openssl (Prisma) + toolchain por si algún addon nativo necesita compilar.
RUN apt-get update \
  && apt-get install -y openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# npm ci: build reproducible a partir del package-lock (que ya incluye el stack
# de IA/media). Requiere el lock sincronizado (npm install --package-lock-only).
RUN npm ci --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build
# Poda las devDependencies (nest-cli, webpack, typescript...) para que NO viajen
# al runtime: imagen más liviana y menor superficie en producción.
RUN npm prune --omit=dev

# ── Runtime ──
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Rutas de cachés de modelos offline. El contenido vive en el volumen
# persistente wabots_models (/opt/models), NO dentro de la imagen.
ENV TESSERACT_CACHE_PATH=/opt/models/tesseract
ENV TRANSFORMERS_CACHE=/opt/models/transformers
ENV WHISPER_MODEL=Xenova/whisper-base
RUN mkdir -p /opt/models/tesseract /opt/models/transformers

COPY package*.json ./
# Reutiliza node_modules del build (incluye Prisma CLI + cliente generado).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

# El modelo Whisper NO se precarga en la imagen: vive en el volumen persistente
# wabots_models (/opt/models) — precargarlo aquí duplicaba ~150 MB de capa en
# CADA deploy (la capa quedaba después del COPY de dist, que cambia siempre) y
# el volumen la tapaba de todos modos. En el primer arranque sin volumen, el
# servicio la descarga y cachea (TranscriptionService.onModuleInit).
EXPOSE 3000
# Aplica migraciones y arranca. (migrate deploy es no interactivo y seguro.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
