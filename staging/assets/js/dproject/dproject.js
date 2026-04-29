// ===================================================
// DPROJECT.JS v3.0 — Gestion Projet DSP
// Fusion : charte graphique sidebar + modal détail
//          + commentaires + zone "À qualifier"
// Palette : navy #1b2656 · accent #e5195e · bg #eef1f6
// ===================================================

var DP_ACCENT = '#e5195e';

// ── État ────────────────────────────────────────────
var _dpSection          = 'bugs';
var _dpBugsData         = [];
var _dpTachesData       = [];
var _dpEvolsData        = [];
var _dpSelectedUrgence  = '';
var _dpSelectedPriorite = '';

// ─────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────
function dprojectInit() { dprojectRender(); }

// ─────────────────────────────────────────────────
// RENDU PRINCIPAL — layout 2 panneaux
// ─────────────────────────────────────────────────
function dprojectRender() {
  var container = document.getElementById('dproject-content');
  if (!container) return;
  container.style.padding    = '0';
  container.style.background = '#eef1f6';
  container.style.minHeight  = '100%';

  container.innerHTML = `
<style>
/* ── Layout ── */
.dp-layout{display:flex;min-height:calc(100vh - 90px);}

/* ── Sidebar ── */
.dp-sidebar{width:230px;flex-shrink:0;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;}
.dp-sidebar-top{padding:20px 16px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;}
.dp-sidebar-icon{width:38px;height:38px;border-radius:10px;background:${DP_ACCENT};display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900;color:#fff;flex-shrink:0;}
.dp-sidebar-name{font-size:14px;font-weight:800;color:#0f172a;}
.dp-sidebar-sub{font-size:11px;color:#94a3b8;}
.dp-nav{padding:12px 0;flex:1;}
.dp-nav-label{font-size:10px;font-weight:700;color:#cbd5e1;letter-spacing:.08em;text-transform:uppercase;padding:8px 16px 4px;}
.dp-nav-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 16px;font-size:13px;font-weight:600;color:#64748b;background:none;border:none;border-left:3px solid transparent;cursor:pointer;text-align:left;transition:all .15s;}
.dp-nav-btn:hover{background:#f8fafc;color:#0f172a;}
.dp-nav-btn.active{border-left-color:${DP_ACCENT};background:#fff0f5;color:${DP_ACCENT};}
.dp-nav-badge{margin-left:auto;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;}
.dp-badge-red   {background:#fee2e2;color:#991b1b;}
.dp-badge-blue  {background:#dbeafe;color:#1e40af;}
.dp-badge-green {background:#dcfce7;color:#166534;}
.dp-badge-orange{background:#ffedd5;color:#9a3412;}
.dp-sidebar-stats{padding:14px 16px;border-top:1px solid #e2e8f0;font-size:12px;}
.dp-stat-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;color:#64748b;}
.dp-stat-row:last-child{margin-bottom:0;}
.dp-stat-row strong{color:#0f172a;font-weight:700;}

/* ── Main ── */
.dp-main{flex:1;padding:24px 28px;overflow:auto;}
.dp-page-title{font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px;}
.dp-page-sub{font-size:13px;color:#64748b;margin:0 0 20px;}

/* ── À qualifier ── */
.dp-qualifier-zone{background:linear-gradient(135deg,#fff7ed,#fff);border:2px solid #f97316;border-radius:14px;padding:16px 20px;margin-bottom:20px;}
.dp-qualifier-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.dp-qualifier-count{background:#f97316;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;}
.dp-qualifier-item{background:#fff;border:1px solid #fed7aa;border-radius:10px;padding:11px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;transition:box-shadow .15s;margin-bottom:8px;}
.dp-qualifier-item:last-child{margin-bottom:0;}
.dp-qualifier-item:hover{box-shadow:0 2px 12px rgba(249,115,22,.15);}

/* ── Card ── */
.dp-card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;}
.dp-card-header{padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.dp-card-title{font-size:14px;font-weight:700;color:#0f172a;}
.dp-card-sub{font-size:12px;color:#94a3b8;}

/* ── Boutons ── */
.dp-btn{padding:8px 15px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:opacity .15s;}
.dp-btn-accent{background:${DP_ACCENT};color:#fff;}
.dp-btn-accent:hover{opacity:.85;}
.dp-btn-ghost{background:transparent;color:#64748b;border:1.5px solid #e2e8f0;}
.dp-btn-ghost:hover{border-color:#94a3b8;color:#0f172a;}
.dp-btn-dark{background:#0f172a;color:#fff;}
.dp-btn-dark:hover{opacity:.85;}

/* ── Filtres / inputs ── */
.dp-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.dp-input{padding:7px 11px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#374151;outline:none;transition:border .15s;}
.dp-input:focus{border-color:${DP_ACCENT};}

/* ── Table ── */
.dp-tbl{width:100%;border-collapse:collapse;font-size:13px;}
.dp-tbl th{padding:9px 13px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.07em;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap;}
.dp-tbl td{padding:11px 13px;border-bottom:1px solid #f1f5f9;color:#374151;}
.dp-tbl tr:last-child td{border-bottom:none;}
.dp-tbl tr.dp-row-clickable{cursor:pointer;}
.dp-tbl tr.dp-row-clickable:hover td{background:#f8fafc;}

/* ── Kanban ── */
.dp-kanban{display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;}
.dp-kanban-col{min-width:220px;flex-shrink:0;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:12px;}
.dp-kanban-col-head{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;display:flex;align-items:center;gap:6px;}
.dp-kanban-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:12px;}
.dp-kanban-card:last-child{margin-bottom:0;}
.dp-kanban-card-title{font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px;}
.dp-kanban-empty{font-size:12px;color:#cbd5e1;text-align:center;padding:16px 8px;}

/* ── Modal overlay ── */
.dp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9000;padding:16px;}
.dp-modal{background:#fff;border-radius:16px;width:540px;max-width:100%;max-height:92vh;overflow-y:auto;}

/* ── Modal détail ── */
.dp-detail-header{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.dp-detail-body{padding:16px 24px 24px;display:flex;flex-direction:column;gap:20px;}
.dp-detail-section-label{font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:10px;letter-spacing:.06em;text-transform:uppercase;}
.dp-progress{display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:4px;}
.dp-step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin:0 auto;flex-shrink:0;}
.dp-step-line{width:28px;height:2px;margin:14px 2px 0;flex-shrink:0;}
.dp-admin-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;}
.dp-admin-box-title{font-size:11px;font-weight:700;color:#0369a1;margin-bottom:12px;}
.dp-comments-box{max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
.dp-comment-item{background:#f8fafc;border-radius:10px;padding:10px 14px;}
.dp-comment-author{font-size:12px;font-weight:700;color:#0f172a;}
.dp-comment-date{font-size:11px;color:#94a3b8;}
.dp-comment-text{font-size:13px;color:#374151;margin:4px 0 0;}

/* ── Modal formulaire ── */
.dp-form-modal{width:500px;}
.dp-modal-title{font-size:17px;font-weight:800;color:#0f172a;margin:0 0 18px;padding:26px 26px 0;}
.dp-fgrp{margin-bottom:14px;padding:0 26px;}
.dp-fgrp:last-of-type{margin-bottom:0;}
.dp-flabel{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:5px;letter-spacing:.04em;}
.dp-finput,.dp-fselect,.dp-ftextarea{width:100%;padding:8px 11px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;outline:none;transition:border .15s;font-family:inherit;box-sizing:border-box;}
.dp-finput:focus,.dp-fselect:focus,.dp-ftextarea:focus{border-color:${DP_ACCENT};}
.dp-ftextarea{resize:vertical;min-height:72px;}
.dp-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 26px;margin-bottom:14px;}
.dp-prio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
.dp-urgence-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}
.dp-choice-btn{padding:9px 4px;border-radius:8px;border:2px solid transparent;font-size:11px;font-weight:700;cursor:pointer;text-align:center;transition:all .15s;}
.dp-modal-err{background:#fee2e2;color:#991b1b;padding:8px 11px;border-radius:8px;font-size:12px;font-weight:600;margin:0 26px 10px;display:none;}
.dp-modal-footer{display:flex;gap:10px;justify-content:flex-end;padding:16px 26px;border-top:1px solid #f1f5f9;margin-top:6px;}

/* ── États vides ── */
.dp-empty{text-align:center;padding:48px 20px;color:#94a3b8;}
.dp-empty-icon{font-size:32px;margin-bottom:10px;}
.dp-empty p{font-size:13px;}

/* ── Badge générique ── */
.dp-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;white-space:nowrap;}
.dp-badge-dot{width:6px;height:6px;border-radius:50%;display:inline-block;opacity:.8;}
</style>

<div class="dp-layout">

  <!-- ══ SIDEBAR ══ -->
  <aside class="dp-sidebar">
    <div class="dp-sidebar-top">
      <div class="dp-sidebar-icon">D</div>
      <div>
        <div class="dp-sidebar-name">Dproject</div>
        <div class="dp-sidebar-sub">Gestion projet DSP</div>
      </div>
    </div>
    <nav class="dp-nav">
      <div class="dp-nav-label">Suivi</div>
      <button class="dp-nav-btn active" id="dp-nav-bugs" onclick="dpSwitchSection('bugs')">
        🐛 Bugs
        <span class="dp-nav-badge dp-badge-red" id="dp-badge-bugs">—</span>
      </button>
      <button class="dp-nav-btn" id="dp-nav-evolutions" onclick="dpSwitchSection('evolutions')">
        💡 Évolutions
        <span class="dp-nav-badge dp-badge-green" id="dp-badge-evols">—</span>
      </button>
      <button class="dp-nav-btn" id="dp-nav-taches" onclick="dpSwitchSection('taches')">
        📝 Tâches
        <span class="dp-nav-badge dp-badge-blue" id="dp-badge-taches">—</span>
      </button>
      <div class="dp-nav-label" style="margin-top:8px;">Vision</div>
      <button class="dp-nav-btn" id="dp-nav-roadmap" onclick="dpSwitchSection('roadmap')">
        🗺️ Roadmap
      </button>
    </nav>
    <div class="dp-sidebar-stats">
      <div class="dp-stat-row">Bugs ouverts <strong id="dp-stat-bugs">—</strong></div>
      <div class="dp-stat-row">Tâches actives <strong id="dp-stat-taches">—</strong></div>
      <div class="dp-stat-row">Évolutions <strong id="dp-stat-evols">—</strong></div>
    </div>
  </aside>

  <!-- ══ CONTENU ══ -->
  <main class="dp-main" id="dp-main-content">
    <div class="dp-empty"><div class="dp-empty-icon">⏳</div><p>Chargement…</p></div>
  </main>

</div>`;

  dpSwitchSection('bugs');
  dpLoadAllStats();
}

// ─────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────
function dpSwitchSection(section) {
  _dpSection = section;
  ['bugs','evolutions','taches','roadmap'].forEach(function(s) {
    var btn = document.getElementById('dp-nav-' + s);
    if (btn) btn.className = 'dp-nav-btn' + (s === section ? ' active' : '');
  });
  var main = document.getElementById('dp-main-content');
  if (!main) return;
  if (section === 'bugs')       dpRenderBugs(main);
  if (section === 'evolutions') dpRenderEvolutions(main);
  if (section === 'taches')     dpRenderTaches(main);
  if (section === 'roadmap')    dpRenderRoadmap(main);
}

// ─────────────────────────────────────────────────
// STATS GLOBALES
// ─────────────────────────────────────────────────
async function dpLoadAllStats() {
  try {
    var [bugs, taches, evols, qualifier] = await Promise.all([
      db.from('dsp_bugs').select('id,urgence,statut').not('statut','in','("Corrigé","Ne sera pas corrigé")'),
      db.from('dsp_taches').select('id').neq('statut','Terminé'),
      db.from('dsp_evolutions').select('id').not('statut','in','("Déployée","Refusée")'),
      db.from('dsp_bugs').select('id',{count:'exact'}).eq('statut','Nouveau')
    ]);
    var bugsCount  = (bugs.data  || []).length;
    var critiques  = (bugs.data  || []).filter(function(b){ return b.urgence === 'Critique'; }).length;
    var tachesCount= taches.count || 0;
    var evolsCount = (evols.data || []).length;
    var qCount     = qualifier.count || 0;

    var set = function(id, val) { var el = document.getElementById(id); if(el) el.textContent = val; };
    set('dp-badge-bugs',   bugsCount  + (critiques ? ' ('+critiques+'🔴)' : ''));
    set('dp-badge-taches', tachesCount);
    set('dp-badge-evols',  evolsCount);
    set('dp-stat-bugs',    bugsCount);
    set('dp-stat-taches',  tachesCount);
    set('dp-stat-evols',   evolsCount);

    // Badge orange sidebar si items à qualifier
    if (qCount > 0) {
      var navBugs = document.getElementById('dp-nav-bugs');
      if (navBugs && !navBugs.querySelector('.dp-badge-orange')) {
        var span = document.createElement('span');
        span.className = 'dp-nav-badge dp-badge-orange';
        span.style.marginLeft = '4px';
        span.textContent = qCount + ' à qualifier';
        navBugs.appendChild(span);
      }
    }
  } catch(e) { /* silencieux */ }
}

// ═════════════════════════════════════════════════
// ZONE "À QUALIFIER" — alertes nouvelles demandes
// ═════════════════════════════════════════════════
async function dpLoadAQualifier(targetId) {
  var zone = document.getElementById(targetId);
  if (!zone) return;
  try {
    var [bugs, evols] = await Promise.all([
      db.from('dsp_bugs').select('*').eq('statut','Nouveau').order('created_at',{ascending:false}),
      db.from('dsp_evolutions').select('*').eq('statut','Nouvelle').order('created_at',{ascending:false})
    ]);
    var items = [
      ...(bugs.data  || []).map(function(b){ return Object.assign({},b,{_type:'bug'}); }),
      ...(evols.data || []).map(function(e){ return Object.assign({},e,{_type:'evolution'}); })
    ].sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });

    if (!items.length) { zone.innerHTML = ''; return; }

    zone.innerHTML = `
      <div class="dp-qualifier-zone">
        <div class="dp-qualifier-head">
          <span style="font-size:18px;">🔔</span>
          <span style="font-size:14px;font-weight:800;color:#9a3412;">À qualifier</span>
          <span class="dp-qualifier-count">${items.length}</span>
          <span style="font-size:12px;color:#94a3b8;">nouvelles demandes en attente</span>
        </div>
        ${items.map(function(item){
          var code = item.code || (item._type === 'bug' ? 'BUG-???' : 'EVOL-???');
          var icon = item._type === 'bug' ? '🐛' : '💡';
          var date = new Date(item.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
          return `<div class="dp-qualifier-item" onclick="dpOuvrirDetail('${item._type}',${item.id})">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              <span style="font-size:16px;">${icon}</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#0f172a;">${item.titre}</div>
                <div style="font-size:11px;color:#94a3b8;">${code} · ${date}</div>
              </div>
            </div>
            <span style="background:#fff7ed;color:#9a3412;font-size:11px;font-weight:700;
              padding:3px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0;">Qualifier →</span>
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) { /* silencieux */ }
}

// ═════════════════════════════════════════════════
// SECTION BUGS
// ═════════════════════════════════════════════════
function dpRenderBugs(container) {
  container.innerHTML = `
    <p class="dp-page-title">🐛 Bugs</p>
    <p class="dp-page-sub">Signalements en cours · qualifiés par niveau d'urgence</p>
    <div id="dp-qualifier-bugs"></div>
    <div class="dp-card">
      <div class="dp-card-header">
        <div class="dp-filters">
          <input class="dp-input" type="text" id="dp-bugs-search" placeholder="Rechercher…" oninput="dpFilterBugs()" style="width:150px;">
          <select class="dp-input" id="dp-bugs-urgence" onchange="dpFilterBugs()">
            <option value="">Toute urgence</option>
            <option>Critique</option><option>Majeur</option><option>Mineur</option><option>Cosmétique</option>
          </select>
          <select class="dp-input" id="dp-bugs-env" onchange="dpFilterBugs()">
            <option value="">Tous env.</option><option>PROD</option><option>Staging</option>
          </select>
          <select class="dp-input" id="dp-bugs-statut" onchange="dpFilterBugs()">
            <option value="">Tous statuts</option>
            <option>Nouveau</option><option>En analyse</option><option>En correction</option>
            <option>En staging</option><option>Corrigé</option><option>Ne sera pas corrigé</option>
          </select>
        </div>
        <button class="dp-btn dp-btn-accent" onclick="dpOpenBugForm()">+ Signaler un bug</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="dp-tbl">
          <thead><tr>
            <th>ID</th><th>TITRE</th><th>URGENCE</th><th>ZONE</th><th>ENV.</th><th>STATUT</th>
          </tr></thead>
          <tbody id="dp-bugs-tbody">
            <tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;">Chargement…</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
  dpLoadAQualifier('dp-qualifier-bugs');
  dpLoadBugs();
}

async function dpLoadBugs() {
  try {
    var { data, error } = await db.from('dsp_bugs').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    _dpBugsData = data || [];
    dpRenderBugsTable(_dpBugsData);
  } catch(e) {
    var tbody = document.getElementById('dp-bugs-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#ef4444;">Erreur : ${e.message}</td></tr>`;
  }
}

function dpFilterBugs() {
  var s = (document.getElementById('dp-bugs-search')  || {}).value || '';
  var u = (document.getElementById('dp-bugs-urgence') || {}).value || '';
  var e = (document.getElementById('dp-bugs-env')     || {}).value || '';
  var st= (document.getElementById('dp-bugs-statut')  || {}).value || '';
  dpRenderBugsTable(_dpBugsData.filter(function(b){
    return (!s || (b.titre||'').toLowerCase().includes(s.toLowerCase()))
        && (!u  || b.urgence === u)
        && (!e  || b.environnement === e)
        && (!st || b.statut === st);
  }));
}

function dpRenderBugsTable(bugs) {
  var tbody = document.getElementById('dp-bugs-tbody');
  if (!tbody) return;
  if (!bugs.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Aucun bug trouvé</td></tr>';
    return;
  }
  tbody.innerHTML = bugs.map(function(b){
    return `<tr class="dp-row-clickable" onclick="dpOuvrirDetail('bug',${b.id})">
      <td><span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;font-family:monospace;">${b.code||'BUG-?'}</span></td>
      <td>
        <div style="font-weight:600;color:#0f172a;">${b.titre||'—'}</div>
        ${b.description?`<div style="font-size:12px;color:#94a3b8;">${b.description.substring(0,65)}…</div>`:''}
      </td>
      <td>${dpBadgeUrgence(b.urgence)}</td>
      <td>${b.zone?`<span style="background:#f1f5f9;color:#475569;font-size:12px;padding:3px 8px;border-radius:6px;">${b.zone}</span>`:'—'}</td>
      <td>${dpBadgeEnv(b.environnement)}</td>
      <td>${dpBadgeStatut(b.statut)}</td>
    </tr>`;
  }).join('');
}

// ═════════════════════════════════════════════════
// SECTION ÉVOLUTIONS
// ═════════════════════════════════════════════════
function dpRenderEvolutions(container) {
  container.innerHTML = `
    <p class="dp-page-title">💡 Évolutions</p>
    <p class="dp-page-sub">Demandes d'amélioration soumises par l'équipe</p>
    <div id="dp-qualifier-evols"></div>
    <div class="dp-card">
      <div class="dp-card-header">
        <div class="dp-filters">
          <input class="dp-input" type="text" id="dp-evols-search" placeholder="Rechercher…" oninput="dpFilterEvols()" style="width:180px;">
          <select class="dp-input" id="dp-evols-statut" onchange="dpFilterEvols()">
            <option value="">Tous statuts</option>
            <option>Nouvelle</option><option>En analyse</option><option>Acceptée</option>
            <option>En développement</option><option>Déployée</option><option>Refusée</option>
          </select>
        </div>
        <button class="dp-btn dp-btn-accent" onclick="dpOpenEvolForm()">+ Demander une évolution</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="dp-tbl">
          <thead><tr>
            <th>ID</th><th>TITRE</th><th>STATUT</th><th>DATE</th>
          </tr></thead>
          <tbody id="dp-evols-tbody">
            <tr><td colspan="4" style="text-align:center;padding:32px;color:#94a3b8;">Chargement…</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  // Charger qualificatifs pour évolutions aussi
  dpLoadAQualifierEvols('dp-qualifier-evols');
  dpLoadEvols();
}

async function dpLoadAQualifierEvols(targetId) {
  var zone = document.getElementById(targetId);
  if (!zone) return;
  try {
    var { data } = await db.from('dsp_evolutions').select('*').eq('statut','Nouvelle').order('created_at',{ascending:false});
    var items = data || [];
    if (!items.length) { zone.innerHTML = ''; return; }
    zone.innerHTML = `
      <div class="dp-qualifier-zone">
        <div class="dp-qualifier-head">
          <span style="font-size:18px;">🔔</span>
          <span style="font-size:14px;font-weight:800;color:#9a3412;">À qualifier</span>
          <span class="dp-qualifier-count">${items.length}</span>
          <span style="font-size:12px;color:#94a3b8;">évolutions en attente</span>
        </div>
        ${items.map(function(item){
          var code = item.code || 'EVOL-???';
          var date = new Date(item.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
          return `<div class="dp-qualifier-item" onclick="dpOuvrirDetail('evolution',${item.id})">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              <span style="font-size:16px;">💡</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#0f172a;">${item.titre}</div>
                <div style="font-size:11px;color:#94a3b8;">${code} · ${date}</div>
              </div>
            </div>
            <span style="background:#fff7ed;color:#9a3412;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;">Qualifier →</span>
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) { /* silencieux */ }
}

async function dpLoadEvols() {
  try {
    var { data, error } = await db.from('dsp_evolutions').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    _dpEvolsData = data || [];
    dpRenderEvolsTable(_dpEvolsData);
  } catch(e) {
    var tbody = document.getElementById('dp-evols-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:#ef4444;">Erreur : ${e.message}</td></tr>`;
  }
}

function dpFilterEvols() {
  var s  = (document.getElementById('dp-evols-search') || {}).value || '';
  var st = (document.getElementById('dp-evols-statut') || {}).value || '';
  dpRenderEvolsTable(_dpEvolsData.filter(function(e){
    return (!s  || (e.titre||'').toLowerCase().includes(s.toLowerCase()))
        && (!st || e.statut === st);
  }));
}

function dpRenderEvolsTable(evols) {
  var tbody = document.getElementById('dp-evols-tbody');
  if (!tbody) return;
  if (!evols.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#94a3b8;">Aucune évolution</td></tr>';
    return;
  }
  tbody.innerHTML = evols.map(function(ev){
    var date = new Date(ev.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
    return `<tr class="dp-row-clickable" onclick="dpOuvrirDetail('evolution',${ev.id})">
      <td><span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;font-family:monospace;">${ev.code||'EVOL-?'}</span></td>
      <td>
        <div style="font-weight:600;color:#0f172a;">${ev.titre||'—'}</div>
        ${ev.description?`<div style="font-size:12px;color:#94a3b8;">${ev.description.substring(0,65)}…</div>`:''}
      </td>
      <td>${dpBadgeStatut(ev.statut)}</td>
      <td style="font-size:12px;color:#64748b;">${date}</td>
    </tr>`;
  }).join('');
}

// ═════════════════════════════════════════════════
// MODAL DÉTAIL — bug ou évolution
// ═════════════════════════════════════════════════
async function dpOuvrirDetail(type, id) {
  var ex = document.getElementById('dp-detail-modal');
  if (ex) ex.remove();

  var overlay = document.createElement('div');
  overlay.className = 'dp-overlay';
  overlay.id = 'dp-detail-modal';
  overlay.innerHTML = `<div class="dp-modal" style="width:640px;"><div style="text-align:center;padding:40px;color:#94a3b8;">Chargement…</div></div>`;
  document.body.appendChild(overlay);

  try {
    var table = type === 'bug' ? 'dsp_bugs' : 'dsp_evolutions';
    var { data } = await db.from(table).select('*').eq('id', id).single();
    if (!data) throw new Error('Introuvable');
    var commRes = await db.from('dsp_commentaires').select('*').eq('ref_type', type).eq('ref_id', id).order('created_at',{ascending:true});
    dpRenderDetailModal(overlay.querySelector('.dp-modal'), type, data, commRes.data || []);
  } catch(e) {
    overlay.querySelector('.dp-modal').innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">Erreur : ${e.message}</div>`;
  }
}

function dpRenderDetailModal(box, type, data, comments) {
  var isBug  = type === 'bug';
  var etapes = isBug
    ? ['Nouveau','En analyse','En correction','En staging','Corrigé']
    : ['Nouvelle','En analyse','Acceptée','En développement','Déployée'];
  var statut  = data.statut || etapes[0];
  var stepIdx = etapes.indexOf(statut);
  var code    = data.code || (isBug ? 'BUG-?' : 'EVOL-?');
  var accentColor = DP_ACCENT;

  box.innerHTML = `
    <!-- ── En-tête ── -->
    <div class="dp-detail-header">
      <div>
        <span style="font-size:11px;font-weight:700;color:#94a3b8;font-family:monospace;">${code}</span>
        <h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:4px 0 0;">${data.titre}</h2>
      </div>
      <button onclick="document.getElementById('dp-detail-modal').remove()"
        style="background:#f1f5f9;border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;color:#64748b;flex-shrink:0;">✕</button>
    </div>

    <div class="dp-detail-body">

      <!-- ── Progression ── -->
      <div>
        <div class="dp-detail-section-label">Progression</div>
        <div class="dp-progress">
          ${etapes.map(function(e, i) {
            var done    = i < stepIdx;
            var current = i === stepIdx;
            var dotBg   = current ? accentColor : (done ? '#e2e8f0' : '#f1f5f9');
            var dotBorder = done || current ? (current ? accentColor : '#0f172a') : '#e2e8f0';
            var dotColor  = current ? '#fff' : (done ? '#64748b' : '#94a3b8');
            return `<div style="display:flex;align-items:flex-start;flex-shrink:0;">
              <div style="text-align:center;">
                <div class="dp-step-dot" style="background:${dotBg};border:2px solid ${dotBorder};color:${dotColor};">
                  ${done ? '✓' : i+1}
                </div>
                <div style="font-size:10px;color:${done||current?'#0f172a':'#94a3b8'};margin-top:4px;max-width:68px;text-align:center;line-height:1.2;">${e}</div>
              </div>
              ${i < etapes.length-1 ? `<div class="dp-step-line" style="background:${done?'#94a3b8':'#e2e8f0'};"></div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- ── Infos ── -->
      <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
        ${isBug && data.urgence ? `<div><div class="dp-detail-section-label" style="margin-bottom:4px;">Urgence</div>${dpBadgeUrgence(data.urgence)}</div>` : ''}
        ${isBug && data.zone    ? `<div><div class="dp-detail-section-label" style="margin-bottom:4px;">Zone</div><span style="font-weight:600;">${data.zone}</span></div>` : ''}
        ${isBug && data.environnement ? `<div><div class="dp-detail-section-label" style="margin-bottom:4px;">Env.</div>${dpBadgeEnv(data.environnement)}</div>` : ''}
        ${data.date_echeance ? `<div><div class="dp-detail-section-label" style="margin-bottom:4px;">Échéance</div><span style="font-weight:600;">${new Date(data.date_echeance).toLocaleDateString('fr-FR')}</span></div>` : ''}
        ${data.description ? `<div style="grid-column:1/-1;"><div class="dp-detail-section-label" style="margin-bottom:4px;">Description</div><p style="margin:0;color:#374151;font-size:13px;">${data.description}</p></div>` : ''}
        ${data.screenshot ? `<div style="grid-column:1/-1;"><div class="dp-detail-section-label" style="margin-bottom:6px;">Capture d'écran</div><img src="${data.screenshot}" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;max-height:200px;object-fit:contain;"></div>` : ''}
      </div>

      <!-- ── Admin ── -->
      <div class="dp-admin-box">
        <div class="dp-admin-box-title">⚙️ GESTION ADMIN</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Statut</label>
            <select id="dp-det-statut" style="width:100%;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
              ${etapes.map(function(e){ return `<option ${e===statut?'selected':''}>${e}</option>`; }).join('')}
              ${!isBug ? `<option ${'Refusée'===statut?'selected':''}>Refusée</option>` : ''}
              ${isBug  ? `<option ${'Ne sera pas corrigé'===statut?'selected':''}>Ne sera pas corrigé</option>` : ''}
            </select>
          </div>
          ${isBug ? `<div>
            <label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Urgence</label>
            <select id="dp-det-urgence" style="width:100%;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
              <option value="">— Choisir —</option>
              ${['Critique','Majeur','Mineur','Cosmétique'].map(function(u){ return `<option ${u===data.urgence?'selected':''}>${u}</option>`; }).join('')}
            </select>
          </div>` : ''}
          <div>
            <label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Échéance</label>
            <input type="date" id="dp-det-echeance" value="${data.date_echeance||''}"
              style="width:100%;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
          </div>
        </div>
        ${!isBug ? `<div style="margin-top:10px;">
          <label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Retour admin</label>
          <textarea id="dp-det-comm-admin" rows="2"
            style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"
            placeholder="Justification, retour…">${data.commentaire_admin||''}</textarea>
        </div>` : ''}
        <button onclick="dpSauvegarderDetail('${type}',${data.id})"
          class="dp-btn dp-btn-dark" style="margin-top:12px;">💾 Sauvegarder</button>
      </div>

      <!-- ── Commentaires ── -->
      <div>
        <div class="dp-detail-section-label">Commentaires (${comments.length})</div>
        <div class="dp-comments-box" id="dp-det-comments">
          ${comments.length
            ? comments.map(function(c){
                var d = new Date(c.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
                return `<div class="dp-comment-item">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span class="dp-comment-author">${c.auteur_nom||'Admin'}</span>
                    <span class="dp-comment-date">${d}</span>
                  </div>
                  <p class="dp-comment-text">${c.contenu}</p>
                </div>`;
              }).join('')
            : '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">Aucun commentaire</div>'
          }
        </div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="dp-det-new-comment" placeholder="Ajouter un commentaire…"
            class="dp-input" style="flex:1;"
            onkeydown="if(event.key==='Enter') dpAjouterCommentaire('${type}',${data.id})">
          <button onclick="dpAjouterCommentaire('${type}',${data.id})"
            class="dp-btn dp-btn-dark">Envoyer</button>
        </div>
      </div>

    </div>`;
}

async function dpSauvegarderDetail(type, id) {
  var statut    = (document.getElementById('dp-det-statut')      || {}).value || '';
  var echeance  = (document.getElementById('dp-det-echeance')    || {}).value || null;
  var urgence   = (document.getElementById('dp-det-urgence')     || {}).value || null;
  var commAdmin = (document.getElementById('dp-det-comm-admin')  || {}).value || null;
  var table     = type === 'bug' ? 'dsp_bugs' : 'dsp_evolutions';
  var payload   = { statut };
  if (echeance)              payload.date_echeance     = echeance;
  if (urgence)               payload.urgence           = urgence;
  if (commAdmin !== null && type === 'evolution') payload.commentaire_admin = commAdmin;
  try {
    var { error } = await db.from(table).update(payload).eq('id', id);
    if (error) throw error;
    document.getElementById('dp-detail-modal').remove();
    if (typeof showNotif === 'function') showNotif('✅ Mis à jour !', 'success');
    dpLoadAllStats();
    // Rafraîchir l'onglet courant
    var main = document.getElementById('dp-main-content');
    if (main) dpSwitchSection(_dpSection);
  } catch(e) {
    if (typeof showNotif === 'function') showNotif('Erreur : ' + e.message, 'error');
  }
}

async function dpAjouterCommentaire(type, id) {
  var input   = document.getElementById('dp-det-new-comment');
  var contenu = (input || {}).value || '';
  if (!contenu.trim()) return;
  try {
    await db.from('dsp_commentaires').insert({
      ref_type: type, ref_id: id, contenu: contenu.trim(),
      auteur_id:  (typeof currentUser     !== 'undefined' && currentUser)     ? currentUser.id : null,
      auteur_nom: (typeof currentUserData !== 'undefined' && currentUserData) ? currentUserData.prenom + ' ' + currentUserData.nom : 'Admin'
    });
    if (input) input.value = '';
    dpOuvrirDetail(type, id); // Réouvre le modal pour afficher le nouveau commentaire
  } catch(e) {
    if (typeof showNotif === 'function') showNotif('Erreur : ' + e.message, 'error');
  }
}

// ═════════════════════════════════════════════════
// SECTION TÂCHES
// ═════════════════════════════════════════════════
function dpRenderTaches(container) {
  container.innerHTML = `
    <p class="dp-page-title">📝 Tâches</p>
    <p class="dp-page-sub">Travaux planifiés · en cours · terminés</p>
    <div class="dp-card">
      <div class="dp-card-header">
        <div class="dp-filters">
          <input class="dp-input" type="text" id="dp-taches-search" placeholder="Rechercher…" oninput="dpFilterTaches()" style="width:150px;">
          <select class="dp-input" id="dp-taches-statut" onchange="dpFilterTaches()">
            <option value="">Tous statuts</option>
            <option>À faire</option><option>En cours</option><option>Terminé</option>
          </select>
          <select class="dp-input" id="dp-taches-prio" onchange="dpFilterTaches()">
            <option value="">Toute priorité</option>
            <option>Haute</option><option>Moyenne</option><option>Basse</option>
          </select>
        </div>
        <button class="dp-btn dp-btn-accent" onclick="dpOpenTacheForm(null)">+ Nouvelle tâche</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="dp-tbl">
          <thead><tr>
            <th>ID</th><th>TITRE</th><th>PRIORITÉ</th><th>STATUT</th><th>ÉCHÉANCE</th>
          </tr></thead>
          <tbody id="dp-taches-tbody">
            <tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8;">Chargement…</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
  dpLoadTaches();
}

async function dpLoadTaches() {
  try {
    var { data, error } = await db.from('dsp_taches').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    _dpTachesData = data || [];
    dpRenderTachesTable(_dpTachesData);
  } catch(e) {
    var tbody = document.getElementById('dp-taches-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#f59e0b;">
      ${e.message && e.message.includes('relation') ? '⚠️ Table <code>dsp_taches</code> absente — exécute la migration SQL' : 'Erreur : ' + e.message}
    </td></tr>`;
  }
}

function dpFilterTaches() {
  var s  = (document.getElementById('dp-taches-search') || {}).value || '';
  var st = (document.getElementById('dp-taches-statut') || {}).value || '';
  var p  = (document.getElementById('dp-taches-prio')   || {}).value || '';
  dpRenderTachesTable(_dpTachesData.filter(function(t){
    return (!s  || (t.titre||'').toLowerCase().includes(s.toLowerCase()))
        && (!st || t.statut === st)
        && (!p  || t.priorite === p);
  }));
}

function dpRenderTachesTable(taches) {
  var tbody = document.getElementById('dp-taches-tbody');
  if (!tbody) return;
  if (!taches.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">Aucune tâche</td></tr>';
    return;
  }
  tbody.innerHTML = taches.map(function(t){
    var echeance = t.date_cible ? new Date(t.date_cible).toLocaleDateString('fr-FR') : '—';
    return `<tr class="dp-row-clickable" onclick="dpOpenTacheForm(${JSON.stringify(t).replace(/"/g,'&quot;')})">
      <td><span style="font-size:11px;font-weight:700;color:#7c3aed;font-family:monospace;">T-${String(t.id).padStart(3,'0')}</span></td>
      <td>
        <div style="font-weight:600;color:#0f172a;">${t.titre||'—'}</div>
        ${t.description?`<div style="font-size:12px;color:#94a3b8;">${t.description.substring(0,65)}…</div>`:''}
      </td>
      <td>${dpBadgePriorite(t.priorite)}</td>
      <td>${dpBadgeStatutTache(t.statut)}</td>
      <td style="color:#64748b;">${echeance}</td>
    </tr>`;
  }).join('');
}

function dpOpenTacheForm(tache) {
  _dpSelectedPriorite = tache ? tache.priorite : '';
  var overlay = document.createElement('div');
  overlay.className = 'dp-overlay';
  overlay.id = 'dp-tache-modal';
  overlay.innerHTML = `
    <div class="dp-modal dp-form-modal">
      <div class="dp-modal-title">${tache ? '📝 Modifier la tâche' : '📝 Nouvelle tâche'}</div>
      <div id="dp-tache-err" class="dp-modal-err"></div>
      <div class="dp-fgrp">
        <label class="dp-flabel">TITRE *</label>
        <input class="dp-finput" id="dp-tache-titre" value="${tache?(tache.titre||''):''}" placeholder="Intitulé…">
      </div>
      <div class="dp-fgrp">
        <label class="dp-flabel">DESCRIPTION</label>
        <textarea class="dp-ftextarea" id="dp-tache-desc" placeholder="Détails…">${tache?(tache.description||''):''}</textarea>
      </div>
      <div class="dp-grid-2">
        <div>
          <label class="dp-flabel">STATUT</label>
          <select class="dp-fselect" id="dp-tache-statut">
            <option ${!tache||tache.statut==='À faire'?'selected':''}>À faire</option>
            <option ${tache&&tache.statut==='En cours'?'selected':''}>En cours</option>
            <option ${tache&&tache.statut==='Terminé'?'selected':''}>Terminé</option>
          </select>
        </div>
        <div>
          <label class="dp-flabel">ÉCHÉANCE</label>
          <input class="dp-finput" type="date" id="dp-tache-echeance" value="${tache&&tache.date_cible?tache.date_cible.substring(0,10):''}">
        </div>
      </div>
      <div class="dp-fgrp">
        <label class="dp-flabel">PRIORITÉ *</label>
        <div class="dp-prio-grid">
          ${[['Basse','#f0fdf4','#166534'],['Moyenne','#fefce8','#854d0e'],['Haute','#fff1f2','#9f1239']].map(function(p){
            var sel = tache && tache.priorite === p[0];
            return `<button class="dp-choice-btn" id="dp-prio-${p[0]}"
              style="background:${p[1]};color:${p[2]};${sel?'outline:2.5px solid #0f172a;':''}"
              onclick="dpSelPrio('${p[0]}')">${p[0]}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="dp-modal-footer">
        <button class="dp-btn dp-btn-ghost" onclick="document.getElementById('dp-tache-modal').remove()">Annuler</button>
        <button class="dp-btn dp-btn-accent" onclick="dpSaveTache(${tache?tache.id:'null'})">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function dpSelPrio(p) {
  _dpSelectedPriorite = p;
  ['Basse','Moyenne','Haute'].forEach(function(x){
    var btn = document.getElementById('dp-prio-'+x);
    if (btn) btn.style.outline = x === p ? '2.5px solid #0f172a' : 'none';
  });
}

async function dpSaveTache(id) {
  var titre    = (document.getElementById('dp-tache-titre')    || {}).value || '';
  var desc     = (document.getElementById('dp-tache-desc')     || {}).value || '';
  var statut   = (document.getElementById('dp-tache-statut')   || {}).value || 'À faire';
  var echeance = (document.getElementById('dp-tache-echeance') || {}).value || null;
  var errEl    = document.getElementById('dp-tache-err');
  if (!titre.trim())      { errEl.textContent='Titre obligatoire.'; errEl.style.display='block'; return; }
  if (!_dpSelectedPriorite) { errEl.textContent='Choisis une priorité.'; errEl.style.display='block'; return; }
  try {
    var payload = { titre, description:desc, statut, priorite:_dpSelectedPriorite, date_cible:echeance||null };
    var q = id ? db.from('dsp_taches').update(payload).eq('id',id) : db.from('dsp_taches').insert(payload);
    var { error } = await q;
    if (error) throw error;
    document.getElementById('dp-tache-modal').remove();
    _dpSelectedPriorite = '';
    await dpLoadTaches();
    await dpLoadAllStats();
    if (typeof showNotif === 'function') showNotif('✅ Tâche enregistrée !', 'success');
  } catch(e) { errEl.textContent='Erreur : '+e.message; errEl.style.display='block'; }
}

// ═════════════════════════════════════════════════
// FORMULAIRES SIGNALEMENT (admin)
// ═════════════════════════════════════════════════
function dpOpenBugForm() {
  _dpSelectedUrgence = '';
  var overlay = document.createElement('div');
  overlay.className = 'dp-overlay';
  overlay.id = 'dp-bug-modal';
  overlay.innerHTML = `
    <div class="dp-modal dp-form-modal">
      <div class="dp-modal-title">🐛 Signaler un bug</div>
      <div id="dp-bug-err" class="dp-modal-err"></div>
      <div class="dp-fgrp">
        <label class="dp-flabel">TITRE *</label>
        <input class="dp-finput" id="dp-bug-titre" placeholder="Décris le problème…">
      </div>
      <div class="dp-fgrp">
        <label class="dp-flabel">DESCRIPTION</label>
        <textarea class="dp-ftextarea" id="dp-bug-desc" placeholder="Étapes pour reproduire…"></textarea>
      </div>
      <div class="dp-grid-2">
        <div>
          <label class="dp-flabel">ZONE</label>
          <select class="dp-fselect" id="dp-bug-zone">
            <option value="">— Choisir —</option>
            <option>Dispatch</option><option>Dossiers</option><option>Habilitations</option>
            <option>Import</option><option>Dplane</option><option>Dvol</option>
            <option>Dashboard</option><option>Admin</option><option>Dproject</option><option>Autre</option>
          </select>
        </div>
        <div>
          <label class="dp-flabel">ENVIRONNEMENT</label>
          <select class="dp-fselect" id="dp-bug-env">
            <option value="">— Choisir —</option><option>PROD</option><option>Staging</option>
          </select>
        </div>
      </div>
      <div class="dp-fgrp">
        <label class="dp-flabel">URGENCE *</label>
        <div class="dp-urgence-grid">
          ${[['Cosmétique','#f1f5f9','#64748b'],['Mineur','#fefce8','#854d0e'],['Majeur','#fff7ed','#9a3412'],['Critique','#fee2e2','#991b1b']].map(function(u){
            return `<button class="dp-choice-btn" id="dp-urg-${u[0]}" style="background:${u[1]};color:${u[2]};"
              onclick="dpSelUrg('${u[0]}')">${u[0]}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="dp-modal-footer">
        <button class="dp-btn dp-btn-ghost" onclick="document.getElementById('dp-bug-modal').remove()">Annuler</button>
        <button class="dp-btn dp-btn-accent" onclick="dpSaveBug()">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function dpSelUrg(u) {
  _dpSelectedUrgence = u;
  ['Cosmétique','Mineur','Majeur','Critique'].forEach(function(x){
    var btn = document.getElementById('dp-urg-'+x);
    if (btn) btn.style.outline = x === u ? '2.5px solid #0f172a' : 'none';
  });
}

async function dpSaveBug() {
  var titre = (document.getElementById('dp-bug-titre') || {}).value || '';
  var desc  = (document.getElementById('dp-bug-desc')  || {}).value || '';
  var zone  = (document.getElementById('dp-bug-zone')  || {}).value || '';
  var env   = (document.getElementById('dp-bug-env')   || {}).value || '';
  var errEl = document.getElementById('dp-bug-err');
  if (!titre.trim())       { errEl.textContent='Titre obligatoire.';         errEl.style.display='block'; return; }
  if (!_dpSelectedUrgence) { errEl.textContent='Choisis un niveau d\'urgence.'; errEl.style.display='block'; return; }
  try {
    var { error } = await db.from('dsp_bugs').insert({
      titre, description:desc, zone:zone||null, environnement:env||null,
      urgence:_dpSelectedUrgence, statut:'Nouveau',
      signale_par: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null
    });
    if (error) throw error;
    document.getElementById('dp-bug-modal').remove();
    _dpSelectedUrgence = '';
    await dpLoadBugs();
    await dpLoadAllStats();
    if (typeof showNotif === 'function') showNotif('✅ Bug signalé !', 'success');
  } catch(e) { errEl.textContent='Erreur : '+e.message; errEl.style.display='block'; }
}

function dpOpenEvolForm() {
  _dpSelectedPriorite = '';
  var overlay = document.createElement('div');
  overlay.className = 'dp-overlay';
  overlay.id = 'dp-evol-modal';
  overlay.innerHTML = `
    <div class="dp-modal dp-form-modal">
      <div class="dp-modal-title">💡 Demander une évolution</div>
      <div id="dp-evol-err" class="dp-modal-err"></div>
      <div class="dp-fgrp">
        <label class="dp-flabel">TITRE *</label>
        <input class="dp-finput" id="dp-evol-titre" placeholder="Ex : Ajouter un export PDF…">
      </div>
      <div class="dp-fgrp">
        <label class="dp-flabel">DESCRIPTION</label>
        <textarea class="dp-ftextarea" id="dp-evol-desc" placeholder="Détaille le besoin…"></textarea>
      </div>
      <div class="dp-grid-2">
        <div>
          <label class="dp-flabel">MODULE</label>
          <select class="dp-fselect" id="dp-evol-zone">
            <option value="">— Choisir —</option>
            <option>Dispatch</option><option>Dossiers</option><option>Habilitations</option>
            <option>Import</option><option>Dplane</option><option>Dvol</option>
            <option>Dashboard</option><option>Admin</option><option>Dproject</option><option>Autre</option>
          </select>
        </div>
        <div></div>
      </div>
      <div class="dp-fgrp">
        <label class="dp-flabel">PRIORITÉ *</label>
        <div class="dp-prio-grid">
          ${[['Basse','#f0fdf4','#166534'],['Moyenne','#fefce8','#854d0e'],['Haute','#fff1f2','#9f1239']].map(function(p){
            return `<button class="dp-choice-btn" id="dp-evol-prio-${p[0]}" style="background:${p[1]};color:${p[2]};"
              onclick="dpSelEvolPrio('${p[0]}')">${p[0]}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="dp-modal-footer">
        <button class="dp-btn dp-btn-ghost" onclick="document.getElementById('dp-evol-modal').remove()">Annuler</button>
        <button class="dp-btn dp-btn-accent" onclick="dpSaveEvol(null)">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function dpSelEvolPrio(p) {
  _dpSelectedPriorite = p;
  ['Basse','Moyenne','Haute'].forEach(function(x){
    var btn = document.getElementById('dp-evol-prio-'+x);
    if (btn) btn.style.outline = x === p ? '2.5px solid #0f172a' : 'none';
  });
}

async function dpSaveEvol(id) {
  var titre  = (document.getElementById('dp-evol-titre') || {}).value || '';
  var desc   = (document.getElementById('dp-evol-desc')  || {}).value || '';
  var zone   = (document.getElementById('dp-evol-zone')  || {}).value || null;
  var errEl  = document.getElementById('dp-evol-err');
  if (!titre.trim())        { errEl.textContent='Titre obligatoire.';    errEl.style.display='block'; return; }
  if (!_dpSelectedPriorite) { errEl.textContent='Choisis une priorité.'; errEl.style.display='block'; return; }
  try {
    var payload = { titre, description:desc, zone:zone||null, priorite:_dpSelectedPriorite, statut:'Nouvelle',
      soumis_par: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null };
    var q = id ? db.from('dsp_evolutions').update(payload).eq('id',id) : db.from('dsp_evolutions').insert(payload);
    var { error } = await q;
    if (error) throw error;
    document.getElementById('dp-evol-modal').remove();
    _dpSelectedPriorite = '';
    await dpLoadEvols();
    await dpLoadAllStats();
    if (typeof showNotif === 'function') showNotif('✅ Évolution enregistrée !', 'success');
  } catch(e) { errEl.textContent='Erreur : '+e.message; errEl.style.display='block'; }
}

// ═════════════════════════════════════════════════
// SECTION ROADMAP — Kanban
// ═════════════════════════════════════════════════
async function dpRenderRoadmap(container) {
  container.innerHTML = `
    <p class="dp-page-title">🗺️ Roadmap</p>
    <p class="dp-page-sub">Vue globale · tâches + évolutions par statut</p>
    <div id="dp-roadmap-board"><div class="dp-empty"><div class="dp-empty-icon">⏳</div><p>Chargement…</p></div></div>`;

  try {
    var [taches, evols] = await Promise.all([
      db.from('dsp_taches').select('*').order('created_at',{ascending:false}),
      db.from('dsp_evolutions').select('*').order('created_at',{ascending:false})
    ]);

    var toKanban = function(s) {
      if (['Nouvelle','En analyse','Acceptée','À faire'].includes(s)) return 'À faire';
      if (['En développement','En cours','En correction','En staging'].includes(s)) return 'En cours';
      if (['Déployée','Corrigé','Terminé'].includes(s)) return 'Terminé';
      if (['Refusée','Ne sera pas corrigé'].includes(s)) return 'Annulé';
      return 'À faire';
    };

    var allItems = [];
    (taches.data || []).forEach(function(t){ allItems.push({type:'tache',titre:t.titre,statut:toKanban(t.statut),priorite:t.priorite,id:t.id}); });
    (evols.data  || []).forEach(function(e){ allItems.push({type:'evol', titre:e.titre,statut:toKanban(e.statut),priorite:e.priorite,id:e.id}); });

    var cols = [
      {key:'À faire', icon:'📋', color:'#64748b'},
      {key:'En cours',icon:'⚙️',  color:'#0369a1'},
      {key:'Terminé', icon:'✅',  color:'#166534'},
      {key:'Annulé',  icon:'❌',  color:'#9a3412'}
    ];

    var board = document.getElementById('dp-roadmap-board');
    if (!board) return;
    board.innerHTML = `<div class="dp-kanban">` +
      cols.map(function(col){
        var items = allItems.filter(function(i){ return i.statut === col.key; });
        return `<div class="dp-kanban-col">
          <div class="dp-kanban-col-head">
            ${col.icon} ${col.key}
            <span style="margin-left:auto;background:#e2e8f0;color:#64748b;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;">${items.length}</span>
          </div>
          ${items.length === 0
            ? '<div class="dp-kanban-empty">Vide</div>'
            : items.map(function(item){
                return `<div class="dp-kanban-card">
                  <div class="dp-kanban-card-title">${item.titre||'—'}</div>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <span style="font-size:11px;">${item.type==='tache'?'📝':'💡'}</span>
                    ${dpBadgePriorite(item.priorite)}
                  </div>
                </div>`;
              }).join('')
          }
        </div>`;
      }).join('') + `</div>`;
  } catch(e) {
    var board2 = document.getElementById('dp-roadmap-board');
    if (board2) board2.innerHTML = `<div class="dp-empty"><div class="dp-empty-icon">⚠️</div><p>Exécute la migration SQL pour activer la roadmap</p></div>`;
  }
}

// ═════════════════════════════════════════════════
// HELPERS — badges avec point de couleur
// ═════════════════════════════════════════════════
function dpBadgeUrgence(u) {
  var map = {
    'Critique':   {bg:'#fee2e2',color:'#991b1b',dot:'#dc2626'},
    'Majeur':     {bg:'#fff7ed',color:'#9a3412',dot:'#ea580c'},
    'Mineur':     {bg:'#fefce8',color:'#854d0e',dot:'#ca8a04'},
    'Cosmétique': {bg:'#eff6ff',color:'#1e40af',dot:'#3b82f6'}
  };
  var s = map[u] || {bg:'#f1f5f9',color:'#64748b',dot:'#94a3b8'};
  return u ? `<span class="dp-badge" style="background:${s.bg};color:${s.color};"><span class="dp-badge-dot" style="background:${s.dot};"></span>${u}</span>` : '—';
}

function dpBadgeEnv(e) {
  if (e === 'PROD')    return `<span class="dp-badge" style="background:#fee2e2;color:#991b1b;"><span class="dp-badge-dot" style="background:#dc2626;"></span>PROD</span>`;
  if (e === 'Staging') return `<span class="dp-badge" style="background:#fef9c3;color:#854d0e;"><span class="dp-badge-dot" style="background:#ca8a04;"></span>Staging</span>`;
  return '<span style="color:#94a3b8;">—</span>';
}

function dpBadgeStatut(s) {
  var map = {
    'Nouveau':          {bg:'#f1f5f9',color:'#64748b'},
    'Nouvelle':         {bg:'#f1f5f9',color:'#64748b'},
    'En analyse':       {bg:'#eff6ff',color:'#1e40af'},
    'En correction':    {bg:'#fff7ed',color:'#9a3412'},
    'En staging':       {bg:'#f0fdf4',color:'#166534'},
    'Corrigé':          {bg:'#dcfce7',color:'#166534'},
    'En développement': {bg:'#fef9c3',color:'#854d0e'},
    'Acceptée':         {bg:'#dcfce7',color:'#166534'},
    'Refusée':          {bg:'#fee2e2',color:'#991b1b'},
    'Déployée':         {bg:'#dcfce7',color:'#166534'},
    'Ne sera pas corrigé':{bg:'#f1f5f9',color:'#64748b'}
  };
  var st = map[s] || {bg:'#f1f5f9',color:'#64748b'};
  return s ? `<span class="dp-badge" style="background:${st.bg};color:${st.color};"><span class="dp-badge-dot" style="background:${st.color};"></span>${s}</span>` : '—';
}

function dpBadgeStatutTache(s) {
  var map = {'À faire':{bg:'#f1f5f9',color:'#64748b'},'En cours':{bg:'#dbeafe',color:'#1e40af'},'Terminé':{bg:'#dcfce7',color:'#166534'}};
  var st = map[s] || {bg:'#f1f5f9',color:'#64748b'};
  return s ? `<span class="dp-badge" style="background:${st.bg};color:${st.color};"><span class="dp-badge-dot" style="background:${st.color};"></span>${s}</span>` : '—';
}

function dpBadgePriorite(p) {
  var map = {'Haute':{bg:'#fff1f2',color:'#9f1239'},'Moyenne':{bg:'#fefce8',color:'#854d0e'},'Basse':{bg:'#f0fdf4',color:'#166534'}};
  var st = map[p] || {bg:'#f1f5f9',color:'#64748b'};
  return p ? `<span class="dp-badge" style="background:${st.bg};color:${st.color};font-size:11px;">${p}</span>` : '';
}
