# 📋 PANDUAN INSTALASI — giG4-Bite (Kantin Digital SDN Gebang 04)

Scope versi ini: **Login + Beranda + Transaksi 1-Tap + Tutup Transaksi + Rekonsiliasi + Riwayat** (sisi Petugas).
Admin Panel (Pedagang/Produk/Harga/Laporan) menyusul di iterasi berikutnya — struktur datanya sudah disiapkan di Google Sheets sejak awal.

---

## === BAGIAN 1 — BACKEND (Google Apps Script) ===

1. Buka **https://script.google.com** → **Proyek Baru**.
2. Ganti nama file `Code.gs` menjadi `Kode` → hapus isinya → paste seluruh isi file `Kode.gs` yang diberikan terpisah di chat.
3. Klik ikon **+** di samping "File" → **Buat file baru** → pilih **JSON** → beri nama `appsscript` (kalau file `appsscript.json` sudah ada bawaan, langsung timpa isinya) → paste isi `appsscript.json` yang diberikan terpisah.
4. Jalankan `setupAppEnvironment` — **HANYA SEKALI**:
   - Di dropdown pilihan fungsi (atas editor), pilih **setupAppEnvironment** → klik **▶ Run**.
   - Akan muncul permintaan izin → klik **Review permissions** → pilih akun Google Anda → **Advanced** → **Go to (nama proyek) (unsafe)** → **Allow**.
   - Buka **Execution Log** (ikon di kiri, atau Ctrl+Enter) — pastikan muncul baris `✅ Setup selesai!` beserta `SPREADSHEET_ID` dan URL.
   - Cek Google Drive Anda: folder **📁 giG4-Bite - SDN Gebang 04** sudah terbuat berisi Spreadsheet database dengan 16 sheet (Users, Vendors, Products, Transactions, dll) — sudah terisi data contoh (kategori, produk, harga, stok) sesuai mockup.
   - ⚠️ **JANGAN jalankan `setupAppEnvironment` lebih dari sekali** — akan membuat folder & spreadsheet duplikat. Kalau tidak sengaja terjadi, hapus manual folder duplikat di Drive lalu jalankan sekali lagi.
5. **Deploy** → **New deployment** → klik ikon gerigi → pilih **Web app**:
   - Description: bebas, misal "giG4-Bite v1"
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy** → izinkan akses jika diminta lagi → **Copy** URL yang diakhiri `/exec`.

Simpan URL `/exec` ini — dibutuhkan di langkah berikutnya.

**Akun uji coba yang sudah dibuat otomatis:**
| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Petugas | `lina` | `lina123` |

> Ganti password ini nanti langsung di sheet `Users` (kolom `password_hash` & `salt` — regenerasi manual, atau minta bantuan saya membuatkan fitur ganti password).

---

## === BAGIAN 2 — FRONTEND (GitHub Pages) ===

1. **Sebelum push**, buka file `js/config.js` di folder frontend, ganti baris:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID_ANDA/exec';
   ```
   dengan URL `/exec` dari Bagian 1 langkah 5.
2. Ikuti panduan deploy ke GitHub Pages langkah-demi-langkah lewat terminal (git init → commit → push → aktifkan Pages) — saya akan pandu di chat begitu Anda siap, atau ikuti dokumen deploy yang sudah tersedia.
3. Folder yang di-`git init` adalah **folder hasil ekstraksi ZIP ini** (tempat `index.html` berada di root) — bukan folder pembungkus apa pun.

---

## === TEST ===

1. Buka URL GitHub Pages Anda → halaman login harus muncul.
2. Login dengan akun `lina` / `lina123`.
3. Tap beberapa kartu produk → angka "Terjual" & stok harus berubah instan, dan tersimpan (refresh halaman → data tetap ada, sudah tersimpan di Google Sheets).
4. Klik **↩ Batalkan Tap** → tap terakhir Anda dibatalkan, stok kembali.
5. Klik **🔒 TUTUP TRANSAKSI** → modal rekonsiliasi muncul dengan total sistem & rincian hak pedagang.
6. Isi "Uang Fisik Kasir" → lihat status **SESUAI** / **SELISIH** otomatis → **Kunci Sesi & Simpan Rekonsiliasi**.
7. Buka tab **Riwayat** → transaksi hari ini muncul dengan urutan waktu terbaru.
8. Buka **Chrome DevTools → Network** → pastikan tidak ada error CORS pada request ke `/exec`.

---

## Struktur data (Google Sheets) yang dibuat otomatis

`AppConfig, Users, Sessions, Vendors, Categories, Products, ProductPrices, DailySessions, StockEntries, StockCurrent, Transactions, TransactionCorrections, DailyReconciliation, VendorPayments, VendorPaymentDetails, CashTransactions, AuditLogs`

Semua aturan bisnis inti dari PRD sudah ditegakkan di server (bukan hanya di tampilan):
- Snapshot harga & bagi hasil disimpan per transaksi (harga lama tidak berubah walau master harga diubah nanti).
- Stok tidak bisa minus; produk stok 0 ditolak di server meski tombolnya "berhasil" ditekan di UI.
- `client_event_id` mencegah transaksi ganda (idempotency) bila ada retry jaringan.
- Batalkan tap hanya bisa membatalkan tap milik petugas yang sedang login, dan hanya yang terbaru.
- Setiap aksi penting (login, tap, batal, koreksi, tutup, rekonsiliasi) tercatat di `AuditLogs`.
- Tutup Transaksi tidak mengunci data secara permanen — koreksi (`koreksiTransaksi`) tetap tersedia setelahnya.
