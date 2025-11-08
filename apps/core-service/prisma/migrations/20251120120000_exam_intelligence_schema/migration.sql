-- CreateEnum
CREATE TYPE "public"."AssessmentMode" AS ENUM ('UNKNOWN', 'OBJECTIVE', 'SUBJECTIVE', 'PRACTICAL', 'ORAL', 'ESSAY');

-- CreateEnum
CREATE TYPE "public"."ConceptRelationType" AS ENUM ('PREREQUISITE', 'SUPPORTS', 'CONFLICTS', 'DERIVED', 'PEER');

-- CreateEnum
CREATE TYPE "public"."InsightVersionStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."DocumentStructure" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT 'v1',
    "pageCount" INTEGER,
    "ocrConfidence" DOUBLE PRECISION,
    "layout" JSONB,
    "outline" JSONB,
    "stats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "structureId" TEXT,
    "subjectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT,
    "marks" DOUBLE PRECISION,
    "difficulty" DOUBLE PRECISION,
    "assessmentMode" "public"."AssessmentMode" NOT NULL DEFAULT 'UNKNOWN',
    "taxonomyPath" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubjectConcept" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "taxonomyPath" TEXT,
    "masteryScore" DOUBLE PRECISION,
    "difficulty" DOUBLE PRECISION,
    "coverage" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionConceptScore" (
    "questionId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "rationale" TEXT,

    CONSTRAINT "QuestionConceptScore_pkey" PRIMARY KEY ("questionId","conceptId")
);

-- CreateTable
CREATE TABLE "public"."ConceptLink" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "fromConceptId" TEXT NOT NULL,
    "toConceptId" TEXT NOT NULL,
    "relation" "public"."ConceptRelationType" NOT NULL,
    "weight" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionFamily" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "archetype" TEXT,
    "difficulty" DOUBLE PRECISION,
    "frequency" INTEGER,
    "synopsis" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionFamilyMembership" (
    "questionId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFamilyMembership_pkey" PRIMARY KEY ("questionId","familyId")
);

-- CreateTable
CREATE TABLE "public"."ExamTemplate" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "season" TEXT,
    "blueprint" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ExamTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubjectInsightVersion" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sessionId" TEXT,
    "status" "public"."InsightVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB,
    "forecast" JSONB,
    "diffs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "SubjectInsightVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubjectHistory" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "actuals" JSONB,
    "comparedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organization" TEXT,
    "specialties" JSONB,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentStructure_documentId_key" ON "public"."DocumentStructure"("documentId");

-- CreateIndex
CREATE INDEX "Question_subjectId_idx" ON "public"."Question"("subjectId");

-- CreateIndex
CREATE INDEX "Question_assessmentMode_idx" ON "public"."Question"("assessmentMode");

-- CreateIndex
CREATE UNIQUE INDEX "Question_documentId_index_key" ON "public"."Question"("documentId", "index");

-- CreateIndex
CREATE INDEX "SubjectConcept_subjectId_idx" ON "public"."SubjectConcept"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectConcept_subjectId_slug_key" ON "public"."SubjectConcept"("subjectId", "slug");

-- CreateIndex
CREATE INDEX "ConceptLink_subjectId_idx" ON "public"."ConceptLink"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptLink_fromConceptId_toConceptId_relation_key" ON "public"."ConceptLink"("fromConceptId", "toConceptId", "relation");

-- CreateIndex
CREATE INDEX "QuestionFamily_subjectId_idx" ON "public"."QuestionFamily"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFamily_subjectId_label_key" ON "public"."QuestionFamily"("subjectId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTemplate_subjectId_version_key" ON "public"."ExamTemplate"("subjectId", "version");

-- CreateIndex
CREATE INDEX "SubjectInsightVersion_sessionId_idx" ON "public"."SubjectInsightVersion"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectInsightVersion_subjectId_version_key" ON "public"."SubjectInsightVersion"("subjectId", "version");

-- CreateIndex
CREATE INDEX "SubjectHistory_subjectId_eventDate_idx" ON "public"."SubjectHistory"("subjectId", "eventDate");

-- CreateIndex
CREATE INDEX "SubjectHistory_comparedVersionId_idx" ON "public"."SubjectHistory"("comparedVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "public"."TeacherProfile"("userId");

-- AddForeignKey
ALTER TABLE "public"."DocumentStructure" ADD CONSTRAINT "DocumentStructure_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "public"."DocumentStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubjectConcept" ADD CONSTRAINT "SubjectConcept_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionConceptScore" ADD CONSTRAINT "QuestionConceptScore_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionConceptScore" ADD CONSTRAINT "QuestionConceptScore_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "public"."SubjectConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConceptLink" ADD CONSTRAINT "ConceptLink_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConceptLink" ADD CONSTRAINT "ConceptLink_fromConceptId_fkey" FOREIGN KEY ("fromConceptId") REFERENCES "public"."SubjectConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConceptLink" ADD CONSTRAINT "ConceptLink_toConceptId_fkey" FOREIGN KEY ("toConceptId") REFERENCES "public"."SubjectConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionFamily" ADD CONSTRAINT "QuestionFamily_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionFamilyMembership" ADD CONSTRAINT "QuestionFamilyMembership_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionFamilyMembership" ADD CONSTRAINT "QuestionFamilyMembership_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "public"."QuestionFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamTemplate" ADD CONSTRAINT "ExamTemplate_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubjectInsightVersion" ADD CONSTRAINT "SubjectInsightVersion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubjectHistory" ADD CONSTRAINT "SubjectHistory_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubjectHistory" ADD CONSTRAINT "SubjectHistory_comparedVersionId_fkey" FOREIGN KEY ("comparedVersionId") REFERENCES "public"."SubjectInsightVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
