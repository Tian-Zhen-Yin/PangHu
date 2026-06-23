# PangHu Mac Mini 部署套件

针对 Mac Mini 家庭服务器的完整运维脚本套件。配合 Cloudflare Tunnel 实现公网访问 `https://panghu.989048.xyz`。

## 文件清单

| 脚本 | 用途 | 触发方式 |
|---|---|---|
| `setup.sh` | 首次部署向导（装依赖、建数据库、迁移） | 手动，一次性 |
| `panghu-up.sh` | 启动数据库 + 后端 + Tunnel | 手动 |
| `panghu-down.sh` | 停止后端 + Tunnel（数据库默认保留） | 手动 |
| `panghu-status.sh` | 一键查看所有服务状态 | 手动 |
| `panghu-update.sh` | git pull + 装依赖 + 迁移 + 重启 | 手动 |
| `panghu-backup.sh` | 备份数据库 + 上传文件 | 手动 / 定时 |
| `panghu-healthcheck.sh` | 健康检查 + 自动重启 + 通知 | 定时 |
| `install-cron.sh` | 注册定时任务到 launchd | 手动，一次性 |
| `../../ecosystem.config.cjs` | PM2 配置文件（项目根目录） | — |

## 首次部署（按顺序执行）

```bash
# 1. 克隆代码到 Mac Mini
git clone <你的仓库> ~/Projects/PangHu
cd ~/Projects/PangHu

# 2. 给脚本执行权限
chmod +x scripts/mac-mini/*.sh

# 3. 跑一次性部署向导
bash scripts/mac-mini/setup.sh

# 4. 编辑 .env
nano backend/.env

# 5. 配置 Cloudflare Tunnel（一次性）
cloudflared tunnel login
cloudflared tunnel create panghu
cloudflared tunnel route dns panghu panghu.989048.xyz

mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: panghu
credentials-file: $(ls ~/.cloudflared/*.json | head -1)
ingress:
  - hostname: panghu.989048.xyz
    service: http://localhost:3000
  - service: http_status:404
EOF

# 6. 软链接到 ~/scripts（可选，方便调用）
mkdir -p ~/scripts
for f in panghu-up panghu-down panghu-status panghu-update panghu-backup; do
  ln -sf ~/Projects/PangHu/scripts/mac-mini/$f.sh ~/scripts/$f.sh
done

# 7. 安装定时任务（每天备份 + 每 5 分钟健康检查）
bash scripts/mac-mini/install-cron.sh

# 8. 启动服务
~/scripts/panghu-up.sh
```

## 日常使用

```bash
# 启动
~/scripts/panghu-up.sh

# 查看状态
~/scripts/panghu-status.sh

# 停止
~/scripts/panghu-down.sh

# 完全停止（含数据库）
~/scripts/panghu-down.sh --with-db

# 更新（拉代码、重启）
~/scripts/panghu-update.sh

# 手动备份
~/scripts/panghu-backup.sh

# 手动健康检查（带详细输出）
bash ~/Projects/PangHu/scripts/mac-mini/panghu-healthcheck.sh -v

# 查看日志
pm2 logs panghu-backend
pm2 logs panghu-tunnel
```

## 自动化任务（由 install-cron.sh 安装）

| 任务 | 频率 | 日志 |
|---|---|---|
| 数据库备份 | 每天 03:00 | `~/Library/Logs/panghu-backup.log` |
| 健康检查 | 每 5 分钟 | `~/Library/Logs/panghu-healthcheck.log` |

### 健康检查会做什么？

- 检查本地后端（`localhost:3000/api/health`）
- 检查公网访问（`https://panghu.989048.xyz/api/health`）
- 检查 PostgreSQL 连接
- 检查磁盘剩余空间
- **连续失败 3 次**后：
  1. macOS 桌面通知（带声音）
  2. 自动重启对应服务（PM2 / launchctl / brew services）
  3. 重启后再发一条"已恢复"通知

### 备份会保存什么？

- 数据库完整 dump（`panghu_db.sql.gz`）
- 上传文件目录（`uploads.tar.gz`）
- `.env` 配置文件（**敏感字段已脱敏**）
- 元数据 JSON（备份时间、git commit、分支等）

默认保留 30 天，超期自动清理。

### 同步到 iCloud（可选）

编辑 `panghu-backup.sh` 或在 `.bashrc` / `.zshrc` 设置：

```bash
export PANGHU_ICLOUD_BACKUP_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Backups/panghu"
```

之后每次备份自动同步到 iCloud。

## 数据库恢复

```bash
# 从最近一次备份恢复
LATEST=$(ls -t ~/Backups/panghu/ | head -1)
gunzip -c ~/Backups/panghu/$LATEST/panghu_db.sql.gz | psql -h localhost -d panghu

# 或者先建库再恢复
dropdb panghu && createdb panghu
gunzip -c ~/Backups/panghu/$LATEST/panghu_db.sql.gz | psql -h localhost -d panghu
```

## 环境变量

所有脚本支持以下环境变量覆盖：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PANGHU_PROJECT_DIR` | `$HOME/Projects/PangHu` | 项目目录 |
| `PANGHU_TUNNEL_NAME` | `panghu` | Cloudflare Tunnel 名称 |
| `PANGHU_PUBLIC_URL` | `https://panghu.989048.xyz` | 公网地址 |
| `PANGHU_LOCAL_URL` | `http://localhost:3000` | 本地地址 |
| `PANGHU_PG_VERSION` | `postgresql@17` | PostgreSQL 版本 |
| `PANGHU_DB_NAME` | `panghu` | 数据库名 |
| `PANGHU_BACKUP_ROOT` | `$HOME/Backups/panghu` | 备份目录 |
| `PANGHU_BACKUP_RETENTION_DAYS` | `30` | 备份保留天数 |
| `PANGHU_BACKUP_BEFORE_UPDATE` | `1` | 更新前是否自动备份 |
| `PANGHU_ICLOUD_BACKUP_DIR` | 空 | iCloud 同步目录（留空则不同步） |
| `PANGHU_AUTO_RESTART` | `1` | 健康检查失败时是否自动重启 |
| `PANGHU_NOTIFY` | `1` | 是否发送 macOS 通知 |
| `PANGHU_MAX_FAILURES` | `3` | 连续失败几次才告警 |

例：

```bash
# 临时禁用通知
PANGHU_NOTIFY=0 bash ~/scripts/panghu-healthcheck.sh

# 切换到不同项目目录
PANGHU_PROJECT_DIR=/Volumes/External/PangHu bash ~/scripts/panghu-up.sh
```

## 故障排查

| 现象 | 排查方向 |
|---|---|
| `cloudflared: command not found` | `brew install cloudflared` |
| `Cannot connect to database` | `brew services start postgresql@17` |
| `panghu-backend errored` | `pm2 logs panghu-backend --lines 50` |
| 公网无法访问 | `pm2 logs panghu-tunnel` + 检查 Cloudflare DNS |
| 端口被占用 | `lsof -i :3000` → `kill -9 <pid>` |
| launchctl 没触发 | `launchctl list \| grep panghu` 看状态 |
| 没收到桌面通知 | 系统设置 → 通知 → 终端 / Script Editor → 允许通知 |
| 自动重启没生效 | 健康检查需要 sudo 权限来 stop/start 系统服务，可考虑只用 PM2 托管 Tunnel |

## 卸载定时任务

```bash
launchctl unload ~/Library/LaunchAgents/com.panghu.backup.plist
launchctl unload ~/Library/LaunchAgents/com.panghu.healthcheck.plist
rm ~/Library/LaunchAgents/com.panghu.{backup,healthcheck}.plist
```

## 完全卸载

```bash
# 停止服务
~/scripts/panghu-down.sh --with-db

# 卸载 PM2 进程
pm2 delete all
pm2 save --force

# 卸载定时任务
launchctl unload ~/Library/LaunchAgents/com.panghu.*.plist
rm ~/Library/LaunchAgents/com.panghu.*.plist

# 卸载 Tunnel 系统服务
sudo cloudflared service uninstall

# 删除软链
rm ~/scripts/panghu-*.sh

# 备份保留（手动删）
# rm -rf ~/Backups/panghu
```
