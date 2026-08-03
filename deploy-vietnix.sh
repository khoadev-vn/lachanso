#!/bin/bash
# ============================================================
# Deploy backend Lá Chắn Số lên server Vietnix (Ubuntu/Debian)
# Chạy với quyền root:  bash deploy-vietnix.sh
# ============================================================
set -euo pipefail

APP_DIR="/opt/lachanso"
REPO_URL="https://github.com/khoadev-vn/lachanso.git"

echo "==> 1. Cài đặt Node.js 20 + PM2 + Caddy (nếu chưa có)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

echo "==> 2. Lấy mã nguồn"
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --rebase origin main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> 3. Cài dependencies backend"
cd "$APP_DIR/server"
npm install --omit=dev

echo "==> 4. Tạo file .env nếu chưa có"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "!!!! Tạo $APP_DIR/.env xong. BẠN PHẢI điền LCS_BACKEND_SECRET + các API key rồi chạy lại lệnh này."
  echo "!!!! Lệnh gợi ý:  nano $APP_DIR/.env   rồi  bash deploy-vietnix.sh"
  exit 1
fi

echo "==> 5. Khởi động backend bằng PM2"
cd "$APP_DIR"
pm2 start ecosystem.config.cjs && pm2 save

echo "==> 6. Copy Caddyfile và khởi động HTTPS"
if [ -f "$APP_DIR/Caddyfile" ]; then
  cp "$APP_DIR/Caddyfile" /etc/caddy/Caddyfile
  systemctl reload caddy
fi

echo ""
echo "✅ XONG. Kiểm tra:"
echo "   curl https://api.lachansovn.vn/health"
echo "   pm2 logs lachanso-backend"
echo ""
echo "⚠️  Đừng quên trên Vercel set 2 biến:"
echo "   LCS_BACKEND_URL    = https://api.lachansovn.vn"
echo "   LCS_BACKEND_SECRET = (giống hệt trong .env server)"
