-- 过敏记录表迁移（补正式 migration，对齐 schema model AllergyRecord）
-- 历史：原由 backend/prisma/sql/add_allergy_record.sql 手工建表（A3 技术债）。
-- 本文件通过 `prisma migrate diff --from-schema-datamodel <无 allergy 的 schema>
--   --to-schema-datamodel <含 allergy 的 schema> --script` 生成，未触达 DB。
--   线上库表已存在，本 migration 仅作账本对齐（记录式）。

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('mild', 'moderate', 'severe');

-- CreateEnum
CREATE TYPE "AllergyRecordSource" AS ENUM ('agent', 'manual', 'imported');

-- CreateTable
CREATE TABLE "AllergyRecord" (
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

-- CreateIndex
CREATE INDEX "AllergyRecord_catId_occurrenceDate_idx" ON "AllergyRecord"("catId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "AllergyRecord_catId_allergen_idx" ON "AllergyRecord"("catId", "allergen");

-- AddForeignKey
ALTER TABLE "AllergyRecord" ADD CONSTRAINT "AllergyRecord_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
