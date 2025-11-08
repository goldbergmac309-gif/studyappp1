-- Align DB with current Prisma schema: remove legacy Note.userId column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Note'
      AND column_name = 'userId'
  ) THEN
    ALTER TABLE "Note" DROP COLUMN "userId";
  END IF;
END $$;
