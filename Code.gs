// ============================================================
// Google Apps Script — Website Laporan Sarpras
// SMPK Untung Suropati Sidoarjo
// ============================================================

const SHEET_NAME   = "sarpras";
const DRIVE_FOLDER_NAME = "Data-Foto-Sarpras"; // folder di Drive akun pemilik Sheet
const STATUS_DEFAULT = "Menunggu";

// ============================================================
// KREDENSIAL ADMIN — Ubah di sini untuk ganti password
// ============================================================
const ADMIN_USERNAME = "adminsarpras";
const ADMIN_PASSWORD = "SarprasSmpkUnsur@1960";
const ADMIN_TOKEN    = "SarprasUntungSuropati1960SecretToken!XyA";

// ============================================================
// NOTIFIKASI EMAIL
// Email penerima notifikasi laporan baru. Untuk MENGGANTI: cukup ubah
// alamat di baris ADMIN_EMAIL ini, lalu re-deploy (New version).
// Boleh lebih dari satu, pisahkan dengan koma, mis:
//   const ADMIN_EMAIL = "a@gmail.com, b@gmail.com";
// Kosongkan ("") untuk mematikan notifikasi email.
// Catatan: email terkirim DARI akun Google yang men-deploy script ini.
// ============================================================
const ADMIN_EMAIL = "abrahamtalentaputra@gmail.com";

// (Opsional) URL dashboard admin, mis. "https://situsanda.netlify.app/admin.html".
// Kalau diisi, link ini ikut dicantumkan di email notifikasi.
const SITE_URL = "";

// Daftar jenis fasilitas yang valid — HARUS sama persis dengan
// DAFTAR_KATEGORI di js/config.js.
const KATEGORI_VALID = [
  "Toilet & Sanitasi", "Listrik & Lampu", "Meja & Kursi", "Pintu & Jendela",
  "Atap & Plafon", "Dinding & Lantai", "AC & Kipas", "Komputer & Elektronik",
  "Air & Kran", "Kebersihan", "Lainnya"
];

// ------------------------------------------------------------
// Helper Response
// ------------------------------------------------------------
function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function isValidToken(token) {
  return token === ADMIN_TOKEN;
}

// Ambil (atau buat) folder Drive khusus upload sarpras
function getUploadFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

// Sanitasi input teks — cegah formula injection di Sheet
function sanitizeText(str) {
  if (str === null || str === undefined) return "";
  str = String(str).trim();
  // Kalau diawali karakter formula, tambahkan apostrof di depan
  if (/^[=+\-@]/.test(str)) str = "'" + str;
  return str;
}

function sanitizeFileName(name) {
  if (!name) return "";
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
}

// ------------------------------------------------------------
// doGet
// ------------------------------------------------------------
function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (action === "track") {
      // Publik — lacak status satu laporan berdasarkan kode
      return trackLaporan(sheet, e.parameter.kode);
    }

    if (action === "getAll") {
      if (!isValidToken(e.parameter.token))
        return createResponse({ success: false, message: "Akses ditolak." });
      return getAll(sheet);
    }

    return createResponse({ success: false, message: "Action tidak dikenal." });
  } catch (err) {
    return createResponse({ success: false, message: err.toString() });
  }
}

// ------------------------------------------------------------
// doPost
// ------------------------------------------------------------
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (action === "login")  return handleLogin(body.username, body.password);
    if (action === "submit") return submitLaporan(sheet, body);

    // Semua action di bawah ini butuh token admin
    if (!isValidToken(body.token))
      return createResponse({ success: false, message: "Akses ditolak." });

    if (action === "updateStatus") return updateStatus(sheet, body.id, body.status);
    if (action === "delete")       return deleteLaporan(sheet, body.id);

    return createResponse({ success: false, message: "Action tidak dikenal." });
  } catch (err) {
    return createResponse({ success: false, message: err.toString() });
  }
}

// ------------------------------------------------------------
// Login admin
// ------------------------------------------------------------
function handleLogin(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return createResponse({ success: true, token: ADMIN_TOKEN, message: "Login berhasil." });
  }
  return createResponse({ success: false, message: "Username atau password salah." });
}

// ------------------------------------------------------------
// Submit laporan sarpras (dengan upload foto ke Drive)
// ------------------------------------------------------------
function submitLaporan(sheet, body) {
  const nama     = sanitizeText(body.nama_lengkap);
  const kelas    = sanitizeText(body.kelas);
  const kategori = sanitizeText(body.kategori);
  const lokasi   = sanitizeText(body.lokasi);
  const tingkat  = sanitizeText(body.tingkat);
  const kritik   = sanitizeText(body.kritik);
  const saran    = sanitizeText(body.saran);

  const validTingkat = ["Ringan", "Sedang", "Berat"];

  if (!nama || !kelas || !kategori || !lokasi || !tingkat || !kritik || !saran)
    return createResponse({ success: false, message: "Semua kolom wajib diisi." });

  if (!validTingkat.includes(tingkat))
    return createResponse({ success: false, message: "Tingkat kerusakan tidak valid." });

  if (KATEGORI_VALID.indexOf(kategori) === -1)
    return createResponse({ success: false, message: "Jenis fasilitas tidak valid." });

  if (!body.foto_base64 || !body.foto_mime)
    return createResponse({ success: false, message: "Foto wajib diunggah." });

  // Validasi tipe MIME
  const validMime = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validMime.includes(body.foto_mime))
    return createResponse({ success: false, message: "Format foto tidak didukung." });

  // Batas ukuran base64 (foto sudah dikompres di browser sebelum dikirim)
  const maxBase64Chars = 8 * 1024 * 1024 * 1.4;
  if (body.foto_base64.length > maxBase64Chars)
    return createResponse({ success: false, message: "Ukuran foto terlalu besar." });

  let fotoUrl = "";
  let fotoFileId = "";

  try {
    const folder = getUploadFolder();
    const bytes  = Utilities.base64Decode(body.foto_base64);
    const blob   = Utilities.newBlob(bytes, body.foto_mime, sanitizeFileName(body.foto_nama) || "foto.jpg");
    const file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fotoFileId = file.getId();
    // Endpoint thumbnail Drive lebih andal untuk ditampilkan di <img>.
    fotoUrl = "https://drive.google.com/thumbnail?id=" + fotoFileId + "&sz=w1000";
  } catch (err) {
    return createResponse({ success: false, message: "Gagal mengunggah foto: " + err.toString() });
  }

  let id, kode;
  const tanggal = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm");

  // Kunci penulisan agar dua laporan yang masuk bersamaan tidak saling
  // menimpa atau mendapat ID/kode yang sama.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return createResponse({ success: false, message: "Server sedang sibuk, silakan coba lagi sebentar." });
  }

  try {
    // ID = ID terbesar + 1 (cegah duplikat setelah ada penghapusan).
    id   = getNextId(sheet);
    kode = generateUniqueKode(sheet);
    // Urutan kolom: id, nama, kelas, lokasi, tingkat, kritik, saran,
    //               foto_url, foto_file_id, status, tanggal, kategori, kode
    sheet.appendRow([id, nama, kelas, lokasi, tingkat, kritik, saran, fotoUrl, fotoFileId, STATUS_DEFAULT, tanggal, kategori, kode]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // Notifikasi email — jangan gagalkan submit kalau email error.
  kirimNotifikasiEmail({
    kode: kode, nama: nama, kelas: kelas, kategori: kategori,
    lokasi: lokasi, tingkat: tingkat, kritik: kritik, saran: saran, tanggal: tanggal
  });

  return createResponse({ success: true, message: "Laporan berhasil dikirim!", kode: kode });
}

// ID unik berikutnya = ID terbesar di kolom A + 1.
function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1; // cuma header / kosong
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < ids.length; i++) {
    const n = Number(ids[i][0]);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

// Buat kode acak SP-XXXXX (tanpa karakter ambigu: 0, O, 1, I).
function generateKode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return "SP-" + s;
}

// Kode unik yang belum dipakai di kolom "kode".
function generateUniqueKode(sheet) {
  const existing = {};
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colKode = header.indexOf("kode");
    if (colKode !== -1) {
      const codes = sheet.getRange(2, colKode + 1, lastRow - 1, 1).getValues();
      codes.forEach(function (c) { if (c[0]) existing[String(c[0])] = true; });
    }
  }
  let kode;
  do { kode = generateKode(); } while (existing[kode]);
  return kode;
}

// Kirim email notifikasi laporan baru ke admin.
function kirimNotifikasiEmail(d) {
  if (!ADMIN_EMAIL) return;
  try {
    const subjek = "🛠️ Laporan Sarpras Baru — " + d.lokasi + " (" + d.tingkat + ")";
    let isi = "";
    isi += "Ada laporan kerusakan sarpras baru:\n\n";
    isi += "Kode Lacak : " + d.kode + "\n";
    isi += "Pelapor    : " + d.nama + " (" + d.kelas + ")\n";
    isi += "Jenis      : " + d.kategori + "\n";
    isi += "Lokasi     : " + d.lokasi + "\n";
    isi += "Tingkat    : " + d.tingkat + "\n";
    isi += "Kritik     : " + d.kritik + "\n";
    isi += "Saran      : " + d.saran + "\n";
    isi += "Waktu      : " + d.tanggal + "\n";
    if (SITE_URL) isi += "\nBuka dashboard: " + SITE_URL + "\n";
    isi += "\n(Email otomatis dari sistem Laporan Sarpras — mohon jangan dibalas.)";
    MailApp.sendEmail(ADMIN_EMAIL, subjek, isi);
  } catch (err) {
    // Abaikan; laporan tetap tersimpan meski email gagal terkirim.
  }
}

// ------------------------------------------------------------
// Lacak status (publik) — hanya info ringkas, tanpa data pribadi
// ------------------------------------------------------------
function trackLaporan(sheet, kode) {
  kode = String(kode || "").trim().toUpperCase();
  if (!kode) return createResponse({ success: false, message: "Kode laporan wajib diisi." });

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createResponse({ success: false, message: "Kode laporan tidak ditemukan." });

  const header = data[0];
  const colKode = header.indexOf("kode");
  const colKategori = header.indexOf("kategori");
  if (colKode === -1)
    return createResponse({ success: false, message: "Fitur lacak belum aktif. Jalankan migrateSheet dulu." });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colKode]).trim().toUpperCase() === kode) {
      return createResponse({ success: true, data: {
        kode:     data[i][colKode],
        lokasi:   data[i][3],
        tingkat:  data[i][4],
        kategori: colKategori !== -1 ? data[i][colKategori] : "",
        status:   data[i][9],
        tanggal:  data[i][10]
      }});
    }
  }
  return createResponse({ success: false, message: "Kode laporan tidak ditemukan." });
}

// ------------------------------------------------------------
// Ambil semua data (admin)
// ------------------------------------------------------------
function getAll(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createResponse({ success: true, data: [] });

  const header = data[0];
  const colKategori = header.indexOf("kategori");
  const colKode = header.indexOf("kode");

  const rows = data.slice(1).map(function (row) {
    return {
      id: row[0], nama_lengkap: row[1], kelas: row[2], lokasi: row[3],
      tingkat: row[4], kritik: row[5], saran: row[6],
      foto_url: row[7], status: row[9], tanggal: row[10],
      kategori: colKategori !== -1 ? row[colKategori] : "",
      kode: colKode !== -1 ? row[colKode] : ""
    };
  });
  rows.reverse();
  return createResponse({ success: true, data: rows });
}

// ------------------------------------------------------------
// Update status — kalau "Ditolak", otomatis hapus baris + foto Drive
// ------------------------------------------------------------
function updateStatus(sheet, id, newStatus) {
  const valid = ["Menunggu", "Diproses", "Selesai", "Ditolak"];
  if (!valid.includes(newStatus))
    return createResponse({ success: false, message: "Status tidak valid." });

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      if (newStatus === "Ditolak") {
        // Hapus foto di Drive dulu (kolom I = index 8 = fotoFileId)
        const fileId = data[i][8];
        if (fileId) {
          try {
            DriveApp.getFileById(fileId).setTrashed(true);
          } catch (err) {
            // File mungkin sudah tidak ada, lanjutkan saja
          }
        }
        sheet.deleteRow(i + 1);
        return createResponse({ success: true, message: "Laporan ditolak dan dihapus." });
      }

      sheet.getRange(i + 1, 10).setValue(newStatus); // kolom J = Status
      return createResponse({ success: true, message: "Status berhasil diperbarui." });
    }
  }
  return createResponse({ success: false, message: "Laporan tidak ditemukan." });
}

// ------------------------------------------------------------
// Hapus laporan manual (beserta foto)
// ------------------------------------------------------------
function deleteLaporan(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const fileId = data[i][8];
      if (fileId) {
        try {
          DriveApp.getFileById(fileId).setTrashed(true);
        } catch (err) {
          // File mungkin sudah tidak ada
        }
      }
      sheet.deleteRow(i + 1);
      return createResponse({ success: true, message: "Laporan berhasil dihapus." });
    }
  }
  return createResponse({ success: false, message: "Laporan tidak ditemukan." });
}

// ------------------------------------------------------------
// Setup awal — jalankan sekali untuk sheet BARU (header lengkap)
// ------------------------------------------------------------
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const header = ["id", "nama_lengkap", "kelas", "lokasi", "tingkat", "kritik", "saran", "foto_url", "foto_file_id", "status", "tanggal", "kategori", "kode"];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.setFrozenRows(1);
}

// ------------------------------------------------------------
// Migrasi — jalankan SEKALI di sheet yang SUDAH berisi data lama.
// Menambah kolom "kategori" & "kode" lalu mengisinya untuk baris lama.
// Aman dijalankan berulang (idempotent) dan tidak menghapus data.
// ------------------------------------------------------------
function migrateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Sheet '" + SHEET_NAME + "' belum ada. Jalankan setupSheet dulu.");

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  let colKategori = header.indexOf("kategori");
  if (colKategori === -1) {
    colKategori = header.length;
    sheet.getRange(1, colKategori + 1).setValue("kategori");
    header.push("kategori");
  }
  let colKode = header.indexOf("kode");
  if (colKode === -1) {
    colKode = header.length;
    sheet.getRange(1, colKode + 1).setValue("kode");
    header.push("kode");
  }
  sheet.setFrozenRows(1);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // belum ada data

  const width = header.length;
  const range = sheet.getRange(2, 1, lastRow - 1, width);
  const values = range.getValues();

  const existing = {};
  values.forEach(function (r) { if (r[colKode]) existing[String(r[colKode])] = true; });

  for (let i = 0; i < values.length; i++) {
    if (!values[i][colKategori]) values[i][colKategori] = "Lainnya";
    if (!values[i][colKode]) {
      let kode;
      do { kode = generateKode(); } while (existing[kode]);
      existing[kode] = true;
      values[i][colKode] = kode;
    }
  }
  range.setValues(values);
}

function testOtorisasiDrive() {
  const folder = DriveApp.getFoldersByName("test");
  Logger.log("Drive OK");
}
