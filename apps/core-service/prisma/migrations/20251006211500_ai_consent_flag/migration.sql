-- Add hasConsentedToAi flag to users for AI consent gate
ALTER TABLE "User"
  ADD COLUMN "hasConsentedToAi" BOOLEAN NOT NULL DEFAULT false;
