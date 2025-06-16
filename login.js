// login.js
// Handles login form logic for TrolleyGames

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const loginScreen = document.getElementById('login-screen');
  const mainContent = document.getElementById('main-content');

  // If already logged in, skip login
  if (localStorage.getItem('tg_logged_in') === 'true') {
    loginScreen.style.display = 'none';
    mainContent.style.display = '';
    return;
  }

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (username && password) {
      // Send login request to backend
      try {
        const res = await fetch('http://localhost:3001/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('tg_logged_in', 'true');
          loginScreen.style.display = 'none';
          mainContent.style.display = '';
        } else {
          alert(data.error || 'Login failed.');
        }
      } catch (err) {
        alert('Server error.');
      }
    } else {
      alert('Please enter both username and password.');
    }
  });
});
