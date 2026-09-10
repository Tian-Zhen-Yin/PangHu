#!/bin/bash
# ============================================================
# PangHu 状态检查脚本
# 一目了然看到所有服务的运行情况
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PUBLIC_URL="${PANGHU_PUBLIC_URL:-https://panghu.989048.xyz}"
PG_VERSION="${PANGHU_PG_VERSION:-postgresql@17}"

ok()   { echo -e "  ${GREEN}● $1${NC}"; }
fail() { echo -e "  ${RED}● $1${NC}"; }
warn() { echo -e "  ${YELLOW}● $1${NC}"; }

echo ""
echo -e "${BOLD}================================================${NC}"
echo -e "${BOLD}      🐾 PangHu 服务状态${NC}"
echo -e "${BOLD}================================================${NC}"

# ---------- PostgreSQL ----------
echo ""
echo -e "${BLUE}📦 PostgreSQL${NC}"
if brew services list 2>/dev/null | grep -q "$PG_VERSION.*started"; then
  ok "PostgreSQL 运行中"
  if psql -h localhost -d panghu -c "SELECT 1" >/dev/null 2>&1; then
    DB_SIZE=$(psql -h localhost -d panghu -tA -c "SELECT pg_size_pretty(pg_database_size('panghu'))" 2>/dev/null || echo "未知")
    ok "panghu 数据库可访问（大小：$DB_SIZE）"
  else
    fail "无法连接到 panghu 数据库"
  fi
else
  fail "PostgreSQL 未运行"
fi

# ---------- 后端 ----------
echo ""
echo -e "${BLUE}🚀 后端服务${NC}"
if pm2 list 2>/dev/null | grep -q "panghu-backend.*online"; then
  MEMORY=$(pm2 jlist 2>/dev/null | node -e "
    const apps = JSON.parse(require('fs').readFileSync(0));
    const app = apps.find(a => a.name === 'panghu-backend');
    if (app) console.log(Math.round(app.monit.memory / 1024 / 1024) + 'MB');
  " 2>/dev/null || echo "N/A")
  UPTIME=$(pm2 jlist 2>/dev/null | node -e "
    const apps = JSON.parse(require('fs').readFileSync(0));
    const app = apps.find(a => a.name === 'panghu-backend');
    if (app) {
      const sec = Math.round((Date.now() - app.pm2_env.pm_uptime) / 1000);
      const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
      console.log(h + 'h ' + m + 'm');
    }
  " 2>/dev/null || echo "N/A")
  ok "后端运行中 (内存 $MEMORY, 运行 $UPTIME)"

  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    ok "本地健康检查通过 (localhost:3000)"
  else
    warn "进程在但健康检查未通过"
  fi
else
  fail "后端未运行"
fi

# ---------- Tunnel ----------
echo ""
echo -e "${BLUE}🌐 Cloudflare Tunnel${NC}"
if sudo launchctl list 2>/dev/null | grep -q "com.cloudflare.cloudflared"; then
  ok "Tunnel 系统服务运行中"
elif pm2 list 2>/dev/null | grep -q "panghu-tunnel.*online"; then
  ok "Tunnel (PM2) 运行中"
else
  fail "Tunnel 未运行"
fi

if curl -sf -m 5 "$PUBLIC_URL/api/health" >/dev/null 2>&1; then
  ok "公网访问通过 ($PUBLIC_URL)"
else
  warn "公网无法访问，可能 Tunnel 还在建立连接"
fi

# ---------- 系统资源 ----------
echo ""
echo -e "${BLUE}💻 系统资源${NC}"
CPU=$(ps -A -o %cpu | awk '{s+=$1} END {printf "%.1f", s}')
MEM_PRESSURE=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print $5}' || echo "N/A")
ok "CPU 总占用: ${CPU}%"
ok "内存空闲率: $MEM_PRESSURE"

# ---------- 网络访问入口 ----------
echo ""
echo -e "${BOLD}🔗 访问入口${NC}"
echo "  🏠 本地: http://localhost:3000"
echo "  🌐 公网: $PUBLIC_URL"
echo ""
echo -e "${BOLD}📋 常用命令${NC}"
echo "  启动: bash ~/scripts/panghu-up.sh"
echo "  停止: bash ~/scripts/panghu-down.sh"
echo "  日志: pm2 logs panghu-backend"
echo "  监控: pm2 monit"
echo ""
