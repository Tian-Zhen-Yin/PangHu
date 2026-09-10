#!/bin/bash
# ============================================================
# PangHu 健康检查脚本
# 周期性检查所有服务，失败时：
#   1. macOS 桌面通知
#   2. 自动尝试重启
#   3. 写入日志
# ============================================================

set -u

# ---------- 配置 ----------
PROJECT_DIR="${PANGHU_PROJECT_DIR:-$HOME/Projects/PangHu}"
PUBLIC_URL="${PANGHU_PUBLIC_URL:-https://panghu.989048.xyz}"
LOCAL_URL="${PANGHU_LOCAL_URL:-http://localhost:3000}"
HEALTH_PATH="${PANGHU_HEALTH_PATH:-/api/health}"

LOG_FILE="${PANGHU_HEALTHCHECK_LOG:-$HOME/Library/Logs/panghu-healthcheck.log}"
AUTO_RESTART="${PANGHU_AUTO_RESTART:-1}"
NOTIFY="${PANGHU_NOTIFY:-1}"
MAX_FAILURES="${PANGHU_MAX_FAILURES:-3}"

mkdir -p "$(dirname "$LOG_FILE")"

# 失败计数文件（连续失败 N 次才告警，避免误报）
STATE_DIR="${TMPDIR:-/tmp}/panghu-healthcheck"
mkdir -p "$STATE_DIR"

# ---------- 工具函数 ----------
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

notify() {
  local title=$1
  local message=$2
  local sound=${3:-Sosumi}

  if [ "$NOTIFY" = "1" ] && command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"$sound\"" 2>/dev/null || true
  fi
}

increment_failure() {
  local service=$1
  local file="$STATE_DIR/${service}.fails"
  local count=0
  [ -f "$file" ] && count=$(cat "$file")
  count=$((count + 1))
  echo "$count" > "$file"
  echo "$count"
}

reset_failure() {
  local service=$1
  rm -f "$STATE_DIR/${service}.fails"
}

# ---------- 检查项 ----------
check_local_backend() {
  if curl -sf -m 5 "$LOCAL_URL$HEALTH_PATH" >/dev/null 2>&1; then
    reset_failure "local"
    log "[OK] 本地后端正常"
    return 0
  else
    local count=$(increment_failure "local")
    log "[FAIL] 本地后端异常（连续 $count 次）"

    if [ "$count" -ge "$MAX_FAILURES" ]; then
      notify "⚠️ PangHu 后端异常" "本地服务连续 $count 次健康检查失败" "Basso"

      if [ "$AUTO_RESTART" = "1" ]; then
        log "[ACTION] 自动重启后端"
        pm2 restart panghu-backend >/dev/null 2>&1 || true
        notify "🔄 PangHu" "已自动重启后端服务" "Pop"
        sleep 5
      fi
    fi
    return 1
  fi
}

check_public_url() {
  if curl -sf -m 10 "$PUBLIC_URL$HEALTH_PATH" >/dev/null 2>&1; then
    reset_failure "public"
    log "[OK] 公网访问正常"
    return 0
  else
    local count=$(increment_failure "public")
    log "[FAIL] 公网访问异常（连续 $count 次）"

    if [ "$count" -ge "$MAX_FAILURES" ]; then
      notify "⚠️ PangHu Tunnel 异常" "公网访问连续 $count 次失败" "Basso"

      if [ "$AUTO_RESTART" = "1" ]; then
        log "[ACTION] 自动重启 Tunnel"
        # 优先重启 PM2 中的 Tunnel
        if pm2 list 2>/dev/null | grep -q "panghu-tunnel"; then
          pm2 restart panghu-tunnel >/dev/null 2>&1 || true
        # 否则重启系统服务
        elif sudo -n launchctl list 2>/dev/null | grep -q "com.cloudflare.cloudflared"; then
          sudo -n launchctl stop com.cloudflare.cloudflared 2>/dev/null || true
          sudo -n launchctl start com.cloudflare.cloudflared 2>/dev/null || true
        fi
        notify "🔄 PangHu" "已自动重启 Tunnel" "Pop"
      fi
    fi
    return 1
  fi
}

check_database() {
  if psql -h localhost -d panghu -c "SELECT 1" >/dev/null 2>&1; then
    reset_failure "db"
    log "[OK] 数据库正常"
    return 0
  else
    local count=$(increment_failure "db")
    log "[FAIL] 数据库异常（连续 $count 次）"

    if [ "$count" -ge "$MAX_FAILURES" ]; then
      notify "⚠️ PangHu 数据库异常" "PostgreSQL 连接失败" "Basso"

      if [ "$AUTO_RESTART" = "1" ]; then
        log "[ACTION] 自动重启 PostgreSQL"
        brew services restart postgresql@17 >/dev/null 2>&1 || true
        notify "🔄 PangHu" "已自动重启 PostgreSQL" "Pop"
        sleep 5
      fi
    fi
    return 1
  fi
}

check_disk_space() {
  local backup_dir="${PANGHU_BACKUP_ROOT:-$HOME/Backups/panghu}"
  local usage=$(df -h "$HOME" | awk 'NR==2 {print $5}' | tr -d '%')

  if [ -n "$usage" ] && [ "$usage" -gt 90 ]; then
    notify "⚠️ PangHu 磁盘告警" "磁盘使用率已达 ${usage}%" "Basso"
    log "[WARN] 磁盘使用率 ${usage}%"
    return 1
  fi
  return 0
}

# ---------- 主流程 ----------
log "----- 开始健康检查 -----"

OVERALL_OK=1

check_database      || OVERALL_OK=0
check_local_backend || OVERALL_OK=0
check_public_url    || OVERALL_OK=0
check_disk_space    || true

if [ "$OVERALL_OK" = "1" ]; then
  log "----- 全部正常 -----"
else
  log "----- 存在异常 -----"
fi

# 如果带 -v 参数，把日志同时打印到 stdout
if [ "${1:-}" = "-v" ] || [ "${1:-}" = "--verbose" ]; then
  tail -20 "$LOG_FILE"
fi
