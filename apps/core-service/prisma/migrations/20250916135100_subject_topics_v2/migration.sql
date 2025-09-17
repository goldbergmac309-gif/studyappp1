-- CreateTable
CREATE TABLE "SubjectTopics" (
    "subjectId" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "topics" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "SubjectTopics_pkey" PRIMARY KEY ("subjectId"),
    CONSTRAINT "SubjectTopics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
