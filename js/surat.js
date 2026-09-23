/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/surat.js  (v4.2)
   Generator Surat Keluar & Surat Keputusan berbasis TEMPLATE INSTANSI,
   serta Berita Acara & Notulensi.

   Alur v4.2:
   Admin menghubungkan template Google Docs milik instansi → sistem
   memindai placeholder {{...}} → kolom isian generator dibentuk OTOMATIS
   sesuai placeholder template tiap jenis surat.
   ═══════════════════════════════════════════════════════════════════ */

var Surat = { rekam: null, potongan: [], transkripLangsung: '' };

/* ── Kamus placeholder (klien) ──────────────────────────────────── */
var PH_OTOMATIS = ['NOMOR', 'TANGGAL', 'KOTA', 'INSTITUSI', 'SINGKATAN', 'YAYASAN', 'ALAMAT', 'TELEPON',
                   'EMAIL', 'WEBSITE', 'AKREDITASI', 'TAHUN_AKADEMIK', 'PERIHAL_KAPITAL', 'JABATAN',
                   'JABATAN_KAPITAL', 'NAMA_PEJABAT', 'NIDN', 'TTE', 'QR'];
var PH_PEJABAT_KLIEN = ['NAMA_PEJABAT', 'JABATAN', 'JABATAN_KAPITAL', 'NIDN', 'TTE'];
var PH_BAKU_KLIEN = {
  PERIHAL:    { label: 'Perihal / Hal Surat', tipe: 'teks', wajib: true, kolom: 'perihal' },
  TUJUAN:     { label: 'Ditujukan Kepada', tipe: 'area', wajib: false, kolom: 'tujuan' },
  LAMPIRAN:   { label: 'Lampiran', tipe: 'teks', wajib: false, kolom: 'lampiran' },
  ISI:        { label: 'Naskah / Isi Surat', tipe: 'naskah', wajib: true, kolom: 'isiNaskah' },
  MENIMBANG:  { label: 'Menimbang', tipe: 'naskah', wajib: false, kolom: 'menimbang' },
  MENGINGAT:  { label: 'Mengingat', tipe: 'naskah', wajib: false, kolom: 'mengingat' },
  MENETAPKAN: { label: 'Menetapkan', tipe: 'naskah', wajib: true, kolom: 'menetapkan' }
};
var BIDANG_BAWAAN = {
  suratKeluar: ['NOMOR', 'TANGGAL', 'PERIHAL', 'LAMPIRAN', 'TUJUAN', 'ISI', 'JABATAN', 'NAMA_PEJABAT', 'NIDN', 'TTE', 'QR'],
  sk: ['NOMOR', 'TANGGAL', 'JABATAN_KAPITAL', 'PERIHAL_KAPITAL', 'MENIMBANG', 'MENGINGAT', 'MENETAPKAN',
       'JABATAN', 'NAMA_PEJABAT', 'NIDN', 'TTE', 'QR']
};

function templateUntuk(kode) {
  return ((Adm.boot.master || {}).templateDoc || []).filter(function (t) { return t.kodeJenis === kode; })[0] || null;
}

/** Definisi kolom sebuah template (hasil pindai) — atau bawaan bila belum ada template. */
function bidangUntuk(kode, modul) {
  var tpl = templateUntuk(kode);
  var b = null;
  if (tpl && tpl.bidang) { try { b = JSON.parse(tpl.bidang); } catch (e) { b = null; } }
  if (b && b.length) return b;
  var kunci = tpl && tpl.placeholder
    ? (String(tpl.placeholder).match(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g) || []).map(function (s) {
        return s.replace(/[{}\s]/g, '').toUpperCase();
      })
    : BIDANG_BAWAAN[modul] || BIDANG_BAWAAN.suratKeluar;
  return kunci.map(function (k, i) {
    if (PH_OTOMATIS.indexOf(k) >= 0) return { kunci: k, sumber: 'sistem', tipe: 'otomatis', label: k, urutan: i + 1 };
    var baku = PH_BAKU_KLIEN[k];
    if (baku) return { kunci: k, sumber: 'baku', kolom: baku.kolom, tipe: baku.tipe, label: baku.label, wajib: baku.wajib, urutan: i + 1 };
    return { kunci: k, sumber: 'kustom', tipe: /TGL|TANGGAL/.test(k) ? 'tanggal' : 'teks',
             label: labelDariKunci(k), wajib: false, urutan: i + 1 };
  });
}

/* ══════════════════════════════════════════════════════════════════
   SURAT KELUAR — daftar
   ══════════════════════════════════════════════════════════════════ */
function renderSuratKeluar(w) {
  var data = (Adm.boot.data.suratKeluar || []).slice().reverse();
  var cari = Adm.filter.suratKeluar || '';
  if (cari) {
    var q = cari.toLowerCase();
    data = data.filter(function (r) {
      return (String(r.nomorSurat) + r.perihal + r.tujuan + r.jenisSurat).toLowerCase().indexOf(q) >= 0;
    });
  }

  var semua = Adm.boot.data.suratKeluar || [];
  var terbit = semua.filter(function (r) { return r.status === 'TERBIT'; }).length;
  var draf = semua.filter(function (r) { return r.status === 'DRAF'; }).length;

  var h = kepalaHalaman({
    remah: ['Arsip & Persuratan', 'Surat Keluar', 'Generator Persuratan Resmi'],
    judul: 'Generator & Registrasi Surat Keluar',
    sub: 'Terbitkan surat dinas dari template Google Docs instansi — kolom isian menyesuaikan placeholder template tiap jenis surat.',
    aksi: (Sesi.boleh('tulis')
      ? '<button class="btn btn-utama" onclick="bukaGeneratorSurat()">' +
        '<i class="bi bi-file-earmark-plus"></i> Buat Surat Baru</button>' : '') +
      '<button class="btn btn-garis" onclick="bukaPanelTemplate(\'suratKeluar\')">' +
      '<i class="bi bi-file-earmark-richtext"></i> Template Docs</button>'
  });

  h += '<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">' +
    kartuKpi('Surat Terbit', terbit, 'Dokumen', 'bi-patch-check', 'hijau', '') +
    kartuKpi('Tersimpan sebagai Draf', draf, 'Konsep', 'bi-file-earmark', 'abu',
             '<span class="tx-3">Draf belum memakai nomor surat</span>') +
    kartuKpi('Total Register', semua.length, 'Baris', 'bi-journals', 'biru', '') +
    '</div>';

  h += '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" id="cari_suratKeluar" value="' + esc(cari) + '" placeholder="Cari nomor surat, perihal, atau tujuan…" ' +
    'oninput="cariModul(\'suratKeluar\',this.value)"></div><div class="sisa"></div>' +
    '<button class="btn btn-garis btn-sm" onclick="eksporModul(\'suratKeluar\')">' +
    '<i class="bi bi-filetype-csv"></i> Ekspor</button></div>' +

    bangunTabel({
      data: data, kolom: KOLOM_MODUL.suratKeluar, idTabel: 'suratKeluar',
      halaman: Adm.halaman.suratKeluar || 1,
      judulKosong: 'Belum ada surat keluar',
      deskKosong: 'Klik "Buat Surat Baru" untuk menerbitkan dokumen resmi pertama Anda.',
      ikonKosong: 'bi-envelope-paper',
      aksiKosong: Sesi.boleh('tulis') ? '<button class="btn btn-utama" onclick="bukaGeneratorSurat()">' +
        '<i class="bi bi-file-earmark-plus"></i> Buat Surat Baru</button>' : '',
      aksi: function (r) { return aksiDokumen('suratKeluar', r, r.nomorSurat, 'bukaGeneratorSurat'); }
    }) + '</div>';

  w.innerHTML = h;
}

function aksiDokumen(modul, r, nomor, fnEdit) {
  var a = '<button class="btn btn-hantu btn-ikon" title="Detail" onclick="lihatDetail(\'' + modul + '\',\'' +
          r.id + '\')"><i class="bi bi-eye"></i></button>';
  if (r.pdfUrl) a += tombolPratinjau(r.pdfUrl, nomor, 'bi-file-earmark-pdf', 'Pratinjau PDF');
  if (Sesi.boleh('tulis') && r.status === 'DRAF') {
    a += '<button class="btn btn-hantu btn-ikon" title="Lanjutkan draf" onclick="' + fnEdit + '(\'' +
         r.id + '\')"><i class="bi bi-pencil"></i></button>';
  }
  if (Sesi.boleh('tulis')) {
    a += '<button class="btn btn-hantu btn-ikon" title="Unggah scan asli" onclick="bukaUnggahScan(\'' + modul + '\',\'' +
         r.id + '\')"><i class="bi bi-upload"></i></button>';
  }
  if (Sesi.boleh('tulis') && r.status === 'TERBIT') {
    a += '<button class="btn btn-hantu btn-ikon" title="Tarik kembali" onclick="tarikDokumen(\'' + modul + '\',\'' +
         r.id + '\')"><i class="bi bi-arrow-counterclockwise"></i></button>';
  }
  if (Sesi.boleh('hapus')) {
    a += '<button class="btn btn-hantu btn-ikon" title="Hapus" onclick="hapusData(\'' + modul + '\',\'' +
         r.id + '\')"><i class="bi bi-trash"></i></button>';
  }
  return a;
}

/* ══════════════════════════════════════════════════════════════════
   GENERATOR DINAMIS (Surat Keluar & SK)
   ══════════════════════════════════════════════════════════════════ */
var Gen = { modul: null, id: null, rec: {}, kode: null, bidang: [], cache: {} };

function bukaGeneratorSurat(id) { bukaGenerator('suratKeluar', id); }
function bukaGeneratorSK(id) { bukaGenerator('sk', id); }

function bukaGenerator(modul, id) {
  var sk = modul === 'sk';
  var rec = id ? (Adm.boot.data[modul] || []).filter(function (r) { return String(r.id) === String(id); })[0] : null;
  Gen = { modul: modul, id: id || '', rec: rec || { tteAktif: 'true' }, kode: null, bidang: [], cache: {} };

  var jenis = (Adm.boot.master.jenisSurat || []).filter(function (j) {
    return j.modul === modul && String(j.aktif) === 'true';
  });

  var isi =
    '<div class="pratinjau-nomor mb16">' +
    '<div class="pn-label"><span>' + (sk ? 'Nomor Surat Keputusan' : 'Nomor Registrasi Surat') + '</span>' +
    '<span class="lencana emas"><i class="bi bi-lightning-charge"></i> Otomatis</span></div>' +
    '<div class="pn-nilai" id="pnNomor">— pilih jenis ' + (sk ? 'SK' : 'surat') + ' —</div>' +
    '<div class="pn-ket" id="pnKet">Nomor baru dikunci hanya saat dokumen diterbitkan</div></div>' +

    '<div class="grid-2">' +
    bidangPilih({ id: 'gnJenis', label: sk ? 'Jenis Surat Keputusan' : 'Jenis Surat Kedinasan', wajib: true,
      nilai: Gen.rec.kodeJenis,
      opsi: jenis.map(function (j) {
        var ada = templateUntuk(j.kode);
        return { v: j.kode, t: j.nama + ' (' + j.kode + ')' + (ada ? '' : ' — belum ada template') };
      }) }) +
    bidangTeks({ id: 'gnTanggal', label: sk ? 'Tanggal Penetapan' : 'Tanggal Surat Diterbitkan', tipe: 'date',
      nilai: tglInput(sk ? Gen.rec.tanggalSK : Gen.rec.tanggalSurat) }) + '</div>' +

    '<div id="gnInfoTpl"></div>' +
    '<div id="gnBidang"><div class="kosong" style="padding:28px"><i class="bi bi-ui-checks"></i>' +
    '<div class="k-desk">Pilih jenis ' + (sk ? 'SK' : 'surat') + ' — kolom isian akan muncul sesuai template.</div></div></div>';

  bukaModal({
    lebar: true,
    judul: (id ? 'Lanjutkan Draf ' : 'Generator ') + (sk ? 'Surat Keputusan' : 'Surat Keluar'),
    sub: 'Kolom isian mengikuti placeholder pada template Google Docs instansi. Nomor dialokasikan saat diterbitkan.',
    isi: isi,
    kunci: true,
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-hantu" id="btnDrafGen" onclick="simpanDrafGen()">' +
          '<i class="bi bi-save"></i> Simpan Draf</button>' +
          '<button class="btn btn-navy" id="btnPratinjauGen" onclick="pratinjauGen()">' +
          '<i class="bi bi-eye"></i> Pratinjau PDF</button>' +
          '<button class="btn btn-utama" id="btnTerbitGen" onclick="terbitkanGen()">' +
          '<i class="bi bi-file-earmark-check"></i> Terbitkan Dokumen Resmi</button>',
    setelah: function () {
      var s = el('gnJenis');
      s.addEventListener('change', function () { gantiJenisGen(); });
      if (!s.value && jenis.length === 1) s.value = jenis[0].kode;
      if (s.value) gantiJenisGen();
    }
  });
}

function gantiJenisGen() {
  simpanCacheGen();
  Gen.kode = ambilNilai('gnJenis');
  if (!Gen.kode) return;
  tampilkanNomorGen();
  renderBidangGen();
}

/** Nomor berikutnya dihitung LOKAL (instan), lalu dikonfirmasi server di latar. */
function tampilkanNomorGen() {
  var kode = Gen.kode;
  var j = (Adm.boot.master.jenisSurat || []).filter(function (x) { return x.kode === kode; })[0];
  if (j) {
    var thn = new Date().getFullYear();
    var jalan = Number(j.tahunBerjalan) === thn ? (Number(j.nomorBerjalan) || 0) : 0;
    var berikut = Math.max(jalan + 1, Number(j.nomorAwal) || 1);
    el('pnNomor').textContent = susunNomorLokal(j.formatNomor, kode, berikut);
    el('pnKet').textContent = 'Perkiraan · format: ' + (j.formatNomor || '-');
  }
  ambil('previewNomor', { kodeJenis: kode }).then(function (r) {
    if (!r.success || Gen.kode !== kode || !el('pnNomor')) return;
    el('pnNomor').textContent = r.data.nomor;
    el('pnKet').textContent = 'Terakhir digunakan: ' + r.data.terakhir + ' · format: ' + r.data.format;
  });
}

function susunNomorLokal(format, kode, urut) {
  var d = new Date();
  var r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  var n = String(urut); while (n.length < 3) n = '0' + n;
  return String(format || '{NOMOR}/{KODE}/{INSTITUSI}/{ROMAWI}/{TAHUN}')
    .replace(/\{NOMOR\}/g, n).replace(/\{KODE\}/g, kode)
    .replace(/\{INSTITUSI\}/g, (Adm.boot.config || {}).INSTITUSI_KODE || 'INST')
    .replace(/\{ROMAWI\}/g, r[d.getMonth()]).replace(/\{TAHUN\}/g, d.getFullYear())
    .replace(/\{BULAN\}/g, pad2(d.getMonth() + 1)).replace(/\{TANGGAL\}/g, pad2(d.getDate()))
    .replace(/\{PRODI\}/g, '');
}

function isianRecGen() {
  try { return typeof Gen.rec.dataIsian === 'string' ? JSON.parse(Gen.rec.dataIsian || '{}') : (Gen.rec.dataIsian || {}); }
  catch (e) { return {}; }
}

function nilaiAwalGen(b) {
  if (Gen.cache[b.kunci] !== undefined) return Gen.cache[b.kunci];
  if (b.sumber === 'baku') {
    if (b.kolom === 'perihal') return Gen.modul === 'sk' ? (Gen.rec.tentang || '') : (Gen.rec.perihal || '');
    if (b.kolom === 'lampiran' && !Gen.rec.id) return '-';
    return Gen.rec[b.kolom] || '';
  }
  return isianRecGen()[b.kunci] || '';
}

/** Kolom isian tampil sesuai placeholder template yang dipilih. */
function renderBidangGen() {
  var sk = Gen.modul === 'sk';
  var tpl = templateUntuk(Gen.kode);
  var bidang = bidangUntuk(Gen.kode, Gen.modul).slice();

  var adaPerihal = bidang.some(function (b) { return b.kunci === 'PERIHAL'; });
  if (!adaPerihal) {
    bidang.unshift({ kunci: 'PERIHAL', sumber: 'baku', kolom: 'perihal', tipe: 'teks', wajib: true, urutan: 0,
                     virtual: true, label: sk ? 'Tentang (Judul Keputusan)' : 'Perihal (untuk register surat)' });
  }
  Gen.bidang = bidang;

  /* Info template */
  var info = '';
  if (tpl) {
    var nSistem = bidang.filter(function (b) { return b.sumber === 'sistem'; }).length;
    info = '<div class="info-tpl mb16"><i class="bi bi-file-earmark-richtext"></i><div class="sisa">' +
      '<div class="tebal">' + esc(tpl.namaTemplate || 'Template') + '</div>' +
      '<div class="tx-sm">' + (bidang.length - nSistem) + ' kolom isian · ' + nSistem +
      ' diisi otomatis (nomor, tanggal, identitas, pejabat, TTE, QR)</div></div>' +
      '<div class="baris g6 bungkus">' +
      '<a class="btn btn-garis btn-sm" href="' + esc(tpl.docUrl) + '" target="_blank" rel="noopener">' +
      '<i class="bi bi-box-arrow-up-right"></i> Buka Template</a>' +
      (Sesi.boleh('master') ? '<button class="btn btn-garis btn-sm" onclick="bukaAturKolom(\'' + esc(Gen.kode) + '\')">' +
        '<i class="bi bi-sliders"></i> Atur Kolom</button>' : '') + '</div></div>';
  } else {
    info = '<div class="info-tpl peringatan mb16"><i class="bi bi-exclamation-triangle"></i><div class="sisa">' +
      '<div class="tebal">Template Google Docs untuk jenis ini belum dihubungkan</div>' +
      '<div class="tx-sm">Anda tetap dapat menyimpan draf. Penerbitan memerlukan template instansi.</div></div>' +
      (Sesi.boleh('master') ? '<button class="btn btn-utama btn-sm" onclick="hubungkanDoc(\'' + esc(Gen.kode) + '\')">' +
        '<i class="bi bi-link-45deg"></i> Hubungkan Template</button>' : '') + '</div>';
  }
  el('gnInfoTpl').innerHTML = info;

  /* Kolom isian */
  var h = '';
  bidang.filter(function (b) { return b.sumber !== 'sistem'; })
    .sort(function (a, b) { return (Number(a.urutan) || 0) - (Number(b.urutan) || 0); })
    .forEach(function (b) {
      var label = b.label;
      if (sk && b.kunci === 'PERIHAL' && !b.virtual && /Perihal/.test(label)) label = 'Tentang (Judul Keputusan)';
      var ket = (b.petunjuk ? esc(b.petunjuk) + ' · ' : '') +
                '<span class="mono tx-xs">{{' + esc(b.kunci) + '}}</span>';
      var v = nilaiAwalGen(b);
      if (b.tipe === 'naskah') {
        h += '<div class="bidang" data-kunci="' + esc(b.kunci) + '"><label>' + esc(label) +
          (b.wajib ? ' <span class="wajib">*</span>' : '') + '</label>' +
          editorNaskah('gnE_' + b.kunci, v, 'Ketik ' + label.toLowerCase() + ' di sini…',
                       b.kunci === 'ISI' ? 220 : 140) +
          '<div class="bantu">' + ket + '</div><div class="pesan-galat">Isian ini wajib diisi.</div></div>';
      } else if (b.tipe === 'area') {
        h += bidangArea({ id: 'gn_' + b.kunci, label: label, wajib: b.wajib, baris: 3, nilai: v, bantu: ket });
      } else if (b.tipe === 'tanggal') {
        h += bidangTeks({ id: 'gn_' + b.kunci, label: label, wajib: b.wajib, tipe: 'date', nilai: v, bantu: ket });
      } else if (b.tipe === 'angka') {
        h += bidangTeks({ id: 'gn_' + b.kunci, label: label, wajib: b.wajib, tipe: 'number', nilai: v, bantu: ket });
      } else {
        h += bidangTeks({ id: 'gn_' + b.kunci, label: label, wajib: b.wajib, nilai: v, bantu: ket, maks: 300 });
      }
    });

  /* Pejabat & TTE hanya bila template memuat placeholder pejabat */
  var butuhPejabat = !tpl || bidang.some(function (b) { return PH_PEJABAT_KLIEN.indexOf(b.kunci) >= 0; });
  var adaTte = !tpl || bidang.some(function (b) { return b.kunci === 'TTE'; });
  if (butuhPejabat) {
    var pejabat = (Adm.boot.master.pejabat || []).filter(function (p) { return String(p.aktif) === 'true'; });
    var pj = Gen.cache.__pejabat !== undefined ? Gen.cache.__pejabat : Gen.rec.pejabatId;
    h += bidangPilih({ id: 'gnPejabat', label: sk ? 'Pejabat Penetap' : 'Pejabat Penandatangan', wajib: true, nilai: pj,
      opsi: pejabat.map(function (p) {
        return { v: p.id, t: p.nama + (p.gelar ? ', ' + p.gelar : '') + ' — ' + p.jabatan };
      }) });
  }
  if (adaTte) {
    var tte = Gen.cache.__tte !== undefined ? Gen.cache.__tte : String(Gen.rec.tteAktif) !== 'false';
    h += '<div class="kartu kartu-rapat" style="background:var(--navy-dark);border:none;color:#fff">' +
      '<div class="baris antara g12"><div class="sisa">' +
      '<div class="tebal tx-md" style="color:#fff">Tanda Tangan Elektronik (TTE) &amp; QR Validasi</div>' +
      '<div class="tx-sm mt4" style="color:rgba(255,255,255,.6);line-height:1.6">Spesimen dari Master Pejabat ' +
      'disematkan pada {{TTE}}. Nonaktifkan untuk menyisakan ruang tanda tangan basah.</div></div>' +
      '<label class="saklar"><input type="checkbox" id="gnTte"' + (tte ? ' checked' : '') +
      '><span class="track"></span></label></div></div>';
  }

  var otomatis = bidang.filter(function (b) { return b.sumber === 'sistem'; });
  if (otomatis.length) {
    h += '<div class="mt16"><div class="label-kecil mb8">Diisi otomatis oleh sistem</div><div class="baris g6 bungkus">' +
      otomatis.map(function (b) { return '<span class="chip-nomor" title="' + esc(b.label) + '">{{' + esc(b.kunci) + '}}</span>'; }).join('') +
      '</div></div>';
  }

  el('gnBidang').innerHTML = h;
}

/** Simpan isian sementara agar tidak hilang saat berganti jenis surat. */
function simpanCacheGen() {
  (Gen.bidang || []).forEach(function (b) {
    if (b.sumber === 'sistem') return;
    var v = nilaiFieldGen(b);
    if (v !== null) Gen.cache[b.kunci] = v;
  });
  if (el('gnPejabat')) Gen.cache.__pejabat = ambilNilai('gnPejabat');
  if (el('gnTte')) Gen.cache.__tte = el('gnTte').checked;
}

function nilaiFieldGen(b) {
  if (b.tipe === 'naskah') return el('gnE_' + b.kunci) ? ambilEditor('gnE_' + b.kunci) : null;
  return el('gn_' + b.kunci) ? ambilNilai('gn_' + b.kunci) : null;
}

function kumpulkanGen() {
  var sk = Gen.modul === 'sk';
  var rec = { id: Gen.id || '', kodeJenis: ambilNilai('gnJenis') };
  if (sk) rec.tanggalSK = ambilNilai('gnTanggal'); else rec.tanggalSurat = ambilNilai('gnTanggal');
  rec.pejabatId = el('gnPejabat') ? ambilNilai('gnPejabat') : (Gen.rec.pejabatId || '');
  rec.tteAktif = el('gnTte') ? (el('gnTte').checked ? 'true' : 'false') : 'false';

  var isian = {};
  Gen.bidang.forEach(function (b) {
    if (b.sumber === 'sistem') return;
    var v = nilaiFieldGen(b);
    if (v === null) return;
    if (b.sumber === 'baku') {
      if (b.kolom === 'perihal') { if (sk) rec.tentang = v; else rec.perihal = v; }
      else rec[b.kolom] = v;
    } else {
      isian[b.kunci] = v;
    }
  });
  if (sk) rec.perihal = rec.tentang;
  rec.dataIsian = JSON.stringify(isian);
  return rec;
}

function validasiGen(penuh) {
  if (!ambilNilai('gnJenis')) { tandaiGalat(el('gnJenis'), 'Jenis wajib dipilih.'); toast('Pilih jenis surat terlebih dahulu.', 'peringatan'); return false; }
  bersihkanGalat();
  var kurang = [], pertama = null;
  Gen.bidang.forEach(function (b) {
    if (b.sumber === 'sistem' || !b.wajib) return;
    if (!penuh && b.kunci !== 'PERIHAL') return;
    var kosong = b.tipe === 'naskah' ? editorKosong('gnE_' + b.kunci) : !ambilNilai('gn_' + b.kunci);
    if (kosong) {
      kurang.push(b.label);
      var n = b.tipe === 'naskah' ? $('[data-kunci="' + b.kunci + '"]') : el('gn_' + b.kunci);
      if (b.tipe === 'naskah' && n) n.classList.add('galat'); else tandaiGalat(n);
      if (!pertama) pertama = b.tipe === 'naskah' ? el('gnE_' + b.kunci) : n;
    }
  });
  if (penuh && el('gnPejabat') && !ambilNilai('gnPejabat')) {
    kurang.push('Pejabat Penandatangan');
    tandaiGalat(el('gnPejabat'));
    if (!pertama) pertama = el('gnPejabat');
  }
  if (kurang.length) {
    if (pertama) { pertama.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { pertama.focus(); }, 300); }
    toast('Isian wajib belum lengkap: ' + kurang.join(', ') + '.', 'peringatan');
    return false;
  }
  return true;
}

function simpanDrafGen() {
  if (!validasiGen(false)) return;
  var btn = el('btnDrafGen');
  var rec = kumpulkanGen();
  rec.status = 'DRAF';
  var modul = Gen.modul;

  tombolSibuk(btn, true, 'Menyimpan…');
  kirim('simpanRecord', { modul: modul, data: rec }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal();
    toast('Draf tersimpan tanpa memakai nomor surat.', 'sukses');
    upsertLokal(modul, r.data);
    if (Adm.modulAktif === modul) renderModul(modul);
    segarkanModul(modul, true);
  });
}

function pratinjauGen() {
  if (!validasiGen(true)) return;
  if (!templateUntuk(ambilNilai('gnJenis'))) { toast('Hubungkan template Google Docs untuk jenis ini terlebih dahulu.', 'peringatan'); return; }
  var btn = el('btnPratinjauGen');
  var rec = kumpulkanGen();

  tombolSibuk(btn, true, 'Membangun PDF…');
  kirim('pratinjauDokumen', {
    kodeJenis: rec.kodeJenis, record: rec, qrDataUrl: buatQrDataUrl('PRATINJAU')
  }, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    pratinjauPdfBase64(r.data.pdfBase64, r.data.namaFile, 'Pratinjau Lembar Resmi',
      'Nomor ' + (r.data.nomorPratinjau || '') + ' — belum terpakai, counter tidak dinaikkan.');
  });
}

function terbitkanGen() {
  if (!validasiGen(true)) return;
  if (!templateUntuk(ambilNilai('gnJenis'))) { toast('Hubungkan template Google Docs untuk jenis ini terlebih dahulu.', 'peringatan'); return; }
  var rec = kumpulkanGen();
  var modul = Gen.modul;
  var sk = modul === 'sk';

  konfirmasi({
    judul: sk ? 'Terbitkan Surat Keputusan' : 'Terbitkan Dokumen Resmi',
    pesan: 'Nomor ' + (sk ? 'SK' : 'surat') + ' akan <b>dikunci permanen</b> pada register. ' +
           'Dokumen PDF dibuat dari template Google Docs lalu diarsipkan ke Drive. ' +
           'Bila pembuatan gagal, nomor dikembalikan otomatis.',
    ya: 'Ya, Terbitkan Sekarang'
  }).then(function (ya) {
    if (!ya) return;
    var btn = el('btnTerbitGen');
    tombolSibuk(btn, true, 'Menerbitkan…');

    kirim(sk ? 'terbitkanSK' : 'terbitkanSuratKeluar', {
      record: rec, qrDataUrl: buatQrDataUrl((sk ? rec.tentang : rec.perihal) || 'e-SURAT')
    }, APP.batasWaktuUnggah).then(function (r) {
      tombolSibuk(btn, false);
      if (!r.success) { toast(r.message, 'galat', 9000); return; }
      tutupModal();
      toast(r.message, 'sukses');
      upsertLokal(modul, r.data);
      if (Adm.modulAktif === modul) renderModul(modul);
      segarkanModul(modul, true);
      var nomor = r.data.nomorSK || r.data.nomorSurat;
      if (r.data.pdfUrl) {
        bukaModal({
          sempit: true, judul: 'Dokumen Berhasil Diterbitkan',
          isi: '<div class="tgh"><div class="kpi-ikon hijau" style="width:52px;height:52px;font-size:24px;' +
            'margin:0 auto 14px"><i class="bi bi-patch-check-fill"></i></div>' +
            '<div class="mb12">' + chipNomor(nomor) + '</div>' +
            '<div class="tx-md tx-2">' + esc(r.data.perihal || r.data.tentang) + '</div></div>',
          kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' +
                '<button class="btn btn-utama" onclick="tutupModal();pratinjauBerkas(\'' + esc(r.data.pdfUrl) +
                '\',\'' + esc(String(nomor).replace(/'/g, '')) + '\')">' +
                '<i class="bi bi-file-earmark-pdf"></i> Lihat PDF Resmi</button>',
          tanpaFokus: true
        });
      }
    });
  });
}

/* ── Tarik kembali ──────────────────────────────────────────────── */
function tarikDokumen(modul, id) {
  bukaModal({
    sempit: true,
    judul: 'Tarik Kembali Dokumen',
    sub: 'Aksi ini dicatat permanen pada log audit sistem.',
    isi: bidangArea({ id: 'alasanTarik', label: 'Alasan Penarikan', wajib: true, baris: 4,
      placeholder: 'Uraikan alasan penarikan (minimal 10 karakter).' }),
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-bahaya" id="btnTarik" onclick="prosesTarik(\'' + modul + '\',\'' + id + '\')">' +
          '<i class="bi bi-arrow-counterclockwise"></i> Tarik Kembali</button>'
  });
}

function prosesTarik(modul, id) {
  var alasan = ambilNilai('alasanTarik');
  if (alasan.length < 10) { tandaiGalat(el('alasanTarik'), 'Alasan minimal 10 karakter.'); return; }
  var btn = el('btnTarik');
  tombolSibuk(btn, true);
  kirim('tarikKembaliDokumen', { modul: modul, id: id, alasan: alasan }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal();
    toast(r.message, 'sukses');
    upsertLokal(modul, r.data);
    if (Adm.modulAktif === modul) renderModul(modul);
  });
}

/* ── Panel template (pintasan dari halaman surat) ───────────────── */
function bukaPanelTemplate(modul) {
  bukaModal({
    lebar: true,
    judul: 'Template Google Docs Instansi',
    sub: 'Tempel URL template milik instansi → sistem memindai placeholder → kolom generator terbentuk otomatis.',
    isi: panduanAlurTemplate() + tabelTemplateHtml(modul),
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' +
          (Sesi.boleh('tulis') ? '<button class="btn btn-hantu" id="btnSiapkanTpl" onclick="siapkanTemplate()">' +
            '<i class="bi bi-magic"></i> Buat Starter untuk yang Belum Ada</button>' : '')
  });
}

/* ══════════════════════════════════════════════════════════════════
   SURAT KEPUTUSAN (SK) — daftar
   ══════════════════════════════════════════════════════════════════ */
function renderSK(w) {
  var data = (Adm.boot.data.sk || []).slice().reverse();
  var cari = Adm.filter.sk || '';
  if (cari) {
    var q = cari.toLowerCase();
    data = data.filter(function (r) {
      return (String(r.nomorSK) + r.tentang + r.jenisSK).toLowerCase().indexOf(q) >= 0;
    });
  }

  var h = kepalaHalaman({
    remah: ['Arsip & Persuratan', 'Surat Keputusan'],
    judul: 'Surat Keputusan (SK)',
    sub: 'Penerbitan SK dari template Google Docs instansi — kolom Menimbang, Mengingat, Menetapkan, dan isian lain mengikuti template.',
    aksi: (Sesi.boleh('tulis') ? '<button class="btn btn-utama" onclick="bukaGeneratorSK()">' +
      '<i class="bi bi-file-earmark-plus"></i> Buat SK Baru</button>' : '') +
      '<button class="btn btn-garis" onclick="bukaPanelTemplate(\'sk\')">' +
      '<i class="bi bi-file-earmark-richtext"></i> Template Docs</button>'
  });

  h += '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" id="cari_sk" value="' + esc(cari) + '" placeholder="Cari nomor SK atau judul…" ' +
    'oninput="cariModul(\'sk\',this.value)"></div><div class="sisa"></div>' +
    '<button class="btn btn-garis btn-sm" onclick="eksporModul(\'sk\')">' +
    '<i class="bi bi-filetype-csv"></i> Ekspor</button></div>' +

    bangunTabel({
      data: data, kolom: KOLOM_MODUL.sk, idTabel: 'sk', halaman: Adm.halaman.sk || 1,
      judulKosong: 'Belum ada Surat Keputusan',
      deskKosong: 'SK yang diterbitkan akan tercatat di sini beserta PDF resminya.',
      ikonKosong: 'bi-file-earmark-ruled',
      aksi: function (r) { return aksiDokumen('sk', r, r.nomorSK, 'bukaGeneratorSK'); }
    }) + '</div>';

  w.innerHTML = h;
}

/* ══════════════════════════════════════════════════════════════════
   BERITA ACARA & NOTULENSI
   ══════════════════════════════════════════════════════════════════ */
function renderBeritaAcara(w) {
  var data = (Adm.boot.data.beritaAcara || []).slice().reverse();
  var cari = Adm.filter.beritaAcara || '';
  if (cari) {
    var q = cari.toLowerCase();
    data = data.filter(function (r) {
      return (String(r.nomorDokumen) + r.agenda + r.lokasi).toLowerCase().indexOf(q) >= 0;
    });
  }

  var h = kepalaHalaman({
    remah: ['Arsip & Persuratan', 'Berita Acara & Notulensi'],
    judul: 'Berita Acara & Notulensi Rapat',
    sub: 'Dokumentasi kegiatan dan rapat lengkap dengan perekam suara serta transkripsi otomatis berbantuan AI.',
    aksi: Sesi.boleh('tulis')
      ? '<button class="btn btn-garis" onclick="bukaFormBA(\'BERITA_ACARA\')">' +
        '<i class="bi bi-journal-plus"></i> Berita Acara</button>' +
        '<button class="btn btn-utama" onclick="bukaFormBA(\'NOTULENSI\')">' +
        '<i class="bi bi-mic"></i> Notulensi Rapat</button>' : ''
  });

  h += '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" id="cari_beritaAcara" value="' + esc(cari) + '" placeholder="Cari agenda atau nomor dokumen…" ' +
    'oninput="cariModul(\'beritaAcara\',this.value)"></div><div class="sisa"></div>' +
    '<button class="btn btn-garis btn-sm" onclick="eksporModul(\'beritaAcara\')">' +
    '<i class="bi bi-filetype-csv"></i> Ekspor</button></div>' +

    bangunTabel({
      data: data, kolom: KOLOM_MODUL.beritaAcara, idTabel: 'beritaAcara',
      halaman: Adm.halaman.beritaAcara || 1,
      judulKosong: 'Belum ada berita acara',
      deskKosong: 'Dokumen rapat yang dibuat akan tercatat di sini.',
      ikonKosong: 'bi-journal-text',
      aksi: function (r) {
        var a = '<button class="btn btn-hantu btn-ikon" title="Detail" onclick="lihatDetail(\'beritaAcara\',\'' +
                r.id + '\')"><i class="bi bi-eye"></i></button>';
        if (r.audioUrl) a += tombolPratinjau(r.audioUrl, 'Rekaman — ' + r.agenda,
                             'bi-soundwave', 'Putar rekaman rapat');
        if (r.pdfUrl) a += tombolPratinjau(r.pdfUrl, r.nomorDokumen, 'bi-file-earmark-pdf', 'Pratinjau PDF');
        if (Sesi.boleh('tulis') && r.status !== 'TERBIT')
          a += '<button class="btn btn-hantu btn-ikon" title="Ubah" onclick="bukaFormBA(\'' +
               esc(r.kategori) + '\',\'' + r.id + '\')"><i class="bi bi-pencil"></i></button>';
        if (Sesi.boleh('tulis'))
          a += '<button class="btn btn-hantu btn-ikon" title="Unggah scan asli" onclick="bukaUnggahScan(\'beritaAcara\',\'' +
               r.id + '\')"><i class="bi bi-upload"></i></button>';
        if (Sesi.boleh('hapus'))
          a += '<button class="btn btn-hantu btn-ikon" title="Hapus" onclick="hapusData(\'beritaAcara\',\'' +
               r.id + '\')"><i class="bi bi-trash"></i></button>';
        return a;
      }
    }) + '</div>';

  w.innerHTML = h;
}

function bukaFormBA(kategori, id) {
  var rec = id ? (Adm.boot.data.beritaAcara || []).filter(function (r) { return String(r.id) === String(id); })[0] : null;
  rec = rec || {};
  var notulensi = kategori === 'NOTULENSI';
  var adaGemini = !!(Adm.boot.config || {}).GEMINI_API_KEY;

  var isi =
    '<div class="grid-2">' +
    bidangTeks({ id: 'baTanggal', label: 'Tanggal Pelaksanaan', tipe: 'date', wajib: true,
      nilai: tglInput(rec.tanggal) }) +
    bidangTeks({ id: 'baLokasi', label: 'Lokasi / Tempat', nilai: rec.lokasi,
      placeholder: 'Ruang Rapat Utama Lantai 2' }) + '</div>' +

    bidangTeks({ id: 'baAgenda', label: 'Agenda Kegiatan / Rapat', wajib: true, nilai: rec.agenda,
      placeholder: 'Rapat Koordinasi Persiapan Yudisium Semester Ganjil' }) +

    '<div class="grid-2">' +
    bidangTeks({ id: 'baPimpinan', label: 'Pimpinan Rapat', nilai: rec.pimpinanRapat }) +
    bidangTeks({ id: 'baNotulis', label: 'Notulis', nilai: rec.notulis }) + '</div>' +

    bidangArea({ id: 'baPeserta', label: 'Daftar Peserta Hadir', baris: 4, nilai: rec.peserta,
      placeholder: 'Tulis satu nama per baris.',
      bantu: 'Setiap baris menjadi satu butir daftar hadir pada dokumen.' });

  if (notulensi) {
    isi += '<div class="kartu kartu-rapat mb16" style="background:var(--surface-2)">' +
      '<div class="baris antara g12 bungkus mb12">' +
      '<div class="baris g10"><div class="kpi-ikon emas"><i class="bi bi-mic-fill"></i></div>' +
      '<div><div class="tebal tx-md">Perekam Suara Rapat</div>' +
      '<div class="tx-sm tx-3">Rekam langsung dari peramban, simpan ke Drive, lalu transkripsikan.</div></div></div>' +
      '<div class="mono tx-sm" id="baDurasi">00:00</div></div>' +

      '<div class="baris g8 bungkus">' +
      '<button type="button" class="btn btn-navy btn-sm" id="btnRekam" onclick="tukarRekaman()">' +
      '<i class="bi bi-record-circle"></i> Mulai Merekam</button>' +
      '<button type="button" class="btn btn-garis btn-sm" id="btnSimpanAudio" onclick="simpanAudio()" disabled>' +
      '<i class="bi bi-cloud-upload"></i> Simpan ke Drive</button>' +
      '<button type="button" class="btn btn-garis btn-sm" id="btnTranskrip" onclick="transkripAudio()" disabled>' +
      '<i class="bi bi-file-text"></i> Transkripsikan (AI)</button>' +
      '<button type="button" class="btn btn-garis btn-sm" onclick="rapikanTranskrip()">' +
      '<i class="bi bi-stars"></i> Rapikan Jadi Notulensi</button></div>' +

      (adaGemini ? '' : '<div class="baris g8 mt12" style="background:var(--warn-bg);color:var(--warn-fg);' +
        'padding:10px 12px;border-radius:var(--r-md);font-size:12.5px">' +
        '<i class="bi bi-exclamation-triangle"></i><span>API key Gemini belum diisi — transkripsi AI ' +
        'nonaktif. Isi di Pengaturan → Notifikasi &amp; Integrasi.</span></div>') +

      '<audio id="baAudio" controls class="mt12 sembunyi" style="width:100%"></audio>' +
      '<input type="hidden" id="baAudioUrl" value="' + esc(rec.audioUrl || '') + '">' +
      '</div>' +

      bidangArea({ id: 'baTranskrip', label: 'Transkrip Mentah', baris: 5, nilai: rec.transkrip,
        placeholder: 'Hasil transkripsi otomatis akan muncul di sini, atau ketik manual.' });
  }

  isi += '<div class="bidang"><label>' +
    (notulensi ? 'Pokok Pembahasan, Keputusan &amp; Tindak Lanjut' : 'Uraian Kegiatan &amp; Hasil') +
    ' <span class="wajib">*</span></label>' +
    editorNaskah('baRingkasan', rec.ringkasan || '',
      notulensi ? 'Susun pokok pembahasan, keputusan, dan tindak lanjut rapat.'
                : 'Uraikan jalannya kegiatan dan hasil yang dicapai.', 190) + '</div>';

  bukaModal({
    lebar: true,
    kunci: true,
    judul: (id ? 'Ubah ' : 'Buat ') + (notulensi ? 'Notulensi Rapat' : 'Berita Acara'),
    sub: 'Nomor dokumen (' + (notulensi ? 'NOT' : 'BA') + ') dialokasikan saat dokumen diterbitkan.',
    isi: isi,
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-hantu" id="btnDrafBA" onclick="simpanBA(\'' + kategori + '\',\'' +
          (id || '') + '\',false)"><i class="bi bi-save"></i> Simpan Draf</button>' +
          '<button class="btn btn-utama" id="btnTerbitBA" onclick="simpanBA(\'' + kategori + '\',\'' +
          (id || '') + '\',true)"><i class="bi bi-file-earmark-check"></i> Buat Dokumen &amp; Terbitkan</button>'
  });
}

function kumpulkanBA(kategori, id) {
  return {
    id: id || '',
    kategori: kategori,
    tanggal: ambilNilai('baTanggal'),
    lokasi: ambilNilai('baLokasi'),
    agenda: ambilNilai('baAgenda'),
    pimpinanRapat: ambilNilai('baPimpinan'),
    notulis: ambilNilai('baNotulis'),
    peserta: ambilNilai('baPeserta'),
    ringkasan: ambilEditor('baRingkasan'),
    transkrip: el('baTranskrip') ? ambilNilai('baTranskrip') : (undefined),
    audioUrl: el('baAudioUrl') ? ambilNilai('baAudioUrl') : ''
  };
}

function simpanBA(kategori, id, terbit) {
  if (!validasiForm(null, [{ id: 'baTanggal', wajib: true }, { id: 'baAgenda', wajib: true }])) return;
  if (terbit && editorKosong('baRingkasan')) {
    toast('Uraian kegiatan wajib diisi sebelum dokumen diterbitkan.', 'peringatan');
    return;
  }

  var rec = kumpulkanBA(kategori, id);
  var btn = el(terbit ? 'btnTerbitBA' : 'btnDrafBA');
  tombolSibuk(btn, true, terbit ? 'Membuat dokumen…' : 'Menyimpan…');

  var selesai = function (r, pesan) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal(); toast(pesan || r.message, 'sukses');
    upsertLokal('beritaAcara', r.data);
    if (Adm.modulAktif === 'beritaAcara') renderModul('beritaAcara');
    segarkanModul('beritaAcara', true);
  };

  if (!terbit) {
    rec.status = 'DRAF';
    kirim('simpanRecord', { modul: 'beritaAcara', data: rec }).then(function (r) { selesai(r, 'Draf tersimpan.'); });
    return;
  }

  kirim('terbitkanBeritaAcara', {
    record: rec, qrDataUrl: buatQrDataUrl(rec.agenda)
  }, APP.batasWaktuUnggah).then(function (r) { selesai(r); });
}

/* ── Perekam suara ──────────────────────────────────────────────── */
function tukarRekaman() {
  if (Surat.rekam && Surat.rekam.state === 'recording') { hentikanRekaman(); return; }
  mulaiRekaman();
}

function mulaiRekaman() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Peramban ini tidak mendukung perekaman suara.', 'galat');
    return;
  }
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    toast('Perekaman memerlukan koneksi HTTPS. Aktifkan "Enforce HTTPS" pada GitHub Pages.', 'peringatan');
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (aliran) {
    Surat.potongan = [];
    var mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    Surat.rekam = mime ? new MediaRecorder(aliran, { mimeType: mime }) : new MediaRecorder(aliran);

    Surat.rekam.ondataavailable = function (e) { if (e.data.size) Surat.potongan.push(e.data); };
    Surat.rekam.onstop = function () {
      aliran.getTracks().forEach(function (t) { t.stop(); });
      var blob = new Blob(Surat.potongan, { type: Surat.rekam.mimeType || 'audio/webm' });
      Surat.blobAudio = blob;
      var a = el('baAudio');
      if (a) { a.src = URL.createObjectURL(blob); a.classList.remove('sembunyi'); }
      if (el('btnSimpanAudio')) el('btnSimpanAudio').disabled = false;
      if (el('btnTranskrip')) el('btnTranskrip').disabled = false;
      toast('Rekaman selesai (' + formatUkuran(blob.size) + '). Simpan ke Drive atau langsung transkripsikan.', 'sukses');
    };

    Surat.rekam.start();
    Surat.mulaiPada = Date.now();
    Surat.timer = setInterval(function () {
      var d = Math.floor((Date.now() - Surat.mulaiPada) / 1000);
      var t = el('baDurasi');
      if (t) t.textContent = pad2(Math.floor(d / 60)) + ':' + pad2(d % 60);
    }, 500);

    var b = el('btnRekam');
    b.className = 'btn btn-bahaya btn-sm';
    b.innerHTML = '<i class="bi bi-stop-circle"></i> Hentikan Rekaman';
    toast('Perekaman dimulai.', 'info');
  }).catch(function (e) {
    toast('Akses mikrofon ditolak: ' + e.message, 'galat');
  });
}

function hentikanRekaman() {
  if (Surat.rekam && Surat.rekam.state === 'recording') Surat.rekam.stop();
  clearInterval(Surat.timer);
  var b = el('btnRekam');
  if (b) {
    b.className = 'btn btn-navy btn-sm';
    b.innerHTML = '<i class="bi bi-record-circle"></i> Rekam Ulang';
  }
}

function simpanAudio() {
  if (!Surat.blobAudio) { toast('Belum ada rekaman.', 'peringatan'); return; }
  var btn = el('btnSimpanAudio');
  tombolSibuk(btn, true, 'Mengunggah…');

  blobKeBase64(Surat.blobAudio).then(function (b64) {
    return kirim('simpanAudioNotulensi', {
      base64: b64, mime: Surat.blobAudio.type || 'audio/webm',
      nama: 'Rapat_' + tglInput() + '_' + Date.now()
    }, APP.batasWaktuUnggah);
  }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    el('baAudioUrl').value = r.data.url;
    toast('Rekaman tersimpan di Drive (' + r.data.ukuranMb + ' MB).', 'sukses');
  }).catch(function (e) { tombolSibuk(btn, false); toast(e.message, 'galat'); });
}

function transkripAudio() {
  if (!Surat.blobAudio) { toast('Belum ada rekaman untuk ditranskripsikan.', 'peringatan'); return; }
  var btn = el('btnTranskrip');
  tombolSibuk(btn, true, 'Mentranskripsikan…');

  blobKeBase64(Surat.blobAudio).then(function (b64) {
    return kirim('transkripAudioAI', {
      base64: b64, mime: Surat.blobAudio.type || 'audio/webm'
    }, APP.batasWaktuUnggah);
  }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat', 9000); return; }
    el('baTranskrip').value = r.data.hasil;
    toast(r.message + ' Periksa hasil lalu klik "Rapikan Jadi Notulensi".', 'sukses');
  }).catch(function (e) { tombolSibuk(btn, false); toast(e.message, 'galat'); });
}

function rapikanTranskrip() {
  var t = el('baTranskrip') ? ambilNilai('baTranskrip') : '';
  if (!t) { toast('Transkrip masih kosong.', 'peringatan'); return; }

  toast('Merapikan transkrip menjadi notulensi terstruktur…', 'info');
  kirim('rapikanTranskripAI', { transkrip: t }, APP.batasWaktuUnggah).then(function (r) {
    if (!r.success) { toast(r.message, 'galat', 9000); return; }
    el('baRingkasan').innerHTML = r.data.hasil;
    toast('Notulensi terstruktur berhasil dibuat. Silakan periksa dan sunting bila perlu.', 'sukses');
  });
}

function blobKeBase64(blob) {
  return new Promise(function (selesai, gagal) {
    var fr = new FileReader();
    fr.onload = function () {
      var s = String(fr.result);
      selesai(s.substring(s.indexOf(',') + 1));
    };
    fr.onerror = function () { gagal(new Error('Rekaman gagal dibaca.')); };
    fr.readAsDataURL(blob);
  });
}
