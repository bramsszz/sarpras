# Website Laporan Sarpras — SMPK Untung Suropati Sidoarjo

Website native HTML/CSS/JS (siap hosting di Netlify) + backend Google Apps Script.

## Fitur

- **Form laporan publik** — siswa mengisi nama, kelas, jenis fasilitas, lokasi, tingkat kerusakan, kritik, saran, dan foto (otomatis dikompres di browser).
- **Kode lacak** — tiap laporan mendapat kode unik (mis. `SP-AB12C`) yang ditampilkan setelah kirim.
- **Lacak status publik** (`lacak.html`) — siapa pun bisa cek status laporannya dengan kode, tanpa login admin.
- **Notifikasi email** — admin dapat email otomatis setiap ada laporan baru.
- **Dashboard admin** — statistik (total, per tingkat, per status, per jenis fasilitas), tabel dengan **pencarian, filter (jenis/kelas/tingkat/status/rentang tanggal), sortir, dan pagination**, ubah status, hapus.
- **Dark mode** di semua halaman.

## Struktur File

```
aspirasi-sarpras/
├── index.html          → Form publik kirim laporan sarpras
├── lacak.html           → Halaman publik lacak status laporan (pakai kode)
├── admin.html            → Login admin
├── dashboard.html         → Dashboard admin (statistik + kelola laporan)
├── css/
│   └── style.css          → Semua styling (satu file, dipakai semua halaman)
├── js/
│   ├── config.js          → API_URL, daftar kelas, tingkat, status, kategori
│   ├── compress.js         → Kompresi gambar di browser sebelum upload
│   ├── darkmode.js          → Toggle mode gelap/terang
│   ├── form.js               → Logic form publik + upload foto + tampil kode
│   ├── lacak.js               → Logic halaman lacak status
│   ├── auth.js                 → Logic login admin
│   └── dashboard.js             → Logic dashboard admin
├── Code.gs                → Backend Google Apps Script (deploy terpisah)
└── assets/                 → (buat folder ini sendiri, taruh logo-sekolah.png dll)
```

Kolom di Google Sheet (dibuat otomatis oleh `setupSheet`):
`id · nama_lengkap · kelas · lokasi · tingkat · kritik · saran · foto_url · foto_file_id · status · tanggal · kategori · kode`

## Setup Backend (Google Apps Script)

1. Buka [Google Sheets](https://sheets.google.com), buat spreadsheet baru — beri nama misalnya "Data Sarpras SMPK".
2. Buka **Extensions → Apps Script**.
3. Hapus isi default `Code.gs`, lalu paste isi file `Code.gs` dari project ini.
4. Ganti nilai berikut di bagian atas `Code.gs`:
   ```js
   const ADMIN_USERNAME = "sarpras";
   const ADMIN_PASSWORD = "GANTI_PASSWORD_INI";          // ganti dengan password kuat
   const ADMIN_TOKEN    = "GANTI_TOKEN_RAHASIA_INI...";  // string acak panjang (40+ karakter)

   const ADMIN_EMAIL    = "email-admin@gmail.com";        // penerima notifikasi laporan baru
   ```
   Tips generate token acak: buka console browser lalu jalankan
   `crypto.randomUUID() + crypto.randomUUID()`
5. Jalankan fungsi **`setupSheet`** sekali (pilih dari dropdown fungsi di toolbar Apps Script, lalu klik ▶ Run). Ini membuat sheet "sarpras" dengan header lengkap. Saat diminta izin, klik **Allow** — izin akses **Sheets, Drive, dan Gmail** diperlukan (Gmail untuk kirim notifikasi email).
6. Klik **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**, salin **Web app URL** yang muncul.

> Sudah punya instalasi lama (sheet sudah berisi data)? Jangan pakai `setupSheet` — pakai **`migrateSheet`**. Lihat bagian [Memperbarui Instalasi Lama](#memperbarui-instalasi-lama).

## Setup Frontend

1. Buka `js/config.js`, ganti baris:
   ```js
   const API_URL = "GANTI_DENGAN_URL_APPS_SCRIPT_KAMU";
   ```
   dengan Web app URL dari langkah deploy di atas.
2. (Opsional) sesuaikan `DAFTAR_KATEGORI` di `js/config.js`. **Penting:** daftar ini harus sama persis dengan `KATEGORI_VALID` di `Code.gs`, kalau tidak laporan akan ditolak server ("Jenis fasilitas tidak valid").
3. (Opsional) buat folder `assets/` dan taruh `logo-sekolah.png` di dalamnya kalau mau logo muncul di navbar.

## Deploy ke Netlify

1. Push seluruh folder ini ke repo GitHub, **atau** langsung drag-and-drop folder ke [app.netlify.com/drop](https://app.netlify.com/drop).
2. Netlify otomatis serve `index.html` sebagai halaman utama.
3. Halaman yang bisa diakses:
   - Form laporan: `<domain-netlify-kamu>/`
   - Lacak status: `<domain-netlify-kamu>/lacak.html`
   - Admin: `<domain-netlify-kamu>/admin.html`

## Halaman Lacak Status

- Setelah siswa mengirim laporan, kode lacak (mis. `SP-AB12C`) muncul di layar — minta mereka menyimpannya.
- Kode itu dimasukkan di halaman **Lacak Status** untuk melihat perkembangan laporan.
- Demi privasi, halaman lacak **hanya** menampilkan: status, jenis fasilitas, lokasi, tingkat kerusakan, dan tanggal — **bukan** nama pelapor, kritik, saran, atau foto.

## Mengganti Email Notifikasi

1. Edit `Code.gs`, cari baris:
   ```js
   const ADMIN_EMAIL = "email-admin@gmail.com";
   ```
2. Ganti alamatnya. Boleh lebih dari satu (pisah koma): `"a@gmail.com, b@gmail.com"`. Kosongkan (`""`) untuk mematikan notifikasi email.
3. **Deploy → Manage deployments → Edit (ikon pensil) → Version: New version → Deploy.**

Catatan:
- Email terkirim **dari akun Google yang men-deploy** script, dengan kuota gratis ±100 email/hari.
- Kalau email gagal terkirim (mis. kuota habis), laporan **tetap tersimpan** — pengiriman email tidak menggagalkan submit.
- (Opsional) isi `const SITE_URL = "..."` dengan URL dashboard admin agar link-nya ikut dicantumkan di email.

## Memperbarui Instalasi Lama

Untuk sheet yang **sudah berisi data** dari versi sebelumnya (belum ada kolom `kategori` & `kode`):

1. Paste `Code.gs` versi terbaru ke Apps Script (ganti seluruh isi lama).
2. Jalankan fungsi **`migrateSheet`** sekali (dropdown fungsi → ▶ Run). Fungsi ini:
   - Menambahkan kolom `kategori` dan `kode` bila belum ada.
   - Mengisi `kategori = "Lainnya"` dan membuat `kode` unik untuk baris lama.
   - Aman dijalankan berulang (idempotent) dan **tidak menghapus data**.
   - Saat diminta izin (termasuk Gmail), klik **Allow**.
3. **Deploy → Manage deployments → Edit → Version: New version → Deploy** (pilih **New version** supaya URL Web App tetap sama dan `API_URL` di frontend tidak perlu diubah).
4. Upload ulang folder frontend ke Netlify (ada file baru: `lacak.html`, `js/lacak.js`).

> Foto pada laporan **lama** memakai format URL Drive versi lama dan mungkin tidak tampil di dashboard. Laporan **baru** memakai format thumbnail yang andal. Kalau perlu, foto lama bisa dimigrasi terpisah.

## Catatan Keamanan

- Password & token admin disimpan langsung di `Code.gs` (server-side), **bukan** di file frontend — aman dari inspect element.
- Setiap request admin (lihat data, ubah status, hapus) divalidasi tokennya di server.
- Semua input teks dari form disanitasi sebelum masuk Sheet (cegah formula injection seperti `=IMPORTXML(...)`).
- Foto divalidasi tipe MIME & ukuran sebelum diupload ke Drive, dan sudah dikompres otomatis di browser (~300–800KB) sebelum dikirim — hemat kuota Drive & mempercepat upload.
- File foto di Drive di-share sebagai "Anyone with link — Viewer" per file (bukan seluruh folder), jadi tidak bisa dibrowse orang lain.
- Penulisan laporan dikunci dengan `LockService` agar dua laporan bersamaan tidak saling menimpa atau mendapat ID/kode yang sama.
- Kalau admin menandai laporan sebagai **"Ditolak"**, baris data dan foto di Drive otomatis terhapus permanen — tidak perlu hapus manual.

## Mengganti Password Admin

Edit `ADMIN_USERNAME` dan `ADMIN_PASSWORD` di `Code.gs`, lalu **Deploy → Manage deployments → Edit → Version: New version → Deploy** supaya perubahan aktif.
