-- Epoch II: Upgrade embedding dimension to 1536 and refresh ANN index

-- Ensure extension is present (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing ivfflat index if present (dimension change requires rebuild)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relkind = 'i'
    AND    c.relname = 'Embedding_embedding_ivfflat_cosine'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS "Embedding_embedding_ivfflat_cosine"';
  END IF;
END $$;

-- Alter column to vector(1536)
ALTER TABLE "public"."Embedding"
  ALTER COLUMN "embedding" TYPE vector(1536);

-- Recreate ivfflat index with cosine ops and pragmatic lists
CREATE INDEX IF NOT EXISTS "Embedding_embedding_ivfflat_cosine"
ON "public"."Embedding"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);
