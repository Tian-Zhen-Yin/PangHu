#!/bin/bash
# ============================================================
# PangHu 数据库 + 文件备份脚本
# 备份目标：~/Backups/panghu/  (可选同步到 iCloud / 移动硬盘)
# 自动清理 30 天前的备份
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

# ---------- 配置 ----------
PROJECT_DIR="${PANGHU_PROJECT_DIR:-$HOME/Projects/PangHu}"
BACKUP_ROOT="${PANGHU_BACKUP_ROOT:-$HOME/Backups/panghu}"
RETENTION_DAYS="${PANGHU_BACKUP_RETENTION_DAYS:-30}"
DB_NAME="${PANGHU_DB_NAME:-panghu}"

# iCloud 同步目录（可选，留空则不同步）
ICLOUD_DIR="${PANGHU_ICLOUD_BACKUP_DIR:-}"
# 例如：ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Backups/panghu"

# 模式：full | quick
MODE="full"
if [ "${1:-}" = "--quick" ]; then
  MODE="quick"
fi

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$DATE"

if [ "$MODE" = "full" ]; then
  echo ""
  echo "================================================"
  echo "      💾 PangHu 备份脚本"
  echo "================================================"
  echo ""
fi

mkdir -p "$BACKUP_DIR"

# ---------- 1. 备份数据库 ----------
log_info "备份 PostgreSQL 数据库 [$DB_NAME] ..."
DB_BACKUP="$BACKUP_DIR/panghu_db.sql.gz"

if ! pg_dump -h localhost -d "$DB_NAME" 2>/dev/null | gzip > "$DB_BACKUP"; then
  log_error "数据库备份失败"
  rm -f "$DB_BACKUP"
  rmdir "$BACKUP_DIR" 2>/dev/null || true
  exit 1
fi

DB_SIZE=$(du -h "$DB_BACKUP" | cut -f1)
log_success "数据库已备份 ($DB_SIZE) → $DB_BACKUP"

# ---------- 2. 备份上传文件 ----------
if [ "$MODE" = "full" ]; then
  UPLOAD_DIR="$PROJECT_DIR/backend/uploads"
  if [ -d "$UPLOAD_DIR" ] && [ "$(ls -A "$UPLOAD_DIR" 2>/dev/null)" ]; then
    log_info "备份上传文件 ..."
    UPLOAD_BACKUP="$BACKUP_DIR/uploads.tar.gz"
    tar -czf "$UPLOAD_BACKUP" -C "$PROJECT_DIR/backend" uploads
    UPLOAD_SIZE=$(du -h "$UPLOAD_BACKUP" | cut -f1)
    log_success "上传文件已备份 ($UPLOAD_SIZE) → $UPLOAD_BACKUP"
  else
    log_info "上传目录为空，跳过"
  fi

  # ---------- 3. 备份 .env（脱敏后） ----------
  ENV_FILE="$PROJECT_DIR/backend/.env"
  if [ -f "$ENV_FILE" ]; then
    log_info "备份 .env 配置（脱敏） ..."
    # 把敏感值替换为 ***
    sed -E 's/(JWT_SECRET|JWT_REFRESH_SECRET|ZHIPUAI_API_KEY|DATABASE_URL)=.*/\1=***/' "$ENV_FILE" \
      > "$BACKUP_DIR/env.redacted.txt"
    log_success ".env 已备份（已脱敏）"
  fi

  # ---------- 4. 备份元数据 ----------
  cat > "$BACKUP_DIR/metadata.json" <<EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "user": "$(whoami)",
  "mode": "$MODE",
  "project_dir": "$PROJECT_DIR",
  "db_name": "$DB_NAME",
  "git_commit": "$(cd "$PROJECT_DIR" && git rev-parse HEAD 2>/dev/null || echo unknown)",
  "git_branch": "$(cd "$PROJECT_DIR" && git branch --show-current 2>/dev/null || echo unknown)"
}
EOF
fi

# ---------- 5. 计算总大小 ----------
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# ---------- 6. 同步到 iCloud（可选） ----------
if [ -n "$ICLOUD_DIR" ] && [ "$MODE" = "full" ]; then
  log_info "同步到 iCloud ..."
  mkdir -p "$ICLOUD_DIR"
  rsync -av --quiet "$BACKUP_DIR/" "$ICLOUD_DIR/$DATE/"
  log_success "已同步到 iCloud"
fi

# ---------- 7. 清理旧备份 ----------
if [ "$MODE" = "full" ]; then
  log_info "清理 $RETENTION_DAYS 天前的备份 ..."
  CLEANED=0
  find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -mtime +"$RETENTION_DAYS" 2>/dev/null | while read -r old; do
    rm -rf "$old"
    CLEANED=$((CLEANED + 1))
  done
  log_success "清理完成"
fi

# ---------- 完成 ----------
if [ "$MODE" = "full" ]; then
  echo ""
  echo "================================================"
  log_success "🎉 备份完成"
  echo "================================================"
  echo ""
  echo "📦 备份目录: $BACKUP_DIR"
  echo "📏 总大小:   $TOTAL_SIZE"
  echo "🗓  保留天数: $RETENTION_DAYS 天"
  echo ""
  echo "↩  恢复命令:"
  echo "   gunzip -c $DB_BACKUP | psql -h localhost -d $DB_NAME"
  echo ""
else
  log_success "已快速备份 ($TOTAL_SIZE)"
fi
