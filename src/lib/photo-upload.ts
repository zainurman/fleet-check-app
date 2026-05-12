import { supabase } from "@/integrations/supabase/client";

const BUCKET = "inspection-photos";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB per foto

export async function uploadInspectionPhoto(
  file: File,
  sessionId: string,
  key: string,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ukuran foto maksimal 8MB");
  }
  const ext = (file.name.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${sessionId}/${key}-${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
