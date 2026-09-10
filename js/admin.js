// ============================================================
// STATE
// ============================================================
let kategoriListAdmin = [];
let vendorListAdmin = [];
let produkListAdmin = [];
let hargaProdukIdAktif = null;

// ============================================================
// GUARD & INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  if (!Session_.token) { window.location.href = 'index.html'; return; }
  if (Session_.role !== 'admin') { window.location.href = 'app.html'; return; }

  document.getElementById('userNama').textContent = Session_.nama;
  document.getElementById('bmTanggal').value = new Date().toISOString().slice(0, 10);
  document.getElementById('lapDari').value = new Date().toISOString().slice(0, 10);
  document.getElementById('lapSampai').value = new Date().toISOString().slice(0, 10);

  bindEvents();
  loadMasterData().then(() => {
    switchTab('dashboard');
  });
});

async function loadMasterData() {
  try {
    const [kat, ven] = await Promise.all([apiGet('getKategori'), apiGet('getPedagangList')]);
    kategoriListAdmin = kat.data;
    vendorListAdmin = ven.data;
  } catch (e) { /* noop */ }
}

function bindEvents() {
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await apiPost('logout', {}).catch(() => {});
    Session_.clear();
    window.location.href = 'index.html';
  });

  document.querySelectorAll('#tabsStrip .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('btnTambahPedagang').addEventListener('click', () => openFormPedagang(null));
  document.getElementById('btnTambahProduk').addEventListener('click', () => openFormProduk(null));
  document.getElementById('btnTambahKas').addEventListener('click', openFormKas);
  document.getElementById('hargaProdukSelect').addEventListener('change', onHargaProdukChange);
  document.getElementById('hHargaJual').addEventListener('input', recalcBagianSekolah);
  document.getElementById('hHakPedagang').addEventListener('input', recalcBagianSekolah);
  document.getElementById('btnSimpanHarga').addEventListener('click', handleSimpanHarga);
  document.getElementById('btnSimpanBarangMasuk').addEventListener('click', handleSimpanBarangMasuk);
  document.getElementById('bmProdukSelect').addEventListener('change', updateBmInfo);
  document.getElementById('btnLihatLaporan').addEventListener('click', refreshLaporan);

  document.getElementById('btnCloseModalForm').addEventListener('click', closeModalForm);
  document.getElementById('btnBatalModalForm').addEventListener('click', closeModalForm);
}

const TAB_LOADERS = {
  dashboard: refreshDashboard,
  pedagang: refreshPedagang,
  produk: refreshProduk,
  harga: refreshHargaTab,
  barangmasuk: refreshBarangMasukTab,
  laporan: refreshLaporan,
  kas: refreshKas,
  riwayat: refreshAudit
};

const TAB_ELEMENT_IDS = {
  dashboard: 'tabDashboard',
  pedagang: 'tabPedagang',
  produk: 'tabProduk',
  harga: 'tabHarga',
  barangmasuk: 'tabBarangMasuk',
  laporan: 'tabLaporan',
  kas: 'tabKas',
  riwayat: 'tabRiwayatPerubahan'
};

function switchTab(tab) {
  document.querySelectorAll('#tabsStrip .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  Object.keys(TAB_ELEMENT_IDS).forEach(key => {
    const el = document.getElementById(TAB_ELEMENT_IDS[key]);
    if (el) el.classList.toggle('hidden', key !== tab);
  });
  if (TAB_LOADERS[tab]) TAB_LOADERS[tab]();
}

// ============================================================
// DASHBOARD
// ============================================================
async function refreshDashboard() {
  try {
    const res = await apiGet('getDashboardAdmin');
    const d = res.data;
    document.getElementById('dOmsetSemua').textContent = formatRupiah(d.total_omset_semua);
    document.getElementById('dOmsetHariIni').textContent = formatRupiah(d.omset_hari_ini);
    document.getElementById('dProdukAktif').textContent = d.produk_aktif;
    document.getElementById('dVendorAktif').textContent = d.vendor_aktif;
    document.getElementById('dStokMenipis').textContent = d.stok_menipis;
    document.getElementById('dStokHabis').textContent = d.stok_habis;
    document.getElementById('dRekonSelisih').textContent = d.rekon_selisih;
    document.getElementById('dItemSemua').textContent = d.total_item_semua;

    const body = document.getElementById('dSesiBody');
    body.innerHTML = d.sesi_terbaru.length ? d.sesi_terbaru.map(s => `
      <tr>
        <td>${formatTanggalIndoShort(s.tanggal)}</td>
        <td><span class="pill ${s.status === 'Selesai' ? 'aktif' : 'nonaktif'}">${s.status}</span></td>
        <td>${s.total_item} pcs</td>
        <td>${formatRupiah(s.total_sistem)}</td>
      </tr>`).join('') : emptyRow(4, 'Belum ada sesi.');
  } catch (e) { /* noop */ }
}

// ============================================================
// PEDAGANG
// ============================================================
async function refreshPedagang() {
  try {
    const res = await apiGet('getPedagangList');
    vendorListAdmin = res.data;
    const body = document.getElementById('pedagangBody');
    body.innerHTML = vendorListAdmin.length ? vendorListAdmin.map(v => `
      <tr>
        <td>${escapeHtmlA(v.nama_pedagang)}</td>
        <td><span class="pill ${v.status === 'Aktif' ? 'aktif' : 'nonaktif'}">${v.status}</span></td>
        <td>${v.jumlah_produk}</td>
        <td>
          <button class="link-btn" onclick='openFormPedagang(${JSON.stringify(v)})'>Edit</button>
          ${v.status === 'Aktif'
            ? `<button class="link-btn" style="color:var(--error)" onclick="toggleStatusPedagang('${v.id}','Nonaktif')">Nonaktifkan</button>`
            : `<button class="link-btn" onclick="toggleStatusPedagang('${v.id}','Aktif')">Aktifkan</button>`}
        </td>
      </tr>`).join('') : emptyRow(4, 'Belum ada pedagang.');
  } catch (e) { /* noop */ }
}

function openFormPedagang(vendor) {
  openFormModal({
    title: vendor ? 'Edit Pedagang' : 'Tambah Pedagang',
    fields: [{ key: 'nama_pedagang', label: 'Nama Pedagang', type: 'text', value: vendor ? vendor.nama_pedagang : '' }],
    onSubmit: async (values) => {
      await apiPost('simpanPedagang', Object.assign({ id: vendor ? vendor.id : undefined }, values));
      showToast('Pedagang tersimpan.');
      closeModalForm();
      refreshPedagang();
    }
  });
}

async function toggleStatusPedagang(id, status) {
  const vendor = vendorListAdmin.find(v => v.id === id);
  try {
    await apiPost('simpanPedagang', { id: id, nama_pedagang: vendor.nama_pedagang, status: status });
    showToast(status === 'Aktif' ? 'Pedagang diaktifkan.' : 'Pedagang dinonaktifkan.');
    refreshPedagang();
  } catch (e) { /* noop */ }
}

// ============================================================
// PRODUK
// ============================================================
async function refreshProduk() {
  try {
    const res = await apiGet('getProdukAdminList');
    produkListAdmin = res.data;
    const body = document.getElementById('produkBody');
    body.innerHTML = produkListAdmin.length ? produkListAdmin.map(p => `
      <tr>
        <td>${escapeHtmlA(p.nama_produk)}</td>
        <td>${escapeHtmlA(p.kategori_nama)}</td>
        <td>${p.pemilik_type === 'pedagang' ? escapeHtmlA(p.vendor_nama) : 'Sekolah'}</td>
        <td>${formatRupiah(p.harga_jual)}</td>
        <td>${p.stok}</td>
        <td><span class="pill ${p.status === 'Aktif' ? 'aktif' : 'nonaktif'}">${p.status}</span></td>
        <td>
          <button class="link-btn" onclick='openFormProduk(${JSON.stringify(p)})'>Edit</button>
          ${p.status === 'Aktif'
            ? `<button class="link-btn" style="color:var(--error)" onclick="toggleStatusProduk('${p.id}','Nonaktif')">Nonaktifkan</button>`
            : `<button class="link-btn" onclick="toggleStatusProduk('${p.id}','Aktif')">Aktifkan</button>`}
        </td>
      </tr>`).join('') : emptyRow(7, 'Belum ada produk.');
  } catch (e) { /* noop */ }
}

function openFormProduk(produk) {
  const kategoriOptions = kategoriListAdmin.map(k => `<option value="${k.id}" ${produk && produk.kategori_id === k.id ? 'selected' : ''}>${escapeHtmlA(k.nama)}</option>`).join('');
  const vendorOptions = vendorListAdmin.filter(v => v.status === 'Aktif').map(v => `<option value="${v.id}" ${produk && produk.vendor_id === v.id ? 'selected' : ''}>${escapeHtmlA(v.nama_pedagang)}</option>`).join('');

  openFormModal({
    title: produk ? 'Edit Produk' : 'Tambah Produk',
    customHtml: `
      <div class="form-field"><label>Nama Produk</label><input type="text" id="fNamaProduk" value="${produk ? escapeHtmlA(produk.nama_produk) : ''}"></div>
      <div class="form-field"><label>Kategori</label><select id="fKategori">${kategoriOptions}</select></div>
      <div class="form-field"><label>Pemilik</label>
        <select id="fPemilik">
          <option value="sekolah" ${produk && produk.pemilik_type === 'sekolah' ? 'selected' : ''}>Sekolah</option>
          <option value="pedagang" ${produk && produk.pemilik_type === 'pedagang' ? 'selected' : ''}>Titipan Pedagang</option>
        </select>
      </div>
      <div class="form-field" id="fVendorWrap"><label>Pedagang</label><select id="fVendor">${vendorOptions}</select></div>
    `,
    onSubmit: async () => {
      const pemilik = document.getElementById('fPemilik').value;
      await apiPost('simpanProduk', {
        id: produk ? produk.id : undefined,
        nama_produk: document.getElementById('fNamaProduk').value.trim(),
        kategori_id: document.getElementById('fKategori').value,
        pemilik_type: pemilik,
        vendor_id: pemilik === 'pedagang' ? document.getElementById('fVendor').value : ''
      });
      showToast('Produk tersimpan.');
      closeModalForm();
      refreshProduk();
    }
  });

  const togglePemilik = () => {
    document.getElementById('fVendorWrap').classList.toggle('hidden', document.getElementById('fPemilik').value !== 'pedagang');
  };
  document.getElementById('fPemilik').addEventListener('change', togglePemilik);
  togglePemilik();
}

async function toggleStatusProduk(id, status) {
  const p = produkListAdmin.find(x => x.id === id);
  try {
    await apiPost('simpanProduk', {
      id: id, nama_produk: p.nama_produk, kategori_id: p.kategori_id,
      pemilik_type: p.pemilik_type, vendor_id: p.vendor_id, status: status
    });
    showToast(status === 'Aktif' ? 'Produk diaktifkan.' : 'Produk dinonaktifkan.');
    refreshProduk();
  } catch (e) { /* noop */ }
}

// ============================================================
// HARGA & BAGI HASIL
// ============================================================
async function refreshHargaTab() {
  if (!produkListAdmin.length) await refreshProdukSilent();
  const select = document.getElementById('hargaProdukSelect');
  select.innerHTML = '<option value="">— pilih produk —</option>' +
    produkListAdmin.map(p => `<option value="${p.id}">${escapeHtmlA(p.nama_produk)}</option>`).join('');
  document.getElementById('hargaFormBox').classList.add('hidden');
  document.getElementById('hargaHistoryBody').innerHTML = emptyRow(5, 'Pilih produk untuk melihat riwayat harga.');
}

async function refreshProdukSilent() {
  try { const res = await apiGet('getProdukAdminList'); produkListAdmin = res.data; } catch (e) {}
}

async function onHargaProdukChange() {
  const productId = document.getElementById('hargaProdukSelect').value;
  hargaProdukIdAktif = productId;
  if (!productId) { document.getElementById('hargaFormBox').classList.add('hidden'); return; }

  document.getElementById('hargaFormBox').classList.remove('hidden');
  document.getElementById('hHargaJual').value = '';
  document.getElementById('hHakPedagang').value = 0;
  document.getElementById('hBagianSekolah').value = '';

  try {
    const res = await apiGet('getHargaByProduk', { product_id: productId });
    const body = document.getElementById('hargaHistoryBody');
    body.innerHTML = res.data.length ? res.data.map(h => `
      <tr>
        <td>${formatRupiah(h.harga_jual)}</td>
        <td>${formatRupiah(h.hak_pedagang)}</td>
        <td>${formatRupiah(h.bagian_sekolah)}</td>
        <td>${formatTanggalIndoShort(h.berlaku_mulai)}</td>
        <td><span class="pill ${h.status === 'Aktif' ? 'aktif' : 'nonaktif'}">${h.status}</span></td>
      </tr>`).join('') : emptyRow(5, 'Belum ada harga untuk produk ini.');
  } catch (e) { /* noop */ }
}

function recalcBagianSekolah() {
  const harga = Number(document.getElementById('hHargaJual').value) || 0;
  const hak = Number(document.getElementById('hHakPedagang').value) || 0;
  document.getElementById('hBagianSekolah').value = Math.max(0, harga - hak);
}

async function handleSimpanHarga() {
  if (!hargaProdukIdAktif) return;
  const hargaJual = Number(document.getElementById('hHargaJual').value);
  const hakPedagang = Number(document.getElementById('hHakPedagang').value) || 0;
  const bagianSekolah = Number(document.getElementById('hBagianSekolah').value);
  if (!hargaJual) { showToast('Isi harga jual terlebih dahulu.', 'error'); return; }

  try {
    await apiPost('simpanHarga', {
      product_id: hargaProdukIdAktif, harga_jual: hargaJual,
      hak_pedagang: hakPedagang, bagian_sekolah: bagianSekolah
    });
    showToast('Harga baru tersimpan.');
    onHargaProdukChange();
    refreshProdukSilent();
  } catch (e) { /* noop */ }
}

// ============================================================
// BARANG MASUK
// ============================================================
async function refreshBarangMasukTab() {
  if (!produkListAdmin.length) await refreshProdukSilent();
  const select = document.getElementById('bmProdukSelect');
  select.innerHTML = produkListAdmin.filter(p => p.status === 'Aktif')
    .map(p => `<option value="${p.id}">${escapeHtmlA(p.nama_produk)} (stok saat ini: ${p.stok})</option>`).join('');
  updateBmInfo();
}

function updateBmInfo() {
  const id = document.getElementById('bmProdukSelect').value;
  const p = produkListAdmin.find(x => x.id === id);
  document.getElementById('bmInfo').textContent = p
    ? `Pemilik: ${p.pemilik_type === 'pedagang' ? p.vendor_nama : 'Sekolah'} · Stok saat ini: ${p.stok}`
    : '';
}

async function handleSimpanBarangMasuk() {
  const productId = document.getElementById('bmProdukSelect').value;
  const jumlah = Number(document.getElementById('bmJumlah').value);
  const tanggal = document.getElementById('bmTanggal').value;
  const p = produkListAdmin.find(x => x.id === productId);
  if (!productId || !jumlah || jumlah <= 0) { showToast('Pilih produk dan isi jumlah yang valid.', 'error'); return; }

  try {
    await apiPost('catatBarangMasuk', {
      tanggal: tanggal,
      items: [{ product_id: productId, owner_type: p.pemilik_type, vendor_id: p.vendor_id, jumlah: jumlah }]
    });
    showToast('Barang masuk tersimpan.');
    document.getElementById('bmJumlah').value = '';
    refreshProdukSilent().then(refreshBarangMasukTab);
  } catch (e) { /* noop */ }
}

// ============================================================
// LAPORAN
// ============================================================
async function refreshLaporan() {
  const dari = document.getElementById('lapDari').value;
  const sampai = document.getElementById('lapSampai').value;
  try {
    const res = await apiGet('getLaporanPenjualan', { dari, sampai });
    const d = res.data;
    document.getElementById('lapTotalOmset').textContent = formatRupiah(d.total_omset);
    document.getElementById('lapTotalItem').textContent = d.total_item;
    document.getElementById('lapHakPedagang').textContent = formatRupiah(d.total_hak_pedagang);
    document.getElementById('lapBagianSekolah').textContent = formatRupiah(d.total_bagian_sekolah);

    document.getElementById('lapHarianBody').innerHTML = d.per_hari.length ? d.per_hari.map(h => `
      <tr><td>${formatTanggalIndoShort(h.tanggal)}</td><td>${h.item} pcs</td><td>${formatRupiah(h.omset)}</td></tr>`).join('')
      : emptyRow(3, 'Tidak ada transaksi di rentang ini.');

    document.getElementById('lapProdukBody').innerHTML = d.per_produk.length ? d.per_produk.map(p => `
      <tr><td>${escapeHtmlA(p.nama_produk)}</td><td>${p.item} pcs</td><td>${formatRupiah(p.omset)}</td></tr>`).join('')
      : emptyRow(3, 'Tidak ada transaksi di rentang ini.');
  } catch (e) { /* noop */ }
}

// ============================================================
// KAS
// ============================================================
async function refreshKas() {
  try {
    const res = await apiGet('getKasList');
    document.getElementById('kasSaldoAkhir').textContent = formatRupiah(res.data.saldo_akhir);
    const body = document.getElementById('kasBody');
    body.innerHTML = res.data.rows.length ? res.data.rows.map(r => `
      <tr>
        <td>${formatTanggalIndoShort(r.tanggal)}</td>
        <td>${escapeHtmlA(r.jenis)}</td>
        <td>${escapeHtmlA(r.keterangan)}</td>
        <td style="color:var(--status-available)">${r.masuk ? formatRupiah(r.masuk) : '-'}</td>
        <td style="color:var(--error)">${r.keluar ? formatRupiah(r.keluar) : '-'}</td>
        <td><strong>${formatRupiah(r.saldo_berjalan)}</strong></td>
      </tr>`).join('') : emptyRow(6, 'Belum ada transaksi kas.');
  } catch (e) { /* noop */ }
}

function openFormKas() {
  openFormModal({
    title: 'Catat Kas Manual',
    customHtml: `
      <div class="form-field"><label>Keterangan</label><input type="text" id="fKasKeterangan" placeholder="mis. Beli galon air, Setoran ke bendahara"></div>
      <div class="form-row-2">
        <div class="form-field"><label>Kas Masuk (Rp)</label><input type="number" id="fKasMasuk" value="0"></div>
        <div class="form-field"><label>Kas Keluar (Rp)</label><input type="number" id="fKasKeluar" value="0"></div>
      </div>
      <p class="helper-text">Isi salah satu saja — Kas Masuk untuk uang diterima, Kas Keluar untuk pengeluaran.</p>
    `,
    onSubmit: async () => {
      await apiPost('catatKasManual', {
        keterangan: document.getElementById('fKasKeterangan').value.trim(),
        masuk: Number(document.getElementById('fKasMasuk').value) || 0,
        keluar: Number(document.getElementById('fKasKeluar').value) || 0
      });
      showToast('Kas manual tersimpan.');
      closeModalForm();
      refreshKas();
    }
  });
}

// ============================================================
// RIWAYAT PERUBAHAN (AUDIT LOG)
// ============================================================
async function refreshAudit() {
  try {
    const res = await apiGet('getAuditLog', { limit: 150 });
    const body = document.getElementById('auditBody');
    body.innerHTML = res.data.length ? res.data.map(l => `
      <tr>
        <td>${new Date(l.timestamp).toLocaleString('id-ID')}</td>
        <td>${escapeHtmlA(l.user_nama)}</td>
        <td>${escapeHtmlA(l.action)}</td>
        <td>${escapeHtmlA(l.module)}</td>
        <td>${escapeHtmlA(l.reason || '-')}</td>
      </tr>`).join('') : emptyRow(5, 'Belum ada riwayat perubahan.');
  } catch (e) { /* noop */ }
}

// ============================================================
// MODAL FORM GENERIK
// ============================================================
let currentFormSubmit = null;

function openFormModal({ title, fields, customHtml, onSubmit }) {
  document.getElementById('modalFormTitle').textContent = title;
  const body = document.getElementById('modalFormBody');

  if (customHtml) {
    body.innerHTML = customHtml;
  } else {
    body.innerHTML = (fields || []).map(f => `
      <div class="form-field">
        <label>${escapeHtmlA(f.label)}</label>
        <input type="${f.type || 'text'}" id="genField_${f.key}" value="${f.value !== undefined ? escapeHtmlA(f.value) : ''}">
      </div>`).join('');
  }

  currentFormSubmit = async () => {
    if (fields && !customHtml) {
      const values = {};
      fields.forEach(f => { values[f.key] = document.getElementById('genField_' + f.key).value.trim(); });
      await onSubmit(values);
    } else {
      await onSubmit();
    }
  };

  document.getElementById('btnSimpanModalForm').onclick = async () => {
    const btn = document.getElementById('btnSimpanModalForm');
    btn.disabled = true;
    try { await currentFormSubmit(); } catch (e) { /* toast sudah tampil */ }
    btn.disabled = false;
  };

  document.getElementById('modalForm').classList.remove('hidden');
}

function closeModalForm() {
  document.getElementById('modalForm').classList.add('hidden');
}

// ============================================================
// UTIL
// ============================================================
function emptyRow(colspan, text) {
  return `<tr class="empty-row"><td colspan="${colspan}">${text}</td></tr>`;
}

function formatTanggalIndoShort(iso) {
  if (!iso) return '-';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtmlA(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
