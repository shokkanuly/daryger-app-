"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ChevronLeft, Plus, Save, BookOpen, Layers } from "lucide-react";

interface Service {
  id: string;
  name: string;
  synonyms: string[];
  category: string;
  icdCode: string | null;
  isActive: boolean;
}

export default function AdminCatalogPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("lab");
  const [synonymsText, setSynonymsText] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadServices() {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) setServices(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const synonyms = synonymsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, synonyms, icdCode }),
      });
      if (res.ok) {
        setName("");
        setSynonymsText("");
        setIcdCode("");
        await loadServices();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/doctor" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Standard Service Catalog</h1>
          <p className="text-slate-500">Configure standardized clinical medical catalog entries</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Create Form */}
        <div className="lg:col-span-4">
          <Card className="p-4 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-teal-600" /> Add New Service
            </h2>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Standard Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Brain MRI"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="lab">Lab Tests</option>
                  <option value="diagnostic">Diagnostics</option>
                  <option value="consult">Doctor Consultations</option>
                  <option value="procedure">Procedures / Injections</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Synonyms (Comma-separated)</label>
                <textarea
                  value={synonymsText}
                  onChange={(e) => setSynonymsText(e.target.value)}
                  placeholder="e.g. МРТ головного мозга, МРТ мозга, Brain MRI"
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ICD-10 Code (Optional)</label>
                <input
                  type="text"
                  value={icdCode}
                  onChange={(e) => setIcdCode(e.target.value)}
                  placeholder="e.g. Z01.0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 text-xs py-2">
                <Save className="h-3.5 w-3.5 mr-1" /> Save Catalog Entry
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Side: Catalog List */}
        <div className="lg:col-span-8">
          <Card className="p-4 border border-slate-200 overflow-hidden shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-teal-600" /> Catalog Services ({services.length})
            </h2>

            {loading ? (
              <div className="text-center py-10 text-slate-500">Loading catalog...</div>
            ) : services.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm">No services configured.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Synonyms</th>
                      <th className="py-2.5 px-3">ICD-10</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="py-3 px-3 uppercase text-[10px] text-teal-700 font-semibold">{s.category}</td>
                        <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate" title={s.synonyms.join(", ")}>
                          {s.synonyms.join(", ") || "-"}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">{s.icdCode || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
