-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "bin" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "PriceRecord" ADD COLUMN     "currencyOriginal" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceNonresidentKzt" DECIMAL(65,30),
ADD COLUMN     "priceOriginal" DECIMAL(65,30),
ADD COLUMN     "priceResidentKzt" DECIMAL(65,30),
ADD COLUMN     "sourceDocId" TEXT,
ADD COLUMN     "verificationNote" TEXT;

-- CreateTable
CREATE TABLE "PriceDocument" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileFormat" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "parsedAt" TIMESTAMP(3),
    "parseStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "parseLog" TEXT,
    "rawContentKey" TEXT NOT NULL,

    CONSTRAINT "PriceDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_sourceDocId_fkey" FOREIGN KEY ("sourceDocId") REFERENCES "PriceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceDocument" ADD CONSTRAINT "PriceDocument_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
