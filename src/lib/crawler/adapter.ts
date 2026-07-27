export interface RawPriceRow {
  serviceNameRaw: string;
  priceKzt: number;
  durationDays?: number;
}

/**
 * Where a crawl run's rows actually came from.
 *
 * LIVE     - scraped from the source site in this run.
 * FALLBACK - the site was unreachable, blocked by robots.txt, or returned
 *            nothing parseable, so the adapter returned its built-in sample
 *            dataset instead. These rows are representative, NOT real prices.
 *
 * This distinction has to survive into the database. Phase 1's acceptance
 * criteria require "real (not fabricated) data", and without a provenance tag
 * a fallback row is indistinguishable from a scraped one once it lands in
 * PriceRecord.
 */
export type CrawlProvenance = "LIVE" | "FALLBACK";

export interface CrawlResult {
  rows: RawPriceRow[];
  provenance: CrawlProvenance;
  /** Why the adapter fell back, when provenance is FALLBACK. */
  note?: string;
}

export interface CrawlerAdapter {
  clinicName: string;
  sourceUrl: string;
  /**
   * City this source's prices apply to. Sources are per-city, so hardcoding one
   * city in the ingest pipeline mislabelled every crawled row.
   */
  city?: string;
  fetch(): Promise<CrawlResult>;
}
