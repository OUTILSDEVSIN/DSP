// ===== AUTH =====

// ── SAFE STORAGE ───────────────────────────────────────────────
const safeStorage = {
  _mem: {},
  setItem(k, v) { try { localStorage.setItem(k, v); } catch { this._mem[k] = v; } },
  getItem(k)    { try { return localStorage.getItem(k); } catch { return this._mem[k] ?? null; } },
  removeItem(k) { try { localStorage.removeItem(k); } catch { delete this._mem[k]; } }
};

// ── INIT AUTH ─────────────────────────────────────────────────
async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { showLoginScreen(); return; }
  await loadCurrentUser(session.user.email);
}

async function loadCurrentUser(email) {
  const { data, error } = await db
    .from('utilisateurs')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !data) { logout(); return; }
  currentUserData = data;
  showAppShell();
  await loadAllUsers();
  buildTabs();
  showTab('dashboard');
}

// ── LOGIN ─────────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('app-container').innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-logo">📦 DSP</div>
        <h2>Connexion</h2>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="login-email" class="form-control" placeholder="votre@email.fr" autocomplete="email">
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <div style="position:relative">
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" autocomplete="current-password">
            <button type="button" onclick="togglePasswordVisibility()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray-500)">👁</button>
          </div>
        </div>
        <div class="login-error" id="login-error" style="display:none;"></div>
        <button class="btn btn-primary btn-block" onclick="doLogin()">Se connecter</button>
        <div style="text-align:center;margin-top:12px">
          <a href="#" onclick="showRgpdInfo()" style="font-size:12px;color:var(--gray-500)">RGPD &amp; Confidentialité</a>
        </div>
      </div>
    </div>`;
}

async function doLogin() {
  const email    = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const errEl    = document.getElementById('login-error');
  if (errEl) errEl.style.display = 'none';

  if (!email || !password) {
    if (errEl) { errEl.textContent = 'Email et mot de passe requis.'; errEl.style.display = 'block'; }
    return;
  }

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    if (errEl) { errEl.textContent = 'Identifiants incorrects.'; errEl.style.display = 'block'; }
    return;
  }
  await loadCurrentUser(email);
}

async function logout() {
  await db.auth.signOut();
  currentUserData = null;
  showLoginScreen();
}

// ── TOGGLE PASSWORD ─────────────────────────────────────────────
function togglePasswordVisibility() {
  const inp = document.getElementById('login-password');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── RGPD ──────────────────────────────────────────────────────────
function showRgpdInfo() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'rgpd-modal';
  modal.innerHTML = `
    <div class="modal">
      <h2 style="color:var(--navy);margin-bottom:16px">🔒 RGPD &amp; Confidentialité</h2>
      <p>Les données collectées (nom, email, dossiers) sont utilisées uniquement dans le cadre de la gestion interne des sinistres.</p>
      <p style="margin-top:8px">Conformément au RGPD, vous disposez d’un droit d’accès, de rectification et de suppression de vos données.</p>
      <p style="margin-top:8px;font-size:12px;color:#888">Contact DPO : dpo@dispatchis.fr</p>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="closeModal('rgpd-modal')">Fermer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ── SHELL APP ────────────────────────────────────────────────────────
function showAppShell() {
  const u    = currentUserData;
  const role = getEffectiveRole();
  const isAdmin = role === 'admin';

  document.getElementById('app-container').innerHTML = `
    <nav class="navbar">
      <div class="navbar-brand">📦 DSP</div>
      <div class="navbar-tools">
        <button class="btn btn-secondary btn-tool active" id="btn-tool-dispatch" onclick="switchTool('dispatch')">Dispatch</button>
        <button class="btn btn-secondary btn-tool"        id="btn-tool-dplane"   onclick="switchTool('dplane')" title="Dplane">Dplane</button>
      </div>
      <div class="navbar-user">
        <span style="font-size:13px;margin-right:8px">${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}</span>
        <span class="badge badge-info" style="font-size:10px">${escapeHtml(u.role)}</span>
        ${isAdmin ? '<button class="btn btn-warning" style="margin-left:8px;padding:4px 10px;font-size:12px" onclick="showGodSwitchMenu()">🎭</button>' : ''}
        <button class="btn btn-secondary" style="margin-left:8px" onclick="showChangePasswordModal()">Mot de passe</button>
        <button class="btn btn-danger"    style="margin-left:8px" onclick="logout()">🚨 Déconnexion</button>
      </div>
    </nav>
    <div id="tabs-container"></div>
    <div id="main-content" class="main-content"></div>
    <div id="dplane-screen" style="display:none;"></div>`;
}

// ── CHANGER MOT DE PASSE ──────────────────────────────────────────
function showChangePasswordModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'change-pwd-modal';
  modal.innerHTML = `
    <div class="modal">
      <h2 style="color:var(--navy);margin-bottom:16px">🔑 Changer le mot de passe</h2>
      <div class="form-group">
        <label>Nouveau mot de passe</label>
        <input type="password" id="new-pwd" class="form-control" placeholder="Minimum 6 caractères">
      </div>
      <div class="form-group">
        <label>Confirmer</label>
        <input type="password" id="confirm-pwd" class="form-control" placeholder="Confirmer le mot de passe">
      </div>
      <div class="modal-error" id="change-pwd-error" style="display:none;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('change-pwd-modal')">Annuler</button>
        <button class="btn btn-primary"   onclick="doChangePassword()">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doChangePassword() {
  const newPwd  = document.getElementById('new-pwd')?.value;
  const confirm = document.getElementById('confirm-pwd')?.value;
  const errEl   = document.getElementById('change-pwd-error');
  if (errEl) errEl.style.display = 'none';

  if (!newPwd || newPwd.length < 6) {
    if (errEl) { errEl.textContent = 'Minimum 6 caractères.'; errEl.style.display = 'block'; }
    return;
  }
  if (newPwd !== confirm) {
    if (errEl) { errEl.textContent = 'Les mots de passe ne correspondent pas.'; errEl.style.display = 'block'; }
    return;
  }
  const { error } = await db.auth.updateUser({ password: newPwd });
  if (error) {
    if (errEl) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; }
    return;
  }
  closeModal('change-pwd-modal');
  showNotif('✅ Mot de passe mis à jour !', 'success');
  await auditLog('CHANGEMENT_MDP', 'Mot de passe modifié');
}
