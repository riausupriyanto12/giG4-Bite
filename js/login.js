document.addEventListener('DOMContentLoaded', () => {
  if (Session_.token) { window.location.href = Session_.role === 'admin' ? 'admin.html' : 'app.html'; return; }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnLogin');
    btn.disabled = true;
    btn.textContent = 'Memeriksa...';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', data: { username, password } })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      Session_.token = json.data.token;
      Session_.nama = json.data.nama;
      Session_.role = json.data.role;
      window.location.href = json.data.role === 'admin' ? 'admin.html' : 'app.html';
    } catch (err) {
      showToast(err.message || 'Login gagal.', 'error');
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });
});
