// ===================================================
// DPROJECT.JS — Gestion Projet DSP
// Remplace Jira par un outil natif intégré à DSP
// ===================================================

// ===== INIT =====
function dprojectInit() {
  dprojectRender();
}

// ===== RENDU PRINCIPAL =====
function dprojectRender() {
  var container = document.getElementById('dproject-content');
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;">

      <!-- En-tête -->
      <div style="margin-bottom:28px;">
        <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 4px;">
          Dproject — Gestion projet DSP
        </h1>
        <p style="font-size:13px;color:#64748b;margin:0;">
          Tâches, évolutions, bugs et roadmap · remplace Jira pour l'équipe Dispatchis
        </p>
      </div>

      <!-- Cartes stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:28px;">
        ${dpStatCard('📝', 'TÂCHES ACTIVES', '—', '', '#e0f2fe', '#0369a1')}
        ${dpStatCard('➕', 'ÉVOLUTIONS OUVERTES', '—', '', '#f0fdf4', '#166534')}
        ${dpStatCard('🐛', 'BUGS À TRAITER', '—', '', '#fff7ed', '#9a3412')}
        ${dpStatCard('✅', 'LIVRÉS CE TRIMESTRE', '—', '', '#f0fdf4', '#166534')}
      </div>

      <!-- Onglets -->
      <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:0;">
        <button onclick="dpSwitchTab('bugs')" id="dp-tab-bugs" class="dp-tab dp-tab-active">🐛 Bugs</button>
        <button onclick="dpSwitchTab('taches')" id="dp-tab-taches" class="dp-tab">📝 Tâches</button>
        <button onclick="dpSwitchTab('evolutions')" id="dp-tab-evolutions" class="dp-tab">➕ Évolutions</button>
        <button onclick="dpSwitchTab('roadmap')" id="dp-tab-roadmap" class="dp-tab">🗺️ Roadmap</button>
      </div>

      <!-- Contenu des onglets -->
      <div id="dp-tab-content">
        <!-- Chargé dynamiquement -->
      </div>

    </div>

    <style>
      .dp-tab {
        padding: 10px 18px;
        border: none;
        background: transparent;
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: all 0.15s;
      }
      .dp-tab:hover { color: #0f172a; }
      .dp-tab-active {
        color: #0f172a;
        border-bottom-color: #0f172a;
      }
    </style>
  `;

  // Charger l'onglet Bugs par défaut
  dpSwitchTab('bugs');
  dpLoadStats();
}

// ===== CARTES STATS =====
function dpStatCard(icon, label, value, sub, bg, color) {
  return `
    <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;padding:20px 24px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="background:${bg};color:${color};width:40px;height:40px;border-radius:10px;
          display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
          ${icon}
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.08em;">${label}</div>
          <div style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.1;">${value}</div>
          ${sub ? `<div style="font-size:11px;color:#ef4444;font-weight:600;">${sub}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ===== SWITCH ONGLET =====
function dpSwitchTab(tab) {
  // Mettre à jour les boutons
  ['bugs','taches','evolutions','roadmap'].forEach(function(t) {
    var btn = document.getElementById('dp-tab-' + t);
    if (btn) btn.className = 'dp-tab' + (t === tab ? ' dp-tab-active' : '');
  });

  // Charger le contenu
  var content = document.getElementById('dp-tab-content');
  if (!content) return;

  if (tab === 'bugs')       dpRenderBugs(content);
  if (tab === 'taches')     dpRenderTaches(content);
  if (tab === 'evolutions') dpRenderEvolutions(content);
  if (tab === 'roadmap')    dpRenderRoadmap(content);
}

// ===== CHARGEMENT STATS =====
async function dpLoadStats() {
  try {
    const [bugs, evols, taches] = await Promise.all([
      db.from('dsp_bugs').select('id, statut', { count: 'exact' }).neq('statut', 'Corrigé'),
      db.from('dsp_evolutions').select('id', { count: 'exact' }).not('statut', 'in', '("Déployée","Refusée")'),
      db.from('dsp_taches').select('id', { count: 'exact' }).not('statut', 'in', '("Terminé")')
    ]);

    var critiques = (bugs.data || []).filter(function(b) { return b.urgence === 'Critique'; }).length;

    // Mettre à jour les cartes — on re-render pour simplifier
    var container = document.getElementById('dproject-content');
    if (!container) return;
    var grid = container.querySelector('[style*="grid-template-columns"]');
    if (!grid) return;
    grid.innerHTML =
      dpStatCard('📝', 'TÂCHES ACTIVES', taches.count || '0', '', '#e0f2fe', '#0369a1') +
      dpStatCard('➕', 'ÉVOLUTIONS OUVERTES', evols.count || '0', '', '#f0fdf4', '#166534') +
      dpStatCard('🐛', 'BUGS À TRAITER', bugs.count || '0', critiques ? critiques + ' critiques' : '', '#fff7ed', '#9a3412') +
      dpStatCard('✅', 'LIVRÉS CE TRIMESTRE', '—', '', '#f0fdf4', '#166534');
  } catch(e) { /* silencieux */ }
}

// ===== ONGLET BUGS =====
async function dpRenderBugs(container) {
  container.innerHTML = `
    <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:15px;font-weight:700;color:#0f172a;">Bugs</div>
          <div style="font-size:12px;color:#94a3b8;">Signalements en cours · qualifiés par niveau d'urgence</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="text" placeholder="Rechercher…" id="dp-bugs-search"
            oninput="dpFilterBugs()"
            style="padding:7px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;width:180px;">
          <select id="dp-bugs-urgence" onchange="dpFilterBugs()"
            style="padding:7px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#374151;">
            <option value="">Toute urgence</option>
            <option>Critique</option>
            <option>Majeur</option>
            <option>Mineur</option>
            <option>Cosmétique</option>
          </select>
          <select id="dp-bugs-env" onchange="dpFilterBugs()"
            style="padding:7px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#374151;">
            <option value="">Tous environnements</option>
            <option>PROD</option>
            <option>Staging</option>
          </select>
          <button onclick="dpOpenBugForm()"
            style="background:#e5195e;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
            + Signaler
          </button>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#64748b;white-space:nowrap;">ID</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#64748b;">TITRE</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#64748b;white-space:nowrap;">URGENCE</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#64748b;white-space:nowrap;">ZONE</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#64748b;white-space:nowrap;">ENV.</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#64748b;white-space:nowrap;">STATUT</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#64748b;white-space:nowrap;">SIGNALÉ PAR</th>
            </tr>
          </thead>
          <tbody id="dp-bugs-tbody">
            <tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">Chargement…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  await dpLoadBugs();
}

// ===== DONNÉES BUGS =====
var _dpBugsData = [];

async function dpLoadBugs() {
  try {
    const { data, error } = await db
      .from('dsp_bugs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    _dpBugsData = data || [];
    dpRenderBugsTable(_dpBugsData);
  } catch(e) {
    var tbody = document.getElementById('dp-bugs-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;">Erreur de chargement</td></tr>';
  }
}

function dpFilterBugs() {
  var search  = (document.getElementById('dp-bugs-search')  || {}).value || '';
  var urgence = (document.getElementById('dp-bugs-urgence') || {}).value || '';
  var env     = (document.getElementById('dp-bugs-env')     || {}).value || '';

  var filtered = _dpBugsData.filter(function(b) {
    var matchSearch  = !search  || (b.titre || '').toLowerCase().includes(search.toLowerCase());
    var matchUrgence = !urgence || b.urgence === urgence;
    var matchEnv     = !env     || b.environnement === env;
    return matchSearch && matchUrgence && matchEnv;
  });
  dpRenderBugsTable(filtered);
}

function dpRenderBugsTable(bugs) {
  var tbody = document.getElementById('dp-bugs-tbody');
  if (!tbody) return;

  if (!bugs.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">Aucun bug trouvé</td></tr>';
    return;
  }

  tbody.innerHTML = bugs.map(function(b) {
    return `
      <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.1s;" 
          onmouseover="this.style.background='#f8fafc'" 
          onmouseout="this.style.background=''">
        <td style="padding:12px 14px;white-space:nowrap;">
          <span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;
            padding:3px 7px;border-radius:5px;font-family:monospace;">${b.code || ('BUG-' + b.id)}</span>
        </td>
        <td style="padding:12px 14px;">
          <div style="font-weight:600;color:#0f172a;">${b.titre}</div>
          ${b.description ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px;">${b.description.substring(0,80)}${b.description.length > 80 ? '…' : ''}</div>` : ''}
        </td>
        <td style="padding:12px 14px;white-space:nowrap;">${dpBadgeUrgence(b.urgence)}</td>
        <td style="padding:12px 14px;">
          <span style="background:#f1f5f9;color:#475569;font-size:12px;padding:3px 8px;border-radius:6px;">${b.zone || '—'}</span>
        </td>
        <td style="padding:12px 14px;">${dpBadgeEnv(b.environnement)}</td>
        <td style="padding:12px 14px;">${dpBadgeStatutBug(b.statut)}</td>
        <td style="padding:12px 14px;color:#64748b;font-size:12px;">${b.signale_par_nom || '—'}</td>
      </tr>
    `;
  }).join('');
}

// ===== BADGES =====
function dpBadgeUrgence(u) {
  var map = {
    'Critique':   { bg:'#fee2e2', color:'#991b1b', dot:'#dc2626' },
    'Majeur':     { bg:'#fff7ed', color:'#9a3412', dot:'#ea580c' },
    'Mineur':     { bg:'#fefce8', color:'#854d0e', dot:'#ca8a04' },
    'Cosmétique': { bg:'#eff6ff', color:'#1e40af', dot:'#3b82f6' }
  };
  var s = map[u] || { bg:'#f1f5f9', color:'#64748b', dot:'#94a3b8' };
  return `<span style="background:${s.bg};color:${s.color};font-size:12px;font-weight:600;
    padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;">
    <span style="width:7px;height:7px;background:${s.dot};border-radius:50%;display:inline-block;"></span>${u || '—'}
  </span>`;
}

function dpBadgeEnv(e) {
  if (e === 'PROD')    return `<span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;">PROD</span>`;
  if (e === 'Staging') return `<span style="background:#fef9c3;color:#854d0e;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;">Staging</span>`;
  return `<span style="color:#94a3b8;">—</span>`;
}

function dpBadgeStatutBug(s) {
  var map = {
    'Nouveau':      { bg:'#f1f5f9', color:'#64748b' },
    'En analyse':   { bg:'#eff6ff', color:'#1e40af' },
    'En correction':{ bg:'#fff7ed', color:'#9a3412' },
    'En staging':   { bg:'#f0fdf4', color:'#166534' },
    'Corrigé':      { bg:'#f0fdf4', color:'#166534' }
  };
  var st = map[s] || { bg:'#f1f5f9', color:'#64748b' };
  return `<span style="background:${st.bg};color:${st.color};font-size:12px;font-weight:600;
    padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;">
    <span style="width:7px;height:7px;background:${st.color};border-radius:50%;opacity:0.6;display:inline-block;"></span>${s || '—'}
  </span>`;
}

// ===== FORMULAIRE SIGNALER UN BUG =====
function dpOpenBugForm() {
  var existing = document.getElementById('dp-bug-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'dp-bug-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0;">🐛 Signaler un bug</h2>
        <button onclick="document.getElementById('dp-bug-modal').remove()"
          style="background:#f1f5f9;border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;">✕</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Titre *</label>
          <input type="text" id="dp-bug-titre" placeholder="Résumé court du problème"
            style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Description *</label>
          <textarea id="dp-bug-description" rows="3" placeholder="Ce qui se passe / ce qui était attendu"
            style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Zone concernée</label>
            <select id="dp-bug-zone" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;">
              <option value="">— Choisir —</option>
              <option>Dispatch</option>
              <option>Dplane</option>
              <option>Dvol</option>
              <option>Auth</option>
              <option>Dashboard</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Environnement</label>
            <select id="dp-bug-env" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;">
              <option value="">— Choisir —</option>
              <option>PROD</option>
              <option>Staging</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Niveau d'urgence *</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="dp-urgence-selector">
            ${['Critique','Majeur','Mineur','Cosmétique'].map(function(u) {
              return `<div onclick="dpSelectUrgence('${u}')" id="dp-urg-${u}"
                style="padding:10px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.15s;">
                ${dpBadgeUrgence(u)}
              </div>`;
            }).join('')}
          </div>
        </div>
        <div id="dp-bug-error" style="color:#dc2626;font-size:12px;display:none;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button onclick="document.getElementById('dp-bug-modal').remove()"
            style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-size:13px;font-weight:600;cursor:pointer;">
            Annuler
          </button>
          <button onclick="dpSubmitBug()"
            style="padding:9px 18px;background:#e5195e;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
            Envoyer le signalement
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

var _dpSelectedUrgence = '';
function dpSelectUrgence(u) {
  _dpSelectedUrgence = u;
  ['Critique','Majeur','Mineur','Cosmétique'].forEach(function(x) {
    var el = document.getElementById('dp-urg-' + x);
    if (el) el.style.borderColor = x === u ? '#0f172a' : '#e2e8f0';
    if (el) el.style.background  = x === u ? '#f8fafc' : 'white';
  });
}

async function dpSubmitBug() {
  var titre       = (document.getElementById('dp-bug-titre')       || {}).value || '';
  var description = (document.getElementById('dp-bug-description') || {}).value || '';
  var zone        = (document.getElementById('dp-bug-zone')        || {}).value || '';
  var env         = (document.getElementById('dp-bug-env')         || {}).value || '';
  var errEl       = document.getElementById('dp-bug-error');

  errEl.style.display = 'none';

  if (!titre.trim())        { errEl.textContent = 'Le titre est obligatoire.';         errEl.style.display = 'block'; return; }
  if (!description.trim())  { errEl.textContent = 'La description est obligatoire.';   errEl.style.display = 'block'; return; }
  if (!_dpSelectedUrgence)  { errEl.textContent = 'Choisissez un niveau d\'urgence.';  errEl.style.display = 'block'; return; }

  try {
    const { error } = await db.from('dsp_bugs').insert({
      titre,
      description,
      zone: zone || null,
      environnement: env || null,
      urgence: _dpSelectedUrgence,
      signale_par: currentUser ? currentUser.id : null
    });
    if (error) throw error;

    document.getElementById('dp-bug-modal').remove();
    _dpSelectedUrgence = '';
    await dpLoadBugs();
    await dpLoadStats();
    if (typeof showNotif === 'function') showNotif('✅ Bug signalé avec succès !', 'success');
  } catch(e) {
    errEl.textContent = 'Erreur lors de l\'envoi : ' + e.message;
    errEl.style.display = 'block';
  }
}

// ===== ONGLETS PLACEHOLDER (à développer) =====
function dpRenderTaches(container) {
  container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
    <div style="font-size:36px;margin-bottom:12px;">📝</div>
    <p style="font-size:15px;font-weight:600;color:#64748b;">Gestion des tâches</p>
    <p style="font-size:13px;">À venir dans la prochaine étape</p>
  </div>`;
}

function dpRenderEvolutions(container) {
  container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
    <div style="font-size:36px;margin-bottom:12px;">➕</div>
    <p style="font-size:15px;font-weight:600;color:#64748b;">Demandes d'évolution</p>
    <p style="font-size:13px;">À venir dans la prochaine étape</p>
  </div>`;
}

function dpRenderRoadmap(container) {
  container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
    <div style="font-size:36px;margin-bottom:12px;">🗺️</div>
    <p style="font-size:15px;font-weight:600;color:#64748b;">Roadmap</p>
    <p style="font-size:13px;">À venir dans la prochaine étape</p>
  </div>`;
}
