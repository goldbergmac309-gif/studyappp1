-- Add nullable refreshTokenHash for deterministic lookup of refresh tokens (sha256+pepper)
ALTER TABLE "User"
  ADD COLUMN "refreshTokenHash" TEXT;
