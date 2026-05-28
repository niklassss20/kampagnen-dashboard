let isLogin = true;

function toggleAuthMode() {
  isLogin = !isLogin;
  document.getElementById('auth-title').textContent = isLogin ? 'Anmelden' : 'Registrieren';
  document.getElementById('auth-subtitle').textContent = isLogin
    ? 'Melde dich an, um dein Dashboard zu sehen.'
    : 'Erstelle ein Konto, um loszulegen.';
  document.getElementById('auth-btn').textContent = isLogin ? 'Anmelden' : 'Registrieren';
  document.getElementById('toggle-text').textContent = isLogin ? 'Noch kein Konto?' : 'Bereits registriert?';
  document.getElementById('toggle-link').textContent = isLogin ? 'Registrieren' : 'Anmelden';
  document.getElementById('error-msg').textContent = '';
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-msg');
  const btn = document.getElementById('auth-btn');

  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Laden...';

  try {
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Fehler aufgetreten';
      return;
    }

    window.location.href = '/dashboard';
  } catch (err) {
    errorEl.textContent = 'Verbindung fehlgeschlagen';
  } finally {
    btn.disabled = false;
    btn.textContent = isLogin ? 'Anmelden' : 'Registrieren';
  }
});

(async () => {
  try {
    const res = await fetch('/api/me');
    if (res.ok) window.location.href = '/dashboard';
  } catch (e) {}
})();
