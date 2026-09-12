// ============================================================
// STATE
// ============================================================
let katalog = [];       // cache katalog produk saat ini
let kategoriList = [];
let kategoriAktif = 'all';
let searchQuery = '';
let sesiTerakhir = null; // hasil actionTutupTransaksi, dipakai saat simpan rekonsiliasi

// ============================================================
// GUARD & INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  if (!Session_.token) { window.location.href = 'index.html'; return; }

  document.getElementById('userNama').textContent = Session_.nama;
  document.getElementById('userRole').textContent = Session_.role === 'admin' ? 'Admin' : 'Petugas Kantin';

  bindEvents();
  refreshHalamanTransaksi();
});

async function refreshHalamanTransaksi() {
  try {
    const res = await apiGet('getHalamanTransaksi');
    applyBeranda(res.data.beranda);
    applyKategori(res.data.kategori);
    katalog = res.data.katalog;
    renderKatalog();
  } catch (e) { /* toast sudah tampil */ }
}

function bindEvents() {
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await apiPost('logout', {}).catch(() => {});
    Session_.clear();
    window.location.href = 'index.html';
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderKatalog();
  });

  document.getElementById('btnUndo').addEventListener('click', handleUndo);
  document.getElementById('btnTutup').addEventListener('click', openModalTutup);
  document.getElementById('btnCloseModal').addEventListener('click', closeModalTutup);
  document.getElementById('btnBatalModal').addEventListener('click', closeModalTutup);
  document.getElementById('btnSimpanRekon').addEventListener('click', handleSimpanRekonsiliasi);
  document.getElementById('inputUangFisik').addEventListener('input', updateRekonPreview);

  document.getElementById('btnGantiPassword').addEventListener('click', () => {
    document.getElementById('gpLama').value = '';
    document.getElementById('gpBaru').value = '';
    document.getElementById('gpKonfirmasi').value = '';
    document.getElementById('modalGantiPassword').classList.remove('hidden');
  });
  document.getElementById('btnCloseGantiPassword').addEventListener('click', closeGantiPassword);
  document.getElementById('btnBatalGantiPassword').addEventListener('click', closeGantiPassword);
  document.getElementById('btnSimpanGantiPassword').addEventListener('click', handleGantiPassword);
}

function closeGantiPassword() {
  document.getElementById('modalGantiPassword').classList.add('hidden');
}

async function handleGantiPassword() {
  const lama = document.getElementById('gpLama').value;
  const baru = document.getElementById('gpBaru').value;
  const konfirmasi = document.getElementById('gpKonfirmasi').value;

  if (!lama || !baru) { showToast('Isi semua kolom.', 'error'); return; }
  if (baru.length < 6) { showToast('Password baru minimal 6 karakter.', 'error'); return; }
  if (baru !== konfirmasi) { showToast('Konfirmasi password tidak cocok.', 'error'); return; }

  const btn = document.getElementById('btnSimpanGantiPassword');
  btn.disabled = true;
  try {
    await apiPost('gantiPassword', { password_lama: lama, password_baru: baru });
    showToast('Password berhasil diganti.');
    closeGantiPassword();
  } catch (e) {
    /* toast sudah tampil */
  } finally {
    btn.disabled = false;
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('tabTransaksi').classList.toggle('hidden', tab !== 'transaksi');
  document.getElementById('tabRiwayat').classList.toggle('hidden', tab !== 'riwayat');
  if (tab === 'riwayat') refreshRiwayat();
}

// ============================================================
// BERANDA
// ============================================================
async function refreshBeranda() {
  try {
    const res = await apiGet('getBeranda');
    applyBeranda(res.data);
  } catch (e) { /* toast sudah ditampilkan oleh apiGet */ }
}

function applyBeranda(d) {
  document.getElementById('greeting').textContent = `Selamat Bertugas, ${d.petugas_nama}! 👋`;
  document.getElementById('tanggalHariIni').textContent = formatTanggalIndo(d.tanggal);
  document.getElementById('statPenjualan').textContent = formatRupiah(d.total_penjualan);
  document.getElementById('statTerjual').textContent = `${d.barang_terjual} pcs`;
  document.getElementById('statProduk').textContent = d.produk_siap_jual;
  document.getElementById('statMenipis').textContent = d.stok_menipis;
}

function formatTanggalIndo(iso) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================================
// KATEGORI
// ============================================================
async function refreshKategori() {
  try {
    const res = await apiGet('getKategori');
    applyKategori(res.data);
  } catch (e) { /* noop */ }
}

function applyKategori(list) {
  kategoriList = list;
  const strip = document.getElementById('categoryStrip');
  strip.innerHTML = '<button class="chip active" data-cat="all">Semua</button>' +
    kategoriList.map(c => `<button class="chip" data-cat="${c.id}">${escapeHtml(c.nama)}</button>`).join('');

  strip.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      kategoriAktif = chip.dataset.cat;
      strip.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
      renderKatalog();
    });
  });
}

// ============================================================
// KATALOG PRODUK
// ============================================================
async function refreshKatalog() {
  try {
    const res = await apiGet('getKatalog');
    katalog = res.data;
    renderKatalog();
  } catch (e) { /* noop */ }
}

function renderKatalog() {
  const grid = document.getElementById('productGrid');
  const filtered = katalog.filter(p => {
    const cocokKategori = kategoriAktif === 'all' || p.kategori_id === kategoriAktif;
    const cocokSearch = !searchQuery || p.nama_produk.toLowerCase().includes(searchQuery);
    return cocokKategori && cocokSearch;
  });

  document.getElementById('emptyKatalog').classList.toggle('hidden', filtered.length > 0);
  grid.innerHTML = filtered.map(cardHtml).join('');

  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => handleTap(card.dataset.id));
  });
}

function cardHtml(p) {
  const habis = p.status_stok === 'Habis';
  const badgeClass = p.status_stok === 'Tersedia' ? 'tersedia' : (p.status_stok === 'Menipis' ? 'menipis' : 'habis');
  const badgeLabel = p.status_stok === 'Tersedia' ? `Sisa ${p.stok}` : (p.status_stok === 'Menipis' ? `Menipis: ${p.stok}` : 'Habis');
  const img = p.image_url || placeholderImg(p.nama_produk);
  return `
    <button class="product-card ${habis ? 'habis' : ''}" data-id="${p.id}" ${habis ? 'disabled' : ''}>
      <div class="thumb">
        <img src="${img}" alt="${escapeHtml(p.nama_produk)}" loading="lazy">
        <span class="badge-stok ${badgeClass}">${badgeLabel}</span>
        ${habis ? '<div class="badge-habis-overlay">HABIS</div>' : ''}
      </div>
      <div class="info">
        <div class="nama">${escapeHtml(p.nama_produk)}</div>
        <div class="harga">${formatRupiah(p.harga_jual)}</div>
        <div class="foot">
          <div>
            <div class="terjual-label">Terjual</div>
            <div class="terjual-value" id="terjual-${p.id}">${p.terjual_hari_ini}</div>
          </div>
          ${!habis ? '<span class="tap-btn">＋</span>' : ''}
        </div>
      </div>
    </button>`;
}

function placeholderImg(nama) {
  const label = encodeURIComponent(nama.slice(0, 18));
  return `https://placehold.co/300x225/d1fae5/047857?text=${label}`;
}

// ============================================================
// TAP PRODUK — update kartu terkait saja (bukan full re-render)
// ============================================================
let tapLock = false;
async function handleTap(productId) {
  if (tapLock) return;
  const item = katalog.find(p => p.id === productId);
  if (!item || item.status_stok === 'Habis') return;

  tapLock = true;
  const clientEventId = `${Session_.token}-${productId}-${Date.now()}`;
  const cardEl = document.querySelector(`.product-card[data-id="${productId}"]`);
  cardEl && cardEl.classList.add('just-tapped');

  // optimistic update lokal
  item.stok -= 1;
  item.terjual_hari_ini += 1;
  updateCardInPlace(item);

  try {
    await apiPost('tapProduk', { product_id: productId, client_event_id: clientEventId });
    refreshBeranda();
  } catch (e) {
    // rollback jika gagal
    item.stok += 1;
    item.terjual_hari_ini -= 1;
    updateCardInPlace(item);
  } finally {
    tapLock = false;
    setTimeout(() => cardEl && cardEl.classList.remove('just-tapped'), 250);
  }
}

function updateCardInPlace(item) {
  if (item.stok <= 0) item.status_stok = 'Habis';
  else if (item.stok <= 5) item.status_stok = 'Menipis';
  else item.status_stok = 'Tersedia';

  const terjualEl = document.getElementById(`terjual-${item.id}`);
  if (terjualEl) terjualEl.textContent = item.terjual_hari_ini;

  // jika status stok berubah kelas (misal jadi Habis), re-render kartu itu saja
  const card = document.querySelector(`.product-card[data-id="${item.id}"]`);
  if (card) {
    const outerHtml = cardHtml(item);
    const temp = document.createElement('div');
    temp.innerHTML = outerHtml;
    const newCard = temp.firstElementChild;
    newCard.addEventListener('click', () => handleTap(item.id));
    card.replaceWith(newCard);
  }
}

// ============================================================
// BATALKAN TAP TERAKHIR
// ============================================================
async function handleUndo() {
  try {
    const res = await apiPost('batalkanTapTerakhir', {});
    showToast('Tap terakhir dibatalkan.');
    await refreshKatalog();
    await refreshBeranda();
  } catch (e) { /* toast sudah tampil */ }
}

// ============================================================
// TUTUP TRANSAKSI & REKONSILIASI
// ============================================================
async function openModalTutup() {
  try {
    const res = await apiPost('tutupTransaksi', {});
    sesiTerakhir = res.data;
    document.getElementById('modalSubtitle').textContent =
      `Sesi Istirahat • ${formatTanggalIndo(new Date().toISOString().slice(0,10))} • Petugas: ${Session_.nama}`;
    document.getElementById('ringkasanItem').textContent = `${sesiTerakhir.total_item} pcs`;
    document.getElementById('ringkasanOmset').textContent = formatRupiah(sesiTerakhir.total_sistem);
    document.getElementById('inputUangFisik').value = '';
    document.getElementById('rekonResultBox').innerHTML = '';

    const vendorBox = document.getElementById('vendorRincianList');
    if (sesiTerakhir.rincian_vendor.length === 0) {
      vendorBox.innerHTML = '<p style="font-size:12px;color:var(--slate-text-muted);">Tidak ada produk titipan pedagang terjual hari ini.</p>';
    } else {
      vendorBox.innerHTML = sesiTerakhir.rincian_vendor.map(v => `
        <div class="vendor-row">
          <span><span class="avatar">${initials(v.nama_pedagang)}</span>${escapeHtml(v.nama_pedagang)}</span>
          <strong>${formatRupiah(v.total)}</strong>
        </div>`).join('');
    }

    document.getElementById('modalTutup').classList.remove('hidden');
  } catch (e) { /* toast sudah tampil */ }
}

function closeModalTutup() {
  document.getElementById('modalTutup').classList.add('hidden');
}

function updateRekonPreview() {
  const uangFisik = Number(document.getElementById('inputUangFisik').value) || 0;
  const selisih = uangFisik - sesiTerakhir.total_sistem;
  const box = document.getElementById('rekonResultBox');
  if (!document.getElementById('inputUangFisik').value) { box.innerHTML = ''; return; }

  if (selisih === 0) {
    box.innerHTML = `<div class="rekon-result sesuai"><span>✓ SESUAI</span><span>Selisih Rp0</span></div>`;
  } else {
    box.innerHTML = `<div class="rekon-result selisih"><span>⚠ SELISIH</span><span>${formatRupiah(selisih)}</span></div>`;
  }
}

async function handleSimpanRekonsiliasi() {
  const uangFisikInput = document.getElementById('inputUangFisik');
  if (!uangFisikInput.value) { showToast('Isi jumlah uang fisik terlebih dahulu.', 'error'); return; }

  const btn = document.getElementById('btnSimpanRekon');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  try {
    await apiPost('simpanRekonsiliasi', {
      session_id: sesiTerakhir.session_id,
      uang_fisik: Number(uangFisikInput.value)
    });
    showToast('Sesi ditutup & rekonsiliasi tersimpan.');
    closeModalTutup();
    await refreshBeranda();
    await refreshKatalog();
  } catch (e) {
    /* toast sudah tampil */
  } finally {
    btn.disabled = false; btn.textContent = 'Kunci Sesi & Simpan Rekonsiliasi';
  }
}

function initials(nama) {
  return (nama || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ============================================================
// RIWAYAT
// ============================================================
async function refreshRiwayat() {
  try {
    const res = await apiGet('getRiwayat');
    const list = document.getElementById('riwayatList');
    document.getElementById('emptyRiwayat').classList.toggle('hidden', res.data.length > 0);
    list.innerHTML = res.data.map(t => `
      <div class="riwayat-item ${t.status === 'Dibatalkan' ? 'dibatalkan' : ''}">
        <div>
          <div class="nama">${escapeHtml(t.nama_produk)} ${t.quantity > 1 ? '× ' + t.quantity : ''}</div>
          <div class="waktu">${new Date(t.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="harga">${formatRupiah(t.unit_price * t.quantity)}</div>
      </div>`).join('');
  } catch (e) { /* noop */ }
}

// ============================================================
// UTIL
// ============================================================
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
