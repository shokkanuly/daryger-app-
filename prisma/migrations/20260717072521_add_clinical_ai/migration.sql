-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "referredToId" TEXT,
ADD COLUMN     "specialistRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "flags" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);
