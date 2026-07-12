"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { 
  ChevronLeft, AlertTriangle, ShieldCheck, XCircle, RefreshCcw, HelpCircle 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MatchQueueItem {
  id: string;
  rawName: string;
  suggestedServiceId: string | null;
  confidence: number | null;
  status: string;
  sourceRecordId: string;
  createdAt: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
}

export default function AdminUnmatchedPage() {
  const [items, setItems] = useState<MatchQueueItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceMap, setSelectedServiceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function loadData() {
    try {
      const [qRes, sRes] = await Promise.all([
        fetch("/api/admin/match/queue"),
        fetch("/api/admin/services"),
      ]);

      if (qRes.ok) setItems(await qRes.json());
      if (sRes.ok) setServices(await sRes.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleResolve(itemId: string, status: "APPROVED" | "REJECTED") {
    setResolvingId(itemId);
    const serviceId = selectedServiceMap[itemId];

    if (status === "APPROVED" && !serviceId) {
      alert("Please select a standard service to map this item to!");
      setResolvingId(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchQueueItemId: itemId, status, serviceId }),
      });
      if (res.ok) {
        // Remove item from UI list
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    } catch (err) {
      console.error(err);
    }
    setResolvingId(null);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/doctor" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Unmatched Price Queue</h1>
          <p className="text-slate-500">Manually resolve low-confidence raw crawler service price mappings</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading unmatched queue...</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-slate-200">
          <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-800">Queue is clean!</h3>
          <p className="text-sm text-slate-400 mt-1">All crawler prices are mapped to standard catalog services.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const fuzzySuggestion = services.find((s) => s.id === item.suggestedServiceId);
            
            return (
              <Card key={item.id} className="p-4 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  
                  {/* Left panel: Raw Info */}
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                      Unresolved Capture
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">
                      Raw: &ldquo;{item.rawName}&rdquo;
                    </h3>
                    <p className="text-slate-400 text-xs">
                      Enqueued: {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {/* Right panel: Resolution controls */}
                  <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    
                    {/* Catalog Mapper */}
                    <div className="flex-1 sm:w-64">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">
                        Standard Service Mapping
                      </label>
                      <Select
                        value={selectedServiceMap[item.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedServiceMap((prev) => ({ ...prev, [item.id]: val }));
                        }}
                      >
                        <option value="">-- Choose Catalog Service --</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.category.toUpperCase()})
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0 pt-3 sm:pt-0">
                      <Button
                        size="sm"
                        disabled={resolvingId === item.id}
                        onClick={() => handleResolve(item.id, "APPROVED")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs px-3"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolvingId === item.id}
                        onClick={() => handleResolve(item.id, "REJECTED")}
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs px-3"
                      >
                        Reject
                      </Button>
                    </div>

                  </div>
                </div>

                {/* Fuzzy suggestion helper */}
                {fuzzySuggestion && (
                  <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-teal-600" />
                      Fuzzy suggestion: <strong className="text-slate-800 font-semibold">{fuzzySuggestion.name}</strong>
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                      Confidence: {item.confidence ? Math.floor(item.confidence * 100) : 0}%
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
