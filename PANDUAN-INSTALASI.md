# PANDUAN INSTALASI — e-SURAT v4.1

Sistem Persuratan & Kearsipan Digital
**Backend:** Google Apps Script (REST API JSON) · **Frontend:** GitHub Pages

Total waktu pemasangan ± 25 menit. Ikuti berurutan, jangan melompat.

---

## Ringkasan Arsitektur

```
┌──────────────────────────────────────┐
│  FRONTEND — GitHub Pages             │
│  index.html · css/style.css          │
│  js/ (10 berkas)                     │
│           fetch() JSON               │
└──────────────┬───────────────────────┘
               │  HTTPS
┌──────────────┴───────────────────────┐
│  BACKEND — Google Apps Script        │
│  9 berkas .gs (doGet / doPost)       │
│  Google Sheets · Drive · Docs · Gmail│
└──────────────────────────────────────┘
```

Tidak ada iframe, tidak ada `google.script.run`, tidak ada HtmlService.

---

# BAGIAN A — BACKEND (Google Apps Script)

## A1. Buat proyek Apps Script

1. Buka <https://script.google.com> → **Proyek Baru**
2. Klik nama proyek di kiri atas → ganti menjadi **e-SURAT Backend**

## A2. Salin kesembilan berkas `.gs`

Di panel kiri (Editor), berkas bawaan bernama `Code.gs`.

1. Ganti namanya menjadi **`Kode`** (klik ⋮ → Rename). Hapus seluruh isinya, tempel isi `Kode.gs`.
2. Tambahkan delapan berkas baru dengan tombol **+ → Script**, dengan nama **persis** berikut:

| Urutan | Nama berkas | Peran |
|---|---|---|
| 1 | `Kode` | Router REST API, konfigurasi, utilitas inti |
| 2 | `Setup` | Pemasangan otomatis: 24 sheet, folder Drive, 9 template Docs |
| 3 | `Auth` | Login token, RBAC 3 peran, ganti kata sandi |
| 4 | `Data` | Bootstrap, CRUD, master data, unggah berkas |
| 5 | `Nomor` | Penomoran otomatis terkunci LockService |
| 6 | `Dokumen` | Mesin template Google Docs, konverter HTML→Docs, PDF |
| 7 | `Pengajuan` | Pengajuan publik, pelacakan, verifikasi berjenjang |
| 8 | `Notifikasi` | Surel, WhatsApp gateway, Gemini AI |
| 9 | `Laporan` | Dashboard, rekapitulasi, capaian SLA |

> Apps Script menambahkan akhiran `.gs` sendiri — cukup ketik `Setup`, bukan `Setup.gs`.

3. Tempel isi masing-masing berkas, lalu **Ctrl+S** (Simpan).

## A3. Jalankan pemasangan otomatis — HANYA SEKALI

> ℹ️ **Penting soal dropdown fungsi.** Dropdown di sebelah tombol ▶ Jalankan hanya menampilkan fungsi dari **berkas yang sedang aktif** di panel kiri. Jadi kalau `Kode.gs` yang terbuka, Anda tidak akan melihat `setupAppEnvironment` — itu normal, bukan kode yang rusak.

Ada dua cara, pilih salah satu:

**Cara 1 — dari `Kode.gs` (paling mudah)**

1. Pastikan `Kode.gs` terbuka di panel kiri
2. Pada dropdown fungsi, pilih **`PASANG_APLIKASI`**
3. Klik **▶ Jalankan**

**Cara 2 — dari `Setup.gs`**

1. Klik **`Setup.gs`** di daftar berkas panel kiri
2. Pada dropdown fungsi, pilih **`setupAppEnvironment`**
3. Klik **▶ Jalankan**

Keduanya menjalankan proses yang sama persis — `PASANG_APLIKASI()` hanyalah pintasan yang memanggil `setupAppEnvironment()`.

Selanjutnya:
3. Muncul "Authorization required" → **Review permissions** → pilih akun Anda
4. Layar "Google hasn't verified this app" → **Advanced** → **Go to e-SURAT Backend (unsafe)** → **Allow**

> Peringatan ini normal untuk skrip pribadi yang belum melalui verifikasi Google. Skrip hanya mengakses Drive, Sheets, Docs, dan Gmail milik akun Anda sendiri.

5. Buka **Execution log** dan pastikan muncul:

```
✅ Folder Drive dibuat: ...
✅ Spreadsheet dibuat: ...
✅ 24 sheet basis data dibuat.
✅ Data awal (master, pengguna, jenis surat, alur verifikasi) terisi.
✅ Template Google Docs: 9 dibuat, 0 sudah ada.
   PEMASANGAN SELESAI
```

6. Periksa Google Drive Anda — folder **`e-SURAT_Storage`** sudah ada, berisi 10 sub-folder dan berkas **`DB_e-SURAT`**.

7. **Verifikasi hasil pemasangan:** dari `Kode.gs`, pilih fungsi **`CEK_PEMASANGAN`** → ▶ Jalankan → buka Execution log. Seharusnya muncul seluruh ID, jumlah sheet **24**, template Docs **9**, dan akun pengguna **3**.

> ⚠️ **Jangan pernah menjalankan `setupAppEnvironment()` dua kali.** Bila terlanjur, hapus folder dan spreadsheet duplikat dari Drive, jalankan `resetEnvironment()`, baru pasang ulang.

## A4. Deploy sebagai Web App

1. Kanan atas → **Deploy** → **New deployment**
2. Ikon gerigi ⚙ di sebelah "Select type" → **Web app**
3. Isi:

| Kolom | Nilai |
|---|---|
| Description | e-SURAT v4.1 |
| Execute as | **Me (email Anda)** |
| Who has access | **Anyone** |

> **"Anyone"**, bukan "Anyone with Google account". Bila salah, portal publik akan menampilkan halaman login Google dan aplikasi gagal memuat.

4. **Deploy** → salin **Web app URL** yang berakhiran `/exec`

Contoh: `https://script.google.com/macros/s/AKfycbx.....................­/exec`

Simpan URL ini — dibutuhkan pada langkah B1.

---

# BAGIAN B — FRONTEND (GitHub Pages)

## B1. Isi URL backend — WAJIB sebelum push

1. Ekstrak berkas ZIP `esurat-frontend.zip`
2. Buka **`js/config.js`** dengan Notepad / VS Code
3. Cari baris ke-19:

```js
var GAS_URL = 'GANTI_DENGAN_URL_EXEC_ANDA';
```

4. Ganti menjadi URL dari langkah A4:

```js
var GAS_URL = 'https://script.google.com/macros/s/AKfycbx..../exec';
```

5. Simpan.

> Bila langkah ini dilewati, situs akan menampilkan pesan *"Alamat backend belum dikonfigurasi"* pada layar muat.

## B2. Struktur folder — periksa sebelum `git init`

Folder hasil ekstraksi **itulah** folder repository. Isinya harus persis:

```
esurat-frontend/          ← jalankan git init DI SINI
├── index.html            ← wajib berada di root
├── README.md
├── PANDUAN-INSTALASI.md
├── css/
│   └── style.css
└── js/
    ├── config.js
    ├── api.js
    ├── ui.js
    ├── publik.js
    ├── admin.js
    ├── surat.js
    ├── verifikasi.js
    ├── laporan.js
    ├── pengaturan.js
    └── app.js
```

> ⚠️ **Kesalahan paling sering:** menjalankan `git init` satu level terlalu tinggi. Semua perintah git akan berhasil tanpa pesan error, tetapi situs menampilkan **404**. Wajib pastikan `dir` (Windows) atau `ls` menampilkan `index.html` **sebelum** `git init`.

## B3. Pasang Git (sekali seumur hidup komputer)

- **Windows:** unduh <https://git-scm.com/download/win>, install dengan pengaturan bawaan
- **Mac:** buka Terminal, ketik `git --version` — macOS menawarkan instalasi otomatis
- **Linux:** `sudo apt install git`

Verifikasi:

```bash
git --version
```

## B4. Setel identitas Git (sekali saja)

```bash
git config --global user.name "Nama Lengkap Anda"
git config --global user.email "email@sama-dengan-github.com"
```

> `user.name` bebas — hanya label pada riwayat commit, bukan username GitHub.

## B5. Buat repository di GitHub

1. Daftar/masuk di <https://github.com>
2. Tombol **+** kanan atas → **New repository**
3. Isi:
   - **Repository name:** `esurat` (nama ini menjadi bagian URL situs)
   - **Public** — wajib, GitHub Pages gratis hanya untuk repo publik
   - **JANGAN** centang README / .gitignore / license

> Aman menjadikannya publik: berkas frontend tidak memuat kredensial apa pun. Token WhatsApp dan API key Gemini tersimpan di Spreadsheet milik Anda, bukan di repo.

## B6. Push pertama kali

Buka terminal **di dalam folder hasil ekstraksi**.

> 💡 Windows: buka folder di File Explorer, klik address bar, ketik `powershell`, Enter.

Jalankan satu per satu:

```bash
dir
```
Pastikan `index.html`, `css`, dan `js` terlihat. Kalau belum, `cd` ke folder yang benar dulu.

```bash
git init
git add .
git commit -m "Upload pertama e-SURAT"
git branch -M main
git remote add origin https://github.com/USERNAME/esurat.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda.

Saat diminta:
- **Username:** username GitHub
- **Password:** **Personal Access Token**, bukan kata sandi akun

> 💡 Saat mengetik/menempel token, **layar tetap kosong** — tidak ada bintang atau karakter yang muncul. Ini normal. Tekan Enter setelah menempel.

### Membuat Personal Access Token

Bila muncul `Password authentication is not supported`:

1. Buka <https://github.com/settings/tokens>
2. **Generate new token** → **Generate new token (classic)**
3. Isi: **Note** `git-push-token` · **Expiration** `90 days`
4. Centang scope **✅ repo**
5. **Generate token** → salin token `ghp_...` (hanya tampil sekali, simpan di Notepad)
6. Ulangi `git push -u origin main`, tempel token sebagai password

Tanda berhasil: muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

## B7. Aktifkan GitHub Pages

1. Buka `https://github.com/USERNAME/esurat`
2. Pastikan di root terlihat `index.html` serta folder `css/` dan `js/` — **bukan** berkas CSS/JS berserakan di root
3. Tab **Settings** → sidebar kiri **Pages**
4. Isi:

| Kolom | Nilai |
|---|---|
| Source | Deploy from a branch |
| Branch | **main** · **/ (root)** |
| Enforce HTTPS | ✅ **wajib dicentang** |

5. **Save**, tunggu 1–2 menit, refresh. Muncul:

> Your site is live at `https://USERNAME.github.io/esurat/`

> ⚠️ **Enforce HTTPS wajib.** Fitur perekam suara notulensi memerlukan HTTPS — tanpa itu browser memblokir akses mikrofon.

## B8. Uji end-to-end

1. Buka URL situs → portal publik tampil, hero berganti otomatis
2. Isi formulir pengajuan mahasiswa, unggah 3 berkas wajib, kirim
3. Salin nomor referensi → tab **Lacak Status** → cek linimasa muncul
4. Klik **Masuk Admin** → `admin@esurat.local` / `admin123`
5. Dashboard tampil dengan KPI dan grafik
6. Buka **Pengajuan Mahasiswa** → **Review** → setujui satu jenjang
7. Buka Spreadsheet `DB_e-SURAT` → pastikan baris baru tercatat

---

# BAGIAN C — KONFIGURASI AWAL (setelah login)

Login sebagai Super Admin → menu **Pengaturan Master Data**.

| Urutan | Tab | Yang dikerjakan |
|---|---|---|
| 1 | **Keamanan Akun** | **Ganti kata sandi ketiga akun bawaan — kerjakan pertama.** |
| 2 | Identitas Institusi | Nama, alamat, kota, telepon, surel, kode institusi, tahun akademik |
| 3 | Pengguna & Hak Akses | Daftarkan akun admin & pimpinan sesungguhnya, nonaktifkan akun contoh |
| 4 | Pejabat & TTD | Data pejabat + unggah spesimen TTE (PNG latar transparan 600×300) |
| 5 | Format Penomoran | Sesuaikan format dan **nomor berjalan** dengan buku agenda manual |
| 6 | Alur Verifikasi | Atur jenjang mahasiswa & dosen sesuai struktur institusi |
| 7 | Program Studi / Skema / Klasifikasi | Sesuaikan daftar dropdown formulir |
| 8 | Template Google Docs | Klik tiap template → **Edit di Google Docs** → ganti baris kop dengan **gambar kop resmi** |
| 9 | Notifikasi & Integrasi | Aktifkan surel; isi token Fonnte & API key Gemini bila dipakai |
| 10 | Hero Portal & Pengumuman | Sesuaikan judul portal dan pengumuman berjalan |

## Akun bawaan

| Peran | Surel | Kata sandi | Kemampuan |
|---|---|---|---|
| SUPER_ADMIN | `admin@esurat.local` | `admin123` | Seluruh akses + master data + bypass verifikasi |
| ADMIN | `tatausaha@esurat.local` | `admin123` | Seluruh modul kecuali master data |
| PIMPINAN | `pimpinan@esurat.local` | `admin123` | Baca saja + verifikasi |

> 🔴 **Ganti ketiganya sebelum aplikasi dipakai sungguhan.**

## Memasang kop surat pada template

Kop surat **tidak** dihasilkan sistem — Anda menyisipkannya sendiri sebagai gambar:

1. Pengaturan → **Template Google Docs** → klik ikon buka pada jenis surat
2. Dokumen terbuka di Google Docs
3. Hapus 4 baris teks kop dan baris catatan merah
4. **Sisipkan → Gambar → Unggah dari komputer** → pilih gambar kop resmi
5. Atur lebar gambar selebar halaman, lalu tutup (Google Docs menyimpan otomatis)
6. Jangan hapus penanda `{{NOMOR}}`, `{{ISI}}`, `{{TTE}}`, `{{QR}}`, dan sejenisnya

---

# BAGIAN D — CARA MEMPERBARUI (REDEPLOY)

## Frontend berubah

Dari folder proyek:

```bash
git add .
git commit -m "Deskripsi singkat perubahan"
git push
```

GitHub Pages rebuild otomatis 1–2 menit. Bila masih versi lama → **Ctrl+Shift+R** (hard refresh) atau buka jendela Incognito.

## Backend berubah

1. Tempel kode baru di editor Apps Script → **Ctrl+S**
2. **Deploy** → **Manage deployments** → ikon pensil ✏ → **Version: New version** → **Deploy**

> Menekan Save saja **tidak** memperbarui Web App. Wajib deploy versi baru. URL `/exec` tetap sama.

---

# BAGIAN E — MEMPERBARUI DARI v4.0 KE v4.1

Bila e-SURAT **sudah pernah terpasang** dan kini Anda memasang berkas v4.1, ikuti tiga langkah ini.
Data lama tidak akan hilang — migrasi hanya **menambah** sheet dan kolom baru.

### E1. Ganti kesembilan berkas `.gs`

Buka editor Apps Script → buka tiap berkas → **pilih seluruh isi (Ctrl+A) → tempel isi baru** → **Ctrl+S**.

### E2. Jalankan migrasi skema — WAJIB

1. Klik berkas **`Kode.gs`** di daftar berkas
2. Dropdown fungsi → pilih **`MIGRASI_SKEMA`** → **Run**
3. Tunggu sampai log menampilkan "Migrasi selesai"

Migrasi ini menambahkan:

| Yang ditambahkan | Keterangan |
|---|---|
| Sheet **`Master_Berkas_Syarat`** | Daftar berkas persyaratan portal + status Wajib/Opsional (terisi 8 baris bawaan) |
| Kolom **`fileScanUrl`** pada `Berita_Acara`, `MOU`, `Arsip_Dokumen_Penting`, `Surat_Keterangan` | Menyimpan tautan hasil pindai surat asli bertanda tangan basah |
| Kolom **`diperbarui`** | Jejak waktu perubahan terakhir tiap data |
| Konfigurasi **`INSTITUSI_LOGO`** & **`INSTITUSI_LOGO_ID`** | Logo aplikasi hasil unggahan gambar |

### E3. Deploy versi baru + ganti berkas frontend

1. **Deploy** → **Manage deployments** → ikon pensil ✏ → **Version: New version** → **Deploy**
2. Ganti seluruh isi folder frontend dengan yang baru, **isi kembali `GAS_URL` pada `js/config.js`**, lalu `git add . && git commit -m "Upgrade v4.1" && git push`
3. Buka aplikasi dengan **Ctrl+Shift+R** (hard refresh) agar berkas JavaScript lama tidak dipakai ulang

---

# BAGIAN F — FITUR BARU v4.1

## F1. Berkas persyaratan: Wajib atau Opsional dapat diatur

**Pengaturan → Berkas Syarat Pengajuan.**

Setiap baris menentukan satu slot unggahan pada portal publik: berlaku untuk pengajuan
**mahasiswa** atau **dosen**, nama berkas, keterangan, urutan tampil, dan **Sifat: Wajib / Opsional**.

- Slot **Wajib** → pemohon tidak dapat mengirim formulir sebelum berkas itu diunggah
- Slot **Opsional** → boleh dikosongkan
- Menonaktifkan baris (Status → Nonaktif) menyembunyikan slot dari portal tanpa menghapus datanya
- Perubahan berlaku seketika di portal publik, tanpa deploy ulang

Kolom **Kunci** adalah nama teknis yang tersimpan bersama berkas pemohon — biarkan apa adanya kecuali Anda paham akibatnya.

## F2. Semua pratinjau dokumen tampil sebagai popup

Di mana pun dokumen dibuka — portal publik, tabel admin, panel verifikasi, laporan, atau arsip —
dokumen tampil di **jendela popup di dalam aplikasi**, tidak pernah membuka tab baru.
Setiap popup menyediakan tombol **Unduh Dokumen** dan **Tutup**.

## F3. Aksi baris lebih lengkap + pratinjau berdampingan

Kolom Aksi tiap tabel kini berisi: **Detail · Pratinjau · Ubah · Unggah Scan Asli · Hapus**
(menyesuaikan hak akses dan status dokumen).

Jendela **Detail** kini terbagi dua kolom: rincian data di kiri, **pratinjau dokumen langsung di kanan**,
lengkap dengan tombol **Unduh**, **Ganti Scan Asli**, serta **Edit Data** dan **Hapus** di bagian bawah.
Tombol "buka PDF" terpisah tidak diperlukan lagi.

## F4. Arsip surat asli bertanda tangan basah

Setiap dokumen yang sudah digenerate/dicetak dapat dilampiri **hasil pindai surat aslinya**.

1. Klik ikon **Unggah Scan Asli** pada baris data, atau tombol serupa di jendela Detail
2. Pilih berkas PDF/gambar hasil pindai (maksimal sesuai batas pada Pengaturan → Tampilan & Dokumen)
3. Berkas tersimpan di Google Drive dan tampil sebagai **Arsip Scan Asli (Tanda Tangan Basah)**
   terpisah dari PDF terbitan sistem, sehingga keduanya dapat dibandingkan

## F5. Lembar kerja tidak lagi tertutup saat menyisipkan tabel

Dialog **Sisipkan Tabel** kini terbuka sebagai lapisan baru **di atas** lembar kerja.
Menekan **Sisipkan** atau **Batal** hanya menutup dialog itu — naskah, perihal, dan seluruh
isian yang sudah diketik tetap utuh, dan tabel disisipkan tepat pada posisi kursor terakhir.
Perilaku yang sama berlaku untuk seluruh dialog bertingkat di aplikasi (konfirmasi, unggah, edit dari detail).

## F6. Logo aplikasi diunggah sebagai gambar

**Pengaturan → Identitas Institusi → Logo Aplikasi.**

Klik **Pilih Gambar Logo** → pilih berkas PNG/JPG/WEBP (maksimal 2 MB, disarankan persegi minimal 256×256)
→ **Unggah & Terapkan**. Logo langsung dipakai pada navigasi portal publik, panel admin, dan favicon
halaman. Tombol **Pakai Lambang Bawaan** mengembalikan tampilan semula.

## F7. Masuk ke dashboard tanpa jeda

- Proses **login sekaligus mengambil data panel** dalam satu permintaan — satu perjalanan penuh ke
  server dihemat (terukur ± 0,5 detik sampai dashboard tampil)
- Membuka ulang halaman memakai **snapshot panel** yang tersimpan di peramban: dashboard tampil
  seketika, lalu data disegarkan diam-diam di latar belakang
- Snapshot otomatis kedaluwarsa setelah 30 menit dan terhapus saat Keluar


---

# TROUBLESHOOTING

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Alamat backend belum dikonfigurasi" | `GAS_URL` belum diisi | Edit `js/config.js`, isi URL `/exec`, push ulang |
| "Server meminta login Google" | Deployment memakai "Anyone with Google account" | Deploy ulang dengan **Who has access: Anyone** |
| "Server mengembalikan halaman HTML" | URL salah (berakhiran `/dev`) atau deployment lama | Pakai URL `/exec` dari deployment terbaru |
| "Server tidak merespons dalam 25 detik" | `setupAppEnvironment()` belum dijalankan | Jalankan fungsi tersebut, cek Execution log |
| Sheet "..." tidak ditemukan | Skema belum lengkap | Jalankan `MIGRASI_SKEMA` dari `Kode.gs` |
| Tab "Berkas Syarat Pengajuan" kosong | Sheet baru belum dibuat | Jalankan `MIGRASI_SKEMA` dari `Kode.gs`, lalu muat ulang halaman |
| Slot unggahan portal masih daftar lama | Berkas JavaScript lama masih di-cache peramban | Tekan **Ctrl+Shift+R** (hard refresh) |
| Pratinjau popup tampil kosong | Berkas di Drive belum dibagikan publik | Buka berkas di Drive → Bagikan → "Siapa saja yang memiliki link" → Pelihat; atau pakai tombol **Unduh Dokumen** |
| Logo hasil unggah tidak muncul | Perubahan konfigurasi belum termuat | Muat ulang halaman dengan Ctrl+Shift+R |
| `setupAppEnvironment` tidak ada di dropdown | Dropdown hanya menampilkan fungsi berkas aktif | Klik `Setup.gs` dulu, atau jalankan `PASANG_APLIKASI` dari `Kode.gs` |
| Tidak yakin pemasangan berhasil | — | Jalankan `CEK_PEMASANGAN` dari `Kode.gs`, baca Execution log |
| Halaman 404 GitHub Pages | `git init` di folder induk | Lihat **Prosedur Perbaikan** di bawah |
| Tampil tanpa styling, Console 404 CSS/JS | Berkas rata di root tanpa folder | Buat folder `css/` & `js/`, pindahkan berkas, push ulang |
| Template Google Docs belum tersedia | Template belum dibuat | Pengaturan → Template Google Docs → **Buat Template yang Belum Ada** |
| Perekam suara tidak jalan | Situs diakses via HTTP | Aktifkan **Enforce HTTPS** pada Settings → Pages |
| Transkripsi AI nonaktif | API key Gemini kosong | Isi di Pengaturan → Notifikasi & Integrasi |
| Surel notifikasi tidak terkirim | Kuota Gmail habis (±100/hari) | Tunggu 24 jam atau pakai akun Google Workspace |
| `LF will be replaced by CRLF` | Perbedaan format baris Windows/Linux | **Abaikan** — ini peringatan, bukan error |
| `remote origin already exists` | `git remote add` sudah pernah jalan | Lewati, atau `git remote set-url origin <url>` |
| `src refspec main does not match any` | Belum ada commit | Jalankan `git add .` lalu `git commit -m "..."` |

## Prosedur Perbaikan: salah folder yang di-push (404)

Ciri: situs 404, semua perintah git berhasil, dan di halaman repo yang terlihat di root adalah **folder**, bukan `index.html`.

```bash
cd "C:\path\ke\esurat-frontend"
dir
```

Wajib terlihat `index.html`, `css`, `js`. Baru lanjut:

```bash
git init
git add .
git commit -m "Fix: push dari folder frontend"
git branch -M main
git remote add origin https://github.com/USERNAME/esurat.git
git push -u origin main --force
```

`--force` menimpa isi repository dengan versi lokal. Aman di sini karena isi lama memang struktur yang salah.

---

# CATATAN TEKNIS

| Batasan | Nilai |
|---|---|
| Waktu eksekusi maksimum per panggilan | 6 menit (batas Apps Script) |
| Kuota surel harian — Google Workspace | ± 1.500 |
| Kuota surel harian — Gmail biasa | ± 100 |
| Masa berlaku sesi login | 6 jam (CacheService) |
| Ukuran berkas unggahan (bawaan) | 2 MB, dapat diubah di Pengaturan |
| Ukuran audio untuk transkripsi AI | maksimal 15 MB |
| Jumlah sheet basis data | 24 |
| Template Google Docs starter | 9 |

## Keamanan

- Kata sandi disimpan sebagai hash SHA-256, tidak pernah sebagai teks biasa
- Token sesi disimpan di `CacheService` sisi server dan `sessionStorage` klien — tidak pernah muncul di URL
- Validasi berkas dilakukan di sisi klien **dan** server
- Seluruh aksi penting tercatat pada sheet `Log_Aktivitas`
- Penomoran memakai `LockService` — tidak ada nomor ganda meski dua admin menerbitkan bersamaan

## Glosarium singkat

- **Repository** — folder proyek di GitHub
- **Commit** — menyimpan perubahan dengan catatan, riwayatnya tercatat
- **Push** — mengirim commit dari komputer ke GitHub
- **Branch** — cabang proyek; yang dipakai di sini `main`
- **Personal Access Token** — "kata sandi khusus" GitHub untuk operasi git lewat terminal

---

*e-SURAT v4.1 · Arsitektur GAS-PRO-API · Dokumentasi dalam Bahasa Indonesia*
