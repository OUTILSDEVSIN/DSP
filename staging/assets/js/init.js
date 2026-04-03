// ===== NOTIF =====

// ===== T10 -- DOSSIER SUPPLÉMENTAIRE =====
async function demanderDossierSupp() {
  await loadDossiers(); // Reload pour avoir le compte exact
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const mesActifs = allDossiers.filter(d => d.gestionnaire === monNom && !d.traite);

  // Calcul des blocs réels via R7 plutôt que simple count
  const mesBlocs = await getNombreBlocs(monNom);

  const confirmMsg = `Vous avez actuellement ${mesActifs.length} dossier(s) actif(s) réparti(s) sur ${mesBlocs} bloc(s).\n\nConfirmer la demande d'un dossier supplémentaire ?`;
  if (!confirm(confirmMsg)) return;

  const { error } = await db.from('demandes_dossiers_supp').insert({
    user_id: currentUserData.id,
    nom: monNom,
    role: currentUserData.role,
    nb_actifs: mesActifs.length,
    nb_blocs: mesBlocs,
    created_at: new Date().toISOString()
  });

  if (error) return showNotif('Erreur envoi demande', 'error');
  showNotif('Demande envoyée au superviseur', 'success');
}

// ===== RESET MENU =====
function showResetMenu() {
  const html = `
  <div class="modal-overlay active" id="reset-menu-overlay">
    <div class="modal">
      <div class="modal-title">⚙️ Réinitialisation</div>
      <div style="display:grid;gap:10px;">
        <button class="btn btn-warning" onclick="resetDispatch()">Réinitialiser le dispatch</button>
        <button class="btn btn-warning" onclick="resetTrocs()">Réinitialiser les trocs</button>
        <button class="btn btn-danger" onclick="purgeAuditLogs()">Purger les logs d'audit</button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('reset-menu-overlay')">Fermer</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function resetDispatch() {
  if (!confirm('Confirmer la réinitialisation du dispatch ?')) return;
  const { error } = await db.from('dossiers').update({
    gestionnaire: null,
    statut: 'non_traite',
    date_attribution: null,
    verrouille: false,
    traite: false
  }).neq('id', 0);
  if (error) return showNotif('Erreur reset dispatch', 'error');
  closeModal('reset-menu-overlay');
  showNotif('Dispatch réinitialisé', 'success');
  if (currentTab === 'dispatch') renderDispatch();
}

async function resetTrocs() {
  if (!confirm('Confirmer la réinitialisation des trocs ?')) return;
  const { error } = await db.from('trocs').delete().neq('id', 0);
  if (error) return showNotif('Erreur reset trocs', 'error');
  closeModal('reset-menu-overlay');
  showNotif('Trocs réinitialisés', 'success');
}
