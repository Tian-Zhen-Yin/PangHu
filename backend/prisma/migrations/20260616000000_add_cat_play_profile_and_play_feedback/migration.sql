-- 陪玩档案 + 反馈表迁移
-- 对齐 PRD §3.1 / 技术设计 §3.1
-- 通过 `prisma migrate diff --from-schema-datamodel <git_HEAD_schema>
--   --to-schema-datamodel <current_schema> --script` 生成，未触达 DB。

-- CreateEnum
CREATE TYPE "PlayFeedbackSource" AS ENUM ('agent', 'user');

-- AlterTable
ALTER TABLE "Cat" ADD COLUMN     "energyBaseline" INTEGER,
ADD COLUMN     "healthTags" TEXT,
ADD COLUMN     "personality" TEXT;

-- CreateTable
CREATE TABLE "PlayFeedback" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "completion" BOOLEAN NOT NULL,
    "actualDuration" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "source" "PlayFeedbackSource" NOT NULL DEFAULT 'agent',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayFeedback_catId_playedAt_idx" ON "PlayFeedback"("catId", "playedAt");

-- CreateIndex
CREATE INDEX "PlayFeedback_userId_playedAt_idx" ON "PlayFeedback"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "PlayFeedback_catId_gameId_idx" ON "PlayFeedback"("catId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayFeedback_catId_gameId_playedAt_key" ON "PlayFeedback"("catId", "gameId", "playedAt");

-- AddForeignKey
ALTER TABLE "PlayFeedback" ADD CONSTRAINT "PlayFeedback_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
