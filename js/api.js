// ============================================================
// API HELPERS — komunikasi ke GAS backend (fetch, bukan google.script.run)
// ============================================================

const Session_ = {
  get token() { return localStorage.getItem('gig4_token') || ''; },
  set token(v) { v ? localStorage.setItem('gig4_token', v) : localStorage.removeItem('gig4_token'); },
  get nama() { return localStorage.getItem('gig4_nama') || ''; },
  set nama(v) { v ? localStorage.setItem('gig4_nama', v) : localStorage.removeItem('gig4_nama'); },
  get role() { return localStorage.getItem('gig4_role') || ''; },
  set role(v) { v ? localStorage.setItem('gig4_role', v) : localStorage.removeItem('gig4_role'); },
  clear() { localStorage.removeItem('gig4_token'); localStorage.removeItem('gig4_nama'); localStorage.removeItem('gig4_role'); }
};

async function apiGet(action, extraParams) {
  const params = new URLSearchParams(Object.assign({ action, token: Session_.token }, extraParams || {}));
  try {
    const res = await fetch(`${GAS_URL}?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Terjadi kesalahan.');
    return json;
  } catch (err) {
    handleApiError(err);
    throw err;
  }
}

async function apiPost(action, data) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      // WAJIB text/plain — mencegah CORS preflight yang diblok GAS
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data: Object.assign({ token: Session_.token }, data || {}) })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Terjadi kesalahan.');
    return json;
  } catch (err) {
    handleApiError(err);
    throw err;
  }
}

function handleApiError(err) {
  const pesan = (err && err.message) || 'Tidak dapat terhubung ke server.';
  if (pesan.includes('Sesi') || pesan.includes('Token')) {
    Session_.clear();
    showToast(pesan, 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    return;
  }
  showToast(pesan, 'error');
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatRupiah(angka) {
  const n = Math.round(Number(angka) || 0);
  const sign = n < 0 ? '-' : '';
  return sign + 'Rp' + Math.abs(n).toLocaleString('id-ID');
}

// ============================================================
// CACHE-FIRST GET
// Tampilkan data lama dari localStorage secara instan (jika ada),
// sambil tetap ambil data terbaru dari server di belakang layar.
// Pemanggil WAJIB tetap menunggu `fresh` dan merender ulang saat
// selesai, supaya data yang tampil selalu benar & terkini.
// ============================================================
function apiGetCached(action, extraParams) {
  const cacheKey = 'gig4_cache_' + action + '_' + JSON.stringify(extraParams || {});
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (e) { cached = null; }

  const fresh = apiGet(action, extraParams).then(json => {
    try { localStorage.setItem(cacheKey, JSON.stringify(json)); } catch (e) { /* storage penuh/private mode, abaikan */ }
    return json;
  });

  return { cached, fresh };
}

// ============================================================
// SKELETON LOADING
// Baris placeholder abu-abu berdenyut, dipakai menggantikan tabel
// kosong selama menunggu data pertama kali (belum ada cache).
// ============================================================
function skeletonRows(cols, rows) {
  rows = rows || 3;
  const cell = '<td><div class="skeleton-bar"></div></td>';
  const row = `<tr class="skeleton-row">${cell.repeat(cols)}</tr>`;
  return row.repeat(rows);
}