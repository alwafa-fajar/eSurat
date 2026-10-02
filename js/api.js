/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/api.js  (v4.4)
   Lapisan komunikasi ke Google Apps Script REST API.

   Aturan penting:
   · POST WAJIB memakai Content-Type "text/plain;charset=utf-8".
     Header application/json memicu CORS preflight yang diblokir GAS.
   · Token sesi HANYA dikirim di body POST — tidak pernah di URL.
   · Permintaan GET identik yang sedang berjalan digabung (tanpa dobel).

   v4.4:
   · Sesi admin disimpan di localStorage → keluar ke portal / tutup tab lalu
     masuk lagi TIDAK perlu login Google ulang, selama tidak diam > batas
     (bawaan 60 menit; diatur di Pengaturan → Keamanan). Server ikut menegakkan.
   · Setiap POST membawa "diam" (detik sejak aktivitas terakhir pengguna)
   · Aksi tulis penting membawa reqId → aman diulang saat jaringan putus
   · Respons nq > 0 → antrean notifikasi dikirim di latar (aksi "drain")
   · Perf.table() di console: waktu total vs waktu server per aksi
   ═══════════════════════════════════════════════════════════════════ */

var Sesi = {
  token: null,
  user: null,

  muat: function () {
    try {
      var s = localStorage.getItem(APP.kunciSesi) || sessionStorage.getItem(APP.kunciSesi);
      if (!s) return null;
      var o = JSON.parse(s);
      // v4.4 — sesi yang sudah melewati batas diam dibuang di sisi klien juga
      if (o && o.token && Aktivitas.diamDetik() > this.batasDiamDetik(o.user)) {
        this.hapus();
        this.berakhirKarenaDiam = true;
        return null;
      }
      this.token = o.token;
      this.user = o.user;
      return o;
    } catch (e) { return null; }
  },

  simpan: function (token, user) {
    this.token = token;
    this.user = user;
    Aktivitas.tandai(true);
    try {
      localStorage.setItem(APP.kunciSesi, JSON.stringify({ token: token, user: user }));
      sessionStorage.removeItem(APP.kunciSesi);
    } catch (e) {
      try { sessionStorage.setItem(APP.kunciSesi, JSON.stringify({ token: token, user: user })); } catch (e2) {}
    }
  },

  /** Batas diam (detik) dari server (user.batasDiam, menit); bawaan 60 menit. */
  batasDiamDetik: function (u) {
    var m = Number(((u || this.user) || {}).batasDiam) || 60;
    return Math.max(5, Math.min(360, m)) * 60;
  },

  hapus: function () {
    this.token = null;
    this.user = null;
    try {
      sessionStorage.removeItem(APP.kunciSesi);
      sessionStorage.removeItem(APP.kunciBoot);
      localStorage.removeItem(APP.kunciSesi);
    } catch (e) {}
  },

  berakhirKarenaDiam: false,

  ada: function () { return !!this.token; },

  /* Snapshot panel admin — dashboard tampil seketika saat halaman dibuka ulang. */
  simpanBoot: function (boot) {
    try {
      sessionStorage.setItem(APP.kunciBoot, JSON.stringify({ waktu: Date.now(), boot: boot }));
    } catch (e) { /* kuota penuh — snapshot bersifat opsional */ }
  },

  ambilBoot: function (maksUmurMs) {
    try {
      var s = sessionStorage.getItem(APP.kunciBoot);
      if (!s) return null;
      var o = JSON.parse(s);
      if (!o || !o.boot) return null;
      if (maksUmurMs && (Date.now() - o.waktu) > maksUmurMs) return null;
      return o.boot;
    } catch (e) { return null; }
  },

  hapusBoot: function () {
    try { sessionStorage.removeItem(APP.kunciBoot); } catch (e) {}
  },

  boleh: function (kemampuan) {
    if (!this.user) return false;
    var p = this.user.peran;
    if (kemampuan === 'tulis')     return p === 'SUPER_ADMIN' || p === 'ADMIN';
    if (kemampuan === 'hapus')     return p === 'SUPER_ADMIN' || p === 'ADMIN';
    if (kemampuan === 'master')    return p === 'SUPER_ADMIN';
    if (kemampuan === 'bypass')    return p === 'SUPER_ADMIN';
    if (kemampuan === 'verifikasi')return true;
    return false;
  }
};

/* ── v4.4: pelacak aktivitas pengguna (dibagi antartab lewat localStorage) ── */
var Aktivitas = {
  kunci: 'esurat_aktif_v44',
  _terakhir: 0,
  _tulis: 0,
  terakhir: function () {
    var lokal = 0;
    try { lokal = Number(localStorage.getItem(this.kunci) || 0); } catch (e) {}
    return Math.max(this._terakhir, lokal);
  },
  tandai: function (paksa) {
    var kini = Date.now();
    this._terakhir = kini;
    if (paksa || kini - this._tulis > 15000) {           // tulis ke penyimpanan maks. tiap 15 dtk
      this._tulis = kini;
      try { localStorage.setItem(this.kunci, String(kini)); } catch (e) {}
    }
  },
  diamDetik: function () {
    var t = this.terakhir();
    return t ? Math.max(0, Math.round((Date.now() - t) / 1000)) : 0;
  },
  diam: function (ms) { return this.diamDetik() * 1000 > ms; },
  pasang: function () {
    var self = this;
    if (!this.terakhir()) this.tandai(true);
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'input'].forEach(function (ev) {
      window.addEventListener(ev, function () { self.tandai(false); }, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self._terakhir = Math.max(self._terakhir, 0); });
  }
};
Aktivitas.pasang();

/* ── v4.4: pengukur kecepatan (ketik Perf.table() di console) ───── */
var Perf = {
  baris: [],
  catat: function (aksi, total, server) {
    this.baris.push({ aksi: aksi, total: total, server: server == null ? null : server,
                      jaringan: server == null ? null : total - server, waktu: new Date().toLocaleTimeString() });
    if (this.baris.length > 200) this.baris.shift();
  },
  table: function () { console.table(this.baris.slice(-40)); },
  ringkas: function () {
    var r = {};
    this.baris.forEach(function (b) {
      var x = r[b.aksi] || (r[b.aksi] = { n: 0, total: 0, server: 0 });
      x.n++; x.total += b.total; x.server += b.server || 0;
    });
    Object.keys(r).forEach(function (k) { r[k] = { n: r[k].n, rataTotal: Math.round(r[k].total / r[k].n), rataServer: Math.round(r[k].server / r[k].n) }; });
    console.table(r);
  }
};

/* ── Cache portal publik di peramban (stale-while-revalidate) ────── */
var CachePortal = {
  kunci: 'esurat_portal_v42',
  ambil: function () {
    try {
      var s = localStorage.getItem(this.kunci);
      if (!s) return null;
      var o = JSON.parse(s);
      if (!o || !o.data || (Date.now() - o.waktu) > 7 * 86400000) return null;
      return o;
    } catch (e) { return null; }
  },
  simpan: function (data) {
    try { localStorage.setItem(this.kunci, JSON.stringify({ waktu: Date.now(), data: data })); } catch (e) {}
  }
};

/* ── Pemeriksaan konfigurasi ────────────────────────────────────── */
function urlSiap() {
  return typeof GAS_URL === 'string' &&
         GAS_URL.indexOf('script.google.com') > -1 &&
         GAS_URL.indexOf('/exec') > -1;
}

/* ── Pemanggil dasar ────────────────────────────────────────────── */
function fetchDenganBatas(url, opsi, batasMs) {
  var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  if (ctrl) opsi.signal = ctrl.signal;
  var jam = setTimeout(function () { if (ctrl) ctrl.abort(); }, batasMs || APP.batasWaktu);
  return fetch(url, opsi)
    .then(function (r) { clearTimeout(jam); return r; })
    .catch(function (e) {
      clearTimeout(jam);
      if (e && e.name === 'AbortError') {
        throw new Error('Server tidak merespons dalam batas waktu. Periksa koneksi Anda lalu coba lagi.');
      }
      throw new Error('Tidak dapat terhubung ke server. Pastikan URL Web App benar dan sudah di-deploy ' +
                      'dengan akses "Anyone".');
    });
}

var _getBerjalan = {};

/**
 * Ambil data.
 * · Tanpa sesi (portal publik) → GET biasa, dapat di-cache peramban/CDN.
 * · Dengan sesi (panel admin)  → otomatis POST agar token tidak pernah tampil di URL.
 */
function ambil(aksi, param) {
  if (!urlSiap()) {
    return Promise.resolve({
      success: false,
      message: 'GAS_URL belum diisi. Buka js/config.js dan tempel URL Web App yang berakhiran /exec.'
    });
  }

  if (Sesi.token) return kirim(aksi, param || {});

  var q = ['action=' + encodeURIComponent(aksi)];
  Object.keys(param || {}).forEach(function (k) {
    if (param[k] === undefined || param[k] === null) return;
    q.push(encodeURIComponent(k) + '=' + encodeURIComponent(param[k]));
  });
  var url = GAS_URL + '?' + q.join('&');

  if (_getBerjalan[url]) return _getBerjalan[url];
  _getBerjalan[url] = fetchDenganBatas(url, { method: 'GET', redirect: 'follow' })
    .then(bacaRespon)
    .catch(function (e) { return { success: false, message: e.message }; })
    .then(function (r) { delete _getBerjalan[url]; return r; });
  return _getBerjalan[url];
}

/**
 * Kirim data (POST).
 * @param {string} aksi  nama aksi di router backend
 * @param {Object} data  muatan
 * @param {number} batas batas waktu khusus (mis. unggahan besar)
 */
/* Aksi tulis yang aman diulang (server menyimpan hasil per reqId 6 jam). */
var AKSI_IDEMPOTEN = ['submitPengajuanMahasiswa', 'submitPengajuanDosen', 'perbaikiPengajuan',
  'terbitkanSuratKeluar', 'terbitkanSK', 'terbitkanBeritaAcara', 'terbitkanSuratKeterangan',
  'prosesVerifikasi', 'cicilanTandaiLunas', 'waBlastBuat', 'simpanRecord', 'bukaDrafDocs'];
/* Aksi baca yang boleh diulang otomatis bila jaringan putus. */
var AKSI_BACA_ULANG = /^(bootstrapAdmin|bootstrapPublik|validateSession|refreshModul|getRecord|getLog|hitungDashboard|batch|cicilanData|notifConfig|notifAntrean|waBlastList|crmList|crmStats|crmDetail|dataLaporan|infoLogin|ping)$/;

function buatReqId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function kirim(aksi, data, batas) {
  if (!urlSiap()) {
    return Promise.resolve({
      success: false,
      message: 'GAS_URL belum diisi. Buka js/config.js dan tempel URL Web App yang berakhiran /exec.'
    });
  }
  var muatan = { action: aksi, token: Sesi.token || '', data: data || {} };
  if (Sesi.token) muatan.diam = Aktivitas.diamDetik();
  var bolehUlang = AKSI_BACA_ULANG.test(aksi);
  if (AKSI_IDEMPOTEN.indexOf(aksi) >= 0) { muatan.reqId = buatReqId(); bolehUlang = true; }
  var t0 = Date.now();

  function coba(ke) {
    return fetchDenganBatas(GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(muatan)
    }, batas)
      .then(bacaRespon)
      .catch(function (e) {
        if (bolehUlang && ke < 2 && !/batas waktu/i.test(e.message || '')) {
          return new Promise(function (s) { setTimeout(s, 700 * (ke + 1)); }).then(function () { return coba(ke + 1); });
        }
        return { success: false, message: e.message };
      });
  }
  return coba(0).then(function (r) {
    Perf.catat(aksi, Date.now() - t0, r && r.ms);
    if (r && r.nq > 0) jadwalkanDrain();
    if (Sesi.token && r && r.success !== false) Sesi.panggilTerakhir = Date.now();
    return r;
  });
}

/** Gabungkan beberapa aksi BACA jadi satu eksekusi server. calls: [{action, data}] */
function kirimBatch(calls) {
  return kirim('batch', { calls: calls }).then(function (r) {
    if (!r.success) {
      var gagal = {};
      calls.forEach(function (c) { gagal[c.action] = r; });
      return gagal;
    }
    return r.data || {};
  });
}

/* ── v4.4: kirim antrean notifikasi (surel/WA) setelah aksi selesai ── */
var _drain = { jam: null, jalan: false, ulang: 0 };
function jadwalkanDrain() {
  clearTimeout(_drain.jam);
  _drain.jam = setTimeout(jalankanDrain, 400);
}
function jalankanDrain() {
  if (_drain.jalan || !urlSiap()) return;
  _drain.jalan = true;
  fetchDenganBatas(GAS_URL, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'drain', data: {} })
  }, 45000).then(bacaRespon).then(function (r) {
    _drain.jalan = false;
    var sisa = r && r.data ? Number(r.data.left || 0) : 0;
    if (sisa > 0 && _drain.ulang < 3) { _drain.ulang++; setTimeout(jalankanDrain, 1500); }
    else _drain.ulang = 0;
  }).catch(function () { _drain.jalan = false; _drain.ulang = 0; });
}

function bacaRespon(res) {
  return res.text().then(function (teks) {
    var json;
    try {
      json = JSON.parse(teks);
    } catch (e) {
      if (teks.indexOf('<!DOCTYPE') === 0 || teks.indexOf('<html') >= 0) {
        if (teks.indexOf('Google Drive') >= 0 || teks.indexOf('sign in') >= 0 ||
            teks.indexOf('Masuk') >= 0 || teks.indexOf('accounts.google') >= 0) {
          throw new Error('Server meminta login Google. Deploy ulang Web App dengan ' +
                          '"Who has access: Anyone" (bukan "Anyone with Google account").');
        }
        throw new Error('Server mengembalikan halaman HTML, bukan data JSON. ' +
                        'Pastikan URL berakhiran /exec dan deployment terbaru sudah aktif.');
      }
      throw new Error('Respons server tidak dapat dibaca: ' + teks.substring(0, 160));
    }

    if (json && json.success === false &&
        (json.kode === 'SESSION_EXPIRED' || json.kode === 'NO_SESSION' || json.kode === 'SESSION_IDLE')) {
      if (Sesi.ada()) {
        Sesi.hapus();
        if (typeof sesiBerakhir === 'function') sesiBerakhir(json.message, json.kode);
        else if (typeof tampilkanLapisan === 'function') {
          toast('Sesi Anda telah berakhir. Silakan masuk kembali.', 'peringatan');
          tampilkanLapisan('login');
        }
      }
    }
    return json;
  });
}

/* ── Prefetch: mulai unduh data portal SEGERA saat skrip dimuat ──── */
var JanjiBootPublik = urlSiap() ? ambil('bootstrapPublik', {}) : null;

/* ── Pembantu unggahan ──────────────────────────────────────────── */

function bacaBerkasBase64(file) {
  return new Promise(function (selesai, gagal) {
    var fr = new FileReader();
    fr.onload = function () {
      var hasil = String(fr.result);
      selesai(hasil.substring(hasil.indexOf(',') + 1));
    };
    fr.onerror = function () { gagal(new Error('Berkas "' + file.name + '" gagal dibaca.')); };
    fr.readAsDataURL(file);
  });
}

function validasiBerkas(file, maxMb, formatDiizinkan) {
  var maks = (maxMb || 2) * 1024 * 1024;
  if (file.size > maks) {
    return 'Ukuran "' + file.name + '" adalah ' + formatUkuran(file.size) +
           ', melebihi batas ' + (maxMb || 2) + ' MB.';
  }
  var ekstensi = file.name.split('.').pop().toLowerCase();
  var daftar = formatDiizinkan || ['pdf', 'jpg', 'jpeg', 'png'];
  if (daftar.indexOf(ekstensi) < 0) {
    return 'Format .' + ekstensi + ' tidak diizinkan. Gunakan: ' + daftar.join(', ') + '.';
  }
  return null;
}

function formatUkuran(byte) {
  if (!byte) return '0 KB';
  if (byte < 1024) return byte + ' B';
  if (byte < 1024 * 1024) return (byte / 1024).toFixed(0) + ' KB';
  return (byte / 1048576).toFixed(1) + ' MB';
}

function buatQrDataUrl(isi) {
  try {
    if (typeof qrcode !== 'function') return null;
    var qr = qrcode(0, 'M');
    qr.addData(String(isi));
    qr.make();
    return qr.createDataURL(6, 0);
  } catch (e) { return null; }
}
