-- CreateEnum
CREATE TYPE "public"."InsightSessionStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "public"."InsightSession" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "documentIds" JSONB NOT NULL,
    "status" "public"."InsightSessionStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsightSession_subjectId_idx" ON "public"."InsightSession"("subjectId");

-- AddForeignKey
ALTER TABLE "public"."InsightSession" ADD CONSTRAINT "InsightSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
