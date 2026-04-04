// ===== PURGE AUDIT LOGS (R4 -- Rétention 3 mois) =====
function confirmPurgeAuditLogs() {
  // Sécurité : admin uniquement
  if (currentUserData.role !== 'admin') {
    showNotif('⛔ Action réservée à l\'administrateur.', 'error'); return;
  }
  // Modale de confirmation avec ré-authentification
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'purge-auth-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;text-align:center">
      <div style="font-size:48px;margin-bottom:8px">🗑️</div>
      <h2 style="color:#e74c3c;margin-bottom:6px">Purge des logs d'audit</h2>
      <p style="color:#666;font-size:14px;margin-bottom:16px">
        Cette action supprimera <strong>définitivement</strong> tous les logs<br>
        de plus de <strong>3 mois</strong>. Elle est <u>irréversible</u>.
      </p>
      <p style="font-size:13px;color:#555;margin-bottom:8px">
        Confirmez votre identité en entrant votre mot de passe :
      </p>
      <input type="password" id="purge-pwd-input" placeholder="Votre mot de passe..."
        style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:16px;box-sizing:border-box">
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-secondary" onclick="closeModal('purge-auth-modal')">❌ Annuler</button>
        <button class="btn btn-danger" onclick="authenticateAndPurge()">✅ Confirmer la purge</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('purge-pwd-input')?.focus(), 100);
}

async function authenticateAndPurge() {
  const pwd = document.getElementById('purge-pwd-input')?.value;
  if (!pwd) { showNotif('Veuillez entrer votre mot de passe.', 'error'); return; }
  const { error } = await db.auth.signInWithPassword({
    email: currentUser.email,
    password: pwd
  });
  if (error) {
    window._purgeFailCount = (window._purgeFailCount || 0) + 1;
    const remaining = 3 - window._purgeFailCount;
    if (window._purgeFailCount >= 3) {
      closeModal('purge-auth-modal');
      window._purgeFailCount = 0;
      triggerEmergencyLockdown();
      return;
    }
    showNotif(`❌ Mot de passe incorrect. ${remaining} tentative(s) restante(s) avant blocage d'urgence.`, 'error');
    document.getElementById('purge-pwd-input').value = '';
    return;
  }
  window._purgeFailCount = 0; // Reset compteur si succès
  // Auth OK → étape 2 : justification obligatoire
  closeModal('purge-auth-modal');
  showPurgeJustificationModal();
}

function showPurgeJustificationModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'purge-justif-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:460px;text-align:center">
      <div style="font-size:42px;margin-bottom:8px">📝</div>
      <h2 style="color:#e67e22;margin-bottom:6px">Justification requise</h2>
      <p style="font-size:14px;color:#555;margin-bottom:6px">
        Identité vérifiée ✅ -- Avant d'exécuter la purge, vous devez
        <strong>justifier cette action</strong>.
      </p>
      <div style="background:#fff8e1;border:1.5px solid #f39c12;border-radius:8px;padding:10px 14px;margin-bottom:16px;text-align:left;font-size:12px;color:#7d6608">
        ⚠️ <strong>Cette justification sera enregistrée de façon permanente</strong>
        dans le journal de traçabilité et ne pourra pas être supprimée par la purge.
      </div>
      <textarea id="purge-justif-input" rows="4" placeholder="Motif de la purge manuelle (obligatoire)…&#10;Ex : Purge trimestrielle réglementaire du 14/03/2026"
        style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:16px"></textarea>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-secondary" onclick="closeModal('purge-justif-modal')">❌ Annuler</button>
        <button class="btn btn-danger" onclick="validateAndPurge()">🗑️ Exécuter la purge</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('purge-justif-input')?.focus(), 100);
}

async function validateAndPurge() {
  const justif = (document.getElementById('purge-justif-input')?.value || '').trim();
  if (justif.length < 10) {
    showNotif('⚠️ La justification doit contenir au moins 10 caractères.', 'error');
    return;
  }
  closeModal('purge-justif-modal');
  doPurgeAuditLogs(justif);
}
async function doPurgeAuditLogs(justification = '') {
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
  const { error } = await db.from('audit_logs').delete().lt('created_at', cutoff.toISOString());
  if (error) { showNotif('Erreur lors de la purge : ' + error.message, 'error'); return; }
  const detail = 'Purge manuelle des logs > 3 mois' + (justification ? ' | Motif : ' + justification : '');
  await auditLog('PURGE_LOGS', detail);
  showNotif('🗑️ Logs de plus de 3 mois supprimés avec succès.', 'success');
}
// ===== FIN PURGE =====
// ===== COMMANDE D'URGENCE -- Blocage 30 min + RAZ données =====
async function triggerEmergencyLockdown() {
  // ÉTAPE 1 -- Tracer en premier (audit_logs inaltérable)
  await auditLog('URGENCE_LOCKDOWN',
    '3 tentatives échouées sur purge -- Chiffrement AES-256 des données utilisateurs + RAZ dossiers + blocage 30 min');

  // ÉTAPE 2 -- Chiffrement AES-256 des données utilisateurs (clé jetable -- irrécupérable sans backup)
  try {
    // Générer une clé AES-256-GCM aléatoire jetable (jamais stockée)
    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();

    // Récupérer tous les utilisateurs
    const { data: users } = await db.from('utilisateurs').select('id,nom,prenom,role');
    if (users && users.length > 0) {
      for (const u of users) {
        // Chiffrer nom + prenom
        const payload = JSON.stringify({ nom: u.nom, prenom: u.prenom, role: u.role });
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          aesKey,
          enc.encode(payload)
        );
        const encB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        // Écraser les champs en base avec les données chiffrées
        await db.from('utilisateurs').update({
          nom:    '[ENC:' + encB64.substring(0, 40) + ']',
          prenom: '[ENC:' + encB64.substring(40, 80) + ']'
        }).eq('id', u.id);
      }
    }
    // Clé NON stockée → crypto-shredding : données irrécupérables sans backup
    await auditLog('URGENCE_CHIFFREMENT', 'Chiffrement AES-256-GCM exécuté -- clé jetable non conservée -- restauration backup requise');
  } catch(e) {
    await auditLog('URGENCE_CHIFFREMENT_ERREUR', 'Erreur chiffrement : ' + e.message);
  }

  // ÉTAPE 3 -- RAZ des dossiers de travail
  try {
    const { data: ids } = await db.from('dossiers').select('id');
    if (ids && ids.length > 0) {
      await db.from('dossiers').delete().in('id', ids.map(d => d.id));
    }
  } catch(e) { /* silencieux */ }

  // ÉTAPE 4 -- Déconnexion forcée
  await db.auth.signOut();

  // ÉTAPE 5 -- Lockout 30 min
  const lockoutUntil = Date.now() + (30 * 60 * 1000);
  safeLocal.setItem('dispatchis_emergency_lockout', lockoutUntil.toString());
  safeLocal.setItem('dispatchis_emergency_time', new Date().toLocaleString('fr-FR'));

  // ÉTAPE 6 -- Écran de blocage
  showLockoutScreen();
}

function showLockoutScreen() {
  const lockoutUntil = parseInt(safeLocal.getItem('dispatchis_emergency_lockout') || '0');
  const lockoutTime  = safeLocal.getItem('dispatchis_emergency_time') || '';
  // Masquer tout
  document.getElementById('login-screen').style.display  = 'none';
  document.getElementById('app-screen').style.display    = 'none';

  // Créer l'écran de blocage s'il n'existe pas
  let screen = document.getElementById('lockout-screen');
  if (!screen) {
    screen = document.createElement('div'); screen.id = 'lockout-screen';
    screen.style.cssText = 'position:fixed;inset:0;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;font-family:sans-serif;text-align:center;padding:30px';
    document.body.appendChild(screen);
  }

  const updateTimer = () => {
    const remaining = Math.max(0, lockoutUntil - Date.now());
    const min  = Math.floor(remaining / 60000);
    const sec  = Math.floor((remaining % 60000) / 1000);
    const timeStr = `${min}:${sec.toString().padStart(2,'0')}`;

    screen.innerHTML = `
      <div style="font-size:72px;margin-bottom:16px">🚨</div>
      <h1 style="color:#e74c3c;font-size:28px;margin-bottom:8px">ACCÈS BLOQUÉ</h1>
      <p style="color:#aaa;font-size:15px;margin-bottom:6px">3 tentatives d'authentification échouées détectées.</p>
      <p style="color:#e74c3c;font-size:13px;margin-bottom:4px">🔐 Données utilisateurs chiffrées AES-256 -- clé détruite.</p>
      <p style="color:#e67e22;font-size:13px;margin-bottom:24px">🗑️ Données de travail réinitialisées. Restauration backup requise.</p>
      <div style="background:#2d2d44;border-radius:16px;padding:24px 40px;margin-bottom:24px">
        <div style="color:#fff;font-size:48px;font-weight:700;letter-spacing:4px">${remaining > 0 ? timeStr : '00:00'}</div>
        <div style="color:#888;font-size:12px;margin-top:4px">Réouverture automatique</div>
      </div>
      <p style="color:#666;font-size:11px">Incident enregistré le ${lockoutTime}</p>
      ${remaining <= 0 ? '<button onclick="unlockAfterLockout()" style="margin-top:20px;padding:12px 32px;background:#27ae60;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer">🔓 Accéder à nouveau</button>' : ''}
    `;
    if (remaining > 0) setTimeout(updateTimer, 1000);
  };
  updateTimer();
}

function unlockAfterLockout() {
  safeLocal.removeItem('dispatchis_emergency_lockout');
  safeLocal.removeItem('dispatchis_emergency_time');
  const screen = document.getElementById('lockout-screen');
  if (screen) screen.remove();
  document.getElementById('login-screen').style.display = 'flex';
}
// ===== FIN COMMANDE D'URGENCE =====

// ===== JOURNAL D'AUDIT (R4) =====
async function renderAuditLogs() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement du journal...</div>';
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
  const { data, error } = await db.from('audit_logs')
    .select('*')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) { document.getElementById('main-content').innerHTML = '<p style="color:red">Erreur chargement logs : ' + error.message + '</p>'; return; }
  const logs = data || [];
  const badgeColor = {
    CONNEXION:'#27ae60', DECONNEXION:'#7f8c8d',
    DISPATCH:'#2980b9', RESET_COMPLET:'#e74c3c', RESET_PARTIEL:'#e67e22',
    VERROUILLAGE:'#8e44ad', DEVERROUILLAGE:'#16a085',
    IMPORT_EXCEL:'#2c3e50', AJOUT_UTILISATEUR:'#27ae60', MODIF_UTILISATEUR:'#f39c12',
    DEMANDE_DOSSIER_SUPP:'#3498db', MARQUER_TRAITE:'#27ae60',
    REMETTRE_EN_COURS:'#e67e22', PURGE_LOGS:'#e74c3c', URGENCE_LOCKDOWN:'#c0392b', URGENCE_CHIFFREMENT:'#922b21', URGENCE_CHIFFREMENT_ERREUR:'#e74c3c'
  };
  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <h2 style="color:var(--navy);margin:0">🔍 Journal d'audit</h2>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-size:12px;color:#888;background:#f0f4f8;padding:4px 12px;border-radius:12px">📅 3 derniers mois · ${logs.length} entrée(s)</span>
        ${currentUserData.role === 'admin' ? '<button class="btn btn-danger" style="font-size:12px;padding:6px 14px" onclick="confirmPurgeAuditLogs()">🗑️ Purger les logs</button>' : ''}
      </div>
    </div>`;
  if (logs.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:#888">Aucune entrée dans le journal pour les 3 derniers mois.</div>';
  } else {
    html += '<div class="table-container"><table><thead><tr><th>Date / Heure</th><th>Utilisateur</th><th>Rôle</th><th>Action</th><th>Détail</th></tr></thead><tbody>';
    logs.forEach(l => {
      const dt = new Date(l.created_at);
      const dateStr = dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
      const color = badgeColor[l.action] || '#95a5a6';
      html += `<tr>
        <td style="white-space:nowrap;font-size:12px;color:#666">${dateStr}</td>
        <td style="font-size:13px">${l.user_email || '--'}</td>
        <td><span class="badge role-${l.user_role}" style="padding:2px 8px;border-radius:10px;font-size:11px">${l.user_role || '--'}</span></td>
        <td><span style="background:${color};color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600">${l.action}</span></td>
        <td style="font-size:12px;color:#555">${l.detail || '--'}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }
  document.getElementById('main-content').innerHTML = html;
}
// ===== FIN JOURNAL D'AUDIT =====

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
    const ac = u.role==='admin'?'avatar-admin':u.role==='manager'?'avatar-manager':'avatar-gestionnaire';
    const rc = u.role==='admin'?'role-admin':u.role==='manager'?'role-manager':'role-gestionnaire';
    const initials = (u.prenom?.[0]||'')+( u.nom?.[0]||'');
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


// ── T7/T8 -- MODIFIER PROFIL & RÔLE ──────────────────────────────
function showEditUser(id, prenom, nom, email, role) {
  const isSelf = currentUserData.email === email;
  const roles = ['gestionnaire','manager','admin'];
  const opts = roles.map(r => '<option value="' + r + '"' + (role===r?' selected':'') + '>' + r.charAt(0).toUpperCase()+r.slice(1) + '</option>').join('');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'edit-user-modal';
  const inner = document.createElement('div'); inner.className = 'modal';
  inner.innerHTML = '<h2 style="color:var(--navy);margin-bottom:20px">✏️ Modifier le profil</h2>'
    + '<div class="form-group"><label>Prénom</label><input type="text" id="edit-prenom" value="' + prenom + '"></div>'
    + '<div class="form-group"><label>Nom</label><input type="text" id="edit-nom" value="' + nom + '"></div>'
    + '<div class="form-group"><label>Email</label><input type="email" id="edit-email" value="' + email + '"></div>'
    + '<div class="form-group"><label>Rôle</label><select id="edit-role"' + (isSelf?' disabled title="Impossible de modifier votre propre rôle"':'') + '>' + opts + '</select>'
    + (isSelf ? '<small style="color:#e74c3c">Vous ne pouvez pas changer votre propre rôle.</small>' : '') + '</div>'
    + '<div class="modal-error" id="edit-user-error"></div>'
    + '';
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
  const nom = document.getElementById('edit-nom').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const errEl = document.getElementById('edit-user-error');
  errEl.style.display = 'none';
  if (!prenom || !nom || !email) { errEl.textContent = 'Tous les champs sont requis.'; errEl.style.display = 'block'; return; }
  const updates = { prenom, nom, email };
  if (!isSelf) updates.role = document.getElementById('edit-role').value;
  const { error } = await db.from('utilisateurs').update(updates).eq('id', id);
  if (error) { errEl.textContent = 'Erreur : ' + error.message; errEl.style.display = 'block'; return; }
  closeModal('edit-user-modal');
  await auditLog('MODIF_UTILISATEUR', `Profil modifié : ${prenom} ${nom} (${role})`);
  showNotif('✅ Profil mis à jour !', 'success');
  await loadAllUsers(); renderUtilisateurs();
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
  const prenom = document.getElementById('new-prenom').value.trim();
  const nom = document.getElementById('new-nom').value.trim();
  const email = document.getElementById('new-email').value.trim();
  const password = document.getElementById('new-password').value;
  const role = document.getElementById('new-role').value;
  const errEl = document.getElementById('add-user-error');
  errEl.style.display = 'none';

  if (!prenom || !nom || !email || !password) {
    errEl.textContent = 'Veuillez remplir tous les champs.'; errEl.style.display = 'block'; return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.'; errEl.style.display = 'block'; return;
  }

  // Créer dans Supabase Auth via Admin API (signUp)
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) { errEl.textContent = 'Erreur Auth : ' + error.message; errEl.style.display = 'block'; return; }

  // Ajouter dans la table utilisateurs
  const { error: dbError } = await db.from('utilisateurs').insert({ prenom, nom, email, role, actif: true });
  if (dbError) { errEl.textContent = 'Erreur base de données : ' + dbError.message; errEl.style.display = 'block'; return; }

  closeModal('add-user-modal');
  await auditLog('AJOUT_UTILISATEUR', `Compte créé : ${prenom} ${nom} (${role})`);
  showNotif(`✅ Compte créé pour ${prenom} ${nom} !`, 'success');
  await loadAllUsers();
  renderUtilisateurs();
}

