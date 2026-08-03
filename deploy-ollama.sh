#!/usr/bin/env bash
# ============================================================
#  Deploy Ollama + Qwen2.5 7B - 100% free, no key, no account
#  Chạy trên VPS Vietnix (Ubuntu/Debian 22.04+)
#
#  Cách dùng:
#    ssh root@<IP-VPS>
#    # upload file này lên (hoặc tạo mới bằng nano) rồi chạy:
#    chmod +x deploy-ollama.sh && ./deploy-ollama.sh
# ============================================================
set -euo pipefail

MODEL="${OLLAMA_MODEL:-qwen2.5:0.5b}"
PORT="${OLLAMA_PORT:-11434}"

echo "======================================================"
echo " [1/4] Cài đặt Ollama (tự động nhận OS)..."
echo "======================================================"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "Ollama đã có sẵn, bỏ qua cài đặt."
fi

echo
echo "======================================================"
echo " [2/4] Pull model: $MODEL (nhanh, chạy tốt trên CPU VPS 8 core)"
echo "======================================================"
ollama pull "$MODEL"

echo
echo "======================================================"
echo " [3/4] Cấu hình chạy 24/7 + tự động khởi động lại"
echo "======================================================"
# Ollama cài qua install.sh đã có systemd sẵn. Ta chỉ cần đảm bảo:
systemctl enable ollama 2>/dev/null || true
systemctl restart ollama 2>/dev/null || true

# Giữ model trong RAM 30 phút để phản hồi nhanh khi có nhiều yêu cầu
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
Environment="OLLAMA_KEEP_ALIVE=30m"
Restart=always
RestartSec=5
EOF
systemctl daemon-reload
systemctl restart ollama

echo
echo "======================================================"
echo " [4/4] Kiểm tra trạng thái"
echo "======================================================"
sleep 3
systemctl is-active ollama && echo "✅ Ollama đang chạy (systemd)"
echo "Model có sẵn:"
ollama list
echo
echo "API test:"
curl -s "http://127.0.0.1:${PORT}/api/tags" | head -c 400
echo
echo
echo "======================================================"
echo " ✅ XONG! Ollama chạy 24/7, không cần key/account."
echo "    Endpoint LLM: http://127.0.0.1:${PORT}"
echo "    Model: $MODEL"
echo
echo " Trên server backend chỉ cần .env:"
echo "    OLLAMA_BASE_URL=http://127.0.0.1:${PORT}"
echo "    OLLAMA_MODEL=$MODEL"
echo "======================================================"
