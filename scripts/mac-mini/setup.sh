#!/bin/bash
# ============================================================
# PangHu 首次部署 / 配置文件生成脚本
# 在 Mac Mini 上首次部署时执行一次
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

PROJECT_DIR="${PANGHU_PROJECT_DIR:-$HOME/Projects/PangHu}"

echo ""
echo "================================================"
echo "   🛠  PangHu Mac Mini 首次部署向导"
echo "================================================"
echo ""

# ---------- 1. 检查与安装依赖 ----------
log_info "Step 1/5 检查系统依赖 ..."

if ! command -v brew >/dev/null 2>&1; then
  log_error "Homebrew 未安装"
  echo "请先执行："
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  exit 1
fi
log_success "Homebrew 已安装"

# Node
if ! command -v node >/dev/null 2>&1; then
  log_info "安装 Node.js ..."
  brew install node@20
fi
log_success "Node $(node -v)"

# PostgreSQL
if ! brew list postgresql@17 >/dev/null 2>&1; then
  log_info "安装 PostgreSQL 17 ..."
  brew install postgresql@17
fi
brew services start postgresql@17 >/dev/null 2>&1 || true
log_success "PostgreSQL 17 已安装并启动"

# Cloudflared
if ! command -v cloudflared >/dev/null 2>&1; then
  log_info "安装 cloudflared ..."
  brew install cloudflared
fi
log_success "cloudflared $(cloudflared version | head -1)"

# PM2
if ! command -v pm2 >/dev/null 2>&1; then
  log_info "安装 PM2 ..."
  npm install -g pm2
fi
log_success "PM2 $(pm2 --version)"

# ---------- 2. 数据库初始化 ----------
echo ""
log_info "Step 2/5 数据库初始化 ..."
if psql -h localhost -lqt | cut -d \| -f 1 | grep -qw panghu; then
  log_success "panghu 数据库已存在"
else
  createdb panghu
  log_success "已创建 panghu 数据库"
fi

# ---------- 3. .env 配置 ----------
echo ""
log_info "Step 3/5 检查 .env 配置 ..."
ENV_FILE="$PROJECT_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$PROJECT_DIR/backend/.env.example" ]; then
    cp "$PROJECT_DIR/backend/.env.example" "$ENV_FILE"
    log_warn ".env 已从 .env.example 创建，请编辑："
    log_warn "  $ENV_FILE"
    log_warn "  - 修改 DATABASE_URL=postgresql://$(whoami)@localhost:5432/panghu"
    log_warn "  - 修改 JWT_SECRET 为强随机字符串"
    log_warn "  - 检查 CORS_ORIGINS 包含 https://panghu.989048.xyz"
  else
    log_error "找不到 .env.example"
    exit 1
  fi
else
  log_success ".env 已存在"
fi

# ---------- 4. 安装项目依赖 ----------
echo ""
log_info "Step 4/5 安装项目依赖 ..."
cd "$PROJECT_DIR/backend"
npm install
log_success "后端依赖已安装"

cd "$PROJECT_DIR/frontend"
npm install
log_success "前端依赖已安装"

# ---------- 5. 数据库迁移 ----------
echo ""
log_info "Step 5/5 数据库迁移 ..."
cd "$PROJECT_DIR/backend"
npm run db:generate
npm run db:migrate || log_warn "迁移失败，请检查 DATABASE_URL"

echo ""
read -p "是否填充种子数据? [y/N] " seed_confirm
if [[ "$seed_confirm" =~ ^[Yy]$ ]]; then
  npm run db:seed && log_success "种子数据已填充"
fi

# ---------- 完成 ----------
echo ""
echo "================================================"
log_success "🎉 首次部署完成！"
echo "================================================"
echo ""
echo "下一步：配置 Cloudflare Tunnel"
echo ""
echo "  1. cloudflared tunnel login"
echo "  2. cloudflared tunnel create panghu"
echo "  3. cloudflared tunnel route dns panghu panghu.989048.xyz"
echo "  4. 编辑 ~/.cloudflared/config.yml（参考 README）"
echo "  5. bash $PROJECT_DIR/scripts/mac-mini/panghu-up.sh"
echo ""
echo "  软链接到 ~/scripts 方便调用："
echo "    mkdir -p ~/scripts"
echo "    ln -sf $PROJECT_DIR/scripts/mac-mini/panghu-up.sh ~/scripts/panghu-up.sh"
echo "    ln -sf $PROJECT_DIR/scripts/mac-mini/panghu-down.sh ~/scripts/panghu-down.sh"
echo "    ln -sf $PROJECT_DIR/scripts/mac-mini/panghu-status.sh ~/scripts/panghu-status.sh"
echo ""
