// ===== TOGGLE TRAITÉ DANS MES DOSSIERS =====
async function toggleTraiteMesDossiers(id, checked) {
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

// ===== ENVOYER VERS DVOL =====
function dvolOuvrirFormulaire(dossierId) {
  const d = (allDossiers || []).find(x => String(x.id) === String(dossierId));
  if (!d) return;

  document.getElementById('dvol-envoi-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'dvol-envoi-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;';

  const docsHtml = [
    { key:'questionnaire_vol',  label:'Questionnaire VOL',                    icon:'\uD83D\uDCCB' },
    { key:'certificat_cession', label:'Certificat de cession / carte grise',  icon:'\uD83D\uDCC4' },
    { key:'non_gage',           label:'Non-gage (ANTS)',                       icon:'\uD83D\uDCC4' },
    { key:'controle_technique', label:'Contr\u00f4le technique',               icon:'\uD83D\uDD27' },
    { key:'facture_achat',      label:'Facture d\'achat du v\u00e9hicule',    icon:'\uD83E\uDDFE' },
    { key:'facture_entretien',  label:'Facture(s) d\'entretien',              icon:'\uD83E\uDDFE' }
  ].map(doc => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;cursor:pointer;">
      <input type="checkbox" name="dvol_doc" value="${doc.key}" style="width:16px;height:16px;accent-color:var(--rose);flex-shrink:0;">
      <span style="font-size:13px;">${doc.icon} ${doc.label}</span>
    </label>`
  ).join('');

  overlay.innerHTML = `
  <div style="background:white;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.2);width:100%;max-width:520px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,var(--navy,#1a2e4a),#2a4a6e);color:white;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:16px;font-weight:800;">\uD83D\uDE97 Envoyer vers DVOL</div>
        <div style="font-size:12px;opacity:.8;margin-top:2px;">Dossier ${d.ref_sinistre} \u00b7 ${d.portefeuille||'\u2014'}</div>
      </div>
      <button onclick="document.getElementById('dvol-envoi-modal').remove()" style="background:rgba(255,255,255,.15);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;">\u00d7</button>
    </div>
    <div style="padding:20px 22px;display:flex;flex-direction:column;gap:16px;">
      <div>
        <label style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">\uD83D\uDCC5 Date de d\u00e9claration du vol *</label>
        <input type="date" id="dvol-date-declaration"
          value="${new Date().toISOString().split('T')[0]}"
          max="${new Date().toISOString().split('T')[0]}"
          style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-size:14px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">\uD83C\uDFE2 Compagnie d'assurance *</label>
        <select id="dvol-compagnie-mere" style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-size:14px;box-sizing:border-box;background:white;cursor:pointer;">
          <option value="">-- S\u00e9lectionner la compagnie --</option>
          <option value="CMAM">CMAM</option>
          <option value="ALLIANZ">Allianz</option>
          <option value="EQUITE">\u00c9quit\u00e9</option>
        </select>
      </div>
      <div>
        <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">\uD83D\uDCCE Documents d\u00e9j\u00e0 en votre possession</div>
        <div style="display:flex;flex-direction:column;gap:6px;">${docsHtml}</div>
      </div>
      <div style="display:flex;gap:8px;padding-top:4px;">
        <button onclick="document.getElementById('dvol-envoi-modal').remove()" class="btn btn-secondary" style="flex:1;">Annuler</button>
        <button onclick="dvolValiderEnvoi('${d.id}')" class="btn btn-primary" style="flex:2;">\uD83D\uDE97 Valider l'envoi vers DVOL</button>
      </div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function dvolValiderEnvoi(dossierId) {
  const d = (allDossiers || []).find(x => String(x.id) === String(dossierId));
  if (!d) return;

  const dateDecl = document.getElementById('dvol-date-declaration')?.value;
  if (!dateDecl) { showNotif('\u26A0\uFE0F Veuillez renseigner la date de d\u00e9claration.', 'error'); return; }

  const compagnieMere = document.getElementById('dvol-compagnie-mere')?.value;
  if (!compagnieMere) { showNotif('\u26A0\uFE0F Veuillez s\u00e9lectionner la compagnie d\'assurance.', 'error'); return; }

  const docsChecked = [...document.querySelectorAll('input[name="dvol_doc"]:checked')].map(i => i.value);

  // 1. R\u00e9cup\u00e9rer l'ID du gestionnaire connect\u00e9
  const { data: userRow } = await db.from('utilisateurs')
    .select('id')
    .eq('prenom', currentUserData.prenom)
    .eq('nom', currentUserData.nom)
    .maybeSingle();
  const gestionnaireId = userRow?.id || null;

  // 2. G\u00e9n\u00e9rer le num\u00e9ro de dossier DVOL
  const numeroVol = 'VOL-' + new Date().getFullYear() + '-' + String(d.id).padStart(5,'0');

  // 3. Cr\u00e9er le dossier dans dvol_dossiers
  const { data: dvolRow, error: errDvol } = await db.from('dvol_dossiers').insert({
    numero_dossier:           numeroVol,
    dispatch_dossier_id:      d.id,
    ref_sinistre:             d.ref_sinistre,
    compagnie:                d.portefeuille,
    compagnie_mere:           compagnieMere,
    date_declaration:         dateDecl,
    statut:                   'en_attente_documents',
    gestionnaire_id:          gestionnaireId,
    documents_recus_liste:    docsChecked,
    documents_recus:          docsChecked.length === 6,
    date_reception_documents: docsChecked.length === 6 ? new Date().toISOString().split('T')[0] : null,
    created_at:               new Date().toISOString(),
    updated_at:               new Date().toISOString()
  }).select().single();

  if (errDvol) { showNotif('Erreur cr\u00e9ation dossier DVOL : ' + errDvol.message, 'error'); return; }

  // 4. Marquer is_dvol dans dossiers dispatch
  await db.from('dossiers').update({
    is_dvol: true,
    date_passage_dvol: new Date().toISOString()
  }).eq('id', dossierId);

  // 5. Cr\u00e9er les \u00e9tapes de suivi depuis le template
  const { data: etapesTemplate } = await db.from('dvol_etapes_template')
    .select('*').eq('actif', true).order('ordre');

  if (etapesTemplate && etapesTemplate.length > 0 && dvolRow?.id) {
    const debut = new Date(dateDecl + 'T12:00:00');
    const etapesAInserer = etapesTemplate.map(e => {
      const datePrevue = new Date(debut);
      datePrevue.setDate(datePrevue.getDate() + (e.delai_jours || 0));
      return {
        dossier_id:  dvolRow.id,
        etape_id:    e.id,
        statut:      'en_attente',
        date_prevue: datePrevue.toISOString().split('T')[0],
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString()
      };
    });
    await db.from('dvol_suivi_etapes').insert(etapesAInserer);
  }

  // 6. Audit log
  await auditLog('ENVOI_DVOL', 'Dossier ' + d.ref_sinistre + ' envoy\u00e9 vers DVOL \u2192 ' + numeroVol + ' (' + compagnieMere + ')');

  document.getElementById('dvol-envoi-modal')?.remove();
  showNotif('\u2705 Dossier envoy\u00e9 vers DVOL (' + numeroVol + ')', 'success');

  // 7. Basculer automatiquement sur l'outil DVOL
  setTimeout(() => switchTool('dvol'), 800);
}
// ===== FIN ENVOYER VERS DVOL =====

// ===== MES DOSSIERS =====
async function renderMesDossiers() {
  if (trocModeActive) {
    trocModeActive = false;
    dossiersSelectionnes = [];
  }

  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';
  await loadDossiers();
  await loadAllUsers();
  if (typeof loadTrocsActifsDetails === 'function') await loadTrocsActifsDetails();
  var resHistoMD = await db.from('historique_sinistres').select('ref_sinistre, gestionnaire, date_traitement');
  window._historiqueMap = {};
  if (resHistoMD.data) resHistoMD.data.forEach(function(h){ window._historiqueMap[h.ref_sinistre] = h; });
  window._historiqueActif = true;
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const mesDossiers = allDossiers.filter(d => d.gestionnaire === monNom);

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
    <div class="stat-card"><div class="number" style="color:#27ae60">${mesDossiers.filter(d=>d.traite).length}</div><div class="label">Trait\u00e9s</div></div>
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
      <span id="troc-count" style="font-weight:600;color:#e67e22;">0 dossier s\u00e9lectionn\u00e9</span>
      <button class="btn btn-primary" id="btn-troc-proposer" onclick="openTrocModal()" disabled style="padding:6px 14px;">\u2709\uFE0F Envoyer la proposition</button>
      <button class="btn btn-secondary" onclick="toggleTrocMode()" style="padding:6px 14px;">Annuler</button>
    </div>
    <table><thead><tr>
      <th class="troc-check-col" style="display:none;width:36px;text-align:center;">\u2713</th>
      <th>R\u00e9f. Sinistre</th><th>R\u00e9f. Contrat</th><th>Nature</th>
      <th>Portefeuille</th><th>Statut</th><th>Marquer trait\u00e9</th><th>VOL</th>
    </tr></thead><tbody>`;

  if (!mesDossiers.length) {
    html += '<tr><td colspan="8"><div class="empty-state"><div class="icon">\uD83D\uDCED</div><p>Aucun dossier attribu\u00e9 pour le moment.</p></div></td></tr>';
  } else {
    const monNomMD = currentUserData.prenom + ' ' + currentUserData.nom;
    const histoMapMD = window._historiqueMap || {};
    const histoActifMD = window._historiqueActif !== false;
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
          + '<div style="font-size:44px;margin-bottom:8px">\uD83D\uDD04</div>'
          + '<h2 style="color:#e67e22">Dossier(s) relanc\u00e9(s)</h2>'
          + '<p style="color:#666;font-size:13px;margin:8px 0 16px">Le manager a import\u00e9 une nouvelle remont\u00e9e.<br>Les dossiers suivants n\u00e9cessitent votre attention :</p>'
          + '<ul style="text-align:left;margin:0 0 16px 16px;padding:0">' + notifHtml + '</ul>'
          + '<button class="btn btn-primary" style="width:100%" onclick="closeModal(\'relance-notif-modal\')">J\'ai compris</button>'
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
      const enTroc = typeof isDossierEnTroc === 'function' && isDossierEnTroc(d.id);
      let rowClass = '';
      if (enTroc)                rowClass = 'row-troc';
      else if (isRelance)        rowClass = 'row-relance';
      else if (dejaTraiteParMoi) rowClass = 'row-deja-traite';

      const dvolCell = d.is_dvol
        ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;color:#16a34a;">\u2705 Dans DVOL</span>`
        : `<button onclick="dvolOuvrirFormulaire('${d.id}')" title="Envoyer ce dossier vers DVOL"
            style="background:none;border:1.5px solid #2563eb;color:#2563eb;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;padding:4px 10px;white-space:nowrap;transition:all .15s;"
            onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='none'">\uD83D\uDE97 DVOL</button>`;

      html += `<tr
        data-dossier-id="${d.id}"
        data-dossier-nom="${d.ref_sinistre}"
        class="${rowClass}">
        <td class="troc-check-col" style="display:none;text-align:center;">
          <input type="checkbox" class="row-check" style="width:16px;height:16px;accent-color:#f39c12;cursor:pointer;">
        </td>
        <td>
          <strong>${d.ref_sinistre}</strong>
          <button class="btn-copy" onclick="copyRef('${d.ref_sinistre}', '${statut}', '${d.id}', this)" title="Copier la r\u00e9f\u00e9rence">\uD83D\uDCCB</button>
          ${enTroc ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #f39c12;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#e67e22;margin-left:4px">\u21c4 Troc en cours</span>' : ''}
          ${isRelance && !enTroc ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #f39c12;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#e67e22;margin-left:4px">\uD83D\uDD04 Relanc\u00e9</span>' : ''}
          ${dejaTraiteParMoi ? `<div style="margin-top:3px;display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#856404">\uD83D\uDCCC D\u00e9j\u00e0 trait\u00e9 le ${new Date(histoEntryMD.date_traitement).toLocaleDateString('fr-FR')}</div>` : ''}
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
                  disabled title="Troc en cours \u2014 action bloqu\u00e9e">
                <span style="font-size:9px;color:#e67e22;font-weight:700">\u21c4 Troc</span>
               </div>`
            : `<input type="checkbox" class="traite-checkbox" ${d.traite?'checked':''}
                style="width:17px;height:17px;accent-color:var(--rose);cursor:pointer"
                onchange="toggleTraiteMesDossiers('${d.id}', this.checked)">`
          }
        </td>
        <td style="text-align:center;">${dvolCell}</td>
      </tr>`;
    });
  }
  html += '</tbody></table></div>';
  document.getElementById('main-content').innerHTML = html;
  if (typeof rafraichirBadgeTroc === 'function') rafraichirBadgeTroc();
  if (typeof setupTrocRowSelection === 'function') setupTrocRowSelection();
}
