// Definisi ceklis kendaraan — disesuaikan dengan SOP perusahaan.
// Tipe item:
// - "status"     : Yes/No (Ok/Tidak). Optional foto (wajib jika status = bad).
// - "photo"      : Wajib upload foto (dokumentasi).
// - "status_photo": Status Yes/No + foto (foto wajib jika status = bad).
// - "pressure"   : Input tekanan ban depan & belakang (psi).

export type ItemType = "status" | "photo" | "status_photo" | "pressure";

export type ChecklistItem = {
  key: string;
  label: string;
  type: ItemType;
  okLabel?: string; // default "Baik"
  ngLabel?: string; // default "Tidak"
};

export type ChecklistCategory = {
  key: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
};

export const CHECKLIST: ChecklistCategory[] = [
  {
    key: "reguler",
    title: "Pengecekan Reguler",
    icon: "🔧",
    items: [
      { key: "ban_haus", label: "Kondisi ban (tidak haus)", type: "status_photo", okLabel: "Tidak Haus", ngLabel: "Haus" },
      { key: "foto_semua_ban", label: "Foto semua ban", type: "photo" },
      { key: "tekanan_ban", label: "Tekanan ban (psi)", type: "pressure" },
      { key: "ban_serep_ada", label: "Ban serep tersedia", type: "status", okLabel: "Ada", ngLabel: "Tidak Ada" },
      { key: "ban_serep_kondisi", label: "Kondisi ban serep (tidak aus & tidak benjol)", type: "status_photo", okLabel: "Baik", ngLabel: "Tidak Baik" },
      { key: "spion", label: "Spion lengkap & kaca tidak pecah", type: "status_photo" },
      { key: "mesin_suara", label: "Mesin: suara normal & tidak ada oli bocor", type: "status_photo", okLabel: "Normal", ngLabel: "Bermasalah" },
      { key: "oli_mesin", label: "Oli mesin sesuai indikator", type: "status", okLabel: "Sesuai", ngLabel: "Tidak Sesuai" },
      { key: "pedal_gas", label: "Pedal gas berfungsi", type: "status" },
      { key: "rem_kaki", label: "Rem kaki berfungsi", type: "status" },
      { key: "rem_tangan", label: "Rem tangan berfungsi", type: "status" },
      { key: "kopling", label: "Kopling berfungsi", type: "status" },
      { key: "wiper", label: "Wiper & air wiper berfungsi", type: "status" },
      { key: "air_radiator", label: "Air radiator sesuai indikator", type: "status", okLabel: "Sesuai", ngLabel: "Tidak Sesuai" },
      { key: "lampu_utama", label: "Lampu utama menyala", type: "status", okLabel: "Menyala", ngLabel: "Mati" },
      { key: "lampu_jauh", label: "Lampu jauh menyala", type: "status", okLabel: "Menyala", ngLabel: "Mati" },
      { key: "lampu_rem", label: "Lampu rem belakang menyala", type: "status", okLabel: "Menyala", ngLabel: "Mati" },
      { key: "lampu_sein_depan", label: "Lampu sein depan menyala", type: "status", okLabel: "Menyala", ngLabel: "Mati" },
      { key: "lampu_sein_belakang", label: "Lampu sein belakang menyala", type: "status", okLabel: "Menyala", ngLabel: "Mati" },
      { key: "klakson", label: "Klakson berbunyi", type: "status", okLabel: "Berbunyi", ngLabel: "Tidak" },
    ],
  },
  {
    key: "perlengkapan",
    title: "Pengecekan Perlengkapan",
    icon: "🧰",
    items: [
      { key: "dongkrak", label: "Dongkrak", type: "status_photo", okLabel: "Ada", ngLabel: "Tidak Ada" },
      { key: "p3k", label: "Kotak P3K", type: "status_photo", okLabel: "Ada", ngLabel: "Tidak Ada" },
      { key: "helm_safety", label: "Helm safety", type: "status_photo", okLabel: "Ada", ngLabel: "Tidak Ada" },
      { key: "rompi_safety", label: "Rompi safety", type: "status_photo", okLabel: "Ada", ngLabel: "Tidak Ada" },
      { key: "ganjal_ban", label: "Ganjal ban (2 buah)", type: "status_photo", okLabel: "Ada", ngLabel: "Tidak Ada" },
      { key: "segitiga", label: "Segitiga pengaman", type: "status_photo", okLabel: "Ada", ngLabel: "Tidak Ada" },
    ],
  },
  {
    key: "body",
    title: "Pengecekan Body",
    icon: "🚛",
    items: [
      { key: "body_depan", label: "Body bagian depan", type: "status_photo", okLabel: "Baik", ngLabel: "Tidak Baik" },
      { key: "body_kanan", label: "Body bagian kanan", type: "status_photo", okLabel: "Baik", ngLabel: "Tidak Baik" },
      { key: "body_kiri", label: "Body bagian kiri", type: "status_photo", okLabel: "Baik", ngLabel: "Tidak Baik" },
      { key: "body_belakang", label: "Body bagian belakang", type: "status_photo", okLabel: "Baik", ngLabel: "Tidak Baik" },
    ],
  },
  {
    key: "kebersihan",
    title: "Pengecekan Kebersihan",
    icon: "🧽",
    items: [
      { key: "interior", label: "Interior", type: "status_photo", okLabel: "Bersih", ngLabel: "Tidak Bersih" },
      { key: "exterior", label: "Exterior", type: "status_photo", okLabel: "Bersih", ngLabel: "Tidak Bersih" },
    ],
  },
];

// Foto wajib (pure photo) di tahap kendaraan/dokumen
export const VEHICLE_PHOTOS = [
  { key: "vehicle", label: "Foto kendaraan" },
  { key: "stnk", label: "Foto STNK" },
  { key: "kir", label: "Foto Kartu KIR" },
] as const;
