-- CreateEnum
CREATE TYPE "FinanceSource" AS ENUM ('ESOMP', 'KAZYNA', 'ONEC_FIN', 'GOSZAKUP', 'FSMS');

-- CreateTable
CREATE TABLE "FinanceRecord" (
    "id" TEXT NOT NULL,
    "source" "FinanceSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationFlag" (
    "id" TEXT NOT NULL,
    "sourceA" "FinanceSource" NOT NULL,
    "sourceB" "FinanceSource" NOT NULL,
    "externalIdA" TEXT NOT NULL,
    "externalIdB" TEXT,
    "category" TEXT NOT NULL,
    "amountA" DECIMAL(65,30) NOT NULL,
    "amountB" DECIMAL(65,30),
    "discrepancy" DECIMAL(65,30) NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetForecast" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "forecastAmount" DECIMAL(65,30) NOT NULL,
    "actualAmount" DECIMAL(65,30),
    "method" TEXT NOT NULL DEFAULT 'moving_average_3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAllocation" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "allocated" DECIMAL(65,30) NOT NULL,
    "committed" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "spent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "serviceCategory" TEXT NOT NULL,
    "plannedVolume" DECIMAL(65,30) NOT NULL,
    "deliveredVolume" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plannedAmount" DECIMAL(65,30) NOT NULL,
    "deliveredAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrAnomaly" (
    "id" TEXT NOT NULL,
    "employeeRef" TEXT NOT NULL,
    "employeeName" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "detail" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "HrAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceRecord_source_period_idx" ON "FinanceRecord"("source", "period");

-- CreateIndex
CREATE INDEX "FinanceRecord_category_recordedAt_idx" ON "FinanceRecord"("category", "recordedAt");

-- CreateIndex
CREATE INDEX "FinanceRecord_period_idx" ON "FinanceRecord"("period");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceRecord_source_externalId_key" ON "FinanceRecord"("source", "externalId");

-- CreateIndex
CREATE INDEX "ReconciliationFlag_status_createdAt_idx" ON "ReconciliationFlag"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReconciliationFlag_category_idx" ON "ReconciliationFlag"("category");

-- CreateIndex
CREATE INDEX "BudgetForecast_period_idx" ON "BudgetForecast"("period");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetForecast_period_category_key" ON "BudgetForecast"("period", "category");

-- CreateIndex
CREATE INDEX "BudgetAllocation_period_idx" ON "BudgetAllocation"("period");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAllocation_period_programme_category_key" ON "BudgetAllocation"("period", "programme", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_period_programme_idx" ON "Contract"("period", "programme");

-- CreateIndex
CREATE INDEX "Contract_endsAt_idx" ON "Contract"("endsAt");

-- CreateIndex
CREATE INDEX "HrAnomaly_status_severity_idx" ON "HrAnomaly"("status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "HrAnomaly_employeeRef_type_status_key" ON "HrAnomaly"("employeeRef", "type", "status");
