// ===== ACTIONS =====

// ── SÉLECTION & VERROUILLAGE ──────────────────────────────
function updateSelectionCount() {
  const n = document.querySelectorAll('.row-check:checked').length;
  const el = document.getElementById('selection-count');
  if (el) el.textContent = n + ' sélectionné(s)';
}

function toggleAll(checked) {
  document.querySelectorAll('.row-check:not([disabled])').forEach(cb => cb.checked = checked);
  updateSelectionCount();
}

function selectAll() {
  document.querySelectorAll('.row-check:not([disabled])').forEach(cb => cb.checked = true);
  const all = document.getElementById('check-all');
  if (all) all.checked = true;
  updateSelectionCount();
}

function clearSelection() {
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
  const all = document.getElementById('check-all');
  if (all) all.checked = false;
  updateSelectionCount();
}

async function lockSelection() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => parseInt(cb.dataset.id));
  if (!ids.length) { showNotif('Sélectionnez au moins un dossier.', 'error'); return; }
  const gestionnaire = document.getElementById('assign-bulk-select')?.value || '';
  const sansGest = ids.filter(id => { const d = allDossiers.find(x => x.id === id); return !gestionnaire && !(d && d.gestionnaire); });
  if (sansGest.length > 0) {
    const gests = allUsers.filter(u => ['gestionnaire','manager','admin'].includes(u.role));
    const modal = document.createElement('div');
    modal.className = 'modal-overlay'; modal.id = 'lock-warn-modal';
    // Construire la modale sans guillemets imbriqués
    const inner = document.createElement('div');
    inner.className = 'modal';
    inner.style.cssText = 'text-align:center;max-width:420px';
    inner.innerHTML = '<div style="font-size:44px;margin-bottom:12px">&#9888;&#65039;</div>'
      + '<h2 style="color:#e74c3c">Gestionnaire manquant</h2>'
      + '<p style="color:#666;margin:14px 0"><strong>' + sansGest.length + '</strong> dossier(s) sans gestionnaire.<br>Selectionnez-en un avant de verrouiller.</p>';
    const sel = document.createElement('select');
    sel.id = 'lock-warn-select'; sel.className = 'filter-select';
    sel.style.cssText = 'width:100%;margin-bottom:20px';
    sel.innerHTML = '<option value="">-- Choisir un gestionnaire --</option>'
      + gests.map(g => { const n = g.prenom + ' ' + g.nom; return '<option value="' + n + '">' + n + ' (' + g.role + ')</option>'; }).join('');
    inner.appendChild(sel);
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:10px;justify-content:center';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary'; btnCancel.textContent = 'Annuler';
    btnCancel.onclick = () => closeModal('lock-warn-modal');
    const btnOk = document.createElement('button');
    btnOk.className = 'btn btn-warning'; btnOk.textContent = '🔒 Verrouiller';
    btnOk.onclick = () => confirmLockWithGest(ids);
    btns.appendChild(btnCancel); btns.appendChild(btnOk);
    inner.appendChild(btns);
    modal.appendChild(inner);
    document.body.appendChild(modal); return;
  }
  await executeLock(ids, gestionnaire);
}

async function confirmLockWithGest(ids) {
  const gestionnaire = document.getElementById('lock-warn-select')?.value;
  if (!gestionnaire) { showNotif('Veuillez sélectionner un gestionnaire.', 'error'); return; }
  closeModal('lock-warn-modal');
  await executeLock(ids, gestionnaire);
}

async function executeLock(ids, gestionnaire) {
  for (const id of ids) {
    const upd = { verrouille: true };
    if (gestionnaire) upd.gestionnaire = gestionnaire;
    await db.from('dossiers').update(upd).eq('id', id);
  }
  await auditLog('VERROUILLAGE', ids.length + ' dossier(s) verrouillés' + (gestionnaire ? ' → ' + gestionnaire : ''));
  showNotif('🔒 ' + ids.length + ' dossier(s) verrouillé(s)' + (gestionnaire ? ' et attribués à ' + gestionnaire : '') + '.', 'success');
  clearSelection();
  await loadDossiers();
  renderAttribution();
}

async function unlockSelection() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => parseInt(cb.dataset.id));
  if (!ids.length) { showNotif('Sélectionnez au moins un dossier.', 'error'); return; }
  for (const id of ids) {
    await db.from('dossiers').update({ verrouille: false }).eq('id', id);
  }
  await auditLog('DEVERROUILLAGE', ids.length + ' dossier(s) déverrouillés');
  showNotif(`🔓 ${ids.length} dossier(s) déverrouillé(s).`, 'info');
  clearSelection();
  await loadDossiers();
  renderAttribution();
}

async function toggleVerrouille(id, checked) {
  const dossier = allDossiers.find(d => d.id === id);
  const statut = dossier?.statut || 'nonattribue';
  const isDispatched = ['attribue','encours','ouvert','traite'].includes(statut);

  // Si on veut déverrouiller un dossier dispatché → seul manager
  if (!checked && isDispatched && !isManager) {
    showNotif('Seul le manager peut déverrouiller un dossier dispatché.', 'error');
    renderAttribution(); return;
  }

  if (!checked && isDispatched && isManager) {
    showUnlockConfirm(id);
    renderAttribution(); return;
  }

  const { error } = await db.from('dossiers').update({ verrouille: checked }).eq('id', id);
  if (error) { showNotif('Erreur.', 'error'); return; }
  allDossiers = allDossiers.map(d => d.id === id ? {...d, verrouille: checked} : d);
  showNotif(checked ? '🔒 Dossier verrouillé' : '🔓 Dossier déverrouillé', 'info');
  // Mettre à jour le compteur dispatch
  const nbVerrouilles = allDossiers.filter(d => d.verrouille && !['attribue','encours','ouvert','traite'].includes(d.statut||'nonattribue')).length;
  const btn = document.querySelector('.btn-dispatch');
  if (btn) { btn.disabled = nbVerrouilles === 0; btn.textContent = `🚀 DISPATCHER${nbVerrouilles > 0 ? ` (${nbVerrouilles})` : ''}`; }
}

function showUnlockConfirm(id) {
  const existing = document.getElementById('unlock-confirm-modal');
  if (existing) existing.remove();
  const d = allDossiers.find(x => x.id === id);
  const gname = d && d.gestionnaire ? ' (attribué à <strong>' + d.gestionnaire + '</strong>)' : '';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'unlock-confirm-modal';
  const inner = document.createElement('div');
  inner.className = 'modal'; inner.style.cssText = 'text-align:center;max-width:420px';
  inner.innerHTML = '<div style="font-size:44px;margin-bottom:12px">🔓</div>'
    + '<h2 style="color:#e74c3c">Libérer ce dossier ?</h2>'
    + '<p style="color:#666;margin:16px 0">Cette action va <strong>désattribuer</strong> le dossier' + gname + ' et remettre son statut à <strong>Non attribué</strong>.</p>';
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:20px';
  const btnC = document.createElement('button'); btnC.className = 'btn btn-secondary'; btnC.textContent = 'Annuler';
  btnC.onclick = () => closeModal('unlock-confirm-modal');
  const btnO = document.createElement('button'); btnO.className = 'btn btn-danger'; btnO.textContent = '🔓 Confirmer la libération';
  btnO.onclick = () => confirmUnlock(id);
  btns.appendChild(btnC); btns.appendChild(btnO); inner.appendChild(btns); modal.appendChild(inner);
  document.body.appendChild(modal);
}

async function confirmUnlock(id) {
  closeModal('unlock-confirm-modal');
  const { error } = await db.from('dossiers').update({ verrouille: false, gestionnaire: '', statut: 'nonattribue' }).eq('id', id);
  if (error) { showNotif('Erreur lors du déverrouillage.', 'error'); return; }
  showNotif('🔓 Dossier déverrouillé et désattribué.', 'success');
  await loadDossiers();
  renderAttribution();
}

async function assignDossier(id, gestionnaire) {
  const { error } = await db.from('dossiers').update({ gestionnaire }).eq('id', id);
  if (error) { showNotif('Erreur lors de l\'attribution.', 'error'); return; }
  showNotif(gestionnaire ? `Dossier attribué à ${gestionnaire}` : 'Attribution annulée', 'success');
  allDossiers = allDossiers.map(d => d.id === id ? {...d, gestionnaire} : d);
}

async function toggleTraite(id, checked, gestionnaire) {
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const isManager = ['admin','manager'].includes(currentUserData.role);
  if (!isManager && gestionnaire !== monNom) {
    showNotif('Vous ne pouvez cocher que vos propres dossiers.', 'error');
    renderAttribution(); return;
  }
  // Gestionnaire peut décocher traité → statut ouvert, reste verrouillé
  // (isManager ou propriétaire du dossier)
  const newStatut = checked ? 'traite' : 'ouvert';
  const { error } = await db.from('dossiers').update({ traite: checked, statut: newStatut, traite_at: checked ? new Date().toISOString() : null }).eq('id', id);
  if (error) { showNotif('Erreur.', 'error'); return; }
  const dossierRef = (allDossiers.find(function(d){ return d.id === id; }) || {}).ref_sinistre || ('ID ' + id);
  await auditLog(checked ? 'MARQUER_TRAITE' : 'REMETTRE_EN_COURS', 'Réf. sinistre : ' + dossierRef);
  if (checked) {
    const dFound = allDossiers.find(function(d){ return d.id === id; });
    if (dFound && dFound.ref_sinistre) {
      await db.from('historique_sinistres').upsert(
        { ref_sinistre: dFound.ref_sinistre, gestionnaire: gestionnaire, date_traitement: new Date().toISOString().split('T')[0] },
        { onConflict: 'ref_sinistre', ignoreDuplicates: true }
      );
    }
  }
  
  showNotif(checked ? '✅ Dossier marqué traité' : '↩️ Dossier remis en cours', 'success');
  allDossiers = allDossiers.map(d => d.id === id ? {...d, traite: checked, statut: newStatut} : d);
}

// ===== RESET =====


