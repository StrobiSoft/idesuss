#!/usr/bin/env bash
set -euo pipefail

OP_NAME="idesuss-password-security"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
APP_ROOT="/opt/idesuss/current/server"
BACKUP_ROOT="/var/backups/idesuss-password-security/${STAMP}"
SERVICE_SRC="${ROOT_DIR}/server/password-security/deploy/idesuss-password-security.service"
NGINX_SRC="${ROOT_DIR}/server/password-security/deploy/nginx-password-security.conf"
SERVICE_DST="/etc/systemd/system/idesuss-password-security.service"
NGINX_DST="/etc/nginx/sites-available/idesuss-password-security.conf"
NGINX_LINK="/etc/nginx/sites-enabled/idesuss-password-security.conf"
CERT="/etc/letsencrypt/live/security.idesuss.net/fullchain.pem"
KEY="/etc/letsencrypt/live/security.idesuss.net/privkey.pem"

say() { printf '%s\n' "$*"; }
die() { say "ERROR: $*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || die "must run as root on VM101"
[[ -f "${ROOT_DIR}/server/password-security/server.js" ]] || die "repository root not detected"
[[ -f "${ROOT_DIR}/server/security/spy-trap.js" ]] || die "shared Spy Trap missing"
command -v node >/dev/null 2>&1 || die "node is required"
command -v systemctl >/dev/null 2>&1 || die "systemd is required"
command -v nginx >/dev/null 2>&1 || die "nginx is required"
command -v curl >/dev/null 2>&1 || die "curl is required"

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[[ "${NODE_MAJOR}" -ge 20 ]] || die "Node.js >=20 required"

mkdir -p "${BACKUP_ROOT}" "${APP_ROOT}"
for p in "${APP_ROOT}/password-security" "${APP_ROOT}/security" "${SERVICE_DST}" "${NGINX_DST}" "${NGINX_LINK}"; do
  if [[ -e "${p}" || -L "${p}" ]]; then
    cp -a "${p}" "${BACKUP_ROOT}/"
  fi
done

rm -rf "${APP_ROOT}/password-security" "${APP_ROOT}/security"
cp -a "${ROOT_DIR}/server/password-security" "${APP_ROOT}/password-security"
cp -a "${ROOT_DIR}/server/security" "${APP_ROOT}/security"
install -m 0644 "${SERVICE_SRC}" "${SERVICE_DST}"

systemctl daemon-reload
systemctl enable --now idesuss-password-security.service
systemctl restart idesuss-password-security.service
systemctl is-active --quiet idesuss-password-security.service || die "gateway service not active"

LISTEN=""
for _ in $(seq 1 20); do
  LISTEN="$(ss -ltnp 2>/dev/null | awk '$4 ~ /127\.0\.0\.1:8790$/ {print $4}' | head -n1 || true)"
  [[ "${LISTEN}" == "127.0.0.1:8790" ]] && break
  sleep 0.5
done
[[ "${LISTEN}" == "127.0.0.1:8790" ]] || die "gateway is not bound only to 127.0.0.1:8790"

HEALTH_OK=0
for _ in $(seq 1 10); do
  if curl -fsS --max-time 2 http://127.0.0.1:8790/healthz >/dev/null; then
    HEALTH_OK=1
    break
  fi
  sleep 0.5
done
[[ "${HEALTH_OK}" -eq 1 ]] || die "local health check failed"

mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
install -m 0644 "${NGINX_SRC}" "${NGINX_DST}"

PUBLIC_ROUTE="BLOCKED_TLS_OR_DNS"
if [[ -f "${CERT}" && -f "${KEY}" ]]; then
  ln -sfn "${NGINX_DST}" "${NGINX_LINK}"
  nginx -t
  systemctl reload nginx
  PUBLIC_ROUTE="NGINX_ENABLED"
else
  rm -f "${NGINX_LINK}"
  nginx -t
fi

say "OPERATION=${OP_NAME}"
say "INSTALL=PASS"
say "SYSTEMD=PASS"
say "LISTEN=127.0.0.1:8790"
say "HEALTH=PASS"
say "NGINX_CONFIG=PASS"
say "PUBLIC_ROUTE=${PUBLIC_ROUTE}"
say "ROLLBACK_BACKUP=${BACKUP_ROOT}"
