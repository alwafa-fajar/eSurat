/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/app.js
   Titik masuk aplikasi: pemuatan awal, perpindahan lapisan, autentikasi.
   Berkas ini dimuat TERAKHIR — seluruh fungsi lain sudah tersedia.
   ═══════════════════════════════════════════════════════════════════ */

var Aplikasi = { siap: false, lapisan: 'publik' };

/* ── Layar muat awal ────────────────────────────────────────────── */
function statusMuat(teks) {
  var e = el('muatStatus');
  if (e) e.textContent = teks;
}

function sembunyikanLoading() {
  var l = el('layarMuat');
  if (l) l.classList.add('sembunyi');
  Aplikasi.siap = true;
}

function galatMuat(judul, detail, saran) {
  var g = el('muatGalat');
  if (!g) return;
  g.innerHTML = '<div style="font-weight:600;margin-bottom:7px">' +
    '<i class="bi bi-exclamation-octagon-fill"></i> ' + esc(judul) + '</div>' +
    '<div style="margin-bottom:9px;line-height:1.65">' + esc(detail) + '</div>' +
    (saran ? '<div style="line-height:1.65">' + saran + '</div>' : '');
  g.classList.add('tampil');
  statusMuat('Pemuatan terhenti.');
}

/* ── Perpindahan lapisan ────────────────────────────────────────── */
function tampilkanLapisan(nama) {
  Aplikasi.lapisan = nama;
  ['publicApp', 'loginApp', 'adminApp'].forEach(function (id) {
    el(id).classList.remove('aktif');
  });
  var peta = { publik: 'publicApp', login: 'loginApp', admin: 'adminApp' };
  el(peta[nama] || 'publicApp').classList.add('aktif');
  window.scrollTo(0, 0);
}

function bukaLogin() {
  tampilkanLapisan('login');
  setTimeout(function () { var e = el('loginEmail'); if (e) e.focus(); }, 120);
}

function keluarKePortal() {
  tampilkanLapisan('publik');
}

/* ── Autentikasi ────────────────────────────────────────────────── */
function prosesLogin(e) {
  e.preventDefault();
  var btn = e.submitter || $('#formLogin button[type=submit]');

  var email = ambilNilai('loginEmail');
  var sandi = ambilNilai('loginSandi');
  if (!email || !sandi) {
    toast('Surel dan kata sandi wajib diisi.', 'peringatan');
    return;
  }

  tombolSibuk(btn, true, 'Memverifikasi…');

  // muatPanel:true → server mengembalikan token DAN data panel sekaligus,
  // memangkas satu perjalanan penuh ke server menuju dashboard.
  kirim('login', { email: email, password: sandi, muatPanel: true }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }

    Sesi.simpan(r.data.token, r.data.user);
    el('loginSandi').value = '';
    el('loginEmail').value = '';
    toast(r.message, 'sukses');
    tampilkanLapisan('admin');
    muatPanelAdmin(r.data.boot);
  });
}

function logout() {
  konfirmasi({
    judul: 'Keluar dari Sistem',
    pesan: 'Sesi Anda akan diakhiri. Data yang belum disimpan akan hilang.',
    ya: 'Ya, Keluar'
  }).then(function (ya) {
    if (!ya) return;
    kirim('logout', {}).then(function () {
      Sesi.hapus();
      Adm.boot = null;
      Adm.modulAktif = 'dashboard';
      tampilkanLapisan('publik');
      toast('Anda telah keluar dari sistem.', 'info');
    });
  });
}

/* ── Penangkap galat runtime ────────────────────────────────────── */
window.addEventListener('error', function (e) {
  if (!Aplikasi.siap) {
    galatMuat('Skrip aplikasi gagal dijalankan',
      (e.message || 'Galat tidak diketahui') + ' — ' +
      (e.filename || '').split('/').pop() + ' baris ' + (e.lineno || '?'),
      'Pastikan seluruh berkas di folder <code>js/</code> dan <code>css/</code> tersalin lengkap ' +
      'dan struktur foldernya tidak berubah.');
    return;
  }
  console.error('[e-SURAT]', e.error || e.message);
  toast('Terjadi galat tak terduga: ' + (e.message || 'tidak diketahui'), 'galat');
});

window.addEventListener('unhandledrejection', function (e) {
  var pesan = (e.reason && e.reason.message) || String(e.reason || 'Galat tidak diketahui');
  console.error('[e-SURAT] Promise ditolak:', e.reason);
  if (Aplikasi.siap) toast(pesan, 'galat');
});

/* ── Pemeriksaan keutuhan berkas skrip ──────────────────────────── */
function periksaKeutuhan() {
  var wajib = [
    ['config.js', typeof GAS_URL !== 'undefined' && typeof APP !== 'undefined'],
    ['api.js', typeof kirim === 'function' && typeof Sesi === 'object'],
    ['ui.js', typeof toast === 'function' && typeof bukaModal === 'function'],
    ['publik.js', typeof renderPortal === 'function'],
    ['admin.js', typeof renderModul === 'function'],
    ['surat.js', typeof bukaGeneratorSurat === 'function'],
    ['verifikasi.js', typeof renderAntreanPengajuan === 'function'],
    ['laporan.js', typeof renderLaporan === 'function'],
    ['pengaturan.js', typeof renderPengaturan === 'function']
  ];
  return wajib.filter(function (w) { return !w[1]; }).map(function (w) { return w[0]; });
}

/* ── Pemuatan awal ──────────────────────────────────────────────── */
function mulaiAplikasi() {
  muatTema();
  statusMuat('Memeriksa keutuhan berkas…');

  var hilang = periksaKeutuhan();
  if (hilang.length) {
    galatMuat('Berkas skrip tidak lengkap',
      'Berkas berikut tidak termuat: ' + hilang.join(', ') + '.',
      'Pastikan folder <code>js/</code> berisi kesembilan berkas dan struktur foldernya ' +
      'tidak berubah saat diunggah ke GitHub Pages.');
    return;
  }

  if (!urlSiap()) {
    galatMuat('Alamat backend belum dikonfigurasi',
      'Nilai GAS_URL pada js/config.js masih berupa teks bawaan.',
      'Buka berkas <code>js/config.js</code>, ganti baris <code>var GAS_URL = …</code> dengan URL ' +
      'Web App Apps Script Anda yang berakhiran <code>/exec</code>, lalu unggah ulang.');
    return;
  }

  statusMuat('Menghubungkan ke server…');

  var batas = setTimeout(function () {
    if (!Aplikasi.siap) {
      galatMuat('Server tidak merespons',
        'Tidak ada jawaban dari Apps Script dalam 25 detik.',
        'Periksa tiga hal: (1) URL berakhiran <code>/exec</code>; ' +
        '(2) Deployment memakai <b>Execute as: Me</b> dan <b>Who has access: Anyone</b>; ' +
        '(3) fungsi <code>setupAppEnvironment()</code> sudah pernah dijalankan.');
    }
  }, 25000);

  ambil('bootstrapPublik', {}).then(function (r) {
    clearTimeout(batas);

    if (!r.success) {
      galatMuat('Data portal gagal dimuat', r.message,
        'Bila pesan menyebut spreadsheet atau sheet tidak ditemukan, jalankan ' +
        '<code>setupAppEnvironment()</code> di editor Apps Script lalu deploy ulang.');
      return;
    }

    statusMuat('Memuat data portal…');
    jalankanAman(function () { renderPortal(r.data); }, 'Portal');

    /* Pulihkan sesi admin bila masih berlaku */
    Sesi.muat();
    if (Sesi.ada()) {
      statusMuat('Memulihkan sesi administrasi…');
      // Snapshot panel dari kunjungan sebelumnya → dashboard tampil seketika
      var snapshot = Sesi.ambilBoot(30 * 60 * 1000);
      if (snapshot) {
        tampilkanLapisan('admin');
        jalankanAman(function () { muatPanelAdmin(snapshot); }, 'Panel');
        sembunyikanLoading();
        segarkanPanelDiamDiam();
        return;
      }

      return kirim('validateSession', {}).then(function (s) {
        if (s.success) {
          Sesi.simpan(Sesi.token, s.data);
          tampilkanLapisan('admin');
          sembunyikanLoading();
          return muatPanelAdmin();
        }
        Sesi.hapus();
        tampilkanLapisan('publik');
        sembunyikanLoading();
      });
    }

    tampilkanLapisan('publik');
    sembunyikanLoading();
  }).catch(function (e) {
    clearTimeout(batas);
    galatMuat('Gagal menghubungi server', e.message || String(e),
      'Periksa koneksi internet Anda dan pastikan URL Web App masih aktif.');
  });
}

/* ── Pemasangan pendengar peristiwa ─────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  /* Formulir */
  var fMhs = el('formMhs');       if (fMhs) fMhs.addEventListener('submit', kirimPengajuanMhs);
  var fDsn = el('formDsn');       if (fDsn) fDsn.addEventListener('submit', kirimPengajuanDsn);
  var fLacak = el('formLacak');   if (fLacak) fLacak.addEventListener('submit', jalankanLacak);
  var fLogin = el('formLogin');   if (fLogin) fLogin.addEventListener('submit', prosesLogin);

  /* Tema */
  ['btnTemaPublik', 'btnTemaAdmin'].forEach(function (id) {
    var b = el(id);
    if (b) b.addEventListener('click', function () {
      tukarTema();
      if (Adm.boot && Adm.modulAktif === 'dashboard') {
        setTimeout(function () { jalankanAman(function () { gambarGrafikDashboard(Adm.boot.dashboard); }); }, 60);
      }
    });
  });

  /* Tampilkan / sembunyikan kata sandi */
  var bLihat = el('btnLihatSandi');
  if (bLihat) bLihat.addEventListener('click', function () {
    var i = el('loginSandi');
    var lihat = i.type === 'password';
    i.type = lihat ? 'text' : 'password';
    bLihat.innerHTML = '<i class="bi bi-' + (lihat ? 'eye-slash' : 'eye') + '"></i>';
    i.focus();
  });

  /* Penghitung karakter alasan pengajuan mahasiswa */
  var alasan = el('mhsAlasan');
  if (alasan) alasan.addEventListener('input', function () {
    var h = el('mhsAlasanHitung');
    if (h) h.textContent = alasan.value.length;
    if (alasan.value.length > 0) tandaiLangkah('Mhs', 2);
  });

  /* Tandai langkah ketika identitas mulai diisi */
  ['mhsNama', 'mhsNim'].forEach(function (id) {
    var e = el(id);
    if (e) e.addEventListener('input', function () { tandaiLangkah('Mhs', 1); });
  });
  ['dsnNama', 'dsnNuptk'].forEach(function (id) {
    var e = el(id);
    if (e) e.addEventListener('input', function () { tandaiLangkah('Dsn', 1); });
  });
  var judulKarya = el('dsnJudul');
  if (judulKarya) judulKarya.addEventListener('input', function () { tandaiLangkah('Dsn', 2); });

  /* Pencarian global panel admin */
  var cariGlobal = el('admCariGlobal');
  if (cariGlobal) cariGlobal.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var q = String(cariGlobal.value || '').trim();
    if (!q) return;
    Adm.filter[Adm.modulAktif] = q;
    if (['dashboard', 'laporan', 'pengaturan'].indexOf(Adm.modulAktif) >= 0) {
      renderModul('suratKeluar');
      Adm.filter.suratKeluar = q;
      renderModul('suratKeluar');
    } else {
      renderModul(Adm.modulAktif);
    }
  });

  /* Mulai */
  jalankanAman(mulaiAplikasi, 'Pemuatan awal');
});
