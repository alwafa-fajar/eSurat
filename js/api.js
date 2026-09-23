/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/api.js  (v4.2)
   Lapisan komunikasi ke Google Apps Script REST API.

   Aturan penting:
   · POST WAJIB memakai Content-Type "text/plain;charset=utf-8".
     Header application/json memicu CORS preflight yang diblokir GAS.
   · Token sesi HANYA dikirim di body POST — tidak pernah di URL.
   · Permintaan GET identik yang sedang berjalan digabung (tanpa dobel).
   ═══════════════════════════════════════════════════════════════════ */

var Sesi = {
  token: null,
  user: null,

  muat: function () {
    try {
      var s = sessionStorage.getItem(APP.kunciSesi) || localStorage.getItem(APP.kunciSesi);
      if (!s) return null;
      var o = JSON.parse(s);
      this.token = o.token;
      this.user = o.user;
      return o;
    } catch (e) { return null; }
  },

  simpan: function (token, user) {
    this.token = token;
    this.user = user;
    try { sessionStorage.setItem(APP.kunciSesi, JSON.stringify({ token: token, user: user })); }
    catch (e) {}
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
function kirim(aksi, data, batas) {
  if (!urlSiap()) {
    return Promise.resolve({
      success: false,
      message: 'GAS_URL belum diisi. Buka js/config.js dan tempel URL Web App yang berakhiran /exec.'
    });
  }

  return fetchDenganBatas(GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: aksi, token: Sesi.token || '', data: data || {} })
  }, batas)
    .then(bacaRespon)
    .catch(function (e) { return { success: false, message: e.message }; });
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
        (json.kode === 'SESSION_EXPIRED' || json.kode === 'NO_SESSION')) {
      if (Sesi.ada()) {
        Sesi.hapus();
        if (typeof tampilkanLapisan === 'function') {
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
