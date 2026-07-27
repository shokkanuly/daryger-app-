-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Teleconsilium" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "specialistId" TEXT,
    "specialty" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "opinion" TEXT,
    "videoRoomUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Teleconsilium_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Teleconsilium_status_createdAt_idx" ON "Teleconsilium"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Teleconsilium_specialty_status_idx" ON "Teleconsilium"("specialty", "status");

-- CreateIndex
CREATE INDEX "Teleconsilium_consultationId_idx" ON "Teleconsilium"("consultationId");

-- CreateIndex
CREATE INDEX "Teleconsilium_requestedById_idx" ON "Teleconsilium"("requestedById");

-- CreateIndex
CREATE INDEX "Teleconsilium_specialistId_idx" ON "Teleconsilium"("specialistId");

-- CreateIndex
CREATE INDEX "Message_consultationId_isInternal_idx" ON "Message"("consultationId", "isInternal");

-- AddForeignKey
ALTER TABLE "Teleconsilium" ADD CONSTRAINT "Teleconsilium_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teleconsilium" ADD CONSTRAINT "Teleconsilium_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teleconsilium" ADD CONSTRAINT "Teleconsilium_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
