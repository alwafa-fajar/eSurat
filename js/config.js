/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/config.js
   SATU-SATUNYA berkas yang perlu Anda ubah sebelum deploy.
   ═══════════════════════════════════════════════════════════════════ */

/**
 * ⚠️  WAJIB DIISI
 * Tempel URL Web App Google Apps Script yang berakhiran /exec di sini.
 *
 * Cara memperolehnya:
 *   Apps Script → Deploy → New Deployment → Web App
 *   Execute as     : Me
 *   Who has access : Anyone
 *   → Salin URL yang muncul.
 *
 * Contoh:
 *   var GAS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
 */
var GAS_URL = 'https://script.google.com/macros/s/AKfycbycSAqKhXgtTJ8cCrd7WEfRq6jDf2xqz4kZDFf63Gu2aKqWESxt17uJPJ45mgRiVU42eA/exec';

/* ── Pengaturan aplikasi klien ──────────────────────────────────── */
var APP = {
  nama: 'e-SURAT',
  versi: '4.1.0',

  // Kunci penyimpanan lokal peramban
  kunciSesi: 'esurat_sesi',
  kunciBoot: 'esurat_panel',
  kunciTema: 'esurat_tema',
  kunciDrafMhs: 'esurat_draf_mahasiswa',
  kunciDrafDsn: 'esurat_draf_dosen',

  // Batas waktu permintaan ke server (ms)
  batasWaktu: 60000,
  batasWaktuUnggah: 180000,

  // Jumlah baris per halaman pada tabel
  barisPerHalaman: 12
};

/* ── Peta label status → gaya lencana ───────────────────────────── */
var GAYA_STATUS = {
  MENUNGGU:  { kelas: 'warn', teks: 'Menunggu',   ikon: 'bi-hourglass-split' },
  DIPROSES:  { kelas: 'info', teks: 'Diproses',   ikon: 'bi-arrow-repeat' },
  DISETUJUI: { kelas: 'ok',   teks: 'Disetujui',  ikon: 'bi-check-circle' },
  DITOLAK:   { kelas: 'dang', teks: 'Ditolak',    ikon: 'bi-x-circle' },
  REVISI:    { kelas: 'warn', teks: 'Perlu Revisi', ikon: 'bi-pencil-square' },
  TERBIT:    { kelas: 'ok',   teks: 'Terbit',     ikon: 'bi-patch-check' },
  DRAF:      { kelas: 'neut', teks: 'Draf',       ikon: 'bi-file-earmark' },
  AKTIF:     { kelas: 'ok',   teks: 'Aktif',      ikon: 'bi-check-circle' },
  BERAKHIR:  { kelas: 'neut', teks: 'Berakhir',   ikon: 'bi-calendar-x' },
  DIBATALKAN:{ kelas: 'dang', teks: 'Dibatalkan', ikon: 'bi-slash-circle' },
  DITARIK:   { kelas: 'dang', teks: 'Ditarik',    ikon: 'bi-arrow-counterclockwise' },
  DITERIMA:  { kelas: 'info', teks: 'Diterima',   ikon: 'bi-inbox' }
};

/* ── Definisi modul admin (dipakai sidebar & router) ────────────── */
var MODUL_ADMIN = [
  { grup: 'Navigasi Utama' },
  { kunci: 'dashboard',      nama: 'Ringkasan Dashboard',   ikon: 'bi-grid-1x2' },
  { kunci: 'suratMasuk',     nama: 'Surat Masuk',           ikon: 'bi-envelope-open' },
  { kunci: 'suratKeluar',    nama: 'Surat Keluar & Generator', ikon: 'bi-envelope-paper' },
  { kunci: 'beritaAcara',    nama: 'Berita Acara & Notulensi', ikon: 'bi-journal-text' },
  { kunci: 'sk',             nama: 'Surat Keputusan (SK)',  ikon: 'bi-file-earmark-ruled' },
  { kunci: 'mou',            nama: 'Dokumen MOU',           ikon: 'bi-briefcase' },

  { grup: 'Layanan Akademik' },
  { kunci: 'pengajuanMhs',   nama: 'Pengajuan Mahasiswa',   ikon: 'bi-mortarboard' },
  { kunci: 'pengajuanDosen', nama: 'Pengajuan Dosen',       ikon: 'bi-person-badge' },

  { grup: 'Arsip & Rekapitulasi' },
  { kunci: 'arsip',          nama: 'Arsip Dokumen Penting', ikon: 'bi-archive' },
  { kunci: 'laporan',        nama: 'Laporan & Rekap',       ikon: 'bi-bar-chart' },
  { kunci: 'pengaturan',     nama: 'Pengaturan Master Data', ikon: 'bi-sliders', peran: ['SUPER_ADMIN'] }
];

/* ── Skema kolom tabel tiap modul ───────────────────────────────── */
var KOLOM_MODUL = {
  suratMasuk: [
    { k: 'nomorAgenda',  l: 'No. Agenda',    tipe: 'mono' },
    { k: 'tanggalTerima',l: 'Tgl Terima',    tipe: 'tanggal' },
    { k: 'asalInstansi', l: 'Asal Instansi' },
    { k: 'perihal',      l: 'Perihal',       tipe: 'utama' },
    { k: 'sifat',        l: 'Sifat',         tipe: 'lencana' },
    { k: 'tujuanDisposisi', l: 'Disposisi' }
  ],
  suratKeluar: [
    { k: 'nomorSurat',   l: 'Nomor Surat',   tipe: 'mono' },
    { k: 'tanggalSurat', l: 'Tanggal',       tipe: 'tanggal' },
    { k: 'jenisSurat',   l: 'Jenis' },
    { k: 'perihal',      l: 'Perihal',       tipe: 'utama' },
    { k: 'pejabatJabatan', l: 'Penandatangan' },
    { k: 'status',       l: 'Status',        tipe: 'status' }
  ],
  beritaAcara: [
    { k: 'nomorDokumen', l: 'No. Dokumen',   tipe: 'mono' },
    { k: 'tanggal',      l: 'Tanggal',       tipe: 'tanggal' },
    { k: 'kategori',     l: 'Kategori',      tipe: 'lencana' },
    { k: 'agenda',       l: 'Agenda Rapat',  tipe: 'utama' },
    { k: 'lokasi',       l: 'Lokasi' },
    { k: 'status',       l: 'Status',        tipe: 'status' }
  ],
  sk: [
    { k: 'nomorSK',      l: 'Nomor SK',      tipe: 'mono' },
    { k: 'tanggalSK',    l: 'Tanggal',       tipe: 'tanggal' },
    { k: 'jenisSK',      l: 'Jenis SK' },
    { k: 'tentang',      l: 'Tentang',       tipe: 'utama' },
    { k: 'pejabatJabatan', l: 'Penandatangan' },
    { k: 'status',       l: 'Status',        tipe: 'status' }
  ],
  mou: [
    { k: 'nomorMOU',     l: 'Nomor MOU',     tipe: 'mono' },
    { k: 'pihakTerkait', l: 'Pihak Terkait', tipe: 'utama' },
    { k: 'kategori',     l: 'Kategori' },
    { k: 'tanggalMulai', l: 'Mulai',         tipe: 'tanggal' },
    { k: 'tanggalBerakhir', l: 'Berakhir',   tipe: 'kadaluarsa' },
    { k: 'status',       l: 'Status',        tipe: 'status' }
  ],
  arsip: [
    { k: 'kodeArsip',    l: 'Kode Arsip',    tipe: 'mono' },
    { k: 'namaDokumen',  l: 'Nama Dokumen',  tipe: 'utama' },
    { k: 'kategori',     l: 'Kategori' },
    { k: 'lembagaPenerbit', l: 'Penerbit' },
    { k: 'tahunTerbit',  l: 'Tahun' },
    { k: 'klasifikasiAkses', l: 'Akses',     tipe: 'lencana' }
  ]
};
