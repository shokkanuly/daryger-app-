"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { 
  Search, SlidersHorizontal, MapPin, Calendar, ExternalLink, ArrowRight, ShieldAlert 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string | null;
  workingHours: string | null;
  phone: string | null;
}

interface Service {
  id: string;
  name: string;
  category: string;
}

interface PriceRecord {
  id: string;
  serviceNameRaw: string;
  priceKzt: number;
  parsedAt: string;
  clinic: Clinic;
  service: Service | null;
}

export default function PriceSearchPage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  async function performSearch() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (city) params.set("city", city);
      if (category) params.set("category", category);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);

      const res = await fetch(`/api/price/search?${params.toString()}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    performSearch();
  }, [city, category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  // Group records by standardized service so we can compare
  const serviceGroups: Record<string, { serviceName: string; records: PriceRecord[] }> = {};
  
  results.forEach((rec) => {
    const key = rec.service?.id || `unmatched-${rec.serviceNameRaw}`;
    const name = rec.service?.name || rec.serviceNameRaw;
    if (!serviceGroups[key]) {
      serviceGroups[key] = { serviceName: name, records: [] };
    }
    serviceGroups[key].records.push(rec);
  });

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-teal-800 to-cyan-900 text-white py-12 px-4 shadow-md">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Daryger Price Compare</h1>
          <p className="mt-2 text-teal-100 text-sm max-w-md mx-auto">
            Search standardized diagnostics and lab panels, compare real-time prices across public clinics, and book instantly.
          </p>
        </div>
      </section>

      {/* Main Search Panel */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Filters */}
          <div className="lg:col-span-4">
            <Card className="p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
                <SlidersHorizontal className="h-4 w-4 text-teal-600" />
                Filters
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
                  <Select value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="">All Cities</option>
                    <option value="Karaganda">Karaganda</option>
                    <option value="Temirtau">Temirtau</option>
                    <option value="Shakhtinsk">Shakhtinsk</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                  <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="lab">Lab Tests</option>
                    <option value="diagnostic">Diagnostics (Ultrasound, MRI, etc)</option>
                    <option value="consult">Doctor Consultations</option>
                    <option value="procedure">Procedures / Injections</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Price Range (KZT)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <Button 
                  className="w-full text-xs py-2 bg-teal-700 hover:bg-teal-800"
                  onClick={performSearch}
                >
                  Apply Filters
                </Button>
              </div>
            </Card>
          </div>

          {/* Search Box & Results */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search for blood test, ECG, MRI, ultrasound..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none shadow-sm bg-white"
                />
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              </div>
              <Button type="submit" className="rounded-xl px-5 bg-teal-800 hover:bg-teal-900">
                Search
              </Button>
            </form>

            {/* Results Output */}
            {loading ? (
              <div className="text-center py-12 text-slate-500">Searching matching services...</div>
            ) : Object.keys(serviceGroups).length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
                No matching price records found. Try adjusting filters or keywords.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(serviceGroups).map(([key, group]) => {
                  const isStandard = !key.startsWith("unmatched-");
                  const lowestPrice = Math.min(...group.records.map((r) => Number(r.priceKzt)));

                  return (
                    <Card key={key} className="p-4 shadow-sm border border-slate-200 hover:border-teal-300 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isStandard ? "bg-teal-50 text-teal-800 border border-teal-100" : "bg-slate-100 text-slate-600"
                          }`}>
                            {isStandard ? "Standard Catalog Service" : "Uncategorized"}
                          </span>
                          <h3 className="font-semibold text-slate-900 mt-1">{group.serviceName}</h3>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-slate-400">Starting from</p>
                          <p className="text-lg font-bold text-teal-700">{lowestPrice.toLocaleString()} ₸</p>
                        </div>
                      </div>

                      {/* Clinic offers count */}
                      <p className="text-xs text-slate-500 mb-3">
                        Found {group.records.length} clinic {group.records.length === 1 ? "offer" : "offers"}
                      </p>

                      <div className="flex gap-2">
                        {isStandard ? (
                          <Link href={`/price/compare?serviceId=${key}`} className="w-full">
                            <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1 border-teal-600 text-teal-700 hover:bg-teal-50 text-xs">
                              Compare Prices Side-by-Side
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/patient/appointments?service=${encodeURIComponent(group.serviceName)}`} className="w-full">
                            <Button size="sm" className="w-full bg-teal-800 hover:bg-teal-900 text-xs">
                              Book at Clinic
                            </Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
