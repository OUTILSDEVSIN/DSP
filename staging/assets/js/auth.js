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


// ===== onAuthStateChange -- gestion expiration token =====
db.auth.onAuthStateChange(function(event, session) {
  if ((event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) && currentUser) {
    safeSession.clear();
    currentUser = null;
    currentUserData = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('workspace-screen').style.display = 'none';
    document.getElementById('dproject-screen').style.display = 'none';
    showNotif('Session expirée. Veuillez vous reconnecter.', 'error');
  }
});
// ===== FIN onAuthStateChange =====


// [config.js] let currentUser = null;
// [config.js] let currentUserData = null;
// [config.js] let currentTab = 'dashboard';
// [config.js] let allDossiers = [];
// [config.js] let allUsers = [];
// [config.js] let searchQuery = '';
// [config.js] let filterGestionnaire = '';
// [config.js] let filterStatut = '';

// ===== RENOUVELLEMENT MOT DE PASSE (90j) =====
var PWD_RENEWAL_DAYS = 90;

async function checkPasswordExpiry() {
  if (!currentUserData) return;
  var lastChange = currentUserData.last_password_change;
  if (lastChange === undefined) return;
  if (!lastChange) {
    showPasswordRenewalModal(true);
    return;
  }
  var daysSince = Math.floor((Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince >= PWD_RENEWAL_DAYS) {
    showPasswordRenewalModal(false, daysSince);
  } else if (daysSince >= PWD_RENEWAL_DAYS - 7) {
    var remaining = PWD_RENEWAL_DAYS - daysSince;
    showNotif('⚠️ Votre mot de passe expire dans ' + remaining + ' jour(s). Pensez à le changer.', 'info');
  }
}

function showPasswordRenewalModal(isFirst, daysSince) {
  var existing = document.getElementById('pwd-renewal-modal');
  if (existing) return;
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'pwd-renewal-modal';
  modal.style.zIndex = '99999';
  var title = isFirst ? 'Définissez votre mot de passe' : 'Renouvellement obligatoire';
  var msg = isFirst
    ? 'Bienvenue ! Pour des raisons de sécurité, vous devez définir votre mot de passe personnel avant de continuer.'
    : 'Votre mot de passe a expiré après ' + daysSince + ' jours. Veuillez le renouveler pour continuer.';
  modal.innerHTML = '<div class="modal" style="max-width:420px;text-align:center">'
    + '<div style="font-size:48px;margin-bottom:8px">🔑</div>'
    + '<h2 style="color:var(--rose)">' + title + '</h2>'
    + '<p style="color:#666;font-size:13px;margin:12px 0 20px">' + msg + '</p>'
    + '<label class="login-label" style="text-align:left;display:block">Nouveau mot de passe</label>'
    + '<input type="password" id="renew-pwd" placeholder="Minimum 8 caractères" style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:10px;box-sizing:border-box">'
    + '<label class="login-label" style="text-align:left;display:block">Confirmer le mot de passe</label>'
    + '<input type="password" id="renew-pwd-confirm" placeholder="Répétez le mot de passe" style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:10px;box-sizing:border-box">'
    + '<div id="renew-pwd-error" style="color:#dc2626;font-size:12px;display:none;margin-bottom:8px"></div>'
    + '<button class="btn btn-primary" style="width:100%;padding:12px" onclick="doRenewPassword()">Enregistrer le nouveau mot de passe</button>'
    + (isFirst ? '' : '<button class="btn btn-secondary" style="width:100%;margin-top:8px" onclick="doLogout()">Se déconnecter</button>')
    + '</div>';
  document.body.appendChild(modal);
}

async function doRenewPassword() {
  var newPwd = document.getElementById('renew-pwd').value;
  var confirmPwd = document.getElementById('renew-pwd-confirm').value;
  var errEl = document.getElementById('renew-pwd-error');
  errEl.style.display = 'none';
  if (newPwd.length < 8) { errEl.textContent = 'Le mot de passe doit contenir au moins 8 caractères.'; errEl.style.display = 'block'; return; }
  if (newPwd !== confirmPwd) { errEl.textContent = 'Les mots de passe ne correspondent pas.'; errEl.style.display = 'block'; return; }
  var { error } = await db.auth.updateUser({ password: newPwd });
  if (error) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; return; }
  await db.from('utilisateurs').update({ last_password_change: new Date().toISOString() }).eq('email', currentUser.email);
  await auditLog('RENOUVELLEMENT_MDP', 'Mot de passe renouvelé');
  var m = document.getElementById('pwd-renewal-modal');
  if (m) m.remove();
  showNotif('Mot de passe mis à jour avec succès !', 'success');
}
// ===== FIN RENOUVELLEMENT =====

async function checkVersionSync() {
try {
  const { data, error } = await db.rpc('check_app_version', { version_live: APP_VERSION });
  if (error || !data) return;
  if (data.status === 'mismatch') {
    if (document.getElementById('version-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'version-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#e74c3c,#c0392b);color:white;text-align:center;padding:10px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px';
    banner.innerHTML = '⚠️ Nouvelle version (v' + data.version_attendue + ') disponible.'
      + '<button onclick="sessionStorage.removeItem(\"dispatchis_version\"); window.location.href = window.location.pathname + \"?v=\" + Date.now()" style="background:white;color:#e74c3c;border:none;padding:4px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px">🔄 Mettre à jour</button>'
      + '<button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,0.2);color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">✕</button>';
    document.body.prepend(banner);
  }
} catch(e) { /* silencieux */ }
}

// ===== AUTH =====

// ===== JOURNALISATION RGPD -- R4 =====
async function auditLog(action, detail = '') {
try {
  const user = currentUserData || {};
  await db.from('audit_logs').insert({
    user_email: user.email || (currentUser ? currentUser.email : 'inconnu'),
    user_role:  user.role  || 'inconnu',
    action,
    detail,
    session_id: currentUser ? currentUser.id : null
  });
} catch(e) { /* silencieux -- ne pas bloquer l'action métier */ }
}
// ===== FIN JOURNALISATION =====

// ===== LOGIN =====
async function doLogin() {
const email = document.getElementById('login-email').value.trim();
const pwd   = document.getElementById('login-password').value;
const errEl = document.getElementById('login-error');
errEl.style.display = 'none';

if (!email || !pwd) {
  errEl.textContent = 'Veuillez remplir tous les champs.';
  errEl.style.display = 'block';
  return;
}

const btn = document.querySelector('#login-screen button');
if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = '🔒 Connexion en cours…'; }

const { data, error } = await db.auth.signInWithPassword({ email, password: pwd });

if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Se connecter'; }

if (error) {
  errEl.textContent = 'Email ou mot de passe incorrect.';
  errEl.style.display = 'block';
  return;
}

currentUser = data.user;
await loadUserData();
await auditLog('CONNEXION', 'Connexion réussie');
}

async function loadUserData() {
const { data } = await db.from('utilisateurs').select('id,email,nom,prenom,role,actif,last_password_change').eq('email', currentUser.email).single();
if (!data) { showNotif('Utilisateur non trouvé dans la base.', 'error'); await db.auth.signOut(); return; }
currentUserData = data;

// Vérifier lockout d'urgence au démarrage
var _lockoutUntil = 0; try { _lockoutUntil = parseInt(safeLocal.getItem('dispatchis_emergency_lockout') || '0'); } catch(e) {}
if (_lockoutUntil && Date.now() < _lockoutUntil) {
  showLockoutScreen(); return;
} else if (_lockoutUntil) {
  safeLocal.removeItem('dispatchis_emergency_lockout');
  safeLocal.removeItem('dispatchis_emergency_time');
}

// Masquer le login, init de base
document.getElementById('login-screen').style.display = 'none';
document.getElementById('header-name').textContent = data.prenom + ' ' + data.nom;
document.getElementById('header-role').textContent = data.role.toUpperCase();
initDarkMode();
_initIdleTracking();
await loadAllUsers();
checkPasswordExpiry();

// Afficher le sélecteur d'espace
showWorkspaceSelector();
}


// ===== AUTO-LOGOUT INACTIVITÉ (1h) =====
var _idleTimer = null;
var IDLE_TIMEOUT = 60 * 60 * 1000; // 60 minutes
var _idleWarningTimer = null;
var _idleWarningShown = false;

function _resetIdleTimer() {
  clearTimeout(_idleTimer);
  clearTimeout(_idleWarningTimer);
  if (_idleWarningShown) {
    var w = document.getElementById('idle-warning-banner');
    if (w) w.remove();
    _idleWarningShown = false;
  }
  if (!currentUser) return;
  _idleWarningTimer = setTimeout(function() {
    if (!currentUser) return;
    _idleWarningShown = true;
    if (!document.getElementById('idle-warning-banner')) {
      var banner = document.createElement('div');
      banner.id = 'idle-warning-banner';
      banner.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#e67e22;color:white;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.3);';
      banner.innerHTML = '⏱️ Déconnexion automatique dans 5 minutes pour inactivité. <button onclick="_resetIdleTimer()" style="margin-left:12px;background:white;color:#e67e22;border:none;padding:4px 12px;border-radius:6px;font-weight:700;cursor:pointer;">Rester connecté</button>';
      document.body.appendChild(banner);
    }
  }, IDLE_TIMEOUT - 5 * 60 * 1000);
  _idleTimer = setTimeout(async function() {
    if (!currentUser) return;
    await auditLog('DECONNEXION_IDLE', 'Déconnexion automatique après 1h d\'inactivité');
    await db.auth.signOut();
    currentUser = null; currentUserData = null;
    var w = document.getElementById('idle-warning-banner');
    if (w) w.remove();
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('workspace-screen').style.display = 'none';
    document.getElementById('dproject-screen').style.display = 'none';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    showNotif('Session expirée après 1h d\'inactivité. Reconnectez-vous.', 'error');
  }, IDLE_TIMEOUT);
}

function _initIdleTracking() {
  ['mousemove','keydown','click','scroll','touchstart'].forEach(function(evt) {
    document.addEventListener(evt, _resetIdleTimer, true);
  });
  _resetIdleTimer();
}
// ===== FIN AUTO-LOGOUT =====

async function doLogout() {
await auditLog('DECONNEXION', 'Déconnexion utilisateur');
await db.auth.signOut();
currentUser = null; currentUserData = null;
document.getElementById('login-screen').style.display = 'flex';
document.getElementById('app-screen').style.display = 'none';
document.getElementById('workspace-screen').style.display = 'none';
document.getElementById('dproject-screen').style.display = 'none';
document.getElementById('login-email').value = '';
document.getElementById('login-password').value = '';
}

// ===== CHANGER MOT DE PASSE =====
function showChangePassword() {
const modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'pwd-modal';
modal.innerHTML = `
  <div class="modal">
    <h2>🔑 Changer mon mot de passe</h2>
    <label>Nouveau mot de passe</label>
    <input type="password" id="new-pwd" placeholder="Minimum 6 caractères">
    <label>Confirmer le mot de passe</label>
    <input type="password" id="confirm-pwd" placeholder="Répétez le mot de passe">
    <div class="modal-error" id="pwd-error"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal('pwd-modal')">Annuler</button>
      <button class="btn btn-primary" onclick="doChangePassword()">Enregistrer</button>
    </div>
  </div>`;
document.body.appendChild(modal);
}

async function doChangePassword() {
const newPwd = document.getElementById('new-pwd').value;
const confirmPwd = document.getElementById('confirm-pwd').value;
const errEl = document.getElementById('pwd-error');
errEl.style.display = 'none';
if (newPwd.length < 6) { errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.'; errEl.style.display = 'block'; return; }
if (newPwd !== confirmPwd) { errEl.textContent = 'Les mots de passe ne correspondent pas.'; errEl.style.display = 'block'; return; }
const { error } = await db.auth.updateUser({ password: newPwd });
if (error) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; return; }
closeModal('pwd-modal');
showNotif('✅ Mot de passe modifié avec succès !', 'success');
}

function closeModal(id) {
const el = document.getElementById(id);
if (el) el.remove();
}

// ===== SÉLECTEUR D'ESPACE DE TRAVAIL =====
function showWorkspaceSelector() {
  // Cacher tous les écrans
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('dproject-screen').style.display = 'none';
  // Mettre à jour le nom dans le sélecteur
  var wsUsername = document.getElementById('ws-username');
  if (wsUsername && currentUserData) {
    wsUsername.textContent = currentUserData.prenom + ' ' + currentUserData.nom;
  }
  // Afficher le sélecteur
  document.getElementById('workspace-screen').style.display = 'flex';
}

function selectWorkspace(type) {
  safeLocal.setItem('dispatchis_workspace', type);
  document.getElementById('workspace-screen').style.display = 'none';

  if (type === 'dproject') {
    document.getElementById('dproject-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    // Mettre à jour le nom dans le header Dproject
    var dpName = document.getElementById('dp-header-name');
    if (dpName && currentUserData) {
      dpName.textContent = currentUserData.prenom + ' ' + currentUserData.nom;
    }
    // Initialiser Dproject
    if (typeof dprojectInit === 'function') dprojectInit();
  } else {
    document.getElementById('app-screen').style.display = 'flex';
    document.getElementById('dproject-screen').style.display = 'none';
    checkVersionSync();
    buildTabs();
    showTab('dashboard');
    const btnReset = document.getElementById('btn-reset-header');
    if (btnReset) btnReset.style.display = ['admin','manager'].includes(currentUserData.role) ? '' : 'none';
    const btnGod = document.getElementById('btn-god-switch');
    if (btnGod && currentUser && currentUser.email === 'julien.maubon@mieuxassure.com' && currentUserData.role === 'admin') {
      btnGod.style.display = '';
    }
  }
}
// ===== FIN SÉLECTEUR D'ESPACE DE TRAVAIL =====
