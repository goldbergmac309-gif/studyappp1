-- CreateEnum
CREATE TYPE "public"."ResourceType" AS ENUM ('EXAM', 'SYLLABUS', 'LECTURE_NOTES', 'TEXTBOOK', 'PRACTICE_SET', 'NOTES', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "meta" JSONB,
ADD COLUMN     "resourceType" "public"."ResourceType" NOT NULL DEFAULT 'OTHER';
