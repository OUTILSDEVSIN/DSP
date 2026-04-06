// ===== GESTION UTILISATEURS (ADMIN) =====

// ── CHARGEMENT GLOBAL ───────────────────────────────────────────────────────
async function loadAllUsers() {
  const { data, error } = await db.from('utilisateurs')
    .select('id,email,nom,prenom,role,actif,niveau')
    .order('nom', { ascending: true });
  if (!error && data) allUsers = data;
}

// ── RENDU ÉCRAN ADMIN ───────────────────────────────────────────────────────
async function renderAdminUsers() {
  const container = document.getElementById('main-content');
  if (!container) return;

  await loadAllUsers();

  const isAdmin = currentUserData && currentUserData.role === 'admin';
  const isManager = currentUserData && ['admin', 'manager'].includes(currentUserData.role);
  if (!isManager) {
    container.innerHTML = '<div style="padding:32px;color:#dc2626;font-weight:600;">⛔ Accès réservé aux administrateurs.</div>';
    return;
  }

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:800;color:var(--navy);margin:0;">👥 Gestion des utilisateurs</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="text" id="admin-user-search" placeholder="Rechercher…"
          oninput="filterAdminUsers()"
          style="padding:7px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;min-width:200px;">
        ${isAdmin ? '<button class="btn btn-primary" style="font-size:13px;" onclick="showAddUserModal()">➕ Ajouter</button>' : ''}
      </div>
    </div>`;

  html += `
    <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;" id="admin-users-table">
      <thead>
        <tr style="background:var(--gray-100,#f3f4f6);">
          <th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--navy);">Nom</th>
          <th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--navy);">Email</th>
          <th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--navy);">Rôle</th>
          <th style="padding:10px 12px;text-align:center;font-weight:700;color:var(--navy);">Niveau</th>
          <th style="padding:10px 12px;text-align:center;font-weight:700;color:var(--navy);">Actif</th>
          ${isAdmin ? '<th style="padding:10px 12px;text-align:center;font-weight:700;color:var(--navy);">Actions</th>' : ''}
        </tr>
      </thead>
      <tbody id="admin-users-tbody">
      </tbody>
    </table>
    </div>`;

  container.innerHTML = html;
  renderAdminUsersRows(allUsers, isAdmin);
}

function renderAdminUsersRows(users, isAdmin) {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#aaa;">Aucun utilisateur trouvé.</td></tr>';
    return;
  }

  const roleColors = {
    admin:        { bg: '#fef3c7', color: '#92400e' },
    manager:      { bg: '#dbeafe', color: '#1e40af' },
    gestionnaire: { bg: '#f3f4f6', color: '#374151' },
    lecteur:      { bg: '#f0fdf4', color: '#166534' }
  };

  tbody.innerHTML = users.map(function(u) {
    var rc = roleColors[u.role] || { bg: '#f3f4f6', color: '#374151' };
    var roleBadge = '<span style="background:' + rc.bg + ';color:' + rc.color + ';padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">' + (u.role || '—') + '</span>';

    var niveau = u.niveau || 'normal';
    var niveauBadge;
    if (niveau === 'debutant') {
      niveauBadge = '<span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">🌱 Débutant</span>';
    } else {
      niveauBadge = '<span style="background:#f0fdf4;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">✅ Normal</span>';
    }

    var niveauCell;
    if (isAdmin && u.role === 'gestionnaire') {
      niveauCell = '<select onchange="updateNiveau(\'' + u.id + '\', this.value)" '
        + 'style="padding:4px 8px;border:1.5px solid #ddd;border-radius:7px;font-size:12px;cursor:pointer;background:white;">'
        + '<option value="normal"'   + (niveau === 'normal'   ? ' selected' : '') + '>✅ Normal</option>'
        + '<option value="debutant"' + (niveau === 'debutant' ? ' selected' : '') + '>🌱 Débutant</option>'
        + '</select>';
    } else {
      niveauCell = niveauBadge;
    }

    var actifToggle = '<button onclick="toggleUserActif(\'' + u.id + '\', ' + u.actif + ')" '
      + 'style="background:' + (u.actif ? '#dcfce7' : '#fee2e2') + ';color:' + (u.actif ? '#166534' : '#dc2626') + ';'
      + 'border:none;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;">'
      + (u.actif ? '✅ Actif' : '❌ Inactif') + '</button>';

    var actions = isAdmin
      ? '<button onclick="showEditUserModal(\'' + u.id + '\')" style="background:#eff6ff;color:#1d4ed8;border:none;border-radius:7px;padding:4px 10px;font-size:12px;cursor:pointer;margin-right:4px;">✏️</button>'
        + '<button onclick="confirmDeleteUser(\'' + u.id + '\', \'' + escHtml(u.prenom + ' ' + u.nom) + '\')" style="background:#fef2f2;color:#dc2626;border:none;border-radius:7px;padding:4px 10px;font-size:12px;cursor:pointer;">🗑️</button>'
      : '';

    return '<tr style="border-bottom:1px solid #f3f4f6;transition:background .15s;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'\'" >'
      + '<td style="padding:10px 12px;font-weight:600;">' + escHtml(u.prenom + ' ' + u.nom) + '</td>'
      + '<td style="padding:10px 12px;color:#6b7280;">' + escHtml(u.email) + '</td>'
      + '<td style="padding:10px 12px;">' + roleBadge + '</td>'
      + '<td style="padding:10px 12px;text-align:center;">' + niveauCell + '</td>'
      + '<td style="padding:10px 12px;text-align:center;">' + actifToggle + '</td>'
      + (isAdmin ? '<td style="padding:10px 12px;text-align:center;">' + actions + '</td>' : '')
      + '</tr>';
  }).join('');
}

// ── FILTRER LA LISTE ────────────────────────────────────────────────────────
function filterAdminUsers() {
  var q = (document.getElementById('admin-user-search').value || '').toLowerCase();
  var filtered = allUsers.filter(function(u) {
    return (u.prenom + ' ' + u.nom + ' ' + u.email + ' ' + u.role).toLowerCase().includes(q);
  });
  var isAdmin = currentUserData && currentUserData.role === 'admin';
  renderAdminUsersRows(filtered, isAdmin);
}

// ── TOGGLE ACTIF ────────────────────────────────────────────────────────────
async function toggleUserActif(userId, currentActif) {
  var newActif = !currentActif;
  var { error } = await db.from('utilisateurs').update({ actif: newActif }).eq('id', userId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  await auditLog('USER_ACTIF_TOGGLE', 'Utilisateur ' + userId + ' → actif=' + newActif);
  await loadAllUsers();
  renderAdminUsers();
  showNotif(newActif ? '✅ Utilisateur activé.' : '❌ Utilisateur désactivé.', newActif ? 'success' : 'info');
}

// ── MISE À JOUR NIVEAU ──────────────────────────────────────────────────────
async function updateNiveau(userId, niveau) {
  var { error } = await db.from('utilisateurs').update({ niveau: niveau }).eq('id', userId);
  if (error) { showNotif('Erreur mise à jour niveau : ' + error.message, 'error'); return; }
  await auditLog('USER_NIVEAU_CHANGE', 'Utilisateur ' + userId + ' → niveau=' + niveau);
  var u = allUsers.find(function(x) { return x.id === userId; });
  if (u) u.niveau = niveau;
  showNotif(niveau === 'debutant' ? '🌱 Niveau Débutant enregistré.' : '✅ Niveau Normal enregistré.', 'success');
}

// ── AJOUTER UN UTILISATEUR ──────────────────────────────────────────────────
function showAddUserModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'add-user-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <h2>➕ Ajouter un utilisateur</h2>
      <label class="login-label">Prénom</label>
      <input type="text" id="add-prenom" placeholder="Prénom" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
      <label class="login-label">Nom</label>
      <input type="text" id="add-nom" placeholder="Nom" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
      <label class="login-label">Email</label>
      <input type="email" id="add-email" placeholder="prenom.nom@dispatchis.fr" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
      <label class="login-label">Rôle</label>
      <select id="add-role" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
        <option value="gestionnaire">Gestionnaire</option>
        <option value="manager">Manager</option>
        <option value="lecteur">Lecteur</option>
        <option value="admin">Admin</option>
      </select>
      <label class="login-label">Niveau</label>
      <select id="add-niveau" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
        <option value="normal">✅ Normal</option>
        <option value="debutant">🌱 Débutant</option>
      </select>
      <div id="add-user-error" style="color:#dc2626;font-size:12px;display:none;margin-bottom:8px;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('add-user-modal')">Annuler</button>
        <button class="btn btn-primary" onclick="doAddUser()">Créer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doAddUser() {
  var prenom = document.getElementById('add-prenom').value.trim();
  var nom    = document.getElementById('add-nom').value.trim();
  var email  = document.getElementById('add-email').value.trim();
  var role   = document.getElementById('add-role').value;
  var niveau = document.getElementById('add-niveau').value;
  var errEl  = document.getElementById('add-user-error');
  errEl.style.display = 'none';
  if (!prenom || !nom || !email) { errEl.textContent = 'Tous les champs sont obligatoires.'; errEl.style.display = 'block'; return; }
  if (!email.includes('@')) { errEl.textContent = 'Email invalide.'; errEl.style.display = 'block'; return; }
  var { error } = await db.from('utilisateurs').insert({ prenom, nom, email, role, niveau, actif: true });
  if (error) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; return; }
  await auditLog('USER_CREATE', 'Création utilisateur ' + email + ' role=' + role + ' niveau=' + niveau);
  closeModal('add-user-modal');
  await loadAllUsers();
  renderAdminUsers();
  showNotif('✅ Utilisateur créé avec succès.', 'success');
}

// ── ÉDITER UN UTILISATEUR ───────────────────────────────────────────────────
function showEditUserModal(userId) {
  var u = allUsers.find(function(x) { return x.id === userId; });
  if (!u) return;
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'edit-user-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <h2>✏️ Modifier l'utilisateur</h2>
      <label class="login-label">Prénom</label>
      <input type="text" id="edit-prenom" value="${escHtml(u.prenom)}" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
      <label class="login-label">Nom</label>
      <input type="text" id="edit-nom" value="${escHtml(u.nom)}" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
      <label class="login-label">Email</label>
      <input type="email" id="edit-email" value="${escHtml(u.email)}" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
      <label class="login-label">Rôle</label>
      <select id="edit-role" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
        <option value="gestionnaire" ${u.role==='gestionnaire'?'selected':''}>Gestionnaire</option>
        <option value="manager"      ${u.role==='manager'?'selected':''}>Manager</option>
        <option value="lecteur"      ${u.role==='lecteur'?'selected':''}>Lecteur</option>
        <option value="admin"        ${u.role==='admin'?'selected':''}>Admin</option>
      </select>
      <label class="login-label">Niveau</label>
      <select id="edit-niveau" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">
        <option value="normal"   ${(u.niveau||'normal')==='normal'   ?'selected':''}>✅ Normal</option>
        <option value="debutant" ${(u.niveau||'normal')==='debutant' ?'selected':''}>🌱 Débutant</option>
      </select>
      <div id="edit-user-error" style="color:#dc2626;font-size:12px;display:none;margin-bottom:8px;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('edit-user-modal')">Annuler</button>
        <button class="btn btn-primary" onclick="doEditUser('${userId}')">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doEditUser(userId) {
  var prenom = document.getElementById('edit-prenom').value.trim();
  var nom    = document.getElementById('edit-nom').value.trim();
  var email  = document.getElementById('edit-email').value.trim();
  var role   = document.getElementById('edit-role').value;
  var niveau = document.getElementById('edit-niveau').value;
  var errEl  = document.getElementById('edit-user-error');
  errEl.style.display = 'none';
  if (!prenom || !nom || !email) { errEl.textContent = 'Tous les champs sont obligatoires.'; errEl.style.display = 'block'; return; }
  var { error } = await db.from('utilisateurs').update({ prenom, nom, email, role, niveau }).eq('id', userId);
  if (error) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; return; }
  await auditLog('USER_EDIT', 'Modification utilisateur ' + email + ' role=' + role + ' niveau=' + niveau);
  closeModal('edit-user-modal');
  await loadAllUsers();
  renderAdminUsers();
  showNotif('✅ Utilisateur mis à jour.', 'success');
}

// ── SUPPRIMER UN UTILISATEUR ─────────────────────────────────────────────────
function confirmDeleteUser(userId, displayName) {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'del-user-modal';
  modal.innerHTML = '<div class="modal" style="max-width:380px;text-align:center;">'
    + '<div style="font-size:40px;margin-bottom:8px;">⚠️</div>'
    + '<h2 style="color:#dc2626;">Supprimer l\'utilisateur</h2>'
    + '<p style="color:#666;font-size:13px;margin:12px 0 20px;">Êtes-vous sûr de vouloir supprimer <strong>' + escHtml(displayName) + '</strong> ? Cette action est irréversible.</p>'
    + '<div class="modal-actions" style="justify-content:center;">'
    + '<button class="btn btn-secondary" onclick="closeModal(\'del-user-modal\')">Annuler</button>'
    + '<button class="btn btn-danger" onclick="doDeleteUser(\'' + userId + '\')">Supprimer</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

async function doDeleteUser(userId) {
  var u = allUsers.find(function(x) { return x.id === userId; });
  var { error } = await db.from('utilisateurs').delete().eq('id', userId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  await auditLog('USER_DELETE', 'Suppression utilisateur ' + (u ? u.email : userId));
  closeModal('del-user-modal');
  await loadAllUsers();
  renderAdminUsers();
  showNotif('🗑️ Utilisateur supprimé.', 'info');
}

// ── UTILITAIRE XSS ──────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
