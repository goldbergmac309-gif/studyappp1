-- CreateEnum
CREATE TYPE "public"."WidgetType" AS ENUM ('NOTES', 'MIND_MAP', 'FLASHCARDS');

-- AlterTable
ALTER TABLE "public"."Subject" ADD COLUMN     "blueprintId" TEXT;

-- CreateTable
CREATE TABLE "public"."Persona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blueprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WidgetInstance" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "type" "public"."WidgetType" NOT NULL,
    "position" JSONB NOT NULL,
    "size" JSONB NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "WidgetInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_name_key" ON "public"."Persona"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_userId_name_key" ON "public"."Blueprint"("userId", "name");

-- CreateIndex
CREATE INDEX "WidgetInstance_subjectId_idx" ON "public"."WidgetInstance"("subjectId");

-- AddForeignKey
ALTER TABLE "public"."Subject" ADD CONSTRAINT "Subject_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "public"."Blueprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Blueprint" ADD CONSTRAINT "Blueprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WidgetInstance" ADD CONSTRAINT "WidgetInstance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
