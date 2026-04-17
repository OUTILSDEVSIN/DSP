// ===== DARK MODE TOGGLE =====
function toggleDarkMode() {
  var isDark = document.body.classList.toggle('dark-mode');
  safeLocal.setItem('dispatchis_dark_mode', isDark ? '1' : '0');
  document.getElementById('dark-toggle-btn').textContent = isDark ? '☀️' : '🌙';
}
function initDarkMode() {
  var saved = safeLocal.getItem('dispatchis_dark_mode');
  if (saved === '1') {
    document.body.classList.add('dark-mode');
    var btn = document.getElementById('dark-toggle-btn');
    if (btn) btn.textContent = '☀️';
  }
}