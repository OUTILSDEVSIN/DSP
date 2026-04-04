// ===== DASHBOARD =====

// ── T2 -- LIBÉRER UN GESTIONNAIRE ─────────────────────────────────
function showReleaseManager(nom) {
  const dossiers = allDossiers.filter(d => d.gestionnaire === nom && !d.traite);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'release-modal';
  const inner = document.createElement('div'); inner.className = 'modal';
  inner.style.cssText = 'text-align:center;max-width:440px';
  inner.innerHTML = '<div style="font-size:44px;margin-bottom:12px">🔓</div>'
    + '<h2 style="color:#e74c3c">Libérer ' + nom + ' ?</h2>'
    + '<p style="color:#666;margin:16px 0">Cette action va libérer <strong>' + dossiers.length + ' dossier(s) non traité(s)</strong> et les remettre disponibles.</p>'
    + (dossiers.length === 0 ? '<p style="color:#27ae60;font-weight:600">✅ Aucun dossier non traité à libérer.</p>' : '');
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:20px';
  const btnC = document.createElement('button'); btnC.className = 'btn btn-secondary'; btnC.textContent = 'Annuler';
  btnC.onclick = () => closeModal('release-modal');
  btns.appendChild(btnC);
  if (dossiers.length > 0) {
    const btnO = document.createElement('button'); btnO.className = 'btn btn-danger';
    btnO.textContent = '🔓 Confirmer la libération';
    btnO.onclick = () => doReleaseManager(nom);
    btns.appendChild(btnO);
  }
  inner.appendChild(btns); modal.appendChild(inner); document.body.appendChild(modal);
}

async function doReleaseManager(nom) {
  closeModal('release-modal');
  const dossiers = allDossiers.filter(d => d.gestionnaire === nom && !d.traite);
  let ok = 0;
  for (const d of dossiers) {
    const { error } = await db.from('dossiers').update({ gestionnaire: '', verrouille: false, statut: 'nonattribue' }).eq('id', d.id);
    if (!error) ok++;
  }
  showNotif('🔓 ' + ok + ' dossier(s) libéré(s) pour ' + nom, 'success');
  await loadDossiers(); renderDashboard();
}


// ── T4 -- RÉINITIALISATION ────────────────────────────────────────
function showResetMenu() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'reset-modal';
  const inner = document.createElement('div'); inner.className = 'modal';
  inner.style.cssText = 'text-align:center;max-width:440px';
  inner.innerHTML = '<div style="font-size:44px;margin-bottom:12px">⚙️</div>'
    + '<h2 style="color:#e74c3c">Réinitialisation</h2>'
    + '<p style="color:#666;margin:16px 0">Choisissez le type de réinitialisation :</p>';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-top:20px';
  const b1 = document.createElement('button'); b1.className = 'btn btn-warning';
  b1.innerHTML = '🔄 Réinitialiser les attributions<br><small style="font-weight:400;opacity:0.8">Supprime toutes les attributions, remet les statuts à zéro</small>';
  b1.onclick = () => showResetConfirm('attributions');
  const b2 = document.createElement('button'); b2.className = 'btn btn-danger';
  b2.innerHTML = '💣 Réinitialisation complète<br><small style="font-weight:400;opacity:0.8">Supprime TOUTES les données importées</small>';
  b2.onclick = () => showResetConfirm('complet');
  const b3 = document.createElement('button'); b3.className = 'btn btn-secondary';
  b3.style.marginTop = '4px'; b3.textContent = 'Annuler';
  b3.onclick = () => closeModal('reset-modal');
  wrap.appendChild(b1); wrap.appendChild(b2); wrap.appendChild(b3);
  inner.appendChild(wrap); modal.appendChild(inner); document.body.appendChild(modal);
}

function showResetConfirm(type) {
  closeModal('reset-modal');
  const isComplet = type === 'complet';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'reset-confirm-modal';
  const inner = document.createElement('div'); inner.className = 'modal';
  inner.style.cssText = 'text-align:center;max-width:420px';
  inner.innerHTML = '<div style="font-size:44px;margin-bottom:12px">' + (isComplet ? '💣' : '🔄') + '</div>'
    + '<h2 style="color:#e74c3c">' + (isComplet ? 'Réinitialisation COMPLÈTE' : 'Réinitialiser les attributions') + '</h2>'
    + '<p style="color:#666;margin:16px 0">' + (isComplet
      ? '⚠️ <strong>ATTENTION !</strong> Cette action supprimera <strong>tous les dossiers</strong>. Cette action est <strong>irréversible</strong>.'
      : 'Toutes les attributions seront supprimées et les statuts remis à zéro.') + '</p>'
    + (isComplet ? '<p style="color:#e74c3c;font-weight:700;font-size:15px">Tapez CONFIRMER pour valider :</p><input type="text" id="reset-confirm-input" placeholder="CONFIRMER" style="width:100%;padding:10px;border:2px solid #e74c3c;border-radius:8px;font-size:15px;text-align:center;margin-bottom:16px">' : '');
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:8px';
  const btnC = document.createElement('button'); btnC.className = 'btn btn-secondary'; btnC.textContent = 'Annuler';
  btnC.onclick = () => closeModal('reset-confirm-modal');
  const btnO = document.createElement('button'); btnO.className = 'btn btn-danger';
  btnO.textContent = isComplet ? '💣 Supprimer tout' : '🔄 Confirmer la réinitialisation';
  btnO.onclick = () => doReset(type);
  btns.appendChild(btnC); btns.appendChild(btnO);
  inner.appendChild(btns); modal.appendChild(inner); document.body.appendChild(modal);
}

async function doReset(type) {
  if (type === 'complet') {
    const input = document.getElementById('reset-confirm-input');
    if (!input || input.value.trim() !== 'CONFIRMER') {
      showNotif('Tapez CONFIRMER pour valider.', 'error'); return;
    }
    closeModal('reset-confirm-modal');
    // Supprimer par batch via IDs réels
  await loadDossiers();
  const allIds = allDossiers.map(d => d.id);
  if (allIds.length === 0) { showNotif('Aucun dossier à supprimer.', 'info'); return; }
  const { error } = await db.from('dossiers').delete().in('id', allIds);
    if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
    await auditLog('RESET_COMPLET', allIds.length + ' dossiers supprimés définitivement');
    showNotif('💣 ' + allIds.length + ' dossiers supprimés.', 'success');
  } else {
    closeModal('reset-confirm-modal');
    await loadDossiers();
  const allIds2 = allDossiers.map(d => d.id);
  if (allIds2.length === 0) { showNotif('Aucun dossier à réinitialiser.', 'info'); return; }
  const { error } = await db.from('dossiers').update({ gestionnaire: '', verrouille: false, statut: 'nonattribue', traite: false }).in('id', allIds2);
    if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
    await auditLog('RESET_PARTIEL', allIds2.length + ' dossiers réinitialisés');
    showNotif('🔄 ' + allIds2.length + ' dossiers réinitialisés.', 'success');
  }
  await loadDossiers(); renderDashboard();
}

async function renderDashboard() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';
  await loadDossiers();
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  // Filtre 3 mois pour les stats
  const cutoff3m = new Date(); cutoff3m.setMonth(cutoff3m.getMonth() - 3);
  const dos3m = allDossiers.filter(d => !d.created_at || new Date(d.created_at) >= cutoff3m);
  const total = dos3m.length;
  const traites = dos3m.filter(d => d.traite).length;
  const nonAttribues = dos3m.filter(d => !d.gestionnaire).length;
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const mesDossiers = dos3m.filter(d => d.gestionnaire === monNom);
  const mesTraites = mesDossiers.filter(d => d.traite).length;

  let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><h2 style="color:var(--navy);margin:0">Tableau de bord</h2><span style="font-size:12px;color:#888;background:#f0f4f8;padding:4px 12px;border-radius:12px">📅 Statistiques des 3 derniers mois</span></div><div class="stats-grid">';
  // Tous les rôles voient les stats générales
  html += `
      <div class="stat-card"><div class="number">${total}</div><div class="label">Total dossiers</div></div>
      <div class="stat-card"><div class="number" style="color:#27ae60">${traites}</div><div class="label">Traités</div></div>
      <div class="stat-card"><div class="number" style="color:#e67e22">${total - traites}</div><div class="label">En cours</div></div>
      <div class="stat-card"><div class="number" style="color:#e74c3c">${nonAttribues}</div><div class="label">Non attribués</div></div>`;
  html += `
    <div class="stat-card"><div class="number">${mesDossiers.length}</div><div class="label">Mes dossiers</div></div>
    <div class="stat-card"><div class="number" style="color:#27ae60">${mesTraites}</div><div class="label">Mes dossiers traités</div></div>
  </div>`;

  if (total > 0) {
    const canRelease = (role === 'admin' || role === 'manager');
    // Colonne Libérer uniquement pour admin/manager
    const theadLiberer = canRelease ? '<th></th>' : '';
    html += `<div class="table-container"><div class="table-toolbar
<button class="btn-troc troc-btn" id="btn-troc" onclick="toggleTrocMode()" style="display:none;">
  ↔️ Troc
</button>
"><h2>Répartition par gestionnaire</h2></div><table>
      <thead><tr><th>Gestionnaire</th><th>Rôle</th><th>Total</th><th>Traités</th><th>En cours</th><th>Progression</th>${theadLiberer}</tr></thead><tbody>`;
    const membres = allUsers.filter(function(g) {
      var nom = g.prenom + ' ' + g.nom;
      return dos3m.some(function(d) { return d.gestionnaire === nom; });
    }); // Seulement les membres avec au moins 1 dossier dans les 3 derniers mois
    membres.forEach(g => {
      const nom = g.prenom + ' ' + g.nom;
      const t = dos3m.filter(d => d.gestionnaire === nom).length;
      const tr = dos3m.filter(d => d.gestionnaire === nom && d.traite).length;
      const pct = t > 0 ? Math.round(tr / t * 100) : 0;
      const tdLiberer = canRelease ? `<td><button class="btn btn-warning" style="padding:4px 12px;font-size:12px" onclick="showReleaseManager('${nom}')">🔓 Libérer</button></td>` : '';
      html += `<tr><td><strong>${nom}</strong></td><td><span class="badge role-${g.role}" style="padding:3px 8px;border-radius:10px;font-size:11px">${g.role}</span></td>
        <td>${t}</td><td>${tr}</td><td>${t - tr}</td>
        <td><div style="display:flex;align-items:center;gap:8px">
        <div style="background:#eee;border-radius:10px;height:8px;width:80px">
        <div style="background:#27ae60;height:8px;border-radius:10px;width:${pct}%"></div></div>
        <small style="color:#888">${pct}%</small></div></td>${tdLiberer}</tr>`;
    });
    html += '</tbody></table></div>';
  }
  document.getElementById('main-content').innerHTML = html;
}

