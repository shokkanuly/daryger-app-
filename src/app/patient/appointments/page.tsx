"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, MapPin, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Doctor {
  id: string;
  specialty: string;
  clinic: string;
  user: { id: string; name: string; town: string | null };
  timeSlots: { id: string; date: string; time: string }[];
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  clinic: string | null;
  doctor: { name: string };
}

function AppointmentsPageContent() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ id: string; date: string; time: string } | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [referralApproved, setReferralApproved] = useState<boolean | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/doctors").then((r) => r.json()).then(setDoctors);
    fetch("/api/appointments").then((r) => r.json()).then(setAppointments);
    fetch("/api/appointments/check-referral")
      .then((r) => r.json())
      .then((data) => setReferralApproved(data.approved))
      .catch(() => setReferralApproved(false));
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Get total days in month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Get start day of week (0 = Mon, 6 = Sun)
  let startDayOfWeek = new Date(year, month, 1).getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const cells: { day: number | null; dateStr: string | null; hasSlots: boolean; isToday: boolean }[] = [];

  // Previous month padding
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null, hasSlots: false, isToday: false });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const hasSlots = doctors.some((doc) =>
      doc.timeSlots.some((ts) => ts.date === dateStr)
    );
    const isToday = dateStr === todayStr;
    cells.push({ day: d, dateStr, hasSlots, isToday });
  }

  // Get all unique dates that have unbooked slots
  const availableDates = Array.from(
    new Set(doctors.flatMap((d) => d.timeSlots.map((ts) => ts.date)))
  ).sort();

  const doctorsOnSelectedDate = selectedDate
    ? doctors.filter((d) => d.timeSlots.some((ts) => ts.date === selectedDate))
    : [];

  const doctor = doctors.find((d) => d.user.id === selectedDoctor);
  const slotsOnSelectedDate = doctor && selectedDate
    ? doctor.timeSlots.filter((ts) => ts.date === selectedDate)
    : [];

  const searchParams = useSearchParams();
  const initClinic = searchParams.get("clinic");
  const initService = searchParams.get("service");

  async function handleBook() {
    if (!selectedDoctor || !selectedSlot) return;
    setBooking(true);

    let bookingNotes = "Booked via Daryger — priority slot";
    if (initService && initClinic) {
      bookingNotes = `Standard Service Compared: "${initService}" at "${initClinic}"`;
    }

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorId: selectedDoctor,
        date: selectedSlot.date,
        time: selectedSlot.time,
        type: "IN_PERSON",
        clinic: initClinic || doctor?.clinic,
        notes: bookingNotes,
      }),
    });
    if (res.ok) {
      setBooked(true);
      const updated = await fetch("/api/appointments").then((r) => r.json());
      setAppointments(updated);
      setSelectedSlot(null);
      setSelectedDate("");
      setSelectedDoctor("");
    }
    setBooking(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/patient" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
      <p className="text-slate-500">Book a guaranteed priority slot at a regional clinic</p>

      {appointments.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Your appointments</h2>
          <div className="space-y-3">
            {appointments.map((apt) => (
              <Card key={apt.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{apt.doctor.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {apt.clinic}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-teal-700">{formatDate(apt.date)}</p>
                    <p className="text-sm text-slate-500">{apt.time}</p>
                    <Badge className="mt-1 bg-emerald-100 text-emerald-800 border-emerald-200">{apt.status}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" /> Book new appointment
            </CardTitle>
            <CardDescription>Select a doctor and available time slot</CardDescription>
          </CardHeader>

          {referralApproved === null ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              Checking booking eligibility...
            </div>
          ) : !referralApproved ? (
            <div className="p-6 text-center border-t border-slate-100">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 mb-3">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Doctor Referral Required</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Priority clinic booking is restricted to patients with a doctor's referral. 
                Please start a consultation first to receive approval from a Daryger doctor.
              </p>
              <div className="mt-4">
                <Link href="/patient/consult">
                  <Button size="sm">Start medical triage</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-6 border-t border-slate-100">
              {booked && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle className="h-4 w-4" /> Appointment booked successfully!
                </div>
              )}

              <div className="space-y-4">
                {/* 1. Date Selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">1. Choose Date (Month View)</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Month Header Navigation */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <span className="font-semibold text-slate-700 text-sm">
                        {monthNames[month]} {year}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Day Names Labels */}
                    <div className="grid grid-cols-7 text-center py-2 bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                      <div>Sun</div>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/20">
                      {cells.map((cell, idx) => {
                        const isSelected = cell.dateStr === selectedDate;
                        return (
                          <div
                            key={idx}
                            className="aspect-square p-1 flex flex-col justify-center items-center relative min-h-[48px] bg-white border-b border-r border-slate-100"
                          >
                            {cell.day ? (
                              <button
                                type="button"
                                disabled={!cell.hasSlots}
                                onClick={() => {
                                  if (cell.dateStr) {
                                    setSelectedDate(cell.dateStr);
                                    setSelectedDoctor("");
                                    setSelectedSlot(null);
                                    setBooked(false);
                                  }
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                  isSelected
                                    ? "bg-teal-600 text-white shadow-md scale-105"
                                    : cell.isToday
                                    ? "bg-red-500 text-white shadow-sm"
                                    : cell.hasSlots
                                    ? "text-slate-900 hover:bg-teal-50 hover:text-teal-700 cursor-pointer"
                                    : "text-slate-300 cursor-not-allowed"
                                }`}
                              >
                                {cell.day}
                              </button>
                            ) : null}

                            {cell.hasSlots && !isSelected && !cell.isToday && (
                              <span className="w-1 h-1 bg-teal-500 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {selectedDate && (
                    <p className="mt-2 text-xs font-medium text-teal-600">
                      Selected Date: {formatDate(selectedDate)}
                    </p>
                  )}
                </div>

                {/* 2. Doctor Selector */}
                {selectedDate && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">2. Choose Doctor</label>
                    <Select
                      value={selectedDoctor}
                      onChange={(e) => {
                        setSelectedDoctor(e.target.value);
                        setSelectedSlot(null);
                        setBooked(false);
                      }}
                    >
                      <option value="">Select a doctor working on this day</option>
                      {doctorsOnSelectedDate.map((d) => (
                        <option key={d.user.id} value={d.user.id}>
                          {d.user.name} — {d.specialty} ({d.clinic})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* 3. Available Slots Selector */}
                {selectedDate && selectedDoctor && slotsOnSelectedDate.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">3. Choose Time Slot</label>
                    <div className="grid grid-cols-4 gap-2">
                      {slotsOnSelectedDate.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot);
                            setBooked(false);
                          }}
                          className={`rounded-lg border p-2 text-center text-xs transition-colors ${
                            selectedSlot?.id === slot.id
                              ? "border-teal-500 bg-teal-50 text-teal-800 font-semibold"
                              : "border-slate-200 hover:border-teal-300 bg-white"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && selectedDoctor && slotsOnSelectedDate.length === 0 && (
                  <p className="text-xs text-amber-600">No timeslots left for this doctor on this day.</p>
                )}

                <Button
                  className="w-full mt-2"
                  disabled={!selectedSlot || booking}
                  onClick={handleBook}
                >
                  {booking ? "Booking..." : "Confirm appointment"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading appointments...</div>}>
      <AppointmentsPageContent />
    </Suspense>
  );
}
