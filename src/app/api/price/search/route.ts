import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const city = searchParams.get("city") || "";
    const category = searchParams.get("category") || "";
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;

    // Fetch active standardized services to match query
    let matchedServiceIds: string[] = [];
    if (q) {
      const qLower = q.toLowerCase().trim();
      const allServices = await db.service.findMany({ where: { isActive: true } });
      matchedServiceIds = allServices
        .filter(
          (s) =>
            s.name.toLowerCase().includes(qLower) ||
            s.synonyms.some((syn) => syn.toLowerCase().includes(qLower))
        )
        .map((s) => s.id);
    }

    // Build PriceRecord filters
    const whereFilter: any = {
      isActive: true,
    };

    if (city) {
      whereFilter.clinic = {
        city: {
          equals: city,
          mode: "insensitive",
        },
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereFilter.priceKzt = {};
      if (minPrice !== undefined) whereFilter.priceKzt.gte = minPrice;
      if (maxPrice !== undefined) whereFilter.priceKzt.lte = maxPrice;
    }

    if (q) {
      whereFilter.OR = [
        {
          serviceNameRaw: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          serviceId: {
            in: matchedServiceIds,
          },
        },
      ];
    }

    if (category) {
      whereFilter.service = {
        category: category,
      };
    }

    const results = await db.priceRecord.findMany({
      where: whereFilter,
      include: {
        clinic: true,
        service: true,
      },
      orderBy: {
        priceKzt: "asc",
      },
    });

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("Price search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
