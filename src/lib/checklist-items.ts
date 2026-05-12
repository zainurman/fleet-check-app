export type ChecklistItem = {
  key: string;
  label: string;
};

export type ChecklistCategory = {
  key: string;
  title: string;
  icon: string; // emoji for clarity to drivers
  items: ChecklistItem[];
};

export const CHECKLIST: ChecklistCategory[] = [
  {
    key: "dokumen",
    title: "Dokumen Kendaraan",
    icon: "📄",
    items: [
      { key: "sim", label: "SIM masih berlaku" },
      { key: "stnk", label: "STNK ada & berlaku" },
      { key: "kir", label: "Buku KIR berlaku" },
    ],
  },
  {
    key: "mesin",
    title: "Mesin & Cairan",
    icon: "🛠️",
    items: [
      { key: "oli_mesin", label: "Oli mesin (level cukup)" },
      { key: "air_radiator", label: "Air radiator" },
      { key: "air_aki", label: "Air aki" },
      { key: "minyak_rem", label: "Minyak rem" },
      { key: "bahan_bakar", label: "Bahan bakar mencukupi" },
    ],
  },
  {
    key: "lampu",
    title: "Lampu-lampu",
    icon: "💡",
    items: [
      { key: "lampu_depan", label: "Lampu utama (dekat & jauh)" },
      { key: "lampu_sein", label: "Lampu sein kanan & kiri" },
      { key: "lampu_rem", label: "Lampu rem" },
      { key: "lampu_mundur", label: "Lampu mundur" },
      { key: "lampu_hazard", label: "Lampu hazard" },
    ],
  },
  {
    key: "ban",
    title: "Ban & Roda",
    icon: "🛞",
    items: [
      { key: "kondisi_ban", label: "Kondisi alur ban masih baik" },
      { key: "tekanan_ban", label: "Tekanan angin sesuai" },
      { key: "ban_serep", label: "Ban serep tersedia & layak" },
      { key: "baut_roda", label: "Baut roda kencang" },
    ],
  },
  {
    key: "rem",
    title: "Sistem Rem",
    icon: "🛑",
    items: [
      { key: "rem_kaki", label: "Rem kaki pakem" },
      { key: "rem_tangan", label: "Rem tangan berfungsi" },
    ],
  },
  {
    key: "kelistrikan",
    title: "Kelistrikan & Visibilitas",
    icon: "⚡",
    items: [
      { key: "klakson", label: "Klakson berfungsi" },
      { key: "wiper", label: "Wiper & air wiper" },
      { key: "spion", label: "Spion lengkap & jelas" },
      { key: "kaca", label: "Kaca depan tidak retak" },
    ],
  },
  {
    key: "keselamatan",
    title: "Alat Keselamatan",
    icon: "🦺",
    items: [
      { key: "sabuk", label: "Sabuk pengaman berfungsi" },
      { key: "apar", label: "APAR (alat pemadam) tersedia" },
      { key: "p3k", label: "Kotak P3K tersedia" },
      { key: "segitiga", label: "Segitiga pengaman" },
      { key: "rompi", label: "Rompi reflektif" },
    ],
  },
  {
    key: "kelengkapan",
    title: "Perlengkapan & Kebersihan",
    icon: "🧰",
    items: [
      { key: "dongkrak", label: "Dongkrak & kunci roda" },
      { key: "kabin_bersih", label: "Kabin bersih & rapi" },
      { key: "bak_bersih", label: "Bak/box muatan bersih" },
    ],
  },
];

export const ALL_ITEMS = CHECKLIST.flatMap((c) =>
  c.items.map((i) => ({ ...i, category: c.title })),
);
