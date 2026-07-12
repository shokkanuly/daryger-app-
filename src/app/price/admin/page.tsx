"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, RefreshCcw, BookOpen, Layers, AlertCircle, Database, CheckCircle, Clock 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Capture {
  id: string;
  sourceUrl: string;
  rawContent: string;
  fetchedAt: string;
  status: string;
  clinic: { name: string };
}

interface Stats {
  totalServices: number;
  totalPrices: number;
  unmatchedCount: number;
}

export default function PriceAdminDashboard() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [stats, setStats] = useState<Stats>({ totalServices: 0, totalPrices: 0, unmatchedCount: 0 });
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadDashboardData() {
    try {
      const res = await fetch("/api/admin/crawl/history");
      if (res.ok) {
        const data = await res.json();
        setCaptures(data.captures);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleTriggerCrawl() {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/crawl/trigger", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Crawlers triggered! Workers have enqueued ingestion tasks." });
        // Reload data shortly after enqueuing
        setTimeout(loadDashboardData, 3000);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to trigger crawls" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error triggering crawls" });
    }
    setTriggering(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Banner */}
      <section className="bg-gradient-to-r from-slate-800 to-teal-900 text-white rounded-2xl p-6 shadow-md mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800/40">
              Price Crawler Control Center
            </span>
            <h1 className="text-2xl font-bold mt-1">Admin Dashboard</h1>
            <p className="text-xs text-slate-300 mt-1">
              Trigger scraping, inspect raw MinIO captures, and map standardized clinical catalogs.
            </p>
          </div>
          <Button 
            disabled={triggering}
            onClick={handleTriggerCrawl}
            className="bg-teal-600 hover:bg-teal-700 font-semibold text-xs py-2 px-4 shadow flex items-center gap-1.5 self-stretch md:self-auto"
          >
            {triggering ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {triggering ? "Triggering..." : "Run Price Crawlers"}
          </Button>
        </div>
      </section>

      {/* Trigger Info Messages */}
      {message && (
        <div className={`mb-6 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
          {message.text}
        </div>
      )}

      {/* Grid: Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Catalog stats */}
        <Card className="p-4 border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 rounded-lg text-teal-600 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Normalized Catalog</span>
            <span className="text-lg font-bold text-slate-800">{stats.totalServices} Standard Services</span>
          </div>
        </Card>

        {/* Total compared stats */}
        <Card className="p-4 border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Price Records</span>
            <span className="text-lg font-bold text-slate-800">{stats.totalPrices} Clinic Price Offers</span>
          </div>
        </Card>

        {/* Unmatched queue stats */}
        <Link href="/admin/unmatched" className="block">
          <Card className="p-4 border border-slate-200 flex items-center gap-3 hover:border-amber-400 transition-colors">
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Unresolved Queue</span>
              <span className="text-lg font-bold text-slate-800">{stats.unmatchedCount} Awaiting Review</span>
            </div>
          </Card>
        </Link>
      </section>

      {/* Control panel navigation shortcuts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Standard Catalog Service Config</h3>
            <p className="text-xs text-slate-500 mt-1">
              标准化服务价格目录, defining icdCodes, and setting canonical labels and Russian/Kazakh synonym matching criteria.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <Link href="/admin/catalog">
              <Button size="sm" variant="outline" className="text-xs">
                Manage Service Catalog
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Crawler Unmatched Queue</h3>
            <p className="text-xs text-slate-500 mt-1">
              Process low-confidence scraper results. Approve direct translations, or assign raw names to normalized services.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <Link href="/admin/unmatched">
              <Button size="sm" variant="outline" className="text-xs">
                Open Unmatched Review Queue
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Capture logs history table */}
      <section>
        <Card className="p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-teal-600" /> Recent Scraper Captures
            </h2>
            <Button size="sm" variant="ghost" onClick={loadDashboardData} className="text-xs text-slate-400">
              Refresh history
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading crawl runs...</div>
          ) : captures.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">No crawls executed yet. Click &ldquo;Run Price Crawlers&rdquo; above to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="py-2 px-3">Clinic Target</th>
                    <th className="py-2 px-3">Captured Key (MinIO Blob)</th>
                    <th className="py-2 px-3">Date Run</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {captures.map((cap) => (
                    <tr key={cap.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-800">{cap.clinic.name}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono select-all truncate max-w-[200px]" title={cap.rawContent}>
                        {cap.rawContent}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(cap.fetchedAt)}</td>
                      <td className="py-3 px-3">
                        <Badge className={`${
                          cap.status === "PARSED" 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                            : cap.status === "ERROR"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {cap.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
