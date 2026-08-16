#!/bin/sh
# Login INTERACTIVO en el servidor vía VNC. Levanta Xvfb + x11vnc y abre el
# navegador para que un humano complete el login + la verificación de DeepSeek
# (CAPTCHA) desde un túnel SSH. Uso (dentro del contenedor):
#   docker exec -it wabots-deepseek-daemon /app/login.sh [label]
# Luego, desde tu PC:
#   ssh -L 5900:127.0.0.1:5900 -i <llave> deploy@<server>
#   y conecta un cliente VNC a localhost:5900
set -e
LABEL="${1:-${DS_LABEL:-lldikayll}}"

# Pantalla virtual de 24 bits (la profundidad por defecto crashea a Chromium).
Xvfb :99 -screen 0 1280x1024x24 -ac +extension GLX +render -noreset >/tmp/xvfb.log 2>&1 &
XVFB_PID=$!
sleep 2
export DISPLAY=:99

# Servidor VNC en 5900. El puerto se publica SOLO en 127.0.0.1 del host (compose),
# así que únicamente es accesible por túnel SSH (llave del deploy).
x11vnc -display :99 -rfbport 5900 -forever -shared -nopw -bg -o /tmp/x11vnc.log
echo "[login.sh] VNC en :5900 (usa túnel SSH). Abriendo navegador para '$LABEL'…"

DISPLAY=:99 node /app/index.mjs login "$LABEL"
RC=$?
kill "$XVFB_PID" 2>/dev/null || true
exit $RC
