import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, MessageCircle, Home, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OPS_WHATSAPP_NUMBER } from "@/lib/config";

export const Route = createFileRoute("/selesai/$id")({
  head: () => ({ meta: [{ title: "Laporan Selesai — Driver Check" }] }),
  component: SuccessPage,
});

type Inspection = {
  id: string;
  driver_name: string;
  driver_id: string;
  vehicle_plate: string;
  vehicle_type: string | null;
  odometer: string | null;
  failed_items: { label: string; category: string }[];
  notes: string | null;
  overall_status: string;
  created_at: string;
};

function SuccessPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setData(data as unknown as Inspection);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Laporan tidak ditemukan.</p>
        <Link to="/" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const isPass = data.overall_status === "lulus";
  const waMessage = buildWaMessage(data);
  const waUrl = `https://wa.me/${OPS_WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;

  async function markSent() {
    await supabase
      .from("vehicle_inspections")
      .update({ whatsapp_sent: true })
      .eq("id", id);
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Status header */}
      <div
        className={`px-5 pb-10 pt-12 text-center text-white`}
        style={{
          background: isPass
            ? "linear-gradient(135deg, oklch(0.55 0.17 150), oklch(0.65 0.17 150))"
            : "linear-gradient(135deg, oklch(0.7 0.16 80), oklch(0.78 0.16 65))",
        }}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          {isPass ? (
            <CheckCircle2 className="h-12 w-12" />
          ) : (
            <AlertTriangle className="h-12 w-12" />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-bold">
          {isPass ? "Pengecekan Selesai!" : "Perlu Perhatian"}
        </h1>
        <p className="mt-1.5 text-sm opacity-90">
          {isPass
            ? "Kendaraan siap berangkat. Selamat bertugas! 🚛"
            : `${data.failed_items.length} item perlu ditindaklanjuti.`}
        </p>
      </div>

      <main className="mx-auto -mt-6 max-w-2xl px-4">
        {/* Summary card */}
        <div className="rounded-2xl border bg-card p-5 shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ringkasan Laporan
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Driver" value={`${data.driver_name} (${data.driver_id})`} />
            <Row label="Kendaraan" value={data.vehicle_plate} />
            {data.vehicle_type && <Row label="Jenis" value={data.vehicle_type} />}
            {data.odometer && <Row label="Odometer" value={`${data.odometer} km`} />}
            <Row label="Waktu" value={formatDate(data.created_at)} />
          </div>

          {data.failed_items.length > 0 && (
            <div className="mt-4 rounded-xl bg-destructive/10 p-3">
              <h3 className="text-xs font-semibold uppercase text-destructive">
                Item Perlu Perhatian
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {data.failed_items.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-destructive">•</span>
                    <span>
                      <span className="text-muted-foreground">{it.category}: </span>
                      {it.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.notes && (
            <div className="mt-4 rounded-xl bg-secondary p-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Catatan
              </h3>
              <p className="mt-1 text-sm">{data.notes}</p>
            </div>
          )}
        </div>

        {/* WA Send */}
        <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Kirim ke Staff Operasional</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap tombol di bawah untuk membuka WhatsApp dengan pesan laporan siap kirim.
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markSent}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="h-5 w-5" />
            Kirim Laporan via WhatsApp
          </a>
        </div>

        <Link
          to="/"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border bg-card py-3.5 text-sm font-semibold text-foreground shadow-sm"
        >
          <Home className="h-4 w-4" /> Kembali ke Beranda
        </Link>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildWaMessage(d: Inspection) {
  const isPass = d.overall_status === "lulus";
  const lines: string[] = [];
  lines.push("*LAPORAN PENGECEKAN KENDARAAN*");
  lines.push(isPass ? "✅ Status: LULUS — Siap Berangkat" : "⚠️ Status: PERLU PERHATIAN");
  lines.push("");
  lines.push(`👤 Driver: ${d.driver_name} (${d.driver_id})`);
  lines.push(`🚛 Plat: ${d.vehicle_plate}`);
  if (d.vehicle_type) lines.push(`🏷️ Jenis: ${d.vehicle_type}`);
  if (d.odometer) lines.push(`📏 Odometer: ${d.odometer} km`);
  lines.push(`🕒 Waktu: ${formatDate(d.created_at)}`);

  if (d.failed_items.length > 0) {
    lines.push("");
    lines.push(`*Item perlu perhatian (${d.failed_items.length}):*`);
    d.failed_items.forEach((it) => {
      lines.push(`• ${it.category}: ${it.label}`);
    });
  }

  if (d.notes) {
    lines.push("");
    lines.push(`*Catatan:*`);
    lines.push(d.notes);
  }

  lines.push("");
  lines.push(`ID Laporan: ${d.id.slice(0, 8)}`);
  return lines.join("\n");
}
