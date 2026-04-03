// ===== GOD SWITCH =====
let godModeEnabled = false;
let realUserBackup = null;

function showGodSwitchMenu() {
  if (!currentUserData || currentUserData.email !== 'julien@dispatchis.fr') {
    return showNotif('Accès refusé', 'error');
  }

  const html = `
  <div class="modal-overlay active" id="god-switch-overlay">
    <div class="modal">
      <div class="modal-title">🎭 Mode test</div>
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:14px;">Simuler un rôle utilisateur sans impacter les droits réels.</p>
      <div class="form-group">
        <label>Choisir un rôle simulé</label>
        <select id="god-role" class="form-control">
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="superviseur">Superviseur</option>
          <option value="gestionnaire">Gestionnaire</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('god-switch-overlay')">Annuler</button>
        <button class="btn btn-warning" onclick="enableGodMode()">Activer</button>
        <button class="btn btn-danger" onclick="disableGodMode()">Désactiver</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function enableGodMode() {
  const role = document.getElementById('god-role').value;
  if (!realUserBackup) realUserBackup = JSON.parse(JSON.stringify(currentUserData));
  currentUserData.role = role;
  godModeEnabled = true;
  closeModal('god-switch-overlay');
  buildTabs();
  showTab('dashboard');
  showNotif('Mode test activé : ' + role, 'info');
}

function disableGodMode() {
  if (realUserBackup) currentUserData = JSON.parse(JSON.stringify(realUserBackup));
  godModeEnabled = false;
  closeModal('god-switch-overlay');
  buildTabs();
  showTab('dashboard');
  showNotif('Mode test désactivé', 'success');
}

function getEffectiveRole() {
  return currentUserData?.role || 'gestionnaire';
}
