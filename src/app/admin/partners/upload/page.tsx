"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, CheckCircle, FileText, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Clinic {
  id: string;
  name: string;
  city: string;
}

interface PriceDocument {
  id: string;
  fileName: string;
  fileFormat: string;
  effectiveDate: string | null;
  parsedAt: string | null;
  parseStatus: string;
  parseLog: string | null;
  clinic: Clinic;
}

export default function DocumentUploadPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [documents, setDocuments] = useState<PriceDocument[]>([]);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [stats, setStats] = useState<{
    totalDocuments: number;
    pendingDocuments: number;
    totalRecords: number;
    verifiedRecords: number;
    normalizationRate: number;
    pendingQueueItems: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClinicsAndDocs = async () => {
    setRefreshing(true);
    try {
      const resC = await fetch("/api/partners");
      if (resC.ok) {
        const data = await resC.json();
        setClinics(data);
      }
      
      const resD = await fetch("/api/partners/documents");
      if (resD.ok) {
        const data = await resD.json();
        setDocuments(data);
      }

      const resS = await fetch("/api/partners/dashboard/stats");
      if (resS.ok) {
        const data = await resS.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClinicsAndDocs();
    
    // Live polling every 4 seconds to make ingestion updates visible
    const interval = setInterval(fetchClinicsAndDocs, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: "error", text: "Please select a file to upload." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("clinicId", selectedClinic);
    formData.append("effectiveDate", effectiveDate);
    formData.append("file", file);

    try {
      const res = await fetch("/api/partners/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "File uploaded successfully! Processing started." });
        setFile(null);
        setEffectiveDate("");
        // Reset file input
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        // Refresh list
        setTimeout(fetchClinicsAndDocs, 2000);
      } else {
        setMessage({ type: "error", text: result.error || "Failed to upload document" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred during upload." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Partner Ingestion Portal</h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload price-lists (PDF, DOCX, XLSX, or ZIP archives) for partner clinics.
          </p>
        </div>
        <Button 
          onClick={fetchClinicsAndDocs} 
          variant="outline" 
          size="sm" 
          disabled={refreshing}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> 
          {refreshing ? "Refreshing..." : "Refresh status"}
        </Button>
      </div>

      {/* Dynamic Live Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-50/50 border-slate-200" padding={false}>
          <div className="p-4 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processed Files</span>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {stats ? stats.totalDocuments : <Loader2 className="h-5 w-5 animate-spin text-teal-600" />}
            </CardTitle>
          </div>
          <p className="text-[10px] text-slate-500 px-4 pb-4">Total clinic price documents uploaded</p>
        </Card>

        <Card className="bg-slate-50/50 border-slate-200" padding={false}>
          <div className="p-4 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queue Positions</span>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {stats ? stats.pendingDocuments : <Loader2 className="h-5 w-5 animate-spin text-teal-600" />}
            </CardTitle>
          </div>
          <p className="text-[10px] text-slate-500 px-4 pb-4">Files currently waiting or processing</p>
        </Card>

        <Card className="bg-slate-50/50 border-slate-200" padding={false}>
          <div className="p-4 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Normalisation Rate</span>
            <CardTitle className="text-2xl font-black text-teal-700 mt-1">
              {stats ? `${stats.normalizationRate}%` : <Loader2 className="h-5 w-5 animate-spin text-teal-600" />}
            </CardTitle>
          </div>
          <div className="px-4 pb-4">
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${stats ? stats.normalizationRate : 0}%` }}
              ></div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-50/50 border-slate-200" padding={false}>
          <div className="p-4 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification Queue</span>
            <CardTitle className="text-2xl font-black text-amber-700 mt-1">
              {stats ? stats.pendingQueueItems : <Loader2 className="h-5 w-5 animate-spin text-teal-600" />}
            </CardTitle>
          </div>
          <p className="text-[10px] text-slate-500 px-4 pb-4">Unmapped or anomaly records pending</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Ingest Price Archive</CardTitle>
            <CardDescription>Select clinic and upload document</CardDescription>
          </CardHeader>
          <div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Partner Clinic</label>
                <select
                  value={selectedClinic}
                  onChange={(e) => setSelectedClinic(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="">-- Choose partner clinic --</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Effective Date (optional)</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Price-List Document</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-teal-600 transition-colors bg-slate-50/50">
                  <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx,.xlsx,.xls,.zip"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                    required
                  />
                  <label htmlFor="file-upload" className="cursor-pointer text-xs font-semibold text-teal-700 hover:underline block">
                    {file ? file.name : "Choose PDF, DOCX, XLSX, or ZIP"}
                  </label>
                  <span className="text-[10px] text-slate-400 block mt-1">Max file size 15MB</span>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-xs font-medium border ${
                  message.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-teal-800 hover:bg-teal-900 text-white font-medium py-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : "Process Document"}
              </Button>
            </form>
          </div>
        </Card>

        {/* Status Tracker */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200" padding={false}>
          <div className="p-5 border-b border-slate-100">
            <CardTitle>Recent Ingestion Logs</CardTitle>
            <CardDescription>Live processing logs of uploaded files</CardDescription>
          </div>
          <div>
            {documents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-6 py-3">File / Clinic</th>
                      <th className="px-6 py-3">Effective Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-900 block">{doc.fileName}</span>
                              <span className="text-[10px] text-slate-400 block">{doc.clinic.name} ({doc.clinic.city})</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">
                          {doc.effectiveDate ? formatDate(doc.effectiveDate) : "Not specified"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            doc.parseStatus === "DONE" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : doc.parseStatus === "NEEDS_REVIEW"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : doc.parseStatus === "ERROR"
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                          }`}>
                            {doc.parseStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-[10px] text-slate-500 italic">
                          {doc.parseLog || "Waiting in queue..."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
