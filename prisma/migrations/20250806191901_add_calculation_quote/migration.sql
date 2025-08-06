-- CreateTable
CREATE TABLE "calculation_quotes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationResult" JSONB NOT NULL,

    CONSTRAINT "calculation_quotes_pkey" PRIMARY KEY ("id")
);
