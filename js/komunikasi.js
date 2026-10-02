/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/komunikasi.js  (v4.4 · berkas BARU)
   Menu "WhatsApp & Notifikasi" dan "CRM Kontak" (grup Komunikasi).
   · Ringkasan perangkat WA (Fonnte), kuota surel, antrean, uji kirim
   · Matriks event × kanal (surel / WhatsApp) + templat pesan per event
   · Blast WhatsApp bertahap (batch 10/20/50, jeda acak) dengan progres
   · Antrean & riwayat pengiriman, ulangi yang gagal
   · CRM: sinkron otomatis dari pengajuan & pengguna, tag, opt-out,
     cek nomor terdaftar WhatsApp, impor/ekspor CSV, gabung duplikat
   Semua data dimuat lewat SATU panggilan batch per halaman.
   ═══════════════════════════════════════════════════════════════════ */

var Kom = { tab: 'ringkas', data: null, perangkat: null, saringAntre: '', pemutar: null };
var Crm = { data: null, stats: null, pilih: {}, saring: { segmen: '', statusWa: '', tag: '', cari: '' } };

(function () {
  if (typeof MODUL_ADMIN === 'undefined') return;
  if (!MODUL_ADMIN.some(function (m) { return m.grup === 'Komunikasi'; })) {
    var i = -1;
    MODUL_ADMIN.forEach(function (m, j) { if (m.grup === 'Arsip & Rekapitulasi') i = j; });
    var sisip = [{ grup: 'Komunikasi' },
      { kunci: 'notifWa', nama: 'WhatsApp & Notifikasi', ikon: 'bi-whatsapp', peran: ['SUPER_ADMIN', 'ADMIN'] },
      { kunci: 'crm', nama: 'CRM Kontak', ikon: 'bi-person-rolodex', peran: ['SUPER_ADMIN', 'ADMIN'] }];
    if (i < 0) MODUL_ADMIN.push.apply(MODUL_ADMIN, sisip);
    else MODUL_ADMIN.splice.apply(MODUL_ADMIN, [i, 0].concat(sisip));
  }
  MODUL_TAMBAHAN.notifWa = renderKomunikasi;
  MODUL_TAMBAHAN.crm = renderCrm;
  HALAMAN_TABEL.antreTbl = function () { gambarKomunikasi(); };
  HALAMAN_TABEL.crmTbl = function () { gambarCrm(); };
})();

/* ══════════════════════════════════════════════════════════════════
   WHATSAPP & NOTIFIKASI
   ══════════════════════════════════════════════════════════════════ */
var TAB_KOM = [
  { k: 'ringkas', n: 'Ringkasan & Uji', i: 'bi-speedometer2' },
  { k: 'matriks', n: 'Matriks & Templat', i: 'bi-grid-3x3-gap' },
  { k: 'blast', n: 'Blast WhatsApp', i: 'bi-megaphone' },
  { k: 'antrean', n: 'Antrean & Riwayat', i: 'bi-list-check' },
  { k: 'atur', n: 'Pengaturan', i: 'bi-sliders' }
];

function renderKomunikasi(w) {
  var h = kepalaHalaman({
    remah: ['Komunikasi', 'WhatsApp & Notifikasi'],
    judul: 'WhatsApp & Notifikasi',
    sub: 'Notifikasi surel & WhatsApp dikirim lewat antrean (aksi admin tidak menunggu). Atur event mana yang dikirim ke kanal mana, ' +
         'templat pesannya, dan kirim blast bertahap yang aman.',
    aksi: '<button class="btn btn-garis" onclick="muatKomunikasi(true)"><i class="bi bi-arrow-repeat"></i> Segarkan</button>'
  });
  h += '<div class="tab-bar">' + TAB_KOM.map(function (t) {
    return '<button class="' + (Kom.tab === t.k ? 'aktif' : '') + '" onclick="Kom.tab=\'' + t.k + '\';gambarKomunikasi()">' +
      '<i class="bi ' + t.i + '"></i> ' + esc(t.n) + '</button>';
  }).join('') + '</div><div id="komIsi"></div>';
  w.innerHTML = h;
  if (Kom.data) gambarKomunikasi();
  else el('komIsi').innerHTML = '<div class="kartu">' + keadaanMemuat('Memuat konfigurasi notifikasi…') + '</div>';
  muatKomunikasi(false);
}

/** Satu eksekusi server: konfigurasi + antrean + daftar blast. */
function muatKomunikasi(paksa) {
  if (Kom._muat) return Kom._muat;
  if (!paksa && Kom.data && Date.now() - Kom.data._waktu < 30000) return Promise.resolve(Kom.data);
  Kom._muat = kirimBatch([{ action: 'notifConfig' }, { action: 'notifAntrean', data: { limit: 300 } }, { action: 'waBlastList' }])
    .then(function (r) {
      Kom._muat = null;
      var c = r.notifConfig || {};
      if (!c.success) { if (el('komIsi')) el('komIsi').innerHTML = keadaanKosong('Gagal memuat', c.message || 'Coba segarkan.', 'bi-exclamation-triangle'); return; }
      var lama = JSON.stringify(Kom.data && [Kom.data.cfg, Kom.data.antre, Kom.data.blast]);
      Kom.data = { _waktu: Date.now(), cfg: c.data, antre: (r.notifAntrean || {}).data || { rows: [], hitung: {} },
                   blast: (r.waBlastList || {}).data || [] };
      if (Adm.modulAktif === 'notifWa' && lama !== JSON.stringify([Kom.data.cfg, Kom.data.antre, Kom.data.blast])) gambarKomunikasi();
      aturPemutarBlast();
      return Kom.data;
    });
  return Kom._muat;
}

function gambarKomunikasi() {
  var w = el('komIsi');
  if (!w || !Kom.data) return;
  $$('#admKonten .tab-bar button').forEach(function (b, i) { b.classList.toggle('aktif', TAB_KOM[i] && TAB_KOM[i].k === Kom.tab); });
  jalankanAman(function () {
    if (Kom.tab === 'matriks') return tabMatriks(w);
    if (Kom.tab === 'blast') return tabBlast(w);
    if (Kom.tab === 'antrean') return tabAntrean(w);
    if (Kom.tab === 'atur') return tabAturNotif(w);
    return tabRingkasNotif(w);
  }, 'Komunikasi');
}

/* ── Ringkasan & uji ──────────────────────────────────────────── */
function kartuKpiTeks(label, teks, ikon, warna, kaki) {
  return '<div class="kpi"><div class="kpi-atas"><div class="kpi-label">' + label + '</div>' +
    '<div class="kpi-ikon ' + warna + '"><i class="bi ' + ikon + '"></i></div></div>' +
    '<div class="kpi-nilai">' + esc(teks) + '</div>' + (kaki ? '<div class="kpi-kaki">' + kaki + '</div>' : '') + '</div>';
}

function tabRingkasNotif(w) {
  var c = Kom.data.cfg, cfg = c.config || {}, hit = Kom.data.antre.hitung || {};
  var p = Kom.perangkat;
  w.innerHTML = '<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">' +
    kartuKpiTeks('Kanal Surel', String(cfg.NOTIF_EMAIL_AKTIF) === 'true' ? 'Aktif' : 'Mati', 'bi-envelope', String(cfg.NOTIF_EMAIL_AKTIF) === 'true' ? 'hijau' : 'abu',
             '<span class="tx-3">sisa kuota hari ini: ' + angka(c.kuotaEmail) + '</span>') +
    kartuKpiTeks('Kanal WhatsApp', String(cfg.NOTIF_WA_AKTIF) === 'true' ? 'Aktif' : 'Mati', 'bi-whatsapp', String(cfg.NOTIF_WA_AKTIF) === 'true' ? 'hijau' : 'abu',
             '<span class="tx-3">' + (cfg.WA_TOKEN ? 'token terisi' : 'token belum diisi') + '</span>') +
    kartuKpi('Antre', hit.ANTRE || 0, 'pesan', 'bi-hourglass-split', 'emas', '<span class="tx-3">dari 300 riwayat terakhir</span>') +
    kartuKpi('Gagal', hit.GAGAL || 0, 'pesan', 'bi-exclamation-octagon', 'merah', '') +
    '</div>' +

    '<div class="grid-2" style="align-items:start">' +
    '<div class="kartu"><div class="kartu-kepala"><div><h3><i class="bi bi-phone"></i> Perangkat WhatsApp (Fonnte)</h3>' +
    '<div class="kartu-sub">Status nomor pengirim & kuota paket.</div></div>' +
    '<button class="btn btn-garis btn-sm" id="btnPerangkat" onclick="cekPerangkatWa()"><i class="bi bi-arrow-repeat"></i> Cek</button></div>' +
    (p ? '<div class="grid-2">' + miniInfo('Nomor', p.nomor) + miniInfo('Status', p.status) + '</div>' +
         '<div class="grid-2 mt8">' + miniInfo('Paket', p.paket) + miniInfo('Kuota / Kedaluwarsa', (p.kuota === undefined ? '-' : p.kuota) + ' · ' + (p.kedaluwarsa || '-')) + '</div>'
       : '<div class="tx-sm tx-3">Klik <b>Cek</b> untuk membaca status perangkat.</div>') + '</div>' +

    '<div class="kartu"><div class="kartu-kepala"><div><h3><i class="bi bi-send-check"></i> Uji Kirim & Antrean</h3>' +
    '<div class="kartu-sub">Uji langsung (tanpa antrean) untuk memastikan kanal berfungsi.</div></div></div>' +
    '<div class="grid-2">' + bidangTeks({ id: 'ujiWa', label: 'Nomor WhatsApp', placeholder: '0812…' }) +
    '<div class="bidang"><label>&nbsp;</label><button class="btn btn-ok btn-blok" id="btnUjiWa" onclick="ujiWa()"><i class="bi bi-whatsapp"></i> Kirim Uji WA</button></div></div>' +
    '<div class="grid-2">' + bidangTeks({ id: 'ujiEmail', label: 'Surel', nilai: (Adm.boot.user || {}).email }) +
    '<div class="bidang"><label>&nbsp;</label><button class="btn btn-navy btn-blok" id="btnUjiEmail" onclick="ujiEmail()"><i class="bi bi-envelope"></i> Kirim Uji Surel</button></div></div>' +
    '<div class="garis"></div><div class="baris g8 bungkus">' +
    '<button class="btn btn-garis btn-sm" id="btnProsesAntre" onclick="prosesAntreSekarang()"><i class="bi bi-play-circle"></i> Proses antrean sekarang</button>' +
    '<span class="tx-sm tx-3">' + (c.pekerjaAktif ? '<i class="bi bi-check-circle tx-ok"></i> Pekerja latar aktif (tiap 1 menit)'
      : '<i class="bi bi-exclamation-triangle tx-emas"></i> Pekerja latar belum dipasang — jalankan <code>PASANG_PEKERJA()</code> di Apps Script') + '</span>' +
    '</div></div></div>';
}

function cekPerangkatWa() {
  var b = el('btnPerangkat'); tombolSibuk(b, true, 'Membaca…');
  kirim('waPerangkat', {}).then(function (r) {
    tombolSibuk(b, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    Kom.perangkat = r.data; gambarKomunikasi();
  });
}
function ujiWa() {
  var n = ambilNilai('ujiWa'); if (!n) { toast('Isi nomor WhatsApp.', 'peringatan'); return; }
  var b = el('btnUjiWa'); tombolSibuk(b, true, 'Mengirim…');
  kirim('waTes', { nomor: n }).then(function (r) { tombolSibuk(b, false); toast(r.message, r.success ? 'sukses' : 'galat', 7000); });
}
function ujiEmail() {
  var b = el('btnUjiEmail'); tombolSibuk(b, true, 'Mengirim…');
  kirim('emailTes', { email: ambilNilai('ujiEmail') }).then(function (r) { tombolSibuk(b, false); toast(r.message, r.success ? 'sukses' : 'galat', 7000); });
}
function prosesAntreSekarang() {
  var b = el('btnProsesAntre'); tombolSibuk(b, true, 'Mengirim antrean…');
  kirim('notifProsesSekarang', {}, 180000).then(function (r) {
    tombolSibuk(b, false); toast(r.message, r.success ? 'sukses' : 'galat'); muatKomunikasi(true);
  });
}

/* ── Matriks & templat ───────────────────────────────────────── */
var VAR_TEMPLAT = ['{nama}', '{noRef}', '{perihal}', '{status}', '{catatan}', '{tahap}', '{nomorSurat}', '{pdfUrl}', '{institusi}', '{link}',
                   '{skema}', '{cicilanKe}', '{jumlahCicilan}', '{nominal}', '{jatuhTempo}', '{sisaHari}', '{totalTagihan}', '{jadwal}'];

function tabMatriks(w) {
  var m = Kom.data.cfg.matriks || {};
  var boleh = Sesi.boleh('master');
  var grup = {};
  Object.keys(m).forEach(function (ev) { (grup[m[ev].grup] = grup[m[ev].grup] || []).push(ev); });
  var h = '<div class="kartu kartu-rapat"><div class="kartu-kepala" style="padding:4px 4px 0"><div><h3>Matriks Event × Kanal</h3>' +
    '<div class="kartu-sub">Centang kanal pengiriman tiap event. Templat kosong = pesan bawaan sistem. Format WA: *tebal* _miring_.</div></div>' +
    (boleh ? '<button class="btn btn-utama" id="btnSimpanMatriks" onclick="simpanMatriks()"><i class="bi bi-save"></i> Simpan</button>' : '') + '</div>' +
    '<div class="tx-xs tx-3 mb12" style="padding:0 4px">Variabel: ' + VAR_TEMPLAT.map(function (v) { return '<span class="mono">' + v + '</span>'; }).join(' ') + '</div>';
  Object.keys(grup).forEach(function (g) {
    h += '<div class="label-kecil mb8 mt12" style="padding:0 4px">' + esc(g) + '</div>' +
      '<div class="tabel-bungkus"><table class="data"><thead><tr><th>Event</th><th style="width:70px">Surel</th><th style="width:90px">WhatsApp</th><th>Templat WhatsApp (opsional)</th></tr></thead><tbody>' +
      grup[g].map(function (ev) {
        var x = m[ev];
        return '<tr><td><div class="t-judul">' + esc(x.label) + '</div><div class="tx-xs tx-3 mono">' + esc(ev) + '</div></td>' +
          '<td><label class="saklar"><input type="checkbox" data-mx="' + ev + '" data-kanal="email"' + (x.email ? ' checked' : '') + (boleh ? '' : ' disabled') + '><span class="track"></span></label></td>' +
          '<td><label class="saklar"><input type="checkbox" data-mx="' + ev + '" data-kanal="wa"' + (x.wa ? ' checked' : '') + (boleh ? '' : ' disabled') + '><span class="track"></span></label></td>' +
          '<td><textarea rows="3" data-tpl="' + ev + '" placeholder="' + esc(x.waTplBawaan || 'Pesan bawaan sistem (judul, nomor referensi, status, catatan).') + '"' +
          (boleh ? '' : ' readonly') + ' style="font-size:12.5px">' + esc(x.waTpl || '') + '</textarea>' +
          '<input type="text" data-subj="' + ev + '" value="' + esc(x.emailSubjek || '') + '" placeholder="Subjek surel: ' +
          esc(x.emailSubjekBawaan || 'bawaan sistem') + '"' + (boleh ? '' : ' readonly') + ' style="margin-top:6px;font-size:12.5px"></td></tr>';
      }).join('') + '</tbody></table></div>';
  });
  w.innerHTML = h + '</div>';
}

function simpanMatriks() {
  var m = {};
  Object.keys(Kom.data.cfg.matriks).forEach(function (ev) {
    m[ev] = {
      email: !!($('[data-mx="' + ev + '"][data-kanal="email"]') || {}).checked,
      wa: !!($('[data-mx="' + ev + '"][data-kanal="wa"]') || {}).checked,
      waTpl: ($('[data-tpl="' + ev + '"]') || {}).value || '',
      emailSubjek: ($('[data-subj="' + ev + '"]') || {}).value || ''
    };
  });
  var b = el('btnSimpanMatriks'); tombolSibuk(b, true, 'Menyimpan…');
  kirim('notifConfigSimpan', { matriks: m }).then(function (r) {
    tombolSibuk(b, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    Kom.data.cfg = r.data; toast('Matriks notifikasi disimpan.', 'sukses'); gambarKomunikasi();
  });
}

/* ── Blast WhatsApp ──────────────────────────────────────────── */
function tabBlast(w) {
  var cfg = Kom.data.cfg.config || {};
  var segmen = ['Mahasiswa', 'Dosen', 'Staf', 'Umum'];
  var h = '<div class="grid-2" style="align-items:start">' +
    '<div class="kartu"><div class="kartu-kepala"><div><h3><i class="bi bi-megaphone"></i> Buat Blast</h3>' +
    '<div class="kartu-sub">Penerima dari CRM Kontak (opt-out & nomor tidak terdaftar WA otomatis dilewati).</div></div></div>' +
    bidangTeks({ id: 'blJudul', label: 'Judul Blast', wajib: true, placeholder: 'Pengumuman jadwal UAS' }) +
    bidangArea({ id: 'blPesan', label: 'Isi Pesan', wajib: true, baris: 6,
      placeholder: 'Yth. {nama},\n\nKami informasikan …\n\n— Sekretariat', bantu: 'Variabel: <span class="mono">{nama}</span> <span class="mono">{segmen}</span>. Format *tebal* _miring_.' }) +
    '<div class="label-kecil mb8">Sasaran</div><div class="grid-2">' +
    bidangPilih({ id: 'blSegmen', label: 'Segmen', kosong: 'Semua segmen', opsi: segmen }) +
    bidangTeks({ id: 'blTag', label: 'Tag (opsional)', placeholder: 'mis. angkatan-2024' }) + '</div>' +
    '<div class="grid-2">' +
    bidangPilih({ id: 'blCicilan', label: 'Khusus cicilan (opsional)', kosong: 'Tidak disaring',
      opsi: [{ v: 'BELUM_LUNAS', t: 'Punya cicilan belum lunas' }, { v: 'TERLAMBAT', t: 'Ada cicilan terlambat' },
             { v: 'SEGERA', t: 'Jatuh tempo ≤ 3 hari' }, { v: 'JATUH_TEMPO', t: 'Jatuh tempo hari ini' }] }) +
    bidangPilih({ id: 'blStatusWa', label: 'Status nomor', nilai: '', kosong: 'Semua (kecuali tidak terdaftar)',
      opsi: [{ v: 'TERDAFTAR', t: 'Hanya yang terverifikasi WhatsApp' }] }) + '</div>' +
    '<div class="grid-2">' +
    bidangPilih({ id: 'blBatch', label: 'Ukuran batch per putaran', nilai: String(cfg.WA_BATCH_DEFAULT || '20'),
      opsi: [{ v: '10', t: '10 pesan (paling aman)' }, { v: '20', t: '20 pesan' }, { v: '50', t: '50 pesan' }] }) +
    bidangTeks({ id: 'blJeda', label: 'Jeda antarpesan (detik)', nilai: cfg.WA_JEDA_DETIK || '5', bantu: 'Boleh acak, mis. <span class="mono">5-12</span>.' }) + '</div>' +
    '<div class="baris g8 bungkus"><button class="btn btn-garis" id="btnAudiens" onclick="pratinjauAudiens()"><i class="bi bi-people"></i> Hitung Penerima</button>' +
    '<button class="btn btn-ok" id="btnBlast" onclick="buatBlast()"><i class="bi bi-send"></i> Mulai Blast</button></div>' +
    '<div id="blAudiens" class="mt12"></div></div>' +

    '<div class="kartu kartu-rapat"><div class="kartu-kepala" style="padding:4px 4px 0"><div><h3>Riwayat Blast</h3>' +
    '<div class="kartu-sub">Dikirim bertahap oleh pekerja latar (1 batch per menit).</div></div></div><div id="blDaftar">' + daftarBlastHtml() + '</div></div></div>';
  w.innerHTML = h;
}

function daftarBlastHtml() {
  var d = Kom.data.blast || [];
  if (!d.length) return keadaanKosong('Belum ada blast', 'Blast yang dibuat akan tampil di sini beserta progresnya.', 'bi-megaphone');
  return d.slice(0, 30).map(function (b) {
    var total = Number(b.total) || 0, ok = Number(b.terkirim) || 0, gagal = Number(b.gagal) || 0;
    var persen = total ? Math.round((ok + gagal) / total * 100) : 0;
    return '<div class="blast-item"><div class="baris antara g8 bungkus"><div class="t-judul">' + esc(b.judul) + '</div>' +
      '<span class="lencana ' + (b.status === 'BERJALAN' ? 'warn' : b.status === 'SELESAI' ? 'ok' : 'neut') + '">' + esc(b.status) + '</span></div>' +
      '<div class="bar-tipis mt8"><span style="width:' + persen + '%"></span></div>' +
      '<div class="tx-xs tx-3 mt4">' + ok + ' terkirim · ' + gagal + ' gagal · ' + total + ' penerima · batch ' + esc(b.ukuranBatch) +
      ' · ' + esc(b.dibuatOleh || '') + ' · ' + tglJam(b.tanggal) + '</div>' +
      (b.status === 'BERJALAN' && Sesi.boleh('tulis') ? '<div class="baris g6 mt8">' +
        '<button class="btn btn-garis btn-sm" onclick="prosesBlast(\'' + b.id + '\',this)"><i class="bi bi-play"></i> Kirim batch sekarang</button>' +
        '<button class="btn btn-hantu btn-sm" onclick="hentikanBlast(\'' + b.id + '\')"><i class="bi bi-stop-circle"></i> Hentikan</button></div>' : '') +
      '</div>';
  }).join('');
}

function sasaranBlast() {
  return { segmen: ambilNilai('blSegmen'), tag: ambilNilai('blTag'), cicilan: ambilNilai('blCicilan'), statusWa: ambilNilai('blStatusWa') };
}

function pratinjauAudiens() {
  var b = el('btnAudiens'); tombolSibuk(b, true, 'Menghitung…');
  kirim('waAudiens', sasaranBlast()).then(function (r) {
    tombolSibuk(b, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    el('blAudiens').innerHTML = '<div class="info-tpl"><i class="bi bi-people"></i><div class="sisa"><div class="tebal">' + r.data.total + ' penerima</div>' +
      '<div class="tx-sm">' + r.data.contoh.map(function (k) { return esc(k.nama) + ' (' + esc(k.noWa) + ')'; }).join(', ') +
      (r.data.total > r.data.contoh.length ? ', …' : '') + '</div></div></div>';
  });
}

function buatBlast() {
  if (!validasiForm(null, [{ id: 'blJudul', wajib: true }, { id: 'blPesan', wajib: true, min: 5 }])) return;
  konfirmasi({ judul: 'Mulai Blast WhatsApp', pesan: 'Pesan akan dikirim bertahap ke seluruh penerima yang cocok. Lanjutkan?', ya: 'Ya, Mulai' })
    .then(function (ya) {
      if (!ya) return;
      var b = el('btnBlast'); tombolSibuk(b, true, 'Menyiapkan…');
      kirim('waBlastBuat', { judul: ambilNilai('blJudul'), pesan: el('blPesan').value, sasaran: sasaranBlast(),
                             ukuranBatch: ambilNilai('blBatch'), jedaDetik: ambilNilai('blJeda') }).then(function (r) {
        tombolSibuk(b, false);
        if (!r.success) { toast(r.message, 'galat', 7000); return; }
        toast(r.message, 'sukses', 7000);
        el('blJudul').value = ''; el('blPesan').value = '';
        muatKomunikasi(true);
      });
    });
}

function prosesBlast(id, btn) {
  tombolSibuk(btn, true, 'Mengirim…');
  kirim('waBlastProses', { id: id }, 240000).then(function (r) { tombolSibuk(btn, false); toast(r.message, r.success ? 'sukses' : 'peringatan'); muatKomunikasi(true); });
}

function hentikanBlast(id) {
  konfirmasi({ judul: 'Hentikan Blast', pesan: 'Pesan yang belum terkirim akan dibatalkan.', ya: 'Hentikan', bahaya: true }).then(function (ya) {
    if (!ya) return;
    kirim('waBlastStop', { id: id }).then(function (r) { toast(r.message, r.success ? 'sukses' : 'galat'); muatKomunikasi(true); });
  });
}

/** Segarkan progres blast tiap 20 dtk hanya bila ada blast berjalan & halaman terlihat. */
function aturPemutarBlast() {
  var jalan = (Kom.data && Kom.data.blast || []).some(function (b) { return b.status === 'BERJALAN'; });
  if (jalan && !Kom.pemutar) {
    Kom.pemutar = setInterval(function () {
      if (document.hidden || Adm.modulAktif !== 'notifWa' || Aktivitas.diam(300000)) return;
      kirim('waBlastList', {}).then(function (r) {
        if (!r.success || !Kom.data) return;
        Kom.data.blast = r.data;
        if (el('blDaftar')) el('blDaftar').innerHTML = daftarBlastHtml();
        aturPemutarBlast();
      });
    }, 20000);
  } else if (!jalan && Kom.pemutar) { clearInterval(Kom.pemutar); Kom.pemutar = null; }
}

/* ── Antrean & riwayat ───────────────────────────────────────── */
function tabAntrean(w) {
  var a = Kom.data.antre, hit = a.hitung || {};
  var rows = (a.rows || []).filter(function (r) { return !Kom.saringAntre || r.status === Kom.saringAntre; });
  var data = rows.map(function (r) {
    return { _waktu: '<span class="tnum tx-sm">' + tglJam(r.dibuat) + '</span>', _kanal: r.kanal === 'wa' ? '<i class="bi bi-whatsapp tx-ok"></i> WA' : '<i class="bi bi-envelope"></i> Surel',
             tujuan: r.tujuan, _penerima: '<div class="t-judul">' + esc(r.namaPenerima || '-') + '</div><div class="tx-xs tx-3">' + esc(potong(r.subjek || r.event, 60)) + '</div>',
             _st: lencanaStatus(r.status === 'TERKIRIM' ? 'TERBIT' : r.status === 'GAGAL' ? 'DITOLAK' : r.status === 'ANTRE' ? 'MENUNGGU' : 'BATAL')
                    .replace(/>(Terbit|Ditolak|Menunggu|Batal)</, '>' + esc(r.status) + '<'),
             respon: r.respon };
  });
  w.innerHTML = '<div class="kartu kartu-rapat"><div class="tabel-alat"><div class="pub-tab" style="padding:3px">' +
    ['', 'ANTRE', 'TERKIRIM', 'GAGAL', 'BATAL'].map(function (s) {
      return '<button class="' + (Kom.saringAntre === s ? 'aktif' : '') + '" onclick="Kom.saringAntre=\'' + s + '\';gambarKomunikasi()">' +
        (s || 'Semua') + (s && hit[s] ? ' (' + hit[s] + ')' : '') + '</button>';
    }).join('') + '</div><div class="sisa"></div>' +
    (hit.GAGAL && Sesi.boleh('tulis') ? '<button class="btn btn-garis btn-sm" onclick="ulangiGagal()"><i class="bi bi-arrow-clockwise"></i> Ulangi yang gagal</button>' : '') +
    '</div>' + bangunTabel({
      data: data, idTabel: 'antreTbl', halaman: Adm.halaman.antreTbl || 1,
      kolom: [{ k: '_waktu', l: 'Waktu', tipe: 'html' }, { k: '_kanal', l: 'Kanal', tipe: 'html' }, { k: '_penerima', l: 'Penerima / Subjek', tipe: 'html' },
              { k: 'tujuan', l: 'Tujuan' }, { k: '_st', l: 'Status', tipe: 'html' }, { k: 'respon', l: 'Respons' }],
      judulKosong: 'Belum ada riwayat', deskKosong: 'Notifikasi yang dikirim sistem akan tercatat di sini.', ikonKosong: 'bi-list-check'
    }) + '</div>';
}

function ulangiGagal() {
  kirim('notifUlangiGagal', {}).then(function (r) { toast(r.message, r.success ? 'sukses' : 'galat'); muatKomunikasi(true); });
}

/* ── Pengaturan ──────────────────────────────────────────────── */
function tabAturNotif(w) {
  var c = Kom.data.cfg.config || {};
  var boleh = Sesi.boleh('master');
  w.innerHTML = '<div class="kartu"><div class="kartu-kepala"><div><h3>Pengaturan Notifikasi</h3>' +
    '<div class="kartu-sub">Token WhatsApp (Fonnte) & API key diatur di Pengaturan → Notifikasi &amp; Integrasi.</div></div></div>' +
    bidangSaklar({ id: 'nfEmail', label: 'Kirim notifikasi surel', nilai: String(c.NOTIF_EMAIL_AKTIF) === 'true' }) +
    bidangSaklar({ id: 'nfWa', label: 'Kirim notifikasi WhatsApp', nilai: String(c.NOTIF_WA_AKTIF) === 'true' }) +
    bidangSaklar({ id: 'nfDeteksi', label: 'Cek otomatis nomor WhatsApp kontak baru', desk: 'Memakai Fonnte /validate (maks. 50 nomor per putaran).',
                   nilai: c.WA_DETEKSI_OTOMATIS === '' || c.WA_DETEKSI_OTOMATIS === undefined || String(c.WA_DETEKSI_OTOMATIS) === 'true' }) +
    '<div class="garis"></div><div class="grid-2">' +
    bidangPilih({ id: 'nfBatch', label: 'Batch blast bawaan', nilai: String(c.WA_BATCH_DEFAULT || '20'), opsi: ['10', '20', '50'] }) +
    bidangTeks({ id: 'nfJeda', label: 'Jeda antarpesan (detik)', nilai: c.WA_JEDA_DETIK || '5' }) + '</div><div class="grid-2">' +
    bidangTeks({ id: 'nfNama', label: 'Nama pengirim surel', nilai: c.EMAIL_NAMA_PENGIRIM, placeholder: 'e-SURAT STIS Al-Wafa' }) +
    bidangTeks({ id: 'nfUrl', label: 'Alamat portal ({link})', nilai: c.APP_URL, placeholder: location.origin }) + '</div><div class="grid-2">' +
    bidangPilih({ id: 'nfJam', label: 'Jam kirim pengingat cicilan (WIB)', nilai: String(c.CICILAN_JAM_PENGINGAT || '7'),
      opsi: ['6', '7', '8', '9', '10', '12', '15', '17', '19'].map(function (j) { return { v: j, t: j + '.00' }; }) }) +
    bidangPilih({ id: 'nfMaks', label: 'Maksimal cicilan diajukan mahasiswa', nilai: String(c.CICILAN_MAKS || '4'), opsi: ['2', '3', '4', '5', '6'] }) + '</div>' +
    bidangPilih({ id: 'nfCrm', label: 'Sinkron otomatis CRM tiap', nilai: String(c.CRM_SYNC_MENIT || '30'),
      opsi: [{ v: '15', t: '15 menit' }, { v: '30', t: '30 menit' }, { v: '60', t: '1 jam' }, { v: '360', t: '6 jam' }, { v: '0', t: 'Mati' }] }) +
    (boleh ? '<div class="kanan"><button class="btn btn-utama" id="btnSimpanNf" onclick="simpanAturNotif()"><i class="bi bi-save"></i> Simpan</button></div>'
           : '<div class="tx-sm tx-3">Hanya Super Admin yang dapat mengubah pengaturan.</div>') + '</div>';
}

function simpanAturNotif() {
  var b = el('btnSimpanNf'); tombolSibuk(b, true, 'Menyimpan…');
  kirim('notifConfigSimpan', { config: {
    NOTIF_EMAIL_AKTIF: el('nfEmail').checked ? 'true' : 'false', NOTIF_WA_AKTIF: el('nfWa').checked ? 'true' : 'false',
    WA_DETEKSI_OTOMATIS: el('nfDeteksi').checked ? 'true' : 'false', WA_BATCH_DEFAULT: ambilNilai('nfBatch'),
    WA_JEDA_DETIK: ambilNilai('nfJeda'), EMAIL_NAMA_PENGIRIM: ambilNilai('nfNama'), APP_URL: ambilNilai('nfUrl'),
    CICILAN_JAM_PENGINGAT: ambilNilai('nfJam'), CICILAN_MAKS: ambilNilai('nfMaks'), CRM_SYNC_MENIT: ambilNilai('nfCrm')
  } }).then(function (r) {
    tombolSibuk(b, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    Kom.data.cfg = r.data;
    ['NOTIF_EMAIL_AKTIF', 'NOTIF_WA_AKTIF', 'CICILAN_MAKS', 'CICILAN_JAM_PENGINGAT'].forEach(function (k) { Adm.boot.config[k] = r.data.config[k]; });
    toast('Pengaturan notifikasi disimpan.', 'sukses');
  });
}

/* ══════════════════════════════════════════════════════════════════
   CRM KONTAK
   ══════════════════════════════════════════════════════════════════ */
function renderCrm(w) {
  var h = kepalaHalaman({
    remah: ['Komunikasi', 'CRM Kontak'],
    judul: 'CRM Kontak',
    sub: 'Satu daftar Nama · Surel · WhatsApp dari pengajuan mahasiswa, dosen, dan pengguna (sinkron otomatis), ditambah kontak manual.',
    aksi: (Sesi.boleh('tulis') ? '<button class="btn btn-utama" onclick="bukaFormKontak()"><i class="bi bi-person-plus"></i> Tambah</button>' +
           '<button class="btn btn-garis" onclick="bukaImporKontak()"><i class="bi bi-upload"></i> Impor CSV</button>' : '') +
          '<button class="btn btn-garis" id="btnSinkronCrm" onclick="sinkronCrm()"><i class="bi bi-arrow-repeat"></i> Sinkron</button>' +
          '<button class="btn btn-garis" onclick="lihatDuplikat()"><i class="bi bi-intersect"></i> Duplikat</button>'
  });
  h += '<div id="crmIsi">' + (Crm.data ? '' : '<div class="kartu">' + keadaanMemuat('Memuat kontak…') + '</div>') + '</div>';
  w.innerHTML = h;
  if (Crm.data) gambarCrm();
  muatCrm(false);
}

function muatCrm(paksa) {
  if (Crm._muat) return Crm._muat;
  if (!paksa && Crm.data && Date.now() - Crm._waktu < 30000) return Promise.resolve();
  Crm._muat = kirimBatch([{ action: 'crmList', data: { segar: !!paksa } }, { action: 'crmStats' }]).then(function (r) {
    Crm._muat = null;
    var l = r.crmList || {};
    if (!l.success) { if (el('crmIsi')) el('crmIsi').innerHTML = keadaanKosong('Gagal memuat kontak', l.message || '', 'bi-exclamation-triangle'); return; }
    var lama = JSON.stringify([Crm.data, Crm.stats]);
    Crm.data = l.data; Crm.stats = (r.crmStats || {}).data || null; Crm._waktu = Date.now();
    if (Adm.modulAktif === 'crm' && lama !== JSON.stringify([Crm.data, Crm.stats])) gambarCrm();
  });
  return Crm._muat;
}

function saringKontak() {
  var s = Crm.saring;
  return (Crm.data || []).filter(function (k) {
    if (s.segmen && k.segmen !== s.segmen) return false;
    if (s.statusWa === 'BELUM' && (k.statusWa || !k.noWa)) return false;
    if (s.statusWa && s.statusWa !== 'BELUM' && s.statusWa !== 'OPTOUT' && k.statusWa !== s.statusWa) return false;
    if (s.statusWa === 'OPTOUT' && String(k.optOut) !== 'true') return false;
    if (s.tag && String(k.tag || '').toLowerCase().indexOf(s.tag.toLowerCase()) < 0) return false;
    if (s.cari && (k.nama + ' ' + k.email + ' ' + k.noWa + ' ' + k.refId + ' ' + k.info).toLowerCase().indexOf(s.cari.toLowerCase()) < 0) return false;
    return true;
  });
}

function gambarCrm() {
  var w = el('crmIsi');
  if (!w) return;
  var st = Crm.stats || {};
  var data = saringKontak();
  var segmen = Object.keys(st.segmen || {});
  var dipilih = Object.keys(Crm.pilih).filter(function (k) { return Crm.pilih[k]; }).length;
  var h = '<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
    kartuKpi('Total Kontak', st.total || 0, 'kontak', 'bi-person-rolodex', 'biru', '<span class="tx-3">sinkron ' + (st.sinkronTerakhir ? tglJam(st.sinkronTerakhir) : '-') + '</span>') +
    kartuKpi('WA Terverifikasi', st.waTerdaftar || 0, '', 'bi-whatsapp', 'hijau', '<span class="tx-3">belum dicek ' + (st.waBelumCek || 0) + '</span>') +
    kartuKpi('Tidak Terdaftar WA', st.waTidak || 0, '', 'bi-telephone-x', 'merah', '') +
    kartuKpi('Opt-out', st.optOut || 0, '', 'bi-bell-slash', 'abu', '<span class="tx-3">tidak menerima blast</span>') + '</div>';

  h += '<div class="kartu kartu-rapat"><div class="tabel-alat bungkus g8">' +
    '<div class="cari"><i class="bi bi-search"></i><input type="search" value="' + esc(Crm.saring.cari) + '" placeholder="Cari nama, surel, nomor, NIM…" oninput="cariKontak(this.value)"></div>' +
    '<select style="width:auto" onchange="Crm.saring.segmen=this.value;Adm.halaman.crmTbl=1;gambarCrm()"><option value="">Semua segmen</option>' +
    segmen.map(function (s) { return '<option' + (Crm.saring.segmen === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
    '<select style="width:auto" onchange="Crm.saring.statusWa=this.value;Adm.halaman.crmTbl=1;gambarCrm()">' +
    [['', 'Semua status WA'], ['TERDAFTAR', 'Terdaftar WA'], ['TIDAK_TERDAFTAR', 'Tidak terdaftar'], ['BELUM', 'Belum dicek'], ['OPTOUT', 'Opt-out']]
      .map(function (o) { return '<option value="' + o[0] + '"' + (Crm.saring.statusWa === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
    '<div class="sisa"></div><span class="lencana neut">' + data.length + ' kontak</span></div>';

  if (dipilih && Sesi.boleh('tulis')) {
    h += '<div class="aksi-massal"><b>' + dipilih + ' dipilih</b>' +
      '<button class="btn btn-garis btn-sm" onclick="aksiMassalCrm(\'tagTambah\')"><i class="bi bi-tag"></i> + Tag</button>' +
      '<button class="btn btn-garis btn-sm" onclick="aksiMassalCrm(\'tagHapus\')"><i class="bi bi-tag"></i> − Tag</button>' +
      '<button class="btn btn-garis btn-sm" onclick="aksiMassalCrm(\'cekWa\')"><i class="bi bi-whatsapp"></i> Cek WA</button>' +
      '<button class="btn btn-garis btn-sm" onclick="aksiMassalCrm(\'optOut\')"><i class="bi bi-bell-slash"></i> Opt-out</button>' +
      '<button class="btn btn-garis btn-sm" onclick="aksiMassalCrm(\'optIn\')"><i class="bi bi-bell"></i> Opt-in</button>' +
      '<button class="btn btn-garis btn-sm" onclick="eksporKontak(true)"><i class="bi bi-filetype-csv"></i> Ekspor</button>' +
      '<button class="btn btn-hantu btn-sm" onclick="aksiMassalCrm(\'hapus\')"><i class="bi bi-trash"></i> Hapus (manual)</button>' +
      '<button class="btn btn-hantu btn-sm" onclick="Crm.pilih={};gambarCrm()">Batal pilih</button></div>';
  }

  var baris = data.map(function (k) {
    return {
      id: k.id, noWa: k.noWa,
      _pilih: '<input type="checkbox" style="width:auto"' + (Crm.pilih[k.id] ? ' checked' : '') + ' onclick="event.stopPropagation();Crm.pilih[\'' + k.id + '\']=this.checked;gambarCrm()">',
      _nama: '<div class="t-judul">' + esc(k.nama) + '</div><div class="tx-xs tx-3">' + esc(k.info || k.sumber || '') + '</div>',
      _kontak: '<div class="tx-sm mono">' + esc(k.noWa || '—') + ' ' + (k.statusWa === 'TERDAFTAR' ? '<i class="bi bi-patch-check-fill tx-ok" title="Terdaftar WhatsApp"></i>' :
               k.statusWa === 'TIDAK_TERDAFTAR' ? '<i class="bi bi-x-circle" style="color:var(--dang-fg)" title="Tidak terdaftar WhatsApp"></i>' : '') + '</div>' +
               '<div class="tx-xs tx-3">' + esc(k.email || '') + '</div>',
      segmen: k.segmen,
      _tag: (k.tag ? String(k.tag).split(',').map(function (t) { return t.trim() ? '<span class="lencana neut">' + esc(t.trim()) + '</span>' : ''; }).join(' ') : '') +
            (String(k.optOut) === 'true' ? ' <span class="lencana dang">opt-out</span>' : ''),
      _pesan: '<span class="tx-sm">' + (Number(k.jumlahPesan) || 0) + '</span>' + (k.terakhirDihubungi ? '<div class="tx-xs tx-3">' + tglJam(k.terakhirDihubungi) + '</div>' : '')
    };
  });
  h += bangunTabel({
    data: baris, idTabel: 'crmTbl', halaman: Adm.halaman.crmTbl || 1, perHalaman: 25,
    kolom: [{ k: '_pilih', l: '', tipe: 'html' }, { k: '_nama', l: 'Nama', tipe: 'html' }, { k: '_kontak', l: 'WhatsApp · Surel', tipe: 'html' },
            { k: 'segmen', l: 'Segmen' }, { k: '_tag', l: 'Tag', tipe: 'html' }, { k: '_pesan', l: 'Pesan', tipe: 'html' }],
    judulKosong: 'Belum ada kontak', deskKosong: 'Klik Sinkron untuk mengambil kontak dari data pengajuan & pengguna.', ikonKosong: 'bi-person-rolodex',
    aksi: function (k) {
      return '<button class="btn btn-hantu btn-ikon" title="Detail" onclick="detailKontak(\'' + k.id + '\')"><i class="bi bi-eye"></i></button>' +
        (k.noWa ? '<a class="btn btn-hantu btn-ikon" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(k.noWa).replace(/\D/g, '').replace(/^0/, '62')) +
         '"><i class="bi bi-whatsapp"></i></a>' : '');
    }
  });
  h += '<div class="baris g8 mt12"><button class="btn btn-hantu btn-sm" onclick="pilihSemuaKontak()"><i class="bi bi-check2-square"></i> Pilih semua hasil saringan</button>' +
       '<button class="btn btn-hantu btn-sm" onclick="eksporKontak(false)"><i class="bi bi-filetype-csv"></i> Ekspor hasil saringan</button></div></div>';
  w.innerHTML = h;
}

var cariKontak = tunda(function (v) {
  Crm.saring.cari = v; Adm.halaman.crmTbl = 1; gambarCrm();
  var i = $('#crmIsi .cari input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}, 250);

function pilihSemuaKontak() { saringKontak().forEach(function (k) { Crm.pilih[k.id] = true; }); gambarCrm(); }
function idTerpilihCrm() { return Object.keys(Crm.pilih).filter(function (k) { return Crm.pilih[k]; }); }

function aksiMassalCrm(aksi) {
  var ids = idTerpilihCrm();
  if (!ids.length) return;
  var nilai = '';
  if (aksi === 'tagTambah' || aksi === 'tagHapus') {
    nilai = window.prompt(aksi === 'tagTambah' ? 'Tag yang ditambahkan:' : 'Tag yang dihapus:', '');
    if (!nilai) return;
  }
  var lanjut = function () {
    toast('Memproses ' + ids.length + ' kontak…', 'info', 2000);
    kirim('crmBulk', { ids: ids, aksi: aksi, nilai: nilai }, 120000).then(function (r) {
      toast(r.message, r.success ? 'sukses' : 'galat', 6000);
      if (r.success) { if (aksi === 'hapus') Crm.pilih = {}; muatCrm(true); }
    });
  };
  if (aksi === 'hapus') konfirmasi({ judul: 'Hapus Kontak', pesan: 'Hanya kontak manual yang dihapus. Kontak hasil sinkron tetap ada.', ya: 'Hapus', bahaya: true }).then(function (y) { if (y) lanjut(); });
  else lanjut();
}

function eksporKontak(terpilih) {
  var ids = terpilih ? idTerpilihCrm() : null;
  var data = saringKontak().filter(function (k) { return !ids || ids.indexOf(k.id) >= 0; });
  var kolom = [{ k: 'nama', l: 'Nama' }, { k: 'email', l: 'Surel' }, { k: 'noWa', l: 'WhatsApp' }, { k: 'segmen', l: 'Segmen' },
    { k: 'sumber', l: 'Sumber' }, { k: 'refId', l: 'NIM/NUPTK/ID' }, { k: 'tag', l: 'Tag' }, { k: 'statusWa', l: 'Status WA' },
    { k: 'optOut', l: 'Opt-out' }, { k: 'jumlahPesan', l: 'Jumlah Pesan' }, { k: 'info', l: 'Info' }, { k: 'catatan', l: 'Catatan' }];
  unduhBerkas('kontak-esurat-' + (typeof hariIniIso === 'function' ? hariIniIso() : Date.now()) + '.csv', keCsv(kolom, data));
}

function sinkronCrm() {
  var b = el('btnSinkronCrm'); tombolSibuk(b, true, 'Sinkron…');
  kirim('crmSync', {}, 120000).then(function (r) { tombolSibuk(b, false); toast(r.message, r.success ? 'sukses' : 'galat'); if (r.success) muatCrm(true); });
}

function bukaFormKontak(id) {
  var k = id ? (Crm.data || []).filter(function (x) { return x.id === id; })[0] : null;
  var manual = !k || k.sumber === 'Manual';
  bukaModal({
    judul: k ? 'Ubah Kontak' : 'Tambah Kontak Manual',
    sub: k && !manual ? 'Kontak hasil sinkron — nama/nomor/surel ikut data sumber; tag, catatan & opt-out dapat diubah.' : '',
    isi: (manual ? bidangTeks({ id: 'ktNama', label: 'Nama', wajib: true, nilai: k && k.nama }) +
      '<div class="grid-2">' + bidangTeks({ id: 'ktWa', label: 'Nomor WhatsApp', nilai: k && k.noWa, placeholder: '0812…' }) +
      bidangTeks({ id: 'ktEmail', label: 'Surel', tipe: 'email', nilai: k && k.email }) + '</div>' +
      bidangPilih({ id: 'ktSegmen', label: 'Segmen', nilai: (k && k.segmen) || 'Umum', opsi: ['Umum', 'Mahasiswa', 'Dosen', 'Staf', 'Orang Tua', 'Mitra', 'Alumni'] })
      : '<div class="grid-2">' + miniInfo('Nama', k.nama) + miniInfo('WhatsApp', k.noWa) + '</div>') +
      bidangTeks({ id: 'ktTag', label: 'Tag (pisahkan koma)', nilai: k && k.tag }) +
      bidangArea({ id: 'ktCatatan', label: 'Catatan', baris: 2, nilai: k && k.catatan }) +
      bidangSaklar({ id: 'ktOptOut', label: 'Opt-out (tidak menerima blast)', nilai: k && String(k.optOut) === 'true' }),
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnSimpanKontak" onclick="simpanKontak(\'' + (id || '') + '\')"><i class="bi bi-save"></i> Simpan</button>'
  });
}

function simpanKontak(id) {
  var d = { id: id, tag: ambilNilai('ktTag'), catatan: ambilNilai('ktCatatan'), optOut: el('ktOptOut').checked ? 'true' : 'false' };
  if (el('ktNama')) { d.nama = ambilNilai('ktNama'); d.noWa = ambilNilai('ktWa'); d.email = ambilNilai('ktEmail'); d.segmen = ambilNilai('ktSegmen'); }
  var b = el('btnSimpanKontak'); tombolSibuk(b, true, 'Menyimpan…');
  kirim('crmSimpan', { data: d }).then(function (r) {
    tombolSibuk(b, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal(); toast(r.message, 'sukses'); muatCrm(true);
  });
}

function detailKontak(id) {
  bukaModal({ judul: 'Detail Kontak', isi: keadaanMemuat('Memuat riwayat…'), kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' });
  kirim('crmDetail', { id: id }).then(function (r) {
    if (!r.success) { tutupModal(); toast(r.message, 'galat'); return; }
    tutupModal();
    var k = r.data.kontak;
    var isi = '<div class="baris g12 mb12"><div class="avatar" style="width:44px;height:44px">' + inisial(k.nama) + '</div><div class="sisa">' +
      '<div class="tebal">' + esc(k.nama) + '</div><div class="tx-sm tx-3">' + esc(k.segmen) + ' · ' + esc(k.sumber) + (k.refId ? ' · ' + esc(k.refId) : '') + '</div></div></div>' +
      '<div class="grid-2">' + miniInfo('WhatsApp', (k.noWa || '-') + (k.statusWa ? ' · ' + k.statusWa : '')) + miniInfo('Surel', k.email) + '</div>' +
      (k.info ? '<div class="tx-sm tx-2 mt8">' + esc(k.info) + '</div>' : '') +
      (r.data.pengajuan.length ? '<div class="label-kecil mt16 mb8">Pengajuan</div>' + r.data.pengajuan.map(function (p) {
        return '<div class="baris antara g8 tx-sm mb4"><span class="mono">' + esc(p.noRef) + '</span><span class="sisa">' + esc(potong(p.perihal, 50)) + '</span>' + lencanaStatus(p.status) + '</div>';
      }).join('') : '') +
      (r.data.cicilan.length ? '<div class="label-kecil mt16 mb8">Cicilan</div>' + r.data.cicilan.map(function (c) {
        return '<div class="baris antara g8 tx-sm mb4"><span>Ke-' + esc(c.cicilanKe) + '</span><span class="mono">' + rupiah(c.nominal) + '</span><span>' +
          (typeof tglIndoPendek === 'function' ? tglIndoPendek(c.jatuhTempo) : c.jatuhTempo) + '</span>' + lencanaStatus(c.keadaan || c.status) + '</div>';
      }).join('') : '') +
      '<div class="label-kecil mt16 mb8">Riwayat Interaksi (' + r.data.interaksi.length + ')</div>' +
      (r.data.interaksi.length ? r.data.interaksi.slice(0, 25).map(function (x) {
        return '<div class="tx-sm mb6"><span class="tx-3">' + tglJam(x.tanggal) + ' · ' + esc(x.kanal) + ' · ' + esc(x.arah) + '</span><br>' + esc(x.ringkasan) + '</div>';
      }).join('') : '<div class="tx-sm tx-3">Belum ada interaksi tercatat.</div>') +
      (Sesi.boleh('tulis') ? '<div class="garis"></div>' + bidangArea({ id: 'intRingkas', label: 'Catat interaksi (telepon, kunjungan, dll.)', baris: 2 }) : '');
    bukaModal({
      judul: 'Detail Kontak', isi: isi,
      kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' +
        (Sesi.boleh('tulis') ? '<button class="btn btn-garis" onclick="tutupModal();bukaFormKontak(\'' + k.id + '\')"><i class="bi bi-pencil"></i> Ubah</button>' +
          '<button class="btn btn-utama" onclick="catatInteraksi(\'' + k.id + '\')"><i class="bi bi-journal-plus"></i> Catat</button>' : '')
    });
  });
}

function catatInteraksi(id) {
  var t = ambilNilai('intRingkas');
  if (t.length < 3) { toast('Tulis ringkasan interaksi.', 'peringatan'); return; }
  kirim('crmInteraksi', { kontakId: id, kanal: 'Catatan', ringkasan: t }).then(function (r) {
    toast(r.message, r.success ? 'sukses' : 'galat');
    if (r.success) { tutupModal(); detailKontak(id); }
  });
}

function bukaImporKontak() {
  bukaModal({
    judul: 'Impor Kontak (CSV)',
    sub: 'Kolom: nama, noWa (atau whatsapp/hp), email, segmen, tag, catatan. Baris pertama = judul kolom. Duplikat otomatis dilewati.',
    isi: '<label class="jatuhkan" style="display:block"><i class="bi bi-filetype-csv j-ikon"></i><div class="j-judul">Pilih berkas .csv</div>' +
      '<input type="file" accept=".csv,text/csv" style="display:none" onchange="bacaCsvKontak(this)"></label>' +
      bidangArea({ id: 'csvTeks', label: 'atau tempel isi CSV', baris: 6, placeholder: 'nama,noWa,email,segmen,tag\nBudi,08123456789,budi@x.id,Orang Tua,wali-2024' }) +
      '<div id="csvInfo" class="tx-sm tx-2"></div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnImporKontak" onclick="imporKontak()"><i class="bi bi-upload"></i> Impor</button>'
  });
}

function bacaCsvKontak(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  var fr = new FileReader();
  fr.onload = function () { el('csvTeks').value = String(fr.result || '').replace(/^﻿/, ''); el('csvInfo').textContent = f.name + ' dimuat.'; };
  fr.readAsText(f);
}

function uraiCsv(teks) {
  var baris = [], sel = '', row = [], kutip = false;
  var pemisah = (teks.split('\n')[0].match(/;/g) || []).length > (teks.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (var i = 0; i < teks.length; i++) {
    var c = teks[i];
    if (kutip) { if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; } else if (c === '"') kutip = false; else sel += c; continue; }
    if (c === '"') kutip = true;
    else if (c === pemisah) { row.push(sel); sel = ''; }
    else if (c === '\n') { row.push(sel); baris.push(row); row = []; sel = ''; }
    else if (c !== '\r') sel += c;
  }
  if (sel || row.length) { row.push(sel); baris.push(row); }
  return baris.filter(function (r) { return r.join('').trim(); });
}

function imporKontak() {
  var b2 = uraiCsv(el('csvTeks').value || '');
  if (b2.length < 2) { toast('Isi CSV minimal baris judul + 1 data.', 'peringatan'); return; }
  var h = b2[0].map(function (x) { return x.trim().toLowerCase().replace(/[^a-z]/g, ''); });
  var peta = { nama: 'nama', name: 'nama', nowa: 'noWa', wa: 'noWa', whatsapp: 'noWa', hp: 'noWa', nohp: 'noWa', telepon: 'noWa',
               email: 'email', surel: 'email', segmen: 'segmen', tag: 'tag', catatan: 'catatan' };
  var rows = b2.slice(1).map(function (r) {
    var o = {};
    h.forEach(function (k, i) { if (peta[k]) o[peta[k]] = (r[i] || '').trim(); });
    return o;
  });
  var b = el('btnImporKontak'); tombolSibuk(b, true, 'Mengimpor…');
  kirim('crmImport', { baris: rows }, 120000).then(function (r) {
    tombolSibuk(b, false);
    toast(r.message, r.success ? 'sukses' : 'galat', 7000);
    if (r.success) { tutupModal(); muatCrm(true); }
  });
}

function lihatDuplikat() {
  bukaModal({ judul: 'Kontak Ganda', isi: keadaanMemuat('Mencari kontak ganda…'), kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' });
  kirim('crmDuplikat', {}).then(function (r) {
    tutupModal();
    if (!r.success) { toast(r.message, 'galat'); return; }
    var d = r.data || [];
    bukaModal({
      judul: 'Kontak Ganda (' + d.length + ' grup)',
      sub: 'Gabungkan kontak manual ke kontak utama (tag, catatan & jumlah pesan digabung).',
      isi: d.length ? d.slice(0, 40).map(function (g, gi) {
        return '<div class="kartu kartu-rapat mb12"><div class="label-kecil mb8">' + esc(g.jenis) + ': <span class="mono">' + esc(g.kunci) + '</span></div>' +
          g.kontak.map(function (k, i) {
            return '<label class="baris g8 tx-sm mb4"><input type="radio" name="dup' + gi + '" value="' + esc(k.id) + '"' + (i === 0 ? ' checked' : '') + ' style="width:auto"> ' +
              esc(k.nama) + ' <span class="tx-3">(' + esc(k.sumber) + ')</span></label>';
          }).join('') +
          (Sesi.boleh('tulis') ? '<button class="btn btn-garis btn-sm mt8" onclick="gabungDuplikat(' + gi + ')">Gabung ke yang dipilih</button>' : '') + '</div>';
      }).join('') : keadaanKosong('Tidak ada kontak ganda', '', 'bi-check-circle'),
      kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>'
    });
    Crm.duplikat = d;
  });
}

function gabungDuplikat(gi) {
  var g = Crm.duplikat[gi];
  var r0 = $('input[name="dup' + gi + '"]:checked');
  if (!g || !r0) return;
  var utama = r0.value;
  kirim('crmMerge', { utama: utama, lain: g.kontak.map(function (k) { return k.id; }).filter(function (id) { return id !== utama; }) }).then(function (r) {
    toast(r.message, r.success ? 'sukses' : 'galat', 7000);
    if (r.success) { tutupModal(); muatCrm(true); }
  });
}
