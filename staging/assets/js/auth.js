// ===== SAFE STORAGE (déclaré EN PREMIER — utilisé par tout le reste) =====
const safeLocal = {
  getItem(k)    { try { return localStorage.getItem(k);   } catch(e) { return null; } },
  setItem(k, v) { try { localStorage.setItem(k, v);       } catch(e) {} },
  removeItem(k) { try { localStorage.removeItem(k);       } catch(e) {} }
};

const safeSession = {
  getItem(k)    { try { return sessionStorage.getItem(k); } catch(e) { return null; } },
  setItem(k, v) { try { sessionStorage.setItem(k, v);     } catch(e) {} },
  removeItem(k) { try { sessionStorage.removeItem(k);     } catch(e) {} }
};

// ===== DARK MODE =====
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  safeLocal.setItem('dispatchis_dark_mode', isDark ? '1' : '0');
  const btn = document.getElementById('dark-toggle-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

function initDarkMode() {
  const dark = safeLocal.getItem('dispatchis_dark_mode') === '1';
  if (dark) {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('dark-toggle-btn');
    if (btn) btn.textContent = '☀️';
  }
}

// ===== AUTH =====
// ⚠️ La table `utilisateurs` utilise id BIGINT — la liaison Auth↔Table se fait par EMAIL
async function doLogin() {
  const email    = document.getElementById('login-email')?.value?.trim().toLowerCase() || '';
  const password = document.getElementById('login-password')?.value || '';
  const btn      = document.getElementById('login-btn');
  const errDiv   = document.getElementById('login-error');

  if (errDiv) errDiv.style.display = 'none';
  if (btn)  { btn.disabled = true; btn.textContent = 'Connexion...'; }

  try {
    // 1. Auth Supabase
    const { data, error: authError } = await db.auth.signInWithPassword({ email, password });
    if (authError || !data?.user) throw authError || new Error('Auth failed');
    currentUser = data.user;

    // 2. Récup profil par EMAIL (id=bigint, pas UUID)
    const { data: userRow, error: userError } = await db
      .from('utilisateurs')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;
    if (!userRow)  throw new Error('Utilisateur introuvable dans la base');
    if (!userRow.actif) throw new Error('Compte désactivé');

    currentUserData = userRow;
    safeSession.setItem('dispatchis_uid',   currentUser.id);
    safeSession.setItem('dispatchis_email', email);

    // 3. Charger les habilitations
    if (typeof loadHabilitations === 'function') await loadHabilitations();

    _applyUserSession(userRow);
    buildTabs();
    await showTab('dashboard');
    showNotif('Connexion réussie', 'success');

  } catch (e) {
    console.error('[doLogin]', e);
    if (errDiv) {
      errDiv.textContent = e.message || 'Email ou mot de passe incorrect.';
      errDiv.style.display = 'block';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
  }
}

// Applique la session utilisateur à l'interface
function _applyUserSession(userRow) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display   = 'block';
  document.getElementById('header-name').textContent    = userRow.prenom + ' ' + userRow.nom;
  document.getElementById('header-role').textContent    = userRow.role;

  if (['admin', 'manager'].includes(userRow.role)) {
    const r = document.getElementById('btn-reset-header');
    if (r) r.style.display = 'inline-flex';
  }
  if (userRow.email === 'julien@dispatchis.fr') {
    const g = document.getElementById('btn-god-switch');
    if (g) g.style.display = 'inline-flex';
  }

  // Affiche le bandeau staging
  const banner = document.getElementById('staging-banner');
  if (banner) banner.style.display = 'block';
}

async function doLogout() {
  try { await db.auth.signOut(); } catch(e) {}
  currentUser          = null;
  currentUserData      = null;
  currentHabilitations = null;
  safeSession.removeItem('dispatchis_uid');
  safeSession.removeItem('dispatchis_email');
  location.reload();
}

async function checkSessionOnLoad() {
  initDarkMode();
  const { data } = await db.auth.getSession();
  if (!data?.session?.user) return;

  currentUser = data.session.user;
  const email = currentUser.email;

  const { data: userRow } = await db
    .from('utilisateurs')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!userRow || !userRow.actif) return;
  currentUserData = userRow;

  if (typeof loadHabilitations === 'function') await loadHabilitations();

  _applyUserSession(userRow);
  buildTabs();
  await showTab('dashboard');
}

function showChangePassword() {
  const html = `
    <div class="modal-overlay active" id="modal-change-password-overlay">
      <div class="modal">
        <div class="modal-title">🔑 Changer mon mot de passe</div>
        <div class="form-group">
          <label>Nouveau mot de passe</label>
          <input type="password" id="new-password" class="form-control" placeholder="Minimum 6 caractères">
        </div>
        <div class="form-group">
          <label>Confirmer le mot de passe</label>
          <input type="password" id="confirm-password" class="form-control" placeholder="Retapez le mot de passe">
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal('modal-change-password-overlay')">Annuler</button>
          <button class="btn btn-primary" onclick="saveNewPassword()">Enregistrer</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveNewPassword() {
  const p1 = document.getElementById('new-password')?.value || '';
  const p2 = document.getElementById('confirm-password')?.value || '';
  if (!p1 || p1.length < 6) return showNotif('Mot de passe trop court (min. 6 caractères)', 'error');
  if (p1 !== p2)             return showNotif('Les mots de passe ne correspondent pas', 'error');
  const { error } = await db.auth.updateUser({ password: p1 });
  if (error) return showNotif(error.message, 'error');
  closeModal('modal-change-password-overlay');
  showNotif('Mot de passe modifié avec succès', 'success');
}
