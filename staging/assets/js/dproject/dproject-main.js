/* =========================================================
   Dproject — MAIN (point d'entrée logique du module)
   ---------------------------------------------------------
   Contient :
     • dprojectInit()      → fonction appelée par le loader
     • dprojectRender()    → injecte le HTML de la page
     • dpKpiCard()         → helper template KPI
     • dpSwitchTab()       → router des onglets
     • dpLoadStats()       → charge les KPIs (bugs + évolutions + tâches)
     • dpLoadAQualifier()  → charge la liste "À qualifier"

   Dépend de : dproject-core.js, dproject-bugs.js,
               dproject-evolutions.js, dproject-taches.js,
               dproject-roadmap.js (tous chargés AVANT par le loader)
   ========================================================= */

function dprojectInit() {
  dprojectRender();
}

// ── Helper template KPI ──────────────────────────────────
// Disponible globalement dès le chargement du fichier
function dpKpiCard(color, iconPath, label, value, sub) {
  return '<div class="dp-kpi"><div class="dp-kpi__ico dp-kpi__ico--'+color+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+iconPath+'</svg></div><div><div class="dp-kpi__label">'+label+'</div><div class="dp-kpi__value">'+value+'</div>'+(sub?'<div class="dp-kpi__sub">'+sub+'</div>':'')+'</div></div>';
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

/* ---- Modal overlay ---- */
.dp-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
.dp-modal-box{
  background:#fff;border:1px solid rgba(15,23,42,.06);
  border-radius:18px;width:min(780px,100%);
  max-height:calc(100vh - 64px);
  display:flex;flex-direction:column;
  box-shadow:0 10px 30px -8px rgba(15,23,42,.25),0 2px 6px rgba(15,23,42,.08);
  overflow:hidden;
}
/* Modal header — gradient navy */
.dp-modal-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px;
  background:linear-gradient(180deg,#22306e 0%,#1b2656 100%);
  border-bottom:1px solid rgba(255,255,255,.06);
  flex-shrink:0;
}
.dp-modal-head-left{display:flex;align-items:center;gap:12px}
.dp-modal-head-type{font-size:13.5px;font-weight:700;color:#fff;letter-spacing:.02em}
.dp-modal-head-sep{width:18px;height:1px;background:rgba(255,255,255,.35)}
.dp-modal-head-code{
  font-family:monospace;font-size:11.5px;font-weight:600;letter-spacing:.06em;
  background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);
  color:#fff;padding:3px 9px;border-radius:6px;
}
.dp-modal-head-actions{display:flex;align-items:center;gap:6px}
.dp-modal-close,.dp-modal-edit{
  width:32px;height:32px;border-radius:8px;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);
  color:#fff;cursor:pointer;display:grid;place-items:center;
  transition:background .15s ease;
}
.dp-modal-close:hover,.dp-modal-edit:hover{background:rgba(255,255,255,.16)}
.dp-modal-close svg,.dp-modal-edit svg{width:14px;height:14px}

/* ---- Edit modal overlay (sur-modal d'édition) ---- */
.dp-edit-overlay{
  position:fixed;inset:0;z-index:10001;
  background:rgba(15,23,42,.45);
  backdrop-filter:blur(2px);
  display:grid;place-items:center;padding:24px;
  animation:dpFadein .18s ease;
}
@keyframes dpFadein{from{opacity:0}to{opacity:1}}
@keyframes dpSlidein{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
.dp-edit-modal{
  width:min(440px,100%);
  background:#fff;border:1px solid rgba(15,23,42,.08);
  border-radius:18px;overflow:hidden;
  box-shadow:0 10px 30px -8px rgba(15,23,42,.25),0 2px 6px rgba(15,23,42,.08);
  animation:dpSlidein .2s ease;
}
.dp-edit-modal__head{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px;
  background:linear-gradient(180deg,#22306e 0%,#1b2656 100%);
  color:#fff;
}
.dp-edit-modal__title{font-size:14px;font-weight:700;letter-spacing:.01em}
.dp-edit-modal__body{padding:20px}
.dp-edit-modal__body .dp-form-row{
  display:grid;grid-template-columns:1fr 1fr;gap:12px;
  margin-bottom:16px;align-items:end;
}
.dp-edit-modal__body .dp-form-row--full{grid-template-columns:1fr}
.dp-edit-modal__foot{
  display:flex;justify-content:flex-end;gap:8px;
  padding:12px 18px;
  border-top:1px solid var(--ink-100);
  background:var(--ink-50);
}

/* ---- Upload zone (captures d'écran) ---- */
.dp-upload-zone{
  border:1px dashed var(--ink-300);border-radius:9px;
  padding:18px;text-align:center;background:var(--ink-50);
  cursor:pointer;transition:border-color .15s,background .15s;
  margin-bottom:10px;
}
.dp-upload-zone:hover{border-color:var(--rose);background:#fef3f6}
.dp-upload-zone.is-dragover{border-color:var(--rose);background:#fef3f6;border-style:solid}
.dp-upload-zone.is-disabled{opacity:.5;cursor:not-allowed;pointer-events:none}
.dp-upload-ico{font-size:24px;color:var(--ink-400);line-height:1}
.dp-upload-title{font-size:13px;color:var(--ink-700);margin-top:6px;font-weight:600}
.dp-upload-hint{font-size:11px;color:var(--ink-400);margin-top:2px}
.dp-upload-count{font-size:11px;color:var(--ink-500);margin-top:4px;font-family:monospace}
/* Grille de vignettes */
/* Grille de vignettes — fixée à 3 colonnes même si 1 seul fichier */
.dp-thumbs{display:grid;grid-template-columns:repeat(3,minmax(0,140px));gap:8px;justify-content:start;margin-top:8px}
.dp-thumb{
  position:relative;aspect-ratio:1;
  border:1px solid var(--ink-200);border-radius:8px;
  background:var(--ink-50);overflow:hidden;
  display:flex;align-items:center;justify-content:center;
}
.dp-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.dp-thumb__remove{
  position:absolute;top:4px;right:4px;
  width:22px;height:22px;border-radius:50%;
  background:rgba(15,23,42,.7);border:none;color:#fff;
  cursor:pointer;display:grid;place-items:center;font-size:11px;
  transition:background .15s;
}
.dp-thumb__remove:hover{background:rgba(15,23,42,.9)}
.dp-thumb__name{
  position:absolute;bottom:0;left:0;right:0;
  background:rgba(15,23,42,.75);color:#fff;
  font-size:10px;padding:3px 6px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  font-family:monospace;
}
/* Vignettes dans le modal de détail (cliquables pour ouvrir en grand) */
.dp-screenshots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.dp-screenshot-thumb{
  aspect-ratio:1;border:1px solid var(--ink-200);border-radius:8px;
  overflow:hidden;cursor:pointer;background:var(--ink-50);
  display:flex;align-items:center;justify-content:center;
  transition:transform .12s,box-shadow .15s;
}
.dp-screenshot-thumb:hover{transform:scale(1.02);box-shadow:0 4px 12px -4px rgba(15,23,42,.2)}
.dp-screenshot-thumb img{width:100%;height:100%;object-fit:cover;display:block}
/* Lightbox pour image agrandie */
.dp-lightbox{
  position:fixed;inset:0;z-index:10002;
  background:rgba(0,0,0,.85);
  display:flex;align-items:center;justify-content:center;
  cursor:zoom-out;padding:40px;
  animation:dpFadein .2s ease;
}
.dp-lightbox img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
.dp-lightbox__close{
  position:absolute;top:20px;right:20px;
  width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
  color:#fff;cursor:pointer;display:grid;place-items:center;
}
.dp-lightbox__close svg{width:18px;height:18px}
/* Modal body — scrollable */
.dp-modal-body{overflow-y:auto;padding:22px 22px 8px;flex:1}
.dp-modal-body::-webkit-scrollbar{width:10px}
.dp-modal-body::-webkit-scrollbar-thumb{background:var(--ink-200);border-radius:8px;border:2px solid #fff}
/* Bug title */
.dp-bug-title{font-size:22px;font-weight:700;letter-spacing:-.015em;color:var(--navy);margin:0 0 18px}
/* Meta grid — 4 colonnes */
.dp-meta-grid{
  display:grid;grid-template-columns:repeat(4,1fr);
  gap:14px 18px;padding-bottom:18px;
  border-bottom:1px solid var(--ink-100);margin-bottom:0;
}
.dp-meta-label{font-size:10.5px;font-weight:600;letter-spacing:.08em;color:var(--ink-500);text-transform:uppercase;margin-bottom:6px}
.dp-meta-value{font-size:13.5px;font-weight:600;color:var(--navy)}
.dp-meta-value--mono{font-family:monospace;font-size:13px}
.dp-meta-value--muted{color:var(--ink-400);font-weight:500}
.dp-age{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--navy)}
.dp-age::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--rose)}
/* Sections */
.dp-section{padding:18px 0;border-bottom:1px solid var(--ink-100)}
.dp-section:last-of-type{border-bottom:none}
.dp-section-title{
  display:flex;align-items:center;gap:8px;
  font-size:11.5px;font-weight:700;letter-spacing:.08em;
  color:var(--ink-600);text-transform:uppercase;margin:0 0 14px;
}
.dp-section-ico{
  width:22px;height:22px;border-radius:6px;
  display:grid;place-items:center;
  background:var(--brand-50);color:var(--brand-700);flex-shrink:0;
}
.dp-section-ico svg{width:12px;height:12px}
.dp-section-title--rose .dp-section-ico{background:#fde7ef;color:var(--rose)}
.dp-section-title--ok   .dp-section-ico{background:var(--ok-50);color:var(--ok-700)}
.dp-section-title--warn .dp-section-ico{background:var(--warn-50);color:var(--warn-700)}
/* Stepper chips */
.dp-stepper{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;align-items:stretch;margin-bottom:14px}
.dp-step{
  position:relative;padding:10px 12px;border-radius:10px;
  border:1px solid transparent;display:flex;flex-direction:column;gap:2px;min-height:54px;
}
.dp-step__num{font-family:monospace;font-size:11px;font-weight:600;color:var(--ink-400)}
.dp-step__label{font-size:13px;font-weight:600;color:var(--ink-700);line-height:1.2}
.dp-step--done{background:#f0fdf4;border-color:#86efac}
.dp-step--done .dp-step__num,.dp-step--done .dp-step__label{color:#166534}
.dp-step--current{background:#eff6ff;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15),0 1px 2px rgba(15,23,42,.05)}
.dp-step--current .dp-step__num{color:#2563eb}
.dp-step--current .dp-step__label{color:#1e3a8a}
.dp-step--future{background:var(--ink-50);border-color:var(--ink-200)}
.dp-step--future .dp-step__num,.dp-step--future .dp-step__label{color:var(--ink-400)}
.dp-step-chev{
  position:absolute;right:-10px;top:50%;transform:translateY(-50%);
  width:18px;height:18px;border-radius:50%;
  background:#fff;border:1px solid var(--ink-200);
  display:grid;place-items:center;color:var(--ink-400);z-index:1;
}
.dp-step-chev svg{width:9px;height:9px}
/* Step-bar (CTA étape suivante) */
.dp-step-bar{
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  background:var(--ink-50);border:1px solid var(--ink-200);
  border-radius:10px;padding:12px 14px;
}
.dp-step-bar__left{display:flex;align-items:center;gap:12px}
.dp-step-bar__ico{
  width:34px;height:34px;border-radius:9px;
  background:#fff;border:1px solid var(--ink-200);
  color:var(--rose);display:grid;place-items:center;
}
.dp-step-bar__ico svg{width:16px;height:16px}
.dp-step-bar__lab{font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--ink-500);text-transform:uppercase}
.dp-step-bar__val{font-size:14px;font-weight:700;color:var(--navy);margin-top:1px}
/* Description */
.dp-desc{
  font-size:14px;line-height:1.55;color:var(--ink-800);
  background:var(--ink-50);border:1px solid var(--ink-200);
  border-left:3px solid var(--rose);border-radius:10px;
  padding:12px 14px;margin:0;
}
/* Admin form */
.dp-form-row{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end}
.dp-form-label{display:block;font-size:11px;font-weight:600;color:var(--ink-600);letter-spacing:.04em;margin-bottom:6px}
.dp-field input,.dp-field select,.dp-form-select,.dp-form-input{
  width:100%;height:38px;padding:0 12px;
  border:1px solid var(--ink-200);border-radius:9px;
  background:#fff;font-size:13.5px;color:var(--ink-800);
  outline:none;font-family:inherit;box-sizing:border-box;
}
.dp-field select,.dp-form-select{
  appearance:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat:no-repeat;background-position:right 12px center;padding-right:34px;
}
.dp-field input:focus,.dp-field select:focus,.dp-form-select:focus,.dp-form-input:focus{
  border-color:var(--rose);box-shadow:0 0 0 3px rgba(229,25,94,.15);
}
.dp-form-input{height:auto;padding:7px 12px}
/* Événements */
.dp-events{display:flex;flex-direction:column;gap:14px}
.dp-event{display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid var(--ink-100);border-radius:10px;background:#fff}
.dp-ev-avatar{
  width:32px;height:32px;border-radius:50%;
  background:var(--av-color,var(--brand-500));color:#fff;
  font-size:11px;font-weight:700;letter-spacing:.02em;
  display:grid;place-items:center;flex-shrink:0;
  box-shadow:0 0 0 2px #fff,0 0 0 3px var(--ink-200);
}
.dp-ev-body{flex:1;min-width:0}
.dp-ev-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.dp-ev-author{font-size:13px;font-weight:600;color:var(--navy)}
.dp-ev-tag{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:var(--brand-50);color:var(--brand-700);border:1px solid rgba(47,61,149,.22)}
.dp-ev-time{margin-left:auto;font-size:11px;color:var(--ink-500);font-family:monospace}
.dp-ev-text{font-size:13.5px;color:var(--ink-700);line-height:1.5;margin:0}
/* Composer footer */
.dp-composer{
  display:flex;align-items:center;gap:10px;
  padding:14px 18px;border-top:1px solid var(--ink-100);
  background:var(--ink-50);flex-shrink:0;
}
.dp-composer input{
  flex:1;height:38px;padding:0 14px;
  border:1px solid var(--ink-200);border-radius:9px;
  background:#fff;font-size:13.5px;color:var(--ink-800);
  outline:none;font-family:inherit;
}
.dp-composer input:focus{border-color:var(--rose);box-shadow:0 0 0 3px rgba(229,25,94,.15)}

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
      <button class="dp-btn dp-btn--rose" disabled title="Bientôt disponible" style="opacity:0.5;cursor:not-allowed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Nouvelle tâche
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
    <button data-tab="taches" onclick="dpSwitchTab('taches')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      Tâches
    </button>
    <button data-tab="evolutions" onclick="dpSwitchTab('evolutions')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
      Évolutions
    </button>
    <button class="is-active" data-tab="bugs" onclick="dpSwitchTab('bugs')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/></svg>
      Bugs <span class="dp-count" id="dp-count-bugs">—</span>
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

`;

  // ── Init après injection du HTML ────────────────────────
  // Ces fonctions ont besoin que le DOM soit en place
  dpRenderBugs();
  dpLoadStats();
  dpLoadAQualifier();
}

// =========================================================
// FONCTIONS GLOBALES — accessibles depuis les onclick HTML
// =========================================================

// ── Router des onglets ───────────────────────────────────
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

// ── KPIs (chargement async depuis Supabase) ──────────────
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

// ── "À qualifier" : mix bugs + évolutions récents ───────
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
