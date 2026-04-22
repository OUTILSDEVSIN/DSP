// ===== COPIER REFERENCE =====
async function copyRef(ref, dossierstatut, id, btn) {
  // Ne pas toucher au statut si le dossier est déjà traité via le menu déroulant
  const statutsTraites = ['relance', 'ouverture', 'refuse', 'gestion_vol'];
  const dejaTraite = statutsTraites.includes(dossierstatut);

  if (!dejaTraite) {
    // Si un autre dossier est "encours", le repasser en "ouvert"
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
  }

  // Copier dans le presse-papiers (toujours, même si déjà traité)
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
    'relance':     ['badge-traite2',     '🔄 Relance'],
    'ouverture':   ['badge-traite2',     '📂 Ouverture'],
    'refuse':      ['badge-traite2',     '❌ Refus'],
    'gestion_vol': ['badge-traite2',     '🚗 Gestion VOL'],
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
  return '<td style="text-align:center"><span style="color:#bbb;font-size:12px">--</span></td>';
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
    const s = (d.statut||'').toLowerCase().replace(/[^a-z_]/g,'');
    if (s === 'attribue' || s === 'attribute') return 'attribue';
    if (s === 'encours' || s === 'en_cours' || s === 'encour') return 'encours';
    if (s === 'ouvert') return 'ouvert';
    if (s === 'traite' || s === 'traité') return 'traite';
    if (['relance','ouverture','refuse','gestion_vol'].includes(s)) return 'traite';
    return 'nonattribue'; // fallback identique à statutBadge
  };
  const countsStatut = [
    { value: 'nonattribue', label: 'Non attribué' },
    { value: 'attribue',    label: 'Attribué' },
    { value: 'traite',      label: 'Traité' }
  ].map(s => ({ value: s.value, label: s.label, count: allDossiers.filter(d => _normStatut(d) === s.value).length }));

  const nbVerrouilles = allDossiers.filter(d => d.verrouille && !['attribue','encours','ouvert','traite','relance','ouverture','refuse','gestion_vol'].includes(d.statut)).length;

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
        <option value="">-- Attribuer à --</option>
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
          ${d.verrouille ? 'disabled title="Dossier verrouillé -- libérez-le d\u0027abord"' : ''}
          onchange="updateSelectionCount()"></td>
        <td>
          <strong>${d.ref_sinistre||''}</strong>
          <button class="btn-copy" onclick="copyRef('${d.ref_sinistre}','${statut}',${d.id},this)" title="Copier">📋</button>
          ${(window._historiqueActif && window._historiqueMap && window._historiqueMap[d.ref_sinistre] && new Date(window._historiqueMap[d.ref_sinistre].date_traitement) < new Date(new Date().toDateString())) ? `
            <div style="margin-top:3px;display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#856404">
              📌 Déjà traité le ${new Date(window._historiqueMap[d.ref_sinistre].date_traitement).toLocaleDateString('fr-FR')}
              -- ${window._historiqueMap[d.ref_sinistre].gestionnaire}
              ${['admin','manager'].includes(role) ? `<button onclick="changerReferent('${d.ref_sinistre}')" style="margin-left:4px;background:none;border:none;cursor:pointer;font-size:11px" title="Changer le référent">✏️</button>` : ''}
            </div>` : ''}
        </td>
        <td style="white-space:nowrap;font-size:12px;font-weight:600;color:#1B3461">
          ${d.date_etat ? `<span style="background:#e8f0fb;border-radius:5px;padding:3px 8px">&#128197; ${d.date_etat}</span>` : '<span style="color:#bbb">--</span>'}
        </td>
        <td><span class="badge badge-attribue">${d.portefeuille||'-'}</span></td>
        <td>${d.ref_contrat||'-'}</td>
        <td><span class="badge ${d.type==='Habitation'?'badge-encours':'badge-traite2'}">${d.type||'-'}</span></td>
        <td>${d.nature_label||d.nature||'-'}</td>
        <td>
          <span style="font-size:13px;font-weight:600;color:${d.gestionnaire?'var(--navy)':'#bbb'}">
            ${d.gestionnaire || '--'}
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
