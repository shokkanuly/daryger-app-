"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, ChevronRight, MapPin, Clock, Calendar, CheckCircle, AlertTriangle, Phone 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Patient {
  name: string;
  town: string | null;
  phone: string | null;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  clinic: string | null;
  notes: string | null;
  status: string;
  patient: Patient;
}

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  isBooked: boolean;
}

interface DoctorProfile {
  clinic: string;
  region: string;
}

interface ScheduleCalendarClientProps {
  appointments: Appointment[];
  timeSlots: TimeSlot[];
  profile: DoctorProfile | null;
}

export default function ScheduleCalendarClient({
  appointments,
  timeSlots,
  profile,
}: ScheduleCalendarClientProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [viewDate, setViewDate] = useState(() => new Date());

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

  const cells: { day: number | null; dateStr: string | null; hasAppointments: boolean; hasSlots: boolean; isToday: boolean }[] = [];

  // Previous month padding
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null, hasAppointments: false, hasSlots: false, isToday: false });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    
    const hasAppointments = appointments.some((a) => a.date === dateStr);
    const hasSlots = timeSlots.some((ts) => ts.date === dateStr);
    const isToday = dateStr === todayStr;

    cells.push({ day: d, dateStr, hasAppointments, hasSlots, isToday });
  }

  // Filter schedules for the currently selected date
  const selectedDateAppointments = appointments.filter((a) => a.date === selectedDate);
  const selectedDateSlots = timeSlots.filter((ts) => ts.date === selectedDate);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/doctor" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule Calendar</h1>
          <p className="text-slate-500">{profile?.clinic || "Regional Clinic"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Monthly Calendar Grid */}
        <div className="lg:col-span-7">
          <Card className="p-4 shadow-sm border border-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Select Date to View Patients</h2>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span className="font-semibold text-slate-700 text-sm">
                  {monthNames[month]} {year}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day Titles */}
              <div className="grid grid-cols-7 text-center py-2 bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/10">
                {cells.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedDate;
                  return (
                    <div
                      key={idx}
                      className="aspect-square p-1 flex flex-col justify-center items-center relative min-h-[50px] bg-white border-b border-r border-slate-100"
                    >
                      {cell.day ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (cell.dateStr) {
                              setSelectedDate(cell.dateStr);
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all relative ${
                            isSelected
                              ? "bg-teal-600 text-white shadow-md scale-105"
                              : cell.isToday
                              ? "bg-red-500 text-white shadow-sm"
                              : "text-slate-900 hover:bg-slate-100 cursor-pointer"
                          }`}
                        >
                          {cell.day}
                          {/* Dot indicator for scheduled patients */}
                          {cell.hasAppointments && !isSelected && (
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
                          )}
                          {/* Dot indicator for available slots (only if no appointments) */}
                          {!cell.hasAppointments && cell.hasSlots && !isSelected && (
                            <span className="w-1 h-1 bg-teal-400 rounded-full absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 flex gap-4 justify-center text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Scheduled Patients
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                Available Slots
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Today
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: List of Patients & Slots for selected day */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-4 shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" /> 
              {formatDate(selectedDate)}
            </h2>

            {/* Scheduled Appointments */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Scheduled Patients ({selectedDateAppointments.length})
              </h3>
              
              {selectedDateAppointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm text-slate-400">No appointments scheduled for this day.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateAppointments.map((apt) => (
                    <div 
                      key={apt.id} 
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{apt.patient.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" /> {apt.patient.town || "Shakhtinsk"}
                          </p>
                          {apt.patient.phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-slate-400" /> {apt.patient.phone}
                            </p>
                          )}
                          {apt.notes && (
                            <p className="text-xs italic text-slate-400 mt-1.5 border-t border-slate-100 pt-1">
                              &ldquo;{apt.notes}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                            <Clock className="h-3 w-3" /> {apt.time}
                          </span>
                          <div className="mt-1">
                            <Badge className="bg-blue-50 text-blue-800 border-blue-100 text-[10px] uppercase font-bold">
                              {apt.type.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Time Slots */}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Available Open Slots ({selectedDateSlots.length})
              </h3>

              {selectedDateSlots.length === 0 ? (
                <p className="text-xs text-slate-400">No open time slots configured for this day.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {selectedDateSlots.map((slot) => (
                    <div 
                      key={slot.id} 
                      className="rounded border border-slate-200 py-1.5 text-center text-xs font-medium text-slate-600 bg-white"
                    >
                      {slot.time}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
