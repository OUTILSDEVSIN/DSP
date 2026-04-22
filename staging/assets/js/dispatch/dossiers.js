// ===== TOGGLE TRAITÉ DANS MES DOSSIERS =====
async function toggleTraiteMesDossiers(id, checked) {
  // Bloquer si dossier en troc actif
  if (isDossierEnTroc && isDossierEnTroc(id)) {
    showNotif('⇄ Ce dossier est impliqué dans un troc en cours. Attendez la fin du troc avant de le marquer traité.', 'error');
    await loadDossiers();
    renderMesDossiers();
    return;
  }
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
  const { data: fresh, error: errFresh } = await db.from('dossiers')
    .select('id, gestionnaire, statut, verrouille, ref_sinistre')
    .eq('id', dossierId).maybeSingle();
  if (errFresh) { showNotif('Erreur : ' + errFresh.message, 'error'); return; }
  if (!fresh) { showNotif('Dossier introuvable.', 'error'); return; }
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
  // 🔑 FIX : on est en train de re-rendre la page complète.
  // Si trocModeActive est resté true d'un état précédent (ex: après actionTroc),
  // setupTrocRowSelection() verrouille toutes les checkboxes traité.
  // On force la remise à zéro ici avant tout rendu.
  if (trocModeActive) {
    trocModeActive = false;
    dossiersSelectionnes = [];
  }

  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';
  await loadDossiers();
  await loadAllUsers();
  // Charger les trocs actifs pour badge
  if (typeof loadTrocsActifsDetails === 'function') await loadTrocsActifsDetails();
  var resHistoMD = await db.from('historique_sinistres').select('ref_sinistre, gestionnaire, date_traitement');
  window._historiqueMap = {};
  if (resHistoMD.data) resHistoMD.data.forEach(function(h){ window._historiqueMap[h.ref_sinistre] = h; });
  window._historiqueActif = true;
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const mesDossiers = allDossiers.filter(d => d.gestionnaire === monNom);

  // ===== BUG-001 FIX : POPUP MATIN =====
  var dossiersATraiter = mesDossiers.filter(function(d) { return !d.traite; });
  var dejaVuPopupMatin = safeSession.getItem('popup_matin_vu');

  // Dossiers DVOL en Action nécessaire pour ce gestionnaire
  var dvolActionNecessaire = [];
  try {
    if (typeof dvolDossiers !== 'undefined' && dvolDossiers.length > 0 && typeof dvolStatutVirtuel === 'function') {
      var monId = currentUserData?.id || null;
      dvolActionNecessaire = dvolDossiers.filter(function(d) {
        return dvolStatutVirtuel(d) === 'action_necessaire'
          && (!monId || d.gestionnaire_id === monId);
      });
    }
  } catch(e) { /* DVOL pas encore chargé */ }

  if ((dossiersATraiter.length > 0 || dvolActionNecessaire.length > 0) && !dejaVuPopupMatin) {
    safeSession.setItem('popup_matin_vu', '1');
    setTimeout(function() {
      if (document.getElementById('popup-matin-modal')) return;
      var popupMatin = document.createElement('div');
      popupMatin.className = 'modal-overlay';
      popupMatin.id = 'popup-matin-modal';
      popupMatin.style.zIndex = '6000';

      var dvolAlertHtml = '';
      if (dvolActionNecessaire.length > 0) {
        dvolAlertHtml = '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;margin:12px 0;text-align:left">'
          + '<div style="font-weight:700;color:#b45309;margin-bottom:8px">⚠️ ' + dvolActionNecessaire.length + ' dossier(s) VOL nécessitent une action</div>'
          + dvolActionNecessaire.map(function(d) {
              return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid #fde68a">'
                + '<span style="font-size:13px;color:#92400e;font-weight:600">' + (d.ref_sinistre || d.numero_dossier || '') + '</span>'
                + '<span style="font-size:12px;color:#92400e">' + (d.compagnie_mere || d.compagnie || '') + '</span>'
                + '</div>';
            }).join('')
          + '</div>';
      }

      popupMatin.innerHTML = '<div class="modal" style="max-width:440px;text-align:center">'
        + '<div style="font-size:44px;margin-bottom:8px">📋</div>'
        + '<h2 style="color:var(--navy)">Bonjour ' + currentUserData.prenom + ' !</h2>'
        + (dossiersATraiter.length > 0
            ? '<p style="color:#666;font-size:13px;margin:8px 0 4px">Tu as <strong>' + dossiersATraiter.length + ' dossier(s) à traiter</strong> aujourd\'hui.</p>'
            : '')
        + dvolAlertHtml
        + '<button class="btn btn-primary" style="width:100%;margin-top:16px" onclick=\"closeModal(\'popup-matin-modal\')\">C\'est parti ! 💪</button>'
        + '</div>';
      document.body.appendChild(popupMatin);
    }, 600);
  }
  // ===== FIN BUG-001 FIX =====

  // Bouton troc : visible pour gestionnaire et admin
  // 🔑 FIX badge dupliqué : on NE MET PLUS le <span> badge ici.
  // C'est rafraichirBadgeTroc() (appelé en fin de rendu) qui gère seul le badge numérique.
  const canTroc = ['gestionnaire', 'manager', 'admin'].includes(currentUserData.role);
  const btnTroc = canTroc
    ? `<button class="btn btn-secondary" id="btn-troc" onclick="onBtnTrocClick()" title="Trocs"
        style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-weight:600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M17 4l4 4-4 4"/><line x1="3" y1="8" x2="21" y2="8"/>
          <path d="M7 20l-4-4 4-4"/><line x1="21" y1="16" x2="3" y2="16"/>
        </svg>
        Troc
      </button>`
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
      <th class="troc-check-col" style="display:none;width:36px;text-align:center;">✓</th>
      <th>Réf. Sinistre</th><th style="white-space:nowrap">Date État</th><th>Réf. Contrat</th><th>Nature</th>
      <th>Portefeuille</th><th>Statut</th><th>Marquer traité</th>
    </tr></thead><tbody>`;
  if (!mesDossiers.length) {
    html += '<tr><td colspan="8"><div class="empty-state"><div class="icon">📭</div><p>Aucun dossier attribué pour le moment.</p></div></td></tr>';
  } else {
    const monNomMD = currentUserData.prenom + ' ' + currentUserData.nom;
    const histoMapMD = window._historiqueMap || {};
    const histoActifMD = window._historiqueActif !== false;
    var _recuperesMD = JSON.parse(safeSession.getItem('_recuperesMD') || '[]');
    var _recuperesSetMD = new Set(_recuperesMD.map(Number));

    // Tri par date_etat ascendant (plus ancienne en tête), nulls en dernier
    var parseDateEtat = function(s) {
      if (!s) return null;
      // Format dd/mm/yyyy
      var p = s.split('/');
      if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
      return new Date(s);
    };
    mesDossiers.sort(function(a, b) {
      // Les dossiers récupérés en autonomie restent en tête
      var aR = _recuperesSetMD.has(a.id) ? 0 : 1;
      var bR = _recuperesSetMD.has(b.id) ? 0 : 1;
      if (aR !== bR) return aR - bR;
      // Puis tri par date_etat ascendant
      var da = parseDateEtat(a.date_etat);
      var db2 = parseDateEtat(b.date_etat);
      if (!da && !db2) return 0;
      if (!da) return 1;
      if (!db2) return -1;
      return da - db2;
    });

    // Logique relances conservée pour les badges "🔄 Relancé" sur les lignes du tableau
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
          + '<button class="btn btn-primary" style="width:100%" onclick="closeModal(\'relance-notif-modal\')">✅ J\'ai compris</button>'
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
      // Badge troc en cours
      const enTroc = typeof isDossierEnTroc === 'function' && isDossierEnTroc(d.id);
      // Style de ligne
      let rowStyle = '';
      if (enTroc) rowStyle = 'background:#fffde7;border-left:3px solid #f39c12;';
      else if (isRelance) rowStyle = 'background:#fffde7;border-left:3px solid #f39c12';
      else if (dejaTraiteParMoi) rowStyle = 'background:#fffbea;border-left:3px solid #ffc107';
      html += `<tr
        data-dossier-id="${d.id}"
        data-dossier-nom="${d.ref_sinistre}"
        style="${rowStyle}">
        <td class="troc-check-col" style="display:none;text-align:center;">
          <input type="checkbox" class="row-check" style="width:16px;height:16px;accent-color:#f39c12;cursor:pointer;">
        </td>
        <td>
          <strong>${d.ref_sinistre}</strong>
          <button class="btn-copy" onclick="copyRef('${d.ref_sinistre}', '${statut}', '${d.id}', this)" title="Copier la référence">📋</button>
          ${enTroc ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #f39c12;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#e67e22;margin-left:4px">⇄ Troc en cours</span>' : ''}
          ${isRelance && !enTroc ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #f39c12;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#e67e22;margin-left:4px">🔄 Relancé</span>' : ''}
          ${dejaTraiteParMoi ? `<div style="margin-top:3px;display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#856404">📌 Déjà traité le ${new Date(histoEntryMD.date_traitement).toLocaleDateString('fr-FR')}</div>` : ''}
        </td>
        <td style="white-space:nowrap;font-size:12px;font-weight:600;color:#1B3461">
          ${d.date_etat ? `<span style="background:#e8f0fb;border-radius:5px;padding:3px 8px">&#128197; ${d.date_etat}</span>` : '<span style="color:#bbb">--</span>'}
        </td>
        <td>${d.ref_contrat}</td>
        <td>${d.nature_label || d.nature}</td>
        <td>${d.portefeuille}</td>
        <td>${statutBadge(d.statut, d.verrouille)}</td>
        <td style="text-align:center">
          ${enTroc
            ? `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
                <input type="checkbox" class="traite-checkbox" ${d.traite?'checked':''}
                  style="width:17px;height:17px;accent-color:var(--rose);cursor:not-allowed;opacity:.4"
                  disabled title="Troc en cours — action bloquée">
                <span style="font-size:9px;color:#e67e22;font-weight:700">⇄ Troc</span>
               </div>`
            : `<input type="checkbox" class="traite-checkbox" ${d.traite?'checked':''}
                style="width:17px;height:17px;accent-color:var(--rose);cursor:pointer"
                onchange="toggleTraiteMesDossiers('${d.id}', this.checked)">`
          }
        </td>
      </tr>`;
    });
  }
  html += '</tbody></table></div>';
  document.getElementById('main-content').innerHTML = html;
  // Réinitialiser le badge troc après rendu (seul responsable du badge numérique)
  if (typeof rafraichirBadgeTroc === 'function') rafraichirBadgeTroc();
  // Activer la sélection de lignes pour le mode troc (trocModeActive est false ici → pas de verrouillage)
  if (typeof setupTrocRowSelection === 'function') setupTrocRowSelection();
}
