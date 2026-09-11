#!/bin/sh
# PangHu 容器入口:校验环境变量 → 等库就绪 → 建表 → (可选)种子数据 → 启动服务
set -e

: "${DATABASE_URL:?缺少 DATABASE_URL(Compose 部署无需手动设置)}"
: "${ZHIPUAI_API_KEY:?请在环境变量或 .env 中设置 ZHIPUAI_API_KEY(https://open.bigmodel.cn 免费申请)}"

# JWT_SECRET 缺失时随机生成(重启后已有登录态失效,建议显式设置固定值)
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  export JWT_SECRET
  echo "[entrypoint] 未设置 JWT_SECRET,已随机生成(重启后登录态失效;生产建议固定)"
fi

echo "[entrypoint] 同步数据库 schema..."
tries=0
until npx prisma db push --skip-generate; do
  tries=$((tries + 1))
  if [ "$tries" -ge 15 ]; then
    echo "[entrypoint] 数据库连接失败,退出" >&2
    exit 1
  fi
  echo "[entrypoint] 数据库未就绪,5 秒后重试($tries/15)..."
  sleep 5
done

if [ "$SEED_ON_START" = "1" ]; then
  echo "[entrypoint] 写入种子数据(演示猫/知识库)..."
  node api/_seed.js || echo "[entrypoint] 种子数据写入失败(可能已存在),继续启动"
fi

echo "[entrypoint] 启动 PangHu: http://localhost:${PORT:-3000}"
exec node api/_server.js
