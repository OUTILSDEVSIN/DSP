/* =========================================================
   Dproject — Module gestion projet DSP
   v2.0 — Design unifié + Supabase
   Onglet Bugs : ✅ fonctionnel
   Onglets Évolutions / Tâches / Roadmap : 🔜 à venir
   ========================================================= */

function dprojectInit() {
  dprojectRender();
}

function dprojectRender() {
  var container = document.getElementById('dproject-content');
  if (!container) return;
  container.style.padding = '0';
  container.style.background = '#eef1f6';
  container.style.minHeight = '100%';
  container.style.fontFamily = "system-ui, -apple-system, sans-serif";

  container.innerHTML = `
<style>
/* ---- Variables ---- */
#dproject-content {
  --bg:#eef1f6;
  --surface:#ffffff;
  --ink-900:#0f172a; --ink-800:#1e293b; --ink-700:#334155;
  --ink-600:#475569; --ink-500:#64748b; --ink-400:#94a3b8;
  --ink-300:#cbd5e1; --ink-200:#e2e8f0; --ink-100:#f1f5f9; --ink-50:#f8fafc;
  --navy:#1B3461; --navy-2:#22306e;
  --rose:#e5195e; --rose-2:#c61148;
  --brand-700:#2f3d95; --brand-600:#3b4cb8; --brand-500:#4f63d2;
  --brand-100:#e6eaf7; --brand-50:#f3f5fb;
  --ok-700:#166b4a; --ok-100:#e3f5ec; --ok-50:#f1faf5;
  --warn-700:#8a5a1c; --warn-100:#fbefd9; --warn-50:#fdf8ed;
  --danger-700:#a1293a; --danger-100:#fbe7ea; --danger-50:#fdf4f5;
  --info-700:#1f458c; --info-100:#e3eefb; --info-50:#f1f6fc;
  --shadow-md:0 1px 2px rgba(15,23,42,.04),0 4px 12px -4px rgba(15,23,42,.08);
  --shadow-xs:0 1px 0 rgba(15,23,42,.04);
}
#dproject-content *{box-sizing:border-box}
#dproject-content a{text-decoration:none}

/* ---- Page ---- */
.dp-page{padding:24px 32px 48px;max-width:1480px;margin:0 auto}
.dp-page-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px;gap:16px;flex-wrap:wrap}
.dp-page-head__title{font-size:26px;font-weight:700;letter-spacing:-.02em;color:var(--brand-700);margin:0}
.dp-page-head__sub{font-size:13.5px;color:var(--ink-500);margin-top:4px}

/* ---- Buttons ---- */
.dp-btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:9px;border:1px solid transparent;font:inherit;font-size:13px;font-weight:500;cursor:pointer;background:#fff;color:var(--ink-800);box-shadow:var(--shadow-xs);transition:transform .1s}
.dp-btn:hover{transform:translateY(-1px)}
.dp-btn svg{width:14px;height:14px;flex-shrink:0}
.dp-btn--ghost{background:#fff;border-color:var(--ink-200);color:var(--ink-800)}
.dp-btn--ghost:hover{background:var(--ink-50);border-color:var(--ink-300)}
.dp-btn--primary{background:linear-gradient(180deg,#2b3a87 0%,#1f2a6d 100%);color:#fff;border-color:rgba(15,23,42,.15)}
.dp-btn--rose{background:linear-gradient(180deg,#f04d65 0%,#d8344e 100%);color:#fff;border-color:rgba(0,0,0,.1)}

/* ---- Tabs ---- */
.dp-tabs{display:flex;gap:4px;background:#fff;border:1px solid rgba(15,23,42,.06);border-radius:12px;padding:4px;box-shadow:var(--shadow-xs);margin-bottom:16px;width:fit-content}
.dp-tabs button{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:8px;border:0;background:transparent;font:inherit;font-size:13px;font-weight:500;color:var(--ink-600);cursor:pointer;transition:background .12s,color .12s}
.dp-tabs button:hover{background:var(--ink-50);color:var(--ink-800)}
.dp-tabs button.is-active{background:var(--navy);color:#fff;font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.15)}
.dp-tabs button .dp-count{display:inline-grid;place-items:center;min-width:20px;height:18px;padding:0 6px;border-radius:5px;background:#fde7ef;color:var(--rose);font-size:10.5px;font-weight:700}
.dp-tabs button.is-active .dp-count{background:rgba(255,255,255,.18);color:#fff}

/* ---- KPIs ---- */
.dp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
.dp-kpi{background:var(--surface);border:1px solid rgba(15,23,42,.06);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow-xs);display:flex;align-items:center;gap:12px}
.dp-kpi__ico{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
.dp-kpi__ico--rose{background:#fde7ef;color:var(--rose)}
.dp-kpi__ico--blue{background:var(--brand-50);color:var(--brand-700)}
.dp-kpi__ico--ok{background:var(--ok-50);color:var(--ok-700)}
.dp-kpi__ico--warn{background:var(--warn-50);color:var(--warn-700)}
.dp-kpi__ico svg{width:18px;height:18px}
.dp-kpi__label{font-size:11px;color:var(--ink-500);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.dp-kpi__value{font-size:22px;font-weight:700;color:var(--ink-900);margin-top:2px}
.dp-kpi__sub{font-size:11px;color:var(--danger-700);font-weight:600;margin-top:2px}

/* ---- Card ---- */
.dp-card{background:var(--surface);border:1px solid rgba(15,23,42,.06);border-radius:18px;box-shadow:var(--shadow-md);overflow:hidden}
.dp-card__head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--ink-100)}
.dp-card__title{font-size:14px;font-weight:700;color:var(--navy);margin:0}
.dp-card__sub{font-size:12px;color:var(--ink-500);margin-top:2px}

/* ---- Toolbar ---- */
.dp-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dp-select{height:32px;padding:0 30px 0 12px;border-radius:8px;border:1px solid var(--ink-200);background:#fff url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.4'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e") no-repeat right 10px center;font:inherit;font-size:12.5px;color:var(--ink-800);cursor:pointer}
.dp-search{position:relative;width:220px}
.dp-search input{width:100%;height:32px;border:1px solid var(--ink-200);border-radius:8px;background:#fff;padding:0 10px 0 30px;font:inherit;font-size:12.5px;color:var(--ink-800);outline:none}
.dp-search input:focus{border-color:var(--rose);box-shadow:0 0 0 3px rgba(229,25,94,.12)}
.dp-search svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--ink-400);width:13px;height:13px}

/* ---- Table ---- */
table.dp-t{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.dp-t thead th{background:var(--ink-50);color:var(--ink-500);padding:10px 14px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;text-align:left;border-bottom:1px solid var(--ink-200)}
.dp-t tbody td{padding:12px 14px;border-bottom:1px solid var(--ink-100);vertical-align:middle}
.dp-t tbody tr{cursor:pointer;transition:background .1s}
.dp-t tbody tr:hover td{background:#fafbfd}
.dp-t tbody tr:last-child td{border-bottom:none}
.dp-title-cell{font-weight:600;color:var(--ink-900);font-size:13px}
.dp-desc{font-size:11.5px;color:var(--ink-500);margin-top:2px;line-height:1.4}

/* ---- Ref badges ---- */
.dp-ref{font-family:monospace;font-size:11.5px;font-weight:600;color:var(--navy);background:#eef1f6;padding:3px 8px;border-radius:5px;border:1px solid var(--ink-200)}
.dp-ref--bug{color:#dc2626;background:#fde7e7;border-color:#f3a0a0}

/* ---- Pills statuts ---- */
.dp-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid;white-space:nowrap}
.dp-pill::before{content:"";width:6px;height:6px;border-radius:50%;flex-shrink:0}
.dp-pill--nouveau    {background:var(--ink-50);   border-color:var(--ink-200); color:var(--ink-700)}
.dp-pill--nouveau::before{background:var(--ink-400)}
.dp-pill--analyse    {background:var(--info-50);  border-color:#a0c4f3;        color:var(--info-700)}
.dp-pill--analyse::before{background:#2563eb}
.dp-pill--correction {background:var(--warn-50);  border-color:#f3c988;        color:var(--warn-700)}
.dp-pill--correction::before{background:#d97706}
.dp-pill--staging    {background:var(--warn-50);  border-color:#f3c988;        color:var(--warn-700)}
.dp-pill--staging::before{background:#d97706}
.dp-pill--corrige    {background:var(--ok-50);    border-color:#a0e0c0;        color:var(--ok-700)}
.dp-pill--corrige::before{background:#16a34a}

/* ---- Urgence ---- */
.dp-urg{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid;white-space:nowrap}
.dp-urg__dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dp-urg--critique{background:#fde7e7;border-color:#f3a0a0;color:#8c1f1f}
.dp-urg--critique .dp-urg__dot{background:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.15)}
.dp-urg--majeur{background:#fef3e2;border-color:#f3c988;color:#7a4a0c}
.dp-urg--majeur .dp-urg__dot{background:#ea580c}
.dp-urg--mineur{background:#fef9c3;border-color:#fde68a;color:#854d0e}
.dp-urg--mineur .dp-urg__dot{background:#eab308}
.dp-urg--cosmetique{background:#e3eefb;border-color:#a0c4f3;color:#1f458c}
.dp-urg--cosmetique .dp-urg__dot{background:#2563eb}

/* ---- Zone + Env ---- */
.dp-zone{display:inline-flex;align-items:center;padding:2px 8px;border-radius:5px;background:var(--brand-50);color:var(--brand-700);font-size:10.5px;font-weight:600}
.dp-env-prod{display:inline-flex;align-items:center;padding:2px 8px;border-radius:5px;background:var(--danger-50);color:var(--danger-700);font-size:10.5px;font-weight:700}
.dp-env-staging{display:inline-flex;align-items:center;padding:2px 8px;border-radius:5px;background:var(--warn-50);color:var(--warn-700);font-size:10.5px;font-weight:700}

/* ---- À qualifier ---- */
.dp-qualifier-banner{background:linear-gradient(135deg,#fff7ed,#fff);border:2px solid #f97316;border-radius:14px;padding:16px 20px;margin-bottom:18px}
.dp-qualifier-banner__head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.dp-qualifier-count{background:#f97316;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}
.dp-qualifier-item{background:#fff;border:1px solid #fed7aa;border-radius:10px;padding:12px 16px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;transition:box-shadow .15s}
.dp-qualifier-item:last-child{margin-bottom:0}
.dp-qualifier-item:hover{box-shadow:0 2px 12px rgba(249,115,22,.15)}
.dp-qualifier-badge{background:#fff7ed;color:#9a3412;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap}

/* ---- Tab panels ---- */
.dp-tab-panel{display:none}
.dp-tab-panel.is-active{display:block}

/* ---- Modal ---- */
.dp-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
.dp-modal-box{background:#fff;border-radius:18px;width:100%;max-width:660px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 80px rgba(15,23,42,.25)}
.dp-modal-head{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.dp-modal-body{padding:16px 24px 24px;display:flex;flex-direction:column;gap:20px}
.dp-modal-close{background:var(--ink-100);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;color:var(--ink-600);flex-shrink:0;display:grid;place-items:center}
.dp-modal-close:hover{background:var(--ink-200)}
.dp-prog-wrap{display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:4px;gap:0}
.dp-prog-step{display:flex;align-items:flex-start;flex-shrink:0}
.dp-prog-circle{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin:0 auto}
.dp-prog-label{font-size:10px;margin-top:4px;max-width:68px;text-align:center;line-height:1.2}
.dp-prog-line{width:28px;height:2px;margin:14px 2px 0;flex-shrink:0}
.dp-info-grid{background:var(--ink-50);border-radius:10px;padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px}
.dp-info-label{font-size:10px;font-weight:700;color:var(--ink-400);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
.dp-admin-box{background:var(--info-50);border:1px solid #bae6fd;border-radius:10px;padding:14px 16px}
.dp-admin-box__title{font-size:11px;font-weight:700;color:var(--info-700);margin-bottom:12px}
.dp-form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.dp-form-label{font-size:11px;font-weight:600;color:var(--ink-700);display:block;margin-bottom:4px}
.dp-form-select{width:100%;padding:7px 10px;border:1.5px solid var(--ink-200);border-radius:8px;font-size:13px;font:inherit}
.dp-form-select:focus{outline:none;border-color:var(--rose)}
.dp-form-input{width:100%;padding:7px 10px;border:1.5px solid var(--ink-200);border-radius:8px;font-size:13px;font:inherit;box-sizing:border-box}
.dp-form-input:focus{outline:none;border-color:var(--rose)}
.dp-comments-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:200px;overflow-y:auto}
.dp-comment{background:var(--ink-50);border-radius:10px;padding:10px 14px}
.dp-comment__meta{display:flex;justify-content:space-between;margin-bottom:4px}
.dp-comment__author{font-size:12px;font-weight:700;color:var(--ink-900)}
.dp-comment__date{font-size:11px;color:var(--ink-400)}
.dp-comment__text{font-size:13px;color:var(--ink-700);margin:0}
.dp-comment-input-row{display:flex;gap:8px}

/* ---- À venir ---- */
.dp-coming-soon{text-align:center;padding:80px 40px;color:var(--ink-400)}
.dp-coming-soon__icon{font-size:40px;margin-bottom:16px}
.dp-coming-soon__title{font-size:15px;font-weight:600;color:var(--ink-500)}

@media(max-width:1100px){.dp-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.dp-kpis{grid-template-columns:1fr}.dp-page{padding:16px}}
</style>

<div class="dp-page">

  <!-- En-tête -->
  <div class="dp-page-head">
    <div>
      <h1 class="dp-page-head__title">Dproject — Gestion projet DSP</h1>
      <div class="dp-page-head__sub">Tâches, évolutions, bugs et roadmap · remplace Jira pour l'équipe Dispatchis</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="dp-btn dp-btn--ghost" onclick="dpOuvrirFormulaireSignaler()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/></svg>
        Signaler un bug
      </button>
      <button class="dp-btn dp-btn--ghost" onclick="dpSwitchTab('evolutions')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
        Proposer une évolution
      </button>
    </div>
  </div>

  <!-- KPIs -->
  <section class="dp-kpis" id="dp-kpis">
    ${dpKpiCard('rose','<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>','TÂCHES ACTIVES','—','')}
    ${dpKpiCard('blue','<path d="M12 3v18M3 12h18"/>','ÉVOLUTIONS OUVERTES','—','')}
    ${dpKpiCard('warn','<path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/>','BUGS À TRAITER','—','')}
    ${dpKpiCard('ok','<path d="M20 6L9 17l-5-5"/>','LIVRÉS CE TRIMESTRE','—','')}
  </section>

  <!-- Bannière À qualifier -->
  <div id="dp-a-qualifier-zone"></div>

  <!-- Tabs -->
  <div class="dp-tabs" role="tablist">
    <button class="is-active" data-tab="bugs" onclick="dpSwitchTab('bugs')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/></svg>
      Bugs <span class="dp-count" id="dp-count-bugs">—</span>
    </button>
    <button data-tab="evolutions" onclick="dpSwitchTab('evolutions')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
      Évolutions
    </button>
    <button data-tab="taches" onclick="dpSwitchTab('taches')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      Tâches
    </button>
    <button data-tab="roadmap" onclick="dpSwitchTab('roadmap')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      Roadmap
    </button>
  </div>

  <!-- Panels -->
  <section class="dp-tab-panel is-active" id="dp-tab-bugs"></section>
  <section class="dp-tab-panel" id="dp-tab-evolutions">
    <div class="dp-card"><div class="dp-coming-soon"><div class="dp-coming-soon__icon">💡</div><div class="dp-coming-soon__title">Évolutions — à venir</div></div></div>
  </section>
  <section class="dp-tab-panel" id="dp-tab-taches">
    <div class="dp-card"><div class="dp-coming-soon"><div class="dp-coming-soon__icon">📝</div><div class="dp-coming-soon__title">Tâches — à venir</div></div></div>
  </section>
  <section class="dp-tab-panel" id="dp-tab-roadmap">
    <div class="dp-card"><div class="dp-coming-soon"><div class="dp-coming-soon__icon">🗺️</div><div class="dp-coming-soon__title">Roadmap — à venir</div></div></div>
  </section>

</div>

<script>
(function(){

// ── Helpers HTML ──────────────────────────────────────────
function dpKpiCard(color, iconPath, label, value, sub) {
  return '<div class="dp-kpi"><div class="dp-kpi__ico dp-kpi__ico--'+color+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+iconPath+'</svg></div><div><div class="dp-kpi__label">'+label+'</div><div class="dp-kpi__value" >'+value+'</div>'+(sub?'<div class="dp-kpi__sub">'+sub+'</div>':'')+'</div></div>';
}
window.dpKpiCard = dpKpiCard;

function dpBadgeUrgence(u) {
  var map = {
    'Critique':   {cls:'dp-urg--critique',   label:'Critique'},
    'Majeur':     {cls:'dp-urg--majeur',     label:'Majeur'},
    'Mineur':     {cls:'dp-urg--mineur',     label:'Mineur'},
    'Cosmétique': {cls:'dp-urg--cosmetique', label:'Cosmétique'}
  };
  var s = map[u] || {cls:'dp-urg--cosmetique', label: u||'—'};
  return '<span class="dp-urg '+s.cls+'"><span class="dp-urg__dot"></span>'+s.label+'</span>';
}

function dpBadgeStatut(s) {
  var map = {
    'Nouveau':      'nouveau',
    'En analyse':   'analyse',
    'En correction':'correction',
    'En staging':   'staging',
    'Corrigé':      'corrige'
  };
  var cls = map[s] || 'nouveau';
  return '<span class="dp-pill dp-pill--'+cls+'">'+( s||'—')+'</span>';
}

function dpBadgeEnv(e) {
  if (e === 'PROD')    return '<span class="dp-env-prod">PROD</span>';
  if (e === 'Staging') return '<span class="dp-env-staging">Staging</span>';
  return '<span style="color:var(--ink-400)">—</span>';
}

function dpBadgeZone(z) {
  if (!z) return '<span style="color:var(--ink-400)">—</span>';
  return '<span class="dp-zone">'+z+'</span>';
}

// ── Tabs ─────────────────────────────────────────────────
window.dpSwitchTab = function(tab) {
  document.querySelectorAll('#dproject-content .dp-tabs button').forEach(function(b){
    b.classList.toggle('is-active', b.dataset.tab === tab);
  });
  document.querySelectorAll('#dproject-content .dp-tab-panel').forEach(function(p){
    p.classList.toggle('is-active', p.id === 'dp-tab-'+tab);
  });
  if (tab === 'bugs') dpRenderBugs();
};

// ── KPIs ─────────────────────────────────────────────────
async function dpLoadStats() {
  try {
    var results = await Promise.all([
      db.from('dsp_bugs').select('id,urgence,statut'),
      db.from('dsp_evolutions').select('id,statut'),
      db.from('dsp_taches').select('id,statut')
    ]);
    var bugs   = results[0].data || [];
    var evols  = results[1].data || [];
    var taches = results[2].data || [];

    var bugsActifs    = bugs.filter(function(b){ return b.statut !== 'Corrigé'; });
    var evolsActives  = evols.filter(function(e){ return !['Déployée','Refusée'].includes(e.statut); });
    var tachesActives = taches.filter(function(t){ return t.statut !== 'Terminé'; });
    var critiques     = bugsActifs.filter(function(b){ return b.urgence === 'Critique'; }).length;

    var grid = document.getElementById('dp-kpis');
    if (grid) grid.innerHTML =
      dpKpiCard('rose','<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>','TÂCHES ACTIVES', tachesActives.length, '') +
      dpKpiCard('blue','<path d="M12 3v18M3 12h18"/>','ÉVOLUTIONS OUVERTES', evolsActives.length, '') +
      dpKpiCard('warn','<path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/>','BUGS À TRAITER', bugsActifs.length, critiques ? critiques+' critiques' : '') +
      dpKpiCard('ok','<path d="M20 6L9 17l-5-5"/>','LIVRÉS CE TRIMESTRE', '—', '');

    // Compteur onglet bugs
    var countEl = document.getElementById('dp-count-bugs');
    if (countEl) countEl.textContent = bugsActifs.length;

  } catch(e) { console.warn('dpLoadStats:', e); }
}

// ── À qualifier ──────────────────────────────────────────
async function dpLoadAQualifier() {
  var zone = document.getElementById('dp-a-qualifier-zone');
  if (!zone) return;
  try {
    var results = await Promise.all([
      db.from('dsp_bugs').select('*').eq('statut','Nouveau').order('created_at',{ascending:false}),
      db.from('dsp_evolutions').select('*').eq('statut','Nouvelle').order('created_at',{ascending:false})
    ]);
    var items = [
      ...(results[0].data||[]).map(function(b){ return Object.assign({},b,{_type:'bug'}); }),
      ...(results[1].data||[]).map(function(e){ return Object.assign({},e,{_type:'evolution'}); })
    ].sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });

    if (!items.length) { zone.innerHTML = ''; return; }

    zone.innerHTML = '<div class="dp-qualifier-banner">' +
      '<div class="dp-qualifier-banner__head">' +
        '<span style="font-size:18px">🔔</span>' +
        '<span style="font-size:14px;font-weight:800;color:#9a3412">À qualifier</span>' +
        '<span class="dp-qualifier-count">'+items.length+'</span>' +
        '<span style="font-size:12px;color:var(--ink-400)">nouvelles demandes en attente</span>' +
      '</div>' +
      items.map(function(item) {
        var code = item.code || (item._type==='bug' ? 'BUG-???' : 'EVOL-???');
        var icon = item._type==='bug' ? '🐛' : '💡';
        var date = new Date(item.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
        return '<div class="dp-qualifier-item" onclick="dpOuvrirDetail(\''+item._type+'\','+item.id+')">' +
          '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
            '<span style="font-size:16px">'+icon+'</span>' +
            '<div><div style="font-weight:700;font-size:13px;color:var(--ink-900)">'+item.titre+'</div>' +
            '<div style="font-size:11px;color:var(--ink-400)">'+code+' · '+date+'</div></div>' +
          '</div>' +
          '<span class="dp-qualifier-badge">Qualifier →</span>' +
        '</div>';
      }).join('') +
    '</div>';
  } catch(e) { console.warn('dpLoadAQualifier:', e); }
}

// ── Bugs Tab ─────────────────────────────────────────────
var _dpBugsData = [];

window.dpRenderBugs = async function() {
  var panel = document.getElementById('dp-tab-bugs');
  if (!panel) return;

  panel.innerHTML = '<div class="dp-card">' +
    '<div class="dp-card__head">' +
      '<div><h3 class="dp-card__title">Bugs</h3><div class="dp-card__sub">Signalements en cours · qualifiés par niveau d\'urgence</div></div>' +
      '<div class="dp-toolbar">' +
        '<div class="dp-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="dp-bugs-search" placeholder="Rechercher…" oninput="dpFilterBugs()"></div>' +
        '<select class="dp-select" id="dp-bugs-urgence" onchange="dpFilterBugs()"><option value="">Toute urgence</option><option>Critique</option><option>Majeur</option><option>Mineur</option><option>Cosmétique</option></select>' +
        '<select class="dp-select" id="dp-bugs-env" onchange="dpFilterBugs()"><option value="">Tous env.</option><option>PROD</option><option>Staging</option></select>' +
        '<select class="dp-select" id="dp-bugs-statut" onchange="dpFilterBugs()"><option value="">Tous statuts</option><option>Nouveau</option><option>En analyse</option><option>En correction</option><option>En staging</option><option>Corrigé</option></select>' +
        '<button class="dp-btn dp-btn--rose" onclick="dpOuvrirFormulaireSignaler()">+ Signaler un bug</button>' +
      '</div>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table class="dp-t">' +
        '<thead><tr><th>ID</th><th>Titre</th><th>Urgence</th><th>Zone</th><th>Env.</th><th>Statut</th></tr></thead>' +
        '<tbody id="dp-bugs-tbody"><tr><td colspan="6" style="text-align:center;padding:40px;color:var(--ink-400)">Chargement…</td></tr></tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  try {
    var res = await db.from('dsp_bugs').select('*').order('created_at',{ascending:false});
    _dpBugsData = res.data || [];
    dpRenderBugsTable(_dpBugsData);
  } catch(e) {
    var tbody = document.getElementById('dp-bugs-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--rose)">Erreur de chargement</td></tr>';
  }
};

window.dpFilterBugs = function() {
  var s = (document.getElementById('dp-bugs-search') ||{}).value || '';
  var u = (document.getElementById('dp-bugs-urgence')||{}).value || '';
  var e = (document.getElementById('dp-bugs-env')    ||{}).value || '';
  var st= (document.getElementById('dp-bugs-statut') ||{}).value || '';
  dpRenderBugsTable(_dpBugsData.filter(function(b){
    return (!s  || (b.titre||'').toLowerCase().includes(s.toLowerCase())) &&
           (!u  || b.urgence === u) &&
           (!e  || b.environnement === e) &&
           (!st || b.statut === st);
  }));
};

function dpRenderBugsTable(bugs) {
  var tbody = document.getElementById('dp-bugs-tbody');
  if (!tbody) return;
  if (!bugs.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--ink-400)">Aucun bug trouvé</td></tr>';
    return;
  }
  tbody.innerHTML = bugs.map(function(b) {
    return '<tr onclick="dpOuvrirDetail(\'bug\','+b.id+')">' +
      '<td><span class="dp-ref dp-ref--bug">'+(b.code||'BUG-?')+'</span></td>' +
      '<td><div class="dp-title-cell">'+b.titre+'</div>'+(b.description?'<div class="dp-desc">'+b.description.substring(0,70)+'…</div>':'')+'</td>' +
      '<td>'+dpBadgeUrgence(b.urgence)+'</td>' +
      '<td>'+dpBadgeZone(b.zone)+'</td>' +
      '<td>'+dpBadgeEnv(b.environnement)+'</td>' +
      '<td>'+dpBadgeStatut(b.statut)+'</td>' +
    '</tr>';
  }).join('');
}

// ── Formulaire signaler un bug ────────────────────────────
window.dpOuvrirFormulaireSignaler = function() {
  var existing = document.getElementById('dp-signaler-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'dp-signaler-modal';
  overlay.className = 'dp-modal-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="dp-modal-box">' +
      '<div class="dp-modal-head">' +
        '<div><div style="font-size:11px;font-weight:700;color:var(--ink-400);font-family:monospace">NOUVEAU BUG</div>' +
        '<h2 style="font-size:17px;font-weight:800;color:var(--ink-900);margin:4px 0 0">Signaler un bug</h2></div>' +
        '<button class="dp-modal-close" onclick="document.getElementById(\'dp-signaler-modal\').remove()">✕</button>' +
      '</div>' +
      '<div class="dp-modal-body">' +

        '<div><label class="dp-form-label">Titre *</label>' +
        '<input class="dp-form-input" id="dp-sig-titre" placeholder="Ex : Le bouton Valider ne répond pas…"></div>' +

        '<div><label class="dp-form-label">Description — ce qui se passe / ce qui était attendu</label>' +
        '<textarea class="dp-form-input" id="dp-sig-desc" rows="3" placeholder="Décris le problème et ce que tu attendais…" style="resize:vertical"></textarea></div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<div><label class="dp-form-label">Zone concernée</label>' +
          '<select class="dp-form-select" id="dp-sig-zone"><option>Dispatch</option><option>Dplane</option><option>Dvol</option><option>Mes dossiers</option><option>Auth</option><option>Autre</option></select></div>' +

          '<div><label class="dp-form-label">Environnement</label>' +
          '<select class="dp-form-select" id="dp-sig-env"><option>PROD</option><option>Staging</option></select></div>' +
        '</div>' +

        '<div><label class="dp-form-label">Niveau d\'urgence *</label>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px" id="dp-sig-urgence-grid">' +
          ['Critique','Majeur','Mineur','Cosmétique'].map(function(u,i){
            var colors = ['#dc2626','#ea580c','#eab308','#3b82f6'];
            return '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;border:1px solid var(--ink-200);background:#fff;cursor:pointer;font-size:12.5px;font-weight:600" class="dp-urg-opt-label">' +
              '<input type="radio" name="dp-sig-u" value="'+u+'" style="display:none"'+(i===2?' checked':'')+'>'+
              '<span style="width:10px;height:10px;border-radius:50%;background:'+colors[i]+';flex-shrink:0"></span>'+u+
            '</label>';
          }).join('') +
        '</div></div>' +

        '<div style="display:flex;justify-content:flex-end;gap:10px;padding-top:4px;border-top:1px solid var(--ink-100)">' +
          '<button class="dp-btn dp-btn--ghost" onclick="document.getElementById(\'dp-signaler-modal\').remove()">Annuler</button>' +
          '<button class="dp-btn dp-btn--rose" onclick="dpSoumettreSignalement()">Soumettre le bug</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  // Style sélection urgence
  overlay.querySelectorAll('.dp-urg-opt-label').forEach(function(lbl){
    var radio = lbl.querySelector('input[type=radio]');
    if (radio && radio.checked) lbl.style.cssText += ';border-color:var(--rose);background:#fff7fa';
    lbl.addEventListener('click', function(){
      overlay.querySelectorAll('.dp-urg-opt-label').forEach(function(l){ l.style.borderColor='var(--ink-200)'; l.style.background='#fff'; });
      lbl.style.borderColor='var(--rose)'; lbl.style.background='#fff7fa';
    });
  });
};

window.dpSoumettreSignalement = async function() {
  var titre = (document.getElementById('dp-sig-titre')||{}).value||'';
  var desc  = (document.getElementById('dp-sig-desc') ||{}).value||'';
  var zone  = (document.getElementById('dp-sig-zone') ||{}).value||'';
  var env   = (document.getElementById('dp-sig-env')  ||{}).value||'';
  var urgEl = document.querySelector('input[name="dp-sig-u"]:checked');
  var urgence = urgEl ? urgEl.value : 'Mineur';

  if (!titre.trim()) {
    if (typeof showNotif==='function') showNotif('Le titre est obligatoire','error');
    return;
  }

  // Génération du code BUG-XXX
  var codeRes = await db.from('dsp_bugs').select('code').order('created_at',{ascending:false}).limit(1);
  var lastCode = codeRes.data && codeRes.data[0] && codeRes.data[0].code ? codeRes.data[0].code : 'BUG-000';
  var lastNum = parseInt(lastCode.replace('BUG-',''),10) || 0;
  var newCode = 'BUG-' + String(lastNum+1).padStart(3,'0');

  var payload = {
    code: newCode,
    titre: titre.trim(),
    description: desc.trim()||null,
    zone: zone,
    environnement: env,
    urgence: urgence,
    statut: 'Nouveau',
    signale_par: currentUser ? currentUser.id : null,
    signale_par_nom: currentUserData ? (currentUserData.prenom+' '+currentUserData.nom) : 'Admin'
  };

  try {
    var res = await db.from('dsp_bugs').insert(payload);
    if (res.error) throw res.error;
    document.getElementById('dp-signaler-modal').remove();
    if (typeof showNotif==='function') showNotif('✅ Bug '+newCode+' signalé !','success');
    dpRenderBugs();
    dpLoadStats();
    dpLoadAQualifier();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

// ── Détail bug ────────────────────────────────────────────
window.dpOuvrirDetail = async function(type, id) {
  var existing = document.getElementById('dp-detail-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'dp-detail-modal';
  overlay.className = 'dp-modal-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="dp-modal-box"><div style="text-align:center;padding:40px;color:var(--ink-400)">Chargement…</div></div>';
  document.body.appendChild(overlay);

  try {
    var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
    var res  = await db.from(table).select('*').eq('id',id).single();
    if (!res.data) throw new Error('Introuvable');
    var commRes = await db.from('dsp_commentaires').select('*').eq('ref_type',type).eq('ref_id',id).order('created_at',{ascending:true});
    dpRenderDetailModal(overlay.querySelector('.dp-modal-box'), type, res.data, commRes.data||[]);
  } catch(e) {
    overlay.querySelector('.dp-modal-box').innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose)">Erreur : '+e.message+'</div>';
  }
};

function dpRenderDetailModal(box, type, data, comments) {
  var isBug  = type === 'bug';
  var etapes = isBug
    ? ['Nouveau','En analyse','En correction','En staging','Corrigé']
    : ['Nouvelle','En analyse','Acceptée','En développement','Déployée'];
  var statut   = data.statut || etapes[0];
  var stepIdx  = etapes.indexOf(statut);
  var code     = data.code || (isBug ? 'BUG-?' : 'EVOL-?');

  var progHTML = etapes.map(function(e,i){
    var done = i < stepIdx, current = i === stepIdx;
    var bg    = current ? 'var(--navy)' : done ? 'var(--ink-200)' : 'var(--ink-100)';
    var border= (done||current) ? 'var(--navy)' : 'var(--ink-200)';
    var color = current ? '#fff' : done ? 'var(--ink-600)' : 'var(--ink-400)';
    var lcolor= (done||current) ? 'var(--ink-900)' : 'var(--ink-400)';
    return '<div class="dp-prog-step">' +
      '<div style="text-align:center">' +
        '<div class="dp-prog-circle" style="background:'+bg+';border:2px solid '+border+';color:'+color+'">'+(done?'✓':i+1)+'</div>' +
        '<div class="dp-prog-label" style="color:'+lcolor+'">'+e+'</div>' +
      '</div>' +
      (i<etapes.length-1?'<div class="dp-prog-line" style="background:'+(done?'var(--ink-400)':'var(--ink-200)')+'"></div>':'') +
    '</div>';
  }).join('');

  var infoHTML =
    (isBug&&data.urgence?'<div><div class="dp-info-label">Urgence</div>'+dpBadgeUrgence(data.urgence)+'</div>':'') +
    (isBug&&data.zone?'<div><div class="dp-info-label">Zone</div>'+dpBadgeZone(data.zone)+'</div>':'') +
    (isBug&&data.environnement?'<div><div class="dp-info-label">Env.</div>'+dpBadgeEnv(data.environnement)+'</div>':'') +
    '<div><div class="dp-info-label">Créé le</div><span style="font-weight:600">'+new Date(data.created_at).toLocaleDateString('fr-FR')+'</span></div>' +
    (data.date_echeance?'<div><div class="dp-info-label">Échéance</div><span style="font-weight:600;color:var(--danger-700)">'+new Date(data.date_echeance).toLocaleDateString('fr-FR')+'</span></div>':'') +
    (data.signale_par_nom?'<div><div class="dp-info-label">Signalé par</div><span style="font-weight:600">'+data.signale_par_nom+'</span></div>':'');

  var commentsHTML = comments.length
    ? comments.map(function(c){
        var d = new Date(c.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
        return '<div class="dp-comment"><div class="dp-comment__meta"><span class="dp-comment__author">'+(c.auteur_nom||'Admin')+'</span><span class="dp-comment__date">'+d+'</span></div><p class="dp-comment__text">'+c.contenu+'</p></div>';
      }).join('')
    : '<div style="color:var(--ink-400);font-size:13px;text-align:center;padding:16px">Aucun commentaire</div>';

  box.innerHTML =
    '<div class="dp-modal-head">' +
      '<div><span style="font-size:11px;font-weight:700;color:var(--ink-400);font-family:monospace">'+code+'</span>' +
      '<h2 style="font-size:17px;font-weight:800;color:var(--ink-900);margin:4px 0 0">'+data.titre+'</h2></div>' +
      '<button class="dp-modal-close" onclick="document.getElementById(\'dp-detail-modal\').remove()">✕</button>' +
    '</div>' +
    '<div class="dp-modal-body">' +

      '<div><div class="dp-info-label" style="margin-bottom:10px">Progression</div><div class="dp-prog-wrap">'+progHTML+'</div></div>' +

      '<div class="dp-info-grid">'+infoHTML+'</div>' +

      (data.description?'<div><div class="dp-info-label">Description</div><p style="font-size:13px;color:var(--ink-700);margin:0;line-height:1.6">'+data.description+'</p></div>':'')+

      '<div class="dp-admin-box">' +
        '<div class="dp-admin-box__title">⚙️ GESTION ADMIN</div>' +
        '<div class="dp-form-row">' +
          '<div><label class="dp-form-label">Statut</label>' +
          '<select class="dp-form-select" id="dp-det-statut">'+
            etapes.map(function(e){ return '<option'+(e===statut?' selected':'')+'>'+e+'</option>'; }).join('') +
            (!isBug?'<option'+('Refusée'===statut?' selected':'')+'>Refusée</option>':'') +
          '</select></div>' +
          (isBug?'<div><label class="dp-form-label">Urgence</label><select class="dp-form-select" id="dp-det-urgence"><option value="">— Choisir —</option>'+['Critique','Majeur','Mineur','Cosmétique'].map(function(u){ return '<option'+(u===data.urgence?' selected':'')+'>'+u+'</option>'; }).join('')+'</select></div>':'')+
          '<div><label class="dp-form-label">Échéance</label><input type="date" class="dp-form-input" id="dp-det-echeance" value="'+(data.date_echeance||'')+'"></div>' +
        '</div>' +
        (!isBug?'<div style="margin-top:10px"><label class="dp-form-label">Commentaire admin</label><textarea class="dp-form-input" id="dp-det-commentaire-admin" rows="2" style="resize:vertical" placeholder="Justification, retour…">'+(data.commentaire_admin||'')+'</textarea></div>':'')+
        '<button onclick="dpSauvegarderDetail(\''+type+'\','+data.id+')" style="margin-top:12px;background:var(--navy);color:#fff;border:none;padding:9px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">💾 Sauvegarder</button>' +
      '</div>' +

      '<div><div class="dp-info-label" style="margin-bottom:10px">Commentaires ('+comments.length+')</div>' +
        '<div class="dp-comments-list">'+commentsHTML+'</div>' +
        '<div class="dp-comment-input-row">' +
          '<input class="dp-form-input" id="dp-det-new-comment" placeholder="Ajouter un commentaire…" onkeydown="if(event.key===\'Enter\') dpAjouterCommentaire(\''+type+'\','+data.id+')">' +
          '<button onclick="dpAjouterCommentaire(\''+type+'\','+data.id+')" style="background:var(--navy);color:#fff;border:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">Envoyer</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

window.dpSauvegarderDetail = async function(type, id) {
  var statut    = (document.getElementById('dp-det-statut')           ||{}).value||'';
  var echeance  = (document.getElementById('dp-det-echeance')         ||{}).value||null;
  var urgence   = (document.getElementById('dp-det-urgence')          ||{}).value||null;
  var commAdmin = (document.getElementById('dp-det-commentaire-admin')||{}).value||null;
  var table  = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  var payload = {statut: statut};
  if (echeance) payload.date_echeance = echeance;
  if (urgence && urgence !== '')  payload.urgence = urgence;
  if (commAdmin !== null && type==='evolution') payload.commentaire_admin = commAdmin;
  try {
    var res = await db.from(table).update(payload).eq('id',id);
    if (res.error) throw res.error;
    document.getElementById('dp-detail-modal').remove();
    if (typeof showNotif==='function') showNotif('✅ Mis à jour !','success');
    dpLoadAQualifier();
    dpLoadStats();
    dpRenderBugs();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

window.dpAjouterCommentaire = async function(type, id) {
  var input   = document.getElementById('dp-det-new-comment');
  var contenu = (input||{}).value||'';
  if (!contenu.trim()) return;
  try {
    await db.from('dsp_commentaires').insert({
      ref_type: type, ref_id: id, contenu: contenu.trim(),
      auteur_id:  currentUser     ? currentUser.id : null,
      auteur_nom: currentUserData ? (currentUserData.prenom+' '+currentUserData.nom) : 'Admin'
    });
    if (input) input.value = '';
    dpOuvrirDetail(type, id);
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

// ── Init ──────────────────────────────────────────────────
dpRenderBugs();
dpLoadStats();
dpLoadAQualifier();

})();
</script>
`;
}
