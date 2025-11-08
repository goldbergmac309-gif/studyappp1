-- CreateEnum
CREATE TYPE "public"."ExamStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- DropIndex
DROP INDEX "public"."Embedding_embedding_ivfflat_cosine";

-- CreateTable
CREATE TABLE "public"."NoteLink" (
    "fromNoteId" TEXT NOT NULL,
    "toNoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteLink_pkey" PRIMARY KEY ("fromNoteId","toNoteId")
);

-- CreateTable
CREATE TABLE "public"."ExamPaper" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "public"."ExamStatus" NOT NULL DEFAULT 'PENDING',
    "params" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteLink_toNoteId_idx" ON "public"."NoteLink"("toNoteId");

-- CreateIndex
CREATE INDEX "NoteLink_fromNoteId_idx" ON "public"."NoteLink"("fromNoteId");

-- CreateIndex
CREATE INDEX "ExamPaper_subjectId_idx" ON "public"."ExamPaper"("subjectId");

-- CreateIndex
CREATE INDEX "Note_title_idx" ON "public"."Note"("title");

-- AddForeignKey
ALTER TABLE "public"."NoteLink" ADD CONSTRAINT "NoteLink_fromNoteId_fkey" FOREIGN KEY ("fromNoteId") REFERENCES "public"."Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoteLink" ADD CONSTRAINT "NoteLink_toNoteId_fkey" FOREIGN KEY ("toNoteId") REFERENCES "public"."Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamPaper" ADD CONSTRAINT "ExamPaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
