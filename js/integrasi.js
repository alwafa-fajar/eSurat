/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/integrasi.js  (v4.4 · berkas BARU)
   Tab Pengaturan tambahan:
   · "TTE Resmi (PSrE)"  — konfigurasi API penyedia tanda tangan elektronik
     tersertifikasi (seperti konfigurasi WA Fonnte & Gemini): URL, autentikasi,
     endpoint, templat badan permintaan, jalur respons; uji koneksi; cek akun
     tiap pejabat; sinkron dokumen yang menunggu tanda tangan.
   · "Migrasi Data" — impor dari spreadsheet e-SURAT lama / lain:
     pindai → petakan kolom (otomatis dari nama header, bisa diubah) →
     uji (dry-run) → impor. Aman diulang, sumber hanya dibaca.
   ═══════════════════════════════════════════════════════════════════ */

daftarTabPengaturan({ k: 'tteResmi', n: 'TTE Resmi (PSrE)', i: 'bi-shield-check' }, 'notifikasi');
daftarTabPengaturan({ k: 'migrasi', n: 'Migrasi Data', i: 'bi-database-up' }, 'log');
TAB_TAMBAHAN.tteResmi = tabTteResmi;
TAB_TAMBAHAN.migrasi = tabMigrasi;

/* ══════════════════════════════════════════════════════════════════
   TTE RESMI
   ══════════════════════════════════════════════════════════════════ */
var KUNCI_TTE = ['TTE_AKTIF', 'TTE_PENYEDIA', 'TTE_MODE', 'TTE_BASE_URL', 'TTE_AUTH_TIPE', 'TTE_AUTH_HEADER', 'TTE_API_KEY',
  'TTE_CLIENT_ID', 'TTE_CLIENT_SECRET', 'TTE_TOKEN_URL', 'TTE_EP_CEK', 'TTE_EP_TANDATANGAN', 'TTE_EP_STATUS', 'TTE_EP_UNDUH',
  'TTE_BODY_TEMPLATE', 'TTE_PATH_ID', 'TTE_PATH_STATUS', 'TTE_PATH_PDF', 'TTE_PATH_URL', 'TTE_NILAI_SELESAI', 'TTE_POSISI'];

var TTE_BODY_CONTOH = JSON.stringify({
  signer_id: '{ID_PENGGUNA}', email: '{EMAIL}',
  document: { name: '{NAMA_FILE}', content_base64: '{PDF_BASE64}' },
  reference: '{NOMOR}', reason: '{PERIHAL}', location: '{KOTA}',
  visual: { page: '{HALAMAN}', x: '{X}', y: '{Y}', width: '{LEBAR}', height: '{TINGGI}' }
}, null, 2);

function tabTteResmi(w) {
  var c = Adm.boot.config || {};
  var pejabat = Adm.boot.master.pejabat || [];
  var tipe = c.TTE_AUTH_TIPE || 'bearer';
  w.innerHTML =
    '<div class="kartu mb20"><div class="kartu-kepala"><div><h3><i class="bi bi-shield-check"></i> TTE Resmi Pihak Ketiga (PSrE)</h3>' +
    '<div class="kartu-sub">Hubungkan e-SURAT ke penyedia Tanda Tangan Elektronik tersertifikasi melalui REST API. Setiap pejabat memakai ' +
    'akun/sertifikat resminya sendiri. Saat terbit, PDF dikirim ke penyedia → ditandatangani → PDF bertanda tangan disimpan otomatis.</div></div></div>' +
    bidangSaklar({ id: 'tteAktif', label: 'Aktifkan TTE Resmi', desk: 'Opsi "TTE Resmi" muncul di generator Surat Keluar & SK untuk pejabat yang memiliki akun.',
      nilai: String(c.TTE_AKTIF) === 'true' }) +
    '<div class="grid-2">' +
    bidangTeks({ id: 'ttePenyedia', label: 'Nama Penyedia (label)', nilai: c.TTE_PENYEDIA, placeholder: 'mis. nama PSrE berinduk Kominfo/Komdigi' }) +
    bidangPilih({ id: 'tteMode', label: 'Mode', nilai: c.TTE_MODE || 'sandbox',
      opsi: [{ v: 'simulasi', t: 'Simulasi — uji alur tanpa memanggil penyedia' }, { v: 'sandbox', t: 'Sandbox penyedia' }, { v: 'produksi', t: 'Produksi' }] }) +
    '</div>' +
    bidangTeks({ id: 'tteBase', label: 'URL Dasar API (https://…)', nilai: c.TTE_BASE_URL, placeholder: 'https://api.penyedia-tte.id' }) +
    '<div class="label-kecil mb8 mt8">Autentikasi</div><div class="grid-2">' +
    bidangPilih({ id: 'tteAuth', label: 'Tipe', nilai: tipe,
      opsi: [{ v: 'bearer', t: 'Bearer token (Authorization: Bearer …)' }, { v: 'header', t: 'API key di header kustom' },
             { v: 'basic', t: 'Basic (client id : secret)' }, { v: 'oauth2', t: 'OAuth2 client credentials' }] }) +
    bidangTeks({ id: 'tteHeader', label: 'Nama header API key', nilai: c.TTE_AUTH_HEADER || 'Authorization', bantu: 'Hanya untuk tipe "header", mis. X-API-Key.' }) +
    '</div><div class="grid-2">' +
    bidangTeks({ id: 'tteKey', label: 'API key / token', tipe: 'password', nilai: c.TTE_API_KEY, otomatis: 'new-password',
      bantu: 'Disimpan di server, tidak pernah dikirim ke peramban. Biarkan bertanda •••• bila tidak diubah.' }) +
    bidangTeks({ id: 'tteTokenUrl', label: 'URL token OAuth2', nilai: c.TTE_TOKEN_URL, placeholder: 'https://…/oauth/token' }) +
    '</div><div class="grid-2">' +
    bidangTeks({ id: 'tteCid', label: 'Client ID', nilai: c.TTE_CLIENT_ID }) +
    bidangTeks({ id: 'tteSecret', label: 'Client secret', tipe: 'password', nilai: c.TTE_CLIENT_SECRET, otomatis: 'new-password' }) +
    '</div>' +
    '<details class="mt8"><summary class="tebal" style="cursor:pointer">Endpoint, templat permintaan &amp; jalur respons (lanjutan)</summary><div class="mt12">' +
    '<div class="grid-2">' +
    bidangTeks({ id: 'tteEpCek', label: 'Cek akun penanda tangan (GET)', nilai: c.TTE_EP_CEK || '/v1/users/{ID}', bantu: '{ID} = ID pengguna, {EMAIL} = surel akun.' }) +
    bidangTeks({ id: 'tteEpTtd', label: 'Ajukan tanda tangan (POST)', nilai: c.TTE_EP_TANDATANGAN || '/v1/sign' }) + '</div><div class="grid-2">' +
    bidangTeks({ id: 'tteEpStatus', label: 'Status permintaan (GET)', nilai: c.TTE_EP_STATUS || '/v1/sign/{REQ}', bantu: '{REQ} = ID permintaan dari penyedia.' }) +
    bidangTeks({ id: 'tteEpUnduh', label: 'Unduh dokumen bertanda tangan (GET)', nilai: c.TTE_EP_UNDUH || '/v1/sign/{REQ}/document' }) + '</div>' +
    bidangArea({ id: 'tteBody', label: 'Templat badan permintaan tanda tangan (JSON)', baris: 9, nilai: c.TTE_BODY_TEMPLATE,
      placeholder: TTE_BODY_CONTOH,
      bantu: 'Kosongkan = bawaan (contoh di atas). Variabel: <span class="mono">{ID_PENGGUNA} {EMAIL} {NAMA_PEJABAT} {NAMA_FILE} {PDF_BASE64} {NOMOR} {PERIHAL} {KOTA} {HALAMAN} {X} {Y} {LEBAR} {TINGGI}</span>.' }) +
    '<div class="grid-2">' +
    bidangTeks({ id: 'ttePathId', label: 'Jalur JSON: ID permintaan', nilai: c.TTE_PATH_ID || 'data.id' }) +
    bidangTeks({ id: 'ttePathStatus', label: 'Jalur JSON: status', nilai: c.TTE_PATH_STATUS || 'data.status' }) + '</div><div class="grid-2">' +
    bidangTeks({ id: 'ttePathPdf', label: 'Jalur JSON: PDF base64', nilai: c.TTE_PATH_PDF || 'data.signed_document' }) +
    bidangTeks({ id: 'ttePathUrl', label: 'Jalur JSON: URL unduhan', nilai: c.TTE_PATH_URL || 'data.download_url' }) + '</div><div class="grid-2">' +
    bidangTeks({ id: 'tteSelesai', label: 'Nilai status "selesai"', nilai: c.TTE_NILAI_SELESAI || 'COMPLETED,SIGNED,SUCCESS,DONE' }) +
    bidangTeks({ id: 'ttePosisi', label: 'Posisi tampilan tanda tangan (JSON)', nilai: c.TTE_POSISI || '{"halaman":"terakhir","x":360,"y":120,"lebar":150,"tinggi":70}' }) +
    '</div></div></details>' +
    '<div class="garis"></div><div class="baris g8 bungkus">' +
    '<button class="btn btn-utama" id="btnSimpanTte" onclick="simpanTte()"><i class="bi bi-save"></i> Simpan Konfigurasi</button>' +
    '<button class="btn btn-garis" id="btnTesTte" onclick="tesTte()"><i class="bi bi-plug"></i> Uji Koneksi</button>' +
    '<button class="btn btn-garis" id="btnSinkronTte" onclick="sinkronTte()"><i class="bi bi-arrow-repeat"></i> Sinkron dokumen menunggu TTE</button>' +
    '</div></div>' +

    '<div class="kartu kartu-rapat"><div class="kartu-kepala" style="padding:4px 4px 0"><div><h3>Akun TTE Pejabat</h3>' +
    '<div class="kartu-sub">Isi ID pengguna / surel akun TTE tiap pejabat di Master Data → Pejabat Penandatangan, lalu cek keterhubungannya.</div></div>' +
    '<button class="btn btn-garis btn-sm" onclick="gantiTabPengaturan(\'pejabat\')"><i class="bi bi-pen"></i> Ubah Data Pejabat</button></div>' +
    bangunTabel({
      data: pejabat.map(function (p) {
        return { id: p.id, _nama: '<div class="t-judul">' + esc(p.nama) + '</div><div class="tx-xs tx-3">' + esc(p.jabatan) + '</div>',
                 _akun: String(p.tteResmiAktif) === 'true' ? '<span class="mono tx-sm">' + esc(p.tteIdPengguna || '-') + '</span><div class="tx-xs tx-3">' + esc(p.tteEmail || '') + '</div>'
                                                           : '<span class="tx-3 tx-sm">Tidak memakai TTE resmi</span>',
                 _st: p.tteStatus ? '<span class="lencana ' + (/^TERHUBUNG/.test(p.tteStatus) ? 'ok' : 'dang') + '">' + esc(p.tteStatus) + '</span>' +
                      (p.tteDicek ? '<div class="tx-xs tx-3">' + tglJam(p.tteDicek) + '</div>' : '') : '<span class="tx-3">—</span>',
                 aktif: String(p.tteResmiAktif) === 'true' };
      }),
      idTabel: 'master_ttePejabat',
      kolom: [{ k: '_nama', l: 'Pejabat', tipe: 'html' }, { k: '_akun', l: 'Akun TTE', tipe: 'html' }, { k: '_st', l: 'Status', tipe: 'html' }],
      judulKosong: 'Belum ada pejabat', deskKosong: '', ikonKosong: 'bi-pen',
      aksi: function (p) {
        return p.aktif ? '<button class="btn btn-garis btn-sm" onclick="cekTtePejabat(\'' + p.id + '\',this)"><i class="bi bi-person-check"></i> Cek Akun</button>' : '';
      }
    }) + '</div>';
}

function simpanTte() {
  var o = {
    TTE_AKTIF: el('tteAktif').checked ? 'true' : 'false', TTE_PENYEDIA: ambilNilai('ttePenyedia'), TTE_MODE: ambilNilai('tteMode'),
    TTE_BASE_URL: ambilNilai('tteBase').replace(/\/+$/, ''), TTE_AUTH_TIPE: ambilNilai('tteAuth'), TTE_AUTH_HEADER: ambilNilai('tteHeader'),
    TTE_API_KEY: el('tteKey').value, TTE_CLIENT_ID: ambilNilai('tteCid'), TTE_CLIENT_SECRET: el('tteSecret').value,
    TTE_TOKEN_URL: ambilNilai('tteTokenUrl'), TTE_EP_CEK: ambilNilai('tteEpCek'), TTE_EP_TANDATANGAN: ambilNilai('tteEpTtd'),
    TTE_EP_STATUS: ambilNilai('tteEpStatus'), TTE_EP_UNDUH: ambilNilai('tteEpUnduh'), TTE_BODY_TEMPLATE: el('tteBody').value.trim(),
    TTE_PATH_ID: ambilNilai('ttePathId'), TTE_PATH_STATUS: ambilNilai('ttePathStatus'), TTE_PATH_PDF: ambilNilai('ttePathPdf'),
    TTE_PATH_URL: ambilNilai('ttePathUrl'), TTE_NILAI_SELESAI: ambilNilai('tteSelesai'), TTE_POSISI: ambilNilai('ttePosisi')
  };
  if (o.TTE_BASE_URL && !/^https:\/\//i.test(o.TTE_BASE_URL)) { tandaiGalat(el('tteBase'), 'Wajib diawali https://'); return; }
  if (o.TTE_BODY_TEMPLATE) { try { JSON.parse(o.TTE_BODY_TEMPLATE); } catch (e) { tandaiGalat(el('tteBody'), 'Bukan JSON yang valid: ' + e.message); return; } }
  try { JSON.parse(o.TTE_POSISI); } catch (e) { tandaiGalat(el('ttePosisi'), 'Bukan JSON yang valid.'); return; }
  if (o.TTE_AKTIF === 'true' && o.TTE_MODE !== 'simulasi' && !o.TTE_BASE_URL) { tandaiGalat(el('tteBase'), 'Isi URL dasar API.'); return; }
  var b = el('btnSimpanTte'); tombolSibuk(b, true, 'Menyimpan…');
  simpanKonfigurasi(o, b);
}

function tesTte() {
  var b = el('btnTesTte'); tombolSibuk(b, true, 'Menghubungi…');
  kirim('tteTesKoneksi', {}).then(function (r) { tombolSibuk(b, false); toast(r.message, r.success ? 'sukses' : 'galat', 9000); });
}

function sinkronTte() {
  var b = el('btnSinkronTte'); tombolSibuk(b, true, 'Memeriksa…');
  kirim('tteSinkronStatus', {}, 180000).then(function (r) {
    tombolSibuk(b, false); toast(r.message, r.success ? 'sukses' : 'galat', 8000);
    if (r.success && r.data && r.data.selesai) { segarkanModul('suratKeluar', true); segarkanModul('sk', true); }
  });
}

function cekTtePejabat(id, btn) {
  tombolSibuk(btn, true, 'Mengecek…');
  kirim('tteCekPejabat', { id: id }).then(function (r) {
    tombolSibuk(btn, false);
    toast(r.message, r.success ? 'sukses' : 'galat', 8000);
    if (r.data) { upsertLokal('pejabat', r.data, 'master'); gambarTabPengaturan(); }
  });
}

/* ══════════════════════════════════════════════════════════════════
   MIGRASI DATA
   ══════════════════════════════════════════════════════════════════ */
var Mig = { sumber: '', info: null, rencana: {}, laporan: null };

function tabMigrasi(w) {
  var h = '<div class="kartu mb20"><div class="kartu-kepala"><div><h3><i class="bi bi-database-up"></i> Migrasi Data dari Spreadsheet Lain</h3>' +
    '<div class="kartu-sub">Pindahkan data e-SURAT lama (atau spreadsheet lain) ke basis data ini. Sumber <b>hanya dibaca</b>. ' +
    'Baris dengan kunci yang sama tidak digandakan — migrasi aman diulang (mis. untuk data susulan). ' +
    'Akun pemilik Apps Script harus punya akses (minimal Viewer) ke spreadsheet sumber.</div></div></div>' +
    '<div class="baris g8 bungkus" style="align-items:flex-end"><div class="sisa">' +
    bidangTeks({ id: 'migSumber', label: 'URL Google Sheets sumber', nilai: Mig.sumber, placeholder: 'https://docs.google.com/spreadsheets/d/…' }) +
    '</div><div class="bidang"><button class="btn btn-navy" id="btnPindaiMig" onclick="pindaiMigrasi()"><i class="bi bi-search"></i> 1. Pindai</button></div></div>' +
    '</div><div id="migRencana"></div><div id="migLaporan"></div>';
  w.innerHTML = h;
  if (Mig.info) gambarRencanaMigrasi();
  if (Mig.laporan) gambarLaporanMigrasi();
}

function pindaiMigrasi() {
  Mig.sumber = ambilNilai('migSumber');
  if (!Mig.sumber) { tandaiGalat(el('migSumber'), 'Tempel URL spreadsheet sumber.'); return; }
  var b = el('btnPindaiMig'); tombolSibuk(b, true, 'Memindai…');
  kirim('migrasiInfo', { sumber: Mig.sumber }, 120000).then(function (r) {
    tombolSibuk(b, false);
    if (!r.success) { toast(r.message, 'galat', 8000); return; }
    Mig.info = r.data; Mig.laporan = null; Mig.rencana = {};
    r.data.sheets.forEach(function (s) {
      Mig.rencana[s.nama] = { ikut: !!s.target && s.baris > 0, target: s.target, kunci: s.kunci, timpa: false, peta: JSON.parse(JSON.stringify(s.peta || {})) };
    });
    gambarRencanaMigrasi();
    el('migLaporan').innerHTML = '';
  });
}

function gambarRencanaMigrasi() {
  var w = el('migRencana');
  if (!w || !Mig.info) return;
  var targets = Object.keys(Mig.info.targets);
  var h = '<div class="kartu mb20"><div class="kartu-kepala"><div><h3>2. Rencana Migrasi — ' + esc(Mig.info.judul) + '</h3>' +
    '<div class="kartu-sub">Tujuan & peta kolom ditebak dari nama header. Periksa lalu ubah bila perlu.</div></div></div>';
  Mig.info.sheets.forEach(function (s, i) {
    var rc = Mig.rencana[s.nama];
    var nPeta = Object.keys(rc.peta).length;
    h += '<div class="mig-sheet' + (rc.ikut ? ' aktif' : '') + '"><div class="baris g10 bungkus">' +
      '<label class="baris g8 sisa"><input type="checkbox" style="width:auto"' + (rc.ikut ? ' checked' : '') +
      ' onchange="Mig.rencana[\'' + esc(s.nama).replace(/'/g, '') + '\'].ikut=this.checked;gambarRencanaMigrasi()"> <b>' + esc(s.nama) + '</b> ' +
      '<span class="tx-3 tx-sm">' + s.baris + ' baris · ' + s.header.length + ' kolom</span></label>' +
      '<select style="width:auto" onchange="ubahTargetMig(' + i + ',this.value)"><option value="">— Tujuan —</option>' +
      targets.map(function (t) { return '<option' + (rc.target === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>' +
      '<label class="baris g6 tx-sm"><input type="checkbox" style="width:auto"' + (rc.timpa ? ' checked' : '') +
      ' onchange="Mig.rencana[\'' + esc(s.nama).replace(/'/g, '') + '\'].timpa=this.checked"> Timpa data yang sudah ada</label>' +
      '<button class="btn btn-hantu btn-sm" onclick="aturPetaMig(' + i + ')"><i class="bi bi-diagram-2"></i> Peta kolom (' + nPeta + ')</button></div>' +
      (s.contoh.length ? '<div class="tx-xs tx-3 mt8 mono putus">Contoh: ' + esc(s.contoh[0].slice(0, 6).join(' | ')) + '</div>' : '') + '</div>';
  });
  h += '<div class="baris g8 bungkus mt16">' +
    '<button class="btn btn-garis" id="btnUjiMig" onclick="jalankanMigrasi(true)"><i class="bi bi-clipboard-check"></i> 3. Uji (tanpa menulis)</button>' +
    '<button class="btn btn-utama" id="btnJalanMig" onclick="jalankanMigrasi(false)"><i class="bi bi-database-up"></i> 4. Jalankan Migrasi</button></div></div>';
  w.innerHTML = h;
}

function ubahTargetMig(i, t) {
  var s = Mig.info.sheets[i], rc = Mig.rencana[s.nama];
  rc.target = t;
  rc.kunci = t === 'AppConfig' ? 'key' : 'id';
  rc.peta = {};
  var kolom = Mig.info.targets[t] || [];
  var norm = function (x) { return String(x).toLowerCase().replace(/[^a-z0-9]/g, ''); };
  kolom.forEach(function (k) {
    var j = s.header.map(norm).indexOf(norm(k));
    if (j >= 0) rc.peta[k] = s.header[j];
  });
  rc.ikut = !!t;
  gambarRencanaMigrasi();
}

function aturPetaMig(i) {
  var s = Mig.info.sheets[i], rc = Mig.rencana[s.nama];
  if (!rc.target) { toast('Pilih sheet tujuan terlebih dahulu.', 'info'); return; }
  var kolom = Mig.info.targets[rc.target] || [];
  bukaModal({
    judul: 'Peta Kolom: ' + s.nama + ' → ' + rc.target,
    sub: 'Kolom tujuan (kiri) diisi dari kolom sumber (kanan). Kolom kunci menentukan baris yang dianggap sama.',
    isi: bidangPilih({ id: 'migKunci', label: 'Kolom kunci (pencegah duplikat)', nilai: rc.kunci, opsi: kolom }) +
      '<div class="tabel-bungkus"><table class="data"><thead><tr><th>Kolom tujuan</th><th>Dari kolom sumber</th></tr></thead><tbody>' +
      kolom.map(function (k, j) {
        return '<tr><td class="mono tx-sm">' + esc(k) + '</td><td><select id="migPeta' + j + '"><option value="">— tidak diisi —</option>' +
          s.header.map(function (hd) { return '<option' + (rc.peta[k] === hd ? ' selected' : '') + '>' + esc(hd) + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table></div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" onclick="simpanPetaMig(' + i + ')"><i class="bi bi-check2"></i> Terapkan</button>'
  });
}

function simpanPetaMig(i) {
  var s = Mig.info.sheets[i], rc = Mig.rencana[s.nama];
  var kolom = Mig.info.targets[rc.target] || [];
  rc.peta = {};
  kolom.forEach(function (k, j) { var v = ambilNilai('migPeta' + j); if (v) rc.peta[k] = v; });
  rc.kunci = ambilNilai('migKunci') || rc.kunci;
  tutupModal();
  gambarRencanaMigrasi();
}

function jalankanMigrasi(uji) {
  var rencana = Object.keys(Mig.rencana).filter(function (k) { return Mig.rencana[k].ikut && Mig.rencana[k].target; })
    .map(function (k) { var r = Mig.rencana[k]; return { sumberSheet: k, target: r.target, kunci: r.kunci, timpa: r.timpa, peta: r.peta }; });
  if (!rencana.length) { toast('Centang minimal satu sheet dengan tujuan.', 'peringatan'); return; }
  var lanjut = function () {
    var b = el(uji ? 'btnUjiMig' : 'btnJalanMig'); tombolSibuk(b, true, uji ? 'Menguji…' : 'Memigrasi…');
    kirim('migrasiJalankan', { sumber: Mig.sumber, rencana: rencana, dryRun: uji }, 330000).then(function (r) {
      tombolSibuk(b, false);
      if (!r.success) { toast(r.message, 'galat', 9000); return; }
      Mig.laporan = r.data; Mig.laporan.pesan = r.message;
      gambarLaporanMigrasi();
      toast(r.message, 'sukses', 7000);
      if (!uji) segarkanPanelDiamDiam();
    });
  };
  if (uji) { lanjut(); return; }
  konfirmasi({ judul: 'Jalankan Migrasi', pesan: rencana.length + ' sheet akan diimpor. Data yang sudah ada ' +
    (rencana.some(function (r) { return r.timpa; }) ? 'dapat <b>ditimpa</b> pada sheet bertanda "Timpa".' : 'tidak diubah (hanya baris baru yang ditambahkan).') +
    ' Disarankan menjalankan Uji terlebih dahulu.', ya: 'Ya, Jalankan' }).then(function (y) { if (y) lanjut(); });
}

function gambarLaporanMigrasi() {
  var w = el('migLaporan'), L = Mig.laporan;
  if (!w || !L) return;
  w.innerHTML = '<div class="kartu"><div class="kartu-kepala"><div><h3>' + (L.dryRun ? 'Hasil Uji (belum ditulis)' : 'Hasil Migrasi') + '</h3>' +
    '<div class="kartu-sub">' + esc(L.pesan || '') + ' · ' + (L.ms / 1000).toFixed(1) + ' dtk</div></div></div>' +
    '<div class="tabel-bungkus"><table class="data"><thead><tr><th>Sumber → Tujuan</th><th>Dibaca</th><th>Baru</th><th>Diperbarui</th><th>Sama/Dilewati</th><th>Catatan</th></tr></thead><tbody>' +
    L.laporan.map(function (x) {
      return '<tr><td><b>' + esc(x.sumberSheet) + '</b> → ' + esc(x.target) + (x.ditunda ? ' <span class="lencana warn">ditunda</span>' : '') + '</td>' +
        '<td>' + (x.dibaca || 0) + '</td><td><b>' + (x.baru || 0) + '</b></td><td>' + (x.diperbarui || 0) + '</td><td>' + ((x.sama || 0) + (x.kosong || 0)) + '</td>' +
        '<td class="tx-xs">' + (x.peringatan || []).map(esc).join('<br>') + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
}
