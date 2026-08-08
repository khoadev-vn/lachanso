#!/usr/bin/env bash
set -euo pipefail
# Deploy CI: nhận dist tarball từ stdin, cập nhật /opt/lachanso/dist
SRC=/tmp/ci-dist.tar.gz
cat > "$SRC"
if [ ! -s "$SRC" ]; then echo "ERROR: empty tarball"; exit 1; fi
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p /opt/lachanso/backup
if [ -d /opt/lachanso/dist ]; then mv /opt/lachanso/dist "/opt/lachanso/backup/dist.$TS"; fi
mkdir -p /opt/lachanso/dist
tar -xzf "$SRC" -C /opt/lachanso/dist
rm -f "$SRC"
echo "DEPLOY_OK $TS"
