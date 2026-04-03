// ===== UTILISATEURS =====
async function renderUtilisateurs() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';
  await loadAllUsers();

  const isManager = ['admin', 'manager'].includes(role);
  let html = `
    <div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <h2 style="color:var(--navy)">Équipe (${allUsers.length} membres)</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-success" onclick="showAddUser()">➕ Ajouter un membre</button>
        ${isManager ? '<button class="btn btn-primary" onclick="showHabilitationsModal()">🔑 Éditer habilitations</button>' : ''}
      </div>
    </div>
    <div class="users-grid">`;

  allUsers.forEach(u => {
    const ac = u.role === 'admin'    ? 'avatar-admin'    :
               u.role === 'manager'  ? 'avatar-manager'  : 'avatar-gestionnaire';
    const rc = u.role === 'admin'    ? 'role-admin'      :
               u.role === 'manager'  ? 'role-manager'    : 'role-gestionnaire';
    const initials = (u.prenom?.[0] || '') + (u.nom?.[0] || '');
    html += `
      <div class="user-card" style="position:relative">
        <div class="user-avatar ${ac}">${escapeHtml(initials)}</div>
        <div class="user-info">
          <h4>${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}</h4>
          <p style="font-size:12px;color:#888">${escapeHtml(u.email)}</p>
          <span class="user-role-badge ${rc}">${escapeHtml(u.role.toUpperCase())}</span>
        </div>
        ${isManager ? `<button class="btn btn-secondary" style="position:absolute;top:12px;right:12px;padding:4px 10px;font-size:12px"
          onclick="showEditUser('${u.id}','${escapeHtml(u.prenom)}','${escapeHtml(u.nom)}','${escapeHtml(u.email)}','${u.role}')"
          title="Modifier">✏️</button>` : ''}
      </div>`;
  });
  html += '</div>';
  document.getElementById('main-content').innerHTML = html;
}

// ── MODIFIER PROFIL & RÔLE ──────────────────────────────────────────────
function showEditUser(id, prenom, nom, email, role) {
  const isSelf = currentUserData.email === email;
  const roles  = ['gestionnaire', 'superviseur', 'manager', 'admin'];
  const opts   = roles.map(r =>
    `<option value="${r}"${role === r ? ' selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'edit-user-modal';
  modal.innerHTML = `
    <div class="modal">
      <h2 style="color:var(--navy);margin-bottom:20px">✏️ Modifier le profil</h2>
      <div class="form-group"><label>Prénom</label><input type="text" id="edit-prenom" class="form-control" value="${escapeHtml(prenom)}"></div>
      <div class="form-group"><label>Nom</label><input type="text" id="edit-nom" class="form-control" value="${escapeHtml(nom)}"></div>
      <div class="form-group"><label>Email</label><input type="email" id="edit-email" class="form-control" value="${escapeHtml(email)}"></div>
      <div class="form-group">
        <label>Rôle</label>
        <select id="edit-role" class="form-control" ${isSelf ? 'disabled title="Impossible de modifier votre propre rôle"' : ''}>${opts}</select>
        ${isSelf ? '<small style="color:#e74c3c">Vous ne pouvez pas changer votre propre rôle.</small>' : ''}
      </div>
      <div class="modal-error" id="edit-user-error" style="display:none;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('edit-user-modal')">Annuler</button>
        <button class="btn btn-primary" onclick="doEditUser('${id}','${escapeHtml(email)}',${isSelf})">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doEditUser(id, originalEmail, isSelf) {
  const prenom = document.getElementById('edit-prenom')?.value.trim();
  const nom    = document.getElementById('edit-nom')?.value.trim();
  const email  = document.getElementById('edit-email')?.value.trim();
  const errEl  = document.getElementById('edit-user-error');
  if (errEl) errEl.style.display = 'none';

  if (!prenom || !nom || !email) {
    if (errEl) { errEl.textContent = 'Tous les champs sont requis.'; errEl.style.display = 'block'; }
    return;
  }
  const updates = { prenom, nom, email };
  if (!isSelf) updates.role = document.getElementById('edit-role')?.value;

  const { error } = await db.from('utilisateurs').update(updates).eq('id', id);
  if (error) {
    if (errEl) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; }
    return;
  }
  closeModal('edit-user-modal');
  await auditLog('MODIF_UTILISATEUR', `Profil modifié : ${prenom} ${nom}`);
  showNotif('✅ Profil mis à jour !', 'success');
  await loadAllUsers();
  renderUtilisateurs();
}

// ── AJOUTER UN UTILISATEUR ──────────────────────────────────────────────
function showAddUser() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const roleOptions = role === 'admin'
    ? '<option value="gestionnaire">Gestionnaire</option><option value="superviseur">Superviseur</option><option value="manager">Manager</option><option value="admin">Admin</option>'
    : '<option value="gestionnaire">Gestionnaire</option>';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'add-user-modal';
  modal.innerHTML = `
    <div class="modal">
      <h2 style="color:var(--navy);margin-bottom:16px">➕ Ajouter un membre</h2>
      <div class="form-group"><label>Prénom</label><input type="text" id="new-prenom" class="form-control" placeholder="Prénom"></div>
      <div class="form-group"><label>Nom</label><input type="text" id="new-nom" class="form-control" placeholder="Nom"></div>
      <div class="form-group"><label>Email</label><input type="email" id="new-email" class="form-control" placeholder="email@entreprise.fr"></div>
      <div class="form-group"><label>Mot de passe provisoire</label><input type="text" id="new-password" class="form-control" placeholder="Minimum 6 caractères"></div>
      <div class="form-group"><label>Rôle</label><select id="new-role" class="form-control">${roleOptions}</select></div>
      <div class="modal-error" id="add-user-error" style="display:none;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('add-user-modal')">Annuler</button>
        <button class="btn btn-success"   onclick="doAddUser()">Créer le compte</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doAddUser() {
  const prenom   = document.getElementById('new-prenom')?.value.trim();
  const nom      = document.getElementById('new-nom')?.value.trim();
  const email    = document.getElementById('new-email')?.value.trim();
  const password = document.getElementById('new-password')?.value;
  const role     = document.getElementById('new-role')?.value;
  const errEl    = document.getElementById('add-user-error');
  if (errEl) errEl.style.display = 'none';

  if (!prenom || !nom || !email || !password) {
    if (errEl) { errEl.textContent = 'Veuillez remplir tous les champs.'; errEl.style.display = 'block'; }
    return;
  }
  if (password.length < 6) {
    if (errEl) { errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.'; errEl.style.display = 'block'; }
    return;
  }

  // 1. Créer le compte Auth Supabase
  const { error: authErr } = await db.auth.signUp({ email, password });
  if (authErr) {
    if (errEl) { errEl.textContent = 'Erreur Auth : ' + authErr.message; errEl.style.display = 'block'; }
    return;
  }
  // 2. Insérer dans la table utilisateurs
  const { error: dbErr } = await db.from('utilisateurs').insert({ prenom, nom, email, role, actif: true });
  if (dbErr) {
    if (errEl) { errEl.textContent = 'Erreur base : ' + dbErr.message; errEl.style.display = 'block'; }
    return;
  }

  closeModal('add-user-modal');
  await auditLog('AJOUT_UTILISATEUR', `Compte créé : ${prenom} ${nom} (${role})`);
  showNotif(`✅ Compte créé pour ${prenom} ${nom} !`, 'success');
  await loadAllUsers();
  renderUtilisateurs();
}
