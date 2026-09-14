/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/laporan.js
   Laporan, rekapitulasi, capaian SLA, grafik, dan ekspor.
   ═══════════════════════════════════════════════════════════════════ */

var Lap = { hasil: null, filter: {} };

function renderLaporan(w) {
  var kini = new Date();
  var awal = new Date(kini.getFullYear(), kini.getMonth() - 1, 1);

  Lap.filter = {
    dari: Lap.filter.dari || tglInput(awal),
    sampai: Lap.filter.sampai || tglInput(kini),
    modul: Lap.filter.modul || 'semua',
    status: Lap.filter.status || 'semua'
  };

  var h = kepalaHalaman({
    remah: ['Arsip & Rekapitulasi', 'Laporan & Rekap'],
    judul: 'Laporan & Rekapitulasi Dokumen',
    sub: 'Analisis data persuratan, capaian SLA verifikasi, dan arsip digital terintegrasi Google Sheets.',
    aksi: '<button class="btn btn-garis" onclick="eksporLaporanCsv()">' +
          '<i class="bi bi-filetype-csv"></i> Ekspor Data (.csv)</button>' +
          '<button class="btn btn-utama" onclick="cetakLaporan()">' +
          '<i class="bi bi-printer"></i> Cetak Laporan Resmi</button>'
  });

  /* Filter */
  h += '<div class="kartu kartu-rapat mb20"><div class="baris g12 bungkus" style="align-items:flex-end">' +
    '<div class="bidang mb0" style="min-width:150px"><label for="lapDari">Dari Tanggal</label>' +
    '<input type="date" id="lapDari" value="' + Lap.filter.dari + '"></div>' +
    '<div class="bidang mb0" style="min-width:150px"><label for="lapSampai">Sampai Tanggal</label>' +
    '<input type="date" id="lapSampai" value="' + Lap.filter.sampai + '"></div>' +
    '<div class="bidang mb0" style="min-width:190px"><label for="lapModul">Jenis Dokumen</label>' +
    '<select id="lapModul">' +
    [['semua', 'Semua Surat & SK'], ['suratKeluar', 'Surat Keluar'], ['sk', 'Surat Keputusan'],
     ['suratMasuk', 'Surat Masuk'], ['mou', 'MOU Instansi'], ['beritaAcara', 'Berita Acara'],
     ['pengajuanMhs', 'Pengajuan Mahasiswa'], ['pengajuanDosen', 'Pengajuan Dosen'],
     ['arsip', 'Arsip Dokumen Penting']]
      .map(function (o) {
        return '<option value="' + o[0] + '"' + (Lap.filter.modul === o[0] ? ' selected' : '') + '>' +
               o[1] + '</option>';
      }).join('') + '</select></div>' +
    '<div class="bidang mb0" style="min-width:170px"><label for="lapStatus">Status Berkas</label>' +
    '<select id="lapStatus">' +
    [['semua', 'Semua Status'], ['TERBIT', 'Terbit'], ['DRAF', 'Draf'], ['MENUNGGU', 'Menunggu'],
     ['DIPROSES', 'Diproses'], ['DISETUJUI', 'Disetujui'], ['DITOLAK', 'Ditolak'], ['AKTIF', 'Aktif']]
      .map(function (o) {
        return '<option value="' + o[0] + '"' + (Lap.filter.status === o[0] ? ' selected' : '') + '>' +
               o[1] + '</option>';
      }).join('') + '</select></div>' +
    '<div class="sisa"></div>' +
    '<button class="btn btn-hantu" onclick="resetLaporan()">Reset</button>' +
    '<button class="btn btn-navy" id="btnTerapkanLap" onclick="muatLaporan()">' +
    '<i class="bi bi-funnel"></i> Terapkan Filter</button></div></div>';

  h += '<div id="lapIsi">' + keadaanMemuat('Menghitung rekapitulasi…') + '</div>';

  w.innerHTML = h;
  muatLaporan();
}

function resetLaporan() {
  Lap.filter = {};
  renderLaporan(el('admKonten'));
}

function muatLaporan() {
  Lap.filter = {
    dari: ambilNilai('lapDari'),
    sampai: ambilNilai('lapSampai'),
    modul: ambilNilai('lapModul'),
    status: ambilNilai('lapStatus')
  };

  var btn = el('btnTerapkanLap');
  tombolSibuk(btn, true, 'Menghitung…');
  el('lapIsi').innerHTML = keadaanMemuat('Menghitung rekapitulasi…');

  kirim('dataLaporan', Lap.filter).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) {
      el('lapIsi').innerHTML = keadaanKosong('Laporan gagal dimuat', r.message, 'bi-exclamation-triangle');
      return;
    }
    Lap.hasil = r.data;
    Adm.halaman.laporan = 1;
    gambarLaporan();
  });
}

function gambarLaporan() {
  var d = Lap.hasil;
  var sla = d.sla || {};

  var h = '';

  /* KPI SLA */
  h += '<div class="kpi-grid">' +
    '<div class="kpi"><div class="kpi-atas"><div class="kpi-label">SLA Penerbitan Surat</div>' +
    '<div class="kpi-ikon hijau"><i class="bi bi-stopwatch"></i></div></div>' +
    '<div class="kpi-nilai">' + (sla.hariPenerbitan || 0) + '<small>Hari</small></div>' +
    '<div class="kpi-kaki"><span>Target &lt; ' + (sla.targetHari || 2) + ' hari</span>' +
    '<span class="lencana ' + ((sla.persenTerpenuhi || 0) >= 90 ? 'ok' : 'warn') + '">' +
    (sla.persenTerpenuhi || 0) + '% Terpenuhi</span></div>' +
    '<div style="height:5px;background:var(--surface-3);border-radius:99px;margin-top:10px;overflow:hidden">' +
    '<div style="height:100%;width:' + Math.min(100, sla.persenTerpenuhi || 0) +
    '%;background:var(--ok-fg);border-radius:99px"></div></div></div>' +

    kartuKpi('Kecepatan Verifikasi', sla.jamVerifikasi || 0, 'Jam', 'bi-speedometer2', 'biru',
      '<span class="tx-3">Rerata tiap jenjang verifikator</span>') +

    kartuKpi('Total Dokumen Terarsip', d.total || 0, 'Berkas', 'bi-archive', 'emas',
      (d.ringkas || []).slice(0, 2).map(function (x) {
        return '<span class="lencana neut">' + x.nilai + ' ' + esc(potong(x.label, 16)) + '</span>';
      }).join('')) +

    '<div class="kpi"><div class="kpi-atas"><div class="kpi-label">Tingkat Persetujuan</div>' +
    '<div class="kpi-ikon hijau"><i class="bi bi-check2-circle"></i></div></div>' +
    '<div class="kpi-nilai">' + (sla.tingkatPersetujuan || 0) + '<small>%</small></div>' +
    '<div class="kpi-kaki"><span class="lencana ok">' + (sla.disetujui || 0) + ' Disetujui</span>' +
    '<span class="lencana warn">' + (sla.revisi || 0) + ' Revisi</span>' +
    '<span class="lencana dang">' + (sla.ditolak || 0) + ' Ditolak</span></div></div>' +
    '</div>';

  /* Grafik */
  h += '<div class="grafik-grid">' +
    '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<h3>Tren Volume Dokumen Berdasarkan Kategori</h3>' +
    '<div class="kartu-sub">Periode ' + tgl(d.periode.dari, true) + ' – ' + tgl(d.periode.sampai, true) +
    '</div></div></div><div class="grafik-kotak"><canvas id="lapGrafikTren"></canvas></div></div>' +

    '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<h3>Distribusi per Modul</h3>' +
    '<div class="kartu-sub">Berdasarkan klasifikasi operasional</div></div></div>' +
    '<div class="grafik-kotak" style="height:210px"><canvas id="lapGrafikDist"></canvas></div>' +
    '<div class="legenda" id="lapLegenda"></div></div></div>';

  /* Tabel */
  h += '<div class="kartu kartu-rapat"><div class="tabel-alat">' +
    '<div class="label-kecil sisa">Rincian Dokumen Terindeks</div>' +
    '<div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" id="lapCari" placeholder="Filter no. registrasi / perihal…" ' +
    'oninput="gambarTabelLaporan()"></div></div>' +
    '<div id="lapTabel"></div></div>';

  el('lapIsi').innerHTML = h;
  gambarTabelLaporan();
  setTimeout(function () { jalankanAman(gambarGrafikLaporan, 'Grafik laporan'); }, 40);
}

function gambarTabelLaporan() {
  var d = Lap.hasil;
  if (!d) return;
  var cari = el('lapCari') ? String(el('lapCari').value || '').toLowerCase() : '';
  var baris = d.tabel || [];

  if (cari) {
    baris = baris.filter(function (r) {
      return (String(r.nomor) + r.judul + r.pemohon + r.modulLabel).toLowerCase().indexOf(cari) >= 0;
    });
  }

  el('lapTabel').innerHTML = bangunTabel({
    data: baris, idTabel: 'laporan', halaman: Adm.halaman.laporan || 1, perHalaman: 15,
    kolom: [
      { k: 'nomor', l: 'No. Agenda / Registrasi', tipe: 'mono' },
      { k: 'tanggal', l: 'Tanggal Terbit', tipe: 'tanggal' },
      { k: 'judul', l: 'Perihal & Ringkasan Berkas', tipe: 'utama' },
      { k: 'pemohon', l: 'Pemohon / Pengirim' },
      { k: 'pejabat', l: 'Pejabat / Disposisi' },
      { k: 'status', l: 'Status', tipe: 'status' }
    ],
    judulKosong: 'Tidak ada data pada periode ini',
    deskKosong: 'Ubah rentang tanggal atau filter jenis dokumen untuk melihat hasil lain.',
    ikonKosong: 'bi-calendar-x',
    aksi: function (r) {
      return r.pdfUrl
        ? tombolPratinjau(r.pdfUrl, r.nomor, 'bi-file-earmark-pdf', 'Pratinjau dokumen')
        : '<span class="tx-3 tx-xs">—</span>';
    }
  });
}

function gambarGrafikLaporan() {
  if (typeof Chart === 'undefined') return;
  var d = Lap.hasil;
  var gelap = document.body.classList.contains('gelap');
  var grid = gelap ? 'rgba(255,255,255,.07)' : 'rgba(22,41,63,.07)';

  var c1 = el('lapGrafikTren');
  if (c1 && d.tren && d.tren.label.length) {
    if (Adm.grafik.lapTren) Adm.grafik.lapTren.destroy();
    Adm.grafik.lapTren = new Chart(c1, {
      type: 'bar',
      data: {
        labels: d.tren.label,
        datasets: [
          { label: 'Surat Keluar', data: d.tren.suratKeluar, backgroundColor: '#1E3A5F',
            borderRadius: 4, maxBarThickness: 22 },
          { label: 'Surat Masuk', data: d.tren.suratMasuk, backgroundColor: '#8AA4CF',
            borderRadius: 4, maxBarThickness: 22 },
          { label: 'SK & MOU', data: d.tren.skMou, backgroundColor: '#F5A623',
            borderRadius: 4, maxBarThickness: 22 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end',
                    labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, padding: 13 } },
          tooltip: { backgroundColor: '#16293F', padding: 11, cornerRadius: 8 }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { precision: 0 } }
        }
      }
    });
  } else if (c1) {
    c1.parentNode.innerHTML = '<div class="kosong"><i class="bi bi-bar-chart"></i>' +
      '<div class="k-desk">Tidak ada data pada periode terpilih.</div></div>';
  }

  var c2 = el('lapGrafikDist');
  if (c2 && (d.ringkas || []).length) {
    if (Adm.grafik.lapDist) Adm.grafik.lapDist.destroy();
    var palet = ['#1E3A5F', '#F5A623', '#2D486D', '#B45309', '#8AA4CF', '#CBD5E1', '#64748B', '#166534'];
    var total = d.ringkas.reduce(function (s, x) { return s + x.nilai; }, 0);

    Adm.grafik.lapDist = new Chart(c2, {
      type: 'doughnut',
      data: {
        labels: d.ringkas.map(function (x) { return x.label; }),
        datasets: [{ data: d.ringkas.map(function (x) { return x.nilai; }),
                     backgroundColor: palet, borderWidth: 3, borderColor: gelap ? '#16202E' : '#fff' }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '66%',
                 plugins: { legend: { display: false },
                            tooltip: { backgroundColor: '#16293F', padding: 11, cornerRadius: 8 } } }
    });

    el('lapLegenda').innerHTML = d.ringkas.map(function (x, i) {
      return '<div class="lg"><span class="warna" style="background:' + palet[i % palet.length] + '"></span>' +
        '<span class="nama">' + esc(x.label) + '</span>' +
        '<span class="persen">' + (total ? Math.round((x.nilai / total) * 100) : 0) + '%</span>' +
        '<span class="nilai">' + x.nilai + '</span></div>';
    }).join('');
  } else if (c2) {
    c2.parentNode.innerHTML = '<div class="kosong" style="padding:24px"><i class="bi bi-pie-chart"></i>' +
      '<div class="k-desk">Belum ada data.</div></div>';
  }
}

/* ── Ekspor & cetak ─────────────────────────────────────────────── */
function eksporLaporanCsv() {
  if (!Lap.hasil || !(Lap.hasil.tabel || []).length) {
    toast('Tidak ada data untuk diekspor pada periode ini.', 'peringatan');
    return;
  }
  var kolom = [
    { k: 'nomor', l: 'Nomor Registrasi' }, { k: 'tanggal', l: 'Tanggal' },
    { k: 'modulLabel', l: 'Jenis Dokumen' }, { k: 'judul', l: 'Perihal' },
    { k: 'pemohon', l: 'Pemohon/Pengirim' }, { k: 'identitas', l: 'Identitas' },
    { k: 'pejabat', l: 'Pejabat/Disposisi' }, { k: 'status', l: 'Status' },
    { k: 'pdfUrl', l: 'Tautan Berkas' }
  ];
  unduhBerkas('e-SURAT_Laporan_' + Lap.hasil.periode.dari + '_sd_' + Lap.hasil.periode.sampai + '.csv',
              keCsv(kolom, Lap.hasil.tabel));
}

function cetakLaporan() {
  if (!Lap.hasil) { toast('Muat laporan terlebih dahulu.', 'peringatan'); return; }
  var d = Lap.hasil;
  var cfg = Adm.boot.config || {};
  var sla = d.sla || {};

  var w = window.open('', '_blank');
  if (!w) { toast('Peramban memblokir jendela cetak. Izinkan popup untuk situs ini.', 'peringatan'); return; }

  var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
    '<title>Laporan Rekapitulasi e-SURAT</title><style>' +
    '@page{size:A4;margin:2cm}' +
    'body{font-family:"Times New Roman",serif;font-size:11pt;color:#000;line-height:1.5}' +
    '.kop{text-align:center;border-bottom:3px double #000;padding-bottom:10px;margin-bottom:18px}' +
    '.kop .y{font-size:11pt}.kop .n{font-size:15pt;font-weight:bold;text-transform:uppercase}' +
    '.kop .a{font-size:8.5pt}' +
    'h1{text-align:center;font-size:13pt;text-decoration:underline;margin:14px 0 4px}' +
    '.per{text-align:center;font-size:10pt;margin-bottom:16px}' +
    'table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px}' +
    'th,td{border:1px solid #555;padding:4px 6px;text-align:left;vertical-align:top}' +
    'th{background:#e8ecf1;font-weight:bold;font-size:8.5pt}' +
    '.ring{display:flex;gap:10px;margin-bottom:16px}' +
    '.ring div{flex:1;border:1px solid #555;padding:8px 10px;text-align:center}' +
    '.ring .v{font-size:16pt;font-weight:bold}.ring .l{font-size:8pt}' +
    '.ttd{margin-top:34px;text-align:right;font-size:10pt}' +
    '.ttd .s{height:56px}.ttd .n{font-weight:bold;text-decoration:underline}' +
    '</style></head><body>' +

    '<div class="kop"><div class="y">' + esc(cfg.INSTITUSI_YAYASAN || '') + '</div>' +
    '<div class="n">' + esc(cfg.INSTITUSI_NAMA || '') + '</div>' +
    '<div class="a">' + esc(cfg.INSTITUSI_ALAMAT || '') + ' · Telp. ' + esc(cfg.INSTITUSI_TELEPON || '') +
    ' · ' + esc(cfg.INSTITUSI_EMAIL || '') + '</div></div>' +

    '<h1>LAPORAN REKAPITULASI PERSURATAN &amp; KEARSIPAN</h1>' +
    '<div class="per">Periode ' + tgl(d.periode.dari, true) + ' s.d. ' + tgl(d.periode.sampai, true) +
    ' · Tahun Akademik ' + esc(cfg.TAHUN_AKADEMIK || '') + '</div>' +

    '<div class="ring">' +
    '<div><div class="v">' + (d.total || 0) + '</div><div class="l">Total Dokumen</div></div>' +
    '<div><div class="v">' + (sla.hariPenerbitan || 0) + '</div><div class="l">Rerata Hari Penerbitan</div></div>' +
    '<div><div class="v">' + (sla.jamVerifikasi || 0) + '</div><div class="l">Rerata Jam Verifikasi</div></div>' +
    '<div><div class="v">' + (sla.tingkatPersetujuan || 0) + '%</div><div class="l">Tingkat Persetujuan</div></div>' +
    '</div>' +

    '<p><b>A. Rekapitulasi per Jenis Dokumen</b></p>' +
    '<table><thead><tr><th style="width:40px">No.</th><th>Jenis Dokumen</th>' +
    '<th style="width:90px">Jumlah</th><th style="width:90px">Proporsi</th></tr></thead><tbody>' +
    (d.ringkas || []).map(function (x, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.label) + '</td><td>' + x.nilai + '</td><td>' +
        (d.total ? Math.round((x.nilai / d.total) * 100) : 0) + '%</td></tr>';
    }).join('') +
    '<tr><th colspan="2">JUMLAH</th><th>' + (d.total || 0) + '</th><th>100%</th></tr>' +
    '</tbody></table>' +

    '<p><b>B. Rincian Dokumen</b></p>' +
    '<table><thead><tr><th style="width:30px">No.</th><th style="width:135px">Nomor Registrasi</th>' +
    '<th style="width:70px">Tanggal</th><th>Perihal</th><th style="width:105px">Pemohon</th>' +
    '<th style="width:66px">Status</th></tr></thead><tbody>' +
    (d.tabel || []).slice(0, 300).map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.nomor) + '</td><td>' + tgl(r.tanggal) + '</td>' +
        '<td>' + esc(potong(r.judul, 90)) + '</td><td>' + esc(potong(r.pemohon, 26)) + '</td>' +
        '<td>' + esc(r.status) + '</td></tr>';
    }).join('') + '</tbody></table>' +

    ((d.tabel || []).length > 300
      ? '<p style="font-size:9pt;font-style:italic">Menampilkan 300 baris pertama dari ' +
        d.tabel.length + ' data. Gunakan ekspor CSV untuk data lengkap.</p>' : '') +

    '<div class="ttd"><div>' + esc(cfg.INSTITUSI_KOTA || '') + ', ' + tgl(new Date(), true) + '</div>' +
    '<div>' + esc((Adm.boot.user || {}).jabatan || 'Kepala Sekretariat') + '</div>' +
    '<div class="s"></div><div class="n">' + esc((Adm.boot.user || {}).nama || '') + '</div></div>' +

    '</body></html>';

  w.document.write(html);
  w.document.close();
  setTimeout(function () { w.focus(); w.print(); }, 500);
}
