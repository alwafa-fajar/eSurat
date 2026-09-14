/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/publik.js
   Portal layanan terbuka: hero, formulir mahasiswa & dosen, pelacakan.
   ═══════════════════════════════════════════════════════════════════ */

var Publik = {
  data: null,
  tabAktif: 'mahasiswa',
  heroIndex: 0,
  heroTimer: null,
  berkas: { mhs: {}, dsn: {} },       // { kunci: {nama, mime, base64, label, ukuran} }
  tambahan: { mhs: [], dsn: [] }
};

/* ── Berkas persyaratan — diambil dari Master Data (dapat diatur admin) ──
   Admin/Super Admin menentukan daftar, label, dan status wajib/opsional
   dari Pengaturan → Berkas Syarat Pengajuan. Daftar di bawah hanya
   dipakai sebagai cadangan bila master data belum terisi.
   ─────────────────────────────────────────────────────────────────────── */
var BERKAS_CADANGAN = {
  mahasiswa: [
    { kunci: 'formulir', label: 'Formulir Permohonan Resmi Bermeterai', wajib: true,
      desk: 'Sudah ditandatangani pemohon & bermeterai 10.000', ikon: 'bi-file-earmark-text' },
    { kunci: 'pernyataan', label: 'Surat Pernyataan Diri Tidak Mampu', wajib: true,
      desk: 'Format bebas atau format template baku kampus', ikon: 'bi-file-earmark-check' }
  ],
  dosen: [
    { kunci: 'permohonan', label: 'Surat Permohonan Insentif Resmi', wajib: true,
      desk: 'Format template LPPM yang telah ditandatangani pengusul', ikon: 'bi-file-earmark-text' },
    { kunci: 'naskah', label: 'Naskah Artikel Lengkap (Full Paper / Reprint PDF)', wajib: true,
      desk: 'Naskah versi terbit lengkap dengan identitas jurnal', ikon: 'bi-file-earmark-pdf' }
  ]
};

var BERKAS_MHS = [];   // diisi saat portal dimuat
var BERKAS_DSN = [];

function muatBerkasSyarat(data) {
  var bs = data.berkasSyarat || {};
  BERKAS_MHS = (bs.mahasiswa && bs.mahasiswa.length) ? bs.mahasiswa : BERKAS_CADANGAN.mahasiswa;
  BERKAS_DSN = (bs.dosen && bs.dosen.length) ? bs.dosen : BERKAS_CADANGAN.dosen;
}

/* ── Render portal setelah bootstrap ────────────────────────────── */
function renderPortal(data) {
  Publik.data = data;
  var i = data.institusi || {};

  el('pubNamaInstitusi').textContent = i.singkatan || i.nama || 'e-SURAT';
  el('pubSubInstitusi').textContent = 'Portal Layanan Terbuka';
  el('loginInstitusi').textContent = i.nama || 'Sistem Persuratan & Kearsipan Digital';
  el('pubFooterNama').textContent = i.nama || 'e-SURAT';
  el('pubFooterAlamat').textContent = [i.alamat, i.telepon, i.email].filter(Boolean).join(' · ');
  document.title = 'e-SURAT — ' + (i.singkatan || 'Layanan Persuratan Digital');

  el('pubLogo').innerHTML = i.logo
    ? '<img src="' + esc(i.logo) + '" alt="Logo institusi">'
    : '<i class="bi bi-envelope-paper-fill"></i>';
  pasangFavicon(i.logo);

  renderHero(data);
  renderRunningText(data);
  isiDropdownProdi(data.prodi || []);
  renderSkema(data.skema || []);
  renderKlasifikasi(data.klasifikasi || []);
  muatBerkasSyarat(data);
  renderBerkas('mhs', BERKAS_MHS, data.tampilan);
  renderBerkas('dsn', BERKAS_DSN, data.tampilan);
  renderSidebarPublik(data);
  pasangJatuhkan('mhs');
  pasangJatuhkan('dsn');
  pulihkanDraf();

  var t = data.tampilan || {};
  var infoFormat = 'Format ' + (t.uploadFormat || ['pdf', 'jpg']).join('/').toUpperCase() +
                   ' maks. ' + (t.uploadMaxMb || 2) + ' MB per berkas';
  el('mhsFormatInfo').textContent = infoFormat;
  el('dsnFormatInfo').textContent = infoFormat;

  if (t.popupAktif) setTimeout(tampilkanPopupPengumuman, 900);
}

/* ── Hero slideshow ─────────────────────────────────────────────── */
function renderHero(data) {
  var slide = (data.hero || []).filter(function (s) { return s.judul; });
  if (!slide.length) {
    slide = [{ judul: 'Layanan Persuratan & Dispensasi',
               subjudul: 'Pengajuan resmi secara daring, terverifikasi berjenjang.' }];
  }
  Publik.heroSlide = slide;

  var titik = el('heroTitik');
  titik.innerHTML = slide.length > 1
    ? slide.map(function (s, n) {
        return '<i class="' + (n === 0 ? 'aktif' : '') + '" onclick="pilihHero(' + n + ')"></i>';
      }).join('')
    : '';

  gantiHero(0);
  if (slide.length > 1 && (data.tampilan || {}).heroAktif !== false) {
    clearInterval(Publik.heroTimer);
    Publik.heroTimer = setInterval(function () {
      gantiHero((Publik.heroIndex + 1) % slide.length);
    }, (data.tampilan || {}).heroDurasi || 6000);
  }
}

function gantiHero(n) {
  var s = Publik.heroSlide[n];
  if (!s) return;
  Publik.heroIndex = n;
  el('heroJudul').textContent = s.judul;
  el('heroSub').textContent = s.subjudul || '';
  var inst = (Publik.data.institusi || {}).singkatan || '';
  el('heroLencana').textContent = 'Portal Layanan Terbuka' + (inst ? ' · ' + inst : '') +
                                  ' · Tanpa Perlu Login Kampus';
  $$('#heroTitik i').forEach(function (t, i) { t.classList.toggle('aktif', i === n); });

  if (s.gambarUrl) {
    el('pubHero').style.backgroundImage =
      'linear-gradient(120deg, rgba(22,41,63,.94) 0%, rgba(30,58,95,.82) 100%), url(' + s.gambarUrl + ')';
    el('pubHero').style.backgroundSize = 'cover';
    el('pubHero').style.backgroundPosition = 'center';
  }
}

function pilihHero(n) {
  clearInterval(Publik.heroTimer);
  gantiHero(n);
}

function renderRunningText(data) {
  if (!(data.tampilan || {}).runningTextAktif) return;
  var teks = (data.pengumuman || [])
    .filter(function (p) { return p.tipe === 'running'; })
    .map(function (p) { return p.isi; }).join('  •  ');
  if (!teks) return;
  el('pubRunningTeks').textContent = teks + '  •  ' + teks;
  el('pubRunning').classList.remove('sembunyi');
}

function tampilkanPopupPengumuman() {
  var p = (Publik.data.pengumuman || []).filter(function (x) { return x.tipe === 'popup'; })[0];
  if (!p) return;
  try { if (sessionStorage.getItem('esurat_popup_' + p.id)) return; } catch (e) {}

  bukaModal({
    judul: p.judul || 'Pengumuman',
    sub: 'Informasi resmi ' + ((Publik.data.institusi || {}).singkatan || ''),
    isi: '<div class="baris g12" style="align-items:flex-start">' +
         '<div class="kpi-ikon emas" style="width:40px;height:40px;font-size:18px">' +
         '<i class="bi bi-megaphone"></i></div>' +
         '<div class="sisa tx-md" style="line-height:1.7">' + esc(p.isi) + '</div></div>',
    kaki: '<button class="btn btn-utama" onclick="tutupPopupPengumuman(\'' + esc(p.id) +
          '\')">Saya Mengerti</button>'
  });
}

function tutupPopupPengumuman(id) {
  try { sessionStorage.setItem('esurat_popup_' + id, '1'); } catch (e) {}
  tutupModal();
}

/* ── Dropdown & kartu pilihan ───────────────────────────────────── */
function isiDropdownProdi(prodi) {
  ['mhsProdi', 'dsnProdi'].forEach(function (id) {
    var s = el(id);
    if (!s) return;
    s.innerHTML = '<option value="">— Pilih program studi —</option>' +
      prodi.map(function (p) {
        return '<option value="' + esc(p.nama) + '">' + esc(p.nama) +
               (p.jenjang ? ' (' + esc(p.jenjang) + ')' : '') + '</option>';
      }).join('');
  });

  var sem = el('mhsSemester');
  if (sem) {
    var h = '<option value="">— Pilih semester —</option>';
    for (var i = 1; i <= 14; i++) {
      h += '<option value="Semester ' + i + '">Semester ' + i +
           ' (Tingkat ' + ['I','I','II','II','III','III','IV','IV','V','V','VI','VI','VII','VII'][i - 1] + ')</option>';
    }
    sem.innerHTML = h;
  }
}

function renderSkema(skema) {
  var w = el('mhsSkema');
  if (!w) return;
  if (!skema.length) {
    w.innerHTML = '<div class="tx-3 tx-sm">Belum ada skema keringanan yang tersedia.</div>';
    return;
  }
  w.innerHTML = skema.map(function (s, i) {
    return '<label class="pilihan' + (i === 0 ? ' terpilih' : '') + '" data-grup="mhsSkema">' +
      '<input type="radio" name="mhsSkema" value="' + esc(s.nama) + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<div class="p-atas"><div class="p-ikon"><i class="bi ' + esc(s.ikon || 'bi-cash-coin') + '"></i></div>' +
      '<span class="p-radio"></span></div>' +
      '<div class="p-nama">' + esc(s.nama) + '</div>' +
      '<div class="p-desk">' + esc(s.deskripsi || '') + '</div></label>';
  }).join('');
  pasangPilihan('mhsSkema');
}

function renderKlasifikasi(klas) {
  var w = el('dsnKlasifikasi');
  if (!w) return;
  if (!klas.length) {
    w.innerHTML = '<div class="tx-3 tx-sm">Belum ada klasifikasi karya yang tersedia.</div>';
    return;
  }
  w.innerHTML = klas.map(function (k, i) {
    return '<label class="pilihan' + (i === 0 ? ' terpilih' : '') + '" data-grup="dsnKlas">' +
      '<input type="radio" name="dsnKlas" value="' + esc(k.nama) + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<div class="p-atas"><div class="p-ikon"><i class="bi bi-journal-bookmark"></i></div>' +
      '<span class="p-radio"></span></div>' +
      '<div class="p-tag">' + esc(k.kategori || '') + '</div>' +
      '<div class="p-nama">' + esc(k.nama) + '</div>' +
      '<div class="p-desk">' + esc(k.deskripsi || '') + '</div>' +
      (k.plafon ? '<div class="p-plafon">Plafon ' + rupiah(k.plafon) + '</div>' : '') + '</label>';
  }).join('');
  pasangPilihan('dsnKlas');
}

function pasangPilihan(grup) {
  $$('.pilihan[data-grup="' + grup + '"]').forEach(function (p) {
    p.addEventListener('click', function () {
      $$('.pilihan[data-grup="' + grup + '"]').forEach(function (x) { x.classList.remove('terpilih'); });
      p.classList.add('terpilih');
      var r = p.querySelector('input');
      if (r) r.checked = true;
      tandaiLangkah(grup.indexOf('mhs') === 0 ? 'Mhs' : 'Dsn', 2);
    });
  });
}

/* ── Unggah berkas ──────────────────────────────────────────────── */
function renderBerkas(pre, daftar, tampilan) {
  var w = el(pre + 'Berkas');
  if (!w) return;

  if (!daftar.length) {
    w.innerHTML = '<div class="tx-3 tx-sm">Belum ada berkas persyaratan yang dikonfigurasi admin.</div>';
    return;
  }

  w.innerHTML = daftar.map(function (b) {
    return '<label class="unggah" id="' + pre + 'U_' + b.kunci + '">' +
      '<div class="u-ikon"><i class="bi ' + b.ikon + '"></i></div>' +
      '<div class="u-teks">' +
        '<div class="u-nama">' + esc(b.label) +
        (b.wajib ? ' <span class="lencana emas">Wajib</span>' : ' <span class="lencana neut">Opsional</span>') +
        '</div>' +
        '<div class="u-desk">' + esc(b.desk) + '</div>' +
        '<div class="u-berkas sembunyi" id="' + pre + 'N_' + b.kunci + '"></div>' +
      '</div>' +
      '<span class="btn btn-navy btn-sm"><i class="bi bi-file-earmark-arrow-up"></i> Pilih Berkas</span>' +
      '<input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" ' +
      'onchange="pilihBerkas(this,\'' + pre + '\',\'' + b.kunci + '\',\'' + esc(b.label) + '\')">' +
      '</label>';
  }).join('');
}

function pilihBerkas(input, pre, kunci, label) {
  var file = input.files && input.files[0];
  if (!file) return;

  var t = (Publik.data && Publik.data.tampilan) || {};
  var galat = validasiBerkas(file, t.uploadMaxMb || 2, t.uploadFormat);
  if (galat) { toast(galat, 'galat'); input.value = ''; return; }

  bacaBerkasBase64(file).then(function (b64) {
    Publik.berkas[pre][kunci] = {
      label: label, nama: file.name, mime: file.type || 'application/octet-stream',
      base64: b64, ukuran: file.size
    };
    var kotak = el(pre + 'U_' + kunci);
    if (kotak) kotak.classList.add('terisi');
    var teks = el(pre + 'N_' + kunci);
    if (teks) {
      teks.innerHTML = '<i class="bi bi-check-circle-fill"></i> ' + esc(file.name) +
                       ' (' + formatUkuran(file.size) + ')';
      teks.classList.remove('sembunyi');
    }
    tandaiLangkah(pre === 'mhs' ? 'Mhs' : 'Dsn', 3);
    toast('"' + file.name + '" siap diunggah.', 'sukses');
  }).catch(function (e) { toast(e.message, 'galat'); });
}

function pasangJatuhkan(pre) {
  var zona = el(pre + 'Jatuhkan');
  if (!zona) return;

  var input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
  input.style.display = 'none';
  zona.appendChild(input);

  zona.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
  input.addEventListener('change', function () { tambahBerkasTambahan(pre, input.files); input.value = ''; });

  ['dragenter', 'dragover'].forEach(function (ev) {
    zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('seret'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('seret'); });
  });
  zona.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files) tambahBerkasTambahan(pre, e.dataTransfer.files);
  });
}

function tambahBerkasTambahan(pre, files) {
  var t = (Publik.data && Publik.data.tampilan) || {};
  Array.prototype.forEach.call(files, function (file) {
    var galat = validasiBerkas(file, t.uploadMaxMb || 2, t.uploadFormat);
    if (galat) { toast(galat, 'galat'); return; }
    bacaBerkasBase64(file).then(function (b64) {
      Publik.tambahan[pre].push({
        label: 'Lampiran Pendukung', nama: file.name,
        mime: file.type || 'application/octet-stream', base64: b64, ukuran: file.size
      });
      gambarBerkasTambahan(pre);
    }).catch(function (e) { toast(e.message, 'galat'); });
  });
}

function gambarBerkasTambahan(pre) {
  var w = el(pre + 'BerkasTambahan');
  if (!w) return;
  w.innerHTML = Publik.tambahan[pre].map(function (b, i) {
    return '<div class="unggah terisi">' +
      '<div class="u-ikon"><i class="bi bi-paperclip"></i></div>' +
      '<div class="u-teks"><div class="u-nama">' + esc(b.nama) + '</div>' +
      '<div class="u-desk">Lampiran pendukung · ' + formatUkuran(b.ukuran) + '</div></div>' +
      '<button type="button" class="btn btn-hantu btn-ikon" onclick="hapusBerkasTambahan(\'' + pre + '\',' + i +
      ')" title="Hapus"><i class="bi bi-trash"></i></button></div>';
  }).join('');
}

function hapusBerkasTambahan(pre, i) {
  Publik.tambahan[pre].splice(i, 1);
  gambarBerkasTambahan(pre);
}

function kumpulkanBerkas(pre, wajibDaftar) {
  var out = [];
  var kurang = [];
  wajibDaftar.forEach(function (b) {
    var f = Publik.berkas[pre][b.kunci];
    if (f) out.push(f);
    else if (b.wajib) kurang.push(b.label);
  });
  Publik.tambahan[pre].forEach(function (f) { out.push(f); });
  return { berkas: out, kurang: kurang };
}

/* ── Sidebar portal ─────────────────────────────────────────────── */
function renderSidebarPublik(data) {
  var i = data.institusi || {};
  var st = data.statistik || {};
  var alurM = data.alur ? data.alur.mahasiswa : [];
  var alurD = data.alur ? data.alur.dosen : [];

  var h = '';

  /* Cek status cepat */
  h += '<div class="kartu">' +
    '<div class="baris g10 mb12"><i class="bi bi-broadcast-pin tx-emas" style="font-size:18px"></i>' +
    '<div><h3 style="font-size:16px">Cek Status Cepat</h3>' +
    '<div class="kartu-sub">Pelacakan posisi verifikator waktu nyata</div></div></div>' +
    '<div class="bidang"><label for="cepatNomor">Masukkan Nomor Referensi</label>' +
    '<input type="text" id="cepatNomor" class="mono" placeholder="REQ-MHS/2026/09-0042"></div>' +
    '<button class="btn btn-navy btn-blok" onclick="lacakCepat()">' +
    '<i class="bi bi-search"></i> Lacak Status Sekarang</button>' +
    '<div id="cepatHasil" class="mt16"></div></div>';

  /* Alur verifikasi */
  if (alurM.length || alurD.length) {
    h += '<div class="kartu"><div class="kartu-kepala"><div>' +
      '<h3 style="font-size:16px">Alur Verifikasi Berjenjang</h3>' +
      '<div class="kartu-sub">Setiap pengajuan melewati tahap berikut</div></div></div>';
    if (alurM.length) {
      h += '<div class="label-kecil mb8">Mahasiswa</div><div class="linimasa mb16">' +
        alurM.map(function (a, n) {
          return '<div class="lm-item"><div class="lm-bulat">' + (n + 1) + '</div>' +
            '<div class="lm-judul">' + esc(a.namaTahap) + '</div>' +
            '<div class="lm-meta">' + esc(a.jabatan) + '</div></div>';
        }).join('') + '</div>';
    }
    if (alurD.length) {
      h += '<div class="label-kecil mb8">Dosen</div><div class="linimasa">' +
        alurD.map(function (a, n) {
          return '<div class="lm-item"><div class="lm-bulat">' + (n + 1) + '</div>' +
            '<div class="lm-judul">' + esc(a.namaTahap) + '</div>' +
            '<div class="lm-meta">' + esc(a.jabatan) + '</div></div>';
        }).join('') + '</div>';
    }
    h += '</div>';
  }

  /* Unduh template */
  var bt = data.berkasTemplate || [];
  if (bt.length) {
    h += '<div class="kartu"><div class="kartu-kepala"><div>' +
      '<h3 style="font-size:16px">Unduh Template Dokumen</h3>' +
      '<div class="kartu-sub">Gunakan blangko resmi agar format sesuai standar</div></div></div>' +
      '<div class="tumpuk g8">' +
      bt.map(function (b) {
        var aktif = !!b.fileUrl;
        return '<div class="unggah" ' + (aktif ? 'onclick="pratinjauBerkas(\'' + esc(b.fileUrl) +
          '\',\'' + esc(String(b.nama).replace(/'/g, '')) + '\')" style="cursor:pointer"' :
          'style="opacity:.55"') + '>' +
          '<div class="u-ikon"><i class="bi ' + esc(b.ikon || 'bi-file-earmark-word') + '"></i></div>' +
          '<div class="u-teks"><div class="u-nama" style="font-size:13px">' + esc(b.nama) + '</div>' +
          '<div class="u-desk">' + esc(b.deskripsi || '') + '</div></div>' +
          '<i class="bi ' + (aktif ? 'bi-eye' : 'bi-slash-circle') + ' tx-3"></i></div>';
      }).join('') + '</div></div>';
  }

  /* Statistik & narahubung */
  h += '<div class="kartu" style="background:linear-gradient(150deg,#16293F,#1E3A5F);border:none;color:#fff">' +
    '<div class="baris g10 mb16"><i class="bi bi-question-circle tx-emas" style="font-size:18px"></i>' +
    '<h3 style="font-size:16px;color:#fff">Informasi &amp; Narahubung</h3></div>' +
    '<div class="tumpuk g12">' +
    infoBaris('Berapa lama proses verifikasi?',
      'Rata-rata ' + (st.rataHariProses || 2) + ' hingga 3 hari kerja sebelum batas penutupan KRS semester.') +
    infoBaris('Apakah perlu menyerahkan berkas fisik?',
      'Tidak perlu. Seluruh proses pengesahan dilakukan secara digital bersertifikasi TTE.') +
    infoBaris('Total pengajuan terlayani',
      angka(st.totalPengajuan || 0) + ' berkas · ' + angka(st.pengajuanSelesai || 0) + ' selesai diproses.') +
    '</div>' +
    (i.telepon ? '<a class="btn btn-utama btn-blok mt16" href="tel:' + esc(i.telepon) + '">' +
      '<i class="bi bi-telephone"></i> Hubungi Helpdesk</a>' : '') +
    '</div>';

  el('pubSidebar').innerHTML = h;
}

function infoBaris(judul, isi) {
  return '<div style="background:rgba(255,255,255,.07);border-radius:var(--r-lg);padding:12px 14px">' +
    '<div class="tebal tx-sm tx-emas mb4">' + esc(judul) + '</div>' +
    '<div class="tx-sm" style="color:rgba(255,255,255,.72);line-height:1.6">' + esc(isi) + '</div></div>';
}

/* ── Tab & langkah ──────────────────────────────────────────────── */
function gantiTabPublik(tab) {
  Publik.tabAktif = tab;
  $$('.pub-tab button').forEach(function (b) {
    b.classList.toggle('aktif', b.dataset.tab === tab);
  });
  tampil(el('tabMahasiswa'), tab === 'mahasiswa');
  tampil(el('tabDosen'), tab === 'dosen');
  tampil(el('tabLacak'), tab === 'lacak');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function tandaiLangkah(pre, n) {
  var w = el('langkah' + pre);
  if (!w) return;
  $$('.lk', w).forEach(function (lk) {
    var v = Number(lk.dataset.lk);
    lk.classList.toggle('aktif', v === n);
    lk.classList.toggle('selesai', v < n);
  });
}

/* ── Draf lokal ─────────────────────────────────────────────────── */
function simpanDraf(pre) {
  var kunci = pre === 'mhs' ? APP.kunciDrafMhs : APP.kunciDrafDsn;
  var ids = pre === 'mhs'
    ? ['mhsNama','mhsNim','mhsProdi','mhsSemester','mhsWa','mhsEmail','mhsAlasan']
    : ['dsnNama','dsnNuptk','dsnProdi','dsnJabfung','dsnWa','dsnEmail','dsnJudul','dsnPenerbit','dsnVolume','dsnDoi'];

  var o = {};
  ids.forEach(function (id) { o[id] = ambilNilai(id); });
  var r = $('input[name="' + (pre === 'mhs' ? 'mhsSkema' : 'dsnKlas') + '"]:checked');
  if (r) o.__pilihan = r.value;

  try {
    localStorage.setItem(kunci, JSON.stringify(o));
    toast('Draf tersimpan di peramban ini. Isian tidak hilang meski tab ditutup.', 'sukses');
  } catch (e) {
    toast('Peramban menolak penyimpanan draf.', 'peringatan');
  }
}

function pulihkanDraf() {
  [['mhs', APP.kunciDrafMhs, 'mhsSkema'], ['dsn', APP.kunciDrafDsn, 'dsnKlas']].forEach(function (x) {
    var s = null;
    try { s = localStorage.getItem(x[1]); } catch (e) {}
    if (!s) return;
    var o;
    try { o = JSON.parse(s); } catch (e) { return; }

    var terisi = false;
    Object.keys(o).forEach(function (id) {
      if (id === '__pilihan') return;
      var e2 = el(id);
      if (e2 && o[id]) { e2.value = o[id]; terisi = true; }
    });
    if (o.__pilihan) {
      $$('.pilihan[data-grup="' + x[2] + '"]').forEach(function (p) {
        var r = p.querySelector('input');
        var cocok = r && r.value === o.__pilihan;
        p.classList.toggle('terpilih', cocok);
        if (r) r.checked = cocok;
      });
    }
    if (terisi) toast('Draf pengajuan sebelumnya dipulihkan.', 'info');
  });
}

function hapusDraf(pre) {
  try { localStorage.removeItem(pre === 'mhs' ? APP.kunciDrafMhs : APP.kunciDrafDsn); } catch (e) {}
}

/* ── Kirim pengajuan mahasiswa ──────────────────────────────────── */
function kirimPengajuanMhs(e) {
  e.preventDefault();
  var btn = e.submitter || $('#formMhs button[type=submit]');

  var valid = validasiForm(el('formMhs'), [
    { id: 'mhsNama', wajib: true },
    { id: 'mhsNim', wajib: true },
    { id: 'mhsProdi', wajib: true },
    { id: 'mhsSemester', wajib: true },
    { id: 'mhsWa', wajib: true },
    { id: 'mhsEmail', wajib: true, email: true },
    { id: 'mhsAlasan', wajib: true, min: 20 }
  ]);
  if (!valid) return;

  var skema = $('input[name="mhsSkema"]:checked');
  if (!skema) { toast('Pilih salah satu skema keringanan terlebih dahulu.', 'peringatan'); return; }

  var kumpul = kumpulkanBerkas('mhs', BERKAS_MHS);
  if (kumpul.kurang.length) {
    toast('Berkas wajib belum diunggah: ' + kumpul.kurang.join(', ') + '.', 'peringatan');
    return;
  }

  var muatan = {
    nama: ambilNilai('mhsNama'), nim: ambilNilai('mhsNim'), prodi: ambilNilai('mhsProdi'),
    semester: ambilNilai('mhsSemester'), whatsapp: ambilNilai('mhsWa'), email: ambilNilai('mhsEmail'),
    skema: skema.value, alasan: ambilNilai('mhsAlasan'), berkas: kumpul.berkas
  };

  tombolSibuk(btn, true, 'Mengirim berkas…');
  kirim('submitPengajuanMahasiswa', muatan, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    hapusDraf('mhs');
    el('formMhs').reset();
    Publik.berkas.mhs = {}; Publik.tambahan.mhs = [];
    renderBerkas('mhs', BERKAS_MHS, Publik.data.tampilan);
    gambarBerkasTambahan('mhs');
    tandaiLangkah('Mhs', 1);
    tampilkanSukses(r.data, 'mahasiswa');
  });
}

/* ── Kirim pengajuan dosen ──────────────────────────────────────── */
function kirimPengajuanDsn(e) {
  e.preventDefault();
  var btn = e.submitter || $('#formDsn button[type=submit]');

  var valid = validasiForm(el('formDsn'), [
    { id: 'dsnNama', wajib: true },
    { id: 'dsnNuptk', wajib: true },
    { id: 'dsnProdi', wajib: true },
    { id: 'dsnWa', wajib: true },
    { id: 'dsnEmail', wajib: true, email: true },
    { id: 'dsnJudul', wajib: true, min: 10 }
  ]);
  if (!valid) return;

  var klas = $('input[name="dsnKlas"]:checked');
  if (!klas) { toast('Pilih klasifikasi karya ilmiah terlebih dahulu.', 'peringatan'); return; }

  var kumpul = kumpulkanBerkas('dsn', BERKAS_DSN);
  if (kumpul.kurang.length) {
    toast('Berkas wajib belum diunggah: ' + kumpul.kurang.join(', ') + '.', 'peringatan');
    return;
  }

  var muatan = {
    nama: ambilNilai('dsnNama'), nuptk: ambilNilai('dsnNuptk'), prodi: ambilNilai('dsnProdi'),
    jabatanFungsional: ambilNilai('dsnJabfung'), whatsapp: ambilNilai('dsnWa'),
    email: ambilNilai('dsnEmail'), klasifikasi: klas.value, judulKarya: ambilNilai('dsnJudul'),
    penerbit: ambilNilai('dsnPenerbit'), volume: ambilNilai('dsnVolume'), doi: ambilNilai('dsnDoi'),
    berkas: kumpul.berkas
  };

  tombolSibuk(btn, true, 'Mengirim berkas…');
  kirim('submitPengajuanDosen', muatan, APP.batasWaktuUnggah).then(function (r) {
    tombolSibuk(btn, false);
    if (!r.success) { toast(r.message, 'galat'); return; }
    hapusDraf('dsn');
    el('formDsn').reset();
    Publik.berkas.dsn = {}; Publik.tambahan.dsn = [];
    renderBerkas('dsn', BERKAS_DSN, Publik.data.tampilan);
    gambarBerkasTambahan('dsn');
    tandaiLangkah('Dsn', 1);
    tampilkanSukses(r.data, 'dosen');
  });
}

function tampilkanSukses(d, jenis) {
  bukaModal({
    judul: 'Pengajuan Berhasil Dikirim',
    sub: 'Simpan nomor referensi berikut untuk melacak status',
    isi:
      '<div class="tgh mb20">' +
      '<div class="kpi-ikon hijau" style="width:56px;height:56px;font-size:26px;margin:0 auto 14px">' +
      '<i class="bi bi-check-circle-fill"></i></div>' +
      '<div class="tebal" style="font-size:16px">Terima kasih, ' + esc(d.nama) + '.</div>' +
      '<div class="tx-2 tx-md mt4">Berkas Anda telah masuk antrean verifikasi.</div></div>' +

      '<div class="pratinjau-nomor mb16">' +
      '<div class="pn-label"><span>Nomor Referensi Pengajuan</span>' +
      '<button class="btn btn-hantu btn-sm" style="color:#fff;padding:2px 8px" onclick="salinTeks(\'' +
      esc(d.noRef) + '\')"><i class="bi bi-clipboard"></i> Salin</button></div>' +
      '<div class="pn-nilai">' + esc(d.noRef) + '</div>' +
      '<div class="pn-ket">Status: ' + esc(d.status) + ' · ' + (d.totalTahap || 0) + ' tahap verifikasi</div></div>' +

      '<div class="baris g10" style="align-items:flex-start;background:var(--info-bg);color:var(--info-fg);' +
      'padding:13px 15px;border-radius:var(--r-lg)">' +
      '<i class="bi bi-info-circle-fill"></i>' +
      '<div class="tx-sm sisa" style="line-height:1.6">Notifikasi pembaruan status dikirim otomatis ke surel ' +
      'dan WhatsApp yang Anda daftarkan. Anda juga dapat memantau kapan saja melalui menu ' +
      '<b>Lacak Status</b>.</div></div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>' +
          '<button class="btn btn-utama" onclick="tutupModal();gantiTabPublik(\'lacak\');' +
          'el(\'lacakNomor\').value=\'' + esc(d.noRef) + '\';jalankanLacak();">' +
          '<i class="bi bi-search"></i> Lacak Sekarang</button>',
    tanpaFokus: true
  });
}

/* ── Pelacakan ──────────────────────────────────────────────────── */
function jalankanLacak(e) {
  if (e) e.preventDefault();
  var nomor = ambilNilai('lacakNomor');
  if (!nomor) { toast('Masukkan nomor referensi terlebih dahulu.', 'peringatan'); return; }

  var w = el('lacakHasil');
  w.innerHTML = keadaanMemuat('Mencari data pengajuan…');

  ambil('lacakPengajuan', { nomor: nomor }).then(function (r) {
    if (!r.success) {
      w.innerHTML = keadaanKosong('Pengajuan tidak ditemukan', r.message, 'bi-search');
      return;
    }
    w.innerHTML = kartuLacak(r.data);
  });
}

function lacakCepat() {
  var nomor = ambilNilai('cepatNomor');
  if (!nomor) { toast('Masukkan nomor referensi terlebih dahulu.', 'peringatan'); return; }
  var w = el('cepatHasil');
  w.innerHTML = keadaanMemuat('Mencari…');
  ambil('lacakPengajuan', { nomor: nomor }).then(function (r) {
    if (!r.success) {
      w.innerHTML = '<div class="lencana dang" style="white-space:normal;height:auto;padding:8px 12px;' +
                    'line-height:1.5">' + esc(r.message) + '</div>';
      return;
    }
    var d = r.data;
    w.innerHTML = '<div class="lacak-hasil"><div class="lacak-kepala">' +
      '<div class="baris antara g8 bungkus mb8">' + chipNomor(d.noRef) + lencanaStatus(d.status) + '</div>' +
      '<div class="tebal tx-md">' + esc(potong(d.perihal, 70)) + '</div>' +
      '<div class="tx-sm tx-3 mt4">' + esc(d.nama) + ' · ' + esc(d.identitas) + '</div></div>' +
      '<div class="lacak-isi"><div class="linimasa">' +
      d.langkah.map(itemLinimasa).join('') + '</div>' +
      (d.pdfUrl ? '<button class="btn btn-utama btn-blok mt16" onclick="pratinjauBerkas(\'' +
        esc(d.pdfUrl) + '\',\'Surat Keterangan\')">' +
        '<i class="bi bi-file-earmark-pdf"></i> Lihat Surat Keterangan</button>' : '') +
      '</div></div>';
  });
}

function kartuLacak(d) {
  var h = '<div class="lacak-hasil">' +
    '<div class="lacak-kepala"><div class="baris antara g10 bungkus mb10">' +
    chipNomor(d.noRef) + lencanaStatus(d.status) + '</div>' +
    '<h3 style="font-size:17px">' + esc(d.perihal) + '</h3>' +
    '<div class="tx-sm tx-2 mt8 baris g16 bungkus">' +
    '<span><i class="bi bi-person"></i> ' + esc(d.nama) + '</span>' +
    '<span><i class="bi bi-hash"></i> ' + esc(d.identitas) + '</span>' +
    (d.prodi ? '<span><i class="bi bi-mortarboard"></i> ' + esc(d.prodi) + '</span>' : '') +
    '<span><i class="bi bi-calendar3"></i> ' + tglJam(d.tanggal) + '</span></div></div>' +

    '<div class="lacak-isi">' +
    '<div class="baris antara g10 mb16 bungkus">' +
    '<div class="label-kecil">Posisi Verifikasi</div>' +
    '<div class="tx-sm tx-2">Tahap <b>' + d.tahapSaatIni + '</b> dari <b>' + d.totalTahap + '</b></div></div>' +
    '<div class="linimasa">' + d.langkah.map(itemLinimasa).join('') + '</div>';

  if (d.nomorSuratKeterangan) {
    h += '<div class="garis"></div><div class="baris antara g12 bungkus">' +
      '<div><div class="label-kecil mb4">Surat Keterangan Terbit</div>' + chipNomor(d.nomorSuratKeterangan) + '</div>' +
      (d.pdfUrl ? '<button class="btn btn-utama" onclick="pratinjauBerkas(\'' + esc(d.pdfUrl) +
        '\',\'Surat Keterangan\',{sub:\'' + esc(String(d.nomorSuratKeterangan || '').replace(/'/g, '')) +
        '\'})"><i class="bi bi-file-earmark-pdf"></i> Lihat Dokumen Resmi</button>' : '') + '</div>';
  }

  return h + '</div></div>';
}

function itemLinimasa(l) {
  var kls = l.status === 'DISETUJUI' ? 'selesai' :
            l.status === 'BERJALAN' ? 'berjalan' :
            l.status === 'DITOLAK' ? 'tolak' :
            l.status === 'REVISI' ? 'revisi' : '';
  var ikon = l.status === 'DISETUJUI' ? '<i class="bi bi-check-lg"></i>' :
             l.status === 'DITOLAK' ? '<i class="bi bi-x-lg"></i>' :
             l.status === 'REVISI' ? '<i class="bi bi-pencil"></i>' : l.urutan;

  return '<div class="lm-item ' + kls + '"><div class="lm-bulat">' + ikon + '</div>' +
    '<div class="lm-judul">' + esc(l.namaTahap) + '</div>' +
    '<div class="lm-meta">' + esc(l.jabatan) +
    (l.waktu ? ' · ' + tglJam(l.waktu) : '') +
    (l.pelaku ? ' · ' + esc(l.pelaku) : '') + '</div>' +
    (l.catatan ? '<div class="lm-catatan">' + esc(l.catatan) + '</div>' : '') + '</div>';
}

/* ── Panduan ────────────────────────────────────────────────────── */
function bukaPanduan() {
  var jenis = Publik.tabAktif === 'dosen' ? 'dosen' : 'mahasiswa';
  var alur = (Publik.data.alur || {})[jenis] || [];
  var daftar = jenis === 'dosen' ? BERKAS_DSN : BERKAS_MHS;

  bukaModal({
    judul: 'Panduan Pengajuan ' + (jenis === 'dosen' ? 'Insentif Dosen' : 'Keringanan Mahasiswa'),
    sub: 'Ikuti tahapan berikut agar berkas Anda dapat diproses tanpa hambatan',
    isi:
      '<div class="label-kecil mb8">1. Siapkan Berkas Persyaratan</div>' +
      '<ul style="padding-left:20px;line-height:1.9;font-size:13.5px;margin:0 0 18px">' +
      daftar.map(function (b) {
        return '<li>' + esc(b.label) + (b.wajib ? ' <span class="lencana emas">Wajib</span>' :
               ' <span class="lencana neut">Opsional</span>') + '<br><span class="tx-sm tx-3">' +
               esc(b.desk) + '</span></li>';
      }).join('') + '</ul>' +

      '<div class="label-kecil mb8">2. Isi Formulir Daring</div>' +
      '<p class="tx-md tx-2">Lengkapi seluruh isian bertanda <span class="wajib">*</span>. Gunakan tombol ' +
      '<b>Simpan Draf</b> bila ingin melanjutkan nanti — isian tersimpan di peramban ini.</p>' +

      '<div class="label-kecil mb8 mt16">3. Proses Verifikasi Berjenjang</div>' +
      '<div class="linimasa mb16">' + alur.map(function (a, n) {
        return '<div class="lm-item"><div class="lm-bulat">' + (n + 1) + '</div>' +
          '<div class="lm-judul">' + esc(a.namaTahap) + '</div>' +
          '<div class="lm-meta">' + esc(a.jabatan) + '</div></div>';
      }).join('') + '</div>' +

      '<div class="label-kecil mb8">4. Pantau &amp; Unduh Hasil</div>' +
      '<p class="tx-md tx-2 mb0">Simpan nomor referensi yang muncul setelah pengiriman. Notifikasi setiap ' +
      'perubahan status dikirim otomatis ke surel dan WhatsApp Anda, dan Surat Keterangan dapat diunduh ' +
      'langsung dari menu Lacak Status setelah terbit.</p>',
    kaki: '<button class="btn btn-utama" onclick="tutupModal()">Saya Mengerti</button>',
    tanpaFokus: true
  });
}
