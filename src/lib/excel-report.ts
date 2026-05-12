import ExcelJS from "exceljs";
import { CHECKLIST, VEHICLE_PHOTOS } from "./checklist-items";
import { supabase } from "@/integrations/supabase/client";

export type InspectionExcelData = {
  id: string;
  driver_name: string;
  driver_id: string;
  delivery_destination: string | null;
  vehicle_plate: string;
  stnk_expiry: string | null;
  kir_expiry: string | null;
  tire_pressure_front: string | null;
  tire_pressure_rear: string | null;
  checklist: Record<string, "ok" | "ng">;
  failed_items: { label: string; category: string }[];
  photos: Record<string, string>;
  notes: string | null;
  overall_status: string;
  created_at: string;
};

const COLOR_HEADER = "FF1F4E78";
const COLOR_SUBHEADER = "FFD9E1F2";
const COLOR_OK = "FFC6EFCE";
const COLOR_NG = "FFFFC7CE";
const COLOR_BORDER = "FFAAAAAA";

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function thinBorder() {
  return {
    top: { style: "thin" as const, color: { argb: COLOR_BORDER } },
    left: { style: "thin" as const, color: { argb: COLOR_BORDER } },
    bottom: { style: "thin" as const, color: { argb: COLOR_BORDER } },
    right: { style: "thin" as const, color: { argb: COLOR_BORDER } },
  };
}

export async function buildInspectionWorkbook(
  d: InspectionExcelData,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Driver Check";
  wb.created = new Date();

  const ws = wb.addWorksheet("Laporan Pengecekan", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws.columns = [
    { width: 5 }, // A: no
    { width: 38 }, // B: label
    { width: 18 }, // C: status / value
    { width: 38 }, // D: catatan / link foto
  ];

  let row = 1;

  // ===== TITLE =====
  ws.mergeCells(`A${row}:D${row}`);
  const t = ws.getCell(`A${row}`);
  t.value = "LAPORAN PENGECEKAN KENDARAAN";
  t.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  t.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_HEADER },
  };
  ws.getRow(row).height = 28;
  row++;

  ws.mergeCells(`A${row}:D${row}`);
  const sub = ws.getCell(`A${row}`);
  const isPass = d.overall_status === "lulus";
  sub.value = `Status: ${isPass ? "LULUS — Siap Berangkat" : "PERLU PERHATIAN"} · ${fmtDateTime(d.created_at)}`;
  sub.font = { italic: true, size: 10 };
  sub.alignment = { horizontal: "center" };
  sub.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: isPass ? COLOR_OK : COLOR_NG },
  };
  row++;
  row++; // spacer

  // ===== TAHAP 1: DATA DRIVER =====
  row = addSectionHeader(ws, row, "TAHAP 1 — DATA DRIVER & TUJUAN");
  row = addInfoRow(ws, row, "NIK Driver", d.driver_id);
  row = addInfoRow(ws, row, "Nama Driver", d.driver_name);
  row = addInfoRow(ws, row, "Tujuan Delivery", d.delivery_destination || "-");
  row++;

  // ===== TAHAP 2: KENDARAAN & DOKUMEN =====
  row = addSectionHeader(ws, row, "TAHAP 2 — DATA KENDARAAN & DOKUMEN");
  row = addInfoRow(ws, row, "Nomor Plat (TNKB)", d.vehicle_plate);
  row = addInfoRow(ws, row, "Masa Berlaku STNK", fmtDate(d.stnk_expiry));
  row = addInfoRow(ws, row, "Masa Berlaku Uji KIR", fmtDate(d.kir_expiry));
  for (const p of VEHICLE_PHOTOS) {
    row = addPhotoRow(ws, row, p.label, d.photos[p.key]);
  }
  row++;

  // ===== TAHAP 3: PENGECEKAN =====
  row = addSectionHeader(ws, row, "TAHAP 3 — PENGECEKAN KENDARAAN");

  // Tekanan ban (info khusus)
  row = addInfoRow(
    ws,
    row,
    "Tekanan Ban Depan",
    d.tire_pressure_front ? `${d.tire_pressure_front} psi` : "-",
  );
  row = addInfoRow(
    ws,
    row,
    "Tekanan Ban Belakang",
    d.tire_pressure_rear ? `${d.tire_pressure_rear} psi` : "-",
  );
  row++;

  // Tabel ceklis per kategori
  for (const cat of CHECKLIST) {
    row = addCategoryHeader(ws, row, cat.title);
    row = addTableHeader(ws, row);
    let no = 1;
    for (const it of cat.items) {
      if (it.type === "pressure") continue; // sudah ditampilkan di atas
      const status = d.checklist[it.key];
      let statusText = "-";
      let statusColor: string | null = null;
      if (it.type === "photo") {
        statusText = d.photos[it.key] ? "✓ Ada" : "✗ Tidak ada";
        statusColor = d.photos[it.key] ? COLOR_OK : COLOR_NG;
      } else if (status) {
        if (status === "ok") {
          statusText = it.okLabel || "Baik";
          statusColor = COLOR_OK;
        } else {
          statusText = it.ngLabel || "Tidak";
          statusColor = COLOR_NG;
        }
      }
      const photoUrl = d.photos[it.key];
      row = addItemRow(ws, row, no++, it.label, statusText, statusColor, photoUrl);
    }
    row++;
  }

  // ===== CATATAN =====
  if (d.notes && d.notes.trim()) {
    row = addSectionHeader(ws, row, "CATATAN TAMBAHAN");
    ws.mergeCells(`A${row}:D${row}`);
    const c = ws.getCell(`A${row}`);
    c.value = d.notes;
    c.alignment = { wrapText: true, vertical: "top" };
    c.border = thinBorder();
    ws.getRow(row).height = Math.max(40, Math.min(200, d.notes.length / 2));
    row++;
    row++;
  }

  // ===== ITEM PERLU PERHATIAN =====
  if (d.failed_items && d.failed_items.length > 0) {
    row = addSectionHeader(ws, row, `ITEM PERLU PERHATIAN (${d.failed_items.length})`);
    let no = 1;
    for (const it of d.failed_items) {
      ws.getCell(`A${row}`).value = no++;
      ws.getCell(`A${row}`).alignment = { horizontal: "center" };
      ws.getCell(`B${row}`).value = it.category;
      ws.getCell(`C${row}`).value = it.label;
      ws.mergeCells(`C${row}:D${row}`);
      for (const col of ["A", "B", "C"]) {
        ws.getCell(`${col}${row}`).border = thinBorder();
        ws.getCell(`${col}${row}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_NG },
        };
      }
      row++;
    }
    row++;
  }

  // ===== TANDA TANGAN =====
  row++;
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:D${row}`);
  ws.getCell(`A${row}`).value = "Driver";
  ws.getCell(`C${row}`).value = "Staff Operasional";
  ws.getCell(`A${row}`).alignment = { horizontal: "center" };
  ws.getCell(`C${row}`).alignment = { horizontal: "center" };
  ws.getCell(`A${row}`).font = { bold: true };
  ws.getCell(`C${row}`).font = { bold: true };
  row++;
  ws.getRow(row).height = 60;
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:D${row}`);
  row++;
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:D${row}`);
  ws.getCell(`A${row}`).value = `( ${d.driver_name} )`;
  ws.getCell(`C${row}`).value = "( ........................ )";
  ws.getCell(`A${row}`).alignment = { horizontal: "center" };
  ws.getCell(`C${row}`).alignment = { horizontal: "center" };
  row++;

  // Footer ID
  row++;
  ws.mergeCells(`A${row}:D${row}`);
  const f = ws.getCell(`A${row}`);
  f.value = `ID Laporan: ${d.id}`;
  f.font = { italic: true, size: 9, color: { argb: "FF888888" } };
  f.alignment = { horizontal: "center" };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function addSectionHeader(ws: ExcelJS.Worksheet, row: number, title: string) {
  ws.mergeCells(`A${row}:D${row}`);
  const c = ws.getCell(`A${row}`);
  c.value = title;
  c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  c.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  c.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_HEADER },
  };
  ws.getRow(row).height = 22;
  return row + 1;
}

function addCategoryHeader(ws: ExcelJS.Worksheet, row: number, title: string) {
  ws.mergeCells(`A${row}:D${row}`);
  const c = ws.getCell(`A${row}`);
  c.value = title;
  c.font = { bold: true, size: 10 };
  c.alignment = { horizontal: "left", indent: 1 };
  c.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_SUBHEADER },
  };
  c.border = thinBorder();
  return row + 1;
}

function addTableHeader(ws: ExcelJS.Worksheet, row: number) {
  const headers = ["No", "Item Pemeriksaan", "Status", "Foto / Catatan"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEEEEE" },
    };
    cell.border = thinBorder();
  });
  return row + 1;
}

function addInfoRow(
  ws: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: string,
) {
  ws.getCell(`A${row}`).value = "";
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:D${row}`);
  const a = ws.getCell(`A${row}`);
  const c = ws.getCell(`C${row}`);
  a.value = label;
  a.font = { bold: true };
  a.alignment = { vertical: "middle", indent: 1 };
  a.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5F5F5" },
  };
  a.border = thinBorder();
  c.value = value;
  c.alignment = { vertical: "middle", indent: 1 };
  c.border = thinBorder();
  return row + 1;
}

function addPhotoRow(
  ws: ExcelJS.Worksheet,
  row: number,
  label: string,
  url: string | undefined,
) {
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:D${row}`);
  const a = ws.getCell(`A${row}`);
  const c = ws.getCell(`C${row}`);
  a.value = label;
  a.font = { bold: true };
  a.alignment = { vertical: "middle", indent: 1 };
  a.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5F5F5" },
  };
  a.border = thinBorder();
  if (url) {
    c.value = { text: "Lihat Foto", hyperlink: url };
    c.font = { color: { argb: "FF0563C1" }, underline: true };
  } else {
    c.value = "(tidak ada foto)";
    c.font = { italic: true, color: { argb: "FF999999" } };
  }
  c.alignment = { vertical: "middle", indent: 1 };
  c.border = thinBorder();
  return row + 1;
}

function addItemRow(
  ws: ExcelJS.Worksheet,
  row: number,
  no: number,
  label: string,
  statusText: string,
  statusColor: string | null,
  photoUrl: string | undefined,
) {
  const a = ws.getCell(`A${row}`);
  const b = ws.getCell(`B${row}`);
  const c = ws.getCell(`C${row}`);
  const dCell = ws.getCell(`D${row}`);
  a.value = no;
  a.alignment = { horizontal: "center", vertical: "middle" };
  b.value = label;
  b.alignment = { vertical: "middle", wrapText: true, indent: 1 };
  c.value = statusText;
  c.alignment = { horizontal: "center", vertical: "middle" };
  c.font = { bold: true };
  if (statusColor) {
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: statusColor },
    };
  }
  if (photoUrl) {
    dCell.value = { text: "Lihat Foto", hyperlink: photoUrl };
    dCell.font = { color: { argb: "FF0563C1" }, underline: true };
  } else {
    dCell.value = "";
  }
  dCell.alignment = { vertical: "middle", indent: 1 };
  for (const col of ["A", "B", "C", "D"]) {
    ws.getCell(`${col}${row}`).border = thinBorder();
  }
  return row + 1;
}

export async function uploadInspectionExcel(
  data: InspectionExcelData,
): Promise<string> {
  const blob = await buildInspectionWorkbook(data);
  const safePlate = (data.vehicle_plate || "kendaraan").replace(/[^A-Za-z0-9]/g, "");
  const filename = `${data.id}/laporan-${safePlate}-${data.id.slice(0, 8)}.xlsx`;
  const { error } = await supabase.storage
    .from("inspection-reports")
    .upload(filename, blob, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
  if (error) throw error;
  const { data: pub } = supabase.storage
    .from("inspection-reports")
    .getPublicUrl(filename);
  return pub.publicUrl;
}
