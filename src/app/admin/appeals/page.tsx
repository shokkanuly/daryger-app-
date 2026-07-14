"use client";

import { useEffect, useState } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Clock, 
  AlertTriangle, 
  Inbox,
  Filter,
  Search,
  Check,
  UserCheck,
  Building
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Appeal {
  id: string;
  channel: string;
  externalRef: string | null;
  subject: string;
  body: string;
  status: string;
  slaDueAt: string;
  assignedTo: string | null;
  createdAt: string;
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/appeals");
      if (res.ok) {
        const data = await res.json();
        setAppeals(data);
        if (data.length > 0 && !selectedAppeal) {
          setSelectedAppeal(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching appeals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const handleUpdate = async (id: string, updates: { status?: string; assignedTo?: string | null }) => {
    try {
      setUpdating(id);
      const res = await fetch(`/api/appeals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppeals((prev) => prev.map((a) => (a.id === id ? updated : a)));
        if (selectedAppeal?.id === id) {
          setSelectedAppeal(updated);
        }
      }
    } catch (err) {
      console.error("Failed to update appeal:", err);
    } finally {
      setUpdating(null);
    }
  };

  const getSlaTimeRemaining = (dueDateStr: string, status: string) => {
    if (status === "RESOLVED") return { text: "Resolved", color: "text-slate-500", isOverdue: false };
    
    const diff = new Date(dueDateStr).getTime() - Date.now();
    if (diff <= 0) {
      return { text: "OVERDUE", color: "text-red-500 font-semibold animate-pulse", isOverdue: true };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) {
      return { text: `${hours}h remaining`, color: "text-orange-500 font-medium", isOverdue: false };
    }
    
    const days = Math.floor(hours / 24);
    return { text: `${days}d remaining`, color: "text-teal-600", isOverdue: false };
  };

  const filteredAppeals = appeals.filter((a) => {
    const matchesChannel = filterChannel === "ALL" || a.channel === filterChannel;
    const matchesStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchesSearch = 
      a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.externalRef && a.externalRef.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesChannel && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Citizen Appeals Inbox</h1>
            <p className="mt-1 text-sm text-slate-500">
              Aggregated case inbox across iKomek, local CRM, and E-Otinish portals.
            </p>
          </div>
          <Button onClick={fetchAppeals} disabled={loading} className="w-fit bg-teal-600 hover:bg-teal-700 text-white">
            Sync New Appeals
          </Button>
        </header>

        {/* Filters and Search Bar */}
        <section className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 items-center">
          <div className="relative col-span-2">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject, body, or reference ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pr-4 pl-10 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="ALL">All Channels</option>
              <option value="IKOMEK">iKomek 109</option>
              <option value="CRM">Clinic CRM</option>
              <option value="EOTINISH">E-Otinish</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </section>

        {/* Content Body Split Panel */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* List Section */}
          <section className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {loading && appeals.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-12">Loading appeals...</p>
            ) : filteredAppeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
                <Inbox className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-900">No appeals found</p>
                <p className="text-xs text-slate-500">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              filteredAppeals.map((appeal) => {
                const sla = getSlaTimeRemaining(appeal.slaDueAt, appeal.status);
                const isSelected = selectedAppeal?.id === appeal.id;
                return (
                  <div
                    key={appeal.id}
                    onClick={() => setSelectedAppeal(appeal)}
                    className={`group relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      isSelected 
                        ? "border-teal-600 bg-teal-50/20 shadow-sm" 
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-400 tracking-wider">
                        {appeal.channel}
                      </span>
                      <span className={`text-xs ${sla.color}`}>
                        {sla.text}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-teal-700">
                      {appeal.subject}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {appeal.body}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Ref: {appeal.externalRef || "N/A"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                          appeal.status === "NEW" ? "bg-blue-500" :
                          appeal.status === "IN_PROGRESS" ? "bg-orange-500" :
                          appeal.status === "RESOLVED" ? "bg-teal-500" : "bg-red-500"
                        }`} />
                        <span className="text-[10px] font-medium text-slate-600 uppercase">
                          {appeal.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Details Section */}
          <section className="lg:col-span-2">
            {selectedAppeal ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-medium">
                        {selectedAppeal.channel}
                      </Badge>
                      {selectedAppeal.externalRef && (
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {selectedAppeal.externalRef}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">
                      {selectedAppeal.subject}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${
                      selectedAppeal.status === "NEW" ? "bg-blue-50 text-blue-700 border-blue-100" :
                      selectedAppeal.status === "IN_PROGRESS" ? "bg-orange-50 text-orange-700 border-orange-100" :
                      selectedAppeal.status === "RESOLVED" ? "bg-teal-50 text-teal-700 border-teal-100" :
                      "bg-red-50 text-red-700 border-red-100"
                    } border text-xs font-semibold px-2.5 py-1 uppercase`}>
                      {selectedAppeal.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Appeal Description</h4>
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selectedAppeal.body}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">SLA Deadline</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(selectedAppeal.slaDueAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Assigned Operator</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedAppeal.assignedTo || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Administration Panel */}
                <div className="mt-8 border-t border-slate-100 pt-6 flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleUpdate(selectedAppeal.id, { assignedTo: "ops@daryger.kz" })}
                    disabled={selectedAppeal.assignedTo === "ops@daryger.kz" || updating === selectedAppeal.id}
                    className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50"
                  >
                    <UserCheck className="h-4 w-4" /> Assign to Ops
                  </Button>
                  <Button
                    onClick={() => handleUpdate(selectedAppeal.id, { status: "IN_PROGRESS" })}
                    disabled={selectedAppeal.status === "IN_PROGRESS" || selectedAppeal.status === "RESOLVED" || updating === selectedAppeal.id}
                    className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" /> Start Review
                  </Button>
                  <Button
                    onClick={() => handleUpdate(selectedAppeal.id, { status: "RESOLVED" })}
                    disabled={selectedAppeal.status === "RESOLVED" || updating === selectedAppeal.id}
                    className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Resolve Case
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
                <Building className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Select an appeal to view full details and perform operations.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
