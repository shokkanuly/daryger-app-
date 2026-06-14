import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  MapPin,
  MessageCircle,
  Calendar,
  Shield,
  Wifi,
  ArrowRight,
  Clock,
  Users,
} from "lucide-react";

const towns = ["Shakhtinsk", "Temirtau", "Abay", "Saran", "Satbayev", "Karkaraly"];

export default function HomePage() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-emerald-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
              <MapPin className="h-3.5 w-3.5" />
              Karaganda Region · Қарағанды облысы
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              Healthcare without the journey to the city
            </h1>
            <p className="mt-5 text-lg text-teal-100 md:text-xl">
              Daryger connects residents of small towns and remote areas to on-call doctors in Karaganda — via low-bandwidth chat, automated triage, and guaranteed clinic appointments.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">The problem we solve</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            In Karaganda or Astana, a clinic is minutes away. In Shakhtinsk, Temirtau, or Abay — it means hours of travel, long queues, and no specialists nearby.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Clock, title: "Hours lost traveling", desc: "Round trips to Karaganda for a 15-minute consultation" },
            { icon: Users, title: "Unpredictable queues", desc: "Regional clinics overwhelmed with no appointment system" },
            { icon: Stethoscope, title: "No local specialists", desc: "Pediatricians, cardiologists, and therapists only in the city" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Icon className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">How Daryger works</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              { step: "1", icon: MessageCircle, title: "Open & describe", desc: "Low-bandwidth text/audio chat optimized for regional networks" },
              { step: "2", icon: Shield, title: "Automated triage", desc: "System collects symptoms and assesses urgency automatically" },
              { step: "3", icon: MapPin, title: "Regional routing", desc: "Connects you to an available doctor in the Karaganda region" },
              { step: "4", icon: Calendar, title: "Direct action", desc: "Instant tele-consultation or guaranteed priority clinic slot" },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-xl border border-teal-100 bg-teal-50/50 p-5">
                <span className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  {step}
                </span>
                <Icon className="mb-3 h-6 w-6 text-teal-600" />
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-slate-900 p-8 text-white md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Built for regional infrastructure</h2>
              <p className="mt-4 text-slate-300">
                Lightweight interface, minimal data usage, and offline-friendly design — because reliable broadband isn&apos;t guaranteed in every town.
              </p>
              <div className="mt-6 flex items-center gap-2 text-teal-400">
                <Wifi className="h-5 w-5" />
                <span className="text-sm font-medium">Optimized for low-bandwidth connections</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {towns.map((town) => (
                <span key={town} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm">
                  {town}
                </span>
              ))}
              <span className="rounded-full border border-teal-600 bg-teal-600/20 px-3 py-1.5 text-sm text-teal-300">
                + Karaganda hub
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Ready to try Daryger?</h2>
        <p className="mt-3 text-slate-600">Join as a patient or register your clinic today.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/register">
            <Button size="lg">Create patient account</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">Doctor login</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <span className="font-semibold text-slate-700">Daryger</span>
            <span>· Дәрiger</span>
          </div>
          <p>Telemedicine platform for the Karaganda region · Terricon Valley 2026</p>
        </div>
      </footer>
    </>
  );
}
