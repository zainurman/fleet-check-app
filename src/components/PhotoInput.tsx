import { useRef, useState } from "react";
import { Camera, Loader2, X, CheckCircle2 } from "lucide-react";
import { uploadInspectionPhoto } from "@/lib/photo-upload";
import { toast } from "sonner";

export function PhotoInput({
  sessionId,
  itemKey,
  url,
  onChange,
  required,
  label = "Foto",
}: {
  sessionId: string;
  itemKey: string;
  url?: string;
  onChange: (url: string | undefined) => void;
  required?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const u = await uploadInspectionPhoto(file, sessionId, itemKey);
      onChange(u);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal upload foto";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      {url ? (
        <div className="relative inline-block">
          <img
            src={url}
            alt={label}
            className="h-24 w-24 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
            aria-label="Hapus foto"
          >
            <X className="h-3 w-3" />
          </button>
          <CheckCircle2 className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-success text-success-foreground" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`inline-flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-xs font-medium transition ${
            required
              ? "border-accent/60 bg-accent/10 text-accent-foreground"
              : "border-border bg-background text-muted-foreground"
          } hover:bg-secondary`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {uploading ? "Mengunggah..." : required ? `${label} (wajib)` : label}
        </button>
      )}
    </div>
  );
}
