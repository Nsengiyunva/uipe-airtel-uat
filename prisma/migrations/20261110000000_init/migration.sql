-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(14,2),
    "msisdn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "airtel_money_id" TEXT,
    "provider_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airtel_callbacks" (
    "id" BIGSERIAL NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_ip" TEXT,
    "reference" TEXT,
    "status_code" TEXT,
    "raw" JSONB NOT NULL,

    CONSTRAINT "airtel_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "airtel_callbacks_reference_idx" ON "airtel_callbacks"("reference");
