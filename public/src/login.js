// Balatro-styled login screen. Renders a credential form into #app and
// resolves with { username, password } when the player hits PLAY, or null if
// they leave it empty. Logic (the actual auth request) stays in api.js.

export function showLoginForm({ error } = {}) {
  return new Promise((resolve) => {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'login-screen';
    wrap.innerHTML = `
      <form class="login-card" autocomplete="on" novalidate>
        <div class="login-badge">★ ALL ABOARD ★</div>
        <h1 class="login-title">TrolleyGames</h1>
        <p class="login-sub">Sign in to learn the lines. New name? An account is created for you.</p>
        ${error ? `<div class="login-error" role="alert">${error}</div>` : ''}
        <label class="login-field">
          <span>Username</span>
          <input name="username" type="text" inputmode="text" autocomplete="username"
                 minlength="3" maxlength="32" placeholder="3–32 characters" required />
        </label>
        <label class="login-field">
          <span>Password</span>
          <input name="password" type="password" autocomplete="current-password"
                 minlength="6" placeholder="min 6 characters" required />
        </label>
        <button type="submit" class="login-btn">PLAY ▶</button>
      </form>
    `;
    app.appendChild(wrap);

    const form = wrap.querySelector('form');
    const usernameEl = form.username;
    usernameEl.focus();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = form.username.value.trim();
      const password = form.password.value;
      if (!username || !password) return; // let native required hints show
      const btn = form.querySelector('.login-btn');
      btn.disabled = true;
      btn.textContent = 'DEALING…';
      resolve({ username, password });
    });
  });
}
