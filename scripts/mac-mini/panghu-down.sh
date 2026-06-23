#!/bin/bash
# ============================================================
# PangHu 一键停止脚本
# 停止顺序：Tunnel → 后端 →（可选）PostgreSQL
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }

PG_VERSION="${PANGHU_PG_VERSION:-postgresql@17}"

echo ""
echo "================================================"
echo "      🛑 PangHu 停止脚本"
echo "================================================"
echo ""

# 1. 停止 Tunnel
log_info "停止 Cloudflare Tunnel ..."
if pm2 list 2>/dev/null | grep -q "panghu-tunnel"; then
  pm2 stop panghu-tunnel >/dev/null 2>&1 || true
  log_success "Tunnel (PM2) 已停止"
fi
if sudo launchctl list 2>/dev/null | grep -q "com.cloudflare.cloudflared"; then
  log_warn "Tunnel 作为系统服务在运行，如需停止执行：sudo launchctl stop com.cloudflare.cloudflared"
fi

# 2. 停止后端
log_info "停止后端 ..."
if pm2 list 2>/dev/null | grep -q "panghu-backend"; then
  pm2 stop panghu-backend >/dev/null 2>&1 || true
  log_success "后端已停止"
else
  log_warn "后端未在 PM2 中运行"
fi

# 3. PostgreSQL（默认保留，避免影响其他项目）
if [ "${1:-}" = "--with-db" ]; then
  log_info "停止 PostgreSQL ..."
  brew services stop "$PG_VERSION" >/dev/null
  log_success "PostgreSQL 已停止"
else
  log_warn "PostgreSQL 保持运行（用 --with-db 参数可同时停止）"
fi

echo ""
log_success "已停止 PangHu 服务"
echo ""
