-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AssessmentMode" ADD VALUE 'THEORY';
ALTER TYPE "public"."AssessmentMode" ADD VALUE 'APPLICATION';
ALTER TYPE "public"."AssessmentMode" ADD VALUE 'CALCULATION';
ALTER TYPE "public"."AssessmentMode" ADD VALUE 'DEFINITION';
ALTER TYPE "public"."AssessmentMode" ADD VALUE 'COMPARISON';
ALTER TYPE "public"."AssessmentMode" ADD VALUE 'GENERAL';

-- AlterTable
ALTER TABLE "public"."ConceptLink" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."DocumentStructure" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."ExamTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "hasNonText" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marksConfidence" DOUBLE PRECISION,
ADD COLUMN     "solutionProfile" JSONB;

-- AlterTable
ALTER TABLE "public"."QuestionFamily" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."SubjectConcept" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."SubjectInsightVersion" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."TeacherProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;
