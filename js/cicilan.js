/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/cicilan.js  (v4.4 · berkas BARU)
   Rencana pembayaran mahasiswa (Dispensasi Cicilan / Keringanan Asrama /
   Penundaan Pembayaran):
   · Komponen isian rencana (maks. 4x): total tagihan, jumlah cicilan,
     nominal & jatuh tempo tiap cicilan — dipakai di formulir publik,
     perbaikan revisi, dan panel verifikasi
   · Halaman "Monitoring Cicilan" (rekap, tandai lunas, pengingat, ekspor)
   · Ringkasan di halaman Pengajuan Mahasiswa, lonceng & popup Super Admin
   Dimuat SETELAH admin.js & publik.js, SEBELUM app.js.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Lencana status cicilan ─────────────────────────────────────── */
(function () {
  if (typeof GAYA_STATUS === 'undefined') return;
  var t = {
    BELUM:       { kelas: 'neut', teks: 'Belum Lunas',  ikon: 'bi-hourglass' },
    LUNAS:       { kelas: 'ok',   teks: 'Lunas',        ikon: 'bi-check-circle-fill' },
    BATAL:       { kelas: 'neut', teks: 'Batal',        ikon: 'bi-slash-circle' },
    TERLAMBAT:   { kelas: 'dang', teks: 'Terlambat',    ikon: 'bi-exclamation-octagon' },
    JATUH_TEMPO: { kelas: 'dang', teks: 'Jatuh Tempo Hari Ini', ikon: 'bi-alarm' },
    SEGERA:      { kelas: 'warn', teks: '≤ 3 Hari',     ikon: 'bi-bell' },
    MENDEKATI:   { kelas: 'info', teks: '≤ 7 Hari',     ikon: 'bi-calendar-event' },
    DIAJUKAN:    { kelas: 'info', teks: 'Diajukan',     ikon: 'bi-send' }
  };
  Object.keys(t).forEach(function (k) { if (!GAYA_STATUS[k]) GAYA_STATUS[k] = t[k]; });
})();

function angkaRp(v) {
  if (typeof v === 'number') return Math.round(v);
  var s = String(v || '').replace(/[^\d]/g, '');
  return s ? Number(s) : 0;
}
function formatRibuan(n) { return n ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''; }
function rpPendek(n) { return 'Rp' + (formatRibuan(Number(n) || 0) || '0'); }
/** Kartu KPI bernilai rupiah (format sama dengan kartuKpi). */
function kartuKpiRp(label, nilai, ikon, warna, kaki) {
  return '<div class="kpi"><div class="kpi-atas"><div class="kpi-label">' + label + '</div>' +
    '<div class="kpi-ikon ' + warna + '"><i class="bi ' + ikon + '"></i></div></div>' +
    '<div class="kpi-nilai"><small style="margin:0 3px 0 0">Rp</small>' + (formatRibuan(Number(nilai) || 0) || '0') + '</div>' +
    (kaki ? '<div class="kpi-kaki">' + kaki + '</div>' : '') + '</div>';
}
function hariIniIso() {
  var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function tambahBulanIso(iso, n) {
  var d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  var hari = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  var akhir = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(hari, akhir));
  var p = function (x) { return (x < 10 ? '0' : '') + x; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function tglIndoPendek(iso) {
  if (!iso) return '—';
  var b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var s = String(iso).substring(0, 10).split('-');
  return Number(s[2]) + ' ' + b[Number(s[1]) - 1] + ' ' + s[0];
}
function maksCicilan() {
  var a = Adm && Adm.boot && Adm.boot.config ? Number(Adm.boot.config.CICILAN_MAKS) : 0;
  var b = Publik && Publik.data && Publik.data.tampilan ? Number(Publik.data.tampilan.cicilanMaks) : 0;
  return Math.max(1, Math.min(12, a || b || 4));
}

/* ══════════════════════════════════════════════════════════════════
   1. KOMPONEN ISIAN RENCANA PEMBAYARAN (pre = awalan id unik)
   ══════════════════════════════════════════════════════════════════ */
var RencanaCicilan = {};   // pre → {total, jumlah, baris:[{nominal, jatuhTempo}], awal}

function rencanaCicilanHtml(pre, data, opsi) {
  opsi = opsi || {};
  data = data || {};
  var rencana = (data.rencana || []).map(function (r) { return { nominal: angkaRp(r.nominal), jatuhTempo: String(r.jatuhTempo || '').substring(0, 10) }; });
  var jumlah = Number(data.jumlahCicilan) || rencana.length || 0;
  RencanaCicilan[pre] = { total: angkaRp(data.totalTagihan), jumlah: jumlah, baris: rencana, bacaSaja: !!opsi.bacaSaja };
  RencanaCicilan[pre].awal = JSON.stringify([RencanaCicilan[pre].total, rencana]);
  var maks = maksCicilan();
  var opsiJumlah = '<option value="">— Pilih —</option>';
  for (var i = 1; i <= maks; i++) opsiJumlah += '<option value="' + i + '"' + (i === jumlah ? ' selected' : '') + '>' + i + ' kali' + (i === 1 ? ' (sekali bayar)' : '') + '</option>';

  return '<div class="cicilan-kartu" id="' + pre + 'Wadah">' +
    (opsi.judul ? '<div class="label-kecil mb8"><i class="bi bi-calendar2-check"></i> ' + esc(opsi.judul) + '</div>' : '') +
    (opsi.keterangan ? '<div class="tx-sm tx-2 mb12" style="line-height:1.6">' + opsi.keterangan + '</div>' : '') +
    '<div class="grid-2">' +
    '<div class="bidang"><label for="' + pre + 'Total">Total tagihan yang diajukan (Rp) <span class="wajib">*</span></label>' +
    '<div class="masukan-rp"><span>Rp</span><input type="text" inputmode="numeric" id="' + pre + 'Total" value="' +
      esc(formatRibuan(RencanaCicilan[pre].total)) + '" placeholder="Contoh: 4.500.000"' + (opsi.bacaSaja ? ' readonly' : '') +
      ' oninput="ubahTotalCicilan(\'' + pre + '\',this)"></div>' +
    '<div class="pesan-galat">Total tagihan wajib diisi.</div></div>' +
    '<div class="bidang"><label for="' + pre + 'Jumlah">Dibayar berapa kali? (maks. ' + maks + 'x) <span class="wajib">*</span></label>' +
    '<select id="' + pre + 'Jumlah"' + (opsi.bacaSaja ? ' disabled' : '') + ' onchange="ubahJumlahCicilan(\'' + pre + '\',this.value)">' + opsiJumlah + '</select>' +
    '<div class="pesan-galat">Pilih jumlah cicilan.</div></div></div>' +
    '<div id="' + pre + 'Baris"></div>' +
    '<div class="baris g8 bungkus mt8" id="' + pre + 'Bantu"' + (opsi.bacaSaja ? ' hidden' : '') + '>' +
    '<button type="button" class="btn btn-garis btn-sm" onclick="bagiRataCicilan(\'' + pre + '\')"><i class="bi bi-distribute-horizontal"></i> Bagi rata</button>' +
    '<button type="button" class="btn btn-garis btn-sm" onclick="isiTanggalBulanan(\'' + pre + '\')"><i class="bi bi-calendar-range"></i> Isi tanggal tiap bulan</button>' +
    '</div>' +
    '<div class="cicilan-ringkas mt12" id="' + pre + 'Ringkas"></div></div>';
}

/** Pasang komponen setelah HTML disisipkan ke DOM. */
function pasangRencanaCicilan(pre) {
  gambarBarisCicilan(pre);
}

function gambarBarisCicilan(pre) {
  var st = RencanaCicilan[pre];
  var w = el(pre + 'Baris');
  if (!st || !w) return;
  while (st.baris.length < st.jumlah) st.baris.push({ nominal: 0, jatuhTempo: '' });
  st.baris.length = st.jumlah;
  if (!st.jumlah) { w.innerHTML = ''; ringkasCicilan(pre); return; }
  var kini = hariIniIso();
  w.innerHTML = '<div class="cicilan-tabel">' +
    '<div class="ct-kepala"><span>Pembayaran</span><span>Nominal (Rp)</span><span>Jatuh tempo</span></div>' +
    st.baris.map(function (b, i) {
      return '<div class="ct-baris"><span class="ct-ke">Cicilan ke-' + (i + 1) + '</span>' +
        '<div class="masukan-rp"><span>Rp</span><input type="text" inputmode="numeric" id="' + pre + 'Nom' + i + '" value="' +
          esc(formatRibuan(b.nominal)) + '"' + (st.bacaSaja ? ' readonly' : '') + ' oninput="ubahNominalCicilan(\'' + pre + '\',' + i + ',this)"></div>' +
        '<input type="date" id="' + pre + 'Tgl' + i + '" value="' + esc(b.jatuhTempo || '') + '"' +
          (st.bacaSaja ? ' readonly' : ' min="' + (st.izinkanLampau ? '' : kini) + '"') +
          ' onchange="ubahTanggalCicilan(\'' + pre + '\',' + i + ',this.value)"></div>';
    }).join('') + '</div>';
  ringkasCicilan(pre);
}

function ubahTotalCicilan(pre, input) {
  var st = RencanaCicilan[pre]; if (!st) return;
  st.total = angkaRp(input.value);
  formatMasukanRp(input, st.total);
  ringkasCicilan(pre);
  picuDrafCicilan(pre);
}
function ubahJumlahCicilan(pre, v) {
  var st = RencanaCicilan[pre]; if (!st) return;
  st.jumlah = Number(v) || 0;
  gambarBarisCicilan(pre);
  if (st.jumlah && st.total && st.baris.every(function (b) { return !b.nominal; })) bagiRataCicilan(pre);
  picuDrafCicilan(pre);
}
function ubahNominalCicilan(pre, i, input) {
  var st = RencanaCicilan[pre]; if (!st) return;
  st.baris[i].nominal = angkaRp(input.value);
  formatMasukanRp(input, st.baris[i].nominal);
  ringkasCicilan(pre);
  picuDrafCicilan(pre);
}
function ubahTanggalCicilan(pre, i, v) {
  var st = RencanaCicilan[pre]; if (!st) return;
  st.baris[i].jatuhTempo = v;
  ringkasCicilan(pre);
  picuDrafCicilan(pre);
}
function formatMasukanRp(input, n) {
  var pos = input.value.length - input.selectionStart;
  input.value = formatRibuan(n);
  try { var p = Math.max(0, input.value.length - pos); input.setSelectionRange(p, p); } catch (e) {}
}
function picuDrafCicilan(pre) {
  if (pre === 'mc' && typeof simpanDrafOtomatis === 'function') simpanDrafOtomatis('mhs');
}

function bagiRataCicilan(pre) {
  var st = RencanaCicilan[pre]; if (!st) return;
  if (!st.total) { toast('Isi total tagihan terlebih dahulu.', 'info'); return; }
  if (!st.jumlah) { toast('Pilih jumlah cicilan terlebih dahulu.', 'info'); return; }
  var dasar = Math.floor(st.total / st.jumlah / 1000) * 1000 || Math.floor(st.total / st.jumlah);
  st.baris.forEach(function (b, i) { b.nominal = i === st.jumlah - 1 ? st.total - dasar * (st.jumlah - 1) : dasar; });
  gambarBarisCicilan(pre);
  picuDrafCicilan(pre);
}

function isiTanggalBulanan(pre) {
  var st = RencanaCicilan[pre]; if (!st || !st.jumlah) { toast('Pilih jumlah cicilan terlebih dahulu.', 'info'); return; }
  var mulai = st.baris[0] && st.baris[0].jatuhTempo;
  if (!mulai) { toast('Isi tanggal jatuh tempo cicilan ke-1, lalu klik lagi untuk mengisi bulan-bulan berikutnya.', 'info', 6000); return; }
  st.baris.forEach(function (b, i) { if (i > 0) b.jatuhTempo = tambahBulanIso(mulai, i); });
  gambarBarisCicilan(pre);
  picuDrafCicilan(pre);
}

/** Periksa rencana — aturan sama dengan server. @return {ok, galat, data} */
function periksaRencana(pre) {
  var st = RencanaCicilan[pre];
  if (!st) return { ok: false, galat: 'Rencana pembayaran belum diisi.' };
  var maks = maksCicilan();
  if (!(st.total > 0)) return { ok: false, galat: 'Total tagihan wajib diisi.', fokus: pre + 'Total' };
  if (!(st.jumlah >= 1 && st.jumlah <= maks)) return { ok: false, galat: 'Pilih dibayar berapa kali (1–' + maks + ').', fokus: pre + 'Jumlah' };
  var kini = hariIniIso(), jml = 0, sebelum = '';
  for (var i = 0; i < st.jumlah; i++) {
    var b = st.baris[i] || {};
    if (!(b.nominal > 0)) return { ok: false, galat: 'Nominal cicilan ke-' + (i + 1) + ' wajib diisi.', fokus: pre + 'Nom' + i };
    if (!b.jatuhTempo) return { ok: false, galat: 'Tanggal jatuh tempo cicilan ke-' + (i + 1) + ' wajib diisi.', fokus: pre + 'Tgl' + i };
    if (!st.izinkanLampau && b.jatuhTempo < kini) return { ok: false, galat: 'Jatuh tempo cicilan ke-' + (i + 1) + ' tidak boleh sebelum hari ini.', fokus: pre + 'Tgl' + i };
    if (sebelum && b.jatuhTempo <= sebelum) return { ok: false, galat: 'Jatuh tempo cicilan ke-' + (i + 1) + ' harus setelah cicilan ke-' + i + '.', fokus: pre + 'Tgl' + i };
    sebelum = b.jatuhTempo;
    jml += b.nominal;
  }
  if (jml !== st.total) {
    return { ok: false, galat: 'Jumlah seluruh cicilan (' + rupiah(jml) + ') harus sama dengan total tagihan (' + rupiah(st.total) + '). Selisih ' + rupiah(Math.abs(st.total - jml)) + '.' };
  }
  return { ok: true, data: { totalTagihan: st.total, jumlahCicilan: st.jumlah,
    rencana: st.baris.slice(0, st.jumlah).map(function (b, i) { return { ke: i + 1, nominal: b.nominal, jatuhTempo: b.jatuhTempo }; }) } };
}

function ringkasCicilan(pre) {
  var w = el(pre + 'Ringkas'), st = RencanaCicilan[pre];
  if (!w || !st) return;
  if (!st.total && !st.jumlah) { w.innerHTML = ''; return; }
  var jml = st.baris.slice(0, st.jumlah).reduce(function (a, b) { return a + (b.nominal || 0); }, 0);
  var selisih = st.total - jml;
  var p = periksaRencana(pre);
  w.className = 'cicilan-ringkas mt12 ' + (p.ok ? 'ok' : (st.jumlah ? 'peringatan' : ''));
  w.innerHTML = '<i class="bi ' + (p.ok ? 'bi-check-circle-fill' : 'bi-info-circle') + '"></i> ' +
    'Jumlah cicilan <b>' + rupiah(jml) + '</b> dari total <b>' + rupiah(st.total) + '</b>' +
    (selisih ? ' · ' + (selisih > 0 ? 'kurang ' : 'lebih ') + '<b>' + rupiah(Math.abs(selisih)) + '</b>' : '') +
    (p.ok ? ' · rencana valid' : (st.jumlah && !selisih ? ' · ' + esc(p.galat) : ''));
}

/** Nilai mentah untuk draf lokal (tanpa validasi). */
function nilaiRencanaMentah(pre) {
  var st = RencanaCicilan[pre];
  if (!st) return null;
  return { totalTagihan: st.total, jumlahCicilan: st.jumlah, rencana: st.baris.slice(0, st.jumlah) };
}

/* ── Formulir publik mahasiswa ──────────────────────────────────── */
function skemaTerpilihMhs() {
  var r = $('input[name="mhsSkema"]:checked');
  if (!r || !Publik.data) return null;
  return (Publik.data.skema || []).filter(function (s) { return s.nama === r.value; })[0] || null;
}
function skemaPakaiCicilanKlien(s) { return !!(s && (String(s.pakaiCicilan) === 'true' || s.pakaiCicilan === true)); }

function perbaruiSeksiCicilanMhs(drafAwal) {
  var w = el('mhsCicilan');
  if (!w) return;
  var s = skemaTerpilihMhs();
  if (!skemaPakaiCicilanKlien(s)) { w.hidden = true; w.innerHTML = ''; delete RencanaCicilan.mc; return; }
  if (w.dataset.skema === s.nama && RencanaCicilan.mc && !drafAwal) { w.hidden = false; return; }
  var lama = drafAwal || nilaiRencanaMentah('mc');
  w.dataset.skema = s.nama;
  w.hidden = false;
  w.innerHTML = rencanaCicilanHtml('mc', lama, {
    judul: 'Rencana Pembayaran — ' + s.nama,
    keterangan: 'Isi total tagihan, berapa kali Anda akan membayar (maksimal ' + maksCicilan() + 'x), nominal tiap pembayaran, ' +
      'dan tanggal jatuh temponya. <b>Jumlah seluruh cicilan wajib sama dengan total tagihan.</b> Setelah disetujui, ' +
      'Anda akan diingatkan lewat surel/WhatsApp 3 hari sebelum dan pada hari jatuh tempo.'
  });
  pasangRencanaCicilan('mc');
}

/** Dipanggil kirimPengajuanMhs. @return null (skema tanpa cicilan) | {galat} | data */
function rencanaUntukKirimMhs() {
  var s = skemaTerpilihMhs();
  if (!skemaPakaiCicilanKlien(s)) return null;
  var p = periksaRencana('mc');
  if (!p.ok) {
    if (p.fokus && el(p.fokus)) { el(p.fokus).scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { el(p.fokus).focus(); }, 300); }
    return { galat: p.galat };
  }
  return p.data;
}

document.addEventListener('DOMContentLoaded', function () {
  var w = el('mhsSkema');
  if (w) w.addEventListener('click', function () { setTimeout(function () { perbaruiSeksiCicilanMhs(); }, 0); });
});

/* ── Lacak status (publik) ──────────────────────────────────────── */
function kartuCicilanLacak(c) {
  if (!c || !c.rencana || !c.rencana.length) return '';
  var lunas = c.rencana.filter(function (r) { return r.status === 'LUNAS'; }).reduce(function (a, r) { return a + Number(r.nominal || 0); }, 0);
  return '<div class="garis"></div><div class="label-kecil mb8"><i class="bi bi-calendar2-check"></i> Rencana Pembayaran ' +
    (c.tercatat ? '(disetujui)' : '(diajukan)') + '</div>' +
    '<div class="tx-sm tx-2 mb8">Total ' + rupiah(c.totalTagihan) + ' · ' + c.jumlahCicilan + 'x pembayaran' +
    (c.tercatat ? ' · terbayar ' + rupiah(lunas) : '') + '</div>' +
    '<div class="cicilan-tabel baca">' + c.rencana.map(function (r) {
      return '<div class="ct-baris"><span class="ct-ke">Cicilan ke-' + esc(r.ke) + '</span><span class="mono">' + rupiah(r.nominal) + '</span>' +
        '<span>' + tglIndoPendek(r.jatuhTempo) + '</span><span>' + lencanaStatus(r.keadaan || r.status) + '</span></div>';
    }).join('') + '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   2. PANEL VERIFIKASI — tampil & sesuaikan rencana
   ══════════════════════════════════════════════════════════════════ */
function blokCicilanVerifikasi(rec, bolehUbah) {
  if (!(Number(rec.jumlahCicilan) > 0)) return '';
  var rencana = parseAman(rec.rencanaCicilan, []);
  var jadwal = ((Adm.boot.data || {}).cicilan || []).filter(function (j) { return String(j.pengajuanId) === String(rec.id) && j.status !== 'BATAL'; })
    .sort(function (a, b) { return Number(a.cicilanKe) - Number(b.cicilanKe); });
  var h = '<div class="kartu mb16"><div class="kartu-kepala"><div class="baris g8"><i class="bi bi-calendar2-check tx-emas"></i>' +
    '<h3 style="font-size:16px">Rencana Pembayaran</h3></div>' +
    '<span class="chip-nomor">' + rencana.length + 'x · ' + rupiah(rec.totalTagihan) + '</span></div>';
  if (jadwal.length) {
    h += '<div class="tx-sm tx-2 mb8">Jadwal sudah tercatat & dipantau (menu Monitoring Cicilan).</div>' +
      '<div class="cicilan-tabel baca">' + jadwal.map(function (r) {
        return '<div class="ct-baris"><span class="ct-ke">Ke-' + esc(r.cicilanKe) + '</span><span class="mono">' + rupiah(r.nominal) + '</span>' +
          '<span>' + tglIndoPendek(r.jatuhTempo) + '</span><span>' + lencanaStatus(r.keadaan || r.status) + '</span></div>';
      }).join('') + '</div>';
  } else if (bolehUbah) {
    h += rencanaCicilanHtml('vc', { totalTagihan: rec.totalTagihan, jumlahCicilan: rec.jumlahCicilan, rencana: rencana }, {
      keterangan: 'Periksa kesesuaian jumlah pembayaran, nominal, dan tanggal jatuh tempo yang diajukan. ' +
        'Anda dapat menyesuaikannya sebelum menyetujui — perubahan dicatat pada riwayat verifikasi.'
    });
    setTimeout(function () { if (RencanaCicilan.vc) { RencanaCicilan.vc.izinkanLampau = true; pasangRencanaCicilan('vc'); } }, 0);
  } else {
    h += '<div class="cicilan-tabel baca">' + rencana.map(function (r) {
      return '<div class="ct-baris"><span class="ct-ke">Ke-' + esc(r.ke) + '</span><span class="mono">' + rupiah(r.nominal) + '</span>' +
        '<span>' + tglIndoPendek(r.jatuhTempo) + '</span><span>' + lencanaStatus('DIAJUKAN') + '</span></div>';
    }).join('') + '</div>';
  }
  return h + '</div>';
}

/** null = tidak ada/tidak berubah · {galat} · data rencana baru */
function rencanaCicilanVerifikasi() {
  var st = RencanaCicilan.vc;
  if (!st || !el('vcWadah')) return null;
  var p = periksaRencana('vc');
  if (!p.ok) return { galat: 'Rencana pembayaran: ' + p.galat };
  var kini = JSON.stringify([p.data.totalTagihan, p.data.rencana.map(function (r) { return { nominal: r.nominal, jatuhTempo: r.jatuhTempo }; })]);
  if (kini === st.awal) return null;
  return p.data;
}

/* ══════════════════════════════════════════════════════════════════
   3. MONITORING CICILAN (panel admin)
   ══════════════════════════════════════════════════════════════════ */
var Ccl = { saring: 'tindakan', tampilan: 'jadwal', cari: '' };

daftarMenuTambahan({
  kunci: 'cicilan', nama: 'Monitoring Cicilan', ikon: 'bi-calendar2-check', hitungBahaya: true,
  hitung: function (b) { var r = b && b.cicilanRingkas; return r ? (r.terlambat || 0) + (r.jatuhTempo || 0) : 0; }
}, 'pengajuanDosen');

MODUL_TAMBAHAN.cicilan = renderMonitoringCicilan;
HALAMAN_TABEL.cicilanTbl = HALAMAN_TABEL.cicilanMhsTbl = function () { renderModul('cicilan'); };

function dataCicilan() { return ((Adm.boot && Adm.boot.data) || {}).cicilan || []; }
function ringkasCicilanBoot() { return (Adm.boot && Adm.boot.cicilanRingkas) || null; }

function renderMonitoringCicilan(w) {
  var semua = dataCicilan();
  var r = ringkasCicilanBoot() || { pengajuan: 0, totalTagihan: 0, terbayar: 0, sisa: 0, terlambat: 0, jatuhTempo: 0, segera: 0, mendekati: 0, nominalTerlambat: 0, jumlah: 0, lunas: 0 };

  var h = kepalaHalaman({
    remah: ['Layanan Akademik', 'Pengajuan Mahasiswa', 'Monitoring Cicilan'],
    judul: 'Monitoring Cicilan & Pelunasan',
    sub: 'Jadwal pembayaran dari pengajuan Dispensasi Cicilan, Keringanan Asrama & Penundaan yang telah disetujui. ' +
         'Pengingat otomatis H-3 & H-0 dikirim lewat surel/WhatsApp.',
    aksi: '<button class="btn btn-garis" onclick="segarkanCicilan(this)"><i class="bi bi-arrow-repeat"></i> Segarkan</button>' +
          '<button class="btn btn-garis" onclick="eksporCicilan()"><i class="bi bi-filetype-csv"></i> Ekspor</button>'
  });

  h += '<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">' +
    kartuKpi('Pengajuan Cicilan Aktif', r.pengajuan, 'Mahasiswa', 'bi-people', 'biru', '<span class="tx-3">' + r.jumlah + ' jadwal pembayaran</span>') +
    kartuKpiRp('Total Tagihan', r.totalTagihan, 'bi-cash-stack', 'abu', '') +
    kartuKpiRp('Sudah Dibayar', r.terbayar, 'bi-check2-circle', 'hijau',
             '<span class="tx-3">' + r.lunas + ' cicilan lunas · ' + (r.totalTagihan ? Math.round(r.terbayar / r.totalTagihan * 100) : 0) + '%</span>') +
    kartuKpiRp('Sisa Tagihan', r.sisa, 'bi-hourglass-split', 'emas', '') +
    kartuKpi('Terlambat', r.terlambat, 'Cicilan', 'bi-exclamation-octagon', 'merah', '<span class="tx-3">' + rpPendek(r.nominalTerlambat) + '</span>') +
    kartuKpi('Jatuh Tempo ≤ 7 Hari', (r.jatuhTempo || 0) + (r.segera || 0) + (r.mendekati || 0), 'Cicilan', 'bi-alarm', 'emas',
             '<span class="tx-3">hari ini ' + (r.jatuhTempo || 0) + ' · ≤3 hari ' + (r.segera || 0) + '</span>') +
    '</div>';

  var hitung = {
    tindakan: semua.filter(function (x) { return x.status === 'BELUM' && x.sisaHari !== null && x.sisaHari <= 3; }).length,
    belum: semua.filter(function (x) { return x.status === 'BELUM'; }).length,
    lunas: semua.filter(function (x) { return x.status === 'LUNAS'; }).length,
    semua: semua.filter(function (x) { return x.status !== 'BATAL'; }).length,
    batal: semua.filter(function (x) { return x.status === 'BATAL'; }).length
  };
  h += '<div class="baris antara g10 bungkus mb16"><div class="pub-tab" style="padding:4px">' +
    tombolSaringCcl('tindakan', 'Perlu Tindakan', hitung.tindakan) + tombolSaringCcl('belum', 'Belum Lunas', hitung.belum) +
    tombolSaringCcl('lunas', 'Lunas', hitung.lunas) + tombolSaringCcl('semua', 'Semua', hitung.semua) +
    (hitung.batal ? tombolSaringCcl('batal', 'Batal', hitung.batal) : '') + '</div>' +
    '<div class="pub-tab" style="padding:4px">' +
    '<button class="' + (Ccl.tampilan === 'jadwal' ? 'aktif' : '') + '" onclick="Ccl.tampilan=\'jadwal\';renderModul(\'cicilan\')"><i class="bi bi-list-ol"></i> Per Jadwal</button>' +
    '<button class="' + (Ccl.tampilan === 'mahasiswa' ? 'aktif' : '') + '" onclick="Ccl.tampilan=\'mahasiswa\';renderModul(\'cicilan\')"><i class="bi bi-person-lines-fill"></i> Per Mahasiswa</button>' +
    '</div></div>';

  var data = saringCicilan(semua);
  h += '<div class="kartu kartu-rapat"><div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" value="' + esc(Ccl.cari) + '" placeholder="Cari nama, NIM, nomor referensi…" oninput="cariCicilan(this.value)"></div>' +
    '<div class="sisa"></div>' +
    (Sesi.boleh('tulis') && Ccl.tampilan === 'jadwal' && data.some(function (x) { return x.status === 'BELUM'; })
      ? '<button class="btn btn-garis btn-sm" onclick="pengingatMassal()"><i class="bi bi-whatsapp"></i> Kirim pengingat (tampil)</button>' : '') +
    '<span class="lencana neut">' + data.length + ' baris</span></div>' +
    (Ccl.tampilan === 'mahasiswa' ? tabelPerMahasiswa(data) : tabelPerJadwal(data)) + '</div>';

  w.innerHTML = h;
}

function tombolSaringCcl(k, label, n) {
  return '<button class="' + (Ccl.saring === k ? 'aktif' : '') + '" onclick="Ccl.saring=\'' + k + '\';Adm.halaman.cicilanTbl=1;renderModul(\'cicilan\')">' +
    esc(label) + (n ? ' <span class="lencana ' + (Ccl.saring === k ? 'emas' : 'neut') + '" style="height:19px;font-size:10px">' + n + '</span>' : '') + '</button>';
}

function saringCicilan(semua) {
  var d = semua.filter(function (x) {
    if (Ccl.saring === 'tindakan') return x.status === 'BELUM' && x.sisaHari !== null && x.sisaHari <= 3;
    if (Ccl.saring === 'belum') return x.status === 'BELUM';
    if (Ccl.saring === 'lunas') return x.status === 'LUNAS';
    if (Ccl.saring === 'batal') return x.status === 'BATAL';
    return x.status !== 'BATAL';
  });
  if (Ccl.cari) {
    var q = Ccl.cari.toLowerCase();
    d = d.filter(function (x) { return (x.nama + ' ' + x.nim + ' ' + x.noRef + ' ' + x.skema + ' ' + x.prodi).toLowerCase().indexOf(q) >= 0; });
  }
  return d.sort(function (a, b) {
    if (a.status === 'BELUM' && b.status !== 'BELUM') return -1;
    if (b.status === 'BELUM' && a.status !== 'BELUM') return 1;
    return String(a.jatuhTempo).localeCompare(String(b.jatuhTempo));
  });
}

var cariCicilan = tunda(function (v) { Ccl.cari = v; Adm.halaman.cicilanTbl = 1; renderModul('cicilan'); var i = $('#admKonten .tabel-alat input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);

function teksSisaHari(x) {
  if (x.status === 'LUNAS') return '<span class="tx-sm tx-3">dibayar ' + tglIndoPendek(x.tanggalBayar) + '</span>';
  if (x.status === 'BATAL') return '<span class="tx-sm tx-3">dibatalkan</span>';
  if (x.sisaHari === null || x.sisaHari === undefined) return '';
  if (x.sisaHari < 0) return '<span class="tx-sm" style="color:var(--dang-fg)">lewat ' + Math.abs(x.sisaHari) + ' hari</span>';
  if (x.sisaHari === 0) return '<span class="tx-sm" style="color:var(--dang-fg)">hari ini</span>';
  return '<span class="tx-sm tx-2">' + x.sisaHari + ' hari lagi</span>';
}

function tabelPerJadwal(data) {
  var baris = data.map(function (x) {
    var o = {};
    for (var k in x) o[k] = x[k];
    o._ke = 'Ke-' + x.cicilanKe + ' dari ' + x.jumlahCicilan;
    o._nominal = '<span class="mono">' + rupiah(x.nominal) + '</span>';
    o._jt = '<span class="tnum">' + tglIndoPendek(x.jatuhTempo) + '</span><br>' + teksSisaHari(x);
    o._st = lencanaStatus(x.keadaan || x.status);
    o._mhs = '<div class="t-judul">' + esc(x.nama) + '</div><div class="tx-xs tx-3 mono">' + esc(x.nim || '') + ' · ' + esc(x.noRef || '') + '</div>';
    return o;
  });
  return bangunTabel({
    data: baris, idTabel: 'cicilanTbl', halaman: Adm.halaman.cicilanTbl || 1,
    kolom: [
      { k: '_mhs', l: 'Mahasiswa', tipe: 'html' },
      { k: 'skema', l: 'Skema' },
      { k: '_ke', l: 'Cicilan' },
      { k: '_nominal', l: 'Nominal', tipe: 'html' },
      { k: '_jt', l: 'Jatuh Tempo', tipe: 'html' },
      { k: '_st', l: 'Status', tipe: 'html' }
    ],
    judulKosong: Ccl.saring === 'tindakan' ? 'Tidak ada cicilan yang perlu ditindaklanjuti' : 'Belum ada data cicilan',
    deskKosong: 'Jadwal tercatat otomatis saat pengajuan skema cicilan disetujui seluruh jenjang.',
    ikonKosong: 'bi-calendar2-check',
    aksi: function (x) {
      var a = '<button class="btn btn-hantu btn-ikon" title="Detail & ubah jadwal" onclick="detailCicilan(\'' + x.id + '\')"><i class="bi bi-eye"></i></button>';
      if (x.status === 'BELUM' && Sesi.boleh('tulis')) {
        a += '<button class="btn btn-ok btn-sm" onclick="bukaTandaiLunas(\'' + x.id + '\')"><i class="bi bi-check2-circle"></i> Lunas</button>' +
             '<button class="btn btn-hantu btn-ikon" title="Kirim pengingat sekarang" onclick="kirimPengingatCicilan([\'' + x.id + '\'])"><i class="bi bi-bell"></i></button>';
      }
      if (x.whatsapp) a += '<a class="btn btn-hantu btn-ikon" title="Chat WhatsApp" target="_blank" rel="noopener" href="https://wa.me/' +
                           esc(String(x.whatsapp).replace(/\D/g, '')) + '"><i class="bi bi-whatsapp"></i></a>';
      return a;
    }
  });
}

/** Rekap per pengajuan (mahasiswa). */
function rekapPerMahasiswa(data) {
  var peta = {}, urut = [];
  data.forEach(function (x) {
    var k = x.pengajuanId;
    if (!peta[k]) { peta[k] = { pengajuanId: k, nama: x.nama, nim: x.nim, noRef: x.noRef, skema: x.skema, prodi: x.prodi, whatsapp: x.whatsapp,
                                total: 0, terbayar: 0, n: 0, lunas: 0, terlambat: 0, berikut: null }; urut.push(k); }
    var p = peta[k];
    if (x.status === 'BATAL') return;
    p.n++; p.total += x.nominal;
    if (x.status === 'LUNAS') { p.lunas++; p.terbayar += x.nominal; return; }
    if (x.keadaan === 'TERLAMBAT') p.terlambat++;
    if (!p.berikut || x.jatuhTempo < p.berikut.jatuhTempo) p.berikut = x;
  });
  return urut.map(function (k) { return peta[k]; });
}

function tabelPerMahasiswa(data) {
  var semua = dataCicilan();
  var ids = {};
  data.forEach(function (x) { ids[x.pengajuanId] = true; });
  var rekap = rekapPerMahasiswa(semua.filter(function (x) { return ids[x.pengajuanId]; }));
  var baris = rekap.map(function (p) {
    var persen = p.total ? Math.round(p.terbayar / p.total * 100) : 0;
    return {
      pengajuanId: p.pengajuanId, whatsapp: p.whatsapp,
      _mhs: '<div class="t-judul">' + esc(p.nama) + '</div><div class="tx-xs tx-3 mono">' + esc(p.nim || '') + ' · ' + esc(p.noRef || '') + '</div>',
      skema: p.skema,
      _prog: '<div class="baris g8"><div class="bar-tipis" style="width:90px"><span style="width:' + persen + '%"></span></div><span class="tx-sm">' +
             p.lunas + '/' + p.n + '</span></div>',
      _total: '<span class="mono">' + rupiah(p.total) + '</span>',
      _sisa: '<span class="mono">' + rupiah(p.total - p.terbayar) + '</span>',
      _berikut: p.berikut ? tglIndoPendek(p.berikut.jatuhTempo) + '<br>' + teksSisaHari(p.berikut) : '<span class="lencana ok">Lunas semua</span>',
      _st: p.terlambat ? lencanaStatus('TERLAMBAT') : (p.lunas === p.n ? lencanaStatus('LUNAS') : lencanaStatus(p.berikut ? p.berikut.keadaan : 'BELUM'))
    };
  });
  return bangunTabel({
    data: baris, idTabel: 'cicilanMhsTbl', halaman: Adm.halaman.cicilanMhsTbl || 1,
    kolom: [
      { k: '_mhs', l: 'Mahasiswa', tipe: 'html' }, { k: 'skema', l: 'Skema' },
      { k: '_prog', l: 'Progres', tipe: 'html' }, { k: '_total', l: 'Total', tipe: 'html' },
      { k: '_sisa', l: 'Sisa', tipe: 'html' }, { k: '_berikut', l: 'Jatuh Tempo Berikutnya', tipe: 'html' },
      { k: '_st', l: 'Status', tipe: 'html' }
    ],
    judulKosong: 'Belum ada data', deskKosong: '', ikonKosong: 'bi-person-lines-fill',
    aksi: function (p) {
      return '<button class="btn btn-hantu btn-ikon" title="Lihat jadwal" onclick="jadwalMahasiswa(\'' + esc(p.pengajuanId) + '\')"><i class="bi bi-calendar3"></i></button>' +
        (p.whatsapp ? '<a class="btn btn-hantu btn-ikon" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(p.whatsapp).replace(/\D/g, '')) +
         '"><i class="bi bi-whatsapp"></i></a>' : '');
    }
  });
}

function cariJadwal(id) { return dataCicilan().filter(function (x) { return String(x.id) === String(id); })[0] || null; }

function jadwalMahasiswa(pengajuanId) {
  var d = dataCicilan().filter(function (x) { return String(x.pengajuanId) === String(pengajuanId); })
    .sort(function (a, b) { return Number(a.cicilanKe) - Number(b.cicilanKe); });
  if (!d.length) return;
  bukaModal({
    judul: 'Jadwal Pembayaran — ' + d[0].nama,
    sub: d[0].noRef + ' · ' + d[0].skema + ' · NIM ' + (d[0].nim || '-'),
    isi: '<div class="cicilan-tabel baca">' + d.map(function (x) {
      return '<div class="ct-baris"><span class="ct-ke">Ke-' + esc(x.cicilanKe) + '</span><span class="mono">' + rupiah(x.nominal) + '</span>' +
        '<span>' + tglIndoPendek(x.jatuhTempo) + '<br>' + teksSisaHari(x) + '</span><span>' + lencanaStatus(x.keadaan || x.status) + '</span>' +
        '<span class="kanan">' + (x.status === 'BELUM' && Sesi.boleh('tulis')
          ? '<button class="btn btn-ok btn-sm" onclick="tutupModal();bukaTandaiLunas(\'' + x.id + '\')">Lunas</button>' : '') +
        '<button class="btn btn-hantu btn-ikon" onclick="tutupModal();detailCicilan(\'' + x.id + '\')"><i class="bi bi-eye"></i></button></span></div>';
    }).join('') + '</div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>'
  });
}

function detailCicilan(id) {
  var x = cariJadwal(id);
  if (!x) { toast('Jadwal tidak ditemukan. Segarkan halaman.', 'galat'); return; }
  var boleh = x.status === 'BELUM' && Sesi.boleh('tulis');
  bukaModal({
    sempit: true,
    judul: 'Cicilan ke-' + x.cicilanKe + ' dari ' + x.jumlahCicilan,
    sub: x.nama + ' · ' + x.noRef,
    isi: '<div class="mb12">' + lencanaStatus(x.keadaan || x.status) + ' ' + teksSisaHari(x) + '</div>' +
      '<div class="grid-2">' + miniInfo('Skema', x.skema) + miniInfo('NIM', x.nim) + '</div>' +
      '<div class="grid-2 mt8">' + miniInfo('WhatsApp', x.whatsapp) + miniInfo('Surel', x.email) + '</div>' +
      '<div class="garis"></div>' +
      (boleh
        ? '<div class="grid-2"><div class="bidang"><label>Nominal (Rp)</label><div class="masukan-rp"><span>Rp</span>' +
          '<input type="text" inputmode="numeric" id="dcNominal" value="' + esc(formatRibuan(x.nominal)) + '" oninput="formatMasukanRp(this, angkaRp(this.value))"></div></div>' +
          bidangTeks({ id: 'dcTanggal', label: 'Jatuh Tempo', tipe: 'date', nilai: x.jatuhTempo }) + '</div>'
        : '<div class="grid-2">' + miniInfo('Nominal', rupiah(x.nominal)) + miniInfo('Jatuh Tempo', tglIndoPendek(x.jatuhTempo)) + '</div>') +
      (boleh ? bidangArea({ id: 'dcCatatan', label: 'Catatan', baris: 2, nilai: x.catatan }) :
        (x.catatan ? '<div class="tx-sm tx-2 mt8"><b>Catatan:</b> ' + esc(x.catatan) + '</div>' : '')) +
      '<div class="tx-xs tx-3 mt8">Pengingat: H-3 ' + esc(x.notifH3 ? tglJam(x.notifH3) || x.notifH3 : 'belum') + ' · H-0 ' + esc(x.notifH0 || 'belum') +
      (x.dicatatOleh ? ' · dicatat oleh ' + esc(x.dicatatOleh) : '') + '</div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' +
      (x.status === 'LUNAS' && Sesi.boleh('master') ? '<button class="btn btn-bahaya" onclick="batalLunasCicilan(\'' + x.id + '\')">Batalkan Lunas</button>' : '') +
      (boleh ? '<button class="btn btn-utama" id="btnSimpanCcl" onclick="simpanJadwalCicilan(\'' + x.id + '\')"><i class="bi bi-save"></i> Simpan</button>' : '')
  });
}

function simpanJadwalCicilan(id) {
  var btn = el('btnSimpanCcl');
  tombolSibuk(btn, true, 'Menyimpan…');
  kirim('cicilanSimpan', { id: id, nominal: angkaRp(ambilNilai('dcNominal')), jatuhTempo: ambilNilai('dcTanggal'), catatan: ambilNilai('dcCatatan') })
    .then(function (r) {
      tombolSibuk(btn, false);
      if (!r.success) { toast(r.message, 'galat'); return; }
      tutupModal();
      toast(r.message, 'sukses');
      segarkanCicilanDiam(true);
    });
}

function bukaTandaiLunas(id) {
  var x = cariJadwal(id);
  if (!x) return;
  bukaModal({
    sempit: true,
    judul: 'Tandai Lunas',
    sub: x.nama + ' · cicilan ke-' + x.cicilanKe + ' · ' + rupiah(x.nominal),
    isi: bidangTeks({ id: 'tlTanggal', label: 'Tanggal Pembayaran', tipe: 'date', nilai: hariIniIso(), wajib: true }) +
      bidangArea({ id: 'tlCatatan', label: 'Catatan (opsional)', baris: 2, placeholder: 'Mis. transfer BSI ref. 123456 / bukti di map keuangan' }) +
      '<label class="baris g8 tx-sm"><input type="checkbox" id="tlNotif" checked style="width:auto"> Kirim tanda terima ke mahasiswa (surel/WhatsApp)</label>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-ok" id="btnTandaiLunas" onclick="prosesTandaiLunas(\'' + id + '\')"><i class="bi bi-check2-circle"></i> Tandai Lunas</button>'
  });
}

function prosesTandaiLunas(id) {
  var btn = el('btnTandaiLunas');
  tombolSibuk(btn, true, 'Mencatat…');
  var x = cariJadwal(id);
  kirim('cicilanTandaiLunas', { id: id, tanggalBayar: ambilNilai('tlTanggal'), catatan: ambilNilai('tlCatatan'), kirimNotif: !!(el('tlNotif') && el('tlNotif').checked) })
    .then(function (r) {
      tombolSibuk(btn, false);
      if (!r.success) { toast(r.message, 'galat'); return; }
      tutupModal();
      toast(r.message, 'sukses');
      if (x) { x.status = 'LUNAS'; x.keadaan = 'LUNAS'; x.tanggalBayar = ambilNilai('tlTanggal') || hariIniIso(); x.sisaHari = null; }   // optimistis
      if (Adm.modulAktif === 'cicilan') renderModul('cicilan');
      segarkanCicilanDiam(true);
    });
}

function batalLunasCicilan(id) {
  var alasan = window.prompt('Alasan membatalkan status lunas (wajib):', '');
  if (alasan === null) return;
  if (alasan.trim().length < 5) { toast('Tuliskan alasan minimal 5 karakter.', 'peringatan'); return; }
  kirim('cicilanBatalLunas', { id: id, alasan: alasan }).then(function (r) {
    toast(r.message, r.success ? 'sukses' : 'galat');
    if (r.success) { tutupModal(); segarkanCicilanDiam(true); }
  });
}

function kirimPengingatCicilan(ids) {
  konfirmasi({ judul: 'Kirim Pengingat Sekarang', pesan: ids.length + ' pengingat pembayaran akan dikirim ke surel/WhatsApp mahasiswa.', ya: 'Kirim' })
    .then(function (ya) {
      if (!ya) return;
      kirim('cicilanKirimPengingat', { ids: ids }).then(function (r) { toast(r.message, r.success ? 'sukses' : 'galat'); });
    });
}

function pengingatMassal() {
  var ids = saringCicilan(dataCicilan()).filter(function (x) { return x.status === 'BELUM'; }).map(function (x) { return x.id; });
  if (!ids.length) return;
  kirimPengingatCicilan(ids.slice(0, 200));
}

function eksporCicilan() {
  var data = saringCicilan(dataCicilan());
  var kolom = [
    { k: 'noRef', l: 'No. Referensi' }, { k: 'nama', l: 'Nama' }, { k: 'nim', l: 'NIM' }, { k: 'prodi', l: 'Program Studi' },
    { k: 'skema', l: 'Skema' }, { k: 'cicilanKe', l: 'Cicilan Ke' }, { k: 'jumlahCicilan', l: 'Dari' },
    { k: 'nominal', l: 'Nominal' }, { k: 'jatuhTempo', l: 'Jatuh Tempo' }, { k: 'status', l: 'Status' },
    { k: 'keadaan', l: 'Keadaan' }, { k: 'tanggalBayar', l: 'Tanggal Bayar' }, { k: 'dicatatOleh', l: 'Dicatat Oleh' },
    { k: 'whatsapp', l: 'WhatsApp' }, { k: 'email', l: 'Surel' }, { k: 'catatan', l: 'Catatan' }
  ];
  unduhBerkas('monitoring-cicilan-' + hariIniIso() + '.csv', keCsv(kolom, data));
}

function segarkanCicilan(btn) {
  tombolSibuk(btn, true, 'Menyegarkan…');
  segarkanCicilanDiam(true).then(function () { tombolSibuk(btn, false); });
}

/** Ambil data cicilan terbaru (1 panggilan ringan) lalu perbarui tampilan. */
function segarkanCicilanDiam(segar) {
  return kirim('cicilanData', { segar: !!segar }).then(function (r) {
    if (!r.success || !Adm.boot) return;
    Adm.boot.data.cicilan = r.data.rows;
    Adm.boot.cicilanRingkas = r.data.ringkas;
    Sesi.simpanBoot(Adm.boot);
    renderSidebar();
    tandaiLonceng();
    if (Adm.modulAktif === 'cicilan' && !_tumpukanModal.length) renderModul('cicilan');
  });
}

/* ══════════════════════════════════════════════════════════════════
   4. RINGKASAN DI PENGAJUAN MAHASISWA · LONCENG · POPUP SUPER ADMIN
   ══════════════════════════════════════════════════════════════════ */
(function () {
  if (typeof renderAntreanPengajuan !== 'function') return;
  var asli = renderAntreanPengajuan;
  renderAntreanPengajuan = function (w, jenis) {
    asli(w, jenis);
    if (jenis !== 'mahasiswa') return;
    var r = ringkasCicilanBoot();
    if (!r || !r.jumlah) return;
    var kartu = document.createElement('div');
    kartu.className = 'ringkas-cicilan mb16';
    kartu.innerHTML = '<div class="baris g12 bungkus"><div class="kpi-ikon emas" style="width:40px;height:40px;font-size:18px"><i class="bi bi-calendar2-check"></i></div>' +
      '<div class="sisa"><div class="tebal">Monitoring Cicilan</div><div class="tx-sm tx-2">' +
      r.pengajuan + ' mahasiswa · terbayar ' + rupiah(r.terbayar) + ' dari ' + rupiah(r.totalTagihan) +
      (r.terlambat ? ' · <b style="color:var(--dang-fg)">' + r.terlambat + ' terlambat</b>' : '') +
      ((r.jatuhTempo + r.segera) ? ' · <b>' + (r.jatuhTempo + r.segera) + ' jatuh tempo ≤ 3 hari</b>' : '') + '</div></div>' +
      '<button class="btn btn-navy btn-sm" onclick="renderModul(\'cicilan\')"><i class="bi bi-box-arrow-in-right"></i> Buka Monitoring</button></div>';
    var kepala = w.querySelector('.halaman-kepala');
    if (kepala && kepala.nextSibling) w.insertBefore(kartu, kepala.nextSibling); else w.insertBefore(kartu, w.firstChild);
  };
})();

function peringatanCicilan() {
  var r = ringkasCicilanBoot();
  return r && r.peringatan ? r.peringatan.filter(function (x) { return x.sisaHari <= 3; }) : [];
}

function tandaiLonceng() {
  var dot = el('tbDot');
  if (!dot || !Adm.boot) return;
  var antre = ((Adm.boot.dashboard || {}).totalAntrean) || 0;
  dot.hidden = !(antre > 0 || peringatanCicilan().length > 0);
}

function itemPeringatanHtml(x) {
  var tanda = x.sisaHari < 0 ? 'Terlambat ' + Math.abs(x.sisaHari) + ' hari' : (x.sisaHari === 0 ? 'Jatuh tempo HARI INI' : x.sisaHari + ' hari lagi');
  return '<div class="antrean-item" onclick="tutupSemuaModal();Ccl.saring=\'tindakan\';renderModul(\'cicilan\')" style="cursor:pointer">' +
    '<div class="avatar ai-avatar" style="' + (x.sisaHari < 0 ? 'background:var(--dang-bg);color:var(--dang-fg)' : '') + '">' + inisial(x.nama) + '</div>' +
    '<div class="ai-isi"><div class="ai-nama">' + esc(x.nama) + ' <span class="tx-3 tx-xs mono">' + esc(x.nim || '') + '</span></div>' +
    '<div class="ai-perihal">Cicilan ke-' + esc(x.cicilanKe) + '/' + esc(x.jumlahCicilan) + ' · ' + rupiah(x.nominal) + ' · ' + esc(x.skema) + '</div>' +
    '<div class="ai-meta">' + tglIndoPendek(x.jatuhTempo) + ' · <b>' + tanda + '</b></div></div>' +
    '<i class="bi bi-chevron-right tx-3"></i></div>';
}

/** Bagian lonceng pemberitahuan (dipanggil bukaNotifikasi di admin.js). */
function notifikasiCicilanHtml() {
  var p = peringatanCicilan();
  if (!p.length) return '';
  return '<div class="label-kecil mb8"><i class="bi bi-calendar2-check"></i> Pelunasan dalam waktu dekat / lewat jatuh tempo (' + p.length + ')</div>' +
    p.slice(0, 8).map(itemPeringatanHtml).join('') + '<div class="garis"></div>';
}

/** Popup Super Admin — sekali per hari per peramban saat panel dibuka. */
function popupPelunasanSuperAdmin(boot, awal) {
  tandaiLonceng();
  if (!awal || !boot || !boot.user || boot.user.peran !== 'SUPER_ADMIN') return;
  var p = peringatanCicilan();
  if (!p.length) return;
  var kunci = 'esurat_popup_cicilan_' + hariIniIso();
  try { if (localStorage.getItem(kunci)) return; localStorage.setItem(kunci, '1'); } catch (e) {}
  var telat = p.filter(function (x) { return x.sisaHari < 0; }).length;
  var hari = p.filter(function (x) { return x.sisaHari === 0; }).length;
  var coba = 0;
  (function tampil() {
    if (Aplikasi.lapisan !== 'admin') return;
    if (_tumpukanModal.length || document.querySelector('.pf-tirai.tampil')) {      // tunggu modal lain ditutup
      if (++coba < 40) setTimeout(tampil, 1500);
      return;
    }
    bukaModal({
      judul: 'Pemberitahuan Pelunasan Cicilan',
      sub: (telat ? telat + ' lewat jatuh tempo · ' : '') + (hari ? hari + ' jatuh tempo hari ini · ' : '') +
           (p.length - telat - hari) + ' dalam 3 hari ke depan',
      isi: '<div class="baris g10 mb12" style="align-items:flex-start;background:var(--warn-bg);color:var(--warn-fg);padding:12px 14px;border-radius:var(--r-lg)">' +
        '<i class="bi bi-alarm" style="margin-top:2px"></i><div class="sisa tx-sm" style="line-height:1.6">Pengingat otomatis H-3 &amp; H-0 sudah ' +
        'dijadwalkan ke mahasiswa. Tandai <b>Lunas</b> setelah pembayaran diterima agar pengingat berhenti.</div></div>' +
        p.slice(0, 12).map(itemPeringatanHtml).join(''),
      kaki: '<button class="btn btn-garis" onclick="tutupModal()">Nanti</button>' +
            '<button class="btn btn-utama" onclick="tutupModal();Ccl.saring=\'tindakan\';renderModul(\'cicilan\')"><i class="bi bi-calendar2-check"></i> Buka Monitoring</button>',
      tanpaFokus: true
    });
  })();
}
KAIT_PANEL.push(function (boot, awal) { setTimeout(function () { popupPelunasanSuperAdmin(boot, awal); }, 900); });
