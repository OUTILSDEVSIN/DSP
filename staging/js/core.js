/* core.js — Dispatchis v2.5.64 — Logique principale : tabs, dashboard, dispatch, attribution */

// ===== TOOL SWITCHER (Dispatch / Dplane / Dvol) =====
function switchTool(tool) {
  // Masquer tous les écrans outils
  ['dispatch-screen', 'dplane-screen', 'dvol-screen'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Désactiver tous les boutons du switcher
  ['btn-tool-dispatch', 'btn-tool-dplane', 'btn-tool-dvol'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });

  // Afficher l'écran sélectionné
  var screen = document.getElementById(tool + '-screen');
  if (screen) screen.style.display = '';

  // Activer le bouton correspondant
  var activeBtn = document.getElementById('btn-tool-' + tool);
  if (activeBtn) activeBtn.classList.add('active');

  // Initialisation spécifique par outil
  if (tool === 'dispatch') {
    var tabToShow = (typeof currentTab !== 'undefined' && currentTab) ? currentTab : 'dashboard';
    if (typeof showTab === 'function') showTab(tabToShow);
  }
  if (tool === 'dplane') {
    if (typeof renderDplaneGrille === 'function') renderDplaneGrille();
  }
  if (tool === 'dvol') {
    if (typeof renderDvol === 'function') renderDvol();
    else if (typeof dvolInit === 'function') dvolInit();
  }
}

// ===== TABS =====
function buildTabs() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const tabs = [{ id: 'dashboard', label: '📊 Tableau de bord' }];
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'import', label: '📂 Importer Excel' });
  tabs.push({ id: 'attribution', label: '📋 Attribution' });
  tabs.push({ id: 'mesdossiers', label: '📁 Mes dossiers' });
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'utilisateurs', label: '👥 Équipe' });
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'audit', label: '🔍 Journal d\'audit' });
  // NOTE: L'onglet Dvol est retiré — Dvol est accessible via le tool switcher (navbar)
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
    + '<h2 style="color:#e74c3c">Libérer ' + nom.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + ' ?</h2>'
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
    // FIX: utilisation de data-attribute pour éviter les problèmes d'apostrophe dans onclick inline
    btnO.setAttribute('data-nom', nom);
    btnO.addEventListener('click', function() {
      doReleaseManager(this.getAttribute('data-nom'));
    });
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
  html += `<div class="stat-card"><div class="number">${total}</div><div class="label">Total dossiers</div></div>`;
  html += `<div class="stat-card"><div class="number" style="color:#27ae60">${traites}</div><div class="label">Traités</div></div>`;
  html += `<div class="stat-card"><div class="number" style="color:#e67e22">${total - traites}</div><div class="label">En cours</div></div>`;
  html += `<div class="stat-card"><div class="number" style="color:#e74c3c">${nonAttribues}</div><div class="label">Non attribués</div></div>`;
  html += `<div class="stat-card"><div class="number">${mesDossiers.length}</div><div class="label">Mes dossiers</div></div>`;
  html += `<div class="stat-card"><div class="number" style="color:#27ae60">${mesTraites}</div><div class="label">Mes dossiers traités</div></div>`;
  html += '</div>';

  if (total > 0) {
    const canRelease = (role === 'admin' || role === 'manager');
    const theadLiberer = canRelease ? '<th></th>' : '';
    html += '<div class="table-container"><div class="table-toolbar"><h2>Répartition par gestionnaire</h2></div>';
    html += '<table><thead><tr>';
    html += '<th>Gestionnaire</th><th>Rôle</th><th>Total</th><th>Traités</th><th>En cours</th><th>Progression</th>';
    html += theadLiberer;
    html += '</tr></thead><tbody>';

    const membres = allUsers.filter(function(g) {
      var nom = g.prenom + ' ' + g.nom;
      return dos3m.some(function(d) { return d.gestionnaire === nom; });
    });

    membres.forEach(g => {
      const nom = g.prenom + ' ' + g.nom;
      const t = dos3m.filter(d => d.gestionnaire === nom).length;
      const tr = dos3m.filter(d => d.gestionnaire === nom && d.traite).length;
      const pct = t > 0 ? Math.round(tr / t * 100) : 0;
      // FIX: bouton Libérer via data-attribute pour éviter crash sur noms avec apostrophe
      const tdLiberer = canRelease
        ? `<td><button class="btn btn-warning" style="padding:4px 12px;font-size:12px" data-release-nom="${nom.replace(/"/g,'&quot;')}" onclick="showReleaseManager(this.getAttribute('data-release-nom'))">🔓 Libérer</button></td>`
        : '';
      html += `<tr>`;
      html += `<td><strong>${nom}</strong></td>`;
      html += `<td><span class="badge role-${g.role}" style="padding:3px 8px;border-radius:10px;font-size:11px">${g.role}</span></td>`;
      html += `<td>${t}</td><td>${tr}</td><td>${t - tr}</td>`;
      html += `<td><div style="display:flex;align-items:center;gap:8px">`;
      html += `<div style="background:#eee;border-radius:10px;height:8px;width:80px">`;
      html += `<div style="background:#27ae60;height:8px;border-radius:10px;width:${pct}%"></div></div>`;
      html += `<small style="color:#888">${pct}%</small></div></td>`;
      html += tdLiberer;
      html += `</tr>`;
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
        nouveaux.push({ ...row, gestionnaire: '', traite: false, verrouille: false, statut: 'nonattribue' });
      } else if (existing.traite) {
        relances.push(existing);
      } else {
        if (row.date_etat) {
          await db.from('dossiers').update({ date_etat: row.date_etat }).eq('id', existing.id);
        }
        ignores++;
      }
    }

    if (nouveaux.length > 0) {
      const { error } = await db.from('dossiers').insert(nouveaux);
      if (error) { showNotif('Erreur import : ' + error.message, 'error'); return; }
    }

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

    if (relancesNotif.length > 0) {
      const existingRelances = JSON.parse(safeSession.getItem('relances_notif') || '[]');
      const merged = [...existingRelances, ...relancesNotif.map(r => r.ref)];
      safeSession.setItem('relances_notif', JSON.stringify(merged));
    }

    await auditLog('IMPORT_EXCEL', (isReimport ? 'RE-IMPORT' : 'IMPORT') + ' — ' + nouveaux.length + ' nouveaux, ' + relances.length + ' relancés, ' + ignores + ' ignorés');

    await loadDossiers();
    await loadAllUsers();

    showImportSummaryModal(nouveaux.length, relances.length, ignores, relancesNotif, isReimport);
  };
  reader.readAsArrayBuffer(file);
}

// ===== DISPATCH =====
// AUTO ASSIGN — enrichi avec Dplane planning du jour
async function showAutoAssignModal(totalImported) {
  const today = new Date().toISOString().split('T')[0];
  const { data: planningDuJour } = await db.from('dplane_planning')
    .select('gestionnaire_id, activite_id, is_brouillon')
    .eq('jour', today).eq('is_brouillon', false);
  const { data: absencesDuJour } = await db.from('dplane_absences')
    .select('gestionnaire_id').eq('jour', today);
  const { data: activitesDplane } = await db.from('dplane_activites').select('id, nom');

  const absentsIds = new Set((absencesDuJour||[]).map(a => a.gestionnaire_id));
  const actPreouv = (activitesDplane||[]).find(a => a.nom.toLowerCase().includes('préouverture') || a.nom.toLowerCase().includes('preouvetur'));
  const preouverturesIds = new Set((planningDuJour||[])
    .filter(p => actPreouv && p.activite_id === actPreouv.id)
    .map(p => p.gestionnaire_id));

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

  // FIX: construire le HTML du planning sans template literals multi-lignes imbriqués
  const hasPlanningData = resumePlanning.some(r => r.acts.length || r.absent);
  let planningHtml = '';
  if (hasPlanningData) {
    let rows = '';
    resumePlanning.forEach(function(r) {
      if (!r.acts.length && !r.absent) return;
      const nomCell = '<span style="font-weight:600;min-width:130px;">' + r.user.prenom + ' ' + r.user.nom + '</span>';
      const statusCell = r.absent
        ? '<span style="color:#e5195e;font-size:11px">🚫 Absent</span>'
        : '<span style="color:#27ae60;font-size:11px">' + (r.acts.join(', ') || '') + '</span>';
      rows += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,.05);">'
        + nomCell + statusCell + '</div>';
    });
    planningHtml = '<div style="background:#f0f4ff;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;">'
      + '<div style="font-weight:700;color:var(--navy);margin-bottom:8px;">📅 Planning Dplane du jour</div>'
      + rows
      + '</div>';
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'auto-assign-modal';
  modal.style.zIndex = '3000';
  modal.innerHTML = '<div class="modal" style="max-width:500px;width:95vw">'
    + '<div style="font-size:40px;text-align:center;margin-bottom:8px">🎯</div>'
    + '<h2 style="text-align:center">Attribution automatique</h2>'
    + '<p style="color:#666;font-size:14px;text-align:center;margin-bottom:20px">'
    + '<strong>' + totalImported + '</strong> dossiers importés. Souhaitez-vous les attribuer maintenant ?'
    + '</p>'
    + planningHtml
    + '<div id="auto-assign-options"></div>'
    + '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px">'
    + '<button class="btn btn-secondary" onclick="closeModal(\'auto-assign-modal\')">Plus tard</button>'
    + '<button class="btn btn-primary" onclick="doAutoAssign()">🎯 Attribuer maintenant</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);
}
