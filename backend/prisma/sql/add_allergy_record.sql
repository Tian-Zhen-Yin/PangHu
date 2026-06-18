-- ⚠️ 技术债（A3 决策）：本文件是 raw SQL，未补正式 prisma migration。
--    详见 docs/02-开发/PangHu-AI协作工作流设计.md 附录 B.1。
--    下次涉及 allergy 数据模型变更时，必须把它补成 `prisma migrate dev --name add_allergy_record`。
--
-- P1: 创建 AllergyRecord 表及相关 enum
-- 独立执行，避免 prisma db push 因 pgvector 缺失而全量同步失败

-- 过敏严重程度枚举
DO $$ BEGIN
    CREATE TYPE "AllergySeverity" AS ENUM ('mild', 'moderate', 'severe');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 过敏记录来源枚举
DO $$ BEGIN
    CREATE TYPE "AllergyRecordSource" AS ENUM ('agent', 'manual', 'imported');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 过敏记录表
CREATE TABLE IF NOT EXISTS "AllergyRecord" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "severity" "AllergySeverity" NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "treatment" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "source" "AllergyRecordSource" NOT NULL DEFAULT 'agent',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllergyRecord_pkey" PRIMARY KEY ("id")
);

-- 索引
CREATE INDEX IF NOT EXISTS "AllergyRecord_catId_occurrenceDate_idx"
    ON "AllergyRecord"("catId", "occurrenceDate");
CREATE INDEX IF NOT EXISTS "AllergyRecord_catId_allergen_idx"
    ON "AllergyRecord"("catId", "allergen");

-- 外键（关联 Cat 表，级联删除）
DO $$ BEGIN
    ALTER TABLE "AllergyRecord"
        ADD CONSTRAINT "AllergyRecord_catId_fkey"
        FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
