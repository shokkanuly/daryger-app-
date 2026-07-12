export interface RawPriceRow {
  serviceNameRaw: string;
  priceKzt: number;
  durationDays?: number;
}

export interface CrawlerAdapter {
  clinicName: string;
  fetch(): Promise<RawPriceRow[]>;
}
