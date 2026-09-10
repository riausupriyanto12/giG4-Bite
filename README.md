# giG4-Bite — Kantin Digital SDN Gebang 04

Frontend statis (HTML/CSS/JS vanilla) untuk sistem kasir digital kantin sekolah, di-deploy ke GitHub Pages.
Backend berupa REST API di Google Apps Script (`Kode.gs`, disediakan terpisah — lihat `PANDUAN-INSTALASI.md`).

## Struktur
```
index.html        ← Login (root, wajib untuk GitHub Pages)
app.html           ← Beranda + Transaksi 1-Tap + Rekonsiliasi + Riwayat
css/style.css       ← Semua styling (token warna & tipografi dari DESIGN.md)
js/config.js        ← URL backend GAS (WAJIB diisi sebelum deploy)
js/api.js           ← Helper fetch + session localStorage
js/login.js         ← Logika halaman login
js/app.js           ← Logika POS (katalog, tap, undo, tutup, rekonsiliasi, riwayat)
```

## Sebelum deploy
Isi `js/config.js` dengan URL `/exec` dari deployment Google Apps Script Anda.

Lihat `PANDUAN-INSTALASI.md` untuk langkah lengkap backend + deploy.
