import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Home,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
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
  delivery_destination: string | null;
  vehicle_plate: string;
  stnk_expiry: string | null;
  kir_expiry: string | null;
  tire_pressure_front: string | null;
  tire_pressure_rear: string | null;
  failed_items: { label: string; category: string }[];
  photos: Record<string, string>;
  notes: string | null;
  overall_status: string;
  excel_url: string | null;
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
        <Link
          to="/"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const isPass = data.overall_status === "lulus";
  const reportUrl =
    typeof window !== "undefined" ? `${window.location.origin}/selesai/${id}` : "";
  const waMessage = buildWaMessage(data, reportUrl);
  const waUrl = `https://wa.me/${OPS_WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;

  const photoEntries = Object.entries(data.photos || {});

  async function markSent() {
    await supabase
      .from("vehicle_inspections")
      .update({ whatsapp_sent: true })
      .eq("id", id);
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div
        className="px-5 pb-10 pt-12 text-center text-white"
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

      <main className="mx-auto -mt-6 max-w-2xl space-y-5 px-4">
        <div className="rounded-2xl border bg-card p-5 shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ringkasan Laporan
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            <Row
              label="Driver"
              value={`${data.driver_name} (${data.driver_id})`}
            />
            {data.delivery_destination && (
              <Row label="Tujuan" value={data.delivery_destination} />
            )}
            <Row label="Plat" value={data.vehicle_plate} />
            {data.stnk_expiry && (
              <Row label="STNK berlaku" value={formatDateOnly(data.stnk_expiry)} />
            )}
            {data.kir_expiry && (
              <Row label="KIR berlaku" value={formatDateOnly(data.kir_expiry)} />
            )}
            {(data.tire_pressure_front || data.tire_pressure_rear) && (
              <Row
                label="Tekanan ban"
                value={`Depan ${data.tire_pressure_front || "-"} psi · Belakang ${data.tire_pressure_rear || "-"} psi`}
              />
            )}
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

        {photoEntries.length > 0 && (
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">
              Foto ({photoEntries.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap foto untuk perbesar.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photoEntries.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border bg-secondary"
                >
                  <img
                    src={url}
                    alt={key}
                    loading="lazy"
                    className="h-24 w-full object-cover"
                  />
                  <div className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">
                    {key}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {data.excel_url && (
          <a
            href={data.excel_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary/20 bg-card py-3.5 text-sm font-semibold text-primary shadow-sm transition active:scale-[0.98]"
          >
            <FileSpreadsheet className="h-5 w-5" />
            Download Laporan (Excel .xlsx)
          </a>
        )}

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Kirim ke Staff Operasional</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pesan WhatsApp berisi ringkasan + link laporan online
            {data.excel_url ? " + link file Excel" : ""}.
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-card py-3.5 text-sm font-semibold text-foreground shadow-sm"
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
function formatDateOnly(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildWaMessage(d: Inspection, reportUrl: string) {
  const isPass = d.overall_status === "lulus";
  const lines: string[] = [];
  lines.push("*LAPORAN PENGECEKAN KENDARAAN*");
  lines.push(
    isPass
      ? "✅ Status: LULUS — Siap Berangkat"
      : "⚠️ Status: PERLU PERHATIAN",
  );
  lines.push("");
  lines.push(`👤 Driver: ${d.driver_name} (${d.driver_id})`);
  if (d.delivery_destination) lines.push(`🎯 Tujuan: ${d.delivery_destination}`);
  lines.push(`🚛 Plat: ${d.vehicle_plate}`);
  if (d.stnk_expiry) lines.push(`📄 STNK s/d: ${formatDateOnly(d.stnk_expiry)}`);
  if (d.kir_expiry) lines.push(`📄 KIR s/d: ${formatDateOnly(d.kir_expiry)}`);
  if (d.tire_pressure_front || d.tire_pressure_rear) {
    lines.push(
      `🛞 Tekanan ban: D ${d.tire_pressure_front || "-"} psi / B ${d.tire_pressure_rear || "-"} psi`,
    );
  }
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

  const photoCount = Object.keys(d.photos || {}).length;
  lines.push("");
  lines.push(`📸 ${photoCount} foto terlampir`);
  if (reportUrl) {
    lines.push(`🔗 Laporan online (lihat foto):`);
    lines.push(reportUrl);
  }
  if (d.excel_url) {
    lines.push("");
    lines.push(`📊 Download laporan Excel (.xlsx):`);
    lines.push(d.excel_url);
  }
  lines.push("");
  lines.push(`ID Laporan: ${d.id.slice(0, 8)}`);
  return lines.join("\n");
}
