#!/bin/bash
# ============================================================
# PangHu 一键更新脚本
# 拉代码 → 装依赖 → 迁移数据库 → 重启服务
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
BACKUP_BEFORE_UPDATE="${PANGHU_BACKUP_BEFORE_UPDATE:-1}"

echo ""
echo "================================================"
echo "      🔄 PangHu 更新脚本"
echo "================================================"
echo ""

cd "$PROJECT_DIR"

# ---------- 1. 检查 Git 状态 ----------
log_info "Step 1/6 检查 Git 工作区 ..."
if [ -n "$(git status --porcelain)" ]; then
  log_warn "工作区有未提交的修改："
  git status --short
  read -p "是否暂存到 stash 后继续? [y/N] " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    git stash push -m "auto-stash before update $(date +%Y%m%d_%H%M%S)"
    log_success "已暂存"
  else
    log_error "请先处理本地修改"
    exit 1
  fi
fi

# ---------- 2. 备份数据库 ----------
if [ "$BACKUP_BEFORE_UPDATE" = "1" ]; then
  log_info "Step 2/6 更新前自动备份 ..."
  if [ -x "$PROJECT_DIR/scripts/mac-mini/panghu-backup.sh" ]; then
    bash "$PROJECT_DIR/scripts/mac-mini/panghu-backup.sh" --quick
  else
    log_warn "备份脚本不存在，跳过"
  fi
else
  log_warn "Step 2/6 跳过备份（PANGHU_BACKUP_BEFORE_UPDATE=0）"
fi

# ---------- 3. 拉取代码 ----------
log_info "Step 3/6 拉取最新代码 ..."
BRANCH=$(git branch --show-current)
log_info "当前分支: $BRANCH"

OLD_COMMIT=$(git rev-parse HEAD)
git fetch origin "$BRANCH"
NEW_COMMIT=$(git rev-parse "origin/$BRANCH")

if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
  log_success "已是最新版本，无需更新"
  read -p "是否仍要重启服务? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    exit 0
  fi
else
  log_info "新提交："
  git log --oneline "$OLD_COMMIT..$NEW_COMMIT" | head -10
  git pull origin "$BRANCH"
  log_success "代码已更新"
fi

# ---------- 4. 安装依赖 ----------
log_info "Step 4/6 检查依赖变更 ..."

# 检查 backend
if git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" 2>/dev/null | grep -q "backend/package.json\|backend/package-lock.json"; then
  log_info "后端依赖有变化，重新安装 ..."
  cd "$PROJECT_DIR/backend"
  npm install
  log_success "后端依赖已更新"
else
  log_info "后端依赖无变化"
fi

# 检查 frontend
if git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" 2>/dev/null | grep -q "frontend/package.json\|frontend/package-lock.json"; then
  log_info "前端依赖有变化，重新安装 ..."
  cd "$PROJECT_DIR/frontend"
  npm install
  log_success "前端依赖已更新"
else
  log_info "前端依赖无变化"
fi

# ---------- 5. 数据库迁移 ----------
log_info "Step 5/6 检查数据库迁移 ..."
cd "$PROJECT_DIR/backend"

if git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" 2>/dev/null | grep -q "backend/prisma/"; then
  log_info "Prisma schema 或 migrations 有变化 ..."
  npm run db:generate
  npm run db:migrate
  log_success "数据库已迁移"
else
  log_info "Prisma 文件无变化"
fi

# ---------- 6. 重启服务 ----------
log_info "Step 6/6 重启服务 ..."
cd "$PROJECT_DIR"

if pm2 list 2>/dev/null | grep -q "panghu-backend"; then
  pm2 reload panghu-backend --update-env
  log_success "后端已平滑重启"
else
  pm2 start ecosystem.config.cjs
  pm2 save
  log_success "后端已启动"
fi

# 等待健康检查
log_info "等待后端就绪 ..."
for i in {1..15}; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    log_success "健康检查通过"
    break
  fi
  if [ "$i" = 15 ]; then
    log_error "健康检查超时，请检查日志: pm2 logs panghu-backend"
    exit 1
  fi
  sleep 1
done

# ---------- 完成 ----------
echo ""
echo "================================================"
log_success "🎉 更新完成"
echo "================================================"
echo ""
echo "📊 服务状态:  ~/scripts/panghu-status.sh"
echo "📋 查看日志:  pm2 logs panghu-backend"
echo "↩  回滚命令:  git reset --hard $OLD_COMMIT && bash $0"
echo ""
