-- AlterEnum
ALTER TYPE "public"."WidgetType" ADD VALUE 'STICKY_NOTE';

-- AlterTable
ALTER TABLE "public"."Subject" ADD COLUMN     "boardConfig" JSONB;

-- AlterTable
ALTER TABLE "public"."WidgetInstance" ADD COLUMN     "style" JSONB;
