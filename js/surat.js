/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/surat.js
   Generator Surat Keluar, Surat Keputusan, Berita Acara & Notulensi.
   ═══════════════════════════════════════════════════════════════════ */

var Surat = { rekam: null, potongan: [], transkripLangsung: '' };

/* ══════════════════════════════════════════════════════════════════
   SURAT KELUAR
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

  var terbit = (Adm.boot.data.suratKeluar || []).filter(function (r) { return r.status === 'TERBIT'; }).length;
  var draf = (Adm.boot.data.suratKeluar || []).filter(function (r) { return r.status === 'DRAF'; }).length;

  var h = kepalaHalaman({
    remah: ['Arsip & Persuratan', 'Surat Keluar', 'Generator Persuratan Resmi'],
    judul: 'Generator & Registrasi Surat Keluar',
    sub: 'Terbitkan surat dinas dari template Google Docs dengan penomoran terkunci, tanda tangan elektronik, dan QR validasi.',
    aksi: (Sesi.boleh('tulis')
      ? '<button class="btn btn-utama" onclick="bukaGeneratorSurat()">' +
        '<i class="bi bi-file-earmark-plus"></i> Buat Surat Baru</button>' : '') +
      '<button class="btn btn-garis" onclick="bukaPanelTemplate()">' +
      '<i class="bi bi-file-earmark-richtext"></i> Panel Template Docs</button>'
  });

  h += '<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">' +
    kartuKpi('Surat Terbit', terbit, 'Dokumen', 'bi-patch-check', 'hijau', '') +
    kartuKpi('Tersimpan sebagai Draf', draf, 'Konsep', 'bi-file-earmark', 'abu',
             '<span class="tx-3">Draf belum memakai nomor surat</span>') +
    kartuKpi('Total Register', (Adm.boot.data.suratKeluar || []).length, 'Baris', 'bi-journals', 'biru', '') +
    '</div>';

  h += '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" value="' + esc(cari) + '" placeholder="Cari nomor surat, perihal, atau tujuan…" ' +
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
      aksi: function (r) {
        var a = '<button class="btn btn-hantu btn-ikon" title="Detail" onclick="lihatDetail(\'suratKeluar\',\'' +
                r.id + '\')"><i class="bi bi-eye"></i></button>';
        if (r.pdfUrl) a += tombolPratinjau(r.pdfUrl, r.nomorSurat, 'bi-file-earmark-pdf', 'Pratinjau PDF');
        if (Sesi.boleh('tulis') && r.status === 'DRAF') {
          a += '<button class="btn btn-hantu btn-ikon" title="Lanjutkan draf" onclick="bukaGeneratorSurat(\'' +
               r.id + '\')"><i class="bi bi-pencil"></i></button>';
        }
        if (Sesi.boleh('tulis')) {
          a += '<button class="btn btn-hantu btn-ikon" title="Unggah scan asli" onclick="bukaUnggahScan(\'suratKeluar\',\'' +
               r.id + '\')"><i class="bi bi-upload"></i></button>';
        }
        if (Sesi.boleh('tulis') && r.status === 'TERBIT') {
          a += '<button class="btn btn-hantu btn-ikon" title="Tarik kembali" onclick="tarikDokumen(\'suratKeluar\',\'' +
               r.id + '\')"><i class="bi bi-arrow-counterclockwise"></i></button>';
        }
        if (Sesi.boleh('hapus')) {
          a += '<button class="btn btn-hantu btn-ikon" title="Hapus" onclick="hapusData(\'suratKeluar\',\'' +
               r.id + '\')"><i class="bi bi-trash"></i></button>';
        }
        return a;
      }
    }) + '</div>';

  w.innerHTML = h;
}

/* ── Formulir generator ─────────────────────────────────────────── */
function bukaGeneratorSurat(id) {
  var rec = id ? (Adm.boot.data.suratKeluar || []).filter(function (r) { return String(r.id) === String(id); })[0] : null;
  rec = rec || { tteAktif: 'true' };

  var jenis = (Adm.boot.master.jenisSurat || []).filter(function (j) {
    return j.modul === 'suratKeluar' && String(j.aktif) === 'true';
  });
  var pejabat = (Adm.boot.master.pejabat || []).filter(function (p) { return String(p.aktif) === 'true'; });

  var isi =
    '<div class="pratinjau-nomor mb16">' +
    '<div class="pn-label"><span>Nomor Registrasi Surat</span>' +
    '<span class="lencana emas"><i class="bi bi-lightning-charge"></i> Otomatis</span></div>' +
    '<div class="pn-nilai" id="pnNomor">— pilih jenis surat —</div>' +
    '<div class="pn-ket" id="pnKet">Nomor baru dikunci hanya saat dokumen diterbitkan</div></div>' +

    '<div class="grid-2">' +
    bidangPilih({ id: 'skJenis', label: 'Jenis Surat Kedinasan', wajib: true, nilai: rec.kodeJenis,
      opsi: jenis.map(function (j) { return { v: j.kode, t: j.nama + ' (' + j.kode + ')' }; }) }) +
    bidangTeks({ id: 'skTanggal', label: 'Tanggal Surat Diterbitkan', tipe: 'date',
      nilai: tglInput(rec.tanggalSurat) }) + '</div>' +

    bidangTeks({ id: 'skPerihal', label: 'Perihal / Hal Surat', wajib: true, maks: 120,
      nilai: rec.perihal, placeholder: 'Penugasan Dosen Pembimbing Lapangan KKN Tematik' }) +

    '<div class="grid-2">' +
    bidangTeks({ id: 'skTujuan', label: 'Ditujukan Kepada', nilai: rec.tujuan,
      placeholder: 'Yth. Kepala Bagian Akademik' }) +
    bidangTeks({ id: 'skLampiran', label: 'Keterangan Lampiran', nilai: rec.lampiran || '-',
      placeholder: '1 (satu) berkas' }) + '</div>' +

    '<div class="bidang"><label>Naskah Surat <span class="wajib">*</span></label>' +
    editorNaskah('skNaskah', rec.isiNaskah || '',
      'Ketik isi surat di sini. Gunakan tombol di atas untuk cetak tebal, daftar bernomor, atau tabel.') +
    '<div class="bantu">Naskah dikonversi otomatis menjadi paragraf, daftar, dan tabel pada dokumen Google Docs.</div>' +
    '</div>' +

    bidangPilih({ id: 'skPejabat', label: 'Otoritas Pejabat Penandatangan', wajib: true, nilai: rec.pejabatId,
      opsi: pejabat.map(function (p) {
        return { v: p.id, t: p.nama + (p.gelar ? ', ' + p.gelar : '') + ' — ' + p.jabatan };
      }) }) +

    '<div class="kartu kartu-rapat" style="background:var(--navy-dark);border:none;color:#fff">' +
    '<div class="baris antara g12"><div class="sisa">' +
    '<div class="tebal tx-md" style="color:#fff">Gunakan Tanda Tangan Elektronik (TTE) &amp; Segel Digital</div>' +
    '<div class="tx-sm mt4" style="color:rgba(255,255,255,.6);line-height:1.6">Sistem menyematkan spesimen paraf ' +
    'resmi dari Master Pejabat, disertai QR verifikasi kriptografis pada lembar PDF.</div></div>' +
    '<label class="saklar"><input type="checkbox" id="skTte"' +
    (String(rec.tteAktif) !== 'false' ? ' checked' : '') + '><span class="track"></span></label>' +
    '</div></div>' +

    '<div id="skInfoTemplate" class="mt16"></div>';

  bukaModal({
    lebar: true,
    judul: id ? 'Lanjutkan Draf Surat Keluar' : 'Generator Surat Keluar',
    sub: 'Nomor surat baru dialokasikan hanya saat tombol "Terbitkan Dokumen Resmi" ditekan.',
    isi: isi,
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-hantu" id="btnDrafSurat" onclick="simpanDrafSurat(\'' + (id || '') + '\')">' +
          '<i class="bi bi-save"></i> Simpan Draf</button>' +
          '<button class="btn btn-navy" id="btnPratinjauSurat" onclick="pratinjauSurat()">' +
          '<i class="bi bi-eye"></i> Pratinjau PDF</button>' +
          '<button class="btn btn-utama" id="btnTerbitSurat" onclick="terbitkanSurat(\'' + (id || '') + '\')">' +
          '<i class="bi bi-file-earmark-check"></i> Terbitkan Dokumen Resmi</button>',
    setelah: function () {
      var s = el('skJenis');
      s.addEventListener('change', muatPratinjauNomor);
      if (s.value) muatPratinjauNomor();
    }
  });
}

function muatPratinjauNomor() {
  var kode = ambilNilai('skJenis') || ambilNilai('sk2Jenis');
  if (!kode) return;
  var target = el('pnNomor') ? 'pn' : 'pn2';
  el(target + 'Nomor').textContent = 'memuat…';

  ambil('previewNomor', { kodeJenis: kode }).then(function (r) {
    if (!r.success) { el(target + 'Nomor').textContent = '— ' + r.message; return; }
    el(target + 'Nomor').textContent = r.data.nomor;
    el(target + 'Ket').textContent = 'Terakhir digunakan: ' + r.data.terakhir + ' · format: ' + r.data.format;

    var info = el('skInfoTemplate');
    if (info) {
      var tpl = (Adm.boot.master.templateDoc || []).filter(function (t) { return t.kodeJenis === kode; })[0];
      info.innerHTML = tpl
        ? '<div class="baris g10 bungkus" style="align-items:flex-start;background:var(--info-bg);' +
          'color:var(--info-fg);padding:12px 14px;border-radius:var(--r-lg)">' +
          '<i class="bi bi-file-earmark-richtext" style="margin-top:2px"></i>' +
          '<div class="sisa tx-sm" style="line-height:1.6"><b>' + esc(tpl.namaTemplate) + '</b><br>' +
          'Placeholder tersedia: <span class="mono" style="font-size:10.5px">' +
          esc(potong(tpl.placeholder, 190)) + '</span></div>' +
          '<a class="btn btn-garis btn-sm" href="' + esc(tpl.docUrl) + '" target="_blank" rel="noopener">' +
          '<i class="bi bi-pencil-square"></i> Edit di Google Docs</a></div>'
        : '<div class="baris g10" style="background:var(--warn-bg);color:var(--warn-fg);padding:12px 14px;' +
          'border-radius:var(--r-lg)"><i class="bi bi-exclamation-triangle"></i>' +
          '<div class="sisa tx-sm">Template Google Docs untuk jenis ini belum tersedia. Buka ' +
          '<b>Panel Template Docs</b> lalu klik "Buat Template yang Belum Ada".</div></div>';
    }
  });
}

function kumpulkanSurat(id) {
  return {
    id: id || '',
    kodeJenis: ambilNilai('skJenis'),
    tanggalSurat: ambilNilai('skTanggal'),
    perihal: ambilNilai('skPerihal'),
    tujuan: ambilNilai('skTujuan'),
    lampiran: ambilNilai('skLampiran'),
    isiNaskah: ambilEditor('skNaskah'),
    pejabatId: ambilNilai('skPejabat'),
    tteAktif: el('skTte').checked ? 'true' : 'false'
  };
}

function validasiSurat() {
  if (!validasiForm(null, [
    { id: 'skJenis', wajib: true },
    { id: 'skPerihal', wajib: true },
    { id: 'skPejabat', wajib: true }
  ])) return false;
  if (editorKosong('skNaskah')) {
    toast('Naskah surat belum diisi.', 'peringatan');
    el('skNaskah').focus();
    return false;
  }
  return true;
}

function simpanDrafSurat(id) {
  if (!validasiForm(null, [{ id: 'skJenis', wajib: true }, { id: 'skPerihal', wajib: true }])) return;
  var btn = el('btnDrafSurat');
  var rec = kumpulkanSurat(id);
  rec.status = 'DRAF';

  tombolSibuk(btn, true, 'Menyimpan…');
  kirim('simpanRecord', { modul: 'suratKeluar', data: rec }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal();
    toast('Draf tersimpan tanpa memakai nomor surat.', 'sukses');
    segarkanModul('suratKeluar');
  });
}

function pratinjauSurat() {
  if (!validasiSurat()) return;
  var btn = el('btnPratinjauSurat');
  var rec = kumpulkanSurat('');

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

function terbitkanSurat(id) {
  if (!validasiSurat()) return;
  var rec = kumpulkanSurat(id);

  konfirmasi({
    judul: 'Terbitkan Dokumen Resmi',
    pesan: 'Nomor surat akan <b>dikunci permanen</b> pada register dan tidak dapat dipakai ulang. ' +
           'Dokumen PDF dibuat dari template Google Docs lalu diarsipkan ke Drive.',
    ya: 'Ya, Terbitkan Sekarang'
  }).then(function (ya) {
    if (!ya) return;
    var btn = el('btnTerbitSurat');
    tombolSibuk(btn, true, 'Menerbitkan…');

    kirim('terbitkanSuratKeluar', {
      record: rec, qrDataUrl: buatQrDataUrl(rec.perihal)
    }, APP.batasWaktuUnggah).then(function (r) {
      tombolSibuk(btn, false);
      if (!r.success) { toast(r.message, 'galat'); return; }
      tutupModal();
      toast(r.message, 'sukses');
      segarkanModul('suratKeluar').then(function () {
        if (r.data.pdfUrl) {
          bukaModal({
            sempit: true, judul: 'Dokumen Berhasil Diterbitkan',
            isi: '<div class="tgh"><div class="kpi-ikon hijau" style="width:52px;height:52px;font-size:24px;' +
              'margin:0 auto 14px"><i class="bi bi-patch-check-fill"></i></div>' +
              '<div class="mb12">' + chipNomor(r.data.nomorSurat) + '</div>' +
              '<div class="tx-md tx-2">' + esc(r.data.perihal) + '</div></div>',
            kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' +
                  '<button class="btn btn-utama" onclick="pratinjauBerkas(\'' + esc(r.data.pdfUrl) +
                  '\',\'' + esc(String(r.data.nomorSurat).replace(/'/g, '')) + '\')">' +
                  '<i class="bi bi-file-earmark-pdf"></i> Lihat PDF Resmi</button>',
            tanpaFokus: true
          });
        }
      });
    });
  });
}

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
    segarkanModul(modul);
  });
}

/* ── Panel template Google Docs ─────────────────────────────────── */
function bukaPanelTemplate() {
  var tpl = Adm.boot.master.templateDoc || [];
  var jenis = Adm.boot.master.jenisSurat || [];

  var isi = '<div class="baris g10 mb16" style="align-items:flex-start;background:var(--info-bg);' +
    'color:var(--info-fg);padding:13px 15px;border-radius:var(--r-lg)">' +
    '<i class="bi bi-info-circle-fill" style="margin-top:2px"></i>' +
    '<div class="sisa tx-sm" style="line-height:1.65">Kop surat berupa <b>gambar</b> yang Anda sisipkan ' +
    'sendiri di Google Docs — bukan dihasilkan sistem. Buka template, ganti baris kop dengan gambar kop ' +
    'resmi Anda, lalu simpan. Perubahan langsung berlaku pada penerbitan berikutnya.</div></div>';

  isi += '<div class="tabel-bungkus"><table class="data"><thead><tr>' +
    '<th>Jenis Surat</th><th>Template</th><th>Diperbarui</th><th style="text-align:right">Aksi</th>' +
    '</tr></thead><tbody>';

  jenis.forEach(function (j) {
    var t = tpl.filter(function (x) { return x.kodeJenis === j.kode; })[0];
    isi += '<tr><td><div class="t-judul">' + esc(j.nama) + '</div>' +
      '<div class="t-sub mono">' + esc(j.kode) + '</div></td>' +
      '<td>' + (t ? '<span class="lencana ok"><i class="bi bi-check-circle"></i> Tersedia</span>'
                  : '<span class="lencana warn"><i class="bi bi-dash-circle"></i> Belum dibuat</span>') + '</td>' +
      '<td class="tx-sm tx-3">' + (t ? tgl(t.diperbarui) : '—') + '</td>' +
      '<td><div class="aksi">' +
      (t ? '<a class="btn btn-hantu btn-ikon" title="Edit di Google Docs" target="_blank" rel="noopener" href="' +
           esc(t.docUrl) + '"><i class="bi bi-box-arrow-up-right"></i></a>' : '') +
      (Sesi.boleh('master') && t ? '<button class="btn btn-hantu btn-ikon" title="Buat ulang template" ' +
           'onclick="buatUlangTemplate(\'' + esc(j.kode) + '\')"><i class="bi bi-arrow-repeat"></i></button>' : '') +
      (Sesi.boleh('master') ? '<button class="btn btn-hantu btn-ikon" title="Hubungkan Doc sendiri" ' +
           'onclick="hubungkanDoc(\'' + esc(j.kode) + '\')"><i class="bi bi-link-45deg"></i></button>' : '') +
      '</div></td></tr>';
  });

  isi += '</tbody></table></div>';

  bukaModal({
    lebar: true,
    judul: 'Panel Template Google Docs',
    sub: 'Kelola sembilan template starter yang dipakai mesin penerbitan dokumen.',
    isi: isi,
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' +
          (Sesi.boleh('tulis') ? '<button class="btn btn-utama" id="btnSiapkanTpl" onclick="siapkanTemplate()">' +
            '<i class="bi bi-magic"></i> Buat Template yang Belum Ada</button>' : '')
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
      tutupModal();
      bukaPanelTemplate();
    });
  });
}

function buatUlangTemplate(kode) {
  konfirmasi({
    judul: 'Buat Ulang Template',
    pesan: 'Template baru akan dibuat dari starter bawaan dan menggantikan tautan lama. ' +
           'Dokumen lama tidak dihapus dari Drive, tetapi tidak lagi dipakai sistem.',
    ya: 'Ya, Buat Ulang'
  }).then(function (ya) {
    if (!ya) return;
    kirim('buatUlangTemplateDoc', { kodeJenis: kode }, APP.batasWaktuUnggah).then(function (r) {
      if (!r.success) { toast(r.message, 'galat'); return; }
      toast(r.message, 'sukses');
      kirim('refreshModul', { modul: 'templateDoc' }).then(function (r2) {
        if (r2.success) Adm.boot.master.templateDoc = r2.data;
        tutupModal(); bukaPanelTemplate();
      });
    });
  });
}

function hubungkanDoc(kode) {
  bukaModal({
    sempit: true,
    judul: 'Hubungkan Google Docs Sendiri',
    sub: 'Gunakan dokumen milik Anda sebagai template untuk jenis surat ' + kode + '.',
    isi: bidangTeks({ id: 'tplUrl', label: 'URL Google Docs', wajib: true,
      placeholder: 'https://docs.google.com/document/d/…/edit',
      bantu: 'Pastikan akun pemilik skrip memiliki akses <b>Editor</b> pada dokumen tersebut, dan ' +
             'dokumen sudah memuat placeholder seperti {{NOMOR}}, {{ISI}}, {{TTE}}, dan {{QR}}.' }),
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnHubungkan" onclick="prosesHubungkanDoc(\'' + kode + '\')">' +
          '<i class="bi bi-link-45deg"></i> Hubungkan</button>'
  });
}

function prosesHubungkanDoc(kode) {
  var url = ambilNilai('tplUrl');
  if (!url) { tandaiGalat(el('tplUrl'), 'URL wajib diisi.'); return; }
  var btn = el('btnHubungkan');
  tombolSibuk(btn, true);
  kirim('hubungkanTemplateDoc', { kodeJenis: kode, docUrl: url }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    toast(r.message, 'sukses');
    kirim('refreshModul', { modul: 'templateDoc' }).then(function (r2) {
      if (r2.success) Adm.boot.master.templateDoc = r2.data;
      tutupModal(); bukaPanelTemplate();
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   SURAT KEPUTUSAN (SK)
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
    sub: 'Penerbitan SK Kebijakan, Pengangkatan, dan Dispensasi dengan struktur Menimbang – Mengingat – Menetapkan.',
    aksi: Sesi.boleh('tulis') ? '<button class="btn btn-utama" onclick="bukaGeneratorSK()">' +
      '<i class="bi bi-file-earmark-plus"></i> Buat SK Baru</button>' : ''
  });

  h += '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" value="' + esc(cari) + '" placeholder="Cari nomor SK atau judul…" ' +
    'oninput="cariModul(\'sk\',this.value)"></div><div class="sisa"></div>' +
    '<button class="btn btn-garis btn-sm" onclick="eksporModul(\'sk\')">' +
    '<i class="bi bi-filetype-csv"></i> Ekspor</button></div>' +

    bangunTabel({
      data: data, kolom: KOLOM_MODUL.sk, idTabel: 'sk', halaman: Adm.halaman.sk || 1,
      judulKosong: 'Belum ada Surat Keputusan',
      deskKosong: 'SK yang diterbitkan akan tercatat di sini beserta PDF resminya.',
      ikonKosong: 'bi-file-earmark-ruled',
      aksi: function (r) {
        var a = '<button class="btn btn-hantu btn-ikon" title="Detail" onclick="lihatDetail(\'sk\',\'' +
                r.id + '\')"><i class="bi bi-eye"></i></button>';
        if (r.pdfUrl) a += tombolPratinjau(r.pdfUrl, r.nomorSK, 'bi-file-earmark-pdf', 'Pratinjau PDF');
        if (Sesi.boleh('tulis') && r.status === 'DRAF')
          a += '<button class="btn btn-hantu btn-ikon" title="Lanjutkan draf" onclick="bukaGeneratorSK(\'' +
               r.id + '\')"><i class="bi bi-pencil"></i></button>';
        if (Sesi.boleh('tulis'))
          a += '<button class="btn btn-hantu btn-ikon" title="Unggah scan asli" onclick="bukaUnggahScan(\'sk\',\'' +
               r.id + '\')"><i class="bi bi-upload"></i></button>';
        if (Sesi.boleh('tulis') && r.status === 'TERBIT')
          a += '<button class="btn btn-hantu btn-ikon" title="Tarik kembali" onclick="tarikDokumen(\'sk\',\'' +
               r.id + '\')"><i class="bi bi-arrow-counterclockwise"></i></button>';
        if (Sesi.boleh('hapus'))
          a += '<button class="btn btn-hantu btn-ikon" title="Hapus" onclick="hapusData(\'sk\',\'' +
               r.id + '\')"><i class="bi bi-trash"></i></button>';
        return a;
      }
    }) + '</div>';

  w.innerHTML = h;
}

function bukaGeneratorSK(id) {
  var rec = id ? (Adm.boot.data.sk || []).filter(function (r) { return String(r.id) === String(id); })[0] : null;
  rec = rec || { tteAktif: 'true' };

  var jenis = (Adm.boot.master.jenisSurat || []).filter(function (j) {
    return j.modul === 'sk' && String(j.aktif) === 'true';
  });
  var pejabat = (Adm.boot.master.pejabat || []).filter(function (p) { return String(p.aktif) === 'true'; });

  var isi =
    '<div class="pratinjau-nomor mb16">' +
    '<div class="pn-label"><span>Nomor Surat Keputusan</span>' +
    '<span class="lencana emas"><i class="bi bi-lightning-charge"></i> Otomatis</span></div>' +
    '<div class="pn-nilai" id="pn2Nomor">— pilih jenis SK —</div>' +
    '<div class="pn-ket" id="pn2Ket">Nomor dikunci saat SK diterbitkan</div></div>' +

    '<div class="grid-2">' +
    bidangPilih({ id: 'sk2Jenis', label: 'Jenis Surat Keputusan', wajib: true, nilai: rec.kodeJenis,
      opsi: jenis.map(function (j) { return { v: j.kode, t: j.nama + ' (' + j.kode + ')' }; }) }) +
    bidangTeks({ id: 'sk2Tanggal', label: 'Tanggal Penetapan', tipe: 'date', nilai: tglInput(rec.tanggalSK) }) +
    '</div>' +

    bidangArea({ id: 'sk2Tentang', label: 'Tentang (Judul Keputusan)', wajib: true, baris: 2,
      nilai: rec.tentang, placeholder: 'Pengangkatan Dosen Pembimbing Akademik Mahasiswa Baru TA 2026/2027' }) +

    '<div class="bidang"><label>Menimbang</label>' +
    editorNaskah('sk2Menimbang', rec.menimbang || '',
      'a. bahwa dalam rangka … ; b. bahwa berdasarkan pertimbangan sebagaimana dimaksud …', 140) + '</div>' +

    '<div class="bidang"><label>Mengingat</label>' +
    editorNaskah('sk2Mengingat', rec.mengingat || '',
      '1. Undang-Undang Nomor 12 Tahun 2012 tentang Pendidikan Tinggi; 2. Statuta …', 140) + '</div>' +

    '<div class="bidang"><label>Menetapkan <span class="wajib">*</span></label>' +
    editorNaskah('sk2Menetapkan', rec.menetapkan || '',
      'KESATU : … ; KEDUA : … ; KETIGA : Keputusan ini berlaku sejak tanggal ditetapkan.', 170) + '</div>' +

    bidangPilih({ id: 'sk2Pejabat', label: 'Pejabat Penetap', wajib: true, nilai: rec.pejabatId,
      opsi: pejabat.map(function (p) {
        return { v: p.id, t: p.nama + (p.gelar ? ', ' + p.gelar : '') + ' — ' + p.jabatan };
      }) }) +

    '<div class="kartu kartu-rapat" style="background:var(--navy-dark);border:none;color:#fff">' +
    '<div class="baris antara g12"><div class="sisa">' +
    '<div class="tebal tx-md" style="color:#fff">Tanda Tangan Elektronik &amp; QR Validasi</div>' +
    '<div class="tx-sm mt4" style="color:rgba(255,255,255,.6)">Spesimen paraf pejabat disematkan otomatis ' +
    'pada lembar penetapan.</div></div>' +
    '<label class="saklar"><input type="checkbox" id="sk2Tte"' +
    (String(rec.tteAktif) !== 'false' ? ' checked' : '') + '><span class="track"></span></label></div></div>';

  bukaModal({
    lebar: true,
    judul: id ? 'Lanjutkan Draf SK' : 'Generator Surat Keputusan',
    sub: 'Struktur baku: Menimbang → Mengingat → Memutuskan → Menetapkan.',
    isi: isi,
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-hantu" id="btnDrafSK" onclick="simpanDrafSK(\'' + (id || '') + '\')">' +
          '<i class="bi bi-save"></i> Simpan Draf</button>' +
          '<button class="btn btn-utama" id="btnTerbitSK" onclick="terbitkanSKKlien(\'' + (id || '') + '\')">' +
          '<i class="bi bi-file-earmark-check"></i> Terbitkan SK</button>',
    setelah: function () {
      var s = el('sk2Jenis');
      s.addEventListener('change', muatPratinjauNomor);
      if (s.value) muatPratinjauNomor();
    }
  });
}

function kumpulkanSK(id) {
  return {
    id: id || '',
    kodeJenis: ambilNilai('sk2Jenis'),
    tanggalSK: ambilNilai('sk2Tanggal'),
    tentang: ambilNilai('sk2Tentang'),
    menimbang: ambilEditor('sk2Menimbang'),
    mengingat: ambilEditor('sk2Mengingat'),
    menetapkan: ambilEditor('sk2Menetapkan'),
    pejabatId: ambilNilai('sk2Pejabat'),
    tteAktif: el('sk2Tte').checked ? 'true' : 'false'
  };
}

function simpanDrafSK(id) {
  if (!validasiForm(null, [{ id: 'sk2Jenis', wajib: true }, { id: 'sk2Tentang', wajib: true }])) return;
  var btn = el('btnDrafSK');
  var rec = kumpulkanSK(id);
  rec.status = 'DRAF';
  tombolSibuk(btn, true, 'Menyimpan…');
  kirim('simpanRecord', { modul: 'sk', data: rec }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal(); toast('Draf SK tersimpan.', 'sukses'); segarkanModul('sk');
  });
}

function terbitkanSKKlien(id) {
  if (!validasiForm(null, [
    { id: 'sk2Jenis', wajib: true }, { id: 'sk2Tentang', wajib: true }, { id: 'sk2Pejabat', wajib: true }
  ])) return;
  if (editorKosong('sk2Menetapkan')) {
    toast('Bagian "Menetapkan" wajib diisi.', 'peringatan');
    el('sk2Menetapkan').focus();
    return;
  }
  var rec = kumpulkanSK(id);

  konfirmasi({
    judul: 'Terbitkan Surat Keputusan',
    pesan: 'Nomor SK akan dikunci permanen dan dokumen PDF diarsipkan ke Google Drive.',
    ya: 'Ya, Terbitkan SK'
  }).then(function (ya) {
    if (!ya) return;
    var btn = el('btnTerbitSK');
    tombolSibuk(btn, true, 'Menerbitkan…');
    kirim('terbitkanSK', { record: rec, qrDataUrl: buatQrDataUrl(rec.tentang) }, APP.batasWaktuUnggah)
      .then(function (r) {
        tombolSibuk(btn, false);
        if (!r.success) { toast(r.message, 'galat'); return; }
        tutupModal(); toast(r.message, 'sukses'); segarkanModul('sk');
      });
  });
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
    '<input type="search" value="' + esc(cari) + '" placeholder="Cari agenda atau nomor dokumen…" ' +
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

  /* Perekam suara — khusus notulensi */
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

  if (!terbit) {
    rec.status = 'DRAF';
    kirim('simpanRecord', { modul: 'beritaAcara', data: rec }).then(function (r) {
      tombolSibuk(btn, false);
      if (!r.success) { toast(r.message, 'galat'); return; }
      tutupModal(); toast('Draf tersimpan.', 'sukses'); segarkanModul('beritaAcara');
    });
    return;
  }

  kirim('terbitkanBeritaAcara', {
    record: rec, qrDataUrl: buatQrDataUrl(rec.agenda)
  }, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal();
    toast(r.message, 'sukses');
    segarkanModul('beritaAcara');
  });
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
      a.src = URL.createObjectURL(blob);
      a.classList.remove('sembunyi');
      el('btnSimpanAudio').disabled = false;
      el('btnTranskrip').disabled = false;
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
    if (!r.success) { toast(r.message, 'galat'); return; }
    el('baTranskrip').value = r.data.hasil;
    toast('Transkripsi selesai. Periksa hasil lalu klik "Rapikan Jadi Notulensi".', 'sukses');
  }).catch(function (e) { tombolSibuk(btn, false); toast(e.message, 'galat'); });
}

function rapikanTranskrip() {
  var t = el('baTranskrip') ? ambilNilai('baTranskrip') : '';
  if (!t) { toast('Transkrip masih kosong.', 'peringatan'); return; }

  toast('Merapikan transkrip menjadi notulensi terstruktur…', 'info');
  kirim('rapikanTranskripAI', { transkrip: t }, APP.batasWaktuUnggah).then(function (r) {
    if (!r.success) { toast(r.message, 'galat'); return; }
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
