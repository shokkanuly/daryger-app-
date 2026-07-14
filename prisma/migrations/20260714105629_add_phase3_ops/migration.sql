-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "lastScreenedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "externalRef" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "slaDueAt" TIMESTAMP(3) NOT NULL,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,

    CONSTRAINT "ScreeningProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningInvite" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ScreeningInvite_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScreeningInvite" ADD CONSTRAINT "ScreeningInvite_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningInvite" ADD CONSTRAINT "ScreeningInvite_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ScreeningProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
