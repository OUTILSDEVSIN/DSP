/* utils.js — Dispatchis v2.5.58 — Utilitaires : dark mode, safe storage */

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
  // ===== FIN DARK MODE =====

  // ===== SAFE STORAGE (Edge Tracking Prevention) =====
  var safeSession = {
    getItem: function(k) { try { return sessionStorage.getItem(k); } catch(e) { return null; } },
    setItem: function(k, v) { try { sessionStorage.setItem(k, v); } catch(e) {} },
    removeItem: function(k) { try { sessionStorage.removeItem(k); } catch(e) {} },
    clear: function() { try { safeSession.clear(); } catch(e) {} }
  };
  var safeLocal = {
    getItem: function(k) { try { return localStorage.getItem(k); } catch(e) { return null; } },
    setItem: function(k, v) { try { localStorage.setItem(k, v); } catch(e) {} },
    removeItem: function(k) { try { localStorage.removeItem(k); } catch(e) {} }
  };
  // ===== FIN SAFE STORAGE =====