"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, AlertTriangle, CheckCircle, HelpCircle, FileText, Globe, RefreshCcw 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PriceDocument {
  id: string;
  fileName: string;
  fileFormat: string;
}

interface Clinic {
  id: string;
  name: string;
  city: string;
}

interface PriceRecord {
  id: string;
  serviceNameRaw: string;
  serviceId: string | null;
  priceKzt: string;
  priceResidentKzt: string | null;
  priceNonresidentKzt: string | null;
  priceOriginal: string | null;
  currencyOriginal: string | null;
  verificationNote: string | null;
  clinic: Clinic;
  sourceDoc: PriceDocument | null;
  parsedAt: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
}

export default function AdminVerificationPage() {
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceMap, setSelectedServiceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        fetch("/api/admin/verification/pending"),
        fetch("/api/admin/services"),
      ]);

      if (rRes.ok) setRecords(await rRes.json());
      if (sRes.ok) setServices(await sRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (recordId: string) => {
    setResolvingId(recordId);
    const serviceId = selectedServiceMap[recordId];

    // If the record has no serviceId and user did not choose one
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    if (!record.serviceId && !serviceId) {
      alert("Please map this item to a standard catalog service first!");
      setResolvingId(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/verification/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceRecordId: recordId,
          serviceId: serviceId || record.serviceId,
        }),
      });

      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to approve record");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/doctor" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Partner Verification Queue</h1>
          <p className="text-slate-500 text-sm mt-1">
            Review parsed document lines that failed validation rules or require manual mapping.
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" className="flex items-center gap-1">
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh list
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading verification queue...</div>
      ) : records.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-200">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">All prices verified!</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            There are no pending price listings or anomalies needing manual approval in the verification queue.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const isAnomaly = rec.verificationNote && rec.verificationNote.toLowerCase().includes("anomaly");
            const targetService = services.find((s) => s.id === rec.serviceId);

            return (
              <Card key={rec.id} className={`shadow-sm border transition-all ${
                isAnomaly ? "border-amber-200 bg-amber-50/5" : "border-slate-200"
              }`}>
                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  
                  {/* Left: Metadata and Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        isAnomaly 
                          ? "bg-amber-100 text-amber-800 border-amber-200" 
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}>
                        {isAnomaly ? "Anomaly Warning" : "Mapping Pending"}
                      </span>
                      {rec.sourceDoc && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                          <FileText className="h-3 w-3" /> {rec.sourceDoc.fileName}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base">
                      &ldquo;{rec.serviceNameRaw}&rdquo;
                    </h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Clinic: <strong className="text-slate-700">{rec.clinic.name}</strong></span>
                      <span>City: <strong>{rec.clinic.city}</strong></span>
                      <span>Parsed: <strong>{formatDate(rec.parsedAt)}</strong></span>
                    </div>

                    {rec.verificationNote && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-lg max-w-lg mt-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{rec.verificationNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Middle: Price Metrics */}
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex gap-4 shrink-0 text-left">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Resident</span>
                      <span className="font-bold text-slate-900 text-base">
                        {Number(rec.priceResidentKzt || rec.priceKzt).toLocaleString()} ₸
                      </span>
                    </div>
                    {rec.priceNonresidentKzt && (
                      <div className="border-l border-slate-200 pl-4">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Non-Resident</span>
                        <span className="font-bold text-slate-800 text-base">
                          {Number(rec.priceNonresidentKzt).toLocaleString()} ₸
                        </span>
                      </div>
                    )}
                    {rec.currencyOriginal && rec.currencyOriginal !== "KZT" && (
                      <div className="border-l border-slate-200 pl-4 text-slate-400">
                        <span className="text-[10px] uppercase block font-semibold">Original</span>
                        <span className="font-semibold text-xs block">
                          {Number(rec.priceOriginal).toLocaleString()} {rec.currencyOriginal}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Validation controls */}
                  <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    
                    {/* Catalog Mapper dropdown */}
                    {!rec.serviceId && (
                      <div className="flex-1 sm:w-60">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">
                          Choose standard mapping
                        </label>
                        <select
                          value={selectedServiceMap[rec.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedServiceMap((prev) => ({ ...prev, [rec.id]: val }));
                          }}
                          className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                        >
                          <option value="">-- Choose standard service --</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.category.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Verification Actions */}
                    <div className="flex gap-2 pt-2 sm:pt-0 shrink-0">
                      <Button
                        size="sm"
                        disabled={resolvingId === rec.id}
                        onClick={() => handleApprove(rec.id)}
                        className="bg-teal-700 hover:bg-teal-800 text-xs text-white"
                      >
                        Approve & Verify
                      </Button>
                    </div>

                  </div>

                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
