import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { z } from "zod";
import { CHECKLIST } from "@/lib/checklist-items";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/pengecekan")({
  head: () => ({
    meta: [{ title: "Pengecekan Kendaraan — Driver Check" }],
  }),
  component: InspectionPage,
});

const driverSchema = z.object({
  driver_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(80),
  driver_id: z.string().trim().min(1, "ID driver wajib diisi").max(40),
  vehicle_plate: z
    .string()
    .trim()
    .min(2, "Plat wajib diisi")
    .max(15)
    .regex(/^[A-Za-z0-9 \-]+$/, "Plat tidak valid"),
  vehicle_type: z.string().trim().max(40).optional().or(z.literal("")),
  odometer: z.string().trim().max(15).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

type Driver = z.infer<typeof driverSchema>;
type Status = "ok" | "ng" | undefined;

function InspectionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"driver" | "check">("driver");
  const [driver, setDriver] = useState<Driver>({
    driver_name: "",
    driver_id: "",
    vehicle_plate: "",
    vehicle_type: "",
    odometer: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, Status>>({});
  const [submitting, setSubmitting] = useState(false);

  const totalItems = useMemo(
    () => CHECKLIST.reduce((s, c) => s + c.items.length, 0),
    [],
  );
  const filledCount = Object.values(checks).filter(Boolean).length;
  const failedCount = Object.values(checks).filter((v) => v === "ng").length;
  const progress = Math.round((filledCount / totalItems) * 100);

  function submitDriver(e: React.FormEvent) {
    e.preventDefault();
    const result = driverSchema.safeParse(driver);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep("check");
    window.scrollTo({ top: 0 });
  }

  async function submitChecklist() {
    if (filledCount < totalItems) {
      toast.error(`Masih ada ${totalItems - filledCount} item belum diceklis`);
      return;
    }
    setSubmitting(true);

    const failedItems: { label: string; category: string }[] = [];
    for (const cat of CHECKLIST) {
      for (const it of cat.items) {
        if (checks[it.key] === "ng") {
          failedItems.push({ label: it.label, category: cat.title });
        }
      }
    }

    const { data, error } = await supabase
      .from("vehicle_inspections")
      .insert({
        driver_name: driver.driver_name,
        driver_id: driver.driver_id,
        vehicle_plate: driver.vehicle_plate.toUpperCase(),
        vehicle_type: driver.vehicle_type || null,
        odometer: driver.odometer || null,
        checklist: checks,
        failed_items: failedItems,
        notes: driver.notes || null,
        overall_status: failedItems.length === 0 ? "lulus" : "perlu_perhatian",
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error || !data) {
      toast.error("Gagal menyimpan laporan. Coba lagi.");
      return;
    }

    navigate({ to: "/selesai/$id", params: { id: data.id } });
  }

  function setStatus(key: string, status: Status) {
    setChecks((s) => ({ ...s, [key]: status }));
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 text-primary-foreground shadow-md"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold leading-tight">
              {step === "driver" ? "Data Driver & Kendaraan" : "Ceklis Kendaraan"}
            </h1>
            <p className="text-xs opacity-80">
              {step === "driver" ? "Langkah 1 dari 2" : "Langkah 2 dari 2"}
            </p>
          </div>
          {step === "check" && (
            <div className="text-right">
              <div className="text-sm font-semibold">
                {filledCount}/{totalItems}
              </div>
              <div className="text-[10px] opacity-80">item</div>
            </div>
          )}
        </div>
        {step === "check" && (
          <div className="h-1 w-full bg-white/15">
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        )}
      </div>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {step === "driver" ? (
          <form onSubmit={submitDriver} className="space-y-4">
            <Field
              label="Nama Driver"
              required
              error={errors.driver_name}
              value={driver.driver_name}
              onChange={(v) => setDriver({ ...driver, driver_name: v })}
              placeholder="Contoh: Budi Santoso"
            />
            <Field
              label="ID / NIK Driver"
              required
              error={errors.driver_id}
              value={driver.driver_id}
              onChange={(v) => setDriver({ ...driver, driver_id: v })}
              placeholder="Contoh: DRV-001"
            />
            <Field
              label="Nomor Plat Kendaraan"
              required
              error={errors.vehicle_plate}
              value={driver.vehicle_plate}
              onChange={(v) =>
                setDriver({ ...driver, vehicle_plate: v.toUpperCase() })
              }
              placeholder="Contoh: B 1234 ABC"
            />
            <Field
              label="Jenis Kendaraan (opsional)"
              value={driver.vehicle_type ?? ""}
              onChange={(v) => setDriver({ ...driver, vehicle_type: v })}
              placeholder="Contoh: Pickup, CDD, Tronton"
            />
            <Field
              label="Odometer / KM (opsional)"
              value={driver.odometer ?? ""}
              onChange={(v) => setDriver({ ...driver, odometer: v })}
              placeholder="Contoh: 124500"
              inputMode="numeric"
            />

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
            >
              Lanjut ke Ceklis →
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <Banner failedCount={failedCount} filledCount={filledCount} totalItems={totalItems} />

            {CHECKLIST.map((cat) => (
              <section
                key={cat.key}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <header className="flex items-center gap-2 border-b bg-secondary/50 px-4 py-3">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="font-semibold text-foreground">{cat.title}</h2>
                </header>
                <ul className="divide-y">
                  {cat.items.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="flex-1 text-sm text-foreground">
                        {item.label}
                      </span>
                      <div className="flex shrink-0 gap-2">
                        <StatusBtn
                          active={checks[item.key] === "ok"}
                          variant="ok"
                          onClick={() => setStatus(item.key, "ok")}
                          label="Baik"
                        />
                        <StatusBtn
                          active={checks[item.key] === "ng"}
                          variant="ng"
                          onClick={() => setStatus(item.key, "ng")}
                          label="Rusak"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Catatan tambahan (opsional)
              </label>
              <textarea
                value={driver.notes ?? ""}
                onChange={(e) =>
                  setDriver({ ...driver, notes: e.target.value })
                }
                rows={3}
                maxLength={500}
                placeholder="Contoh: Ban depan kanan agak gundul, perlu diganti minggu depan."
                className="w-full rounded-xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </main>

      {/* Sticky submit footer (checklist step) */}
      {step === "check" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={submitChecklist}
              disabled={submitting || filledCount < totalItems}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Menyimpan...
                </>
              ) : filledCount < totalItems ? (
                `Lengkapi ${totalItems - filledCount} item lagi`
              ) : (
                "Selesai & Buat Laporan"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={80}
        className={`w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring ${
          error ? "border-destructive" : ""
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function StatusBtn({
  active,
  variant,
  onClick,
  label,
}: {
  active: boolean;
  variant: "ok" | "ng";
  onClick: () => void;
  label: string;
}) {
  const isOk = variant === "ok";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        active
          ? isOk
            ? "border-transparent bg-success text-success-foreground"
            : "border-transparent bg-destructive text-destructive-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-secondary"
      }`}
      aria-pressed={active}
    >
      {isOk ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function Banner({
  failedCount,
  filledCount,
  totalItems,
}: {
  failedCount: number;
  filledCount: number;
  totalItems: number;
}) {
  if (filledCount === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-secondary/40 p-4 text-sm text-muted-foreground">
        💡 Tap <b className="text-success">Baik</b> jika kondisi normal, atau{" "}
        <b className="text-destructive">Rusak</b> jika ada masalah.
      </div>
    );
  }
  if (failedCount === 0 && filledCount === totalItems) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-success">
        ✅ Semua dalam kondisi baik. Kendaraan siap berangkat!
      </div>
    );
  }
  if (failedCount > 0) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        ⚠️ {failedCount} item perlu perhatian. Jelaskan di catatan jika perlu.
      </div>
    );
  }
  return null;
}
