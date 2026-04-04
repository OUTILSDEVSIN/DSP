// ===== DISPATCH =====
// AUTO ASSIGN -- enrichi avec Dplane planning du jour
async function showAutoAssignModal(totalImported) {
  // Récupérer le planning Dplane du jour pour pré-cocher les gestionnaires "Préouvertures"
  const today = new Date().toISOString().split('T')[0];
  const { data: planningDuJour } = await db.from('dplane_planning')
    .select('gestionnaire_id, activite_id, is_brouillon')
    .eq('jour', today).eq('is_brouillon', false);
  const { data: absencesDuJour } = await db.from('dplane_absences')
    .select('gestionnaire_id').eq('jour', today);
  const { data: activitesDplane } = await db.from('dplane_activites').select('id, nom');

  // IDs des gestionnaires absents
  const absentsIds = new Set((absencesDuJour||[]).map(a => a.gestionnaire_id));
  // IDs avec activité "Préouvertures" aujourd'hui
  const actPreouv = (activitesDplane||[]).find(a => a.nom.toLowerCase().includes('préouverture') || a.nom.toLowerCase().includes('preouvetur'));
  const preouverturesIds = new Set((planningDuJour||[])
    .filter(p => actPreouv && p.activite_id === actPreouv.id)
    .map(p => p.gestionnaire_id));

  // Construire résumé planning du jour
  const resumePlanning = allUsers
    .filter(u => u.role === 'gestionnaire' && u.actif !== false)
    .map(u => {
      const acts = (planningDuJour||[]).filter(p => p.gestionnaire_id === u.id)
        .map(p => (activitesDplane||[]).find(a => a.id === p.activite_id)?.nom || '?');
      const absent = absentsIds.has(u.id);
      return { user: u, acts, absent, preouv: preouverturesIds.has(u.id) };
    });

  const gestionnaires = allUsers.filter(u => ['gestionnaire','manager'].includes(u.role));
  if (!gestionnaires.length) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'auto-assign-modal';
  modal.style.zIndex = '3000';
  modal.innerHTML = `
    <div class="modal" style="max-width:500px;width:95vw">
      <div style="font-size:40px;text-align:center;margin-bottom:8px">🎯</div>
      <h2 style="text-align:center">Attribution automatique</h2>
      <p style="color:#666;font-size:14px;text-align:center;margin-bottom:20px">
        <strong>${totalImported}</strong> dossiers importés. Souhaitez-vous les attribuer maintenant ?
      </p>
      <!-- Résumé planning Dplane du jour -->
      ${resumePlanning.some(r => r.acts.length || r.absent) ? `
      <div style="background:#f0f4ff;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;">
        <div style="font-weight:700;color:var(--navy);margin-bottom:8px;">📅 Planning Dplane du jour</div>
        ${resumePlanning.map(r => r.acts.length || r.absent ? `
          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,.05);">
            <span style="font-weight:600;min-width:130px;">${r.user.prenom} ${r.user.nom}</span>
            ${r.absent ? '<span style="color:#e5195e;font-size:11px;">🚫 Absent</span>' : 
              r.acts.map(a => `<span style="background:${r.preouv?'var(--rose)':'#666'};color:white;padding:2px 6px;border-radius:10px;font-size:10px;">${a}</span>`).join('')}
          </div>` : '').join('')}
      </div>` : ''}
      <div style="max-height:280px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:16px">
        ${gestionnaires.map(g => {
          const rp = resumePlanning.find(r => r.user.id === g.id);
          const isPreouv = rp?.preouv || false;
          const isAbsent = rp?.absent || false;
          const isChecked = isPreouv && !isAbsent;
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5;${isAbsent?'opacity:.45;':''}">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:normal;margin:0">
              <input type="checkbox" class="gest-check" data-nom="${g.prenom} ${g.nom}" ${isChecked?'checked':''} ${isAbsent?'disabled':''} style="width:16px;height:16px;accent-color:var(--rose)">
              <span>${g.prenom} ${g.nom}</span>
              ${isPreouv ? '<span style="background:var(--rose);color:white;font-size:10px;padding:1px 5px;border-radius:8px;">Préouvertures ✓</span>' : ''}
              ${isAbsent ? '<span style="color:#e5195e;font-size:10px;">🚫 Absent</span>' : ''}
              <span class="badge role-${g.role}" style="font-size:10px">${g.role}</span>
            </label>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;color:#888">Nb dossiers :</span>
              <input type="number" class="gest-nb" data-nom="${g.prenom} ${g.nom}" value="10" min="1" max="${totalImported}"
                style="width:60px;padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;text-align:center" ${isAbsent?'disabled':''}>
            </div>
          </div>`;}).join('')}
      </div>
      <div id="auto-assign-error" style="color:#e74c3c;font-size:13px;background:#fff5f5;padding:10px;border-radius:8px;display:none;margin-bottom:12px"></div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-secondary" onclick="closeModal('auto-assign-modal')">Passer →</button>
        <button class="btn btn-primary" onclick="doAutoAssign(${totalImported})">✅ Attribuer automatiquement</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doAutoAssign(totalImported) {
  const checks = [...document.querySelectorAll('.gest-check:checked')];
  if (!checks.length) {
    const err = document.getElementById('auto-assign-error');
    err.textContent = 'Sélectionnez au moins un gestionnaire.';
    err.style.display = 'block'; return;
  }
  const selections = checks.map(cb => ({
    nom: cb.dataset.nom,
    nb: parseInt(document.querySelector(`.gest-nb[data-nom="${cb.dataset.nom}"]`).value) || 10
  }));
  const totalDemande = selections.reduce((s, x) => s + x.nb, 0);
  const dossiersNonAttribues = allDossiers.filter(d => !d.gestionnaire);
  const disponibles = dossiersNonAttribues.length;
  if (totalDemande > disponibles) {
    const parGest = Math.floor(disponibles / selections.length);
    const err = document.getElementById('auto-assign-error');
    err.innerHTML = `⚠️ Vous demandez <strong>${totalDemande}</strong> dossiers mais il n'en reste que <strong>${disponibles}</strong> non attribués.<br><br>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('auto-assign-error').style.display='none'">✏️ Modifier</button>
        <button class="btn btn-warning" onclick="doAutoAssignEquitable(${disponibles})">⚖️ Répartir équitablement (${parGest} chacun)</button>
      </div>`;
    err.style.display = 'block'; return;
  }
  await executeAutoAssign(selections, dossiersNonAttribues);
}

async function doAutoAssignEquitable(disponibles) {
  const checks = [...document.querySelectorAll('.gest-check:checked')];
  const nb = Math.floor(disponibles / checks.length);
  const selections = checks.map(cb => ({ nom: cb.dataset.nom, nb }));
  const dossiers = allDossiers.filter(d => !d.gestionnaire);
  await executeAutoAssign(selections, dossiers);
}

async function executeAutoAssign(selections, dossiers) {
  let idx = 0;
  for (const sel of selections) {
    const batch = dossiers.slice(idx, idx + sel.nb);
    for (const d of batch) {
      await db.from('dossiers').update({ gestionnaire: sel.nom, verrouille: true }).eq('id', d.id);
    }
    idx += sel.nb;
  }
  closeModal('auto-assign-modal');
  showNotif(`✅ ${idx} dossiers attribués et verrouillés !`, 'success');
  await loadDossiers();
  showTab('attribution');
}

function showDispatch() {
  const verrouilles = allDossiers.filter(d => d.verrouille && d.statut !== 'attribue' && d.statut !== 'encours' && d.statut !== 'ouvert' && d.statut !== 'traite');
  if (!verrouilles.length) { showNotif('Aucun dossier verrouillé à dispatcher.', 'error'); return; }
  const modal = document.createElement('div');
  modal.className = 'dispatch-modal-overlay';
  modal.id = 'dispatch-modal';
  modal.innerHTML = `
    <div class="dispatch-modal">
      <div class="icon">🚀</div>
      <h2>Confirmer l'attribution</h2>
      <p>Vous êtes sur le point d'envoyer</p>
      <div class="count">${verrouilles.length}<small>dossiers verrouillés aux gestionnaires</small></div>
      <p style="font-size:13px;color:#aaa">Les dossiers passeront en statut <strong>Attribué</strong> et seront visibles par les gestionnaires concernés.</p>
      <div class="dispatch-actions">
        <button class="btn btn-secondary" style="padding:12px 28px" onclick="closeModal('dispatch-modal')">Annuler</button>
        <button class="btn-dispatch" onclick="doDispatch(${verrouilles.length})">🚀 DISPATCHER</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doDispatch(count) {
  closeModal('dispatch-modal');
  const verrouilles = allDossiers.filter(d => d.verrouille && d.statut !== 'attribue' && d.statut !== 'encours' && d.statut !== 'ouvert' && d.statut !== 'traite');
  const ids = verrouilles.map(d => d.id);
  for (const id of ids) {
    await db.from('dossiers').update({ statut: 'attribue' }).eq('id', id);
  }
  await auditLog('DISPATCH', `${count} dossiers dispatchés`);
  showNotif(`🚀 ${count} dossiers dispatchés avec succès !`, 'success');
  window._fPortefeuille = ''; window._fType = ''; window._fNature = '';
  window._fStatut = ''; window._fGestionnaire = ''; window._fNonAttribue = false;
  searchQuery = '';
  await loadDossiers();
  renderAttribution();
}

