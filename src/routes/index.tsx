import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, QrCode, ShieldCheck, Truck } from "lucide-react";
import { COMPANY_NAME } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Driver Check — Pengecekan Kendaraan Harian" },
      {
        name: "description",
        content:
          "Aplikasi pengecekan kendaraan harian untuk driver logistik. Scan, ceklis, kirim laporan via WhatsApp.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header
        className="relative overflow-hidden text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-2xl px-5 pt-10 pb-16 sm:pt-16 sm:pb-24">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Truck className="h-4 w-4" />
            <span>{COMPANY_NAME}</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Cek Kendaraan
            <br />
            Sebelum Berangkat
          </h1>
          <p className="mt-3 text-base opacity-90 sm:text-lg">
            Pastikan kendaraan aman & siap jalan. Isi ceklis harian, laporan
            otomatis terkirim ke staff operasional.
          </p>

          <Link
            to="/pengecekan"
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold shadow-lg transition-transform active:scale-[0.98] sm:w-auto"
            style={{
              background: "var(--gradient-accent)",
              color: "var(--accent-foreground)",
            }}
          >
            <ClipboardCheck className="h-5 w-5" />
            Mulai Pengecekan
          </Link>
        </div>

        <div
          className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full opacity-20"
          style={{ background: "var(--accent)" }}
        />
      </header>

      {/* How it works */}
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          3 Langkah Mudah
        </h2>
        <div className="mt-4 grid gap-3">
          <Step
            n={1}
            icon={<QrCode className="h-5 w-5" />}
            title="Scan QR / Buka aplikasi"
            desc="QR code di kendaraan mengarahkan langsung ke halaman ini."
          />
          <Step
            n={2}
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Isi ceklis harian"
            desc="Tandai semua poin kendaraan: dokumen, mesin, lampu, ban, rem, dll."
          />
          <Step
            n={3}
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Kirim laporan WhatsApp"
            desc="Tap satu tombol — laporan langsung terkirim ke staff operasional."
          />
        </div>

        <div className="mt-10 rounded-2xl border bg-card p-5 text-center text-sm text-muted-foreground shadow-sm">
          Pengecekan kendaraan adalah <b className="text-foreground">SOP wajib</b>{" "}
          sebelum keberangkatan. Isi dengan jujur demi keselamatan bersama. 🚛
        </div>
      </main>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-accent">LANGKAH {n}</span>
        </div>
        <h3 className="mt-0.5 font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
