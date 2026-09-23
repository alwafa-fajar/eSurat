/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/admin.js  (v4.2)
   Router SPA panel admin, sidebar, dashboard, dan CRUD modul umum.

   Kecepatan v4.2:
   · Perpindahan menu 100% lokal (0 panggilan server)
   · Simpan/hapus memperbarui tampilan SEKETIKA (optimistic UI),
     sinkronisasi server berjalan di latar belakang
   · Pencarian ditunda 180 ms (tidak render ulang tiap ketukan)
   ═══════════════════════════════════════════════════════════════════ */

var Adm = {
  boot: null,
  modulAktif: 'dashboard',
  halaman: {},
  filter: {},
  grafik: {},
  pemutarSegar: null
};

/* ── Muat panel admin ─────────────────────────────────────────── */
function pasangPanel(boot) {
  Adm.boot = boot;
  Sesi.simpanBoot(boot);
  daftarBerkasPrivat();
  renderKerangkaAdmin();
  renderModul(Adm.modulAktif);

  // Segarkan diam-diam tiap 3 menit selama tab terlihat — data selalu mutakhir
  if (!Adm.pemutarSegar) {
    Adm.pemutarSegar = setInterval(function () {
      if (!document.hidden && Sesi.ada() && Aplikasi.lapisan === 'admin') segarkanPanelDiamDiam();
    }, 180000);
  }
}

/** Kumpulkan ID berkas pribadi pemohon agar pratinjau memakai jalur aman. */
function daftarBerkasPrivat() {
  ['pengajuanMhs', 'pengajuanDosen'].forEach(function (k) {
    ((Adm.boot.data || {})[k] || []).forEach(function (r) {
      var b = [];
      try { b = typeof r.berkas === 'string' ? JSON.parse(r.berkas || '[]') : (r.berkas || []); } catch (e) {}
      b.forEach(function (x) { if (x && x.privat && x.id) BerkasPrivat[x.id] = true; });
    });
  });
}

function muatPanelAdmin(bootAwal) {
  if (bootAwal) { pasangPanel(bootAwal); return Promise.resolve(true); }

  var snapshot = Sesi.ambilBoot(30 * 60 * 1000);
  if (snapshot) {
    pasangPanel(snapshot);
    segarkanPanelDiamDiam();
    return Promise.resolve(true);
  }

  el('admKonten').innerHTML = keadaanMemuat('Memuat panel administrasi…');
  return kirim('bootstrapAdmin', {}).then(function (r) {
    if (!r.success) {
      el('admKonten').innerHTML = keadaanKosong('Panel gagal dimuat', r.message, 'bi-exclamation-triangle',
        '<button class="btn btn-utama" onclick="muatPanelAdmin()">Coba Lagi</button>');
      return false;
    }
    pasangPanel(r.data);
    return true;
  });
}

/** Segarkan data panel di latar belakang tanpa mengganggu tampilan. */
var _segarBerjalan = false;
function segarkanPanelDiamDiam() {
  if (_segarBerjalan) return;
  _segarBerjalan = true;
  var ind = el('tbSinkron');
  if (ind) ind.hidden = false;
  kirim('bootstrapAdmin', {}).then(function (r) {
    _segarBerjalan = false;
    if (ind) ind.hidden = true;
    if (!r.success) return;
    var lama = Adm.boot ? JSON.stringify([Adm.boot.data, Adm.boot.master, Adm.boot.dashboard, Adm.boot.config]) : '';
    Adm.boot = r.data;
    Sesi.simpanBoot(r.data);
    daftarBerkasPrivat();
    if (lama === JSON.stringify([r.data.data, r.data.master, r.data.dashboard, r.data.config])) return;
    renderKerangkaAdmin();
    var sedangMengetik = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!_tumpukanModal.length && !sedangMengetik && Adm.modulAktif !== 'laporan') renderModul(Adm.modulAktif);
  });
}

function renderKerangkaAdmin() {
  var b = Adm.boot;
  var cfg = b.config || {};
  var u = b.user || {};

  el('sbInstitusi').textContent = cfg.INSTITUSI_SINGKATAN || 'Sekretariat';
  el('admNamaInstitusi').textContent = cfg.INSTITUSI_SINGKATAN || cfg.INSTITUSI_NAMA || 'e-SURAT';
  el('admTahunAkademik').textContent = 'TA ' + (cfg.TAHUN_AKADEMIK || '—') + ' ' + (cfg.SEMESTER || '');
  el('admNama').textContent = u.jabatan || u.nama;
  el('admEmail').textContent = u.email;
  el('admAvatar').innerHTML = avatarPengguna_(u);
  el('admLogo').innerHTML = cfg.INSTITUSI_LOGO
    ? '<img src="' + esc(cfg.INSTITUSI_LOGO) + '" alt="Logo institusi">'
    : '<i class="bi bi-envelope-paper-fill"></i>';
  pasangFavicon(cfg.INSTITUSI_LOGO);

  renderSidebar();

  var antre = ((b.dashboard || {}).totalAntrean) || 0;
  el('tbDot').hidden = !(antre > 0);
}

function renderSidebar() {
  var peran = (Adm.boot.user || {}).peran;
  var jumlahMasuk = (Adm.boot.data.suratMasuk || []).filter(function (r) {
    return selisihHari(r.tanggalTerima) <= 7;
  }).length;
  var dsb = Adm.boot.dashboard || {};
  var kpi = dsb.kpi || {};

  var h = '';
  MODUL_ADMIN.forEach(function (m) {
    if (m.grup) { h += '<div class="sb-grup">' + esc(m.grup) + '</div>'; return; }
    if (m.peran && m.peran.indexOf(peran) < 0) return;

    var hitung = '';
    if (m.kunci === 'suratMasuk' && jumlahMasuk) hitung = '<span class="hitung">' + jumlahMasuk + '</span>';
    if (m.kunci === 'pengajuanMhs' && kpi.ukt) hitung = '<span class="hitung">' + kpi.ukt + '</span>';
    if (m.kunci === 'pengajuanDosen' && kpi.dosen) hitung = '<span class="hitung">' + kpi.dosen + '</span>';

    h += '<button class="sb-item' + (m.kunci === Adm.modulAktif ? ' aktif' : '') +
         '" data-modul="' + m.kunci + '" onclick="renderModul(\'' + m.kunci + '\')">' +
         '<i class="bi ' + m.ikon + '"></i><span class="sisa">' + esc(m.nama) + '</span>' + hitung + '</button>';
  });

  h += '<div class="sb-grup">Akun</div>' +
    '<button class="sb-item" onclick="keluarKePortal()"><i class="bi bi-globe"></i>' +
    '<span class="sisa">Lihat Portal Publik</span></button>' +
    '<button class="sb-item" onclick="logout()"><i class="bi bi-box-arrow-right"></i>' +
    '<span class="sisa">Keluar</span></button>';

  el('sbMenu').innerHTML = h;
}

/** Tandai menu aktif tanpa membangun ulang sidebar (instan). */
function tandaiMenuAktif(kunci) {
  $$('#sbMenu .sb-item[data-modul]').forEach(function (b) {
    b.classList.toggle('aktif', b.dataset.modul === kunci);
  });
}

/* ── Router modul ───────────────────────────────────────────────── */
function renderModul(kunci) {
  if (!Adm.boot) return;
  var pindah = Adm.modulAktif !== kunci;
  Adm.modulAktif = kunci;
  tandaiMenuAktif(kunci);
  tutupSidebar();
  if (pindah) window.scrollTo(0, 0);

  var w = el('admKonten');
  jalankanAman(function () {
    switch (kunci) {
      case 'dashboard':      return renderDashboard(w);
      case 'suratKeluar':    return renderSuratKeluar(w);
      case 'sk':             return renderSK(w);
      case 'beritaAcara':    return renderBeritaAcara(w);
      case 'pengajuanMhs':   return renderAntreanPengajuan(w, 'mahasiswa');
      case 'pengajuanDosen': return renderAntreanPengajuan(w, 'dosen');
      case 'laporan':        return renderLaporan(w);
      case 'pengaturan':     return renderPengaturan(w);
      default:               return renderModulUmum(w, kunci);
    }
  }, 'Modul ' + kunci);
}

function infoModul(kunci) {
  var m = MODUL_ADMIN.filter(function (x) { return x.kunci === kunci; })[0];
  return m || { kunci: kunci, nama: kunci, ikon: 'bi-folder' };
}

function kepalaHalaman(o) {
  return '<div class="halaman-kepala"><div>' +
    '<div class="remah">' + (o.remah || []).map(function (r, i, a) {
      return '<span class="' + (i === a.length - 1 ? 'kini' : '') + '">' + esc(r) + '</span>' +
             (i < a.length - 1 ? '<span class="pisah"><i class="bi bi-chevron-right"></i></span>' : '');
    }).join('') + '</div>' +
    '<h2>' + esc(o.judul) + '</h2>' +
    (o.sub ? '<div class="h-sub">' + esc(o.sub) + '</div>' : '') +
    '</div><div class="halaman-aksi">' + (o.aksi || '') + '</div></div>';
}

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
function renderDashboard(w) {
  var d = Adm.boot.dashboard || {};
  var k = d.kpi || {};
  var cfg = Adm.boot.config || {};
  var u = Adm.boot.user || {};

  var h = '';

  h += '<div class="sambutan">' +
    '<div class="s-ikon"><i class="bi bi-shield-check"></i></div>' +
    '<div class="s-teks">' +
    '<div class="s-label">Portal Tata Usaha &amp; Administrasi · TA ' + esc(cfg.TAHUN_AKADEMIK || '—') + '</div>' +
    '<h2>Selamat datang kembali, ' + esc(u.nama) + '</h2>' +
    '<div class="s-sub">' + esc(u.jabatan || u.peran) + ' · Tanggung jawab operasional registri persuratan ' +
    esc(cfg.INSTITUSI_SINGKATAN || '') + '</div></div>' +
    '<div class="s-aksi">' +
    '<div class="sinkron"><div class="t">Sinkronisasi Google Sheets &amp; Drive</div>' +
    '<div class="v">Aktif &amp; Tersinkron</div></div>' +
    '<button class="btn btn-utama btn-blok" onclick="segarkanDashboard(this)">' +
    '<i class="bi bi-arrow-repeat"></i> Sinkron Sekarang</button></div></div>';

  h += '<div class="kpi-grid">' +
    kartuKpi('Surat Masuk Bulan Ini', k.suratMasuk || 0, 'Dokumen', 'bi-inbox', 'biru',
      (k.deltaSuratMasuk ? '<span class="lencana ' + (k.deltaSuratMasuk > 0 ? 'ok' : 'neut') + '">' +
        '<i class="bi bi-graph-' + (k.deltaSuratMasuk > 0 ? 'up' : 'down') + '-arrow"></i>' +
        (k.deltaSuratMasuk > 0 ? '+' : '') + k.deltaSuratMasuk + '%</span>' : '') +
      '<span>vs bulan lalu (' + (k.suratMasukLalu || 0) + ')</span>') +

    kartuKpi('Surat Keluar Terbit', k.suratKeluar || 0, 'Surat Resmi', 'bi-send-check', 'emas',
      '<div style="width:100%"><div class="label-kecil mb4">Nomor Terakhir Diterbitkan</div>' +
      chipNomor(k.nomorTerakhir) + '</div>') +

    kartuKpi('Dalam Verifikasi', k.dalamVerifikasi || 0, 'Berkas Antrean', 'bi-clipboard-check', 'emas',
      '<span class="lencana neut">' + (k.ukt || 0) + ' UKT Mhs</span>' +
      '<span class="lencana neut">' + (k.dosen || 0) + ' Dosen</span>' +
      ((k.dalamVerifikasi || 0) > 0 ? '<span class="tx-emas"><i class="bi bi-exclamation-circle-fill"></i></span>' : '')) +

    kartuKpi('Dokumen &amp; MOU Aktif', k.totalArsip || 0, 'Total Arsip', 'bi-archive', 'hijau',
      '<span class="baris g6"><i class="bi bi-cloud-check tx-ok"></i> 100% Cloud Drive</span>' +
      '<span class="lencana ok">Tersimpan Aman</span>') +
    '</div>';

  h += '<div class="grafik-grid">' +
    '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<div class="label-kecil mb4">Tren Aktivitas</div>' +
    '<h3>Volume Persuratan &amp; Pengajuan Bulanan</h3>' +
    '<div class="kartu-sub">Sembilan bulan terakhir · agregasi otomatis dari basis data Google Sheets</div>' +
    '</div></div><div class="grafik-kotak"><canvas id="grafikTren"></canvas></div></div>' +

    '<div class="kartu"><div class="kartu-kepala"><div>' +
    '<div class="label-kecil mb4">Klasifikasi Registri</div>' +
    '<h3>Distribusi Kategori</h3>' +
    '<div class="kartu-sub">Proporsi dari total ' + angka(k.totalArsip || 0) + ' dokumen arsip aktif</div>' +
    '</div><i class="bi bi-pie-chart tx-3" style="font-size:18px"></i></div>' +
    '<div class="grafik-kotak" style="height:210px"><canvas id="grafikDistribusi"></canvas></div>' +
    '<div class="legenda" id="legendaDistribusi"></div></div></div>';

  if ((d.insight || []).length) {
    h += '<div class="kartu mb20"><div class="kartu-kepala"><div>' +
      '<h3 style="font-size:16px">Analisis Otomatis</h3>' +
      '<div class="kartu-sub">Hal-hal yang perlu perhatian Anda hari ini</div></div></div>' +
      '<div class="tumpuk g10">' +
      d.insight.map(function (i) {
        var warna = { info: 'info', warning: 'warn', danger: 'dang', neutral: 'neut' }[i.tipe] || 'neut';
        return '<div class="baris g10" style="align-items:flex-start;padding:11px 13px;' +
          'background:var(--surface-2);border-radius:var(--r-lg);border-left:3px solid ' +
          (warna === 'dang' ? 'var(--dang-fg)' : warna === 'warn' ? 'var(--amber)' : 'var(--navy)') + '">' +
          '<i class="bi ' + esc(i.ikon || 'bi-info-circle') + '" style="margin-top:2px"></i>' +
          '<div class="sisa tx-md">' + i.teks + '</div></div>';
      }).join('') + '</div></div>';
  }

  h += '<div class="panel-grid">' + panelAntrean(d) + panelTerbaru(d) + '</div>';

  w.innerHTML = h;
  requestAnimationFrame(function () { jalankanAman(function () { gambarGrafikDashboard(d); }, 'Grafik'); });
}

function kartuKpi(label, nilai2, satuan, ikon, warna, kaki) {
  return '<div class="kpi"><div class="kpi-atas">' +
    '<div class="kpi-label">' + label + '</div>' +
    '<div class="kpi-ikon ' + warna + '"><i class="bi ' + ikon + '"></i></div></div>' +
    '<div class="kpi-nilai">' + angka(nilai2) + '<small>' + esc(satuan) + '</small></div>' +
    (kaki ? '<div class="kpi-kaki">' + kaki + '</div>' : '') + '</div>';
}

function panelAntrean(d) {
  var a = d.antrean || [];
  var h = '<div class="kartu"><div class="kartu-kepala"><div class="baris g10">' +
    '<div class="kpi-ikon emas" style="background:var(--dang-bg);color:var(--dang-fg)">' +
    '<i class="bi bi-clipboard-x"></i></div>' +
    '<div><h3 style="font-size:16px">Antrean Butuh Tindakan Segera</h3>' +
    '<div class="kartu-sub">Menunggu verifikasi validitas dokumen &amp; persetujuan pimpinan</div></div></div>' +
    (a.length ? '<span class="lencana dang">' + a.length + ' Prioritas</span>' : '') + '</div>';

  if (!a.length) {
    h += keadaanKosong('Antrean bersih', 'Tidak ada pengajuan yang menunggu verifikasi saat ini.',
                       'bi-check2-circle');
  } else {
    h += a.map(function (x) {
      return '<div class="antrean-item">' +
        '<div class="avatar ai-avatar">' + inisial(x.nama) + '</div>' +
        '<div class="ai-isi">' +
        '<div class="ai-nama">' + esc(x.nama) +
        '<span class="chip-nomor" style="height:21px;font-size:10px">' + esc(x.identitas || '-') + '</span></div>' +
        '<div class="ai-perihal">' + esc(x.perihal) + '</div>' +
        '<div class="ai-meta">Diajukan: ' + tglJam(x.tanggal) + ' · ' + umurTeks(x.tanggal) + '</div></div>' +
        '<div class="ai-aksi">' +
        '<span class="lencana ' + (x.umurHari > 5 ? 'dang' : 'warn') + '">Menunggu ' +
        esc(potong(x.menunggu, 22)) + '</span>' +
        '<button class="btn btn-navy btn-sm" onclick="bukaVerifikasi(\'' + x.jenis + '\',\'' + x.id + '\')">' +
        'Review <i class="bi bi-arrow-right"></i></button></div></div>';
    }).join('');

    h += '<div class="baris antara g10 mt12 bungkus">' +
      '<div class="tx-sm tx-3">Total ' + (d.totalAntrean || a.length) + ' pengajuan tersisa di antrean sistem</div>' +
      '<button class="btn btn-hantu btn-sm" onclick="renderModul(\'pengajuanMhs\')">' +
      'Lihat Semua Antrean <i class="bi bi-arrow-right"></i></button></div>';
  }
  return h + '</div>';
}

function panelTerbaru(d) {
  var t = d.terbaru || [];
  var h = '<div class="kartu"><div class="kartu-kepala"><div class="baris g10">' +
    '<div class="kpi-ikon emas"><i class="bi bi-envelope-paper"></i></div>' +
    '<div><h3 style="font-size:16px">Surat Keluar Terbit Terkini</h3>' +
    '<div class="kartu-sub">Dokumen resmi tervalidasi TTE &amp; siap didistribusikan</div></div></div>' +
    '<span class="chip-nomor">Auto-Lock Active</span></div>';

  if (!t.length) {
    h += keadaanKosong('Belum ada surat terbit',
      'Dokumen yang telah diterbitkan akan tampil di sini lengkap dengan tautan PDF resmi.',
      'bi-file-earmark-x',
      '<button class="btn btn-utama" onclick="renderModul(\'suratKeluar\')">' +
      '<i class="bi bi-plus-lg"></i> Buat Surat Keluar</button>');
  } else {
    h += t.map(function (x) {
      return '<div class="dok-item"><div class="d-atas">' + chipNomor(x.nomor) +
        (x.tte ? '<span class="lencana ok"><i class="bi bi-patch-check-fill"></i> TTE Terverifikasi</span>' : '') +
        '</div><div class="d-judul">' + esc(potong(x.perihal, 96)) + '</div>' +
        '<div class="d-kaki"><span><i class="bi bi-pen"></i> ' + esc(potong(x.pejabat || '-', 34)) + '</span>' +
        '<span><i class="bi bi-calendar3"></i> ' + tgl(x.tanggal) + '</span>' +
        '<div class="sisa"></div>' +
        (x.pdfUrl ? '<button class="btn btn-garis btn-sm" onclick="pratinjauBerkas(\'' +
          esc(x.pdfUrl) + '\',\'' + esc(String(x.nomor || 'Dokumen').replace(/'/g, '')) + '\')">' +
          '<i class="bi bi-eye"></i> Lihat PDF Resmi</button>' : '') + '</div></div>';
    }).join('');

    h += '<div class="baris antara g10 mt12 bungkus">' +
      '<div class="tx-sm tx-3"><i class="bi bi-lock"></i> Nomor surat terkunci otomatis &amp; tersimpan di Drive</div>' +
      '<button class="btn btn-hantu btn-sm" onclick="renderModul(\'suratKeluar\')">' +
      'Buka Generator Surat <i class="bi bi-arrow-right"></i></button></div>';
  }
  return h + '</div>';
}

function gambarGrafikDashboard(d) {
  if (typeof Chart === 'undefined') { setTimeout(function () { if (Adm.modulAktif === 'dashboard') gambarGrafikDashboard(d); }, 400); return; }

  var gelap = document.body.classList.contains('gelap');
  var grid = gelap ? 'rgba(255,255,255,.07)' : 'rgba(22,41,63,.07)';
  var teks = gelap ? '#A3B0C0' : '#475569';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = teks;
  Chart.defaults.animation = { duration: 250 };

  var c1 = el('grafikTren');
  if (c1 && d.tren) {
    if (Adm.grafik.tren) Adm.grafik.tren.destroy();
    Adm.grafik.tren = new Chart(c1, {
      data: {
        labels: d.tren.label,
        datasets: [
          { type: 'bar', label: 'Surat Masuk', data: d.tren.suratMasuk,
            backgroundColor: '#1E3A5F', borderRadius: 4, maxBarThickness: 20 },
          { type: 'bar', label: 'Surat Keluar', data: d.tren.suratKeluar,
            backgroundColor: '#F5A623', borderRadius: 4, maxBarThickness: 20 },
          { type: 'line', label: 'Pengajuan Masuk', data: d.tren.pengajuan,
            borderColor: '#DC2626', backgroundColor: '#DC2626', tension: .35,
            pointRadius: 3, pointHoverRadius: 5, borderWidth: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'start',
                    labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, padding: 14 } },
          tooltip: { backgroundColor: '#16293F', padding: 11, cornerRadius: 8, titleFont: { size: 12 } }
        },
        scales: {
          x: { grid: { display: false }, border: { color: grid } },
          y: { beginAtZero: true, grid: { color: grid }, border: { display: false },
               ticks: { precision: 0 } }
        }
      }
    });
  }

  var c2 = el('grafikDistribusi');
  if (c2 && d.distribusi && d.distribusi.nilai.length) {
    if (Adm.grafik.dist) Adm.grafik.dist.destroy();
    var total = d.distribusi.nilai.reduce(function (a, b) { return a + b; }, 0);

    Adm.grafik.dist = new Chart(c2, {
      type: 'doughnut',
      data: {
        labels: d.distribusi.label,
        datasets: [{ data: d.distribusi.nilai, backgroundColor: d.distribusi.warna,
                     borderWidth: 3, borderColor: gelap ? '#16202E' : '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#16293F', padding: 11, cornerRadius: 8 }
        }
      }
    });

    el('legendaDistribusi').innerHTML = d.distribusi.label.map(function (l, i) {
      var n = d.distribusi.nilai[i];
      return '<div class="lg"><span class="warna" style="background:' + d.distribusi.warna[i] + '"></span>' +
        '<span class="nama">' + esc(l) + '</span>' +
        '<span class="persen">' + (total ? Math.round((n / total) * 100) : 0) + '%</span>' +
        '<span class="nilai">(' + n + ')</span></div>';
    }).join('');
  } else if (c2) {
    c2.parentNode.innerHTML = '<div class="kosong" style="padding:26px"><i class="bi bi-pie-chart"></i>' +
      '<div class="k-desk">Belum ada dokumen terarsip untuk ditampilkan.</div></div>';
  }
}

function segarkanDashboard(btn) {
  tombolSibuk(btn, true, 'Menyinkronkan…');
  kirim('bootstrapAdmin', {}).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    Adm.boot = r.data;
    Sesi.simpanBoot(r.data);
    daftarBerkasPrivat();
    renderKerangkaAdmin();
    renderModul('dashboard');
    toast('Data berhasil disinkronkan dari Google Sheets.', 'sukses');
  });
}

/* ══════════════════════════════════════════════════════════════════
   PEMBARUAN LOKAL (OPTIMISTIC UI)
   ══════════════════════════════════════════════════════════════════ */

/** Sisipkan / ganti satu record di data lokal lalu render seketika. */
function upsertLokal(kunci, rec, sumber) {
  if (!rec || !rec.id) return;
  var wadah = sumber === 'master' ? Adm.boot.master : Adm.boot.data;
  var arr = wadah[kunci] = wadah[kunci] || [];
  for (var i = 0; i < arr.length; i++) {
    if (String(arr[i].id) === String(rec.id)) {
      var gabung = {};
      Object.keys(arr[i]).forEach(function (k) { gabung[k] = arr[i][k]; });
      Object.keys(rec).forEach(function (k) { gabung[k] = rec[k]; });
      arr[i] = gabung;
      Sesi.simpanBoot(Adm.boot);
      return;
    }
  }
  arr.push(rec);
  Sesi.simpanBoot(Adm.boot);
}

function hapusLokal(kunci, id, sumber) {
  var wadah = sumber === 'master' ? Adm.boot.master : Adm.boot.data;
  var arr = wadah[kunci] || [];
  for (var i = 0; i < arr.length; i++) {
    if (String(arr[i].id) === String(id)) {
      var dibuang = arr.splice(i, 1)[0];
      Sesi.simpanBoot(Adm.boot);
      return { indeks: i, rec: dibuang };
    }
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   MODUL UMUM — Surat Masuk, MOU, Arsip
   ══════════════════════════════════════════════════════════════════ */
function renderModulUmum(w, kunci) {
  var info = infoModul(kunci);
  var kolom = KOLOM_MODUL[kunci] || [];
  var data = (Adm.boot.data[kunci] || []).slice().reverse();
  var cari = Adm.filter[kunci] || '';

  if (cari) {
    var q = cari.toLowerCase();
    data = data.filter(function (r) {
      return Object.keys(r).some(function (k) {
        return String(r[k] || '').toLowerCase().indexOf(q) >= 0;
      });
    });
  }

  var bolehTulis = Sesi.boleh('tulis');
  var deskripsi = {
    suratMasuk: 'Buku agenda surat masuk dengan penomoran otomatis, disposisi pimpinan, dan lampiran hasil pindai.',
    mou: 'Nota kesepahaman dengan mitra beserta pemantauan masa berlaku dan penanggung jawab.',
    arsip: 'Penyimpanan legalitas, akreditasi, SK yayasan, dan dokumen institusi lainnya.'
  }[kunci] || '';

  var h = kepalaHalaman({
    remah: ['Arsip & Persuratan', info.nama],
    judul: info.nama,
    sub: deskripsi,
    aksi: (bolehTulis ? '<button class="btn btn-utama" onclick="bukaFormModul(\'' + kunci + '\')">' +
            '<i class="bi bi-plus-lg"></i> Tambah Data</button>' : '') +
          '<button class="btn btn-garis" onclick="eksporModul(\'' + kunci + '\')">' +
          '<i class="bi bi-filetype-csv"></i> Ekspor CSV</button>'
  });

  h += '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" id="cari_' + kunci + '" value="' + esc(cari) +
    '" placeholder="Cari nomor, perihal, instansi…" oninput="cariModul(\'' + kunci + '\',this.value)"></div>' +
    '<div class="sisa"></div>' +
    '<span class="lencana neut">' + data.length + ' data</span></div>' +

    bangunTabel({
      data: data, kolom: kolom, idTabel: kunci,
      halaman: Adm.halaman[kunci] || 1,
      judulKosong: cari ? 'Tidak ada hasil' : 'Belum ada data',
      deskKosong: cari ? 'Tidak ditemukan data yang cocok dengan kata kunci "' + cari + '".'
                       : 'Klik "Tambah Data" untuk mulai mengisi ' + info.nama.toLowerCase() + '.',
      ikonKosong: cari ? 'bi-search' : 'bi-inbox',
      aksi: function (r) {
        var a = '<button class="btn btn-hantu btn-ikon" title="Lihat detail" onclick="lihatDetail(\'' +
                kunci + '\',\'' + r.id + '\')"><i class="bi bi-eye"></i></button>';
        if (r.fileScanUrl || r.fileUrl) {
          a += tombolPratinjau(r.fileScanUrl || r.fileUrl,
                 r.namaDokumen || r.perihal || r.nomorAgenda || 'Lampiran',
                 'bi-paperclip', 'Pratinjau lampiran');
        }
        if (bolehTulis) {
          a += '<button class="btn btn-hantu btn-ikon" title="Ubah" onclick="bukaFormModul(\'' + kunci +
               '\',\'' + r.id + '\')"><i class="bi bi-pencil"></i></button>';
          a += '<button class="btn btn-hantu btn-ikon" title="Unggah scan asli" onclick="bukaUnggahScan(\'' +
               kunci + '\',\'' + r.id + '\')"><i class="bi bi-upload"></i></button>';
        }
        if (Sesi.boleh('hapus')) {
          a += '<button class="btn btn-hantu btn-ikon" title="Hapus" onclick="hapusData(\'' + kunci +
               '\',\'' + r.id + '\')"><i class="bi bi-trash"></i></button>';
        }
        return a;
      }
    }) + '</div>';

  w.innerHTML = h;
}

/** Pencarian ditunda sedikit agar tabel tidak dirender ulang di setiap ketukan. */
var _renderCari = tunda(function (kunci) {
  var idInput = 'cari_' + kunci;
  var aktif = document.activeElement;
  var fokus = aktif && (aktif.id === idInput || (aktif.type === 'search' && aktif.closest('.tabel-alat')));
  var posisi = fokus ? aktif.selectionStart : null;
  renderModul(kunci);
  if (fokus) {
    var i = el(idInput) || $('.tabel-alat input[type=search]');
    if (i) { i.focus(); try { i.setSelectionRange(posisi, posisi); } catch (e) {} }
  }
}, 180);

function cariModul(kunci, teks) {
  Adm.filter[kunci] = teks;
  Adm.halaman[kunci] = 1;
  _renderCari(kunci);
}

function gantiHalaman(idTabel, n) {
  Adm.halaman[idTabel] = n;
  if (idTabel === 'laporan') { gambarTabelLaporan(); return; }
  if (idTabel === 'antreanMhs') { renderAntreanPengajuan(el('admKonten'), 'mahasiswa'); return; }
  if (idTabel === 'antreanDosen') { renderAntreanPengajuan(el('admKonten'), 'dosen'); return; }
  if (idTabel === 'log' || idTabel.indexOf('master_') === 0) { gambarTabPengaturan(); return; }
  renderModul(idTabel);
}

/* ── Formulir modul umum ────────────────────────────────────────── */
var SKEMA_FORM = {
  suratMasuk: {
    judul: 'Agenda Surat Masuk',
    sub: 'Nomor agenda dibuat otomatis oleh sistem saat data disimpan.',
    bidang: [
      { id: 'tanggalTerima', l: 'Tanggal Terima', t: 'date', wajib: true, kolom: 2 },
      { id: 'tanggalSurat', l: 'Tanggal Surat', t: 'date', kolom: 2 },
      { id: 'asalInstansi', l: 'Asal Instansi Pengirim', wajib: true, ph: 'Kementerian Agama RI' },
      { id: 'nomorSuratAsal', l: 'Nomor Surat Asal', ph: 'B-1234/Dt.I.II/PP.00.9/IX/2026' },
      { id: 'perihal', l: 'Perihal Surat', t: 'area', wajib: true, baris: 2 },
      { id: 'sifat', l: 'Sifat Surat', t: 'pilih', kolom: 2,
        opsi: ['Biasa', 'Penting', 'Segera', 'Sangat Segera', 'Rahasia'] },
      { id: 'tujuanDisposisi', l: 'Tujuan Disposisi', kolom: 2, ph: 'Pembantu Ketua I' },
      { id: 'catatanDisposisi', l: 'Catatan Disposisi Pimpinan', t: 'area', baris: 3 }
    ]
  },
  mou: {
    judul: 'Nota Kesepahaman (MOU)',
    sub: 'Nomor MOU dibuat otomatis. MOU yang berakhir dalam 60 hari ditandai di dashboard.',
    bidang: [
      { id: 'pihakTerkait', l: 'Pihak Terkait / Mitra', wajib: true, ph: 'Pengadilan Agama Bekasi' },
      { id: 'kategori', l: 'Kategori Kerja Sama', t: 'pilih', kolom: 2,
        opsi: ['Tri Dharma Perguruan Tinggi', 'Magang & Praktik Kerja', 'Riset & Publikasi',
               'Pengabdian Masyarakat', 'Beasiswa', 'Lainnya'] },
      { id: 'status', l: 'Status', t: 'pilih', kolom: 2, opsi: ['AKTIF', 'BERAKHIR', 'DIBATALKAN'] },
      { id: 'ruangLingkup', l: 'Ruang Lingkup Kerja Sama', t: 'area', wajib: true, baris: 3 },
      { id: 'tanggalMulai', l: 'Tanggal Mulai Berlaku', t: 'date', wajib: true, kolom: 2 },
      { id: 'tanggalBerakhir', l: 'Tanggal Berakhir', t: 'date', wajib: true, kolom: 2 },
      { id: 'pic', l: 'Penanggung Jawab (PIC)', kolom: 2 },
      { id: 'kontakPic', l: 'Kontak PIC', kolom: 2, ph: 'nama@instansi.go.id / 0812…' }
    ]
  },
  arsip: {
    judul: 'Arsip Dokumen Penting',
    sub: 'Kode arsip dibuat otomatis. Berkas disimpan di Google Drive dengan tautan baca.',
    bidang: [
      { id: 'namaDokumen', l: 'Nama Dokumen', wajib: true, ph: 'Sertifikat Akreditasi Institusi' },
      { id: 'kategori', l: 'Kategori Arsip', t: 'pilih', kolom: 2,
        opsi: ['Legalitas Institusi', 'Akreditasi', 'SK Yayasan', 'Perizinan', 'Keuangan',
               'Kepegawaian', 'Aset', 'Lainnya'] },
      { id: 'klasifikasiAkses', l: 'Klasifikasi Akses', t: 'pilih', kolom: 2,
        opsi: ['Publik', 'Internal', 'Terbatas', 'Rahasia'] },
      { id: 'lembagaPenerbit', l: 'Lembaga Penerbit', kolom: 2, ph: 'BAN-PT' },
      { id: 'tahunTerbit', l: 'Tahun Terbit', t: 'number', kolom: 2 },
      { id: 'nomorLegalitas', l: 'Nomor Legalitas', ph: '418/SK/BAN-PT/Akred/PT/VIII/2024' },
      { id: 'keterangan', l: 'Keterangan Tambahan', t: 'area', baris: 3 }
    ]
  }
};

function bukaFormModul(kunci, id) {
  var skema = SKEMA_FORM[kunci];
  if (!skema) { toast('Formulir untuk modul ini belum tersedia.', 'peringatan'); return; }

  var rec = id ? (Adm.boot.data[kunci] || []).filter(function (r) { return String(r.id) === String(id); })[0] : null;
  rec = rec || {};

  var isi = '';
  var i = 0;
  while (i < skema.bidang.length) {
    var b = skema.bidang[i];
    if (b.kolom === 2 && skema.bidang[i + 1] && skema.bidang[i + 1].kolom === 2) {
      isi += '<div class="grid-2">' + bidangForm(b, rec) + bidangForm(skema.bidang[i + 1], rec) + '</div>';
      i += 2;
    } else {
      isi += bidangForm(b, rec);
      i++;
    }
  }

  isi += '<div class="garis"></div><div class="label-kecil mb8">Lampiran Berkas</div>' +
    '<label class="unggah" id="lampUnggah">' +
    '<div class="u-ikon"><i class="bi bi-paperclip"></i></div>' +
    '<div class="u-teks"><div class="u-nama">Hasil Pindai / Dokumen Digital</div>' +
    '<div class="u-desk">PDF atau gambar, maksimal ' + ((Adm.boot.config || {}).UPLOAD_MAX_MB || 2) + ' MB</div>' +
    '<div class="u-berkas' + (rec.fileScanUrl || rec.fileUrl ? '' : ' sembunyi') + '" id="lampNama">' +
    (rec.fileScanUrl || rec.fileUrl ? '<i class="bi bi-check-circle-fill"></i> Berkas sudah terlampir' : '') +
    '</div></div>' +
    '<span class="btn btn-navy btn-sm"><i class="bi bi-upload"></i> Pilih Berkas</span>' +
    '<input type="file" id="lampBerkas" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onchange="pilihLampiran(this)">' +
    '</label>';

  bukaModal({
    judul: (id ? 'Ubah ' : 'Tambah ') + skema.judul,
    sub: skema.sub,
    isi: isi,
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnSimpanModul" onclick="simpanModul(\'' + kunci + '\',\'' +
          (id || '') + '\')"><i class="bi bi-save"></i> Simpan Data</button>'
  });

  window.__lampiranSementara = null;
}

function bidangForm(b, rec) {
  var v = rec[b.id];
  if (b.t === 'date') v = v ? tglInput(v) : (b.id === 'tanggalTerima' ? tglInput() : '');
  if (b.t === 'area') return bidangArea({ id: b.id, label: b.l, wajib: b.wajib, baris: b.baris, nilai: v, placeholder: b.ph });
  if (b.t === 'pilih') return bidangPilih({ id: b.id, label: b.l, wajib: b.wajib, opsi: b.opsi, nilai: v });
  return bidangTeks({ id: b.id, label: b.l, wajib: b.wajib, tipe: b.t || 'text', nilai: v, placeholder: b.ph });
}

function pilihLampiran(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  var cfg = Adm.boot.config || {};
  var galat = validasiBerkas(f, Number(cfg.UPLOAD_MAX_MB || 2),
    String(cfg.UPLOAD_FORMAT || 'pdf,jpg,jpeg,png').split(',').map(function (s) { return s.trim(); }));
  if (galat) { toast(galat, 'galat'); input.value = ''; return; }

  bacaBerkasBase64(f).then(function (b64) {
    window.__lampiranSementara = { nama: f.name, mime: f.type, base64: b64 };
    el('lampUnggah').classList.add('terisi');
    var n = el('lampNama');
    n.innerHTML = '<i class="bi bi-check-circle-fill"></i> ' + esc(f.name) + ' (' + formatUkuran(f.size) + ')';
    n.classList.remove('sembunyi');
  }).catch(function (e) { toast(e.message, 'galat'); });
}

function simpanModul(kunci, id) {
  var skema = SKEMA_FORM[kunci];
  var btn = el('btnSimpanModul');

  var aturan = skema.bidang.filter(function (b) { return b.wajib; })
    .map(function (b) { return { id: b.id, wajib: true }; });
  if (!validasiForm(null, aturan)) return;

  var rec = { id: id || '' };
  skema.bidang.forEach(function (b) { rec[b.id] = ambilNilai(b.id); });

  tombolSibuk(btn, true, 'Menyimpan…');

  kirim('simpanRecord', { modul: kunci, data: rec }).then(function (r) {
    if (!r.success) { tombolSibuk(btn, false); toast(r.message, 'galat'); return; }

    var lamp = window.__lampiranSementara;
    if (!lamp) return selesaiSimpan(r, kunci, btn);

    // Data sudah tersimpan → tutup dialog seketika, unggah lampiran di latar
    selesaiSimpan(r, kunci, btn);
    toast('Mengunggah lampiran di latar belakang…', 'info', 2500);
    kirim('lampirkanScan', {
      modul: kunci, id: r.data.id, nama: lamp.nama, mime: lamp.mime, base64: lamp.base64
    }, APP.batasWaktuUnggah).then(function (r2) {
      if (!r2.success) { toast('Data tersimpan, tetapi berkas gagal diunggah: ' + r2.message, 'peringatan'); return; }
      upsertLokal(kunci, r2.data.record);
      if (Adm.modulAktif === kunci && !_tumpukanModal.length) renderModul(kunci);
      toast('Lampiran berhasil diunggah.', 'sukses');
    });
  });
}

function selesaiSimpan(r, kunci, btn) {
  tombolSibuk(btn, false);
  window.__lampiranSementara = null;
  tutupModal();
  toast(r.message, 'sukses');
  upsertLokal(kunci, r.data);
  if (Adm.modulAktif === kunci) renderModul(kunci);
  return segarkanModul(kunci, true);
}

/**
 * Muat ulang satu modul dari server.
 * @param diam  true → tidak render ulang bila pengguna sedang membuka dialog
 */
function segarkanModul(kunci, diam) {
  return kirim('refreshModul', { modul: kunci }).then(function (r) {
    if (r.success) {
      Adm.boot.data[kunci] = r.data;
      Sesi.simpanBoot(Adm.boot);
      if (kunci === 'pengajuanMhs' || kunci === 'pengajuanDosen') daftarBerkasPrivat();
    }
    if (Adm.modulAktif === kunci && !(diam && _tumpukanModal.length)) renderModul(kunci);
    return r;
  });
}

function hapusData(kunci, id) {
  konfirmasi({
    judul: 'Hapus Data Permanen',
    pesan: 'Data ini akan dihapus permanen dari basis data dan tidak dapat dikembalikan. ' +
           'Berkas terkait di Google Drive tidak ikut terhapus.',
    ya: 'Ya, Hapus Permanen', bahaya: true
  }).then(function (ya) {
    if (!ya) return;
    // Hilang dari tabel seketika; dikembalikan bila server menolak
    var cadangan = hapusLokal(kunci, id);
    if (Adm.modulAktif === kunci) renderModul(kunci);
    kirim('hapusRecord', { modul: kunci, id: id }).then(function (r) {
      if (!r.success) {
        if (cadangan) { Adm.boot.data[kunci].splice(cadangan.indeks, 0, cadangan.rec); Sesi.simpanBoot(Adm.boot); }
        if (Adm.modulAktif === kunci) renderModul(kunci);
        toast(r.message, 'galat');
        return;
      }
      toast(r.message, 'sukses');
    });
  });
}

/* ── Detail record — data di kiri, pratinjau dokumen di kanan ───── */
function bukaEditModul(kunci, id) {
  tutupModal();
  setTimeout(function () {
    jalankanAman(function () {
      if (kunci === 'suratKeluar') return bukaGeneratorSurat(id);
      if (kunci === 'sk') return bukaGeneratorSK(id);
      if (kunci === 'beritaAcara') {
        var r = (Adm.boot.data.beritaAcara || []).filter(function (x) { return String(x.id) === String(id); })[0];
        return bukaFormBA((r && r.kategori) || 'BERITA_ACARA', id);
      }
      return bukaFormModul(kunci, id);
    }, 'Editor ' + kunci);
  }, 60);
}

function berkasUtama_(r) {
  return r.pdfUrl || r.fileScanUrl || r.fileUrl || r.audioUrl || '';
}

function lihatDetail(kunci, id) {
  var r = (Adm.boot.data[kunci] || []).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!r) { toast('Data tidak ditemukan.', 'galat'); return; }

  var nomor = r.nomorSurat || r.nomorAgenda || r.nomorMOU || r.nomorSK ||
              r.nomorDokumen || r.kodeArsip || '';
  var judulDok = nomor || r.perihal || r.namaDokumen || 'Dokumen';

  var lewati = ['id', '__baris', 'isiNaskah', 'menimbang', 'mengingat', 'menetapkan',
                'riwayatVerifikasi', 'berkas', 'dataIsian'];

  var kiri = '<div class="label-kecil mb8">Rincian Data</div>' +
             '<div class="tabel-bungkus"><table class="data"><tbody>';
  Object.keys(r).forEach(function (k) {
    if (lewati.indexOf(k) >= 0) return;
    var v = r[k];
    if (v === '' || v === undefined || v === null) return;

    var tampilan;
    if (String(v).indexOf('http') === 0) {
      tampilan = '<button class="btn btn-garis btn-sm" onclick="pratinjauBerkas(\'' + esc(v) +
        '\',\'' + esc(labelKolom(k)) + '\')"><i class="bi bi-eye"></i> Lihat Berkas</button>';
    } else if (k === 'status') {
      tampilan = lencanaStatus(v);
    } else if (/^(tanggal|dibuat|diperbarui)/i.test(k)) {
      tampilan = tglJam(v);
    } else if (/^(nomor|kode)/i.test(k)) {
      tampilan = chipNomor(v);
    } else if (v === true || v === false || String(v) === 'true' || String(v) === 'false') {
      tampilan = (v === true || String(v) === 'true')
        ? '<span class="lencana ok"><i class="bi bi-check-circle"></i>Ya</span>'
        : '<span class="lencana neut"><i class="bi bi-dash-circle"></i>Tidak</span>';
    } else {
      tampilan = esc(String(v));
    }
    kiri += '<tr><td style="width:170px;color:var(--ink-2);font-size:12.5px">' + esc(labelKolom(k)) +
            '</td><td>' + tampilan + '</td></tr>';
  });

  // Isian kustom template (dataIsian)
  var isian = {};
  try { isian = typeof r.dataIsian === 'string' ? JSON.parse(r.dataIsian || '{}') : (r.dataIsian || {}); } catch (e) {}
  Object.keys(isian).forEach(function (k) {
    if (!isian[k]) return;
    kiri += '<tr><td style="width:170px;color:var(--ink-2);font-size:12.5px">' + esc(labelDariKunci(k)) +
      '</td><td>' + esc(String(isian[k]).replace(/<[^>]+>/g, ' ').substring(0, 400)) + '</td></tr>';
  });
  kiri += '</tbody></table></div>';

  if (r.isiNaskah) {
    kiri += '<div class="label-kecil mt20 mb8">Naskah Surat</div>' +
            '<div class="dok-pratinjau" style="max-height:260px">' + r.isiNaskah + '</div>';
  }

  var dok = berkasUtama_(r);
  var idb = idDrive(dok);
  var kanan = '<div class="baris antara g8 mb8 bungkus">' +
    '<div class="label-kecil">Pratinjau Dokumen</div>' +
    (dok ? '<button class="btn btn-hantu btn-sm" onclick="pratinjauBerkas(\'' + esc(dok) + '\',\'' +
      esc(String(judulDok).replace(/'/g, '')) + '\')"><i class="bi bi-arrows-fullscreen"></i> ' +
      'Perbesar</button>' : '') + '</div>';

  kanan += dok
    ? '<div class="pratinjau-bingkai" style="height:52vh"><iframe loading="lazy" src="' +
      esc(idb ? urlPratinjauDrive(idb) : dok) + '" title="Pratinjau dokumen"></iframe></div>' +
      '<div class="baris g8 mt12 bungkus">' +
      '<a class="btn btn-navy btn-sm sisa" href="' + esc(idb ? urlUnduhDrive(idb) : dok) +
        '" download target="_blank" rel="noopener"><i class="bi bi-download"></i> Unduh</a>' +
      (Sesi.boleh('tulis') ? '<button class="btn btn-garis btn-sm sisa" onclick="bukaUnggahScan(\'' +
        kunci + '\',\'' + r.id + '\')"><i class="bi bi-upload"></i> Ganti Scan Asli</button>' : '') +
      '</div>'
    : '<div class="kosong" style="padding:36px 18px"><i class="bi bi-file-earmark-x"></i>' +
      '<div class="k-judul">Belum ada dokumen</div>' +
      '<div class="k-desk">Dokumen PDF akan muncul setelah data diterbitkan, atau unggah ' +
      'hasil pindai surat asli bertanda tangan basah.</div>' +
      (Sesi.boleh('tulis') ? '<div class="mt16"><button class="btn btn-utama" onclick="bukaUnggahScan(\'' +
        kunci + '\',\'' + r.id + '\')"><i class="bi bi-upload"></i> Unggah Scan Asli</button></div>' : '') +
      '</div>';

  if (r.pdfUrl && r.fileScanUrl) {
    kanan += '<div class="garis"></div>' +
      '<div class="baris antara g8 bungkus">' +
      '<div><div class="label-kecil mb4">Arsip Scan Asli (Tanda Tangan Basah)</div>' +
      '<div class="tx-sm tx-3">Tersimpan di Google Drive</div></div>' +
      '<button class="btn btn-garis btn-sm" onclick="pratinjauBerkas(\'' + esc(r.fileScanUrl) +
      '\',\'Scan Asli — ' + esc(String(judulDok).replace(/'/g, '')) + '\')">' +
      '<i class="bi bi-eye"></i> Lihat Scan</button></div>';
  }

  var bisaUbah = Sesi.boleh('tulis') &&
    (['suratKeluar', 'sk', 'beritaAcara'].indexOf(kunci) < 0 || r.status === 'DRAF');

  bukaModal({
    lebar: true,
    judul: 'Detail ' + infoModul(kunci).nama,
    sub: nomor || undefined,
    tanpaFokus: true,
    isi: '<div class="detail-grid"><div>' + kiri + '</div><div>' + kanan + '</div></div>',
    kaki:
      (bisaUbah
        ? '<button class="btn btn-navy" onclick="bukaEditModul(\'' + kunci + '\',\'' + r.id + '\')">' +
          '<i class="bi bi-pencil-square"></i> Edit Data</button>' : '') +
      (Sesi.boleh('tulis')
        ? '<button class="btn btn-garis" onclick="bukaUnggahScan(\'' + kunci + '\',\'' + r.id + '\')">' +
          '<i class="bi bi-upload"></i> Unggah Scan Asli</button>' : '') +
      (Sesi.boleh('hapus')
        ? '<button class="btn btn-bahaya" onclick="tutupModal();hapusData(\'' + kunci + '\',\'' +
          r.id + '\')"><i class="bi bi-trash"></i> Hapus</button>'
        : '') +
      '<button class="btn btn-hantu" onclick="tutupModal()">Tutup</button>'
  });
}

function labelDariKunci(k) {
  return String(k).toLowerCase().split('_').filter(Boolean).map(function (w) {
    return w.charAt(0).toUpperCase() + w.substring(1);
  }).join(' ');
}

/* ── Unggah hasil pindai surat asli bertanda tangan basah ────────── */
function bukaUnggahScan(kunci, id) {
  var cfg = Adm.boot.config || {};
  window.__scanSementara = null;

  bukaModal({
    sempit: true,
    judul: 'Unggah Scan Surat Asli',
    sub: 'Arsip lembar bertanda tangan basah & berstempel untuk dokumen ini.',
    isi:
      '<div class="baris g10 mb16" style="align-items:flex-start;background:var(--info-bg);' +
      'color:var(--info-fg);padding:12px 14px;border-radius:var(--r-lg)">' +
      '<i class="bi bi-info-circle-fill" style="margin-top:2px"></i>' +
      '<div class="sisa tx-sm" style="line-height:1.6">Berkas disimpan di Google Drive pada folder ' +
      'modul terkait dan tertaut otomatis ke data ini. Dokumen PDF hasil generate tidak terhapus.</div></div>' +

      '<label class="jatuhkan" style="display:block">' +
      '<i class="bi bi-cloud-arrow-up j-ikon"></i>' +
      '<div class="j-judul">Pilih atau jatuhkan berkas hasil pindai</div>' +
      '<div class="j-desk">Format ' + esc(String(cfg.UPLOAD_FORMAT || 'pdf,jpg,png').toUpperCase()) +
      ' · maksimal ' + esc(String(cfg.UPLOAD_MAX_MB || 2)) + ' MB</div>' +
      '<div class="mt8"><span class="chip-nomor" id="scanNama">belum ada berkas dipilih</span></div>' +
      '<input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" ' +
      'onchange="pilihScanAsli(this)"></label>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnScan" onclick="simpanScanAsli(\'' + kunci + '\',\'' +
          id + '\')"><i class="bi bi-cloud-upload"></i> Unggah &amp; Arsipkan</button>'
  });
}

function pilihScanAsli(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  var cfg = Adm.boot.config || {};
  var galat = validasiBerkas(f, Number(cfg.UPLOAD_MAX_MB || 2),
    String(cfg.UPLOAD_FORMAT || 'pdf,jpg,jpeg,png').split(',').map(function (x) { return x.trim(); }));
  if (galat) { toast(galat, 'galat'); input.value = ''; return; }

  bacaBerkasBase64(f).then(function (b64) {
    window.__scanSementara = { nama: f.name, mime: f.type, base64: b64 };
    el('scanNama').textContent = f.name + ' · ' + formatUkuran(f.size);
  }).catch(function (e) { toast(e.message, 'galat'); });
}

function simpanScanAsli(kunci, id) {
  if (!window.__scanSementara) { toast('Pilih berkas hasil pindai terlebih dahulu.', 'peringatan'); return; }
  var btn = el('btnScan');
  tombolSibuk(btn, true, 'Mengunggah…');

  kirim('lampirkanScan', {
    modul: kunci, id: id,
    nama: window.__scanSementara.nama,
    mime: window.__scanSementara.mime,
    base64: window.__scanSementara.base64
  }, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    window.__scanSementara = null;
    tutupModal();
    toast('Scan asli berhasil diarsipkan ke Google Drive.', 'sukses');
    upsertLokal(kunci, r.data.record);
    if (Adm.modulAktif === kunci && !_tumpukanModal.length) renderModul(kunci);
  });
}

function labelKolom(k) {
  return String(k)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, function (c) { return c.toUpperCase(); })
    .replace(/\bPdf\b/, 'PDF').replace(/\bUrl\b/, 'URL').replace(/\bSk\b/, 'SK')
    .replace(/\bMou\b/, 'MOU').replace(/\bTte\b/, 'TTE').replace(/\bNidn\b/, 'NIDN');
}

function eksporModul(kunci) {
  var kolom = KOLOM_MODUL[kunci] || [];
  if (!kolom.length && (kunci === 'pengajuanMhs' || kunci === 'pengajuanDosen')) {
    kolom = [{ k: 'noRef', l: 'No. Referensi' }, { k: 'tanggal', l: 'Tanggal' }, { k: 'nama', l: 'Nama' },
             { k: kunci === 'pengajuanDosen' ? 'nuptk' : 'nim', l: 'Identitas' }, { k: 'prodi', l: 'Prodi' },
             { k: kunci === 'pengajuanDosen' ? 'klasifikasi' : 'skema', l: 'Kategori' }, { k: 'status', l: 'Status' }];
  }
  var data = Adm.boot.data[kunci] || [];
  if (!data.length) { toast('Tidak ada data untuk diekspor.', 'peringatan'); return; }
  unduhBerkas('e-SURAT_' + kunci + '_' + tglInput() + '.csv', keCsv(kolom, data));
}

/* ── Sidebar seluler ────────────────────────────────────────────── */
function bukaSidebar() {
  el('sidebar').classList.add('buka');
  el('sbTirai').classList.add('tampil');
}
function tutupSidebar() {
  el('sidebar').classList.remove('buka');
  el('sbTirai').classList.remove('tampil');
}

/* ── Akun ───────────────────────────────────────────────────────── */
/** Foto profil Google (bila ada) atau inisial nama. */
function avatarPengguna_(u) {
  var f = String((u && u.foto) || '');
  if (/^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(f)) {
    return '<img src="' + esc(f) + '" alt="" referrerpolicy="no-referrer" ' +
           'style="width:100%;height:100%;border-radius:50%;object-fit:cover" ' +
           'onerror="this.parentNode.textContent=\'' + esc(inisial(u.nama)) + '\'">';
  }
  return esc(inisial(u && u.nama));
}

function bukaMenuAkun() {
  var u = Adm.boot.user || {};
  bukaModal({
    sempit: true,
    judul: 'Akun Saya',
    isi: '<div class="baris g12 mb16"><div class="avatar" style="width:48px;height:48px;font-size:16px;overflow:hidden">' +
      avatarPengguna_(u) + '</div><div><div class="tebal">' + esc(u.nama) + '</div>' +
      '<div class="tx-sm tx-3">' + esc(u.email) + '</div>' +
      '<div class="mt4"><span class="lencana info">' + esc(u.peran) + '</span></div></div></div>' +
      '<div class="tabel-bungkus"><table class="data"><tbody>' +
      '<tr><td style="color:var(--ink-2)">Jabatan</td><td>' + esc(u.jabatan || '—') + '</td></tr>' +
      '<tr><td style="color:var(--ink-2)">Masuk sejak</td><td>' + tglJam(u.masuk) + '</td></tr>' +
      '<tr><td style="color:var(--ink-2)">Metode masuk</td><td>' + esc(u.metode || 'Kata sandi') + '</td></tr>' +
      '<tr><td style="color:var(--ink-2)">Versi aplikasi</td><td class="mono">' +
      esc(Adm.boot.versi || APP.versi) + '</td></tr></tbody></table></div>',
    kaki: '<button class="btn btn-bahaya" onclick="tutupModal();logout()">' +
          '<i class="bi bi-box-arrow-right"></i> Keluar</button>'
  });
}

function bukaGantiSandi() {
  bukaModal({
    sempit: true,
    judul: 'Ganti Kata Sandi',
    sub: 'Gunakan kombinasi yang kuat dan tidak dipakai di layanan lain.',
    isi: bidangTeks({ id: 'sandiLama', label: 'Kata Sandi Saat Ini', tipe: 'password', wajib: true, otomatis: 'current-password' }) +
         bidangTeks({ id: 'sandiBaru', label: 'Kata Sandi Baru', tipe: 'password', wajib: true, otomatis: 'new-password',
                      bantu: 'Minimal 8 karakter — campurkan huruf, angka, dan simbol.' }) +
         bidangTeks({ id: 'sandiUlang', label: 'Ulangi Kata Sandi Baru', tipe: 'password', wajib: true, otomatis: 'new-password' }),
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" id="btnSandi" onclick="simpanSandi()">' +
          '<i class="bi bi-shield-lock"></i> Perbarui Kata Sandi</button>'
  });
}

function simpanSandi() {
  if (!validasiForm(null, [
    { id: 'sandiLama', wajib: true },
    { id: 'sandiBaru', wajib: true, min: 8 },
    { id: 'sandiUlang', wajib: true }
  ])) return;

  if (ambilNilai('sandiBaru') !== ambilNilai('sandiUlang')) {
    tandaiGalat(el('sandiUlang'), 'Konfirmasi kata sandi tidak cocok.');
    return;
  }

  var btn = el('btnSandi');
  tombolSibuk(btn, true);
  kirim('gantiPassword', { lama: ambilNilai('sandiLama'), baru: ambilNilai('sandiBaru') }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    tutupModal();
    toast(r.message, 'sukses');
  });
}

function bukaNotifikasi() {
  var d = Adm.boot.dashboard || {};
  var a = d.antrean || [];
  bukaModal({
    judul: 'Pemberitahuan',
    sub: a.length ? a.length + ' pengajuan menunggu tindakan Anda' : 'Tidak ada pemberitahuan baru',
    isi: a.length
      ? a.map(function (x) {
          return '<div class="antrean-item" onclick="tutupModal();bukaVerifikasi(\'' + x.jenis + '\',\'' +
            x.id + '\')" style="cursor:pointer">' +
            '<div class="avatar ai-avatar">' + inisial(x.nama) + '</div>' +
            '<div class="ai-isi"><div class="ai-nama">' + esc(x.nama) + '</div>' +
            '<div class="ai-perihal">' + esc(x.perihal) + '</div>' +
            '<div class="ai-meta">' + umurTeks(x.tanggal) + ' · menunggu ' + esc(x.menunggu) + '</div></div>' +
            '<i class="bi bi-chevron-right tx-3"></i></div>';
        }).join('')
      : keadaanKosong('Semua sudah tertangani', 'Tidak ada berkas yang menunggu tindakan Anda.', 'bi-bell-slash'),
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>'
  });
}
