#!/usr/bin/env bash
# Update and restart E-Tashleh on VPS (run ON the server as root)
# Usage:
#   bash /var/www/e-tashleh/deploy/update-vps.sh
#
# First time only:
#   chmod +x /var/www/e-tashleh/deploy/update-vps.sh

set -euo pipefail

APP_DIR="/var/www/e-tashleh"
BRANCH="main"

echo "==> Pull latest from GitHub"
cd "$APP_DIR"
git fetch origin
git pull origin "$BRANCH"

echo "==> Backend: install + build"
cd "$APP_DIR/backend"
npm install --legacy-peer-deps
npm run build

echo "==> Frontend: install + build"
cd "$APP_DIR/Frontend"
if [[ ! -f .env.production ]]; then
  echo "WARNING: Frontend/.env.production missing!"
  echo "Create it with VITE_API_URL=https://api.e-tashleh.net before building."
  exit 1
fi
npm install --legacy-peer-deps
npm run build

echo "==> Restart API (PM2)"
cd "$APP_DIR"
if pm2 describe e-tashleh-api >/dev/null 2>&1; then
  pm2 restart e-tashleh-api
else
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi

echo "==> Reload Nginx (if config changed — keeps certbot SSL blocks if already merged)"
if nginx -t 2>/dev/null; then
  systemctl reload nginx
fi

echo ""
echo "==> Health check"
curl -sf -o /dev/null -w "API health: HTTP %{http_code}\n" https://api.e-tashleh.net/health || true
curl -sf -o /dev/null -w "Frontend:   HTTP %{http_code}\n" https://e-tashleh.net || true

echo ""
echo "Done. Logs: pm2 logs e-tashleh-api --lines 50"
