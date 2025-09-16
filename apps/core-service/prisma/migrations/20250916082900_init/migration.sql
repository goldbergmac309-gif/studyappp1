-- Prisma initial migration for Postgres + pgvector
-- Requires: CREATE EXTENSION vector

CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
DO $$ BEGIN
  CREATE TYPE "Status" AS ENUM ('UPLOADED','QUEUED','PROCESSING','COMPLETED','FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WidgetType" AS ENUM (
    'NOTES','MIND_MAP','FLASHCARDS','STICKY_NOTE','TASKS','COUNTDOWN','POMODORO','CALENDAR_MONTH','MUSIC_PLAYER','LINK_TILE','PROGRESS'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Blueprint" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "layout" JSONB NOT NULL,
  CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Blueprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Blueprint_userId_name_key" ON "Blueprint"("userId","name");

CREATE TABLE IF NOT EXISTS "Subject" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "courseCode" TEXT,
  "professorName" TEXT,
  "ambition" TEXT,
  "color" TEXT,
  "starred" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "blueprintId" TEXT,
  "boardConfig" JSONB,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subject_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Subject_userId_idx" ON "Subject"("userId");

CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "s3Key" TEXT NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'UPLOADED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "subjectId" TEXT NOT NULL,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Document_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Document_subjectId_idx" ON "Document"("subjectId");

CREATE TABLE IF NOT EXISTS "AnalysisResult" (
  "id" TEXT NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "resultPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "documentId" TEXT NOT NULL,
  CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnalysisResult_documentId_key" UNIQUE ("documentId"),
  CONSTRAINT "AnalysisResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DocumentChunk" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "tokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentChunk_documentId_index_key" ON "DocumentChunk"("documentId","index");
CREATE INDEX IF NOT EXISTS "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

CREATE TABLE IF NOT EXISTS "Embedding" (
  "chunkId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "dim" INTEGER NOT NULL,
  "embedding" vector(384) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Embedding_pkey" PRIMARY KEY ("chunkId"),
  CONSTRAINT "Embedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "DocumentChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Persona" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "widgets" JSONB NOT NULL,
  CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Persona_name_key" ON "Persona"("name");

CREATE TABLE IF NOT EXISTS "WidgetInstance" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "type" "WidgetType" NOT NULL,
  "position" JSONB NOT NULL,
  "size" JSONB NOT NULL,
  "content" JSONB NOT NULL,
  "style" JSONB,
  CONSTRAINT "WidgetInstance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WidgetInstance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WidgetInstance_subjectId_idx" ON "WidgetInstance"("subjectId");
