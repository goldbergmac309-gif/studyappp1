-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."WidgetType" ADD VALUE 'TASKS';
ALTER TYPE "public"."WidgetType" ADD VALUE 'COUNTDOWN';
ALTER TYPE "public"."WidgetType" ADD VALUE 'POMODORO';
ALTER TYPE "public"."WidgetType" ADD VALUE 'CALENDAR_MONTH';
ALTER TYPE "public"."WidgetType" ADD VALUE 'MUSIC_PLAYER';
ALTER TYPE "public"."WidgetType" ADD VALUE 'LINK_TILE';
ALTER TYPE "public"."WidgetType" ADD VALUE 'PROGRESS';
