#!/bin/bash
# ============================================================
# Deploy backend Lá Chắn Số lên server Vietnix (Ubuntu/Debian)
# Chạy với quyền root:  bash deploy-vietnix.sh
# ============================================================
set -euo pipefail

APP_DIR="/opt/lachanso"
REPO_URL="https://github.com/khoadev-vn/lachanso.git"

echo "==> 1. Cài đặt Node.js 20 + PM2 (nếu chưa có)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
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
  echo "!!!! Đã tạo $APP_DIR/.env. BẠN PHẢI điền LCS_BACKEND_SECRET + các API key rồi chạy lại."
  echo "!!!! Lệnh gợi ý:  nano $APP_DIR/.env   rồi  bash deploy-vietnix.sh"
  exit 1
fi

echo "==> 5. Mở port 3001 trên firewall (nếu có ufw)"
ufw allow 3001/tcp >/dev/null 2>&1 || true

echo "==> 6. Khởi động backend bằng PM2"
cd "$APP_DIR"
pm2 start ecosystem.config.cjs && pm2 save
pm2 startup systemd >/dev/null 2>&1 || true

echo ""
echo "✅ XONG. Backend đang chạy tại:"
echo "   http://$(hostname -I | awk '{print $1}'):3001/health"
echo ""
echo "⚠️  TRÊN VERCEL set 2 biến (Settings -> Environment Variables):"
echo "   LCS_BACKEND_URL    = http://42.1.112.100:3001"
echo "   LCS_BACKEND_SECRET = (giống hệt LCS_BACKEND_SECRET trong .env server)"
echo ""
echo "ℹ️  LƯU Ý BẢO MẬT: chạy bằng IP qua http chỉ là tạm thời."
echo "   Khi có domain, chạy Caddy (HTTPS) rồi đổi LCS_BACKEND_URL sang https://domain."
