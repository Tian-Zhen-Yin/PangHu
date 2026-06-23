#!/bin/bash
# ============================================================
# 安装定时任务（launchd）
#   - 每天凌晨 3:00 自动备份
#   - 每 5 分钟健康检查
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }

USER_NAME=$(whoami)
HOME_DIR="$HOME"
PROJECT_DIR="${PANGHU_PROJECT_DIR:-$HOME/Projects/PangHu}"
SCRIPTS_DIR="$PROJECT_DIR/scripts/mac-mini"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"

mkdir -p "$LAUNCHD_DIR"

echo ""
echo "================================================"
echo "   🕐 PangHu 定时任务安装向导"
echo "================================================"
echo ""

# ---------- 备份任务（每天 03:00） ----------
log_info "创建每日备份任务（凌晨 3:00）..."

BACKUP_PLIST="$LAUNCHD_DIR/com.panghu.backup.plist"
cat > "$BACKUP_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.panghu.backup</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPTS_DIR/panghu-backup.sh</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>3</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME_DIR</string>
        <key>PANGHU_PROJECT_DIR</key>
        <string>$PROJECT_DIR</string>
    </dict>

    <key>StandardOutPath</key>
    <string>$HOME_DIR/Library/Logs/panghu-backup.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME_DIR/Library/Logs/panghu-backup.error.log</string>
</dict>
</plist>
EOF

launchctl unload "$BACKUP_PLIST" 2>/dev/null || true
launchctl load "$BACKUP_PLIST"
log_success "备份任务已注册（每天 03:00）"

# ---------- 健康检查任务（每 5 分钟） ----------
log_info "创建健康检查任务（每 5 分钟）..."

HEALTH_PLIST="$LAUNCHD_DIR/com.panghu.healthcheck.plist"
cat > "$HEALTH_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.panghu.healthcheck</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPTS_DIR/panghu-healthcheck.sh</string>
    </array>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME_DIR</string>
        <key>PANGHU_PROJECT_DIR</key>
        <string>$PROJECT_DIR</string>
    </dict>

    <key>StandardOutPath</key>
    <string>$HOME_DIR/Library/Logs/panghu-healthcheck.out.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME_DIR/Library/Logs/panghu-healthcheck.error.log</string>
</dict>
</plist>
EOF

launchctl unload "$HEALTH_PLIST" 2>/dev/null || true
launchctl load "$HEALTH_PLIST"
log_success "健康检查任务已注册（每 5 分钟）"

echo ""
echo "================================================"
log_success "🎉 定时任务安装完成"
echo "================================================"
echo ""
echo "查看状态："
echo "  launchctl list | grep panghu"
echo ""
echo "查看备份日志："
echo "  tail -f ~/Library/Logs/panghu-backup.log"
echo ""
echo "查看健康检查日志："
echo "  tail -f ~/Library/Logs/panghu-healthcheck.log"
echo ""
echo "卸载（如果想停用）："
echo "  launchctl unload ~/Library/LaunchAgents/com.panghu.backup.plist"
echo "  launchctl unload ~/Library/LaunchAgents/com.panghu.healthcheck.plist"
echo ""
echo "手动触发一次备份测试："
echo "  bash $SCRIPTS_DIR/panghu-backup.sh"
echo ""
echo "手动触发一次健康检查："
echo "  bash $SCRIPTS_DIR/panghu-healthcheck.sh -v"
echo ""
