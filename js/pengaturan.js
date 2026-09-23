/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/pengaturan.js  (v4.2)
   Pengaturan sistem & CRUD seluruh master data (khusus SUPER_ADMIN).

   v4.2:
   · Template Google Docs: tempel URL template instansi → PINDAI
     placeholder → atur label/tipe/wajib kolom isian generator
   · Model Gemini terbaru (tingkat gratis hingga Pro) + model kustom
   · Kunci rahasia tidak pernah dikirim ke peramban (tampil tersamar)
   ═══════════════════════════════════════════════════════════════════ */

var Ptr = { tab: 'identitas' };

var TAB_PENGATURAN = [
  { k: 'identitas',  n: 'Identitas Institusi',   i: 'bi-building' },
  { k: 'pejabat',    n: 'Pejabat & TTD',         i: 'bi-pen' },
  { k: 'jenisSurat', n: 'Format Penomoran',      i: 'bi-hash' },
  { k: 'templateDoc',n: 'Template Google Docs',  i: 'bi-file-earmark-richtext' },
  { k: 'alurVerifikasi', n: 'Alur Verifikasi',   i: 'bi-diagram-3' },
  { k: 'pengguna',   n: 'Pengguna & Hak Akses',  i: 'bi-people' },
  { k: 'prodi',      n: 'Program Studi',         i: 'bi-mortarboard' },
  { k: 'skema',      n: 'Skema Keringanan',      i: 'bi-cash-coin' },
  { k: 'klasifikasi',n: 'Klasifikasi Karya',     i: 'bi-journal-bookmark' },
  { k: 'berkasSyarat', n: 'Berkas Syarat Pengajuan', i: 'bi-list-check' },
  { k: 'templateDokumen', n: 'Template Internal (HTML)', i: 'bi-code-slash' },
  { k: 'berkasTemplate',  n: 'Berkas Template Unduhan',  i: 'bi-download' },
  { k: 'heroSlide',  n: 'Hero Portal',           i: 'bi-images' },
  { k: 'pengumuman', n: 'Pengumuman',            i: 'bi-megaphone' },
  { k: 'notifikasi', n: 'Notifikasi & Integrasi',i: 'bi-bell' },
  { k: 'tampilan',   n: 'Tampilan & Dokumen',    i: 'bi-palette' },
  { k: 'keamanan',   n: 'Keamanan Akun',         i: 'bi-shield-lock' },
  { k: 'log',        n: 'Log Aktivitas',         i: 'bi-clock-history' }
];

/** Model Gemini API — diperbarui September 2026. */
var MODEL_GEMINI = [
  { grup: 'Tingkat Gratis (Free Tier)' },
  { v: 'gemini-3.8-flash',      t: 'Gemini 3.8 Flash — terbaru & paling cerdas (disarankan)' },
  { v: 'gemini-3.7-flash',      t: 'Gemini 3.7 Flash' },
  { v: 'gemini-3.6-flash',      t: 'Gemini 3.6 Flash — seimbang kecepatan & multimodal' },
  { v: 'gemini-3.5-flash',      t: 'Gemini 3.5 Flash — stabil, volume tinggi' },
  { v: 'gemini-3.5-flash-lite', t: 'Gemini 3.5 Flash-Lite — tercepat & paling hemat kuota' },
  { v: 'gemini-3.1-flash-lite', t: 'Gemini 3.1 Flash-Lite' },
  { v: 'gemini-3-flash-preview',t: 'Gemini 3 Flash (Preview)' },
  { v: 'gemini-2.5-pro',        t: 'Gemini 2.5 Pro — penalaran mendalam (kuota gratis terbatas)' },
  { v: 'gemini-2.5-flash',      t: 'Gemini 2.5 Flash' },
  { akhirGrup: true },
  { grup: 'Berbayar (Pro — perlu penagihan aktif)' },
  { v: 'gemini-3.1-pro-preview',t: 'Gemini 3.1 Pro (Preview) — kecerdasan tertinggi' },
  { akhirGrup: true }
];

var MASTER_SKEMA = {
  pejabat: {
    judul: 'Pejabat Penandatangan',
    desk: 'Spesimen tanda tangan digital transparan dan legitimasi NIDN/NIPY yang disahkan SK Ketua.',
    kolom: [
      { k: 'nama', l: 'Nama & Jabatan', tipe: 'utama' },
      { k: 'jabatan', l: 'Jabatan Struktural' },
      { k: 'nidn', l: 'NIDN / NIPY', tipe: 'mono' },
      { k: 'tteAktif', l: 'TTE BSrE', tipe: 'lencana' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'nama', l: 'Nama Lengkap', wajib: true, kolom: 2 },
      { id: 'gelar', l: 'Gelar Akademik', kolom: 2, ph: 'M.Pd.I' },
      { id: 'jabatan', l: 'Jabatan Struktural', wajib: true, ph: 'Ketua STIS Al-Wafa' },
      { id: 'nidn', l: 'NIDN / NIPY', kolom: 2 },
      { id: 'urutan', l: 'Urutan Tampil', t: 'number', kolom: 2 },
      { id: 'fileTtdUrl', l: 'URL Spesimen TTE (PNG transparan)',
        bantu: 'Unggah berkas PNG latar transparan (600×300 px) ke Drive, lalu tempel tautannya di sini.' },
      { id: 'fileTtdId', l: 'ID Berkas Spesimen di Drive',
        bantu: 'Diisi otomatis bila Anda mengunggah lewat tombol di bawah tabel.' },
      { id: 'tteAktif', l: 'Aktifkan TTE pada dokumen', t: 'pilih', kolom: 2, opsi: ['true', 'false'] },
      { id: 'aktif', l: 'Status Pejabat', t: 'pilih', kolom: 2, opsi: ['true', 'false'] }
    ]
  },
  jenisSurat: {
    judul: 'Jenis Surat & Format Penomoran',
    desk: 'Struktur penomoran otomatis per jenis surat. Token: {NOMOR} {KODE} {INSTITUSI} {ROMAWI} {TAHUN} {BULAN} {TANGGAL}.',
    kolom: [
      { k: 'kode', l: 'Kode', tipe: 'mono' },
      { k: 'nama', l: 'Jenis Surat', tipe: 'utama' },
      { k: 'formatNomor', l: 'Format Penomoran' },
      { k: 'nomorBerjalan', l: 'Nomor Berjalan' },
      { k: 'tahunBerjalan', l: 'Tahun' },
      { k: 'modul', l: 'Modul' }
    ],
    bidang: [
      { id: 'kode', l: 'Kode Jenis', wajib: true, kolom: 2, ph: 'ST' },
      { id: 'nama', l: 'Nama Jenis Surat', wajib: true, kolom: 2, ph: 'Surat Tugas' },
      { id: 'formatNomor', l: 'Format Penomoran', wajib: true,
        ph: '{NOMOR}/{KODE}/{INSTITUSI}/{ROMAWI}/{TAHUN}',
        bantu: 'Contoh hasil: <span class="mono">005/ST/STIS-AL-WAFA/IX/2026</span>' },
      { id: 'nomorAwal', l: 'Nomor Awal', t: 'number', kolom: 2 },
      { id: 'nomorBerjalan', l: 'Nomor Berjalan Saat Ini', t: 'number', kolom: 2,
        bantu: 'Ubah hanya bila perlu menyelaraskan dengan buku agenda manual.' },
      { id: 'modul', l: 'Modul Pengguna', t: 'pilih', kolom: 2,
        opsi: ['suratKeluar', 'sk', 'suratMasuk', 'mou', 'beritaAcara'] },
      { id: 'aktif', l: 'Status', t: 'pilih', kolom: 2, opsi: ['true', 'false'] }
    ]
  },
  alurVerifikasi: {
    judul: 'Alur Verifikasi Berjenjang',
    desk: 'Urutan jenjang persetujuan untuk pengajuan mahasiswa dan dosen.',
    kolom: [
      { k: 'jenisPengajuan', l: 'Jenis', tipe: 'lencana' },
      { k: 'urutan', l: 'Urutan' },
      { k: 'namaTahap', l: 'Nama Tahap', tipe: 'utama' },
      { k: 'jabatan', l: 'Jabatan Verifikator' },
      { k: 'email', l: 'Verifikator Terkunci' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'jenisPengajuan', l: 'Jenis Pengajuan', wajib: true, t: 'pilih', kolom: 2,
        opsi: ['mahasiswa', 'dosen'] },
      { id: 'urutan', l: 'Urutan Jenjang', t: 'number', wajib: true, kolom: 2 },
      { id: 'namaTahap', l: 'Nama Tahap', wajib: true, ph: 'Verifikasi Berkas & Keuangan' },
      { id: 'jabatan', l: 'Jabatan Verifikator', wajib: true, ph: 'Pembantu Ketua II' },
      { id: 'email', l: 'Surel Akun Verifikator (opsional)', ph: 'puket2@kampus.ac.id, keuangan@kampus.ac.id',
        bantu: 'Isi surel akun login (pisahkan koma) untuk <b>mengunci</b> tahap ini hanya bagi akun tersebut. ' +
               'Kosongkan = seluruh Admin & Pimpinan boleh memverifikasi tahap ini.' },
      { id: 'aktif', l: 'Status', t: 'pilih', opsi: ['true', 'false'] }
    ]
  },
  pengguna: {
    judul: 'Pengguna & Hak Akses',
    desk: 'SUPER_ADMIN: akses penuh · ADMIN: seluruh modul kecuali master data · PIMPINAN: hanya baca dan verifikasi.',
    kolom: [
      { k: 'nama', l: 'Nama', tipe: 'utama' },
      { k: 'email', l: 'Surel' },
      { k: 'peran', l: 'Peran', tipe: 'lencana' },
      { k: 'jabatan', l: 'Jabatan' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'nama', l: 'Nama Lengkap', wajib: true, kolom: 2 },
      { id: 'email', l: 'Alamat Surel', t: 'email', wajib: true, kolom: 2 },
      { id: 'jabatan', l: 'Jabatan', kolom: 2 },
      { id: 'peran', l: 'Peran Akses', t: 'pilih', wajib: true, kolom: 2,
        opsi: ['SUPER_ADMIN', 'ADMIN', 'PIMPINAN'] },
      { id: 'password', l: 'Kata Sandi', t: 'password',
        bantu: 'Minimal 8 karakter. <b>Wajib</b> untuk akun baru; kosongkan bila tidak ingin mengubah kata sandi akun lama.' },
      { id: 'aktif', l: 'Status Akun', t: 'pilih', opsi: ['true', 'false'] }
    ]
  },
  prodi: {
    judul: 'Program Studi',
    desk: 'Daftar program studi yang muncul pada dropdown formulir pengajuan.',
    kolom: [
      { k: 'kode', l: 'Kode', tipe: 'mono' },
      { k: 'nama', l: 'Nama Program Studi', tipe: 'utama' },
      { k: 'jenjang', l: 'Jenjang' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'kode', l: 'Kode Prodi', wajib: true, kolom: 2, ph: 'HES' },
      { id: 'jenjang', l: 'Jenjang', t: 'pilih', kolom: 2, opsi: ['D3', 'S1', 'S2', 'S3'] },
      { id: 'nama', l: 'Nama Program Studi', wajib: true },
      { id: 'aktif', l: 'Status', t: 'pilih', opsi: ['true', 'false'] }
    ]
  },
  skema: {
    judul: 'Skema Keringanan Mahasiswa',
    desk: 'Kartu pilihan yang tampil pada formulir pengajuan mahasiswa.',
    kolom: [
      { k: 'nama', l: 'Nama Skema', tipe: 'utama' },
      { k: 'kode', l: 'Kode', tipe: 'mono' },
      { k: 'ikon', l: 'Ikon' },
      { k: 'urutan', l: 'Urutan' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'kode', l: 'Kode Skema', wajib: true, kolom: 2, ph: 'CICILAN3' },
      { id: 'urutan', l: 'Urutan Tampil', t: 'number', kolom: 2 },
      { id: 'nama', l: 'Nama Skema', wajib: true, ph: 'Dispensasi Cicilan 3x' },
      { id: 'ikon', l: 'Kelas Ikon Bootstrap', ph: 'bi-calendar3',
        bantu: 'Daftar lengkap ikon tersedia di <span class="mono">icons.getbootstrap.com</span>.' },
      { id: 'deskripsi', l: 'Deskripsi Singkat', t: 'area', baris: 2 },
      { id: 'aktif', l: 'Status', t: 'pilih', opsi: ['true', 'false'] }
    ]
  },
  klasifikasi: {
    judul: 'Klasifikasi Karya Ilmiah',
    desk: 'Kategori luaran penelitian beserta plafon insentif yang ditampilkan pada formulir dosen.',
    kolom: [
      { k: 'nama', l: 'Klasifikasi', tipe: 'utama' },
      { k: 'kategori', l: 'Kategori', tipe: 'lencana' },
      { k: 'plafon', l: 'Plafon Insentif', tipe: 'rupiah' },
      { k: 'urutan', l: 'Urutan' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'kode', l: 'Kode', wajib: true, kolom: 2, ph: 'SCOPUS-Q1Q2' },
      { id: 'kategori', l: 'Kategori', wajib: true, kolom: 2, ph: 'Jurnal Internasional' },
      { id: 'nama', l: 'Nama Klasifikasi', wajib: true },
      { id: 'deskripsi', l: 'Deskripsi & Syarat', t: 'area', baris: 2 },
      { id: 'plafon', l: 'Plafon Insentif (Rupiah)', t: 'number', kolom: 2 },
      { id: 'urutan', l: 'Urutan Tampil', t: 'number', kolom: 2 },
      { id: 'aktif', l: 'Status', t: 'pilih', opsi: ['true', 'false'] }
    ]
  },
  templateDokumen: {
    judul: 'Template Internal (HTML)',
    desk: 'Template HTML untuk Kop Surat, Berita Acara, Notulensi, dan Surat Keterangan. Gunakan penanda {{NAMA}}.',
    kolom: [
      { k: 'kode', l: 'Kode', tipe: 'mono' },
      { k: 'nama', l: 'Nama Template', tipe: 'utama' },
      { k: 'keterangan', l: 'Keterangan' }
    ],
    bidang: [
      { id: 'kode', l: 'Kode Template', wajib: true, kolom: 2, ph: 'BA' },
      { id: 'nama', l: 'Nama Template', wajib: true, kolom: 2 },
      { id: 'html', l: 'Isi Template HTML', t: 'area', baris: 12,
        bantu: 'Penanda tersedia: {{KOP}} {{NOMOR}} {{TANGGAL}} {{AGENDA}} {{LOKASI}} {{PIMPINAN}} ' +
               '{{NOTULIS}} {{PESERTA}} {{RINGKASAN}} {{IDENTITAS}} {{ISI}} {{TTD}} {{INSTITUSI}} {{ALAMAT}}' },
      { id: 'keterangan', l: 'Keterangan' }
    ]
  },
  berkasSyarat: {
    judul: 'Berkas Syarat Pengajuan',
    desk: 'Menentukan berkas apa saja yang harus diunggah pemohon pada portal publik, ' +
          'beserta status <b>Wajib</b> atau <b>Opsional</b>-nya. Perubahan langsung berlaku di portal.',
    kolom: [
      { k: 'jenisPengajuan', l: 'Jenis', tipe: 'lencana' },
      { k: 'label', l: 'Nama Berkas', tipe: 'utama' },
      { k: 'kunci', l: 'Kunci', tipe: 'mono' },
      { k: 'wajib', l: 'Sifat', tipe: 'wajibOpsional' },
      { k: 'urutan', l: 'Urutan' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'jenisPengajuan', l: 'Berlaku untuk Pengajuan', t: 'pilih', wajib: true, kolom: 2,
        opsi: [{ v: 'mahasiswa', t: 'Mahasiswa — Keringanan UKT & Asrama' },
               { v: 'dosen', t: 'Dosen — Insentif Karya Ilmiah' }] },
      { id: 'urutan', l: 'Urutan Tampil', t: 'number', kolom: 2 },
      { id: 'label', l: 'Nama Berkas yang Diminta', wajib: true,
        ph: 'Formulir Permohonan Resmi Bermeterai' },
      { id: 'deskripsi', l: 'Keterangan untuk Pemohon', t: 'area', baris: 2,
        ph: 'Sudah ditandatangani pemohon & bermeterai 10.000' },
      { id: 'kunci', l: 'Kunci Teknis', wajib: true, kolom: 2, ph: 'formulir',
        bantu: 'Huruf kecil tanpa spasi. Dipakai sistem sebagai penanda berkas — jangan diubah ' +
               'setelah ada pengajuan masuk.' },
      { id: 'ikon', l: 'Kelas Ikon Bootstrap', kolom: 2, ph: 'bi-file-earmark-text' },
      { id: 'wajib', l: 'Sifat Berkas', t: 'pilih', kolom: 2,
        opsi: [{ v: 'true', t: 'Wajib — pengajuan ditolak bila kosong' },
               { v: 'false', t: 'Opsional — boleh dikosongkan' }] },
      { id: 'aktif', l: 'Status', t: 'pilih', kolom: 2, opsi: ['true', 'false'] }
    ]
  },
  berkasTemplate: {
    judul: 'Berkas Template Unduhan',
    desk: 'Blangko resmi yang dapat diunduh pemohon dari portal publik.',
    kolom: [
      { k: 'nama', l: 'Nama Berkas', tipe: 'utama' },
      { k: 'deskripsi', l: 'Deskripsi' },
      { k: 'urutan', l: 'Urutan' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'nama', l: 'Nama Berkas', wajib: true },
      { id: 'deskripsi', l: 'Deskripsi Singkat' },
      { id: 'fileUrl', l: 'URL Berkas (Google Drive / tautan langsung)',
        bantu: 'Pastikan berkas dibagikan dengan akses "Siapa saja yang memiliki tautan".' },
      { id: 'ikon', l: 'Kelas Ikon Bootstrap', kolom: 2, ph: 'bi-file-earmark-word' },
      { id: 'urutan', l: 'Urutan', t: 'number', kolom: 2 },
      { id: 'aktif', l: 'Status', t: 'pilih', opsi: ['true', 'false'] }
    ]
  },
  heroSlide: {
    judul: 'Hero Slide Portal Publik',
    desk: 'Slideshow judul dan subjudul pada halaman muka portal layanan.',
    kolom: [
      { k: 'judul', l: 'Judul Slide', tipe: 'utama' },
      { k: 'subjudul', l: 'Subjudul' },
      { k: 'urutan', l: 'Urutan' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'judul', l: 'Judul Slide', wajib: true },
      { id: 'subjudul', l: 'Subjudul', t: 'area', baris: 2 },
      { id: 'gambarUrl', l: 'URL Gambar Latar (opsional, https://)' },
      { id: 'urutan', l: 'Urutan', t: 'number', kolom: 2 },
      { id: 'aktif', l: 'Status', t: 'pilih', kolom: 2, opsi: ['true', 'false'] }
    ]
  },
  pengumuman: {
    judul: 'Pengumuman Portal',
    desk: 'Popup saat portal dibuka dan teks berjalan di bawah navbar.',
    kolom: [
      { k: 'judul', l: 'Judul', tipe: 'utama' },
      { k: 'tipe', l: 'Tipe', tipe: 'lencana' },
      { k: 'aktif', l: 'Status', tipe: 'lencana' }
    ],
    bidang: [
      { id: 'judul', l: 'Judul Pengumuman', wajib: true },
      { id: 'isi', l: 'Isi Pengumuman', t: 'area', baris: 4, wajib: true },
      { id: 'tipe', l: 'Tipe Tampilan', t: 'pilih', wajib: true, kolom: 2,
        opsi: [{ v: 'popup', t: 'Popup saat portal dibuka' },
               { v: 'running', t: 'Teks berjalan di navbar' }] },
      { id: 'aktif', l: 'Status', t: 'pilih', kolom: 2, opsi: ['true', 'false'] }
    ]
  }
};

/* ── Render pengaturan ──────────────────────────────────────────── */
function renderPengaturan(w) {
  if (!Sesi.boleh('master')) {
    w.innerHTML = kepalaHalaman({ judul: 'Pengaturan & Master Data' }) +
      keadaanKosong('Akses ditolak',
        'Halaman ini hanya dapat diakses oleh peran Super Admin.', 'bi-shield-lock');
    return;
  }

  var h = kepalaHalaman({
    remah: ['Sistem Administrasi', 'Master Data', 'Konfigurasi Inti'],
    judul: 'Pengaturan & Master Data Sistem',
    sub: 'Konfigurasi parameter otomatisasi Google Apps Script, format penomoran surat, template instansi, ' +
         'data pejabat penandatangan, dan integrasi API.',
    aksi: '<span class="chip-nomor"><i class="bi bi-shield-check"></i> Akses Penuh · Super Admin</span>'
  });

  h += '<div class="tab-bar">' + TAB_PENGATURAN.map(function (t, i) {
    return '<button data-tab="' + t.k + '" class="' + (Ptr.tab === t.k ? 'aktif' : '') + '" onclick="gantiTabPengaturan(\'' +
      t.k + '\')"><i class="bi ' + t.i + '"></i> ' + (i + 1) + '. ' + esc(t.n) + '</button>';
  }).join('') + '</div>';

  h += '<div id="setIsi"></div>';
  w.innerHTML = h;
  gambarTabPengaturan();
}

function gantiTabPengaturan(k) {
  Ptr.tab = k;
  gambarTabPengaturan();
}

function gambarTabPengaturan() {
  var w = el('setIsi');
  if (!w) return;
  $$('.tab-bar button').forEach(function (b) { b.classList.toggle('aktif', b.dataset.tab === Ptr.tab); });
  jalankanAman(function () {
    switch (Ptr.tab) {
      case 'identitas':   return tabIdentitas(w);
      case 'notifikasi':  return tabNotifikasi(w);
      case 'tampilan':    return tabTampilan(w);
      case 'keamanan':    return tabKeamanan(w);
      case 'log':         return tabLog(w);
      case 'templateDoc': return tabTemplateDoc(w);
      default:            return tabMaster(w, Ptr.tab);
    }
  }, 'Tab pengaturan');
}

/* ── Tab: Identitas institusi ───────────────────────────────────── */
function tabIdentitas(w) {
  var c = Adm.boot.config || {};
  w.innerHTML = '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<h3>Identitas Institusi</h3>' +
    '<div class="kartu-sub">Data ini dipakai pada kop surat, penomoran, dan seluruh dokumen yang terbit.</div>' +
    '</div></div>' +

    bidangTeks({ id: 'cfNama', label: 'Nama Resmi Institusi', wajib: true, nilai: c.INSTITUSI_NAMA }) +
    '<div class="grid-2">' +
    bidangTeks({ id: 'cfSingkatan', label: 'Singkatan / Nama Pendek', nilai: c.INSTITUSI_SINGKATAN }) +
    bidangTeks({ id: 'cfKode', label: 'Kode Institusi (untuk nomor surat)', nilai: c.INSTITUSI_KODE,
      bantu: 'Muncul sebagai token <span class="mono">{INSTITUSI}</span> pada format penomoran.' }) + '</div>' +
    bidangTeks({ id: 'cfYayasan', label: 'Badan Penyelenggara / Yayasan', nilai: c.INSTITUSI_YAYASAN }) +
    bidangArea({ id: 'cfAlamat', label: 'Alamat Lengkap', baris: 2, nilai: c.INSTITUSI_ALAMAT }) +
    '<div class="grid-3">' +
    bidangTeks({ id: 'cfKota', label: 'Kota Penerbitan', nilai: c.INSTITUSI_KOTA }) +
    bidangTeks({ id: 'cfTelepon', label: 'Telepon', nilai: c.INSTITUSI_TELEPON }) +
    bidangTeks({ id: 'cfEmail', label: 'Surel Resmi', tipe: 'email', nilai: c.INSTITUSI_EMAIL }) + '</div>' +
    bidangTeks({ id: 'cfWebsite', label: 'Laman Resmi', tipe: 'url', nilai: c.INSTITUSI_WEBSITE }) +

    '<div class="bidang"><label>Logo Aplikasi</label>' +
    '<div class="baris g12 bungkus" style="align-items:flex-start;border:1px solid var(--border);' +
    'border-radius:var(--r-lg);padding:14px">' +
      '<div class="thumb-logo" id="logoThumb">' +
        (c.INSTITUSI_LOGO
          ? '<img src="' + esc(c.INSTITUSI_LOGO) + '" alt="Logo institusi">'
          : '<i class="bi bi-image"></i>') +
      '</div>' +
      '<div class="sisa" style="min-width:210px">' +
        '<div class="tebal tx-md mb4">Thumbnail Logo Institusi</div>' +
        '<div class="tx-sm tx-3 mb12" style="line-height:1.6">Tampil pada navigasi portal publik, ' +
        'panel admin, dan judul halaman. Format PNG/JPG/WEBP, maksimal 2 MB. ' +
        'Disarankan gambar persegi minimal 256&times;256 piksel.</div>' +
        '<div class="baris g8 bungkus">' +
          '<label class="btn btn-navy btn-sm" style="cursor:pointer">' +
            '<i class="bi bi-upload"></i> Pilih Gambar Logo' +
            '<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" ' +
            'onchange="pilihLogo(this)"></label>' +
          '<button class="btn btn-utama btn-sm" id="btnLogo" onclick="simpanLogo()" disabled>' +
            '<i class="bi bi-check2"></i> Unggah &amp; Terapkan</button>' +
          (c.INSTITUSI_LOGO ? '<button class="btn btn-garis btn-sm" onclick="hapusLogo()">' +
            '<i class="bi bi-trash"></i> Pakai Lambang Bawaan</button>' : '') +
        '</div>' +
        '<div class="tx-sm tx-3 mt8" id="logoNama">' +
          (c.INSTITUSI_LOGO ? 'Logo kustom sedang aktif.' : 'Belum ada logo kustom — memakai lambang bawaan.') +
        '</div>' +
      '</div>' +
    '</div></div>' +
    bidangTeks({ id: 'cfAkreditasi', label: 'Keterangan Akreditasi', nilai: c.INSTITUSI_AKREDITASI }) +
    '<div class="grid-2">' +
    bidangTeks({ id: 'cfTahun', label: 'Tahun Akademik Berjalan', nilai: c.TAHUN_AKADEMIK, placeholder: '2026/2027' }) +
    bidangPilih({ id: 'cfSemester', label: 'Semester Berjalan', nilai: c.SEMESTER,
      opsi: ['Ganjil', 'Genap', 'Antara'] }) + '</div>' +

    '<div class="garis"></div>' +
    '<div class="baris antara g10 bungkus">' +
    '<div class="tx-sm tx-3"><i class="bi bi-info-circle"></i> Perubahan langsung berlaku pada dokumen ' +
    'yang diterbitkan setelah disimpan.</div>' +
    '<button class="btn btn-utama" id="btnSimpanIdentitas" onclick="simpanIdentitas()">' +
    '<i class="bi bi-save"></i> Simpan Identitas</button></div></div>';
}

function simpanIdentitas() {
  if (!validasiForm(null, [{ id: 'cfNama', wajib: true }])) return;
  var btn = el('btnSimpanIdentitas');
  tombolSibuk(btn, true);
  simpanKonfigurasi({
    INSTITUSI_NAMA: ambilNilai('cfNama'),
    INSTITUSI_SINGKATAN: ambilNilai('cfSingkatan'),
    INSTITUSI_KODE: ambilNilai('cfKode'),
    INSTITUSI_YAYASAN: ambilNilai('cfYayasan'),
    INSTITUSI_ALAMAT: ambilNilai('cfAlamat'),
    INSTITUSI_KOTA: ambilNilai('cfKota'),
    INSTITUSI_TELEPON: ambilNilai('cfTelepon'),
    INSTITUSI_EMAIL: ambilNilai('cfEmail'),
    INSTITUSI_WEBSITE: ambilNilai('cfWebsite'),
    INSTITUSI_AKREDITASI: ambilNilai('cfAkreditasi'),
    TAHUN_AKADEMIK: ambilNilai('cfTahun'),
    SEMESTER: ambilNilai('cfSemester')
  }, btn);
}

/* ── Tab: Notifikasi & integrasi ────────────────────────────────── */
function tabNotifikasi(w) {
  var c = Adm.boot.config || {};
  var bantuRahasia = 'Tersimpan aman di server — peramban hanya melihat 4 karakter terakhir. ' +
                     'Biarkan apa adanya bila tidak ingin mengubah; kosongkan untuk menghapus.';
  w.innerHTML =
    '<div class="kartu mb20"><div class="kartu-kepala"><div>' +
    '<h3>Kanal Notifikasi</h3>' +
    '<div class="kartu-sub">Pemberitahuan otomatis ke pemohon pada setiap perubahan status pengajuan.</div>' +
    '</div></div>' +
    bidangSaklar({ id: 'cfEmailAktif', label: 'Notifikasi Surel (MailApp)',
      desk: 'Kuota Google Workspace ±1.500 surel/hari; akun Gmail biasa ±100 surel/hari.',
      nilai: c.NOTIF_EMAIL_AKTIF === 'true' }) +
    bidangSaklar({ id: 'cfWaAktif', label: 'Notifikasi WhatsApp (Gateway)',
      desk: 'Memerlukan token gateway pihak ketiga seperti Fonnte.',
      nilai: c.NOTIF_WA_AKTIF === 'true' }) +
    '<div class="garis"></div>' +
    '<div class="grid-2">' +
    bidangTeks({ id: 'cfWaUrl', label: 'URL Gateway WhatsApp', nilai: c.WA_GATEWAY_URL }) +
    bidangTeks({ id: 'cfWaToken', label: 'Token Gateway', tipe: 'password', nilai: c.WA_TOKEN,
      otomatis: 'off', bantu: bantuRahasia }) + '</div>' +
    '</div>' +

    '<div class="kartu mb20"><div class="kartu-kepala"><div>' +
    '<h3>Integrasi Gemini AI</h3>' +
    '<div class="kartu-sub">Transkripsi rekaman rapat dan perapian notulensi otomatis. Bila model terpilih ' +
    'tidak tersedia atau kuota habis, sistem otomatis mencoba model gratis berikutnya.</div>' +
    '</div><span class="lencana ' + (c.GEMINI_API_KEY ? 'ok' : 'neut') + '">' +
    (c.GEMINI_API_KEY ? 'Terkonfigurasi' : 'Belum diisi') + '</span></div>' +
    '<div class="grid-2">' +
    bidangTeks({ id: 'cfGeminiKey', label: 'API Key Gemini', tipe: 'password', nilai: c.GEMINI_API_KEY,
      otomatis: 'off', bantu: 'Dapatkan gratis di <span class="mono">aistudio.google.com/apikey</span>. ' + bantuRahasia }) +
    bidangPilih({ id: 'cfGeminiModel', label: 'Model yang Dipakai', nilai: c.GEMINI_MODEL, opsi: MODEL_GEMINI,
      bantu: 'Model Pro memerlukan akun Google AI Studio dengan penagihan aktif.' }) +
    '</div>' +
    bidangTeks({ id: 'cfGeminiKustom', label: 'Model Kustom (opsional)', nilai: c.GEMINI_MODEL_KUSTOM,
      placeholder: 'contoh: gemini-3.9-flash',
      bantu: 'Isi bila Google merilis model baru yang belum ada di daftar. Mengisi kolom ini menimpa pilihan di atas.' }) +
    '</div>' +

    '<div class="kartu mb20"><div class="kartu-kepala"><div>' +
    '<h3>Batasan Unggahan Berkas</h3>' +
    '<div class="kartu-sub">Berlaku untuk portal publik maupun panel admin, divalidasi di klien dan server.</div>' +
    '</div></div>' +
    '<div class="grid-2">' +
    bidangTeks({ id: 'cfMaxMb', label: 'Ukuran Maksimum (MB)', tipe: 'number', nilai: c.UPLOAD_MAX_MB }) +
    bidangTeks({ id: 'cfFormat', label: 'Format Diizinkan', nilai: c.UPLOAD_FORMAT,
      bantu: 'Pisahkan dengan koma, contoh: <span class="mono">pdf,jpg,jpeg,png,doc,docx</span>' }) +
    '</div></div>' +

    '<div class="kartu"><div class="baris antara g12 bungkus">' +
    '<div class="sisa"><div class="tebal">Uji Koneksi Notifikasi</div>' +
    '<div class="tx-sm tx-3 mt4">Kirim pesan percobaan ke surel dan nomor WhatsApp Anda.</div></div>' +
    '<button class="btn btn-garis" onclick="bukaTesNotifikasi()">' +
    '<i class="bi bi-send-check"></i> Kirim Uji Coba</button>' +
    '<button class="btn btn-utama" id="btnSimpanNotif" onclick="simpanNotifikasi()">' +
    '<i class="bi bi-save"></i> Simpan Pengaturan</button></div></div>';
}

function simpanNotifikasi() {
  var kustom = ambilNilai('cfGeminiKustom');
  if (kustom && !/^[a-z0-9.\-]{3,60}$/i.test(kustom)) {
    tandaiGalat(el('cfGeminiKustom'), 'Nama model hanya boleh huruf, angka, titik, dan tanda hubung.');
    return;
  }
  var btn = el('btnSimpanNotif');
  tombolSibuk(btn, true);
  simpanKonfigurasi({
    NOTIF_EMAIL_AKTIF: el('cfEmailAktif').checked ? 'true' : 'false',
    NOTIF_WA_AKTIF: el('cfWaAktif').checked ? 'true' : 'false',
    WA_GATEWAY_URL: ambilNilai('cfWaUrl'),
    WA_TOKEN: ambilNilai('cfWaToken'),
    GEMINI_API_KEY: ambilNilai('cfGeminiKey'),
    GEMINI_MODEL: ambilNilai('cfGeminiModel') || 'gemini-3.8-flash',
    GEMINI_MODEL_KUSTOM: kustom,
    UPLOAD_MAX_MB: ambilNilai('cfMaxMb'),
    UPLOAD_FORMAT: ambilNilai('cfFormat')
  }, btn);
}

function bukaTesNotifikasi() {
  bukaModal({
    sempit: true,
    judul: 'Uji Koneksi Notifikasi',
    isi: bidangTeks({ id: 'tesEmail', label: 'Kirim Surel ke', tipe: 'email',
      nilai: (Adm.boot.user || {}).email }) +
      bidangTeks({ id: 'tesWa', label: 'Kirim WhatsApp ke (opsional)',
        placeholder: '08123456789',
        bantu: 'Kosongkan bila hanya ingin menguji surel.' }),
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnTesNotif" onclick="jalankanTesNotifikasi()">' +
          '<i class="bi bi-send"></i> Kirim Sekarang</button>'
  });
}

function jalankanTesNotifikasi() {
  var btn = el('btnTesNotif');
  tombolSibuk(btn, true, 'Mengirim…');
  kirim('tesNotifikasi', { email: ambilNilai('tesEmail'), whatsapp: ambilNilai('tesWa') })
    .then(function (r) {
      tombolSibuk(btn, false);
      toast(r.message, r.success ? 'sukses' : 'galat', 9000);
      if (r.success) tutupModal();
    });
}

/* ── Tab: Tampilan & dokumen ────────────────────────────────────── */
function tabTampilan(w) {
  var c = Adm.boot.config || {};
  w.innerHTML =
    '<div class="kartu mb20"><div class="kartu-kepala"><div>' +
    '<h3>Portal Publik</h3>' +
    '<div class="kartu-sub">Elemen yang tampil pada halaman layanan terbuka.</div></div></div>' +
    bidangSaklar({ id: 'cfHeroAktif', label: 'Slideshow Hero', desk: 'Pergantian judul otomatis pada banner portal.',
      nilai: c.HERO_AKTIF === 'true' }) +
    bidangSaklar({ id: 'cfRunning', label: 'Teks Berjalan Pengumuman',
      desk: 'Baris berjalan di bawah navigasi portal.', nilai: c.RUNNING_TEXT_AKTIF === 'true' }) +
    bidangSaklar({ id: 'cfPopup', label: 'Popup Pengumuman',
      desk: 'Muncul sekali tiap sesi saat portal pertama kali dibuka.', nilai: c.POPUP_AKTIF === 'true' }) +
    '<div class="garis"></div>' +
    bidangTeks({ id: 'cfHeroDurasi', label: 'Durasi Pergantian Slide (milidetik)', tipe: 'number',
      nilai: c.HERO_DURASI, bantu: '6000 = 6 detik per slide.' }) + '</div>' +

    '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<h3>Format Dokumen PDF</h3>' +
    '<div class="kartu-sub">Berlaku untuk Berita Acara, Notulensi, dan Surat Keterangan (dokumen HTML→PDF). ' +
    'Surat Keluar dan SK mengikuti pengaturan pada template Google Docs masing-masing.</div></div></div>' +
    '<div class="grid-3">' +
    bidangPilih({ id: 'cfKertas', label: 'Ukuran Kertas', nilai: c.DOK_UKURAN_KERTAS,
      opsi: ['A4', 'Letter', 'Legal', 'F4'] }) +
    bidangTeks({ id: 'cfFont', label: 'Font Dokumen', nilai: c.DOK_FONT }) +
    bidangTeks({ id: 'cfUkuranFont', label: 'Ukuran Font (pt)', tipe: 'number', nilai: c.DOK_UKURAN_FONT }) +
    '</div>' +
    '<div class="label-kecil mb8 mt8">Margin Halaman (cm)</div>' +
    '<div class="grid-2">' +
    bidangTeks({ id: 'cfMTop', label: 'Atas', tipe: 'number', nilai: c.DOK_MARGIN_ATAS }) +
    bidangTeks({ id: 'cfMBottom', label: 'Bawah', tipe: 'number', nilai: c.DOK_MARGIN_BAWAH }) + '</div>' +
    '<div class="grid-2">' +
    bidangTeks({ id: 'cfMLeft', label: 'Kiri', tipe: 'number', nilai: c.DOK_MARGIN_KIRI }) +
    bidangTeks({ id: 'cfMRight', label: 'Kanan', tipe: 'number', nilai: c.DOK_MARGIN_KANAN }) + '</div>' +
    '<div class="garis"></div>' +
    '<div class="kanan"><button class="btn btn-utama" id="btnSimpanTampilan" onclick="simpanTampilan()">' +
    '<i class="bi bi-save"></i> Simpan Pengaturan Tampilan</button></div></div>';
}

function simpanTampilan() {
  var btn = el('btnSimpanTampilan');
  tombolSibuk(btn, true);
  simpanKonfigurasi({
    HERO_AKTIF: el('cfHeroAktif').checked ? 'true' : 'false',
    RUNNING_TEXT_AKTIF: el('cfRunning').checked ? 'true' : 'false',
    POPUP_AKTIF: el('cfPopup').checked ? 'true' : 'false',
    HERO_DURASI: ambilNilai('cfHeroDurasi'),
    DOK_UKURAN_KERTAS: ambilNilai('cfKertas'),
    DOK_FONT: ambilNilai('cfFont'),
    DOK_UKURAN_FONT: ambilNilai('cfUkuranFont'),
    DOK_MARGIN_ATAS: ambilNilai('cfMTop'),
    DOK_MARGIN_BAWAH: ambilNilai('cfMBottom'),
    DOK_MARGIN_KIRI: ambilNilai('cfMLeft'),
    DOK_MARGIN_KANAN: ambilNilai('cfMRight')
  }, btn);
}

function simpanKonfigurasi(obj, btn) {
  kirim('simpanConfig', { config: obj }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    Adm.boot.config = r.data;
    Sesi.simpanBoot(Adm.boot);
    renderKerangkaAdmin();
    toast(r.message, 'sukses');
  });
}

/* ── Tab: Keamanan ──────────────────────────────────────────────── */
function tabKeamanan(w) {
  var u = Adm.boot.user || {};
  w.innerHTML = '<div class="kartu mb20"><div class="kartu-kepala"><div>' +
    '<h3>Keamanan Akun</h3>' +
    '<div class="kartu-sub">Kata sandi disimpan sebagai hash SHA-256 dan tidak pernah tersimpan sebagai teks biasa.</div>' +
    '</div></div>' +
    '<div class="baris g12 mb16"><div class="avatar" style="width:44px;height:44px;font-size:15px">' +
    inisial(u.nama) + '</div><div><div class="tebal">' + esc(u.nama) + '</div>' +
    '<div class="tx-sm tx-3">' + esc(u.email) + ' · ' + esc(u.peran) + '</div></div></div>' +
    '<button class="btn btn-navy" onclick="bukaGantiSandi()">' +
    '<i class="bi bi-key"></i> Ganti Kata Sandi Saya</button></div>' +

    '<div class="kartu mb20"><div class="kartu-kepala"><div>' +
    '<h3>Perlindungan Aktif (v4.2)</h3></div></div>' +
    '<ul style="padding-left:20px;line-height:2;font-size:13.5px;margin:0">' +
    '<li>Masuk dikunci 15 menit setelah 5 kali salah kata sandi.</li>' +
    '<li>Token sesi hanya dikirim di badan permintaan — tidak pernah tampil di URL.</li>' +
    '<li>API key Gemini &amp; token WhatsApp tidak pernah dikirim ke peramban.</li>' +
    '<li>Berkas pribadi pemohon (KK, KTP, slip gaji) tidak dibagikan publik; hanya dapat dibuka admin setelah login.</li>' +
    '<li>Dokumen terbit tidak dapat diubah; nomor surat dikembalikan otomatis bila penerbitan gagal.</li>' +
    '<li>Tahap verifikasi dapat dikunci ke akun tertentu (Alur Verifikasi → kolom surel).</li>' +
    '</ul></div>' +

    '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<h3>Praktik Keamanan yang Disarankan</h3></div></div>' +
    '<ul style="padding-left:20px;line-height:2;font-size:13.5px;margin:0">' +
    '<li>Ganti kata sandi ketiga akun bawaan segera setelah pemasangan.</li>' +
    '<li>Nonaktifkan akun yang tidak lagi dipakai alih-alih menghapusnya, agar jejak audit tetap utuh.</li>' +
    '<li>Batasi peran SUPER_ADMIN hanya untuk satu atau dua orang penanggung jawab sistem.</li>' +
    '<li>Tinjau Log Aktivitas secara berkala, terutama aksi penarikan dokumen dan bypass verifikasi.</li>' +
    '<li>Sesi berakhir otomatis setelah 6 jam tidak aktif.</li>' +
    '</ul></div>';
}

/* ── Tab: Log aktivitas ─────────────────────────────────────────── */
function tabLog(w) {
  if (window.__logData) { gambarLog(w, window.__logData); }
  else w.innerHTML = '<div class="kartu kartu-rapat">' + keadaanMemuat('Memuat log aktivitas…') + '</div>';

  ambil('getLog', { limit: 300 }).then(function (r) {
    if (Ptr.tab !== 'log' || !el('setIsi')) return;
    if (!r.success) {
      el('setIsi').innerHTML = '<div class="kartu">' + keadaanKosong('Log gagal dimuat', r.message,
        'bi-exclamation-triangle') + '</div>';
      return;
    }
    window.__logData = r.data;
    gambarLog(el('setIsi'), r.data);
  });
}

function gambarLog(w, data) {
  w.innerHTML = '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="label-kecil sisa">Audit Trail Seluruh Aksi Penting</div>' +
    '<span class="lencana neut">' + data.length + ' entri terakhir</span>' +
    '<button class="btn btn-garis btn-sm" onclick="eksporLog()"><i class="bi bi-filetype-csv"></i> Ekspor</button>' +
    '</div>' +
    bangunTabel({
      data: data, idTabel: 'log', halaman: Adm.halaman.log || 1, perHalaman: 20,
      kolom: [
        { k: 'waktu', l: 'Waktu' },
        { k: 'nama', l: 'Pelaku', tipe: 'utama' },
        { k: 'peran', l: 'Peran', tipe: 'lencana' },
        { k: 'aksi', l: 'Aksi', tipe: 'mono' },
        { k: 'modul', l: 'Modul' },
        { k: 'detail', l: 'Detail' }
      ],
      judulKosong: 'Belum ada aktivitas tercatat',
      deskKosong: 'Setiap aksi penting akan tercatat otomatis di sini.',
      ikonKosong: 'bi-clock-history'
    }) + '</div>';
}

function eksporLog() {
  if (!window.__logData) return;
  unduhBerkas('e-SURAT_LogAktivitas_' + tglInput() + '.csv', keCsv([
    { k: 'waktu', l: 'Waktu' }, { k: 'nama', l: 'Pelaku' }, { k: 'email', l: 'Surel' },
    { k: 'peran', l: 'Peran' }, { k: 'aksi', l: 'Aksi' }, { k: 'modul', l: 'Modul' },
    { k: 'detail', l: 'Detail' }
  ], window.__logData));
}

/* ══════════════════════════════════════════════════════════════════
   TEMPLATE GOOGLE DOCS INSTANSI
   Alur: unggah template ke Drive → tempel URL → PINDAI placeholder →
         atur kolom isian → generator surat menampilkan kolom tersebut
   ══════════════════════════════════════════════════════════════════ */
function panduanAlurTemplate() {
  return '<div class="alur-tpl mb16">' +
    langkahTpl(1, 'bi-cloud-upload', 'Siapkan template', 'Unggah template surat instansi (Google Docs) ke Google Drive — boleh di folder <b>Template_Dokumen</b>.') +
    langkahTpl(2, 'bi-braces', 'Tulis placeholder', 'Tandai bagian yang berubah dengan <span class="mono">{{NAMA_PENANDA}}</span>, mis. <span class="mono">{{PERIHAL}}</span>, <span class="mono">{{ISI}}</span>, <span class="mono">{{NAMA_MAHASISWA}}</span>.') +
    langkahTpl(3, 'bi-link-45deg', 'Tempel URL & pindai', 'Klik <b>Hubungkan</b>, tempel URL Docs. Sistem membaca seluruh placeholder secara otomatis.') +
    langkahTpl(4, 'bi-ui-checks', 'Kolom terbentuk', 'Generator surat menampilkan kolom isian sesuai placeholder. Label & sifat wajib dapat diatur.') +
    '</div>' +
    '<div class="baris g8 mb16 tx-sm tx-2" style="align-items:flex-start"><i class="bi bi-type-bold"></i>' +
    '<div class="sisa">Gaya huruf mengikuti penanda di template: tulis <b>{{PERIHAL}}</b> tebal bila perihal ingin tebal. ' +
    'Isi naskah (<span class="mono">{{ISI}}</span>, <span class="mono">{{MENIMBANG}}</span>, dst.) otomatis rata kanan-kiri tanpa indentasi tambahan.</div></div>';
}

function langkahTpl(n, ikon, judul, desk) {
  return '<div class="alur-tpl-item"><div class="alur-tpl-no"><i class="bi ' + ikon + '"></i></div>' +
    '<div><div class="tebal tx-md">' + n + '. ' + judul + '</div><div class="tx-sm tx-3">' + desk + '</div></div></div>';
}

/** Tabel template per jenis surat. @param modulFilter 'suratKeluar' | 'sk' | undefined (keduanya) */
function tabelTemplateHtml(modulFilter) {
  var jenis = (Adm.boot.master.jenisSurat || []).filter(function (j) {
    return (j.modul === 'suratKeluar' || j.modul === 'sk') && (!modulFilter || j.modul === modulFilter);
  });
  var master = Sesi.boleh('master');

  var h = '<div id="tabelTemplateWadah" data-modul="' + esc(modulFilter || '') + '">' +
    '<div class="tabel-bungkus"><table class="data responsif"><thead><tr>' +
    '<th>Jenis Surat</th><th>Template Terhubung</th><th>Kolom Isian</th><th>Diperbarui</th>' +
    '<th style="text-align:right">Aksi</th></tr></thead><tbody>';

  jenis.forEach(function (j) {
    var t = templateUntuk(j.kode);
    var bid = t ? bidangUntuk(j.kode, j.modul) : [];
    var nIsian = bid.filter(function (b) { return b.sumber !== 'sistem'; }).length;
    h += '<tr><td data-label="Jenis Surat"><div class="t-judul">' + esc(j.nama) + '</div>' +
      '<div class="t-sub mono">' + esc(j.kode) + ' · ' + (j.modul === 'sk' ? 'SK' : 'Surat Keluar') + '</div></td>' +
      '<td data-label="Template">' + (t
        ? '<div class="tx-md">' + esc(potong(t.namaTemplate || 'Template', 48)) + '</div>' +
          '<span class="lencana ok mt4"><i class="bi bi-check-circle"></i> Terhubung</span>'
        : '<span class="lencana warn"><i class="bi bi-dash-circle"></i> Belum dihubungkan</span>') + '</td>' +
      '<td data-label="Kolom Isian">' + (t ? '<b>' + nIsian + '</b> isian · ' + (bid.length - nIsian) + ' otomatis' : '—') + '</td>' +
      '<td data-label="Diperbarui" class="tx-sm tx-3">' + (t ? tgl(t.diperbarui) : '—') + '</td>' +
      '<td data-label="Aksi"><div class="aksi">' +
      (master ? '<button class="btn btn-' + (t ? 'garis' : 'utama') + ' btn-sm" onclick="hubungkanDoc(\'' + esc(j.kode) + '\')">' +
        '<i class="bi bi-link-45deg"></i> ' + (t ? 'Ganti' : 'Hubungkan') + '</button>' : '') +
      (t && master ? '<button class="btn btn-hantu btn-ikon" title="Pindai ulang placeholder" onclick="pindaiUlang(\'' +
        esc(j.kode) + '\',this)"><i class="bi bi-arrow-clockwise"></i></button>' +
        '<button class="btn btn-hantu btn-ikon" title="Atur kolom isian" onclick="bukaAturKolom(\'' + esc(j.kode) + '\')">' +
        '<i class="bi bi-sliders"></i></button>' : '') +
      (t ? '<a class="btn btn-hantu btn-ikon" title="Buka di Google Docs" target="_blank" rel="noopener" href="' +
        esc(t.docUrl) + '"><i class="bi bi-box-arrow-up-right"></i></a>' : '') +
      (!t && master ? '<button class="btn btn-hantu btn-ikon" title="Buat template starter" onclick="buatUlangTemplate(\'' +
        esc(j.kode) + '\')"><i class="bi bi-magic"></i></button>' : '') +
      '</div></td></tr>';
  });

  if (!jenis.length) h += '<tr><td colspan="5">' + keadaanKosong('Belum ada jenis surat', 'Tambahkan di tab Format Penomoran.', 'bi-hash') + '</td></tr>';
  return h + '</tbody></table></div></div>';
}

function tabTemplateDoc(w) {
  w.innerHTML = '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<h3>Template Google Docs Instansi</h3>' +
    '<div class="kartu-sub">Surat Keluar dan Surat Keputusan diterbitkan dari template milik instansi. ' +
    'Kolom isian generator dibentuk otomatis dari placeholder template.</div></div>' +
    '<button class="btn btn-garis" id="btnSiapkanTpl" onclick="siapkanTemplate()">' +
    '<i class="bi bi-magic"></i> Buat Starter untuk yang Belum Ada</button></div>' +
    panduanAlurTemplate() + tabelTemplateHtml() +

    '<div class="garis"></div>' +
    '<div class="label-kecil mb8">Placeholder Otomatis (tidak perlu diisi)</div>' +
    '<div class="baris g6 bungkus mb16">' + PH_OTOMATIS.map(function (p) {
      return '<span class="chip-nomor">{{' + esc(p) + '}}</span>';
    }).join('') + '</div>' +
    '<div class="label-kecil mb8">Placeholder Baku (kolom register)</div>' +
    '<div class="baris g6 bungkus mb16">' + Object.keys(PH_BAKU_KLIEN).map(function (p) {
      return '<span class="chip-nomor" title="' + esc(PH_BAKU_KLIEN[p].label) + '">{{' + esc(p) + '}}</span>';
    }).join('') + '</div>' +
    '<div class="tx-sm tx-3">Placeholder lain buatan instansi (mis. <span class="mono">{{NAMA_MAHASISWA}}</span>, ' +
    '<span class="mono">{{TGL_KEGIATAN}}</span>) otomatis menjadi kolom isian baru saat dipindai.</div></div>';
}

/** Perbarui semua tampilan yang bergantung pada template (tabel, generator yang sedang terbuka). */
function setelahTemplateBerubah(kode) {
  Sesi.simpanBoot(Adm.boot);
  var wadah = el('tabelTemplateWadah');
  if (wadah) wadah.outerHTML = tabelTemplateHtml(wadah.dataset.modul || undefined);
  if (el('gnBidang') && Gen.kode && (!kode || Gen.kode === kode)) {
    simpanCacheGen();
    renderBidangGen();
    var s = el('gnJenis');
    if (s) Array.prototype.forEach.call(s.options, function (o) {
      if (!o.value) return;
      o.textContent = o.textContent.replace(' — belum ada template', '') + (templateUntuk(o.value) ? '' : ' — belum ada template');
    });
  }
}

function hubungkanDoc(kode) {
  var j = (Adm.boot.master.jenisSurat || []).filter(function (x) { return x.kode === kode; })[0] || { nama: kode };
  var t = templateUntuk(kode);
  bukaModal({
    judul: 'Hubungkan Template — ' + j.nama,
    sub: 'Tempel URL Google Docs template milik instansi. Sistem akan memindai placeholder-nya.',
    isi:
      '<div class="baris g10 mb16" style="align-items:flex-start;background:var(--info-bg);color:var(--info-fg);' +
      'padding:12px 14px;border-radius:var(--r-lg)"><i class="bi bi-info-circle-fill" style="margin-top:2px"></i>' +
      '<div class="sisa tx-sm" style="line-height:1.65">Pastikan akun Google <b>pemilik Apps Script</b> memiliki akses ' +
      '<b>Editor</b> pada dokumen (cara termudah: simpan template di folder <b>e-SURAT_Storage › Template_Dokumen</b>). ' +
      'Berkas Word (.docx) sebaiknya dibuka di Google Docs lalu <i>Berkas → Simpan sebagai Google Dokumen</i>.</div></div>' +
      bidangTeks({ id: 'tplUrl', label: 'URL Google Docs Template', wajib: true, nilai: t ? t.docUrl : '',
        placeholder: 'https://docs.google.com/document/d/…/edit',
        bantu: 'Salin dari bilah alamat peramban saat template dibuka di Google Docs.' }) +
      '<div id="tplHasil"></div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnHubungkan" onclick="prosesHubungkanDoc(\'' + esc(kode) + '\')">' +
          '<i class="bi bi-search"></i> Pindai &amp; Hubungkan</button>'
  });
}

function prosesHubungkanDoc(kode) {
  var url = ambilNilai('tplUrl');
  if (!url) { tandaiGalat(el('tplUrl'), 'URL wajib diisi.'); return; }
  var btn = el('btnHubungkan');
  tombolSibuk(btn, true, 'Memindai placeholder…');
  kirim('pindaiTemplateDoc', { kodeJenis: kode, docUrl: url }, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat', 9000); return; }
    upsertLokal('templateDoc', r.data, 'master');
    tutupModal();
    toast(r.message, 'sukses', 6000);
    setelahTemplateBerubah(kode);
    tampilkanHasilPindai(kode, r);
  });
}

function pindaiUlang(kode, btn) {
  var t = templateUntuk(kode);
  if (!t) return;
  tombolSibuk(btn, true, '');
  kirim('pindaiTemplateDoc', { kodeJenis: kode, docUrl: t.docUrl }, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat', 9000); return; }
    upsertLokal('templateDoc', r.data, 'master');
    toast(r.message, 'sukses');
    setelahTemplateBerubah(kode);
    tampilkanHasilPindai(kode, r);
  });
}

function tampilkanHasilPindai(kode, r) {
  var bid = bidangUntuk(kode);
  var isian = bid.filter(function (b) { return b.sumber !== 'sistem'; });
  var oto = bid.filter(function (b) { return b.sumber === 'sistem'; });
  bukaModal({
    judul: 'Hasil Pindai Template',
    sub: (r.data.namaTemplate || '') + ' · ' + bid.length + ' placeholder',
    isi:
      ((r.peringatan || []).length ? '<div class="tumpuk g8 mb16">' + r.peringatan.map(function (p) {
        return '<div class="baris g8" style="background:var(--warn-bg);color:var(--warn-fg);padding:10px 12px;' +
          'border-radius:var(--r-md);font-size:12.5px"><i class="bi bi-exclamation-triangle"></i><span>' + esc(p) + '</span></div>';
      }).join('') + '</div>' : '') +
      '<div class="label-kecil mb8">Menjadi kolom isian di generator (' + isian.length + ')</div>' +
      '<div class="tumpuk g6 mb16">' + isian.map(function (b) {
        return '<div class="baris g8 bungkus"><span class="chip-nomor">{{' + esc(b.kunci) + '}}</span>' +
          '<span class="tx-md">' + esc(b.label) + '</span><span class="lencana neut">' + esc(namaTipe(b.tipe)) + '</span>' +
          (b.wajib ? '<span class="lencana emas">Wajib</span>' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="label-kecil mb8">Diisi otomatis (' + oto.length + ')</div>' +
      '<div class="baris g6 bungkus">' + oto.map(function (b) {
        return '<span class="chip-nomor" title="' + esc(b.label) + '">{{' + esc(b.kunci) + '}}</span>';
      }).join('') + '</div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Selesai</button>' +
          '<button class="btn btn-utama" onclick="tutupModal();bukaAturKolom(\'' + esc(kode) + '\')">' +
          '<i class="bi bi-sliders"></i> Atur Label &amp; Sifat Kolom</button>'
  });
}

function namaTipe(t) {
  return { teks: 'Teks singkat', area: 'Teks multi-baris', naskah: 'Naskah (editor)', tanggal: 'Tanggal',
           angka: 'Angka', otomatis: 'Otomatis' }[t] || t;
}

var UBAH_TIPE_BAKU = { TUJUAN: ['teks', 'area'], LAMPIRAN: ['teks', 'area'] };

function bukaAturKolom(kode) {
  var t = templateUntuk(kode);
  if (!t) { toast('Template belum dihubungkan.', 'peringatan'); return; }
  var bid = bidangUntuk(kode).filter(function (b) { return b.sumber !== 'sistem'; })
    .sort(function (a, b) { return (Number(a.urutan) || 0) - (Number(b.urutan) || 0); });

  var baris = bid.map(function (b, i) {
    var pilihanTipe = b.sumber === 'kustom' ? ['teks', 'area', 'naskah', 'tanggal', 'angka']
                                             : (UBAH_TIPE_BAKU[b.kunci] || [b.tipe]);
    var kunciWajib = b.kunci === 'PERIHAL' || b.kunci === 'ISI';
    return '<tr data-kunci="' + esc(b.kunci) + '">' +
      '<td data-label="Placeholder"><span class="chip-nomor">{{' + esc(b.kunci) + '}}</span>' +
      (b.sumber === 'baku' ? '<div class="t-sub">kolom baku</div>' : '') + '</td>' +
      '<td data-label="Label"><input type="text" class="ak-label" value="' + esc(b.label) + '" maxlength="80"></td>' +
      '<td data-label="Tipe"><select class="ak-tipe"' + (pilihanTipe.length < 2 ? ' disabled' : '') + '>' +
        pilihanTipe.map(function (p) { return '<option value="' + p + '"' + (p === b.tipe ? ' selected' : '') + '>' + namaTipe(p) + '</option>'; }).join('') +
      '</select></td>' +
      '<td data-label="Wajib"><label class="saklar"><input type="checkbox" class="ak-wajib"' + (b.wajib ? ' checked' : '') +
        (kunciWajib ? ' disabled' : '') + '><span class="track"></span></label></td>' +
      '<td data-label="Urutan"><input type="number" class="ak-urut" value="' + (Number(b.urutan) || i + 1) + '" min="0" max="99" style="width:70px"></td>' +
      '<td data-label="Petunjuk"><input type="text" class="ak-petunjuk" value="' + esc(b.petunjuk || '') + '" maxlength="160" placeholder="opsional"></td>' +
      '</tr>';
  }).join('');

  bukaModal({
    lebar: true,
    judul: 'Atur Kolom Isian — ' + kode,
    sub: 'Label, tipe masukan, dan sifat wajib kolom yang tampil di generator untuk template ini.',
    isi: '<div class="tabel-bungkus"><table class="data responsif tabel-atur"><thead><tr>' +
      '<th>Placeholder</th><th>Label Kolom</th><th>Tipe</th><th>Wajib</th><th>Urutan</th><th>Petunjuk Pengisian</th>' +
      '</tr></thead><tbody>' + (baris || '<tr><td colspan="6">Tidak ada kolom isian.</td></tr>') + '</tbody></table></div>' +
      '<div class="tx-sm tx-3 mt12"><i class="bi bi-info-circle"></i> <b>Naskah (editor)</b> = paragraf panjang rata kanan-kiri ' +
      'dengan daftar & tabel · <b>Teks multi-baris</b> = setiap baris jadi paragraf (mis. alamat tujuan) · ' +
      '<b>Tanggal</b> dicetak format Indonesia (23 September 2026).</div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnAturKolom" onclick="simpanAturKolom(\'' + esc(kode) + '\')">' +
          '<i class="bi bi-save"></i> Simpan Konfigurasi</button>'
  });
}

function simpanAturKolom(kode) {
  var data = $$('.tabel-atur tbody tr[data-kunci]').map(function (tr) {
    return {
      kunci: tr.dataset.kunci,
      label: $('.ak-label', tr).value.trim(),
      tipe: $('.ak-tipe', tr).value,
      wajib: $('.ak-wajib', tr).checked,
      urutan: Number($('.ak-urut', tr).value) || 0,
      petunjuk: $('.ak-petunjuk', tr).value.trim()
    };
  });
  var btn = el('btnAturKolom');
  tombolSibuk(btn, true, 'Menyimpan…');
  kirim('simpanBidangTemplate', { kodeJenis: kode, bidang: JSON.stringify(data) }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    upsertLokal('templateDoc', r.data, 'master');
    tutupModal();
    toast(r.message, 'sukses');
    setelahTemplateBerubah(kode);
  });
}

function siapkanTemplate() {
  var btn = el('btnSiapkanTpl');
  tombolSibuk(btn, true, 'Membuat template…');
  kirim('siapkanTemplateDoc', {}, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    toast(r.message, 'sukses');
    kirim('refreshModul', { modul: 'templateDoc' }).then(function (r2) {
      if (r2.success) Adm.boot.master.templateDoc = r2.data;
      setelahTemplateBerubah(null);
    });
  });
}

function buatUlangTemplate(kode) {
  konfirmasi({
    judul: 'Buat Template Starter',
    pesan: 'Sistem membuat template starter bawaan untuk jenis <b>' + esc(kode) + '</b>. Anda tetap dapat ' +
           'menggantinya dengan template instansi kapan saja melalui tombol <b>Hubungkan</b>.',
    ya: 'Ya, Buat Starter'
  }).then(function (ya) {
    if (!ya) return;
    toast('Membuat template starter…', 'info', 2500);
    kirim('buatUlangTemplateDoc', { kodeJenis: kode }, APP.batasWaktuUnggah).then(function (r) {
      if (!r.success) { toast(r.message, 'galat'); return; }
      upsertLokal('templateDoc', r.data, 'master');
      toast(r.message, 'sukses');
      setelahTemplateBerubah(kode);
    });
  });
}

/* ── Tab generik: master data ───────────────────────────────────── */
function tabMaster(w, master) {
  var skema = MASTER_SKEMA[master];
  if (!skema) { w.innerHTML = keadaanKosong('Tab tidak dikenal', '', 'bi-question-circle'); return; }

  var data = Adm.boot.master[master] || [];

  w.innerHTML = '<div class="kartu kartu-rapat">' +
    '<div class="kartu-kepala" style="padding:4px 4px 0"><div>' +
    '<h3>' + esc(skema.judul) + '</h3>' +
    '<div class="kartu-sub">' + skema.desk + '</div></div>' +
    '<button class="btn btn-utama" onclick="bukaFormMaster(\'' + master + '\')">' +
    '<i class="bi bi-plus-lg"></i> Tambah Data</button></div>' +
    '<div class="mt16">' +
    bangunTabel({
      data: data, kolom: skema.kolom, idTabel: 'master_' + master,
      halaman: Adm.halaman['master_' + master] || 1,
      judulKosong: 'Belum ada data',
      deskKosong: 'Klik "Tambah Data" untuk mulai mengisi ' + skema.judul.toLowerCase() + '.',
      ikonKosong: 'bi-database',
      aksi: function (r) {
        return '<button class="btn btn-hantu btn-ikon" title="Ubah" onclick="bukaFormMaster(\'' + master +
          '\',\'' + r.id + '\')"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-hantu btn-ikon" title="Hapus" onclick="hapusMaster(\'' + master +
          '\',\'' + r.id + '\')"><i class="bi bi-trash"></i></button>';
      }
    }) + '</div></div>';

  if (master === 'pejabat') {
    w.innerHTML += '<div class="kartu mt20"><div class="kartu-kepala"><div>' +
      '<h3 style="font-size:16px">Unggah Spesimen TTE Transparan</h3>' +
      '<div class="kartu-sub">Berkas PNG dengan latar 100% transparan (alpha channel), resolusi 600×300 piksel.</div>' +
      '</div></div>' +
      bidangPilih({ id: 'ttdPejabat', label: 'Pilih Jabatan Struktural',
        opsi: data.map(function (p) { return { v: p.id, t: p.nama + ' — ' + p.jabatan }; }) }) +
      '<label class="jatuhkan" style="display:block">' +
      '<i class="bi bi-cloud-arrow-up j-ikon"></i>' +
      '<div class="j-judul">Tarik &amp; letakkan berkas TTD transparan</div>' +
      '<div class="j-desk">atau klik untuk menelusuri berkas (maksimal 2 MB, format .PNG)</div>' +
      '<div class="mt8"><span class="chip-nomor" id="ttdNama">contoh: ttd_ketua_transparan.png</span></div>' +
      '<input type="file" accept="image/png" style="display:none" onchange="pilihSpesimen(this)"></label>' +
      '<div class="kanan mt16">' +
      '<button class="btn btn-navy" id="btnSpesimen" onclick="simpanSpesimen()">' +
      '<i class="bi bi-shield-check"></i> Validasi &amp; Simpan Spesimen</button></div></div>';
  }
}

function bukaFormMaster(master, id) {
  var skema = MASTER_SKEMA[master];
  var rec = id ? (Adm.boot.master[master] || []).filter(function (r) { return String(r.id) === String(id); })[0] : null;
  rec = rec || {};

  var isi = '';
  var i = 0;
  while (i < skema.bidang.length) {
    var b = skema.bidang[i];
    if (b.kolom === 2 && skema.bidang[i + 1] && skema.bidang[i + 1].kolom === 2) {
      isi += '<div class="grid-2">' + bidangMaster(b, rec) + bidangMaster(skema.bidang[i + 1], rec) + '</div>';
      i += 2;
    } else { isi += bidangMaster(b, rec); i++; }
  }

  bukaModal({
    judul: (id ? 'Ubah ' : 'Tambah ') + skema.judul,
    sub: skema.desk.replace(/<[^>]+>/g, ''),
    isi: isi,
    lebar: master === 'templateDokumen',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnSimpanMaster" onclick="simpanMaster(\'' + master + '\',\'' +
          (id || '') + '\')"><i class="bi bi-save"></i> Simpan</button>'
  });
}

function bidangMaster(b, rec) {
  var v = rec[b.id];
  if (v === undefined && b.id === 'aktif') v = 'true';
  if (v === undefined && b.id === 'tteAktif') v = 'false';
  if (v === undefined && b.id === 'wajib') v = 'true';
  if (b.t === 'area') return bidangArea({ id: 'ms_' + b.id, label: b.l, wajib: b.wajib, baris: b.baris,
    nilai: v, placeholder: b.ph, bantu: b.bantu });
  if (b.t === 'pilih') return bidangPilih({ id: 'ms_' + b.id, label: b.l, wajib: b.wajib, opsi: b.opsi,
    nilai: v, bantu: b.bantu });
  return bidangTeks({ id: 'ms_' + b.id, label: b.l, wajib: b.wajib, tipe: b.t || 'text',
    nilai: v, placeholder: b.ph, bantu: b.bantu, otomatis: b.t === 'password' ? 'new-password' : null });
}

function simpanMaster(master, id) {
  var skema = MASTER_SKEMA[master];
  var aturan = skema.bidang.filter(function (b) { return b.wajib; })
    .map(function (b) { return { id: 'ms_' + b.id, wajib: true, email: b.t === 'email' }; });
  if (master === 'pengguna' && !id) aturan.push({ id: 'ms_password', wajib: true, pesan: 'Kata sandi wajib untuk akun baru.' });
  if (master === 'pengguna' && ambilNilai('ms_password')) aturan.push({ id: 'ms_password', min: 8 });
  if (!validasiForm(null, aturan)) return;

  var rec = { id: id || '' };
  skema.bidang.forEach(function (b) {
    var v = ambilNilai('ms_' + b.id);
    if (b.id === 'password' && !v) return;
    rec[b.id] = v;
  });

  var btn = el('btnSimpanMaster');
  tombolSibuk(btn, true, 'Menyimpan…');

  kirim('masterSimpan', { master: master, data: rec }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal();
    toast(r.message, 'sukses');
    upsertLokal(master, r.data, 'master');
    if (Adm.modulAktif === 'pengaturan') gambarTabPengaturan();
    segarkanMaster(master);
  });
}

function hapusMaster(master, id) {
  konfirmasi({
    judul: 'Hapus Master Data',
    pesan: 'Data ini akan dihapus permanen. Dokumen lama yang sudah terbit tidak terpengaruh, ' +
           'tetapi pilihan ini tidak akan muncul lagi pada formulir.',
    ya: 'Ya, Hapus', bahaya: true
  }).then(function (ya) {
    if (!ya) return;
    var cadangan = hapusLokal(master, id, 'master');
    if (Adm.modulAktif === 'pengaturan') gambarTabPengaturan();
    kirim('masterHapus', { master: master, id: id }).then(function (r) {
      if (!r.success) {
        if (cadangan) Adm.boot.master[master].splice(cadangan.indeks, 0, cadangan.rec);
        if (Adm.modulAktif === 'pengaturan') gambarTabPengaturan();
        toast(r.message, 'galat');
        return;
      }
      toast(r.message, 'sukses');
    });
  });
}

function segarkanMaster(master) {
  return kirim('refreshModul', { modul: master }).then(function (r) {
    if (r.success) { Adm.boot.master[master] = r.data; Sesi.simpanBoot(Adm.boot); }
    if (Adm.modulAktif === 'pengaturan' && !_tumpukanModal.length) gambarTabPengaturan();
    return r;
  });
}

/* ── Spesimen TTE ───────────────────────────────────────────────── */
function pilihSpesimen(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  if (f.type !== 'image/png') { toast('Spesimen harus berformat PNG dengan latar transparan.', 'galat'); return; }
  if (f.size > 2 * 1024 * 1024) { toast('Ukuran berkas melebihi 2 MB.', 'galat'); return; }

  bacaBerkasBase64(f).then(function (b64) {
    window.__spesimen = { nama: f.name, mime: f.type, base64: b64 };
    el('ttdNama').textContent = f.name + ' · ' + formatUkuran(f.size);
    toast('Berkas siap disimpan. Klik "Validasi & Simpan Spesimen".', 'sukses');
  });
}

function simpanSpesimen() {
  var pejabatId = ambilNilai('ttdPejabat');
  if (!pejabatId) { toast('Pilih pejabat terlebih dahulu.', 'peringatan'); return; }
  if (!window.__spesimen) { toast('Pilih berkas PNG spesimen terlebih dahulu.', 'peringatan'); return; }

  var btn = el('btnSpesimen');
  tombolSibuk(btn, true, 'Mengunggah…');

  kirim('uploadBerkas', {
    base64: window.__spesimen.base64, nama: window.__spesimen.nama,
    mime: window.__spesimen.mime, subfolder: 'Master_TTD_Pejabat'
  }, APP.batasWaktuUnggah).then(function (r) {
    if (!r.success) { tombolSibuk(btn, false); toast(r.message, 'galat'); return; }

    return kirim('masterSimpan', {
      master: 'pejabat',
      data: { id: pejabatId, fileTtdId: r.data.id, fileTtdUrl: r.data.unduh, tteAktif: 'true' }
    }).then(function (r2) {
      tombolSibuk(btn, false);
      if (!r2.success) { toast(r2.message, 'galat'); return; }
      window.__spesimen = null;
      toast('Spesimen tanda tangan tersimpan dan TTE diaktifkan untuk pejabat tersebut.', 'sukses');
      upsertLokal('pejabat', r2.data, 'master');
      gambarTabPengaturan();
    });
  });
}

/* ── Logo aplikasi ──────────────────────────────────────────────── */
function pilihLogo(input) {
  var f = input.files && input.files[0];
  if (!f) return;

  if (['image/png', 'image/jpeg', 'image/webp'].indexOf(f.type) < 0) {
    toast('Logo harus berformat PNG, JPG, atau WEBP.', 'galat');
    input.value = ''; return;
  }
  if (f.size > 2 * 1024 * 1024) {
    toast('Ukuran logo ' + formatUkuran(f.size) + ' melebihi batas 2 MB.', 'galat');
    input.value = ''; return;
  }

  bacaBerkasBase64(f).then(function (b64) {
    window.__logoSementara = { nama: f.name, mime: f.type, base64: b64 };
    el('logoThumb').innerHTML = '<img src="data:' + f.type + ';base64,' + b64 + '" alt="Pratinjau logo">';
    el('logoNama').textContent = f.name + ' · ' + formatUkuran(f.size) + ' — belum diunggah.';
    el('btnLogo').disabled = false;
    toast('Pratinjau logo ditampilkan. Klik "Unggah & Terapkan" untuk menyimpan.', 'info');
  }).catch(function (e) { toast(e.message, 'galat'); });
}

function simpanLogo() {
  if (!window.__logoSementara) { toast('Pilih berkas gambar terlebih dahulu.', 'peringatan'); return; }
  var btn = el('btnLogo');
  tombolSibuk(btn, true, 'Mengunggah…');

  kirim('unggahLogo', window.__logoSementara, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }

    window.__logoSementara = null;
    Adm.boot.config.INSTITUSI_LOGO = r.data.url;
    Sesi.simpanBoot(Adm.boot);
    renderKerangkaAdmin();
    el('logoNama').textContent = 'Logo kustom aktif · ' + r.data.ukuranMb + ' MB';
    toast(r.message, 'sukses');
  });
}

function hapusLogo() {
  konfirmasi({
    judul: 'Kembali ke Lambang Bawaan',
    pesan: 'Logo kustom akan dilepas dari aplikasi. Berkas gambarnya tetap tersimpan di Google Drive.',
    ya: 'Ya, Pakai Lambang Bawaan'
  }).then(function (ya) {
    if (!ya) return;
    kirim('simpanConfig', { config: { INSTITUSI_LOGO: '' } }).then(function (r) {
      if (!r.success) { toast(r.message, 'galat'); return; }
      Adm.boot.config = r.data;
      Sesi.simpanBoot(Adm.boot);
      renderKerangkaAdmin();
      gambarTabPengaturan();
      toast('Aplikasi kembali memakai lambang bawaan.', 'sukses');
    });
  });
}
