/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/ui.js
   Perkakas antarmuka bersama: toast, modal, format, tabel, editor naskah.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Pintasan DOM ───────────────────────────────────────────────── */
function $(sel, induk) { return (induk || document).querySelector(sel); }
function $$(sel, induk) { return Array.prototype.slice.call((induk || document).querySelectorAll(sel)); }
function el(id) { return document.getElementById(id); }

function tampil(node, ya) {
  if (!node) return;
  node.classList.toggle('sembunyi', ya === false);
}

/* ── Pengaman eksekusi ──────────────────────────────────────────── */
/** Bungkus fungsi agar galat tak terduga muncul sebagai toast, bukan diam. */
function jalankanAman(fn, konteks) {
  try {
    var hasil = fn();
    if (hasil && typeof hasil.catch === 'function') {
      hasil.catch(function (e) {
        console.error(konteks || 'jalankanAman', e);
        toast((konteks ? konteks + ': ' : '') + (e.message || e), 'galat');
      });
    }
    return hasil;
  } catch (e) {
    console.error(konteks || 'jalankanAman', e);
    toast((konteks ? konteks + ': ' : '') + (e.message || e), 'galat');
    return null;
  }
}

/* ── Escape & format ────────────────────────────────────────────── */
function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function nilai(o, kunci, bawaan) {
  var v = o ? o[kunci] : undefined;
  return (v === undefined || v === null || v === '') ? (bawaan !== undefined ? bawaan : '') : v;
}

var NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];
var BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function tgl(v, panjang) {
  if (!v) return '—';
  var d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.getDate() + ' ' + (panjang ? NAMA_BULAN[d.getMonth()] : BULAN_SINGKAT[d.getMonth()]) +
         ' ' + d.getFullYear();
}

function tglJam(v) {
  if (!v) return '—';
  var d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return tgl(v) + ' · ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' WIB';
}

function tglInput(v) {
  var d = v ? new Date(v) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }

function rupiah(n) {
  var a = Number(n) || 0;
  return 'Rp ' + a.toLocaleString('id-ID') + ',-';
}

function angka(n) { return (Number(n) || 0).toLocaleString('id-ID'); }

function selisihHari(v) {
  var d = new Date(v);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((new Date() - d) / 86400000);
}

function umurTeks(v) {
  var h = selisihHari(v);
  if (h <= 0) return 'Hari ini';
  if (h === 1) return 'Kemarin';
  if (h < 30) return h + ' hari lalu';
  if (h < 365) return Math.floor(h / 30) + ' bulan lalu';
  return Math.floor(h / 365) + ' tahun lalu';
}

function potong(s, n) {
  s = String(s || '');
  return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

function inisial(nama) {
  var p = String(nama || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/* ── Lencana status ─────────────────────────────────────────────── */
function lencanaStatus(status) {
  var s = String(status || '').toUpperCase();
  var g = GAYA_STATUS[s] || { kelas: 'neut', teks: status || '—', ikon: 'bi-dash-circle' };
  return '<span class="lencana ' + g.kelas + '"><i class="bi ' + g.ikon + '"></i>' + esc(g.teks) + '</span>';
}

function chipNomor(nomor) {
  if (!nomor) return '<span class="tx-3">—</span>';
  return '<span class="chip-nomor">' + esc(nomor) +
    '<button type="button" onclick="salinTeks(\'' + esc(nomor).replace(/'/g, '') +
    '\')" title="Salin nomor"><i class="bi bi-clipboard"></i></button></span>';
}

function salinTeks(teks) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(teks)
      .then(function () { toast('Disalin: ' + teks, 'sukses'); })
      .catch(function () { toast('Peramban menolak akses papan klip.', 'peringatan'); });
  } else {
    var t = document.createElement('textarea');
    t.value = teks; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); toast('Disalin: ' + teks, 'sukses'); } catch (e) {}
    document.body.removeChild(t);
  }
}

/* ── Toast ──────────────────────────────────────────────────────── */
function toast(pesan, tipe, durasi) {
  var wadah = el('toastWadah');
  if (!wadah) { console.log('[toast]', tipe, pesan); return; }

  var ikon = { sukses: 'bi-check-circle-fill', galat: 'bi-exclamation-octagon-fill',
               peringatan: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
  var t = document.createElement('div');
  t.className = 'toast ' + (tipe || 'info');
  t.innerHTML = '<i class="bi ' + (ikon[tipe] || ikon.info) + '"></i>' +
                '<div class="t-isi">' + esc(pesan) + '</div>' +
                '<button class="t-tutup" aria-label="Tutup"><i class="bi bi-x-lg"></i></button>';

  function pergi() {
    t.classList.add('pergi');
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
  }
  t.querySelector('.t-tutup').onclick = pergi;
  wadah.appendChild(t);
  setTimeout(pergi, durasi || (tipe === 'galat' ? 7000 : 4200));
}

/* ── Modal bertumpuk (stack) ────────────────────────────────────────
   Setiap bukaModal() membuat lapisan BARU di atas lapisan sebelumnya.
   Ini mencegah dialog kecil (mis. "Sisip Tabel") menimpa dan
   menghapus lembar kerja yang sedang diisi di bawahnya.
   tutupModal() hanya menutup lapisan paling atas.
   ─────────────────────────────────────────────────────────────────── */
var _tumpukanModal = [];
var _nomorModal = 0;

function modalTeratas() {
  return _tumpukanModal.length ? _tumpukanModal[_tumpukanModal.length - 1] : null;
}

function bukaModal(opsi) {
  opsi = opsi || {};
  _nomorModal++;

  var tirai = document.createElement('div');
  tirai.className = 'modal-tirai tampil';
  tirai.dataset.lapis = String(_tumpukanModal.length + 1);
  tirai.style.zIndex = String(8000 + _tumpukanModal.length * 10);

  tirai.innerHTML =
    '<div class="modal' + (opsi.lebar ? ' lebar' : '') + (opsi.sempit ? ' sempit' : '') +
      '" role="dialog" aria-modal="true">' +
      '<div class="modal-kepala"><div>' +
        '<h3 class="m-judul"></h3>' +
        '<div class="m-sub' + (opsi.sub ? '' : ' sembunyi') + '"></div>' +
      '</div>' +
      '<button class="modal-tutup" aria-label="Tutup"><i class="bi bi-x-lg"></i></button>' +
      '</div>' +
      '<div class="modal-isi"></div>' +
      '<div class="modal-kaki"></div>' +
    '</div>';

  // Judul & subjudul dipasang sebagai teks — aman dari HTML injection
  tirai.querySelector('.m-judul').textContent = opsi.judul || '';
  if (opsi.sub) tirai.querySelector('.m-sub').textContent = opsi.sub;

  tirai.querySelector('.modal-isi').innerHTML = opsi.isi || '';
  tirai.querySelector('.modal-kaki').innerHTML = opsi.kaki || '';

  tirai.querySelector('.modal-tutup').addEventListener('click', tutupModal);
  tirai.addEventListener('mousedown', function (e) {
    if (e.target === tirai && !opsi.kunci) tutupModal();
  });

  document.body.appendChild(tirai);
  _tumpukanModal.push({ node: tirai, opsi: opsi, id: _nomorModal });
  document.body.style.overflow = 'hidden';

  if (typeof opsi.setelah === 'function') {
    setTimeout(function () { jalankanAman(opsi.setelah, 'modal'); }, 30);
  }

  if (!opsi.tanpaFokus) {
    setTimeout(function () {
      var f = tirai.querySelector('.modal-isi input:not([type=hidden]), ' +
                                  '.modal-isi select, .modal-isi textarea');
      if (f) f.focus();
    }, 90);
  }

  return tirai;
}

function tutupModal() {
  var atas = _tumpukanModal.pop();
  if (!atas) return;

  if (typeof atas.opsi.saatTutup === 'function') {
    jalankanAman(atas.opsi.saatTutup, 'modal tutup');
  }
  if (atas.node.parentNode) atas.node.parentNode.removeChild(atas.node);
  if (!_tumpukanModal.length) document.body.style.overflow = '';
}

function tutupSemuaModal() {
  while (_tumpukanModal.length) tutupModal();
}

function konfirmasi(opsi) {
  return new Promise(function (selesai) {
    var kunciJawab = '__jawab' + (_nomorModal + 1);
    window[kunciJawab] = function (ya) {
      delete window[kunciJawab];
      tutupModal();
      selesai(ya);
    };
    bukaModal({
      sempit: true,
      judul: opsi.judul || 'Konfirmasi',
      isi: '<div class="baris g12" style="align-items:flex-start">' +
           '<div class="kpi-ikon ' + (opsi.bahaya ? 'abu' : 'emas') + '" style="width:40px;height:40px;font-size:18px' +
           (opsi.bahaya ? ';background:var(--dang-bg);color:var(--dang-fg)' : '') + '">' +
           '<i class="bi ' + (opsi.ikon || (opsi.bahaya ? 'bi-exclamation-triangle' : 'bi-question-circle')) + '"></i></div>' +
           '<div class="sisa tx-md" style="line-height:1.65">' + (opsi.pesan || '') + '</div></div>',
      kaki: '<button class="btn btn-garis" onclick="window.' + kunciJawab + '(false)">' +
            esc(opsi.batal || 'Batal') + '</button>' +
            '<button class="btn ' + (opsi.bahaya ? 'btn-bahaya' : 'btn-utama') +
            '" onclick="window.' + kunciJawab + '(true)">' + esc(opsi.ya || 'Ya, Lanjutkan') + '</button>',
      tanpaFokus: true,
      saatTutup: function () {
        if (window[kunciJawab]) { delete window[kunciJawab]; selesai(false); }
      }
    });
  });
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && _tumpukanModal.length) tutupModal();
});

/* ── Pratinjau berkas — selalu popup, tidak pernah buka tab baru ──── */

/** Ambil ID berkas Google Drive dari berbagai bentuk URL. */
function idDrive(url) {
  var s = String(url || '');
  var m = s.match(/\/file\/d\/([-\w]{20,})/) ||
          s.match(/[?&]id=([-\w]{20,})/) ||
          s.match(/\/d\/([-\w]{20,})/);
  return m ? m[1] : null;
}

function urlPratinjauDrive(id) { return 'https://drive.google.com/file/d/' + id + '/preview'; }
function urlUnduhDrive(id) { return 'https://drive.google.com/uc?export=download&id=' + id; }

/**
 * Tampilkan dokumen dalam modal — berlaku untuk seluruh aplikasi.
 * @param url    tautan Drive, data URL, atau URL langsung
 * @param judul  judul modal
 * @param opsi   { sub, namaBerkas }
 */
function pratinjauBerkas(url, judul, opsi) {
  opsi = opsi || {};
  if (!url) { toast('Berkas belum tersedia untuk dokumen ini.', 'peringatan'); return; }

  var id = idDrive(url);
  var srcPratinjau = id ? urlPratinjauDrive(id) : url;
  var srcUnduh = id ? urlUnduhDrive(id) : url;
  var nama = opsi.namaBerkas || (judul || 'dokumen').replace(/[\/\\:*?"<>|]/g, '-');
  var idBingkai = 'pv' + Date.now();

  bukaModal({
    lebar: true,
    judul: judul || 'Pratinjau Dokumen',
    sub: opsi.sub || 'Dokumen ditampilkan di jendela ini — tidak membuka tab baru.',
    tanpaFokus: true,
    isi:
      '<div class="pratinjau-bingkai">' +
        '<div class="pratinjau-muat" id="' + idBingkai + 'Muat">' +
          '<span class="spinner"></span> Memuat dokumen…' +
        '</div>' +
        '<iframe id="' + idBingkai + '" src="' + esc(srcPratinjau) + '" title="Pratinjau dokumen" ' +
          'allow="autoplay"></iframe>' +
      '</div>' +
      '<div class="baris g8 mt12 tx-sm tx-3" style="align-items:flex-start">' +
        '<i class="bi bi-info-circle" style="margin-top:2px"></i>' +
        '<div class="sisa">Bila dokumen tidak tampil, berkas mungkin belum dibagikan publik di Google Drive. ' +
        'Gunakan tombol <b>Unduh Dokumen</b> di bawah.</div>' +
      '</div>',
    kaki:
      '<a class="btn btn-navy" href="' + esc(srcUnduh) + '" download="' + esc(nama) + '" ' +
        'target="_blank" rel="noopener"><i class="bi bi-download"></i> Unduh Dokumen</a>' +
      '<button class="btn btn-garis" onclick="tutupModal()">' +
        '<i class="bi bi-x-lg"></i> Tutup</button>',
    setelah: function () {
      var f = el(idBingkai), m = el(idBingkai + 'Muat');
      if (!f) return;
      f.addEventListener('load', function () { if (m) m.style.display = 'none'; });
      setTimeout(function () { if (m) m.style.display = 'none'; }, 6000);
    }
  });
}

/** Pratinjau PDF hasil generate (base64) — dipakai tombol Pratinjau surat. */
function pratinjauPdfBase64(base64, namaBerkas, judul, sub) {
  var src = 'data:application/pdf;base64,' + base64;
  bukaModal({
    lebar: true,
    judul: judul || 'Pratinjau Lembar Resmi',
    sub: sub || '',
    tanpaFokus: true,
    isi: '<div class="pratinjau-bingkai"><iframe src="' + src + '" title="Pratinjau PDF"></iframe></div>',
    kaki: '<a class="btn btn-navy" href="' + src + '" download="' + esc(namaBerkas || 'pratinjau.pdf') + '">' +
          '<i class="bi bi-download"></i> Unduh Pratinjau</a>' +
          '<button class="btn btn-garis" onclick="tutupModal()"><i class="bi bi-x-lg"></i> Tutup</button>'
  });
}

/** Tombol pratinjau ringkas untuk dipakai di kolom aksi tabel. */
function tombolPratinjau(url, judul, ikon, tip) {
  if (!url) return '';
  return '<button class="btn btn-hantu btn-ikon" title="' + esc(tip || 'Pratinjau dokumen') +
    '" onclick="pratinjauBerkas(\'' + esc(url).replace(/'/g, '') + '\',\'' +
    esc(String(judul || 'Dokumen').replace(/'/g, '')) + '\')">' +
    '<i class="bi ' + (ikon || 'bi-file-earmark-pdf') + '"></i></button>';
}

/* ── Status tombol saat memproses ───────────────────────────────── */
function tombolSibuk(btn, sibuk, teksSibuk) {
  if (!btn) return;
  if (sibuk) {
    btn.dataset.isiAsli = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('sibuk');
    btn.innerHTML = '<span class="spinner"></span> ' + esc(teksSibuk || 'Memproses…');
  } else {
    btn.disabled = false;
    btn.classList.remove('sibuk');
    if (btn.dataset.isiAsli) btn.innerHTML = btn.dataset.isiAsli;
  }
}

/* ── Keadaan kosong & memuat ────────────────────────────────────── */
function keadaanKosong(judul, desk, ikon, aksiHtml) {
  return '<div class="kosong"><i class="bi ' + (ikon || 'bi-inbox') + '"></i>' +
    '<div class="k-judul">' + esc(judul) + '</div>' +
    '<div class="k-desk">' + esc(desk || '') + '</div>' +
    (aksiHtml ? '<div class="mt16">' + aksiHtml + '</div>' : '') + '</div>';
}

function keadaanMemuat(teks) {
  return '<div class="memuat"><span class="spinner"></span>' + esc(teks || 'Memuat data…') + '</div>';
}

/* ── Pembangun tabel data ───────────────────────────────────────── */
/**
 * @param opsi.data     array objek
 * @param opsi.kolom    [{k,l,tipe}]
 * @param opsi.aksi     fungsi(baris) → HTML tombol aksi
 * @param opsi.halaman  nomor halaman aktif
 * @param opsi.idTabel  id unik untuk paginasi
 */
function bangunTabel(opsi) {
  var data = opsi.data || [];
  var kolom = opsi.kolom || [];
  if (!data.length) {
    return keadaanKosong(opsi.judulKosong || 'Belum ada data',
                         opsi.deskKosong || 'Data akan muncul di sini setelah ditambahkan.',
                         opsi.ikonKosong || 'bi-inbox', opsi.aksiKosong);
  }

  var perHalaman = opsi.perHalaman || APP.barisPerHalaman;
  var halaman = opsi.halaman || 1;
  var totalHalaman = Math.max(1, Math.ceil(data.length / perHalaman));
  if (halaman > totalHalaman) halaman = totalHalaman;
  var mulai = (halaman - 1) * perHalaman;
  var potongan = data.slice(mulai, mulai + perHalaman);

  var h = '<div class="tabel-bungkus"><table class="data responsif"><thead><tr>';
  kolom.forEach(function (k) { h += '<th>' + esc(k.l) + '</th>'; });
  if (opsi.aksi) h += '<th style="text-align:right">Aksi</th>';
  h += '</tr></thead><tbody>';

  potongan.forEach(function (r, i) {
    h += '<tr>';
    kolom.forEach(function (k) {
      h += '<td data-label="' + esc(k.l) + '">' + selKolom(r, k) + '</td>';
    });
    if (opsi.aksi) {
      h += '<td data-label="Aksi"><div class="aksi">' + opsi.aksi(r, mulai + i) + '</div></td>';
    }
    h += '</tr>';
  });

  h += '</tbody></table></div>';

  if (totalHalaman > 1) h += bangunPaginasi(opsi.idTabel, halaman, totalHalaman, data.length, mulai, potongan.length);
  else h += '<div class="paginasi"><div class="info">Menampilkan <b>' + data.length +
            '</b> data</div></div>';
  return h;
}

function selKolom(r, k) {
  var v = r[k.k];
  switch (k.tipe) {
    case 'mono':      return chipNomor(v);
    case 'tanggal':   return '<span class="tnum">' + tgl(v) + '</span>';
    case 'status':    return lencanaStatus(v);
    case 'utama':     return '<div class="t-judul">' + esc(potong(v, 82)) + '</div>';
    case 'lencana':
      if (v === true || String(v) === 'true') {
        return '<span class="lencana ok"><i class="bi bi-check-circle"></i>Aktif</span>';
      }
      if (v === false || String(v) === 'false') {
        return '<span class="lencana neut"><i class="bi bi-slash-circle"></i>Nonaktif</span>';
      }
      return v ? '<span class="lencana neut">' + esc(v) + '</span>' : '<span class="tx-3">—</span>';
    case 'wajibOpsional':
      return (String(v) === 'true' || v === true)
        ? '<span class="lencana emas"><i class="bi bi-asterisk"></i>Wajib</span>'
        : '<span class="lencana neut"><i class="bi bi-dash-circle"></i>Opsional</span>';
    case 'rupiah':    return '<span class="mono">' + rupiah(v) + '</span>';
    case 'kadaluarsa': {
      if (!v) return '<span class="tx-3">—</span>';
      var sisa = Math.floor((new Date(v) - new Date()) / 86400000);
      var kls = sisa < 0 ? 'dang' : (sisa <= 60 ? 'warn' : 'ok');
      var ket = sisa < 0 ? 'lewat' : (sisa <= 60 ? sisa + " hari lagi" : '');
      return '<span class="tnum">' + tgl(v) + '</span>' +
             (ket ? ' <span class="lencana ' + kls + '">' + esc(ket) + '</span>' : '');
    }
    default:
      return v ? esc(potong(v, 60)) : '<span class="tx-3">—</span>';
  }
}

function bangunPaginasi(idTabel, halaman, total, jumlahData, mulai, tampilJumlah) {
  var h = '<div class="paginasi"><div class="info">Menampilkan <b>' + (mulai + 1) + '–' +
          (mulai + tampilJumlah) + '</b> dari <b>' + jumlahData + '</b> data</div><div class="hal">';
  h += '<button ' + (halaman === 1 ? 'disabled' : '') + ' onclick="gantiHalaman(\'' + idTabel + '\',' +
       (halaman - 1) + ')"><i class="bi bi-chevron-left"></i></button>';

  var daftar = [];
  for (var i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - halaman) <= 1) daftar.push(i);
    else if (daftar[daftar.length - 1] !== '…') daftar.push('…');
  }
  daftar.forEach(function (n) {
    if (n === '…') h += '<button disabled>…</button>';
    else h += '<button class="' + (n === halaman ? 'aktif' : '') + '" onclick="gantiHalaman(\'' +
              idTabel + '\',' + n + ')">' + n + '</button>';
  });

  h += '<button ' + (halaman === total ? 'disabled' : '') + ' onclick="gantiHalaman(\'' + idTabel + '\',' +
       (halaman + 1) + ')"><i class="bi bi-chevron-right"></i></button>';
  return h + '</div></div>';
}

/* ── Editor naskah WYSIWYG ──────────────────────────────────────── */
function editorNaskah(id, isiAwal, placeholder, tinggi) {
  var t = tinggi ? ' style="min-height:' + tinggi + 'px"' : '';
  return '<div class="editor">' +
    '<div class="editor-bar">' +
      tblEditor(id, 'bold', 'bi-type-bold', 'Tebal (Ctrl+B)') +
      tblEditor(id, 'italic', 'bi-type-italic', 'Miring (Ctrl+I)') +
      tblEditor(id, 'underline', 'bi-type-underline', 'Garis bawah (Ctrl+U)') +
      '<span class="pisah"></span>' +
      tblEditor(id, 'insertOrderedList', 'bi-list-ol', 'Daftar bernomor') +
      tblEditor(id, 'insertUnorderedList', 'bi-list-ul', 'Daftar butir') +
      '<span class="pisah"></span>' +
      '<button type="button" title="Sisipkan tabel" onclick="sisipTabelEditor(\'' + id + '\')">' +
        '<i class="bi bi-table"></i></button>' +
      '<span class="pisah"></span>' +
      tblEditor(id, 'undo', 'bi-arrow-counterclockwise', 'Batalkan') +
      tblEditor(id, 'redo', 'bi-arrow-clockwise', 'Ulangi') +
    '</div>' +
    '<div class="editor-isi" id="' + id + '" contenteditable="true" data-kosong="' +
      esc(placeholder || 'Ketik naskah surat di sini…') + '"' + t +
      ' onkeyup="simpanSeleksiEditor(\'' + id + '\')"' +
      ' onmouseup="simpanSeleksiEditor(\'' + id + '\')"' +
      ' onblur="simpanSeleksiEditor(\'' + id + '\')">' + (isiAwal || '') + '</div>' +
    '</div>';
}

function tblEditor(id, perintah, ikon, judul) {
  return '<button type="button" title="' + esc(judul) + '" onclick="perintahEditor(\'' + id +
         '\',\'' + perintah + '\')"><i class="bi ' + ikon + '"></i></button>';
}

function perintahEditor(id, perintah) {
  var e = el(id);
  if (!e) return;
  e.focus();
  try { document.execCommand(perintah, false, null); } catch (err) {}
}

/* Simpan posisi kursor editor agar tidak hilang saat dialog dibuka di atasnya */
var _seleksiEditor = { id: null, range: null };

function simpanSeleksiEditor(id) {
  try {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) { _seleksiEditor = { id: id, range: null }; return; }
    var r = sel.getRangeAt(0);
    var e = el(id);
    _seleksiEditor = { id: id, range: (e && e.contains(r.commonAncestorContainer)) ? r.cloneRange() : null };
  } catch (err) { _seleksiEditor = { id: id, range: null }; }
}

function pulihkanSeleksiEditor(id) {
  var e = el(id);
  if (!e) return false;
  e.focus();
  try {
    if (_seleksiEditor.id === id && _seleksiEditor.range) {
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(_seleksiEditor.range);
      return true;
    }
    // Belum pernah menaruh kursor — tempatkan di akhir naskah
    var sel2 = window.getSelection();
    var r = document.createRange();
    r.selectNodeContents(e);
    r.collapse(false);
    sel2.removeAllRanges();
    sel2.addRange(r);
    return true;
  } catch (err) { return false; }
}

/**
 * Dialog sisip tabel.
 * Dibuka sebagai lapisan modal BARU di atas lembar kerja — naskah yang
 * sedang diketik tetap utuh dan tidak terhapus saat dialog ditutup.
 */
function sisipTabelEditor(id) {
  simpanSeleksiEditor(id);
  bukaModal({
    sempit: true,
    judul: 'Sisipkan Tabel',
    sub: 'Lembar kerja Anda tetap terbuka di belakang dialog ini.',
    isi: '<div class="grid-2">' +
      '<div class="bidang"><label>Jumlah Baris</label>' +
      '<input type="number" id="tblBaris" value="3" min="1" max="20"></div>' +
      '<div class="bidang"><label>Jumlah Kolom</label>' +
      '<input type="number" id="tblKolom" value="3" min="1" max="10"></div></div>' +
      '<div class="bidang mb0"><label class="baris g8"><input type="checkbox" id="tblHeader" checked ' +
      'style="width:auto"> Baris pertama sebagai judul kolom</label></div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Batal</button>' +
          '<button class="btn btn-utama" onclick="terapkanTabelEditor(\'' + id + '\')">' +
          '<i class="bi bi-table"></i> Sisipkan</button>'
  });
}

function terapkanTabelEditor(id) {
  var b = Math.min(20, Math.max(1, parseInt(ambilNilai('tblBaris'), 10) || 3));
  var k = Math.min(10, Math.max(1, parseInt(ambilNilai('tblKolom'), 10) || 3));
  var pakaiHeader = !!(el('tblHeader') && el('tblHeader').checked);

  var h = '<table><tbody>';
  for (var i = 0; i < b; i++) {
    h += '<tr>';
    for (var j = 0; j < k; j++) {
      h += (pakaiHeader && i === 0) ? '<th>Judul ' + (j + 1) + '</th>' : '<td>&nbsp;</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table><p><br></p>';

  tutupModal();                 // hanya menutup dialog tabel, lembar kerja tetap terbuka

  var e = el(id);
  if (!e) { toast('Lembar kerja tidak ditemukan.', 'galat'); return; }

  pulihkanSeleksiEditor(id);
  var berhasil = false;
  try { berhasil = document.execCommand('insertHTML', false, h); } catch (err) { berhasil = false; }
  if (!berhasil) e.innerHTML += h;   // jalur cadangan — naskah lama tetap dipertahankan

  toast('Tabel ' + b + ' × ' + k + ' disisipkan ke naskah.', 'sukses');
}

function ambilEditor(id) {
  var e = el(id);
  if (!e) return '';
  var isi = e.innerHTML.trim();
  if (isi === '<br>' || isi === '<p><br></p>' || isi === '<div><br></div>') return '';
  return isi;
}

function editorKosong(id) {
  var e = el(id);
  return !e || !e.textContent.trim();
}

/* ── Validasi formulir ──────────────────────────────────────────── */
function tandaiGalat(input, pesan) {
  if (!input) return;
  var b = input.closest('.bidang');
  if (!b) return;
  b.classList.add('galat');
  if (pesan) {
    var p = b.querySelector('.pesan-galat');
    if (p) p.textContent = pesan;
  }
}

function bersihkanGalat(form) {
  $$('.bidang.galat', form || document).forEach(function (b) { b.classList.remove('galat'); });
}

function validasiForm(form, aturan) {
  bersihkanGalat(form);
  var galatPertama = null;

  aturan.forEach(function (a) {
    var input = el(a.id);
    if (!input) return;
    var v = String(input.value || '').trim();
    var pesan = null;

    if (a.wajib && !v) pesan = a.pesan || 'Isian ini wajib diisi.';
    else if (v && a.min && v.length < a.min) pesan = 'Minimal ' + a.min + ' karakter.';
    else if (v && a.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) pesan = 'Format surel tidak valid.';
    else if (v && a.pola && !a.pola.test(v)) pesan = a.pesan || 'Format tidak sesuai.';

    if (pesan) {
      tandaiGalat(input, pesan);
      if (!galatPertama) galatPertama = input;
    }
  });

  if (galatPertama) {
    galatPertama.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { galatPertama.focus(); }, 320);
    toast('Beberapa isian belum lengkap atau tidak valid.', 'peringatan');
    return false;
  }
  return true;
}

/** Pasang logo institusi sebagai favicon tab peramban. */
function pasangFavicon(url) {
  try {
    var tautan = document.querySelector("link[rel~='icon']");
    if (!tautan) {
      tautan = document.createElement('link');
      tautan.rel = 'icon';
      document.head.appendChild(tautan);
    }
    tautan.href = url || 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="14" fill="#1E3A5F"/>' +
      '<path d="M14 22h36v22H14z" fill="none" stroke="#F5A623" stroke-width="4"/>' +
      '<path d="M14 24l18 13 18-13" fill="none" stroke="#F5A623" stroke-width="4"/></svg>');
  } catch (e) {}
}

/* ── Tema terang / gelap ────────────────────────────────────────── */
function terapkanTema(tema) {
  var gelap = tema === 'gelap';
  document.body.classList.toggle('gelap', gelap);
  $$('#btnTemaPublik i, #btnTemaAdmin i').forEach(function (i) {
    i.className = gelap ? 'bi bi-sun' : 'bi bi-moon-stars';
  });
  try { localStorage.setItem(APP.kunciTema, tema); } catch (e) {}
}

function tukarTema() {
  terapkanTema(document.body.classList.contains('gelap') ? 'terang' : 'gelap');
}

function muatTema() {
  var t = null;
  try { t = localStorage.getItem(APP.kunciTema); } catch (e) {}
  if (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) t = 'gelap';
  terapkanTema(t || 'terang');
}

/* ── Pembantu formulir dinamis ──────────────────────────────────── */
function bidangTeks(o) {
  var tipe = o.tipe || 'text';
  return '<div class="bidang"><label for="' + o.id + '">' + esc(o.label) +
    (o.wajib ? ' <span class="wajib">*</span>' : '') + '</label>' +
    '<input type="' + tipe + '" id="' + o.id + '" value="' + esc(o.nilai || '') + '" ' +
    (o.placeholder ? 'placeholder="' + esc(o.placeholder) + '" ' : '') +
    (o.bacaSaja ? 'readonly ' : '') + (o.maks ? 'maxlength="' + o.maks + '" ' : '') + '>' +
    (o.bantu ? '<div class="bantu">' + o.bantu + '</div>' : '') +
    '<div class="pesan-galat">Isian ini wajib diisi.</div></div>';
}

function bidangArea(o) {
  return '<div class="bidang"><label for="' + o.id + '">' + esc(o.label) +
    (o.wajib ? ' <span class="wajib">*</span>' : '') + '</label>' +
    '<textarea id="' + o.id + '" rows="' + (o.baris || 3) + '" ' +
    (o.placeholder ? 'placeholder="' + esc(o.placeholder) + '"' : '') + '>' +
    esc(o.nilai || '') + '</textarea>' +
    (o.bantu ? '<div class="bantu">' + o.bantu + '</div>' : '') +
    '<div class="pesan-galat">Isian ini wajib diisi.</div></div>';
}

function bidangPilih(o) {
  var h = '<div class="bidang"><label for="' + o.id + '">' + esc(o.label) +
    (o.wajib ? ' <span class="wajib">*</span>' : '') + '</label><select id="' + o.id + '">';
  h += '<option value="">' + esc(o.kosong || '— Pilih —') + '</option>';
  (o.opsi || []).forEach(function (p) {
    var v = typeof p === 'object' ? p.v : p;
    var t = typeof p === 'object' ? p.t : p;
    h += '<option value="' + esc(v) + '"' + (String(o.nilai) === String(v) ? ' selected' : '') + '>' +
         esc(t) + '</option>';
  });
  h += '</select>' + (o.bantu ? '<div class="bantu">' + o.bantu + '</div>' : '') +
       '<div class="pesan-galat">Pilihan ini wajib diisi.</div></div>';
  return h;
}

function bidangSaklar(o) {
  return '<div class="baris-saklar"><div class="sisa"><div class="bs-judul">' + esc(o.label) + '</div>' +
    (o.desk ? '<div class="bs-desk">' + esc(o.desk) + '</div>' : '') + '</div>' +
    '<label class="saklar"><input type="checkbox" id="' + o.id + '"' + (o.nilai ? ' checked' : '') +
    '><span class="track"></span></label></div>';
}

function ambilNilai(id) {
  var e = el(id);
  if (!e) return '';
  if (e.type === 'checkbox') return e.checked;
  return String(e.value || '').trim();
}

/* ── Pengunduh berkas klien (CSV / teks) ────────────────────────── */
function unduhBerkas(namaBerkas, isi, mime) {
  try {
    var blob = new Blob(['﻿' + isi], { type: (mime || 'text/csv') + ';charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = namaBerkas;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    toast('Berkas "' + namaBerkas + '" diunduh.', 'sukses');
  } catch (e) {
    toast('Peramban menolak unduhan otomatis: ' + e.message, 'galat');
  }
}

function keCsv(kolom, baris) {
  function sel(v) {
    var s = String(v === undefined || v === null ? '' : v).replace(/"/g, '""');
    return '"' + s + '"';
  }
  var out = [kolom.map(function (k) { return sel(k.l); }).join(',')];
  baris.forEach(function (r) {
    out.push(kolom.map(function (k) { return sel(r[k.k]); }).join(','));
  });
  return out.join('\r\n');
}
