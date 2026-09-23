/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/app.js  (v4.2)
   Titik masuk aplikasi: pemuatan awal, perpindahan lapisan, autentikasi.
   Berkas ini dimuat TERAKHIR — seluruh fungsi lain sudah tersedia.

   Kecepatan v4.2:
   · Data portal diambil sejak api.js dimuat (paralel dengan pustaka CDN)
   · Portal langsung tampil dari cache peramban, lalu disegarkan diam-diam
   · Panel admin tampil dari snapshot, lalu disegarkan di latar belakang
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
  window.scrollTo(0, 0);
}

function bukaLogin() {
  tampilkanLapisan('login');
}

/* ── Login Google (OAuth 2.0 · Google Identity Services) ────────── */
var LoginGoogle = { clientId: '', siap: false, percobaan: 0 };

function infoLogin(html) { var i = el('loginInfo'); if (i) { i.innerHTML = html || ''; i.hidden = !html; } }
function galatLogin(pesan) {
  var g = el('loginGalat'); if (!g) return;
  g.hidden = !pesan;
  g.innerHTML = pesan ? '<i class="bi bi-exclamation-octagon-fill"></i> <span>' + esc(pesan) + '</span>' : '';
}

/** Ambil pengaturan login dari data portal (cache) atau dari server. */
function pengaturanLogin_() {
  var a = Publik.data && Publik.data.auth;
  if (a && a.googleClientId) return Promise.resolve(a);
  var janji = (typeof JanjiBootPublik !== 'undefined' && JanjiBootPublik) ? JanjiBootPublik : ambil('bootstrapPublik', {});
  return janji.then(function (r) {
    if (!r || !r.success) throw new Error((r && r.message) || 'Server tidak merespons.');
    var aa = r.data && r.data.auth;
    if (aa && aa.googleClientId) return aa;
    // Cache lama mungkin belum memuat Client ID → minta data segar sekali
    return ambil('bootstrapPublik', { _t: Date.now() }).then(function (r2) {
      return (r2 && r2.success && r2.data && r2.data.auth) || aa || null;
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
    if (!auth) {
      infoLogin('');
      galatLogin('Server belum diperbarui ke versi login Google (v4.3). Tempel berkas .gs terbaru lalu Deploy → New version.');
      return;
    }
    if (!auth.googleClientId) {
      infoLogin('');
      galatLogin('Login Google belum dikonfigurasi. Super Admin perlu mengisi Client ID lalu menjalankan ATUR_LOGIN_GOOGLE() di Apps Script.');
      return;
    }
    LoginGoogle.clientId = auth.googleClientId;
    pasangTombolGoogle_();
  }).catch(function (e) {
    infoLogin('');
    galatLogin('Tidak dapat terhubung ke server: ' + (e && e.message ? e.message : e));
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
    ['pengaturan.js', typeof renderPengaturan === 'function']
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
