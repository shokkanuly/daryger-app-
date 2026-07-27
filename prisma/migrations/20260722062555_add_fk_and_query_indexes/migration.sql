-- CreateIndex
CREATE INDEX "Appeal_assignedTo_idx" ON "Appeal"("assignedTo");

-- CreateIndex
CREATE INDEX "Appeal_status_slaDueAt_idx" ON "Appeal"("status", "slaDueAt");

-- CreateIndex
CREATE INDEX "Appeal_channel_idx" ON "Appeal"("channel");

-- CreateIndex
CREATE INDEX "Appeal_channel_externalRef_idx" ON "Appeal"("channel", "externalRef");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_date_time_idx" ON "Appointment"("doctorId", "date", "time");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Consultation_patientId_idx" ON "Consultation"("patientId");

-- CreateIndex
CREATE INDEX "Consultation_doctorId_idx" ON "Consultation"("doctorId");

-- CreateIndex
CREATE INDEX "Consultation_referredToId_idx" ON "Consultation"("referredToId");

-- CreateIndex
CREATE INDEX "Consultation_status_specialistRequired_idx" ON "Consultation"("status", "specialistRequired");

-- CreateIndex
CREATE INDEX "MatchQueueItem_status_idx" ON "MatchQueueItem"("status");

-- CreateIndex
CREATE INDEX "MatchQueueItem_sourceRecordId_idx" ON "MatchQueueItem"("sourceRecordId");

-- CreateIndex
CREATE INDEX "MatchQueueItem_rawName_status_idx" ON "MatchQueueItem"("rawName", "status");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_consultationId_createdAt_idx" ON "Message"("consultationId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceDocument_clinicId_idx" ON "PriceDocument"("clinicId");

-- CreateIndex
CREATE INDEX "PriceDocument_parseStatus_idx" ON "PriceDocument"("parseStatus");

-- CreateIndex
CREATE INDEX "PriceRecord_serviceId_idx" ON "PriceRecord"("serviceId");

-- CreateIndex
CREATE INDEX "PriceRecord_clinicId_idx" ON "PriceRecord"("clinicId");

-- CreateIndex
CREATE INDEX "PriceRecord_sourceDocId_idx" ON "PriceRecord"("sourceDocId");

-- CreateIndex
CREATE INDEX "PriceRecord_isActive_priceKzt_idx" ON "PriceRecord"("isActive", "priceKzt");

-- CreateIndex
CREATE INDEX "PriceRecord_clinicId_serviceId_isActive_parsedAt_idx" ON "PriceRecord"("clinicId", "serviceId", "isActive", "parsedAt");

-- CreateIndex
CREATE INDEX "PriceRecord_clinicId_serviceNameRaw_isActive_parsedAt_idx" ON "PriceRecord"("clinicId", "serviceNameRaw", "isActive", "parsedAt");

-- CreateIndex
CREATE INDEX "RawCapture_clinicId_idx" ON "RawCapture"("clinicId");

-- CreateIndex
CREATE INDEX "RawCapture_status_idx" ON "RawCapture"("status");

-- CreateIndex
CREATE INDEX "RiskAssessment_patientId_computedAt_idx" ON "RiskAssessment"("patientId", "computedAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_condition_idx" ON "RiskAssessment"("condition");

-- CreateIndex
CREATE INDEX "ScreeningInvite_patientId_idx" ON "ScreeningInvite"("patientId");

-- CreateIndex
CREATE INDEX "ScreeningInvite_programId_idx" ON "ScreeningInvite"("programId");

-- CreateIndex
CREATE INDEX "ScreeningInvite_programId_status_idx" ON "ScreeningInvite"("programId", "status");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "Service_name_idx" ON "Service"("name");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE INDEX "TimeSlot_doctorId_idx" ON "TimeSlot"("doctorId");

-- CreateIndex
CREATE INDEX "TimeSlot_doctorId_date_time_isBooked_idx" ON "TimeSlot"("doctorId", "date", "time", "isBooked");
