"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Calendar, MapPin, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

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

export default function AppointmentsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    fetch("/api/doctors").then((r) => r.json()).then(setDoctors);
    fetch("/api/appointments").then((r) => r.json()).then(setAppointments);
  }, []);

  const doctor = doctors.find((d) => d.user.id === selectedDoctor);
  const slots = doctor?.timeSlots ?? [];

  async function handleBook() {
    if (!selectedDoctor || !selectedSlot) return;
    setBooking(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorId: selectedDoctor,
        date: selectedSlot.date,
        time: selectedSlot.time,
        type: "IN_PERSON",
        clinic: doctor?.clinic,
        notes: "Booked via Daryger — priority slot",
      }),
    });
    if (res.ok) {
      setBooked(true);
      const updated = await fetch("/api/appointments").then((r) => r.json());
      setAppointments(updated);
      setSelectedSlot(null);
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

          {booked && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle className="h-4 w-4" /> Appointment booked successfully!
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Doctor</label>
              <Select value={selectedDoctor} onChange={(e) => { setSelectedDoctor(e.target.value); setSelectedSlot(null); setBooked(false); }}>
                <option value="">Select a doctor</option>
                {doctors.map((d) => (
                  <option key={d.user.id} value={d.user.id}>
                    {d.user.name} — {d.specialty}
                  </option>
                ))}
              </Select>
            </div>

            {doctor && (
              <p className="text-sm text-slate-500">
                <MapPin className="inline h-3.5 w-3.5" /> {doctor.clinic}
              </p>
            )}

            {slots.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium">Available slots</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.slice(0, 12).map((slot) => (
                    <button
                      key={`${slot.date}-${slot.time}`}
                      onClick={() => { setSelectedSlot(slot); setBooked(false); }}
                      className={`rounded-lg border p-2 text-xs transition-colors ${
                        selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-slate-200 hover:border-teal-300"
                      }`}
                    >
                      <p className="font-medium">{formatDate(slot.date)}</p>
                      <p className="text-slate-500">{slot.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedSlot || booking}
              onClick={handleBook}
            >
              {booking ? "Booking..." : "Confirm appointment"}
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
