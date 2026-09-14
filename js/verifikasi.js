/* ═══════════════════════════════════════════════════════════════════
   e-SURAT — js/verifikasi.js
   Antrean pengajuan dan panel verifikasi berjenjang (split-view).
   ═══════════════════════════════════════════════════════════════════ */

var Verif = { jenis: 'mahasiswa', saring: 'semua', rec: null };

/* ── Antrean pengajuan ──────────────────────────────────────────── */
function renderAntreanPengajuan(w, jenis) {
  Verif.jenis = jenis;
  var dosen = jenis === 'dosen';
  var kunci = dosen ? 'pengajuanDosen' : 'pengajuanMhs';
  var idTabel = dosen ? 'antreanDosen' : 'antreanMhs';
  var semua = (Adm.boot.data[kunci] || []).slice().reverse();
  var alur = (Adm.boot.master.alurVerifikasi || []).filter(function (a) {
    return a.jenisPengajuan === jenis && String(a.aktif) === 'true';
  }).sort(function (a, b) { return Number(a.urutan) - Number(b.urutan); });

  var hitung = {
    semua: semua.length,
    MENUNGGU: semua.filter(function (r) { return r.status === 'MENUNGGU'; }).length,
    DIPROSES: semua.filter(function (r) { return r.status === 'DIPROSES'; }).length,
    DISETUJUI: semua.filter(function (r) { return r.status === 'DISETUJUI'; }).length,
    REVISI: semua.filter(function (r) { return r.status === 'REVISI'; }).length,
    TERBIT: semua.filter(function (r) { return r.status === 'TERBIT'; }).length,
    DITOLAK: semua.filter(function (r) { return r.status === 'DITOLAK'; }).length
  };

  var data = Verif.saring === 'semua'
    ? semua
    : semua.filter(function (r) { return r.status === Verif.saring; });

  var cari = Adm.filter[kunci] || '';
  if (cari) {
    var q = cari.toLowerCase();
    data = data.filter(function (r) {
      return (String(r.noRef) + r.nama + (r.nim || r.nuptk) + (r.skema || r.judulKarya))
             .toLowerCase().indexOf(q) >= 0;
    });
  }

  var h = kepalaHalaman({
    remah: ['Layanan Akademik', dosen ? 'Pengajuan Dosen' : 'Pengajuan Mahasiswa', 'Verifikasi Berjenjang'],
    judul: dosen ? 'Verifikasi Insentif Karya Ilmiah Dosen' : 'Verifikasi Keringanan UKT & Asrama',
    sub: dosen
      ? 'Pemeriksaan validitas luaran penelitian, kesesuaian klasifikasi, dan otorisasi anggaran insentif.'
      : 'Pemeriksaan kelayakan akademik, kondisi ekonomi pemohon, dan evaluasi berkas penunjang finansial.',
    aksi: '<span class="chip-nomor"><i class="bi bi-diagram-3"></i> Mode Berjenjang · ' +
          alur.length + ' Tahap</span>' +
          '<button class="btn btn-garis" onclick="eksporModul(\'' + kunci + '\')">' +
          '<i class="bi bi-filetype-csv"></i> Ekspor</button>'
  });

  /* Saringan status */
  h += '<div class="pub-tab mb16" style="padding:4px">' +
    saringTombol('semua', 'Semua Antrean', hitung.semua) +
    saringTombol('MENUNGGU', 'Menunggu Review', hitung.MENUNGGU) +
    saringTombol('DIPROSES', 'Sedang Diproses', hitung.DIPROSES) +
    saringTombol('DISETUJUI', 'Disetujui Sementara', hitung.DISETUJUI) +
    saringTombol('TERBIT', 'SK Terbit', hitung.TERBIT) +
    '</div>';

  h += '<div class="baris g16 bungkus mb16 tx-sm tx-2">' +
    '<span><i class="bi bi-hourglass-split"></i> SLA Review: &lt; 24 Jam</span>' +
    '<span><i class="bi bi-patch-check"></i> Tanda Tangan Elektronik Siap</span>' +
    (hitung.REVISI ? '<span class="lencana warn">' + hitung.REVISI + ' menunggu revisi pemohon</span>' : '') +
    (hitung.DITOLAK ? '<span class="lencana dang">' + hitung.DITOLAK + ' ditolak</span>' : '') + '</div>';

  h += '<div class="kartu kartu-rapat">' +
    '<div class="tabel-alat"><div class="cari"><i class="bi bi-search"></i>' +
    '<input type="search" value="' + esc(cari) + '" placeholder="Cari nomor referensi, nama, atau NIM…" ' +
    'oninput="cariModul(\'' + kunci + '\',this.value)"></div><div class="sisa"></div>' +
    '<span class="lencana neut">' + data.length + ' berkas</span></div>' +

    bangunTabel({
      data: data, idTabel: idTabel, halaman: Adm.halaman[idTabel] || 1,
      kolom: [
        { k: 'noRef', l: 'No. Referensi', tipe: 'mono' },
        { k: 'tanggal', l: 'Diajukan', tipe: 'tanggal' },
        { k: 'nama', l: 'Pemohon', tipe: 'utama' },
        { k: dosen ? 'nuptk' : 'nim', l: dosen ? 'NIDN/NUPTK' : 'NIM' },
        { k: dosen ? 'klasifikasi' : 'skema', l: dosen ? 'Klasifikasi Karya' : 'Skema Keringanan' },
        { k: 'status', l: 'Status', tipe: 'status' }
      ],
      judulKosong: 'Tidak ada berkas pada kategori ini',
      deskKosong: 'Pengajuan yang masuk melalui portal publik akan tampil di sini.',
      ikonKosong: 'bi-clipboard-check',
      aksi: function (r) {
        var a = '<button class="btn btn-navy btn-sm" onclick="bukaVerifikasi(\'' + jenis + '\',\'' + r.id +
                '\')">Review <i class="bi bi-arrow-right"></i></button>';
        if (r.pdfUrl) a += tombolPratinjau(r.pdfUrl, 'Surat Keterangan ' + r.noRef,
                             'bi-file-earmark-pdf', 'Pratinjau Surat Keterangan');
        return a;
      }
    }) + '</div>';

  w.innerHTML = h;
}

function saringTombol(nilai2, label, jumlah) {
  return '<button class="' + (Verif.saring === nilai2 ? 'aktif' : '') + '" onclick="saringAntrean(\'' +
    nilai2 + '\')">' + esc(label) +
    (jumlah ? ' <span class="lencana ' + (Verif.saring === nilai2 ? 'emas' : 'neut') +
      '" style="height:19px;font-size:10px">' + jumlah + '</span>' : '') + '</button>';
}

function saringAntrean(nilai2) {
  Verif.saring = nilai2;
  var idTabel = Verif.jenis === 'dosen' ? 'antreanDosen' : 'antreanMhs';
  Adm.halaman[idTabel] = 1;
  renderAntreanPengajuan(el('admKonten'), Verif.jenis);
}

/* ── Panel verifikasi split-view ────────────────────────────────── */
function bukaVerifikasi(jenis, id) {
  var kunci = jenis === 'dosen' ? 'pengajuanDosen' : 'pengajuanMhs';
  var rec = (Adm.boot.data[kunci] || []).filter(function (r) { return String(r.id) === String(id); })[0];
  if (!rec) { toast('Data pengajuan tidak ditemukan.', 'galat'); return; }

  Verif.rec = rec;
  Verif.jenis = jenis;

  var dosen = jenis === 'dosen';
  var alur = (Adm.boot.master.alurVerifikasi || []).filter(function (a) {
    return a.jenisPengajuan === jenis && String(a.aktif) === 'true';
  }).sort(function (a, b) { return Number(a.urutan) - Number(b.urutan); });

  var riwayat = parseAman(rec.riwayatVerifikasi, []);
  var berkas = parseAman(rec.berkas, []);
  var tahap = Number(rec.tahapSaatIni) || 1;
  var selesai = rec.status === 'TERBIT' || rec.status === 'DITOLAK';
  var siapTerbit = rec.status === 'DISETUJUI';

  /* ── Kolom kiri: lembar permohonan ── */
  var kiri = '<div class="dok-pratinjau">' +
    '<div class="dp-kop"><div class="in">' + esc((Adm.boot.config || {}).INSTITUSI_NAMA || '') + '</div>' +
    '<div class="al">' + esc((Adm.boot.config || {}).INSTITUSI_ALAMAT || '') + '</div>' +
    '<div class="al">Telp. ' + esc((Adm.boot.config || {}).INSTITUSI_TELEPON || '') + '</div></div>' +

    '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:14px">' +
    '<span>Nomor Agenda: ' + esc(rec.noRef) + '</span>' +
    '<span>' + esc((Adm.boot.config || {}).INSTITUSI_KOTA || '') + ', ' + tgl(rec.tanggal, true) + '</span></div>' +

    '<h4 class="dp-judul">' + (dosen ? 'PERMOHONAN INSENTIF KARYA ILMIAH'
                                     : 'SURAT PERMOHONAN KERINGANAN BIAYA PENDIDIKAN') + '</h4>' +
    '<p class="dp-nomor">Tahun Akademik ' + esc((Adm.boot.config || {}).TAHUN_AKADEMIK || '') + '</p>' +

    '<p>Kepada Yth.<br><b>Ketua ' + esc((Adm.boot.config || {}).INSTITUSI_SINGKATAN || '') + '</b><br>' +
    'Di Tempat</p>' +

    '<p><i>Assalamu\'alaikum Warahmatullahi Wabarakatuh.</i><br>' +
    'Yang bertanda tangan di bawah ini:</p>' +

    '<div style="background:#f4f6f9;padding:12px 15px;border-radius:6px;margin:12px 0">' +
    (dosen
      ? barisDok('Nama Lengkap & Gelar', rec.nama) + barisDok('NIDN / NUPTK', rec.nuptk) +
        barisDok('Program Studi', rec.prodi) + barisDok('Jabatan Fungsional', rec.jabatanFungsional) +
        barisDok('Klasifikasi Karya', rec.klasifikasi)
      : barisDok('Nama Lengkap', rec.nama) + barisDok('Nomor Induk Mahasiswa', rec.nim) +
        barisDok('Program Studi', rec.prodi) + barisDok('Semester', rec.semester) +
        barisDok('Skema Dimohonkan', rec.skema)) +
    barisDok('Kontak', (rec.whatsapp || '-') + ' · ' + (rec.email || '-')) +
    '</div>';

  if (dosen) {
    kiri += '<p><b>URAIAN KARYA ILMIAH</b></p>' +
      '<div style="background:#f4f6f9;padding:12px 15px;border-radius:6px;margin:12px 0">' +
      barisDok('Judul Karya', rec.judulKarya) + barisDok('Penerbit / Jurnal', rec.penerbit) +
      barisDok('Volume / Nomor', rec.volume) + barisDok('DOI / Repositori', rec.doi) + '</div>';
  } else {
    kiri += '<p><b>URAIAN ALASAN PERMOHONAN</b></p>' +
      '<p style="text-align:justify;background:#f4f6f9;padding:12px 15px;border-radius:6px">' +
      esc(rec.alasan) + '</p>';
  }

  kiri += '<p style="margin-top:16px">Demikian permohonan ini saya sampaikan dengan sebenar-benarnya. ' +
    'Atas perhatian dan kebijaksanaan Bapak/Ibu, saya ucapkan terima kasih.</p>' +
    '<div style="text-align:right;margin-top:24px"><div>Hormat saya,</div>' +
    '<div style="height:44px"></div><div style="font-weight:700;text-decoration:underline">' +
    esc(rec.nama) + '</div><div>' + esc(dosen ? rec.nuptk : rec.nim) + '</div></div>' +
    '</div>';

  /* Lampiran */
  kiri += '<div class="kartu kartu-rapat mt16">' +
    '<div class="baris antara g10 mb12"><div class="label-kecil">' +
    '<i class="bi bi-paperclip"></i> Lampiran Pendukung Terverifikasi (' + berkas.length + ' berkas)</div>' +
    '<div class="tx-sm tx-3">Total ' + formatUkuran(berkas.reduce(function (s, b) {
      return s + (Number(b.ukuran) || 0); }, 0)) + '</div></div>';

  kiri += berkas.length
    ? '<div class="pilihan-grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">' +
      berkas.map(function (b) {
        return '<div class="pilihan" onclick="pratinjauBerkas(\'' + esc(b.url) + '\',\'' +
          esc(String(b.label || 'Lampiran').replace(/'/g, '')) + '\')" style="cursor:pointer">' +
          '<div class="p-atas"><div class="p-ikon"><i class="bi bi-file-earmark-pdf"></i></div>' +
          '<i class="bi bi-box-arrow-up-right tx-3"></i></div>' +
          '<div class="p-nama" style="font-size:12.5px">' + esc(potong(b.label, 40)) + '</div>' +
          '<div class="p-desk mono" style="font-size:10.5px">' + esc(potong(b.nama, 28)) + ' · ' +
          formatUkuran(b.ukuran) + '</div></div>';
      }).join('') + '</div>'
    : '<div class="tx-sm tx-3">Tidak ada lampiran terunggah.</div>';
  kiri += '</div>';

  /* ── Kolom kanan: identitas, alur, aksi ── */
  var kanan = '<div class="kartu mb16">' +
    '<div class="baris g12 mb12"><div class="avatar" style="width:44px;height:44px;font-size:15px">' +
    inisial(rec.nama) + '</div><div class="sisa">' +
    '<div class="tebal" style="font-size:15px">' + esc(rec.nama) +
    ' <i class="bi bi-patch-check-fill tx-ok"></i></div>' +
    '<div class="tx-sm tx-3 mono">' + esc(dosen ? rec.nuptk : rec.nim) + ' · ' + esc(rec.prodi) + '</div>' +
    '</div>' + lencanaStatus(rec.status) + '</div>' +

    '<div class="grid-2" style="gap:10px">' +
    miniInfo('No. Kontak Pemohon', rec.whatsapp) +
    miniInfo('Surel Akademik', rec.email) + '</div>' +

    (rec.whatsapp ? '<a class="btn btn-ok btn-blok mt12" target="_blank" rel="noopener" href="https://wa.me/' +
      esc(String(rec.whatsapp).replace(/\D/g, '')) + '">' +
      '<i class="bi bi-whatsapp"></i> Hubungi Pemohon via WhatsApp</a>' : '') + '</div>';

  /* Alur bertingkat */
  kanan += '<div class="kartu mb16"><div class="kartu-kepala"><div class="baris g8">' +
    '<i class="bi bi-graph-up-arrow tx-emas"></i>' +
    '<h3 style="font-size:16px">Alur Verifikasi Bertingkat</h3></div>' +
    '<span class="chip-nomor">' + alur.length + ' Level Approval</span></div>' +
    '<div class="linimasa">';

  alur.forEach(function (a) {
    var urut = Number(a.urutan);
    var jejak = riwayat.filter(function (r) { return Number(r.tahap) === urut; }).pop();
    var st = jejak ? jejak.aksi : (urut === tahap && !selesai ? 'BERJALAN' : (urut < tahap ? 'DISETUJUI' : 'MENUNGGU'));
    var kls = st === 'DISETUJUI' ? 'selesai' : st === 'BERJALAN' ? 'berjalan' :
              st === 'DITOLAK' ? 'tolak' : st === 'REVISI' ? 'revisi' : '';
    var ikon = st === 'DISETUJUI' ? '<i class="bi bi-check-lg"></i>' :
               st === 'DITOLAK' ? '<i class="bi bi-x-lg"></i>' :
               st === 'REVISI' ? '<i class="bi bi-pencil"></i>' :
               st === 'BERJALAN' ? '<i class="bi bi-caret-right-fill"></i>' :
               '<i class="bi bi-lock-fill" style="font-size:9px"></i>';

    kanan += '<div class="lm-item ' + kls + '"><div class="lm-bulat">' + ikon + '</div>' +
      '<div class="baris antara g8 bungkus">' +
      '<div class="lm-judul">' + urut + '. ' + esc(a.namaTahap) + '</div>' +
      '<span class="lencana ' + (st === 'DISETUJUI' ? 'ok' : st === 'BERJALAN' ? 'warn' :
        st === 'DITOLAK' ? 'dang' : st === 'REVISI' ? 'warn' : 'neut') + '">' + esc(st) + '</span></div>' +
      '<div class="lm-meta">' + esc(a.jabatan) +
      (jejak ? ' · ' + esc(jejak.pelaku) + ' · ' + tglJam(jejak.waktu) : '') + '</div>' +
      (jejak && jejak.catatan ? '<div class="lm-catatan">' + esc(jejak.catatan) + '</div>' : '') +
      '</div>';
  });

  kanan += '<div class="lm-item ' + (rec.status === 'TERBIT' ? 'selesai' : siapTerbit ? 'berjalan' : '') + '">' +
    '<div class="lm-bulat">' + (rec.status === 'TERBIT' ? '<i class="bi bi-check-lg"></i>' :
      '<i class="bi bi-award" style="font-size:10px"></i>') + '</div>' +
    '<div class="baris antara g8 bungkus"><div class="lm-judul">' + (alur.length + 1) +
    '. Penerbitan Surat Keterangan &amp; TTE</div>' +
    '<span class="lencana ' + (rec.status === 'TERBIT' ? 'ok' : siapTerbit ? 'warn' : 'neut') + '">' +
    (rec.status === 'TERBIT' ? 'TERBIT' : siapTerbit ? 'SIAP' : 'MENUNGGU') + '</span></div>' +
    '<div class="lm-meta">Sekretariat Utama · TTE Balai Sertifikasi Elektronik (BSrE)</div>' +
    (rec.nomorSuratKeterangan ? '<div class="lm-catatan">Nomor: ' + esc(rec.nomorSuratKeterangan) + '</div>' : '') +
    '</div></div></div>';

  /* Form aksi */
  if (selesai) {
    kanan += '<div class="kartu"><div class="tgh">' +
      '<div class="kpi-ikon ' + (rec.status === 'TERBIT' ? 'hijau' : 'abu') +
      '" style="width:46px;height:46px;font-size:21px;margin:0 auto 12px' +
      (rec.status === 'DITOLAK' ? ';background:var(--dang-bg);color:var(--dang-fg)' : '') + '">' +
      '<i class="bi ' + (rec.status === 'TERBIT' ? 'bi-patch-check-fill' : 'bi-x-octagon-fill') + '"></i></div>' +
      '<div class="tebal mb4">Proses Verifikasi Selesai</div>' +
      '<div class="tx-sm tx-2">' + (rec.status === 'TERBIT'
        ? 'Surat Keterangan telah diterbitkan dan dikirim ke pemohon.'
        : 'Pengajuan ditolak pada salah satu jenjang verifikasi.') + '</div>' +
      (rec.pdfUrl ? '<button class="btn btn-utama btn-blok mt16" onclick="pratinjauBerkas(\'' +
        esc(rec.pdfUrl) + '\',\'Surat Keterangan\')"><i class="bi bi-file-earmark-pdf"></i> ' +
        'Lihat Surat Keterangan</button>' : '') + '</div></div>';

  } else if (siapTerbit) {
    kanan += '<div class="kartu">' +
      '<div class="label-kecil mb12"><i class="bi bi-award"></i> Penerbitan Surat Keterangan</div>' +
      '<div class="baris g10 mb16" style="background:var(--ok-bg);color:var(--ok-fg);padding:12px 14px;' +
      'border-radius:var(--r-lg)"><i class="bi bi-check-circle-fill"></i>' +
      '<div class="sisa tx-sm">Seluruh jenjang verifikasi telah disetujui. Pengajuan siap diterbitkan.</div></div>' +
      bidangPilih({ id: 'vfPejabat', label: 'Pejabat Penandatangan Surat Keterangan',
        opsi: (Adm.boot.master.pejabat || []).filter(function (p) { return String(p.aktif) === 'true'; })
          .map(function (p) { return { v: p.id, t: p.nama + ' — ' + p.jabatan }; }) }) +
      '<div class="bidang"><label>Isi Surat Keterangan (opsional)</label>' +
      editorNaskah('vfIsi', '', 'Kosongkan untuk memakai redaksi bawaan sistem.', 120) + '</div>' +
      '<div class="aksi-verif">' +
      (Sesi.boleh('tulis')
        ? '<button class="btn btn-utama" id="btnTerbitSKet" onclick="terbitkanSKet(false)">' +
          '<i class="bi bi-patch-check"></i> Terbitkan Surat Keterangan &amp; TTE</button>' +
          '<button class="btn btn-garis" onclick="terbitkanSKet(true)">' +
          '<i class="bi bi-bell"></i> Kirim Notifikasi Resmi Saja</button>'
        : '<div class="tx-sm tx-3 tgh">Peran Anda tidak memiliki akses penerbitan.</div>') +
      '</div></div>';

  } else {
    var tahapInfo = alur.filter(function (a) { return Number(a.urutan) === tahap; })[0] || {};
    kanan += '<div class="kartu">' +
      '<div class="baris antara g10 mb12"><div class="label-kecil">' +
      '<i class="bi bi-chat-square-text"></i> Catatan Verifikator / Instruksi Disposisi</div>' +
      '<div class="tx-xs tx-3"><span id="vfHitung">0</span>/300</div></div>' +
      '<div class="tx-sm tx-2 mb12">Tahap aktif: <b>' + esc(tahapInfo.namaTahap || '-') + '</b> — ' +
      esc(tahapInfo.jabatan || '-') + '</div>' +
      '<div class="bidang"><textarea id="vfCatatan" rows="4" maxlength="300" ' +
      'placeholder="Tuliskan hasil pemeriksaan, pertimbangan, atau instruksi untuk jenjang berikutnya." ' +
      'oninput="el(\'vfHitung\').textContent=this.value.length"></textarea></div>' +

      '<div class="baris g6 bungkus mb16">' +
      catatanCepat('Berkas lengkap & sesuai') +
      catatanCepat('Data pemohon terverifikasi') +
      catatanCepat('Lanjut ke jenjang berikutnya') +
      '</div>' +

      '<div class="aksi-verif">' +
      (Sesi.boleh('verifikasi')
        ? '<button class="btn btn-ok" id="btnSetuju" onclick="prosesVerif(\'SETUJUI\')">' +
          '<i class="bi bi-check-circle"></i> Setujui ' +
          (tahap >= alur.length ? '&amp; Selesaikan Verifikasi' : '&amp; Teruskan ke Tahap ' + (tahap + 1)) +
          '</button>' +
          '<div class="baris g8"><button class="btn btn-garis sisa" onclick="prosesVerif(\'REVISI\')">' +
          '<i class="bi bi-arrow-counterclockwise"></i> Minta Revisi</button>' +
          '<button class="btn btn-bahaya sisa" onclick="prosesVerif(\'TOLAK\')">' +
          '<i class="bi bi-x-circle"></i> Tolak Pengajuan</button></div>'
        : '<div class="tx-sm tx-3 tgh">Peran Anda tidak memiliki akses verifikasi.</div>') +
      '</div>';

    if (Sesi.boleh('bypass')) {
      kanan += '<div class="kartu kartu-rapat mt16" style="background:var(--navy-dark);border:none;color:#fff">' +
        '<div class="baris antara g8 mb8"><div class="tebal tx-sm" style="color:var(--amber)">' +
        '<i class="bi bi-lightning-charge-fill"></i> Jalur Cepat Super Admin (Bypass Alur)</div>' +
        '<span class="lencana emas">Hak Istimewa</span></div>' +
        '<div class="tx-sm mb12" style="color:rgba(255,255,255,.6);line-height:1.6">' +
        'Langsung sahkan seluruh jenjang tanpa menunggu verifikasi bertingkat. Gunakan khusus saat ' +
        'rapat pimpinan darurat atau tenggat pelaporan PDDikti.</div>' +
        '<button class="btn btn-utama btn-blok" onclick="prosesVerif(\'BYPASS\')">' +
        '<i class="bi bi-fast-forward-fill"></i> Bypass &amp; Sahkan Seluruh Jenjang</button></div>';
    }
    kanan += '</div>';
  }

  bukaModal({
    lebar: true,
    judul: 'Verifikasi Pengajuan: ' + (dosen ? 'Insentif Karya Ilmiah' : 'Keringanan UKT & Asrama'),
    sub: rec.noRef + ' · Tahap ' + tahap + ' dari ' + alur.length + ' · Diajukan ' + umurTeks(rec.tanggal),
    isi: '<div class="verif-grid"><div>' + kiri + '</div><div>' + kanan + '</div></div>',
    kaki: '<button class="btn btn-garis" onclick="tutupModal()">Tutup</button>',
    tanpaFokus: true
  });
}

function barisDok(label, isi) {
  return '<div class="dp-baris"><span class="l">' + esc(label) + '</span>' +
         '<span>: <b>' + esc(isi || '-') + '</b></span></div>';
}

function miniInfo(label, isi) {
  return '<div style="background:var(--surface-2);border-radius:var(--r-md);padding:9px 11px">' +
    '<div class="label-kecil" style="font-size:9.5px">' + esc(label) + '</div>' +
    '<div class="tx-sm mono mt4 putus">' + esc(isi || '—') + '</div></div>';
}

function catatanCepat(teks) {
  return '<button type="button" class="chip-nomor" style="font-family:var(--font);cursor:pointer;border:none" ' +
    'onclick="tambahCatatan(\'' + esc(teks).replace(/'/g, '') + '\')">+ ' + esc(teks) + '</button>';
}

function tambahCatatan(teks) {
  var t = el('vfCatatan');
  if (!t) return;
  t.value = (t.value ? t.value.replace(/\.?\s*$/, '. ') : '') + teks + '.';
  t.focus();
  el('vfHitung').textContent = t.value.length;
}

function parseAman(s, bawaan) {
  try {
    if (!s) return bawaan;
    if (typeof s === 'object') return s;
    return JSON.parse(s);
  } catch (e) { return bawaan; }
}

/* ── Eksekusi aksi verifikasi ───────────────────────────────────── */
function prosesVerif(aksi) {
  var rec = Verif.rec;
  if (!rec) return;
  var catatan = el('vfCatatan') ? ambilNilai('vfCatatan') : '';

  if ((aksi === 'TOLAK' || aksi === 'REVISI') && catatan.length < 5) {
    toast('Catatan wajib diisi untuk aksi ' + (aksi === 'TOLAK' ? 'penolakan' : 'permintaan revisi') + '.',
          'peringatan');
    if (el('vfCatatan')) el('vfCatatan').focus();
    return;
  }

  var pesan = {
    SETUJUI: 'Pengajuan akan disetujui pada jenjang ini dan diteruskan sesuai alur verifikasi. ' +
             'Notifikasi otomatis dikirim ke pemohon.',
    TOLAK: 'Pengajuan akan <b>ditolak permanen</b> dan pemohon menerima notifikasi berisi catatan Anda.',
    REVISI: 'Pemohon akan diminta memperbaiki berkas sesuai catatan yang Anda tuliskan.',
    BYPASS: 'Seluruh jenjang verifikasi akan disahkan sekaligus atas nama Anda sebagai Super Admin. ' +
            'Tindakan ini tercatat permanen pada log audit.'
  }[aksi];

  konfirmasi({
    judul: { SETUJUI: 'Setujui Pengajuan', TOLAK: 'Tolak Pengajuan',
             REVISI: 'Minta Revisi Berkas', BYPASS: 'Bypass Seluruh Jenjang' }[aksi],
    pesan: pesan,
    bahaya: aksi === 'TOLAK',
    ya: { SETUJUI: 'Ya, Setujui', TOLAK: 'Ya, Tolak', REVISI: 'Kirim Permintaan Revisi',
          BYPASS: 'Ya, Sahkan Semua' }[aksi]
  }).then(function (ya) {
    if (!ya) return;
    toast('Memproses verifikasi…', 'info', 2000);

    kirim('prosesVerifikasi', {
      jenis: Verif.jenis, id: rec.id, aksi: aksi, catatan: catatan
    }).then(function (r) {
      if (!r.success) { toast(r.message, 'galat'); return; }
      tutupModal();
      toast(r.message, 'sukses');

      var kunci = Verif.jenis === 'dosen' ? 'pengajuanDosen' : 'pengajuanMhs';
      segarkanModul(kunci).then(function () {
        kirim('hitungDashboard', {}).then(function (d) {
          if (d.success) Adm.boot.dashboard = d.data;
          renderSidebar();
        });
      });
    });
  });
}

function terbitkanSKet(tanpaDokumen) {
  var rec = Verif.rec;
  if (!rec) return;

  konfirmasi({
    judul: tanpaDokumen ? 'Kirim Notifikasi Resmi' : 'Terbitkan Surat Keterangan',
    pesan: tanpaDokumen
      ? 'Pemohon akan menerima notifikasi resmi bahwa pengajuannya disetujui, tanpa lampiran dokumen.'
      : 'Nomor Surat Keterangan akan dikunci, dokumen PDF bertanda tangan elektronik dibuat, ' +
        'diarsipkan ke Drive, dan tautannya dikirim ke pemohon.',
    ya: tanpaDokumen ? 'Ya, Kirim Notifikasi' : 'Ya, Terbitkan Sekarang'
  }).then(function (ya) {
    if (!ya) return;
    var btn = el('btnTerbitSKet');
    tombolSibuk(btn, true, 'Menerbitkan…');

    kirim('terbitkanSuratKeterangan', {
      jenis: Verif.jenis, id: rec.id,
      pejabatId: el('vfPejabat') ? ambilNilai('vfPejabat') : '',
      isi: el('vfIsi') ? ambilEditor('vfIsi') : '',
      tanpaDokumen: !!tanpaDokumen,
      qrDataUrl: buatQrDataUrl(rec.noRef)
    }, APP.batasWaktuUnggah).then(function (r) {
      tombolSibuk(btn, false);
      if (!r.success) { toast(r.message, 'galat'); return; }
      tutupModal();
      toast(r.message, 'sukses');

      var kunci = Verif.jenis === 'dosen' ? 'pengajuanDosen' : 'pengajuanMhs';
      segarkanModul(kunci);
    });
  });
}
