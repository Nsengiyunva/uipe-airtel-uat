-- Callbacks are now stored exactly as received; the unused payments table is dropped.

-- AlterTable
ALTER TABLE "airtel_callbacks"
  ADD COLUMN "content_type" TEXT,
  ADD COLUMN "headers" JSONB,
  ADD COLUMN "raw_body" TEXT,
  ADD COLUMN "airtel_money_id" TEXT;

-- Existing rows: keep what we have
ALTER TABLE "airtel_callbacks" RENAME COLUMN "raw" TO "body";
UPDATE "airtel_callbacks" SET
  "raw_body" = "body"::text,
  "airtel_money_id" = "body" -> 'transaction' ->> 'airtel_money_id';

ALTER TABLE "airtel_callbacks"
  ALTER COLUMN "raw_body" SET NOT NULL,
  ALTER COLUMN "body" DROP NOT NULL;

-- DropTable
DROP TABLE "payments";
