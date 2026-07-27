-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('DAMUMED', 'EISZ', 'AIGYN', 'QALQAN', 'ONEC');

-- CreateTable
CREATE TABLE "ExternalAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "system" "SourceSystem" NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidatedRecord" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "system" "SourceSystem" NOT NULL,
    "externalId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConsolidatedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordConflict" (
    "id" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedTo" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalAccount_userId_idx" ON "ExternalAccount"("userId");

-- CreateIndex
CREATE INDEX "ExternalAccount_system_idx" ON "ExternalAccount"("system");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAccount_system_externalId_key" ON "ExternalAccount"("system", "externalId");

-- CreateIndex
CREATE INDEX "ConsolidatedRecord_subjectRef_idx" ON "ConsolidatedRecord"("subjectRef");

-- CreateIndex
CREATE INDEX "ConsolidatedRecord_recordType_subjectRef_idx" ON "ConsolidatedRecord"("recordType", "subjectRef");

-- CreateIndex
CREATE INDEX "ConsolidatedRecord_system_isActive_idx" ON "ConsolidatedRecord"("system", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidatedRecord_system_externalId_key" ON "ConsolidatedRecord"("system", "externalId");

-- CreateIndex
CREATE INDEX "RecordConflict_status_createdAt_idx" ON "RecordConflict"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RecordConflict_subjectRef_idx" ON "RecordConflict"("subjectRef");

-- CreateIndex
CREATE UNIQUE INDEX "RecordConflict_subjectRef_field_status_key" ON "RecordConflict"("subjectRef", "field", "status");

-- AddForeignKey
ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
