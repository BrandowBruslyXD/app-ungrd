#!/bin/sh
# Backup diario de la BD de wabots (SOLO la nuestra; no toca nada más del server).
# Corre como sidecar en docker-compose.server.yml con la misma imagen de postgres:
#  - Hace un pg_dump comprimido (formato custom, restaurable con pg_restore) al
#    arrancar y luego cada 24 h.
#  - Escribe primero a .tmp y renombra al final: nunca queda un dump a medias.
#  - Retención: borra dumps con más de BACKUP_RETENTION_DAYS días (default 14).
# Restaurar (dentro del contenedor de postgres):
#   pg_restore -h wabots-postgres -U $POSTGRES_USER -d <bd_destino> --clean --if-exists /backups/<archivo>.dump
set -eu

: "${POSTGRES_USER:?falta POSTGRES_USER}"
: "${POSTGRES_DB:?falta POSTGRES_DB}"
: "${POSTGRES_PASSWORD:?falta POSTGRES_PASSWORD}"
export PGPASSWORD="$POSTGRES_PASSWORD"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL_S="${BACKUP_INTERVAL_SECONDS:-86400}"

echo "[backup] iniciado — cada ${INTERVAL_S}s, retención ${RETENTION_DAYS} días"

while :; do
  ts=$(date +%Y%m%d_%H%M%S)
  f="/backups/wabots_${ts}.dump"
  if pg_dump -h wabots-postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -Z 6 -f "${f}.tmp"; then
    mv "${f}.tmp" "$f"
    echo "[backup] OK $f ($(du -h "$f" | cut -f1))"
    find /backups -name 'wabots_*.dump' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
  else
    rm -f "${f}.tmp"
    echo "[backup] FALLÓ ${ts} — se reintenta en el próximo ciclo" >&2
  fi
  sleep "$INTERVAL_S"
done
