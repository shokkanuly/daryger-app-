import { db } from "../db";
import { subYears } from "date-fns";

interface ScreeningCriteria {
  minAge?: number;
  maxAge?: number;
  city?: string[];
  lastScreenedBefore?: string; // yyyy-MM-dd format
}

/**
 * buildCohort queries the database to find all patient Users matching the ScreeningProgram's criteria.
 */
export async function buildCohort(program: { criteria: any }) {
  const criteria = program.criteria as ScreeningCriteria;
  const now = new Date();
  
  const where: any = {
    role: "PATIENT",
  };

  // 1. Filter by town/city
  if (criteria.city && criteria.city.length > 0) {
    where.town = {
      in: criteria.city,
    };
  }

  // 2. Filter by birthDate (calculates age eligibility)
  if (criteria.minAge !== undefined || criteria.maxAge !== undefined) {
    where.birthDate = {};
    if (criteria.minAge !== undefined) {
      // Must be born on or before (now - minAge years)
      where.birthDate.lte = subYears(now, criteria.minAge);
    }
    if (criteria.maxAge !== undefined) {
      // Must be born on or after (now - maxAge years)
      where.birthDate.gte = subYears(now, criteria.maxAge + 1);
    }
  }

  // 3. Filter by lastScreenedAt
  if (criteria.lastScreenedBefore) {
    const beforeDate = new Date(criteria.lastScreenedBefore);
    where.OR = [
      { lastScreenedAt: null },
      { lastScreenedAt: { lt: beforeDate } }
    ];
  }

  return db.user.findMany({
    where,
    orderBy: { name: "asc" }
  });
}
