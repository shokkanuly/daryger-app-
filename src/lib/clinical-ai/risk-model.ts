import { db } from "@/lib/db";
import { HEPATITIS_B_2025_PROTOCOL, PatientClinicalInput, ClinicalFactor } from "./protocols/hepatitis-b-2025";

export interface AssessmentResult {
  id: string;
  patientId: string;
  condition: string;
  score: number;
  modelVersion: string;
  flags: {
    factorId: string;
    name: string;
    description: string;
    weight: number;
  }[];
  computedAt: Date;
}

export async function assessRisk(
  patientId: string,
  input: PatientClinicalInput
): Promise<AssessmentResult> {
  const firedFactors: {
    factorId: string;
    name: string;
    description: string;
    weight: number;
  }[] = [];

  let totalScore = 0;

  for (const factor of HEPATITIS_B_2025_PROTOCOL) {
    if (factor.test(input)) {
      firedFactors.push({
        factorId: factor.id,
        name: factor.name,
        description: factor.description,
        weight: factor.weight,
      });
      totalScore += factor.weight;
    }
  }

  const modelVersion = "hepb-protocol-2025-v1";
  const condition = "hepatitis-b";

  const assessment = await db.riskAssessment.create({
    data: {
      patientId,
      condition,
      score: totalScore,
      modelVersion,
      flags: JSON.stringify(firedFactors),
    },
  });

  return {
    id: assessment.id,
    patientId: assessment.patientId,
    condition: assessment.condition,
    score: assessment.score,
    modelVersion: assessment.modelVersion,
    flags: firedFactors,
    computedAt: assessment.computedAt,
  };
}
