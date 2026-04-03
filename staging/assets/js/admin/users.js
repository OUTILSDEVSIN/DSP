// ===== UTILISATEURS =====
// Gestion de l'équipe : affichage, ajout, modification

async function renderUtilisateurs() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';
  await loadAllUsers();
  let html = `<div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
    <h2 style="color:var(--navy)">Équipe (${allUsers.length} membres)</h2>
    <div style="display:flex;gap:8px">
      <button class="btn btn-success" onclick="showAddUser()">➕ Ajouter un membre</button>
      ${['admin','manager'].includes(currentUserData.role) ? '<button class="btn btn-primary" onclick="showHabilitationsModal()">🔑 Éditer habilitations</button>' : ''}
    </div>
  </div><div class="users-grid">`;

  const isManager = ['admin','manager'].includes(currentUserData.role);
  allUsers.forEach(u => {
    const ac = u.role==='admin' ? 'avatar-admin' : u.role==='manager' ? 'avatar-manager' : 'avatar-gestionnaire';
    const rc = u.role==='admin' ? 'role-admin'   : u.role==='manager' ? 'role-manager'   : 'role-gestionnaire';
    const initials = (u.prenom?.[0]||'') + (u.nom?.[0]||'');
    html += `<div class="user-card" style="position:relative">
      <div class="user-avatar ${ac}">${initials}</div>
      <div class="user-info">
        <h4>${u.prenom} ${u.nom}</h4>
        <p style="font-size:12px;color:#888">${u.email}</p>
        <span class="user-role-badge ${rc}">${u.role.toUpperCase()}</span>
      </div>
      ${isManager ? `<button class="btn btn-secondary" style="position:absolute;top:12px;right:12px;padding:4px 10px;font-size:12px" onclick="showEditUser('${u.id}','${u.prenom}','${u.nom}','${u.email}','${u.role}')" title="Modifier">✏️</button>` : ''}
    </div>`;
  });
  html += '</div>';
  document.getElementById('main-content').innerHTML = html;
}

// ── MODIFIER PROFIL & RÔLE ──────────────────────────────────────────
function showEditUser(id, prenom, nom, email, role) {
  const isSelf = currentUserData.email === email;
  const roles = ['gestionnaire','manager','admin'];
  const opts = roles.map(r =>
    '<option value="' + r + '"' + (role===r?' selected':'') + '>' + r.charAt(0).toUpperCase()+r.slice(1) + '</option>'
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'edit-user-modal';
  const inner = document.createElement('div'); inner.className = 'modal';
  inner.innerHTML =
    '<h2 style="color:var(--navy);margin-bottom:20px">✏️ Modifier le profil</h2>'
    + '<div class="form-group"><label>Prénom</label><input type="text" id="edit-prenom" value="' + prenom + '"></div>'
    + '<div class="form-group"><label>Nom</label><input type="text" id="edit-nom" value="' + nom + '"></div>'
    + '<div class="form-group"><label>Email</label><input type="email" id="edit-email" value="' + email + '"></div>'
    + '<div class="form-group"><label>Rôle</label><select id="edit-role"' + (isSelf?' disabled title="Impossible de modifier votre propre rôle"':'') + '>' + opts + '</select>'
    + (isSelf ? '<small style="color:#e74c3c">Vous ne pouvez pas changer votre propre rôle.</small>' : '') + '</div>'
    + '<div class="modal-error" id="edit-user-error"></div>';

  const editBtns = document.createElement('div'); editBtns.className = 'modal-actions';
  const editBtnC = document.createElement('button'); editBtnC.className = 'btn btn-secondary';
  editBtnC.textContent = 'Annuler'; editBtnC.onclick = () => closeModal('edit-user-modal');
  const editBtnO = document.createElement('button'); editBtnO.className = 'btn btn-primary';
  editBtnO.textContent = 'Enregistrer'; editBtnO.onclick = () => doEditUser(id, email, isSelf);
  editBtns.appendChild(editBtnC); editBtns.appendChild(editBtnO);
  inner.appendChild(editBtns); modal.appendChild(inner); document.body.appendChild(modal);
}

async function doEditUser(id, originalEmail, isSelf) {
  const prenom = document.getElementById('edit-prenom').value.trim();
  const nom    = document.getElementById('edit-nom').value.trim();
  const email  = document.getElementById('edit-email').value.trim();
  const errEl  = document.getElementById('edit-user-error');
  errEl.style.display = 'none';

  if (!prenom || !nom || !email) {
    errEl.textContent = 'Tous les champs sont requis.'; errEl.style.display = 'block'; return;
  }
  const updates = { prenom, nom, email };
  if (!isSelf) updates.role = document.getElementById('edit-role').value;

  const { error } = await db.from('utilisateurs').update(updates).eq('id', id);
  if (error) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; return; }

  closeModal('edit-user-modal');
  if (typeof auditLog === 'function') await auditLog('MODIF_UTILISATEUR', `Profil modifié : ${prenom} ${nom}`);
  showNotif('✅ Profil mis à jour !', 'success');
  await loadAllUsers();
  renderUtilisateurs();
}

function showAddUser() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const roleOptions = role === 'admin'
    ? '<option value="gestionnaire">Gestionnaire</option><option value="manager">Manager</option><option value="admin">Admin</option>'
    : '<option value="gestionnaire">Gestionnaire</option>';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'add-user-modal';
  modal.innerHTML = `
    <div class="modal">
      <h2>➕ Ajouter un membre</h2>
      <label>Prénom</label><input type="text" id="new-prenom" placeholder="Prénom">
      <label>Nom</label><input type="text" id="new-nom" placeholder="Nom">
      <label>Email</label><input type="email" id="new-email" placeholder="email@entreprise.fr">
      <label>Mot de passe provisoire</label><input type="text" id="new-password" placeholder="Minimum 6 caractères">
      <label>Rôle</label>
      <select id="new-role">${roleOptions}</select>
      <div class="modal-error" id="add-user-error"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('add-user-modal')">Annuler</button>
        <button class="btn btn-success" onclick="doAddUser()">Créer le compte</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doAddUser() {
  const prenom   = document.getElementById('new-prenom').value.trim();
  const nom      = document.getElementById('new-nom').value.trim();
  const email    = document.getElementById('new-email').value.trim();
  const password = document.getElementById('new-password').value;
  const role     = document.getElementById('new-role').value;
  const errEl    = document.getElementById('add-user-error');
  errEl.style.display = 'none';

  if (!prenom || !nom || !email || !password) {
    errEl.textContent = 'Veuillez remplir tous les champs.'; errEl.style.display = 'block'; return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.'; errEl.style.display = 'block'; return;
  }

  const { data, error } = await db.auth.signUp({ email, password });
  if (error) { errEl.textContent = 'Erreur Auth : ' + error.message; errEl.style.display = 'block'; return; }

  const { error: dbError } = await db.from('utilisateurs').insert({ prenom, nom, email, role, actif: true });
  if (dbError) { errEl.textContent = 'Erreur base : ' + dbError.message; errEl.style.display = 'block'; return; }

  closeModal('add-user-modal');
  if (typeof auditLog === 'function') await auditLog('AJOUT_UTILISATEUR', `Compte créé : ${prenom} ${nom} (${role})`);
  showNotif(`✅ Compte créé pour ${prenom} ${nom} !`, 'success');
  await loadAllUsers();
  renderUtilisateurs();
}
