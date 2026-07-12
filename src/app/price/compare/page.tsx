"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, MapPin, Clock, Phone, ExternalLink, Calendar, AlertTriangle, ShieldCheck 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string | null;
  workingHours: string | null;
  phone: string | null;
  sourceUrl: string | null;
}

interface Service {
  id: string;
  name: string;
  category: string;
  icdCode: string | null;
}

interface PriceRecord {
  id: string;
  serviceNameRaw: string;
  priceKzt: number;
  parsedAt: string;
  durationDays: number | null;
  clinic: Clinic;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("serviceId");
  const [service, setService] = useState<Service | null>(null);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;

    async function loadCompareData() {
      try {
        // Fetch service details
        const sRes = await fetch(`/api/admin/services`); // Fallback or direct check
        let activeService: Service | null = null;
        if (sRes.ok) {
          const list = await sRes.json();
          activeService = list.find((s: Service) => s.id === serviceId) || null;
          setService(activeService);
        }

        // Fetch price comparisons
        const pRes = await fetch(`/api/price/search?category=`); // General search
        if (pRes.ok) {
          const allPrices = await pRes.json();
          // Filter prices matching this standard serviceId
          const matched = allPrices.filter((p: any) => p.serviceId === serviceId);
          setRecords(matched);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }

    loadCompareData();
  }, [serviceId]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Comparing prices side-by-side...</div>;
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-lg font-semibold">Service not found</h2>
        <p className="text-sm text-slate-500 mt-1">Please go back and select a valid standard service.</p>
        <Link href="/price" className="mt-4 inline-block">
          <Button size="sm">Back to Search</Button>
        </Link>
      </div>
    );
  }

  // Outdated threshold (30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/price" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Back to Search
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              Comparing Offers ({records.length})
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{service.name}</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
              Category: {service.category} {service.icdCode && `• ICD-10: ${service.icdCode}`}
            </p>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">No clinic pricing offers found for this service.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {records.map((rec) => {
            const parsedDate = new Date(rec.parsedAt);
            const isOutdated = parsedDate < thirtyDaysAgo;

            return (
              <Card key={rec.id} className={`flex flex-col justify-between overflow-hidden shadow-sm border ${
                isOutdated ? "border-amber-200 bg-amber-50/10" : "border-slate-200 bg-white"
              }`}>
                {/* Clinic Header Banner */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base">{rec.clinic.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{rec.clinic.city}</p>
                </div>

                <div className="p-4 flex-1 space-y-4">
                  {/* Price Block */}
                  <div>
                    <span className="text-xs text-slate-400 block">Clinic Price</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {Number(rec.priceKzt).toLocaleString()} ₸
                      </span>
                      {isOutdated && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          May be outdated
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Raw name: &ldquo;{rec.serviceNameRaw}&rdquo;
                    </span>
                  </div>

                  {/* Clinic details */}
                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    {rec.clinic.address && (
                      <p className="flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{rec.clinic.address}</span>
                      </p>
                    )}
                    {rec.clinic.workingHours && (
                      <p className="flex items-start gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{rec.clinic.workingHours}</span>
                      </p>
                    )}
                    {rec.clinic.phone && (
                      <p className="flex items-start gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{rec.clinic.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Duration days */}
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>Result time:</span>
                    <span className="font-semibold text-slate-700">
                      {rec.durationDays ? `${rec.durationDays} ${rec.durationDays === 1 ? "day" : "days"}` : "1 day"}
                    </span>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-2">
                  <Link 
                    href={`/patient/appointments?clinic=${encodeURIComponent(rec.clinic.name)}&service=${encodeURIComponent(service.name)}`}
                    className="w-full"
                  >
                    <Button className="w-full text-xs py-2 bg-teal-700 hover:bg-teal-800">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Book Priority Appointment
                    </Button>
                  </Link>

                  {rec.clinic.sourceUrl && (
                    <a 
                      href={rec.clinic.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-center text-slate-400 hover:text-slate-600 text-[10px] flex items-center justify-center gap-1 py-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View source public rates
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function PriceComparePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500">Loading comparison details...</div>}>
      <CompareContent />
    </Suspense>
  );
}
