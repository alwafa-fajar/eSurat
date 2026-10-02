/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/app.js  (v4.4)
   Titik masuk aplikasi: pemuatan awal, perpindahan lapisan, autentikasi.
   Berkas ini dimuat TERAKHIR — seluruh fungsi lain sudah tersedia.

   Kecepatan v4.2:
   · Data portal diambil sejak api.js dimuat (paralel dengan pustaka CDN)
   · Portal langsung tampil dari cache peramban, lalu disegarkan diam-diam
   · Panel admin tampil dari snapshot, lalu disegarkan di latar belakang

   v4.4 — sesi:
   · "Masuk Admin" saat sesi masih aktif → langsung kembali ke panel (tanpa
     login Google ulang)
   · Tidak ada aktivitas selama batas (bawaan 60 menit) → sesi berakhir otomatis
   · Keluar di satu tab = keluar di semua tab
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
  var l = el('layarMuat');
  if (l) l.classList.remove('sembunyi');
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
  if (nama !== 'publik' && typeof tutupFormPengajuan === 'function') tutupFormPengajuan();
  if (nama === 'login') siapkanTombolGoogle();
  perbaruiTombolMasuk();
  window.scrollTo(0, 0);
}

/** v4.4 — sesi masih aktif → langsung ke panel, tanpa login Google ulang. */
function bukaLogin() {
  if (Sesi.ada()) { kembaliKePanel(); return; }
  tampilkanLapisan('login');
}

function kembaliKePanel() {
  tampilkanLapisan('admin');
  if (!Adm.boot) {
    jalankanAman(function () { muatPanelAdmin(); }, 'Panel');
  } else {
    renderModul(Adm.modulAktif);
    segarkanPanelDiamDiam();         // sekaligus memastikan sesi masih berlaku di server
  }
}

/** Tombol "Masuk Admin" di portal berubah menjadi "Kembali ke Panel" bila sesi aktif. */
function perbaruiTombolMasuk() {
  var ada = Sesi.ada();
  $$('#publicApp [onclick="bukaLogin()"]').forEach(function (b) {
    var span = b.querySelector('span');
    if (span) span.textContent = ada ? 'Kembali ke Panel' : 'Masuk Admin';
    var ikon = b.querySelector('i');
    if (ikon) ikon.className = 'bi ' + (ada ? 'bi-speedometer2' : 'bi-box-arrow-in-right');
    b.title = ada ? 'Sesi Anda masih aktif — kembali ke panel tanpa login ulang' : 'Masuk ke panel administrasi';
  });
}

/** Dipanggil saat server/klien menyatakan sesi berakhir. */
function sesiBerakhir(pesan, kode) {
  Adm.boot = null;
  Adm.modulAktif = 'dashboard';
  Sesi.hapusBoot();
  try { if (typeof _tumpukanModal !== 'undefined' && _tumpukanModal.length) tutupSemuaModal(); } catch (e) {}
  var teks = pesan || (kode === 'SESSION_IDLE' ? 'Sesi berakhir karena tidak ada aktivitas.' : 'Sesi Anda telah berakhir.');
  toast(teks + ' Silakan masuk kembali.', 'peringatan', 7000);
  if (Aplikasi.lapisan === 'admin') tampilkanLapisan('login');
  else perbaruiTombolMasuk();
  if (Aplikasi.lapisan === 'login') infoLogin('<i class="bi bi-clock-history"></i> ' + esc(teks));
}

/* ── Pengawas sesi: diam terlalu lama → keluar otomatis; aktif → sesi diperpanjang ── */
var Pengawas = { jam: null, sudahPeringatan: false };
function pasangPengawasSesi() {
  if (Pengawas.jam) return;
  Pengawas.jam = setInterval(periksaSesi, 30000);
  window.addEventListener('storage', function (e) {
    if (e.key !== APP.kunciSesi) return;
    if (!e.newValue && Sesi.ada()) {                 // keluar dari tab lain
      Sesi.token = null; Sesi.user = null;
      sesiBerakhir('Anda telah keluar dari tab lain.');
    } else if (e.newValue && !Sesi.ada()) {          // masuk dari tab lain
      Sesi.muat();
      perbaruiTombolMasuk();
    }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) periksaSesi(); });
}

function periksaSesi() {
  if (!Sesi.ada()) return;
  var diam = Aktivitas.diamDetik(), batas = Sesi.batasDiamDetik();
  if (diam >= batas) {
    var menit = Math.round(batas / 60);
    kirim('logout', {});
    Sesi.hapus();
    sesiBerakhir('Sesi berakhir karena tidak ada aktivitas selama ' + menit + ' menit.', 'SESSION_IDLE');
    return;
  }
  if (batas - diam <= 120) {
    if (!Pengawas.sudahPeringatan) {
      Pengawas.sudahPeringatan = true;
      toast('Sesi akan berakhir ±2 menit lagi karena tidak ada aktivitas. Gerakkan tetikus atau ketuk layar untuk tetap masuk.', 'peringatan', 10000);
    }
    return;
  }
  Pengawas.sudahPeringatan = false;
  // Pengguna aktif (mis. di portal) tetapi tidak memanggil server → perpanjang sesi server tiap 10 menit
  if (diam < 120 && Date.now() - (Sesi.panggilTerakhir || 0) > 10 * 60000) {
    Sesi.panggilTerakhir = Date.now();
    kirim('validateSession', {}).then(function (r) {
      if (r && r.success && r.data) Sesi.simpan(Sesi.token, r.data);
    });
  }
}

/* ── Login Google (OAuth 2.0 · Google Identity Services) ────────── */
var LoginGoogle = { clientId: '', siap: false, percobaan: 0 };

function infoLogin(html) { var i = el('loginInfo'); if (i) { i.innerHTML = html || ''; i.hidden = !html; } }
function galatLogin(pesan) {
  var g = el('loginGalat'); if (!g) return;
  g.hidden = !pesan;
  g.innerHTML = pesan ? '<i class="bi bi-exclamation-octagon-fill"></i> <span>' + esc(pesan) + '</span>' : '';
}

/** Ambil pengaturan login langsung dari server (aksi infoLogin, tanpa cache). */
function pengaturanLogin_() {
  return ambil('infoLogin', { _t: Date.now() }).then(function (r) {
    if (r && r.success && r.data && r.data.googleClientId !== undefined) return r.data;
    // Server lama tidak mengenal infoLogin → cari tahu versinya untuk pesan yang jelas
    return ambil('ping', { _t: Date.now() }).then(function (p) {
      var versi = (p && p.success && p.data && p.data.versi) || '';
      var idDeploy = String(GAS_URL).split('/s/')[1] || '';
      idDeploy = idDeploy.split('/')[0];
      var err = new Error(
        (versi ? 'Server yang terhubung masih versi ' + versi + ' (butuh 4.3.0). '
               : ((p && p.message) || 'Server tidak merespons.') + ' ') +
        'URL di js/config.js berakhiran …' + idDeploy.slice(-10) + '/exec. ' +
        'Pastikan kode baru sudah di-Deploy → Manage deployments → ✏ → Version: New version pada deployment dengan URL yang SAMA.');
      err.versiLama = true;
      throw err;
    });
  });
}

function siapkanTombolGoogle() {
  galatLogin('');
  if (LoginGoogle.siap) { infoLogin(''); return; }
  infoLogin('<span class="spinner"></span> Menyiapkan tombol Google…');

  pengaturanLogin_().then(function (auth) {
    var f = el('formLogin');
    if (f) f.hidden = !(auth && auth.sandiAktif);
    if (!auth.googleClientId) {
      infoLogin('');
      galatLogin('Login Google belum dikonfigurasi. Super Admin perlu mengisi Client ID lalu menjalankan ATUR_LOGIN_GOOGLE() di Apps Script.');
      return;
    }
    LoginGoogle.clientId = auth.googleClientId;
    pasangTombolGoogle_();
  }).catch(function (e) {
    infoLogin('');
    galatLogin((e && e.versiLama ? '' : 'Tidak dapat terhubung ke server: ') + (e && e.message ? e.message : e));
  });
}

function pasangTombolGoogle_() {
  if (!(window.google && google.accounts && google.accounts.id)) {
    if (++LoginGoogle.percobaan > 60) {   // ± 12 detik
      infoLogin('');
      galatLogin('Layanan Google Sign-In gagal dimuat. Periksa koneksi internet atau matikan pemblokir iklan/skrip, lalu muat ulang halaman.');
      return;
    }
    setTimeout(pasangTombolGoogle_, 200);
    return;
  }
  google.accounts.id.initialize({
    client_id: LoginGoogle.clientId,
    callback: tanganiKredensialGoogle,
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
    use_fedcm_for_prompt: true
  });
  var wadah = el('tombolGoogle');
  wadah.innerHTML = '';
  google.accounts.id.renderButton(wadah, {
    type: 'standard', theme: 'filled_blue', size: 'large', shape: 'pill',
    text: 'signin_with', logo_alignment: 'left', locale: 'id',
    width: Math.min(Math.max(wadah.clientWidth || 300, 220), 400)
  });
  LoginGoogle.siap = true;
  infoLogin('');
}

function tanganiKredensialGoogle(resp) {
  if (!resp || !resp.credential) { galatLogin('Login Google dibatalkan.'); return; }
  galatLogin('');
  el('tombolGoogle').classList.add('sibuk');
  infoLogin('<span class="spinner"></span> Memverifikasi akun Google…');

  kirim('loginGoogle', { credential: resp.credential, muatPanel: true }).then(function (r) {
    el('tombolGoogle').classList.remove('sibuk');
    infoLogin('');
    if (!r.success) { galatLogin(r.message); return; }
    Sesi.simpan(r.data.token, r.data.user);
    toast(r.message, 'sukses');
    tampilkanLapisan('admin');
    muatPanelAdmin(r.data.boot);
  });
}

function keluarKePortal() {
  tampilkanLapisan('publik');      // v4.4: sesi tetap aktif — "Kembali ke Panel" tanpa login ulang
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

  kirim('login', { email: email, password: sandi, muatPanel: true }).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { galatLogin(r.message); return; }

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
    // Keluar seketika di sisi klien; pemberitahuan ke server berjalan di latar
    kirim('logout', {});
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    Sesi.hapus();
    Adm.boot = null;
    Adm.modulAktif = 'dashboard';
    LoginGoogle.siap = false;
    tampilkanLapisan('publik');
    toast('Anda telah keluar dari sistem.', 'info');
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
    ['pengaturan.js', typeof renderPengaturan === 'function'],
    ['cicilan.js', typeof renderMonitoringCicilan === 'function'],
    ['komunikasi.js', typeof renderKomunikasi === 'function'],
    ['integrasi.js', typeof tabTteResmi === 'function']
  ];
  return wajib.filter(function (w) { return !w[1]; }).map(function (w) { return w[0]; });
}

/* ── Portal: tampil dari cache, segarkan di latar ───────────────── */
var _jejakPortal = '';

function terapkanPortal(data, dariCache) {
  var jejak = JSON.stringify(data);
  if (jejak === _jejakPortal) return;              // tidak ada perubahan → tidak render ulang
  if (!dariCache && _jejakPortal && Publik.popupTerbuka) {
    // Pengguna sedang mengisi formulir — tunda render ulang agar isian tidak terganggu
    setTimeout(function () { terapkanPortal(data, false); }, 5000);
    return;
  }
  _jejakPortal = jejak;
  jalankanAman(function () { renderPortal(data); }, 'Portal');
}

/* ── Pemuatan awal ──────────────────────────────────────────────── */
function mulaiAplikasi() {
  muatTema();
  statusMuat('Memeriksa keutuhan berkas…');

  var hilang = periksaKeutuhan();
  if (hilang.length) {
    galatMuat('Berkas skrip tidak lengkap',
      'Berkas berikut tidak termuat: ' + hilang.join(', ') + '.',
      'Pastikan folder <code>js/</code> berisi seluruh berkas dan struktur foldernya ' +
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

  Sesi.muat();
  pasangPengawasSesi();
  if (Sesi.berakhirKarenaDiam) {
    setTimeout(function () { toast('Sesi sebelumnya berakhir karena tidak ada aktivitas. Silakan masuk kembali bila diperlukan.', 'info', 7000); }, 800);
  }

  /* Jalur cepat 1 — sesi admin masih ada + snapshot panel → langsung panel */
  if (Sesi.ada()) {
    var snapshot = Sesi.ambilBoot(30 * 60 * 1000);
    if (snapshot) {
      tampilkanLapisan('admin');
      jalankanAman(function () { muatPanelAdmin(snapshot); }, 'Panel');
      sembunyikanLoading();
      segarkanPanelDiamDiam();
    }
  }

  /* Jalur cepat 2 — portal dari cache peramban (tampil < 100 ms) */
  var cache = CachePortal.ambil();
  if (cache) {
    terapkanPortal(cache.data, true);
    if (!Aplikasi.siap && !Sesi.ada()) { tampilkanLapisan('publik'); sembunyikanLoading(); }
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

  (JanjiBootPublik || ambil('bootstrapPublik', {})).then(function (r) {
    clearTimeout(batas);

    if (!r.success) {
      if (cache) return;   // tetap pakai data cache, jangan hentikan pengguna
      galatMuat('Data portal gagal dimuat', r.message,
        'Bila pesan menyebut spreadsheet atau sheet tidak ditemukan, jalankan ' +
        '<code>MIGRASI_SKEMA()</code> di editor Apps Script lalu deploy ulang.');
      return;
    }

    CachePortal.simpan(r.data);
    terapkanPortal(r.data, false);

    if (Aplikasi.siap) return;   // sudah tampil dari cache/snapshot

    if (Sesi.ada()) {
      statusMuat('Memulihkan sesi administrasi…');
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
    if (cache) return;
    galatMuat('Gagal menghubungi server', e.message || String(e),
      'Periksa koneksi internet Anda dan pastikan URL Web App masih aktif.');
  });
}

/* ── Pemasangan pendengar peristiwa ─────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  var fMhs = el('formMhs');       if (fMhs) fMhs.addEventListener('submit', kirimPengajuanMhs);
  var fDsn = el('formDsn');       if (fDsn) fDsn.addEventListener('submit', kirimPengajuanDsn);
  var fLacak = el('formLacak');   if (fLacak) fLacak.addEventListener('submit', jalankanLacak);
  var fLogin = el('formLogin');   if (fLogin) fLogin.addEventListener('submit', prosesLogin);

  /* Draf otomatis & bilah kelengkapan */
  if (fMhs) fMhs.addEventListener('input', function () { simpanDrafOtomatis('mhs'); });
  if (fDsn) fDsn.addEventListener('input', function () { simpanDrafOtomatis('dsn'); });
  if (fMhs) fMhs.addEventListener('change', function () { simpanDrafOtomatis('mhs'); });
  if (fDsn) fDsn.addEventListener('change', function () { simpanDrafOtomatis('dsn'); });

  ['btnTemaPublik', 'btnTemaAdmin'].forEach(function (id) {
    var b = el(id);
    if (b) b.addEventListener('click', function () {
      tukarTema();
      if (Adm.boot && Adm.modulAktif === 'dashboard') {
        setTimeout(function () { jalankanAman(function () { gambarGrafikDashboard(Adm.boot.dashboard); }); }, 60);
      }
    });
  });

  var alasan = el('mhsAlasan');
  if (alasan) alasan.addEventListener('input', function () {
    var h = el('mhsAlasanHitung');
    if (h) h.textContent = alasan.value.length;
    if (alasan.value.length > 0) tandaiLangkah('Mhs', 2);
  });

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
    var tujuan = ['dashboard', 'laporan', 'pengaturan'].indexOf(Adm.modulAktif) >= 0 ? 'suratKeluar' : Adm.modulAktif;
    Adm.filter[tujuan] = q;
    Adm.halaman[tujuan] = 1;
    renderModul(tujuan);
  });

  jalankanAman(mulaiAplikasi, 'Pemuatan awal');
});
