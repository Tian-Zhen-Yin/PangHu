-- 健康周报待办完成状态表迁移（补正式 migration，对齐 schema model TodoToggle）
-- 历史：原由 backend/prisma/sql/todo_toggles.sql + todo.service.ts 运行时 ensureTable()
--   建表（A3 技术债）。本文件通过 `prisma migrate diff --from-schema-datamodel
--   <无 todo 的 schema> --to-schema-datamodel <含 todo 的 schema> --script` 生成，未触达 DB。
--   线上库表已存在（snake_case 列名 + 历史索引名），本 migration 仅作账本对齐（记录式）。

-- CreateTable
CREATE TABLE "todo_toggles" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "todo_id" VARCHAR(128) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "toggled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "todo_toggles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "todo_toggles_user_id_idx" ON "todo_toggles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "todo_toggles_user_id_todo_id_key" ON "todo_toggles"("user_id", "todo_id");
