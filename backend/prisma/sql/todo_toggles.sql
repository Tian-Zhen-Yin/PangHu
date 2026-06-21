-- ✅ 已补正式 migration：prisma/migrations/20260616000002_add_todo_toggles/
--    本文件 + todo.service.ts 的 ensureTable() 保留作"手工/运行时兜底"用。
--    schema 真相源为 prisma/schema.prisma 的 model TodoToggle（@@map("todo_toggles")）。
--
-- todo_toggles 表创建脚本
-- 用于持久化健康周报待办完成状态
--
-- 使用方式：
--   psql -U <user> -d <database> -f todo_toggles.sql
-- 或
--   prisma db execute --file backend/prisma/sql/todo_toggles.sql
--
-- P4 新增

CREATE TABLE IF NOT EXISTS "todo_toggles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" VARCHAR(64) NOT NULL,
  "todo_id" VARCHAR(128) NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT FALSE,
  "toggled_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "todo_id")
);

CREATE INDEX IF NOT EXISTS idx_todo_toggles_user ON "todo_toggles"("user_id");
