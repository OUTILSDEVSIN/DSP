/* core.js — Dispatchis v2.5.61 — Logique principale : tabs, dashboard, dispatch, attribution */

// ===== TABS =====
function buildTabs() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const tabs = [{ id: 'dashboard', label: '📊 Tableau de bord' }];
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'import', label: '📂 Importer Excel' });
  tabs.push({ id: 'attribution', label: '📋 Attribution' });
  tabs.push({ id: 'mesdossiers', label: '📁 Mes dossiers' });
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'utilisateurs', label: '👥 Équipe' });
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'audit', label: '🔍 Journal d\'audit' });
  tabs.push({ id: 'stats', label: '📊 Stats' });
  const container = document.getElementById('tabs-container');
  container.innerHTML = tabs.map(t =>
    `<div class="tab" id="tab-${t.id}" onclick="showTab('${t.id}')">${t.label}</div>`
  ).join('');
}

function showTab(id) {
  // Reset filtres seulement si on QUITTE attribution
  if (currentTab === 'attribution' && id !== 'attribution') {
    searchQuery = '';
    window._fPortefeuille = ''; window._fType = ''; window._fNature = '';
    window._fStatut = ''; window._fGestionnaire = ''; window._fNonAttribue = false;
  }
  currentTab = id;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('tab-' + id);
  if (el) el.classList.add('active');
  if (id === 'dashboard') renderDashboard();
  else if (id === 'import') renderImport();
  else if (id === 'attribution') renderAttribution();
  else if (id === 'mesdossiers') renderMesDossiers();
  else if (id === 'utilisateurs') renderUtilisateurs();
  else if (id === 'audit') renderAuditLogs();
  else if (id === 'dvol') renderDvol();
  else if (id === 'stats') renderStats();
}

// ===== LOAD DATA =====
async function loadAllUsers() {
  const { data } = await db.from('utilisateurs').select('id,nom,prenom,role,email,actif').eq('actif', true);
  allUsers = data || [];
}

async function loadDossiers() {
  const { data } = await db.from('dossiers').select('id,ref_sinistre,ref_contrat,nature,nature_label,type,portefeuille,gestionnaire,statut,traite,verrouille,created_at,demande_supp,date_etat').order('created_at', { ascending: true });
  allDossiers = data || [];
}

// ===== DASHBOARD =====

// ── T2 — LIBÉRER UN GESTIONNAIRE ─────────────────────────────────
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


// ── T4 — RÉINITIALISATION ────────────────────────────────────────
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

// ===== IMPORT =====
function renderImport() {
  document.getElementById('main-content').innerHTML = `
    <div class="upload-zone" onclick="document.getElementById('file-input').click()">
      <div class="icon">📂</div>
      <h3>Cliquez pour importer un fichier Excel</h3>
      <p>Formats acceptés : .xlsx, .xls</p>
    </div>
    <input type="file" id="file-input" accept=".xlsx,.xls" onchange="handleFile(event)">
    <div id="import-result"></div>`;
}

function detectPortefeuille(refContrat) {
  const r = (refContrat || '').toUpperCase();
  if (r.includes('OPTI')) return 'OPTINEO';
  return 'MIA';
}

function detectType(refContrat, refSinistre) {
  const r  = (refContrat  || '').toUpperCase();
  const rs = (refSinistre || '').toUpperCase();
  if (r.includes('MRH')  || rs.includes('MRH'))  return 'Habitation';
  if (r.includes('IMMO') || rs.includes('IMMO'))  return 'Habitation';
  return 'Auto';
}

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const workbook = XLSX.read(e.target.result, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) { showNotif('Fichier vide ou format incorrect.', 'error'); return; }

    const firstRow = rows[0];
    const normalize = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const keyMap = {};
    Object.keys(firstRow).forEach(k => { keyMap[normalize(k)] = k; });
    const formatDateVal = (v) => {
      if (!v) return '';
      // Si c'est déjà une date JS ou une string parseable
      var d = (v instanceof Date) ? v : new Date(v);
      if (!isNaN(d.getTime())) {
        var dd = String(d.getDate()).padStart(2,'0');
        var mm = String(d.getMonth()+1).padStart(2,'0');
        var yyyy = d.getFullYear();
        return dd + '/' + mm + '/' + yyyy;
      }
      return String(v).trim();
    };
    const get = (r, ...candidates) => {
      for (const c of candidates) {
        const norm = normalize(c);
        if (keyMap[norm] !== undefined && r[keyMap[norm]] !== undefined && r[keyMap[norm]] !== '') {
          var raw = r[keyMap[norm]];
          return (raw instanceof Date) ? formatDateVal(raw) : String(raw).trim();
        }
      }
      return '';
    };

    document.getElementById('import-result').innerHTML = '<div class="loading">Import en cours...</div>';

    const mapped = rows.map(r => ({
      ref_sinistre: get(r, 'Ref sinistre', 'Réf. sinistre', 'Ref. sinistre', 'REF SINISTRE', 'ref_sinistre'),
      date_etat: get(r, 'Date Etat', 'Date état', 'Date etat', 'DATE ETAT', 'date_etat', 'DateEtat', 'dateetat'),
      ref_contrat: get(r, 'Ref contrat', 'Réf. contrat', 'Ref. contrat', 'REF CONTRAT', 'ref_contrat'),
      nature: get(r, 'Nature MIN', 'Nature', 'nature', 'NATURE'),
      nature_label: get(r, 'Desc. Nature', 'Nature', 'Nature label', 'nature_label', 'Libellé nature'),
      type: detectType(get(r, 'Ref contrat', 'Réf. contrat', 'Ref. contrat', 'REF CONTRAT', 'ref_contrat'), get(r, 'Ref sinistre', 'Réf. sinistre', 'Ref. sinistre', 'REF SINISTRE', 'ref_sinistre')),
      portefeuille: detectPortefeuille(get(r, 'Ref contrat', 'Réf. contrat', 'Ref. contrat', 'REF CONTRAT', 'ref_contrat')),
    })).filter(d => d.ref_sinistre);

    if (!mapped.length) {
      showNotif('Aucune ligne valide trouvée. Vérifiez les noms de colonnes.', 'error');
      document.getElementById('import-result').innerHTML = '';
      return;
    }

    // ── DÉTECTION RE-IMPORT ────────────────────────────────────
    await loadDossiers();
    const existingRefs = new Map(allDossiers.map(d => [d.ref_sinistre, d]));
    const isReimport = existingRefs.size > 0;

    let nouveaux = [], relances = [], ignores = 0;

    for (const row of mapped) {
      const existing = existingRefs.get(row.ref_sinistre);
      if (!existing) {
        // Nouveau dossier
        nouveaux.push({ ...row, gestionnaire: '', traite: false, verrouille: false, statut: 'nonattribue' });
      } else if (existing.traite) {
        // Dossier traité → relancé
        relances.push(existing);
      } else {
        // Doublon non traité → mettre à jour date_etat si elle a changé
        if (row.date_etat) {
          await db.from('dossiers').update({ date_etat: row.date_etat }).eq('id', existing.id);
        }
        ignores++;
      }
    }

    // Insérer les nouveaux
    if (nouveaux.length > 0) {
      const { error } = await db.from('dossiers').insert(nouveaux);
      if (error) { showNotif('Erreur import : ' + error.message, 'error'); return; }
    }

    // Relancer les dossiers traités
    let relancesNotif = [];
    for (const d of relances) {
      await db.from('dossiers').update({
        statut: 'ouvert',
        traite: false,
        verrouille: true,
        traite_at: null
      }).eq('id', d.id);
      relancesNotif.push({ ref: d.ref_sinistre, gestionnaire: d.gestionnaire });
    }

    // Notifications temps réel pour les gestionnaires relancés
    if (relancesNotif.length > 0) {
      // Marquer en sessionStorage pour affichage dans renderMesDossiers
      const existingRelances = JSON.parse(safeSession.getItem('relances_notif') || '[]');
      const merged = [...existingRelances, ...relancesNotif.map(r => r.ref)];
      safeSession.setItem('relances_notif', JSON.stringify(merged));
    }

    await auditLog('IMPORT_EXCEL', (isReimport ? 'RE-IMPORT' : 'IMPORT') + ' — ' + nouveaux.length + ' nouveaux, ' + relances.length + ' relancés, ' + ignores + ' ignorés');

    await loadDossiers();
    await loadAllUsers();

    // ── BOÎTE DE DIALOGUE RÉSUMÉ ───────────────────────────────
    showImportSummaryModal(nouveaux.length, relances.length, ignores, relancesNotif, isReimport);
  };
  reader.readAsArrayBuffer(file);
}

// ===== DISPATCH =====
// AUTO ASSIGN — enrichi avec Dplane planning du jour
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

// ===== COPIER REFERENCE =====
async function copyRef(ref, dossierstatut, id, btn) {
  // Si un dossier est "encours", le passer en "ouvert"
  if (dossierstatut === 'encours') {
    const enCours = allDossiers.find(d => d.statut === 'encours' && d.id !== id);
    if (enCours) {
      await db.from('dossiers').update({ statut: 'ouvert' }).eq('id', enCours.id);
      allDossiers = allDossiers.map(d => d.id === enCours.id ? {...d, statut: 'ouvert'} : d);
    }
  }
  // Passer ce dossier en "encours"
  await db.from('dossiers').update({ statut: 'encours' }).eq('id', id);
  allDossiers = allDossiers.map(d => d.id === id ? {...d, statut: 'encours'} : d);
  // Copier dans le presse-papiers
  navigator.clipboard.writeText(ref).then(() => {
    btn.textContent = '✅'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋'; btn.classList.remove('copied'); }, 2000);
  });
}

function statutBadge(statut, verrouille) {
  if (verrouille && statut === 'nonattribue') return '<span class="badge badge-verrouille">🔒 Verrouillé</span>';
  const map = {
    'nonattribue': ['badge-nonattribue', 'Non attribué'],
    'attribue':    ['badge-attribue',    'Attribué'],
    'encours':     ['badge-encours',     'En cours'],
    'ouvert':      ['badge-ouvert',      'Ouvert'],
    'traite':      ['badge-traite2',     'Traité'],
    'verrouille':  ['badge-verrouille',  '🔒 Verrouillé'],
  };
  const [cls, label] = map[statut] || map['nonattribue'];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ===== ATTRIBUTION =====
function _cellRecuperer(d) {
  if (!d.gestionnaire || d.gestionnaire === '') {
    var id = d.id;
    return '<td style="text-align:center"><button class="btn btn-primary" style="padding:4px 12px;font-size:12px" onclick="recupererDossier(' + "'" + id + "'" + ')">📥 Récupérer</button></td>';
  }
  return '<td style="text-align:center"><span style="color:#bbb;font-size:12px">—</span></td>';
}
async function renderAttribution() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';
  await loadDossiers();

  var resHistoAttr = await db.from('historique_sinistres').select('ref_sinistre, gestionnaire, date_traitement');
  window._historiqueMap = {};
  if (resHistoAttr.data) resHistoAttr.data.forEach(function(h){ window._historiqueMap[h.ref_sinistre] = h; });
  var resFlagAttr = await db.from('app_config').select('value').eq('key','historique_actif').maybeSingle();
  window._historiqueActif = !resFlagAttr.data || resFlagAttr.data.value !== 'false';

  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const gestionnaires = allUsers.filter(u => ['gestionnaire','manager','admin'].includes(u.role));

  if (window._fPortefeuille === undefined) window._fPortefeuille = '';
  if (window._fType === undefined) window._fType = '';
  if (window._fNature === undefined) window._fNature = '';
  if (window._fStatut === undefined) window._fStatut = '';
  if (window._fGestionnaire === undefined) window._fGestionnaire = '';
  if (window._fNonAttribue === undefined) window._fNonAttribue = (role === 'gestionnaire');

  const portefeuilles = [...new Set(allDossiers.map(d => d.portefeuille).filter(Boolean))].sort();
  const types = [...new Set(allDossiers.map(d => d.type).filter(Boolean))].sort();
  const natures = [...new Set(allDossiers.map(d => d.nature_label || d.nature).filter(Boolean))].sort();
  const gestionnairesNoms = [...new Set(allDossiers.map(d => d.gestionnaire).filter(Boolean))].sort();

  let filtered = allDossiers;
  if (searchQuery) filtered = filtered.filter(d =>
    (d.ref_sinistre||d.refsinistre||'').toLowerCase().includes(searchQuery) ||
    (d.ref_contrat||d.refcontrat||'').toLowerCase().includes(searchQuery) ||
    (d.gestionnaire||'').toLowerCase().includes(searchQuery) ||
    (d.nature_label||d.nature||'').toLowerCase().includes(searchQuery)
  );
  if (window._fPortefeuille) filtered = filtered.filter(d => d.portefeuille === window._fPortefeuille);
  if (window._fType) filtered = filtered.filter(d => d.type === window._fType);
  if (window._fNature) filtered = filtered.filter(d => (d.nature_label||d.nature) === window._fNature);
  if (window._fStatut) filtered = filtered.filter(d => (d.statut||'nonattribue') === window._fStatut);
  if (window._fGestionnaire) filtered = filtered.filter(d => (d.gestionnaire||'') === window._fGestionnaire);
  if (window._fNonAttribue) filtered = filtered.filter(d => !d.gestionnaire);

  // Tri par date_etat ascendant (plus ancienne en tete), nulls en dernier
  var parseDateEtat = function(s) {
    if (!s) return null;
    // Format dd/mm/yyyy
    var p = s.split('/');
    if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
    return new Date(s);
  };
  filtered.sort(function(a, b) {
    var da = parseDateEtat(a.date_etat);
    var db2 = parseDateEtat(b.date_etat);
    if (!da && !db2) return 0;
    if (!da) return 1;
    if (!db2) return -1;
    return da - db2;
  });

  // Bandeau résumé par critères de recherche (hors gestionnaire)
  const countsPortefeuille = portefeuilles.map(v => ({ label: v, count: allDossiers.filter(d => d.portefeuille === v).length, color: '#1a5276', bg: '#e8f4fd' }));
  const countsType = types.map(v => ({ label: v, count: allDossiers.filter(d => d.type === v).length, color: '#1e8449', bg: '#eafaf1' }));
  const countsNature = natures.map(v => ({ label: v, count: allDossiers.filter(d => (d.nature_label||d.nature) === v).length, color: '#d35400', bg: '#fdebd0' }));
  const _knownStatuts = ['attribue','encours','ouvert','traite'];
  const _normStatut = d => {
    const s = (d.statut||'').toLowerCase().replace(/[^a-z]/g,'');
    if (s === 'attribue' || s === 'attribute') return 'attribue';
    if (s === 'encours' || s === 'en_cours' || s === 'encour') return 'encours';
    if (s === 'ouvert') return 'ouvert';
    if (s === 'traite' || s === 'traité') return 'traite';
    return 'nonattribue'; // fallback identique à statutBadge
  };
  const countsStatut = [
    { value: 'nonattribue', label: 'Non attribué' },
    { value: 'attribue',    label: 'Attribué' },
    { value: 'traite',      label: 'Traité' }
  ].map(s => ({ value: s.value, label: s.label, count: allDossiers.filter(d => _normStatut(d) === s.value).length }));

  const nbVerrouilles = allDossiers.filter(d => d.verrouille && !['attribue','encours','ouvert','traite'].includes(d.statut)).length;

  let html = `
  <div <div class="unified-panel">
    <!-- LIGNE 1 : Recherche + Portefeuille + Type + Nature (pills) -->
    <div class="urow urow-1">
      <input class="search-bar" placeholder="🔍 Réf. sinistre / contrat..." value="${searchQuery||''}"
        oninput="searchQuery=this.value.toLowerCase();renderAttribution()" style="flex-shrink:0;width:220px">
      <div class="urow-sep"></div>
      ${countsPortefeuille.map(s => `<span class="filter-pill ${window._fPortefeuille===s.label?'active':''}" onclick="window._fPortefeuille=(window._fPortefeuille===\'${s.label}\'?\'\':\'${s.label}\');renderAttribution()" title="${s.label}">${s.label} <strong>${s.count}</strong></span>`).join('')}
      <div class="urow-sep"></div>
      ${countsType.map(s => `<span class="filter-pill ${window._fType===s.label?'active':''}" onclick="window._fType=(window._fType===\'${s.label}\'?\'\':\'${s.label}\');renderAttribution()" title="${s.label}">${s.label} <strong>${s.count}</strong></span>`).join('')}
      <div class="urow-sep"></div>
      ${countsNature.map(s => `<span class="filter-pill ${window._fNature===s.label?'active':''}" onclick="window._fNature=(window._fNature===\'${s.label}\'?\'\':\'${s.label}\');renderAttribution()" title="${s.label}">${s.label} <strong>${s.count}</strong></span>`).join('')}
    </div>
    <!-- LIGNE 2 : Statut (pills) + Gestionnaire + Non attribués -->
    <div class="urow urow-2">
      ${countsStatut.map(s => `<span class="filter-pill statut-pill ${window._fStatut===s.value?'active':''}" onclick="window._fStatut=(window._fStatut===\'${s.value}\'?\'\':\'${s.value}\');renderAttribution()" title="${s.label}">${s.label} <strong>${s.count}</strong></span>`).join('')}
      <div class="urow-sep"></div>
      <div class="urow-sep"></div>
      ${gestionnairesNoms.map(g => `<span class="filter-pill gest-pill ${window._fGestionnaire===g?'active':''}" onclick="window._fGestionnaire=(window._fGestionnaire===\'${g}\'?\'\':\'${g}\');renderAttribution()" title="${g}">${g.split(' ')[0]}</span>`).join('')}
      <label class="check-label">
        <input type="checkbox" ${window._fNonAttribue?'checked':''} onchange="window._fNonAttribue=this.checked;renderAttribution()">
        Non attribués seulement
      </label>
    </div>
    <!-- LIGNE 3 : Toolbar dispatch (admin/manager uniquement) -->
    <div class="urow urow-3" style="${['admin','manager'].includes(role) ? '' : 'display:none'}">
      <label class="check-label check-all-label">
        <input type="checkbox" id="check-all-top" onchange="toggleAll(this.checked)" style="width:15px;height:15px;accent-color:var(--rose)">
        Tout sélectionner
      </label>
      <div class="urow-sep"></div>
      <select id="assign-bulk-select" class="filter-select" style="min-width:190px">
        <option value="">— Attribuer à —</option>
        ${gestionnaires.map(g => `<option value="${g.prenom} ${g.nom}">${g.prenom} ${g.nom} (${g.role})</option>`).join('')}
      </select>
      <button class="btn btn-warning" onclick="lockSelection()" style="display:flex;align-items:center;gap:6px">🔒 Verrouiller</button>
      <button class="btn btn-secondary" onclick="unlockSelection()" style="display:flex;align-items:center;gap:6px">🔓 Déverrouiller</button>
      <span class="selection-badge" id="selection-count">0 sélectionné(s)</span>
      <button class="btn btn-primary" onclick="showGestionnairesModal()" style="display:flex;align-items:center;gap:6px;padding:8px 16px">
        🎯 Attribution intelligente
      </button>
      <button class="btn-dispatch" onclick="showDispatch()" ${nbVerrouilles===0?'disabled':''} style="margin-left:auto;display:flex;align-items:center;gap:8px">
        🚀 DISPATCHER ${nbVerrouilles > 0 ? `<span style="background:rgba(255,255,255,0.3);border-radius:20px;padding:1px 8px">${nbVerrouilles}</span>` : ''}
      </button>
    </div>
  </div>

  <div class="table-container">
    
<div id="troc-selection-bar" class="troc-selection-bar" style="display:none;">
  <span id="troc-count">0 dossier(s) sélectionné(s)</span>
  <button class="troc-btn" id="btn-troc-proposer" onclick="openTrocModal()" disabled>✉️ Proposer à...</button>
  <button class="btn btn-secondary" onclick="toggleTrocMode()">Annuler</button>
</div>

  <div class="table-toolbar">
      <h2>Attribution des dossiers <span style="color:#888;font-weight:400;font-size:14px">(${filtered.length})</span></h2>
      ${['admin','manager'].includes(role) ? `<div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;color:#666">🔗 Référent historique :</span>
        <button onclick="toggleHistoriqueActif()" style="display:flex;align-items:center;gap:6px;padding:4px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;border:1.5px solid ${window._historiqueActif ? '#27ae60' : '#e74c3c'};background:${window._historiqueActif ? '#eafaf1' : '#fdf2f8'};color:${window._historiqueActif ? '#1e8449' : '#c0392b'}">
          <span style="width:10px;height:10px;border-radius:50%;background:${window._historiqueActif ? '#27ae60' : '#e74c3c'};display:inline-block"></span>
          ${window._historiqueActif ? 'Actif' : 'Désactivé'}
        </button>
      </div>` : ''}
    </div>
    <table>
      <thead><tr>
        <th><input type="checkbox" id="check-all" onchange="toggleAll(this.checked)"></th>
        <th>Réf. Sinistre</th>
        <th style="white-space:nowrap">Date État</th>
        <th>Portefeuille</th>
        <th>Réf. Contrat</th>
        <th>Type</th>
        <th>Nature</th>
        <th>Gestionnaire</th>
        <th>🔒</th>
        <th>Statut</th>
        <th>Traité</th>
        ${role === 'gestionnaire' ? '<th>Action</th>' : ''}
      </tr></thead>
      <tbody>`;

  if (!filtered.length) {
    html += `<tr><td colspan="10" style="text-align:center;padding:40px;color:#aaa">Aucun dossier trouvé</td></tr>`;
  } else {
    filtered.forEach(d => {
      const statut = d.statut || 'nonattribue';
      const monNom = `${currentUserData.prenom} ${currentUserData.nom}`;
      const isManager = ['admin','manager'].includes(role);
      const isMyDossier = d.gestionnaire === monNom;
      const canCheckTraite = isManager || (isMyDossier && !d.traite);
      const canUncheckTraite = isManager;
      const canAdmin = isManager;
      const canReassign = isManager || statut === 'nonattribue';

      html += `<tr>
        <td><input type="checkbox" class="row-check" data-id="${d.id}"
          ${d.verrouille ? 'disabled title="Dossier verrouillé — libérez-le d\u0027abord"' : ''}
          onchange="updateSelectionCount()"></td>
        <td>
          <strong>${d.ref_sinistre||''}</strong>
          <button class="btn-copy" onclick="copyRef('${d.ref_sinistre}','${statut}',${d.id},this)" title="Copier">📋</button>
          ${(window._historiqueActif && window._historiqueMap && window._historiqueMap[d.ref_sinistre] && new Date(window._historiqueMap[d.ref_sinistre].date_traitement) < new Date(new Date().toDateString())) ? `
            <div style="margin-top:3px;display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#856404">
              📌 Déjà traité le ${new Date(window._historiqueMap[d.ref_sinistre].date_traitement).toLocaleDateString('fr-FR')}
              — ${window._historiqueMap[d.ref_sinistre].gestionnaire}
              ${['admin','manager'].includes(role) ? `<button onclick="changerReferent('${d.ref_sinistre}')" style="margin-left:4px;background:none;border:none;cursor:pointer;font-size:11px" title="Changer le référent">✏️</button>` : ''}
            </div>` : ''}
        </td>
        <td style="white-space:nowrap;font-size:12px;font-weight:600;color:#1B3461">
          ${d.date_etat ? `<span style="background:#e8f0fb;border-radius:5px;padding:3px 8px">&#128197; ${d.date_etat}</span>` : '<span style="color:#bbb">—</span>'}
        </td>
        <td><span class="badge badge-attribue">${d.portefeuille||'-'}</span></td>
        <td>${d.ref_contrat||'-'}</td>
        <td><span class="badge ${d.type==='Habitation'?'badge-encours':'badge-traite2'}">${d.type||'-'}</span></td>
        <td>${d.nature_label||d.nature||'-'}</td>
        <td>
          <span style="font-size:13px;font-weight:600;color:${d.gestionnaire?'var(--navy)':'#bbb'}">
            ${d.gestionnaire || '—'}
          </span>
        </td>
        <td style="text-align:center;font-size:17px">
          ${d.verrouille
            ? (isManager
                ? `<span title="Cliquer pour libérer" style="cursor:pointer;display:inline-block;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'" onclick="showUnlockConfirm(${d.id})">🔒</span>`
                : '<span title="Verrouillé" style="cursor:default">🔒</span>')
            : '<span title="Non verrouillé" style="cursor:default;opacity:0.3">🔓</span>'
          }
        </td>
        <td>${statutBadge(d.statut, d.verrouille)}</td>
        <td style="text-align:center">
          <span style="font-size:15px;opacity:${d.traite?'1':'0.2'}" title="${d.traite?'Traité':'Non traité'}">
            ${d.traite ? '✅' : '⬜'}
          </span>
        </td>
        ${role === 'gestionnaire' ? _cellRecuperer(d) : ''}
      </tr>`;
    });
  }

  html += `</tbody></table></div>`;
  document.getElementById('main-content').innerHTML = html;
}



// ===== IMPORT SUMMARY MODAL =====
function showImportSummaryModal(nbNouveaux, nbRelances, nbIgnores, relancesNotif, isReimport) {
  var relancesHtml = '';
  if (relancesNotif.length > 0) {
    relancesHtml = '<div style="margin:12px 0;padding:12px;background:#fffbea;border:1px solid #ffc107;border-radius:8px">'
      + '<strong style="color:#856404">🔄 Dossiers relancés (' + relancesNotif.length + ') :</strong>'
      + '<ul style="margin:8px 0 0 16px;padding:0">'
      + relancesNotif.map(r => '<li style="font-size:13px"><strong>' + r.ref + '</strong>'
        + (r.gestionnaire ? ' → <span style="color:var(--navy)">' + r.gestionnaire + '</span>' : '') + '</li>').join('')
      + '</ul></div>';
  }
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'import-summary-modal';
  modal.style.zIndex = 5000;
  modal.innerHTML = '<div class="modal" style="max-width:500px">'
    + '<div style="font-size:40px;text-align:center;margin-bottom:12px">' + (isReimport ? '🔄' : '📂') + '</div>'
    + '<h2 style="text-align:center;color:var(--navy)">' + (isReimport ? 'Re-import effectué' : 'Import effectué') + '</h2>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:16px 0">'
    + '<div style="text-align:center;padding:12px;background:#eafaf1;border-radius:8px"><div style="font-size:24px;font-weight:700;color:#27ae60">' + nbNouveaux + '</div><div style="font-size:12px;color:#666">Nouveau(x)</div></div>'
    + '<div style="text-align:center;padding:12px;background:#fffbea;border-radius:8px"><div style="font-size:24px;font-weight:700;color:#f39c12">' + nbRelances + '</div><div style="font-size:12px;color:#666">Relancé(s)</div></div>'
    + '<div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px"><div style="font-size:24px;font-weight:700;color:#999">' + nbIgnores + '</div><div style="font-size:12px;color:#666">Ignoré(s)</div></div>'
    + '</div>'
    + relancesHtml
    + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">'
    + (nbNouveaux > 0
        ? '<button class="btn btn-secondary" onclick="closeModal(&apos;import-summary-modal&apos;)">Passer</button>'
          + '<button class="btn btn-primary" onclick="closeModal(&apos;import-summary-modal&apos;);showGestionnairesModal()">🎯 Attribuer les nouveaux dossiers</button>'
        : '<button class="btn btn-primary" onclick="closeModal(&apos;import-summary-modal&apos;)">✅ Fermer</button>')
    + '</div></div>';
  document.body.appendChild(modal);
}
// ===== FIN IMPORT SUMMARY MODAL =====
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
    (checked ? 'Dossier marqué traité' : 'Dossier réouvert') + ' — id:' + id);
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
// ===== ACTION TRAITEMENT MES DOSSIERS =====
function getMesDossierById(dossierId) {
  return (allDossiers || []).find(function(d) { return String(d.id) === String(dossierId); }) || null;
}

function closeTraitementActionModal() {
  closeModal('traitement-action-modal');
}

function showTraitementActionModal(dossierId) {
  const d = getMesDossierById(dossierId);
  if (!d) { showNotif('Dossier introuvable.', 'error'); return; }
  closeTraitementActionModal();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'traitement-action-modal';
  modal.style.zIndex = 6000;
  modal.innerHTML = `
    <div class="modal" style="max-width:420px;text-align:center">
      <div style="font-size:42px;margin-bottom:10px">📁</div>
      <h2 style="color:var(--navy);margin-bottom:8px">Action dossier</h2>
      <p style="color:#666;margin-bottom:6px">Réf. sinistre : <strong>${d.ref_sinistre || ''}</strong></p>
      <p style="color:#666;font-size:13px;margin-bottom:20px">Choisissez l'action à effectuer sur ce dossier.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-secondary" onclick="copyMesDossierReference('${d.id}')">📋 Copier la référence</button>
        <button class="btn btn-primary" style="background:var(--navy);border-color:var(--navy)" onclick="markMesDossierTraiteFromAction('${d.id}')">✅ Marquer comme traité</button>
        <button class="btn btn-secondary" onclick="closeTraitementActionModal()">Annuler</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function copyMesDossierReference(dossierId) {
  const d = getMesDossierById(dossierId);
  if (!d || !d.ref_sinistre) { showNotif('Référence introuvable.', 'error'); return; }
  try {
    await navigator.clipboard.writeText(d.ref_sinistre);
    showNotif('📋 Référence copiée : ' + d.ref_sinistre, 'success');
  } catch (e) {
    showNotif('Copie impossible.', 'error');
  }
}

async function markMesDossierTraiteFromAction(dossierId) {
  closeTraitementActionModal();
  await toggleTraiteMesDossiers(dossierId, true);
}
// ===== FIN ACTION TRAITEMENT MES DOSSIERS =====

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
  let html = `<div class="stats-grid">
    <div class="stat-card"><div class="number">${mesDossiers.length}</div><div class="label">Mes dossiers</div></div>
    <div class="stat-card"><div class="number" style="color:#27ae60">${mesDossiers.filter(d=>d.traite).length}</div><div class="label">Traités</div></div>
    <div class="stat-card"><div class="number" style="color:#e67e22">${mesDossiers.filter(d=>!d.traite).length}</div><div class="label">En cours</div></div>
  </div>
  <div class="table-container">
    <div class="table-toolbar"><h2>Mes dossiers</h2><button class="btn-demander-supp" onclick="demanderDossierSupp()">&#10133; Demander un dossier suppl&eacute;mentaire</button></div>
    <table><thead><tr>
      <th>Réf. Sinistre</th><th>Réf. Contrat</th><th>Nature</th>
      <th>Portefeuille</th><th>Statut</th><th>TRAITEMENT</th>
    </tr></thead><tbody>`;
  if (!mesDossiers.length) {
    html += '<tr><td colspan="6"><div class="empty-state"><div class="icon">📭</div><p>Aucun dossier attribué pour le moment.</p></div></td></tr>';
  } else {
    const monNomMD = currentUserData.prenom + ' ' + currentUserData.nom;
    const histoMapMD = window._historiqueMap || {};
    const histoActifMD = window._historiqueActif !== false;
    // Trier : dossiers "déjà traités par moi" en premier
    // Tri fixe : prioritaires non traités → autres non traités → traités (stable par ID)
    function _isPrioMD(d) {
      var pf  = (d.portefeuille||'').toUpperCase();
      var tp  = (d.type||'').toUpperCase();
      var nat = (d.nature_label||d.nature||'').toUpperCase();
      var hasRef = histoActifMD && histoMapMD[d.ref_sinistre] && histoMapMD[d.ref_sinistre].gestionnaire === monNomMD;
      return pf.includes('OPTINEO') || tp.includes('MRH') || tp.includes('HABITATION')
          || nat.includes('BRIS DE GLACE') || nat.includes('BDG') || hasRef;
    }
    // Dossiers récupérés manuellement en cours de session → mis en bas
    var _recuperesMD = JSON.parse(safeSession.getItem('_recuperesMD') || '[]');
    var _recuperesSetMD = new Set(_recuperesMD.map(Number));
    mesDossiers.sort(function(a, b) {
      // Dossiers récupérés manuellement → en bas
      var aR = _recuperesSetMD.has(a.id) ? 1 : 0;
      var bR = _recuperesSetMD.has(b.id) ? 1 : 0;
      if (aR !== bR) return aR - bR;
      // Ordre fixe par ID (ordre d'import) — jamais modifié par statut traité
      return (a.id || 0) - (b.id || 0);
    });
    // Récupérer refs relancées depuis sessionStorage
    const relancesRefs = JSON.parse(safeSession.getItem('relances_notif') || '[]');

    // Pop-up temps réel si des relances concernent ce gestionnaire
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
        // Vider la notif après affichage
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
          ${d.traite
            ? '<span class="badge badge-traite2" style="font-size:12px;padding:6px 10px">✅ Traité</span>'
            : `<button class="btn btn-primary" style="padding:6px 12px;font-size:12px;background:var(--navy);border-color:var(--navy)" onclick="showTraitementActionModal('${d.id}')">ACTION</button>`}
        </td>
      </tr>`;
    });
  }
  html += '</tbody></table></div>';
  document.getElementById('main-content').innerHTML = html;
}

// ===== SWITCHER OUTILS (Dispatch / Dplane / Dvol) =====
// Garantit l'isolation complète entre les trois outils :
// - #main-content + #tabs-container  → Dispatch
// - #dplane-screen                   → Dplane
// - #dvol-screen                     → Dvol (créé dynamiquement s'il n'existe pas)

function switchTool(tool) {
  const tabs = document.getElementById('tabs-container');
  const mc   = document.getElementById('main-content');
  const dp   = document.getElementById('dplane-screen');

  // Créer #dvol-screen dynamiquement s'il n'existe pas encore
  let dv = document.getElementById('dvol-screen');
  if (!dv) {
    dv = document.createElement('div');
    dv.id = 'dvol-screen';
    dv.style.display = 'none';
    // Insérer après #main-content dans le même parent
    if (mc && mc.parentNode) {
      mc.parentNode.insertBefore(dv, mc.nextSibling);
    } else {
      document.getElementById('app-screen')?.appendChild(dv);
    }
  }

  const bd  = document.getElementById('btn-tool-dispatch');
  const bpl = document.getElementById('btn-tool-dplane');
  const bdv = document.getElementById('btn-tool-dvol');

  if (tool === 'dplane') {
    if (tabs) tabs.style.display = 'none';
    if (mc)   mc.style.display   = 'none';
    if (dp)   dp.style.display   = 'block';
    if (dv)   dv.style.display   = 'none';
    bd?.classList.remove('active');
    bpl?.classList.add('active');
    bdv?.classList.remove('active');
    if (typeof dplaneInit === 'function') dplaneInit();

  } else if (tool === 'dvol') {
    if (tabs) tabs.style.display = 'none';
    if (mc)   mc.style.display   = 'none';
    if (dp)   dp.style.display   = 'none';
    if (dv)   dv.style.display   = 'block';
    bd?.classList.remove('active');
    bpl?.classList.remove('active');
    bdv?.classList.add('active');
    // renderDvol écrit dans #dvol-screen, pas dans #main-content
    if (typeof renderDvol === 'function') renderDvol();

  } else {
    // tool === 'dispatch' (défaut)
    if (tabs) tabs.style.display = '';
    if (mc)   mc.style.display   = '';
    if (dp)   dp.style.display   = 'none';
    if (dv)   dv.style.display   = 'none';
    bd?.classList.add('active');
    bpl?.classList.remove('active');
    bdv?.classList.remove('active');
    // Toujours re-rendre l'onglet actif pour éviter le contenu vide
    // (main-content était hidden pendant Dplane/Dvol, son innerHTML peut être obsolète)
    const activeTab = document.querySelector('.tab.active');
    const tabId = activeTab ? activeTab.id.replace('tab-', '') : 'dashboard';
    showTab(tabId);
  }
}
