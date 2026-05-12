import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { z } from "zod";
import { CHECKLIST, VEHICLE_PHOTOS } from "@/lib/checklist-items";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PhotoInput } from "@/components/PhotoInput";
import { uploadInspectionExcel } from "@/lib/excel-report";

export const Route = createFileRoute("/pengecekan")({
  head: () => ({ meta: [{ title: "Pengecekan Kendaraan — Driver Check" }] }),
  component: InspectionPage,
});

const driverSchema = z.object({
  driver_id: z
    .string()
    .trim()
    .min(3, "NIK minimal 3 karakter")
    .max(40, "NIK maksimal 40 karakter")
    .regex(/^[A-Za-z0-9.\-]+$/, "NIK hanya huruf/angka"),
  driver_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(80),
  delivery_destination: z
    .string()
    .trim()
    .min(2, "Tujuan delivery wajib diisi")
    .max(120),
});

const vehicleSchema = z.object({
  vehicle_plate: z
    .string()
    .trim()
    .min(2, "Plat wajib diisi")
    .max(15)
    .regex(/^[A-Za-z0-9 \-]+$/, "Plat tidak valid"),
  stnk_expiry: z.string().min(1, "Masa berlaku STNK wajib diisi"),
  kir_expiry: z.string().min(1, "Masa berlaku KIR wajib diisi"),
});

type Status = "ok" | "ng";
type Step = "driver" | "vehicle" | "inspect";

function newSessionId() {
  return (
    "ses-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

function InspectionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("driver");
  const [sessionId] = useState(newSessionId);

  // Stage 1
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [destination, setDestination] = useState("");

  // Stage 2
  const [plate, setPlate] = useState("");
  const [stnkExpiry, setStnkExpiry] = useState("");
  const [kirExpiry, setKirExpiry] = useState("");

  // Photos (semua tahap)
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Stage 3
  const [checks, setChecks] = useState<Record<string, Status>>({});
  const [pressureFront, setPressureFront] = useState("");
  const [pressureRear, setPressureRear] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Hitung progress untuk tahap inspect
  const allStatusItems = useMemo(
    () =>
      CHECKLIST.flatMap((c) =>
        c.items
          .filter((i) => i.type === "status" || i.type === "status_photo")
          .map((i) => i.key),
      ),
    [],
  );
  const filledStatus = allStatusItems.filter((k) => checks[k]).length;
  const failedCount = allStatusItems.filter((k) => checks[k] === "ng").length;
  const progress = Math.round(
    (filledStatus / Math.max(1, allStatusItems.length)) * 100,
  );

  function setStatus(key: string, status: Status) {
    setChecks((s) => ({ ...s, [key]: status }));
  }
  function setPhoto(key: string, url: string | undefined) {
    setPhotos((p) => {
      const n = { ...p };
      if (url) n[key] = url;
      else delete n[key];
      return n;
    });
  }

  function submitDriver(e: React.FormEvent) {
    e.preventDefault();
    const r = driverSchema.safeParse({
      driver_id: driverId,
      driver_name: driverName,
      delivery_destination: destination,
    });
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep("vehicle");
    window.scrollTo({ top: 0 });
  }

  function submitVehicle(e: React.FormEvent) {
    e.preventDefault();
    const r = vehicleSchema.safeParse({
      vehicle_plate: plate,
      stnk_expiry: stnkExpiry,
      kir_expiry: kirExpiry,
    });
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      return;
    }
    // Foto wajib di tahap kendaraan
    const missing: string[] = [];
    for (const p of VEHICLE_PHOTOS) {
      if (!photos[p.key]) missing.push(p.label);
    }
    if (missing.length > 0) {
      toast.error(`Foto wajib belum lengkap: ${missing.join(", ")}`);
      return;
    }
    setErrors({});
    setStep("inspect");
    window.scrollTo({ top: 0 });
  }

  async function submitAll() {
    // Validasi: semua status item terisi
    const missingStatus = allStatusItems.filter((k) => !checks[k]);
    if (missingStatus.length > 0) {
      toast.error(`Masih ada ${missingStatus.length} item belum diceklis`);
      return;
    }
    // Validasi tekanan ban
    if (!pressureFront.trim() || !pressureRear.trim()) {
      toast.error("Isi tekanan ban depan & belakang");
      return;
    }
    // Foto wajib reguler: foto_semua_ban (type photo)
    if (!photos["foto_semua_ban"]) {
      toast.error("Foto semua ban wajib diupload");
      return;
    }
    // Foto wajib bersyarat: untuk item status_photo dengan status ng
    const missingNgPhotos: string[] = [];
    for (const cat of CHECKLIST) {
      for (const it of cat.items) {
        if (it.type === "status_photo" && checks[it.key] === "ng" && !photos[it.key]) {
          missingNgPhotos.push(it.label);
        }
      }
    }
    if (missingNgPhotos.length > 0) {
      toast.error(
        `Item bermasalah wajib disertai foto: ${missingNgPhotos.slice(0, 2).join(", ")}${
          missingNgPhotos.length > 2 ? "..." : ""
        }`,
      );
      return;
    }

    setSubmitting(true);

    const failedItems: { label: string; category: string }[] = [];
    for (const cat of CHECKLIST) {
      for (const it of cat.items) {
        if (
          (it.type === "status" || it.type === "status_photo") &&
          checks[it.key] === "ng"
        ) {
          failedItems.push({ label: it.label, category: cat.title });
        }
      }
    }

    const { data, error } = await supabase
      .from("vehicle_inspections")
      .insert({
        driver_name: driverName,
        driver_id: driverId,
        delivery_destination: destination,
        vehicle_plate: plate.toUpperCase(),
        stnk_expiry: stnkExpiry,
        kir_expiry: kirExpiry,
        tire_pressure_front: pressureFront,
        tire_pressure_rear: pressureRear,
        checklist: checks,
        failed_items: failedItems,
        photos,
        notes: notes || null,
        overall_status: failedItems.length === 0 ? "lulus" : "perlu_perhatian",
      })
      .select("id")
      .single();

    if (error || !data) {
      setSubmitting(false);
      toast.error("Gagal menyimpan laporan. Coba lagi.");
      return;
    }

    // Generate & upload Excel report (non-blocking error)
    try {
      const excelUrl = await uploadInspectionExcel({
        id: data.id,
        driver_name: driverName,
        driver_id: driverId,
        delivery_destination: destination,
        vehicle_plate: plate.toUpperCase(),
        stnk_expiry: stnkExpiry,
        kir_expiry: kirExpiry,
        tire_pressure_front: pressureFront,
        tire_pressure_rear: pressureRear,
        checklist: checks,
        failed_items: failedItems,
        photos,
        notes: notes || null,
        overall_status: failedItems.length === 0 ? "lulus" : "perlu_perhatian",
        created_at: new Date().toISOString(),
      });
      await supabase
        .from("vehicle_inspections")
        .update({ excel_url: excelUrl })
        .eq("id", data.id);
    } catch (e) {
      console.error("Excel generation failed", e);
      toast.warning("Laporan tersimpan, tapi file Excel gagal dibuat.");
    }

    setSubmitting(false);
    navigate({ to: "/selesai/$id", params: { id: data.id } });
  }

  const stepNum = step === "driver" ? 1 : step === "vehicle" ? 2 : 3;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div
        className="sticky top-0 z-20 text-primary-foreground shadow-md"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {step === "driver" ? (
            <Link
              to="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={() => {
                setStep(step === "inspect" ? "vehicle" : "driver");
                window.scrollTo({ top: 0 });
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-base font-semibold leading-tight">
              {step === "driver"
                ? "Data Driver & Tujuan"
                : step === "vehicle"
                  ? "Data Kendaraan & Dokumen"
                  : "Pengecekan Kendaraan"}
            </h1>
            <p className="text-xs opacity-80">Tahap {stepNum} dari 3</p>
          </div>
          {step === "inspect" && (
            <div className="text-right">
              <div className="text-sm font-semibold">
                {filledStatus}/{allStatusItems.length}
              </div>
              <div className="text-[10px] opacity-80">item</div>
            </div>
          )}
        </div>
        <div className="h-1 w-full bg-white/15">
          <div
            className="h-full transition-all"
            style={{
              width:
                step === "driver"
                  ? "33%"
                  : step === "vehicle"
                    ? "66%"
                    : `${Math.max(66, 66 + progress * 0.34)}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {step === "driver" && (
          <form onSubmit={submitDriver} className="space-y-4">
            <Field
              label="NIK Driver"
              required
              error={errors.driver_id}
              value={driverId}
              onChange={setDriverId}
              placeholder="Contoh: 327101..."
              inputMode="numeric"
            />
            <Field
              label="Nama Driver"
              required
              error={errors.driver_name}
              value={driverName}
              onChange={setDriverName}
              placeholder="Contoh: Budi Santoso"
            />
            <Field
              label="Tujuan Delivery"
              required
              error={errors.delivery_destination}
              value={destination}
              onChange={setDestination}
              placeholder="Contoh: Gudang Cikarang → Surabaya"
            />
            <PrimaryBtn>
              Lanjut <ArrowRight className="h-5 w-5" />
            </PrimaryBtn>
          </form>
        )}

        {step === "vehicle" && (
          <form onSubmit={submitVehicle} className="space-y-5">
            <Field
              label="Nomor Plat (TNKB)"
              required
              error={errors.vehicle_plate}
              value={plate}
              onChange={(v) => setPlate(v.toUpperCase())}
              placeholder="Contoh: B 1234 ABC"
            />
            <PhotoBlock
              label="Foto Kendaraan"
              required
              sessionId={sessionId}
              itemKey="vehicle"
              url={photos["vehicle"]}
              onChange={(u) => setPhoto("vehicle", u)}
            />

            <Field
              label="Masa Berlaku STNK"
              required
              type="date"
              error={errors.stnk_expiry}
              value={stnkExpiry}
              onChange={setStnkExpiry}
            />
            <PhotoBlock
              label="Foto STNK"
              required
              sessionId={sessionId}
              itemKey="stnk"
              url={photos["stnk"]}
              onChange={(u) => setPhoto("stnk", u)}
            />

            <Field
              label="Masa Berlaku Uji KIR"
              required
              type="date"
              error={errors.kir_expiry}
              value={kirExpiry}
              onChange={setKirExpiry}
            />
            <PhotoBlock
              label="Foto Kartu KIR"
              required
              sessionId={sessionId}
              itemKey="kir"
              url={photos["kir"]}
              onChange={(u) => setPhoto("kir", u)}
            />

            <PrimaryBtn>
              Lanjut ke Pengecekan <ArrowRight className="h-5 w-5" />
            </PrimaryBtn>
          </form>
        )}

        {step === "inspect" && (
          <div className="space-y-5">
            <Banner
              failedCount={failedCount}
              filled={filledStatus}
              total={allStatusItems.length}
            />

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
                    <li key={item.key} className="px-4 py-3">
                      {item.type === "status" && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex-1 text-sm text-foreground">
                            {item.label}
                          </span>
                          <StatusButtons
                            value={checks[item.key]}
                            onChange={(s) => setStatus(item.key, s)}
                            okLabel={item.okLabel}
                            ngLabel={item.ngLabel}
                          />
                        </div>
                      )}

                      {item.type === "status_photo" && (
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex-1 text-sm text-foreground">
                              {item.label}
                            </span>
                            <StatusButtons
                              value={checks[item.key]}
                              onChange={(s) => setStatus(item.key, s)}
                              okLabel={item.okLabel}
                              ngLabel={item.ngLabel}
                            />
                          </div>
                          {checks[item.key] === "ng" && (
                            <PhotoInput
                              sessionId={sessionId}
                              itemKey={item.key}
                              url={photos[item.key]}
                              onChange={(u) => setPhoto(item.key, u)}
                              required
                              label="Foto bukti"
                            />
                          )}
                          {checks[item.key] === "ok" && (
                            <PhotoInput
                              sessionId={sessionId}
                              itemKey={item.key}
                              url={photos[item.key]}
                              onChange={(u) => setPhoto(item.key, u)}
                              label="Foto (opsional)"
                            />
                          )}
                        </div>
                      )}

                      {item.type === "photo" && (
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {item.label}{" "}
                            <span className="text-destructive">*</span>
                          </div>
                          <PhotoInput
                            sessionId={sessionId}
                            itemKey={item.key}
                            url={photos[item.key]}
                            onChange={(u) => setPhoto(item.key, u)}
                            required
                            label="Upload foto"
                          />
                        </div>
                      )}

                      {item.type === "pressure" && (
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {item.label}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <PressureField
                              label="Depan"
                              value={pressureFront}
                              onChange={setPressureFront}
                            />
                            <PressureField
                              label="Belakang"
                              value={pressureRear}
                              onChange={setPressureRear}
                            />
                          </div>
                        </div>
                      )}
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Contoh: Ban depan kanan agak gundul, perlu diganti minggu depan."
                className="w-full rounded-xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </main>

      {step === "inspect" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={submitAll}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Menyimpan...
                </>
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

function PrimaryBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
    >
      {children}
    </button>
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  inputMode?: "numeric" | "text";
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={120}
        className={`w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring ${
          error ? "border-destructive" : ""
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PhotoBlock(props: {
  label: string;
  required?: boolean;
  sessionId: string;
  itemKey: string;
  url?: string;
  onChange: (u: string | undefined) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {props.label}{" "}
        {props.required && <span className="text-destructive">*</span>}
      </label>
      <PhotoInput
        sessionId={props.sessionId}
        itemKey={props.itemKey}
        url={props.url}
        onChange={props.onChange}
        required={props.required}
        label="Ambil foto"
      />
    </div>
  );
}

function PressureField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-2">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <input
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))
          }
          inputMode="decimal"
          placeholder="0"
          className="w-full bg-transparent text-lg font-semibold outline-none"
        />
        <span className="text-xs text-muted-foreground">psi</span>
      </div>
    </div>
  );
}

function StatusButtons({
  value,
  onChange,
  okLabel = "Baik",
  ngLabel = "Tidak",
}: {
  value: Status | undefined;
  onChange: (s: Status) => void;
  okLabel?: string;
  ngLabel?: string;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <StatusBtn
        active={value === "ok"}
        variant="ok"
        onClick={() => onChange("ok")}
        label={okLabel}
      />
      <StatusBtn
        active={value === "ng"}
        variant="ng"
        onClick={() => onChange("ng")}
        label={ngLabel}
      />
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
  filled,
  total,
}: {
  failedCount: number;
  filled: number;
  total: number;
}) {
  if (filled === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-secondary/40 p-4 text-sm text-muted-foreground">
        💡 Pilih kondisi setiap item. Item bermasalah <b>wajib</b> disertai foto.
      </div>
    );
  }
  if (failedCount === 0 && filled === total) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-success">
        ✅ Semua dalam kondisi baik. Kendaraan siap berangkat!
      </div>
    );
  }
  if (failedCount > 0) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        ⚠️ {failedCount} item perlu perhatian. Upload foto bukti & jelaskan di
        catatan.
      </div>
    );
  }
  return null;
}
