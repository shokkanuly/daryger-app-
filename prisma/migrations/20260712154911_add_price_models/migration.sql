-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "synonyms" TEXT[],
    "category" TEXT NOT NULL,
    "icdCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "workingHours" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawCapture" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "RawCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchQueueItem" (
    "id" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "suggestedServiceId" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceRecordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRecord" (
    "id" TEXT NOT NULL,
    "serviceNameRaw" TEXT NOT NULL,
    "serviceId" TEXT,
    "clinicId" TEXT NOT NULL,
    "priceKzt" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "durationDays" INTEGER,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceType" TEXT NOT NULL,

    CONSTRAINT "PriceRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RawCapture" ADD CONSTRAINT "RawCapture_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
