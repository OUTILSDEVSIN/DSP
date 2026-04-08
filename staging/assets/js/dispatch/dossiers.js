// ===== TOGGLE TRAITÉ DANS MES DOSSIERS =====
async function toggleTraiteMesDossiers(id, checked) {
  const newStatut = checked ? 'traite' : 'ouvert';
  const { error } = await db.from('dossiers').update({
    traite: checked,
    statut: newStatut,
    traite_at: checked ? new Date().toISOString() : null
  }).eq('id', id);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  if (checked) {
    const d = (allDossiers || []).find(x => String(x.id) === String(id));
    if (d) {
      await db.from('historique_sinistres').upsert(
        { ref_sinistre: d.ref_sinistre, gestionnaire: currentUserData.prenom + ' ' + currentUserData.nom, date_traitement: new Date().toISOString().split('T')[0] },
        { onConflict: 'ref_sinistre', ignoreDuplicates: true }
      );
    }
  }
  await auditLog(checked ? 'TRAITEMENT_DOSSIER' : 'REOUVERTURE_DOSSIER',
    (checked ? 'Dossier marqué traité' : 'Dossier réouvert') + ' -- id:' + id);
  showNotif(checked ? '✅ Dossier marqué comme traité.' : '🔄 Dossier réouvert.', 'success');
  await loadDossiers();
  renderMesDossiers();
}
// ===== FIN TOGGLE TRAITÉ MES DOSSIERS =====
// ===== RÉCUPÉRER UN DOSSIER (gestionnaire) =====
async function recupererDossier(dossierId) {
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  // Vérification concurrence : relire le dossier en base
  const { data: fresh, error: errFresh } = await db.from('dossiers')
    .select('id, gestionnaire, statut, verrouille, ref_sinistre')
    .eq('id', dossierId).maybeSingle();
  if (errFresh) { showNotif('Erreur : ' + errFresh.message, 'error'); return; }
  if (!fresh) { showNotif('Dossier introuvable.', 'error'); return; }
  // Premier arrivé premier servi
  if (fresh.gestionnaire && fresh.gestionnaire !== '') {
    showNotif('⚠️ Ce dossier vient d\'être récupéré par ' + fresh.gestionnaire + '.', 'error');
    await loadDossiers(); renderAttribution(); return;
  }
  const { error } = await db.from('dossiers').update({
    gestionnaire: monNom,
    statut: 'attribue',
    verrouille: true
  }).eq('id', dossierId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  await auditLog('RECUPERATION_DOSSIER', 'Dossier ' + (fresh.ref_sinistre||dossierId) + ' récupéré en autonomie');
  showNotif('✅ Dossier ' + (fresh.ref_sinistre||'') + ' ajouté à vos dossiers !', 'success');
  await loadDossiers();
  renderAttribution();
}
// ===== FIN RÉCUPÉRER DOSSIER =====
// ===== MES DOSSIERS =====
async function renderMesDossiers() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';
  await loadDossiers();
  await loadAllUsers();
  var resHistoMD = await db.from('historique_sinistres').select('ref_sinistre, gestionnaire, date_traitement');
  window._historiqueMap = {};
  if (resHistoMD.data) resHistoMD.data.forEach(function(h){ window._historiqueMap[h.ref_sinistre] = h; });
  window._historiqueActif = true;
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const mesDossiers = allDossiers.filter(d => d.gestionnaire === monNom);

  // Bouton troc visible pour gestionnaires ET admins
  const canTroc = ['gestionnaire', 'admin'].includes(currentUserData.role);
  const btnTroc = canTroc
    ? '<button class="btn btn-secondary" id="btn-troc" onclick="toggleTrocMode()" style="display:inline-flex;align-items:center;gap:6px;">&#x21C4; Proposer un troc</button>'
    : '';

  let html = `<div class="stats-grid">
    <div class="stat-card"><div class="number">${mesDossiers.length}</div><div class="label">Mes dossiers</div></div>
    <div class="stat-card"><div class="number" style="color:#27ae60">${mesDossiers.filter(d=>d.traite).length}</div><div class="label">Traités</div></div>
    <div class="stat-card"><div class="number" style="color:#e67e22">${mesDossiers.filter(d=>!d.traite).length}</div><div class="label">En cours</div></div>
  </div>
  <div class="table-container">
    <div class="table-toolbar">
      <h2>Mes dossiers</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-demander-supp" onclick="demanderDossierSupp()">&#10133; Demander un dossier suppl&eacute;mentaire</button>
        ${btnTroc}
      </div>
    </div>
    <div id="troc-selection-bar" style="display:none;align-items:center;gap:12px;padding:10px 16px;background:#fff8e1;border:1px solid #f39c12;border-radius:8px;margin-bottom:12px;">
      <span id="troc-count" style="font-weight:600;color:#e67e22;">0 dossier sélectionné</span>
      <button class="btn btn-primary" id="btn-troc-proposer" onclick="openTrocModal()" disabled style="padding:6px 14px;">✉️ Envoyer la proposition</button>
      <button class="btn btn-secondary" onclick="toggleTrocMode()" style="padding:6px 14px;">Annuler</button>
    </div>
    <table><thead><tr>
      <th>Réf. Sinistre</th><th>Réf. Contrat</th><th>Nature</th>
      <th>Portefeuille</th><th>Statut</th><th>Marquer traité</th>
    </tr></thead><tbody>`;
  if (!mesDossiers.length) {
    html += '<tr><td colspan="6"><div class="empty-state"><div class="icon">📭</div><p>Aucun dossier attribué pour le moment.</p></div></td></tr>';
  } else {
    const monNomMD = currentUserData.prenom + ' ' + currentUserData.nom;
    const histoMapMD = window._historiqueMap || {};
    const histoActifMD = window._historiqueActif !== false;
    function _isPrioMD(d) {
      var pf  = (d.portefeuille||'').toUpperCase();
      var tp  = (d.type||'').toUpperCase();
      var nat = (d.nature_label||d.nature||'').toUpperCase();
      var hasRef = histoActifMD && histoMapMD[d.ref_sinistre] && histoMapMD[d.ref_sinistre].gestionnaire === monNomMD;
      return pf.includes('OPTINEO') || tp.includes('MRH') || tp.includes('HABITATION')
          || nat.includes('BRIS DE GLACE') || nat.includes('BDG') || hasRef;
    }
    var _recuperesMD = JSON.parse(safeSession.getItem('_recuperesMD') || '[]');
    var _recuperesSetMD = new Set(_recuperesMD.map(Number));
    mesDossiers.sort(function(a, b) {
      var aR = _recuperesSetMD.has(a.id) ? 1 : 0;
      var bR = _recuperesSetMD.has(b.id) ? 1 : 0;
      if (aR !== bR) return aR - bR;
      return (a.id || 0) - (b.id || 0);
    });
    const relancesRefs = JSON.parse(safeSession.getItem('relances_notif') || '[]');

    const mesRelances = mesDossiers.filter(d => relancesRefs.includes(d.ref_sinistre));
    if (mesRelances.length > 0) {
      setTimeout(function() {
        var notifHtml = mesRelances.map(r => '<li style="font-size:13px"><strong>' + r.ref_sinistre + '</strong></li>').join('');
        var relanceModal = document.createElement('div');
        relanceModal.className = 'modal-overlay';
        relanceModal.id = 'relance-notif-modal';
        relanceModal.style.zIndex = 6000;
        relanceModal.innerHTML = '<div class="modal" style="max-width:420px;text-align:center">'
          + '<div style="font-size:44px;margin-bottom:8px">🔄</div>'
          + '<h2 style="color:#e67e22">Dossier(s) relancé(s)</h2>'
          + '<p style="color:#666;font-size:13px;margin:8px 0 16px">Le manager a importé une nouvelle remontée.<br>Les dossiers suivants nécessitent votre attention :</p>'
          + '<ul style="text-align:left;margin:0 0 16px 16px;padding:0">' + notifHtml + '</ul>'
          + '<button class="btn btn-primary" style="width:100%" onclick="closeModal(&apos;relance-notif-modal&apos;)">✅ J\'ai compris</button>'
          + '</div>';
        document.body.appendChild(relanceModal);
        safeSession.setItem('relances_notif', JSON.stringify(
          relancesRefs.filter(r => !mesRelances.map(d => d.ref_sinistre).includes(r))
        ));
      }, 500);
    }

    mesDossiers.forEach(d => {
      const statut = d.statut || 'nonattribue';
      const canSee = ['attribue','encours','ouvert','traite'].includes(statut);
      if (!canSee) return;
      const histoEntryMD = histoActifMD ? histoMapMD[d.ref_sinistre] : null;
      const dejaTraiteParMoi = histoEntryMD && histoEntryMD.gestionnaire === monNomMD;
      const isRelance = relancesRefs.includes(d.ref_sinistre) || (statut === 'ouvert' && !d.traite);
      html += `<tr style="${isRelance ? 'background:#fffde7;border-left:3px solid #f39c12' : (dejaTraiteParMoi ? 'background:#fffbea;border-left:3px solid #ffc107' : '')}">
        <td><strong>${d.ref_sinistre}</strong>
          <button class="btn-copy" onclick="copyRef('${d.ref_sinistre}', '${statut}', '${d.id}', this)" title="Copier la référence">📋</button>
          ${isRelance ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #f39c12;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#e67e22;margin-left:4px">🔄 Relancé</span>' : ''}
          ${dejaTraiteParMoi ? `<div style="margin-top:3px;display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#856404">📌 Déjà traité le ${new Date(histoEntryMD.date_traitement).toLocaleDateString('fr-FR')}</div>` : ''}
        </td>
        <td>${d.ref_contrat}</td>
        <td>${d.nature_label || d.nature}</td>
        <td>${d.portefeuille}</td>
        <td>${statutBadge(d.statut, d.verrouille)}</td>
        <td style="text-align:center">
          <input type="checkbox" class="traite-checkbox" ${d.traite?'checked':''}
            style="width:17px;height:17px;accent-color:var(--rose);cursor:pointer"
            onchange="toggleTraiteMesDossiers('${d.id}', this.checked)">
        </td>
      </tr>`;
    });
  }
  html += '</tbody></table></div>';
  document.getElementById('main-content').innerHTML = html;
}
