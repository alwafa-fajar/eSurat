# e-SURAT v4.0

**Sistem Persuratan & Kearsipan Digital** untuk perguruan tinggi.
Frontend statis (GitHub Pages) + Google Apps Script sebagai REST API murni.

---

## Yang harus dikerjakan sebelum push

Buka **`js/config.js`** baris 19 dan isi URL Web App Apps Script Anda:

```js
var GAS_URL = 'https://script.google.com/macros/s/AKfycb....../exec';
```

Tanpa ini, situs hanya menampilkan pesan "Alamat backend belum dikonfigurasi".

Panduan lengkap langkah demi langkah: **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**

---

## Struktur berkas

```
esurat-frontend/          ← root repository (git init di sini)
├── index.html            ← kerangka SPA: portal, login, panel admin
├── README.md
├── PANDUAN-INSTALASI.md
├── css/
│   └── style.css         ← design system, mode gelap, responsif
└── js/
    ├── config.js         ← ⚙ SATU-SATUNYA berkas yang perlu diubah
    ├── api.js            ← fetch ke Apps Script, sesi, unggahan
    ├── ui.js             ← toast, modal, tabel, editor naskah, format
    ├── publik.js         ← portal publik: hero, 2 formulir, pelacakan
    ├── admin.js          ← router SPA, sidebar, dashboard, CRUD umum
    ├── surat.js          ← generator Surat Keluar, SK, Berita Acara
    ├── verifikasi.js     ← antrean & panel verifikasi berjenjang
    ├── laporan.js        ← rekapitulasi, SLA, grafik, cetak & ekspor
    ├── pengaturan.js     ← 17 tab pengaturan & seluruh master data
    └── app.js            ← titik masuk, autentikasi, penangkap galat
```

Backend (9 berkas `.gs`) diserahkan terpisah dan **tidak** termasuk di repository ini.

---

## Fitur

### Portal publik (tanpa login)
- Hero slideshow, teks berjalan, popup pengumuman — semuanya dapat dikonfigurasi admin
- Formulir pengajuan **keringanan UKT & asrama** untuk mahasiswa
- Formulir pengajuan **insentif karya ilmiah** untuk dosen
- Unggah berkas dengan validasi ukuran/format di klien dan server, drag & drop
- Draf tersimpan otomatis di peramban — tidak hilang saat tab ditutup
- Pelacakan status dengan linimasa verifikasi dan riwayat lengkap

### Panel admin
- Dashboard: 4 KPI, grafik tren 9 bulan, distribusi kategori, antrean prioritas, analisis otomatis
- Surat Masuk — buku agenda dengan penomoran otomatis dan disposisi
- Surat Keluar — generator dari template Google Docs, editor naskah WYSIWYG, pratinjau PDF tanpa memakan nomor, TTE + QR validasi, tarik kembali
- Surat Keputusan — struktur Menimbang / Mengingat / Menetapkan
- Berita Acara & Notulensi — perekam suara, transkripsi Gemini AI, perapian notulensi otomatis
- MOU — pemantauan masa berlaku, peringatan 60 hari sebelum berakhir
- Verifikasi berjenjang split-view, mode bypass Super Admin, penerbitan Surat Keterangan
- Arsip dokumen penting, laporan & rekap dengan capaian SLA, ekspor CSV, cetak resmi
- 17 tab pengaturan + CRUD seluruh master data

### Lintas fitur
- Mode terang & gelap, responsif hingga lebar 360 px
- Penomoran terkunci `LockService` — anti nomor ganda
- Notifikasi surel (MailApp) dan WhatsApp (gateway Fonnte)
- Audit trail seluruh aksi penting
- RBAC tiga peran: SUPER_ADMIN, ADMIN, PIMPINAN

---

## Catatan teknis

- **Vanilla JavaScript** — tanpa framework, tanpa proses build
- Komunikasi `fetch()` ke `doGet`/`doPost` dengan `Content-Type: text/plain;charset=utf-8`
  (header JSON memicu CORS preflight yang diblokir Apps Script)
- Pustaka eksternal: Chart.js, qrcode-generator, Bootstrap Icons, Google Fonts — seluruhnya via CDN
- Seluruh kode dan komentar berbahasa Indonesia

---

## Lisensi & penggunaan

Bebas digunakan dan dimodifikasi oleh institusi pemilik. Identitas institusi, pejabat, format penomoran, alur verifikasi, dan seluruh master data dapat dikonfigurasi ulang dari panel Pengaturan tanpa menyentuh kode.
