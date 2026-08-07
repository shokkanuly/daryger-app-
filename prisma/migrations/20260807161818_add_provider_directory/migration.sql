-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('DOCTOR', 'FELDSHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'FELDSHER';

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "offersTelemedicine" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "providerType" "ProviderType" NOT NULL DEFAULT 'DOCTOR',
ADD COLUMN     "town" TEXT NOT NULL DEFAULT 'Karaganda';

-- CreateIndex
CREATE INDEX "DoctorProfile_town_isAvailable_idx" ON "DoctorProfile"("town", "isAvailable");

-- CreateIndex
CREATE INDEX "DoctorProfile_specialty_idx" ON "DoctorProfile"("specialty");
