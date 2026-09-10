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
