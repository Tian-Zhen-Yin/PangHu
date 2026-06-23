#!/bin/bash
# ============================================================
# PangHu 一键启动脚本（Mac Mini）
# 启动顺序：PostgreSQL → 后端服务 → Cloudflare Tunnel
# ============================================================

set -e

# ---------- 配置 ----------
PROJECT_DIR="${PANGHU_PROJECT_DIR:-$HOME/Projects/PangHu}"
TUNNEL_NAME="${PANGHU_TUNNEL_NAME:-panghu}"
PUBLIC_URL="${PANGHU_PUBLIC_URL:-https://panghu.989048.xyz}"
PG_VERSION="${PANGHU_PG_VERSION:-postgresql@17}"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

# ---------- 工具函数 ----------
has_command() { command -v "$1" >/dev/null 2>&1; }

check_dependency() {
  local cmd=$1
  local hint=$2
  if ! has_command "$cmd"; then
    log_error "缺少命令: $cmd"
    log_warn  "请先执行: $hint"
    exit 1
  fi
}

# ---------- 启动流程 ----------
echo ""
echo "================================================"
echo "      🐾 PangHu Mac Mini 启动脚本"
echo "================================================"
echo ""

# 依赖检查
check_dependency brew        "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
check_dependency node        "brew install node@20"
check_dependency npm         "brew install node@20"
check_dependency cloudflared "brew install cloudflared"
check_dependency pm2         "npm install -g pm2"

# 项目目录检查
if [ ! -d "$PROJECT_DIR" ]; then
  log_error "项目目录不存在: $PROJECT_DIR"
  log_warn  "请先克隆项目: git clone <repo> $PROJECT_DIR"
  log_warn  "或设置环境变量: export PANGHU_PROJECT_DIR=/path/to/PangHu"
  exit 1
fi

# .env 检查
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
  log_error "后端 .env 不存在"
  log_warn  "请执行: cp $PROJECT_DIR/backend/.env.example $PROJECT_DIR/backend/.env"
  log_warn  "并修改 DATABASE_URL 为本地连接（postgresql://localhost:5432/panghu）"
  exit 1
fi

# ---------- 1. 启动 PostgreSQL ----------
log_info "Step 1/3 启动 PostgreSQL ..."
if brew services list | grep -q "$PG_VERSION.*started"; then
  log_success "PostgreSQL 已在运行"
else
  brew services start "$PG_VERSION" >/dev/null
  sleep 2
  log_success "PostgreSQL 已启动"
fi

# 数据库连接探活
if ! psql -h localhost -U "$(whoami)" -d panghu -c "SELECT 1" >/dev/null 2>&1; then
  log_warn  "无法连接到 panghu 数据库"
  log_warn  "如果是首次部署，请执行："
  log_warn  "  createdb panghu"
  log_warn  "  cd $PROJECT_DIR/backend && npm run db:migrate"
  log_warn  "  npm run db:seed"
fi

# ---------- 2. 启动后端 (PM2) ----------
log_info "Step 2/3 启动后端服务 ..."
cd "$PROJECT_DIR"

ECOSYSTEM_FILE="$PROJECT_DIR/ecosystem.config.cjs"
if [ ! -f "$ECOSYSTEM_FILE" ]; then
  log_error "PM2 配置文件不存在: $ECOSYSTEM_FILE"
  log_warn  "请运行: bash $PROJECT_DIR/scripts/mac-mini/setup-pm2.sh"
  exit 1
fi

if pm2 list | grep -q "panghu-backend.*online"; then
  log_success "后端已在运行（PM2）"
else
  pm2 start "$ECOSYSTEM_FILE" >/dev/null
  pm2 save >/dev/null 2>&1 || true
  sleep 3
  if pm2 list | grep -q "panghu-backend.*online"; then
    log_success "后端服务已启动 (localhost:3000)"
  else
    log_error "后端启动失败，查看日志: pm2 logs panghu-backend"
    exit 1
  fi
fi

# 后端健康检查
log_info "等待后端就绪 ..."
for i in {1..15}; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    log_success "后端健康检查通过"
    break
  fi
  if [ "$i" = 15 ]; then
    log_warn "后端健康检查超时，但继续启动 Tunnel"
  fi
  sleep 1
done

# ---------- 3. 启动 Cloudflare Tunnel ----------
log_info "Step 3/3 启动 Cloudflare Tunnel ..."

# 优先用系统服务（如果已 install）
if sudo launchctl list 2>/dev/null | grep -q "com.cloudflare.cloudflared"; then
  log_success "Tunnel 已作为系统服务运行"
else
  # 检查是否已用 pm2 托管
  if pm2 list | grep -q "panghu-tunnel.*online"; then
    log_success "Tunnel 已通过 PM2 运行"
  else
    # 用 pm2 托管 cloudflared，避免占用终端
    pm2 start cloudflared --name panghu-tunnel -- tunnel run "$TUNNEL_NAME" >/dev/null
    pm2 save >/dev/null 2>&1 || true
    sleep 3
    if pm2 list | grep -q "panghu-tunnel.*online"; then
      log_success "Tunnel 已通过 PM2 启动"
    else
      log_error "Tunnel 启动失败，查看日志: pm2 logs panghu-tunnel"
      exit 1
    fi
  fi
fi

# ---------- 完成 ----------
echo ""
echo "================================================"
log_success "🎉 PangHu 已全部启动"
echo "================================================"
echo ""
echo "🌐 公网访问：  $PUBLIC_URL"
echo "🏠 本地访问：  http://localhost:3000"
echo ""
echo "📊 查看状态：  ~/scripts/panghu-status.sh"
echo "📋 查看日志：  pm2 logs panghu-backend"
echo "🛑 停止服务：  ~/scripts/panghu-down.sh"
echo ""

# 把 URL 复制到剪贴板（macOS 专属）
if has_command pbcopy; then
  echo "$PUBLIC_URL" | pbcopy
  log_info "访问链接已复制到剪贴板"
fi
