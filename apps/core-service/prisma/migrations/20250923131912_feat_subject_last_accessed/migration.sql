-- Add lastAccessedAt column to track recency of subject usage
-- This migration is additive and nullable-safe
ALTER TABLE "Subject" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);
