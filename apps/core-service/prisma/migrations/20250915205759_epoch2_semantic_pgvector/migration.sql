-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "public"."DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Embedding" (
    "chunkId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dim" INTEGER NOT NULL,
    "embedding" vector(384) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("chunkId")
);

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "public"."DocumentChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_index_key" ON "public"."DocumentChunk"("documentId", "index");

-- AddForeignKey
ALTER TABLE "public"."DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Embedding" ADD CONSTRAINT "Embedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "public"."DocumentChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vector index for ANN (cosine)
CREATE INDEX IF NOT EXISTS "Embedding_embedding_ivfflat_cosine"
ON "public"."Embedding"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);
