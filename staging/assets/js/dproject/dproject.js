/* =========================================================
   Dproject — Module gestion projet DSP
   v2.1 — Design unifié + Supabase
   ✅ Correction : JS sorti de la template string innerHTML
   Onglet Bugs : ✅ fonctionnel
   Onglets Évolutions / Tâches / Roadmap : 🔜 à venir
   ========================================================= */

function dprojectInit() {
  dprojectRender();
}

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

// ── Helpers HTML ──────────────────────────────────────────
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
        '<select class="dp-select" id="dp-bugs-env" onchange="dpFilterBugs()"><option value="">Tous environnements</option><option>PROD</option><option>Staging</option></select>' +
        '<button class="dp-btn dp-btn--rose" onclick="dpOuvrirFormulaireSignaler()">+ Signaler un bug</button>' +
      '</div>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table class="dp-t">' +
        '<thead><tr><th>ID</th><th>Titre</th><th>Urgence</th><th>Zone</th><th>Env.</th><th>Statut</th><th>Signalé par</th></tr></thead>' +
        '<tbody id="dp-bugs-tbody"><tr><td colspan="7" style="text-align:center;padding:40px;color:var(--ink-400)">Chargement…</td></tr></tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  try {
    var res = await db.from('dsp_bugs').select('*').order('created_at',{ascending:false});
    _dpBugsData = res.data || [];
    dpRenderBugsTable(_dpBugsData);
  } catch(e) {
    var tbody = document.getElementById('dp-bugs-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--rose)">Erreur de chargement</td></tr>';
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--ink-400)">Aucun bug trouvé</td></tr>';
    return;
  }
  // Palette de couleurs stables pour les avatars (déterministe : même nom = même couleur)
  var avatarColors = ['#4f63d2','#be3a4c','#0e6b70','#128087','#5b3bb8','#d97706','#16a34a','#9333ea'];
  function dpAvatar(nom) {
    if (!nom) return '<span style="color:var(--ink-400);font-size:12px">—</span>';
    var parts = nom.trim().split(/\s+/);
    var initiales = (parts[0]||'').charAt(0).toUpperCase() + (parts[1]||'').charAt(0).toUpperCase();
    if (!initiales) initiales = nom.charAt(0).toUpperCase();
    var idx = 0;
    for (var i=0; i<nom.length; i++) idx += nom.charCodeAt(i);
    var color = avatarColors[idx % avatarColors.length];
    return '<div class="dp-who"><span class="dp-av" style="--av:'+color+'">'+initiales+'</span><span class="dp-who__name">'+nom+'</span></div>';
  }
  tbody.innerHTML = bugs.map(function(b) {
    return '<tr onclick="dpOuvrirDetail(\'bug\','+b.id+')">' +
      '<td><span class="dp-ref dp-ref--bug">'+(b.code||'BUG-?')+'</span></td>' +
      '<td><div class="dp-title-cell">'+b.titre+'</div>'+(b.description?'<div class="dp-desc" style="border:none;background:none;padding:0;font-size:11.5px;color:var(--ink-500);margin-top:2px;line-height:1.4">'+b.description.substring(0,70)+'…</div>':'')+'</td>' +
      '<td>'+dpBadgeUrgence(b.urgence)+'</td>' +
      '<td>'+dpBadgeZone(b.zone)+'</td>' +
      '<td>'+dpBadgeEnv(b.environnement)+'</td>' +
      '<td>'+dpBadgeStatut(b.statut)+'</td>' +
      '<td>'+dpAvatar(b.signale_par_nom)+'</td>' +
    '</tr>';
  }).join('');
}

// ── Formulaire signaler un bug ────────────────────────────
window.dpOuvrirFormulaireSignaler = function() {
  var existing = document.getElementById('dp-signaler-modal');
  if (existing) existing.remove();

  // Reset du tableau de fichiers sélectionnés (en mémoire, pas encore uploadés)
  window._dpSelectedFiles = [];

  var overlay = document.createElement('div');
  overlay.id = 'dp-signaler-modal';
  overlay.className = 'dp-modal-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="dp-modal-box">' +
      '<div class="dp-modal-head">' +
        '<div><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.65);font-family:monospace;letter-spacing:.04em">NOUVEAU BUG</div>' +
        '<h2 style="font-size:17px;font-weight:700;color:#fff;margin:4px 0 0">Signaler un bug</h2></div>' +
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

        '<div><label class="dp-form-label">Captures d\'écran (optionnel · 3 max · 5 Mo/fichier)</label>' +
          '<div class="dp-upload-zone" id="dp-upload-zone" onclick="document.getElementById(\'dp-sig-file-input\').click()">' +
            '<div class="dp-upload-ico">📷</div>' +
            '<div class="dp-upload-title">Cliquer ou glisser-déposer</div>' +
            '<div class="dp-upload-hint">PNG, JPG, JPEG, WebP, GIF</div>' +
            '<div class="dp-upload-count" id="dp-upload-count">0/3 capture(s) sélectionnée(s)</div>' +
          '</div>' +
          '<input type="file" id="dp-sig-file-input" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" multiple style="display:none">' +
          '<div class="dp-thumbs" id="dp-thumbs"></div>' +
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
          '<button class="dp-btn dp-btn--rose" id="dp-sig-submit" onclick="dpSoumettreSignalement()">Soumettre le bug</button>' +
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

  // Setup upload : input file + drag&drop
  var fileInput = document.getElementById('dp-sig-file-input');
  var uploadZone = document.getElementById('dp-upload-zone');
  fileInput.addEventListener('change', function(e){ dpHandleFiles(e.target.files); });
  uploadZone.addEventListener('dragover', function(e){
    e.preventDefault();
    uploadZone.classList.add('is-dragover');
  });
  uploadZone.addEventListener('dragleave', function(){
    uploadZone.classList.remove('is-dragover');
  });
  uploadZone.addEventListener('drop', function(e){
    e.preventDefault();
    uploadZone.classList.remove('is-dragover');
    dpHandleFiles(e.dataTransfer.files);
  });
};

// ── Gestion des fichiers sélectionnés (en mémoire) ───────
window.dpHandleFiles = function(fileList) {
  if (!window._dpSelectedFiles) window._dpSelectedFiles = [];
  var maxFiles = 3;
  var maxSize = 5 * 1024 * 1024; // 5 Mo
  var allowedTypes = ['image/png','image/jpeg','image/jpg','image/webp','image/gif'];

  for (var i = 0; i < fileList.length; i++) {
    var f = fileList[i];
    if (window._dpSelectedFiles.length >= maxFiles) {
      if (typeof showNotif==='function') showNotif('Maximum '+maxFiles+' captures','error');
      break;
    }
    if (allowedTypes.indexOf(f.type) === -1) {
      if (typeof showNotif==='function') showNotif('Format non supporté : '+f.name,'error');
      continue;
    }
    if (f.size > maxSize) {
      if (typeof showNotif==='function') showNotif('Fichier trop volumineux : '+f.name+' (max 5 Mo)','error');
      continue;
    }
    window._dpSelectedFiles.push(f);
  }
  dpRenderThumbs();
};

window.dpRenderThumbs = function() {
  var thumbsContainer = document.getElementById('dp-thumbs');
  var countEl = document.getElementById('dp-upload-count');
  var zone = document.getElementById('dp-upload-zone');
  if (!thumbsContainer) return;

  var files = window._dpSelectedFiles || [];
  thumbsContainer.innerHTML = files.map(function(f, idx){
    var url = URL.createObjectURL(f);
    return '<div class="dp-thumb">' +
      '<img src="'+url+'" alt="'+f.name+'">' +
      '<button class="dp-thumb__remove" onclick="dpRemoveFile('+idx+')">✕</button>' +
      '<div class="dp-thumb__name">'+f.name+'</div>' +
    '</div>';
  }).join('');

  if (countEl) countEl.textContent = files.length+'/3 capture(s) sélectionnée(s)';
  if (zone) {
    if (files.length >= 3) zone.classList.add('is-disabled');
    else zone.classList.remove('is-disabled');
  }
};

window.dpRemoveFile = function(idx) {
  if (!window._dpSelectedFiles) return;
  window._dpSelectedFiles.splice(idx, 1);
  dpRenderThumbs();
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

  // NOTE: La colonne `code` est GENERATED ALWAYS par Postgres
  // ('BUG-' || lpad(id, 3, '0')). On NE DOIT PAS l'inclure dans l'INSERT.
  var payload = {
    titre: titre.trim(),
    description: desc.trim()||null,
    zone: zone,
    environnement: env,
    urgence: urgence,
    statut: 'Nouveau',
    signale_par: currentUser ? currentUser.id : null,
    signale_par_nom: currentUserData ? (currentUserData.prenom+' '+currentUserData.nom) : 'Admin'
  };

  // Désactiver le bouton pendant le processus
  var submitBtn = document.getElementById('dp-sig-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.pointerEvents = 'none';
    submitBtn.textContent = 'Envoi en cours…';
  }

  try {
    // ── ÉTAPE 1 : INSERT du bug (Postgres génère le code automatiquement) ──
    var insertRes = await db.from('dsp_bugs').insert(payload).select('id, code').single();
    if (insertRes.error) throw insertRes.error;
    var newBug = insertRes.data;
    var bugCode = newBug.code; // ex: "BUG-003" (généré par Postgres)
    var bugId = newBug.id;

    // ── ÉTAPE 2 : Upload des captures (si présentes) ──
    var files = window._dpSelectedFiles || [];
    var uploadedPaths = [];
    var uploadError = null;
    if (files.length > 0) {
      try {
        uploadedPaths = await dpUploadScreenshots(files, bugCode);
      } catch(uploadErr) {
        uploadError = uploadErr;
      }
    }

    // ── ÉTAPE 3 : UPDATE du bug pour ajouter les chemins (si upload OK) ──
    if (uploadedPaths.length > 0) {
      var updRes = await db.from('dsp_bugs').update({screenshots: uploadedPaths}).eq('id', bugId);
      if (updRes.error) {
        // Le bug est créé mais on n'a pas pu attacher les captures
        // → on les retire du bucket pour éviter les orphelins
        await dpNettoyerOrphelins(uploadedPaths);
        throw new Error('Bug créé mais erreur attachement captures : '+updRes.error.message);
      }
    }

    // ── Fin : succès (avec ou sans warning upload) ──
    document.getElementById('dp-signaler-modal').remove();
    window._dpSelectedFiles = []; // reset
    if (uploadError) {
      if (typeof showNotif==='function') {
        showNotif('Bug '+bugCode+' créé, mais erreur upload capture : '+uploadError.message,'warning');
      }
    } else {
      if (typeof showNotif==='function') showNotif('✅ Bug '+bugCode+' signalé !','success');
    }
    dpRenderBugs();
    dpLoadStats();
    if (typeof dpLoadAQualifier==='function') dpLoadAQualifier();
  } catch(e) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.pointerEvents = 'auto';
      submitBtn.textContent = 'Soumettre le bug';
    }
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

// ── Nettoyage des fichiers orphelins en cas d'échec ──────
window.dpNettoyerOrphelins = async function(paths) {
  try {
    if (!paths || !paths.length) return;
    await db.storage.from('bug-screenshots').remove(paths);
  } catch(e) {
    // best-effort, on ne propage pas l'erreur
    console.warn('Nettoyage orphelins échoué:', e);
  }
};

// ── Upload de captures vers Supabase Storage ─────────────
// Reçoit un tableau de Files + le code du bug (ex: BUG-003)
// Retourne un tableau de chemins (ex: ["BUG-003/1747234567-1.png", ...])
window.dpUploadScreenshots = async function(files, bugCode) {
  var paths = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    // Génère un nom unique : timestamp + index + extension
    var ext = (f.name.split('.').pop() || 'png').toLowerCase();
    var fileName = Date.now()+'-'+i+'.'+ext;
    var path = bugCode+'/'+fileName;
    var res = await db.storage.from('bug-screenshots').upload(path, f, {
      cacheControl: '3600',
      upsert: false,
      contentType: f.type
    });
    if (res.error) throw new Error('Upload échoué : '+res.error.message);
    paths.push(path);
  }
  return paths;
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
  var statut  = data.statut || etapes[0];
  var stepIdx = etapes.indexOf(statut);
  var code    = data.code || (isBug ? 'BUG-?' : 'EVOL-?');

  // Ancienneté en jours
  var ageJours = Math.floor((Date.now() - new Date(data.created_at)) / 86400000);
  var ageLabel = ageJours === 0 ? 'Aujourd\'hui' : 'J+'+ageJours;

  // Stepper chips
  var stepperHTML = '<div class="dp-stepper">' +
    etapes.map(function(e,i){
      var state = i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'future';
      var label = state==='done' ? '✓' : String(i+1);
      return '<div class="dp-step dp-step--'+state+'">' +
        '<span class="dp-step__num">'+label+'</span>' +
        '<span class="dp-step__label">'+e+'</span>' +
        (i < etapes.length-1 ? '<span class="dp-step-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>' : '') +
      '</div>';
    }).join('') +
  '</div>';

  // Step-bar — bouton "Confirmer étape suivante"
  var nextEtape = etapes[stepIdx+1];
  var stepBarHTML = nextEtape
    ? '<div class="dp-step-bar">' +
        '<div class="dp-step-bar__left">' +
          '<div class="dp-step-bar__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>' +
          '<div><div class="dp-step-bar__lab">Étape en cours</div><div class="dp-step-bar__val">'+statut+'</div></div>' +
        '</div>' +
        '<button class="dp-btn dp-btn--primary" onclick="dpConfirmerEtape(\''+type+'\','+data.id+',\''+nextEtape+'\')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
          'Confirmer «&nbsp;'+nextEtape+'&nbsp;»' +
        '</button>' +
      '</div>'
    : '<div class="dp-step-bar" style="justify-content:center;color:var(--ok-700);font-weight:700">✅ Terminé</div>';

  // Meta-grid
  var creeLe = data.created_at ? new Date(data.created_at).toLocaleDateString('fr-FR') : '—';
  var echeance = data.date_echeance ? new Date(data.date_echeance).toLocaleDateString('fr-FR') : null;
  var metaHTML = '<div class="dp-meta-grid">' +
    '<div><div class="dp-meta-label">Statut</div>'+dpBadgeStatut(statut)+'</div>' +
    (isBug&&data.urgence ? '<div><div class="dp-meta-label">Urgence</div>'+dpBadgeUrgence(data.urgence)+'</div>' : '') +
    (isBug&&data.zone    ? '<div><div class="dp-meta-label">Zone</div>'+dpBadgeZone(data.zone)+'</div>' : '') +
    (isBug&&data.environnement ? '<div><div class="dp-meta-label">Env.</div>'+dpBadgeEnv(data.environnement)+'</div>' : '') +
    '<div><div class="dp-meta-label">Signalé par</div><div class="dp-meta-value">'+(data.signale_par_nom||'<span class="dp-meta-value--muted">—</span>')+'</div></div>' +
    '<div><div class="dp-meta-label">Créé le</div><div class="dp-meta-value dp-meta-value--mono">'+creeLe+'</div></div>' +
    '<div><div class="dp-meta-label">Ancienneté</div><div class="dp-age">'+ageLabel+'</div></div>' +
    '<div><div class="dp-meta-label">Échéance</div><div class="'+(echeance?'dp-meta-value dp-meta-value--mono':'dp-meta-value--muted')+'">'+(echeance||'—')+'</div></div>' +
  '</div>';

  // Événements/commentaires
  function dpInitiales(nom) {
    if (!nom) return '?';
    var parts = nom.trim().split(' ');
    return (parts[0][0]+(parts[1]?parts[1][0]:'')).toUpperCase();
  }
  var avatarColors = ['#4f63d2','#e5195e','#16a34a','#d97706','#7c3aed'];
  var eventsHTML = comments.length
    ? comments.map(function(c,i){
        var d = new Date(c.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).replace(':','h');
        var color = avatarColors[i % avatarColors.length];
        return '<div class="dp-event">' +
          '<div class="dp-ev-avatar" style="--av-color:'+color+'">'+dpInitiales(c.auteur_nom)+'</div>' +
          '<div class="dp-ev-body">' +
            '<div class="dp-ev-head"><span class="dp-ev-author">'+(c.auteur_nom||'Admin')+'</span><span class="dp-ev-tag">Note</span><span class="dp-ev-time">'+d+'</span></div>' +
            '<p class="dp-ev-text">'+c.contenu+'</p>' +
          '</div>' +
        '</div>';
      }).join('')
    : '<div style="color:var(--ink-400);font-size:13px;text-align:center;padding:16px">Aucun commentaire</div>';

  // Icônes sections
  var icoAvancement = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20V10M9 20V4M15 20v-7M21 20v-3"/></svg>';
  var icoDesc       = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>';
  var icoAdmin      = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82 2 2 0 01-2.83 2.83 1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51A2 2 0 0110 21a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33 2 2 0 01-2.83-2.83 1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1A2 2 0 013 10a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82 2 2 0 012.83-2.83 1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51A2 2 0 0114 3a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33 2 2 0 012.83 2.83 1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1A2 2 0 0121 14a1.65 1.65 0 00-1.51 1z"/></svg>';
  var icoEvents     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  var icoCapture    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  // Section captures (uniquement bug pour l'instant, mais marche pour évolutions aussi)
  var screenshots = data.screenshots || [];
  var nbCaptures = screenshots.length;
  var canAddMore = nbCaptures < 3;
  var capturesHTML = '<div class="dp-section">' +
    '<h3 class="dp-section-title" style="display:flex;justify-content:space-between;align-items:center;width:100%">' +
      '<span style="display:flex;align-items:center;gap:8px">' +
        '<span class="dp-section-ico">'+icoCapture+'</span>Captures ('+nbCaptures+'/3)' +
      '</span>' +
      (canAddMore
        ? '<button class="dp-btn dp-btn--ghost" style="height:28px;font-size:11px;padding:0 10px" onclick="dpAjouterCaptureDetail(\''+type+'\','+data.id+')">+ Ajouter</button>'
        : '') +
    '</h3>' +
    (nbCaptures > 0
      ? '<div class="dp-screenshots" id="dp-screenshots-'+data.id+'">' +
          '<div style="grid-column:1/-1;text-align:center;color:var(--ink-400);font-size:12px;padding:8px">Chargement des captures…</div>' +
        '</div>'
      : '<div style="color:var(--ink-400);font-size:13px;text-align:center;padding:16px">Aucune capture jointe</div>') +
  '</div>';

  // Si captures présentes : génère les URLs signées et les affiche après injection du HTML
  if (nbCaptures > 0) {
    setTimeout(function(){ dpAfficherCaptures(data.id, screenshots, type); }, 0);
  }

  box.innerHTML =
    // ── Header gradient navy ──
    '<div class="dp-modal-head">' +
      '<div class="dp-modal-head-left">' +
        '<span class="dp-modal-head-type">'+(isBug?'Bug':'Évolution')+'</span>' +
        '<span class="dp-modal-head-sep"></span>' +
        '<span class="dp-modal-head-code">'+code+'</span>' +
      '</div>' +
      '<div class="dp-modal-head-actions">' +
        '<button class="dp-modal-edit" title="Modifier" onclick="dpOuvrirModalEdition(\''+type+'\','+data.id+')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>' +
        '</button>' +
        '<button class="dp-modal-close" onclick="document.getElementById(\'dp-detail-modal\').remove()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +

    // ── Body scrollable ──
    '<div class="dp-modal-body">' +
      '<h2 class="dp-bug-title">'+data.titre+'</h2>' +

      metaHTML +

      // Section description (1ère position)
      (data.description
        ? '<div class="dp-section dp-section--rose">' +
            '<h3 class="dp-section-title dp-section-title--rose"><span class="dp-section-ico">'+icoDesc+'</span>Description</h3>' +
            '<p class="dp-desc">'+data.description+'</p>' +
          '</div>'
        : '') +

      // Section captures (entre description et avancement)
      capturesHTML +

      // Section avancement
      '<div class="dp-section">' +
        '<h3 class="dp-section-title"><span class="dp-section-ico">'+icoAvancement+'</span>Avancement</h3>' +
        stepperHTML +
        stepBarHTML +
      '</div>' +

      // Section événements (3ème position)
      '<div class="dp-section">' +
        '<h3 class="dp-section-title dp-section-title--ok"><span class="dp-section-ico">'+icoEvents+'</span>Événements ('+comments.length+')</h3>' +
        '<div class="dp-events">'+eventsHTML+'</div>' +
      '</div>' +

    '</div>' +

    // ── Composer footer ──
    '<div class="dp-composer">' +
      '<input id="dp-det-new-comment" placeholder="Ajouter un commentaire…" onkeydown="if(event.key===\'Enter\') dpAjouterCommentaire(\''+type+'\','+data.id+')">' +
      '<button class="dp-btn dp-btn--rose" onclick="dpAjouterCommentaire(\''+type+'\','+data.id+')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>' +
        'Envoyer' +
      '</button>' +
    '</div>';
}

window.dpOuvrirModalEdition = async function(type, id) {
  // Récupérer les données actuelles pour pré-remplir
  var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  var res = await db.from(table).select('*').eq('id',id).single();
  if (!res.data) {
    if (typeof showNotif==='function') showNotif('Élément introuvable','error');
    return;
  }
  var data = res.data;
  var isBug = type === 'bug';

  // Supprimer un overlay éventuel existant
  var existing = document.getElementById('dp-edit-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'dp-edit-modal-overlay';
  overlay.className = 'dp-edit-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  // Options urgence (bug uniquement)
  var urgenceOptions = ['Critique','Majeur','Mineur','Cosmétique'].map(function(u){
    return '<option'+(u===data.urgence?' selected':'')+'>'+u+'</option>';
  }).join('');

  // Options zone
  var zones = ['Dispatch','Dplane','Dvol','Mes dossiers','Auth','Autre'];
  var zoneOptions = zones.map(function(z){
    return '<option'+(z===data.zone?' selected':'')+'>'+z+'</option>';
  }).join('');

  overlay.innerHTML =
    '<div class="dp-edit-modal" onclick="event.stopPropagation()">' +
      '<div class="dp-edit-modal__head">' +
        '<span class="dp-edit-modal__title">Modifier '+(isBug?'le bug':'l\'évolution')+'</span>' +
        '<button class="dp-modal-close" onclick="document.getElementById(\'dp-edit-modal-overlay\').remove()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="dp-edit-modal__body">' +
        (isBug
          ? '<div class="dp-form-row">' +
              '<div class="dp-field">' +
                '<label class="dp-form-label" for="dp-edit-urgence">Urgence</label>' +
                '<select id="dp-edit-urgence">'+urgenceOptions+'</select>' +
              '</div>' +
              '<div class="dp-field">' +
                '<label class="dp-form-label" for="dp-edit-echeance">Échéance</label>' +
                '<input id="dp-edit-echeance" type="date" value="'+(data.date_echeance||'')+'">' +
              '</div>' +
            '</div>'
          : '<div class="dp-form-row dp-form-row--full">' +
              '<div class="dp-field">' +
                '<label class="dp-form-label" for="dp-edit-echeance">Échéance</label>' +
                '<input id="dp-edit-echeance" type="date" value="'+(data.date_echeance||'')+'">' +
              '</div>' +
            '</div>'
        ) +
        '<div class="dp-form-row dp-form-row--full">' +
          '<div class="dp-field">' +
            '<label class="dp-form-label" for="dp-edit-zone">Zone</label>' +
            '<select id="dp-edit-zone">'+zoneOptions+'</select>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dp-edit-modal__foot">' +
        '<button class="dp-btn dp-btn--ghost" onclick="document.getElementById(\'dp-edit-modal-overlay\').remove()">Annuler</button>' +
        '<button class="dp-btn dp-btn--primary" onclick="dpEnregistrerEdition(\''+type+'\','+id+')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
          'Enregistrer' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
};

window.dpEnregistrerEdition = async function(type, id) {
  var isBug = type === 'bug';
  var table = isBug ? 'dsp_bugs' : 'dsp_evolutions';

  var urgEl = document.getElementById('dp-edit-urgence');
  var echEl = document.getElementById('dp-edit-echeance');
  var zoneEl = document.getElementById('dp-edit-zone');

  var payload = {};
  if (isBug && urgEl) payload.urgence = urgEl.value;
  if (echEl && echEl.value) payload.date_echeance = echEl.value;
  if (zoneEl) payload.zone = zoneEl.value;

  try {
    var res = await db.from(table).update(payload).eq('id',id);
    if (res.error) throw res.error;
    if (typeof showNotif==='function') showNotif('✅ Modifications enregistrées','success');
    // Fermer le modal d'édition et rafraîchir le modal de détail
    var overlay = document.getElementById('dp-edit-modal-overlay');
    if (overlay) overlay.remove();
    dpOuvrirDetail(type, id);
    dpRenderBugs();
    dpLoadStats();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

// ── Affichage des captures avec URLs signées ─────────────
window.dpAfficherCaptures = async function(bugId, paths, type) {
  var container = document.getElementById('dp-screenshots-'+bugId);
  if (!container) return;
  try {
    // Génère les URLs signées (valables 1h)
    var signedUrls = [];
    for (var i = 0; i < paths.length; i++) {
      var res = await db.storage.from('bug-screenshots').createSignedUrl(paths[i], 3600);
      if (res.error) {
        signedUrls.push(null);
      } else {
        signedUrls.push(res.data.signedUrl);
      }
    }
    container.innerHTML = signedUrls.map(function(url, idx){
      if (!url) {
        return '<div class="dp-screenshot-thumb" style="cursor:default;color:var(--ink-400);font-size:11px">⚠ Erreur</div>';
      }
      // On encode le path en base64 pour le passer dans onclick sans souci de quotes
      var safePath = btoa(paths[idx]);
      return '<div class="dp-screenshot-thumb" onclick="dpOuvrirLightbox(\''+url+'\')" title="Cliquer pour agrandir">' +
        '<img src="'+url+'" alt="capture '+(idx+1)+'">' +
      '</div>';
    }).join('');
  } catch(e) {
    container.innerHTML = '<div style="grid-column:1/-1;color:var(--rose);font-size:12px;text-align:center;padding:8px">Erreur de chargement : '+e.message+'</div>';
  }
};

// ── Lightbox (image en grand) ────────────────────────────
window.dpOuvrirLightbox = function(url) {
  var existing = document.getElementById('dp-lightbox');
  if (existing) existing.remove();
  var lb = document.createElement('div');
  lb.id = 'dp-lightbox';
  lb.className = 'dp-lightbox';
  lb.onclick = function(){ lb.remove(); };
  lb.innerHTML = '<button class="dp-lightbox__close" onclick="event.stopPropagation();document.getElementById(\'dp-lightbox\').remove()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button><img src="'+url+'" alt="capture">';
  document.body.appendChild(lb);
};

// ── Ajout d'une capture depuis le modal de détail ────────
window.dpAjouterCaptureDetail = async function(type, id) {
  // Sélection d'un fichier via input
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
  input.style.display = 'none';
  input.onchange = async function(e) {
    var f = e.target.files[0];
    if (!f) return;

    // Validations
    var maxSize = 5 * 1024 * 1024;
    var allowedTypes = ['image/png','image/jpeg','image/jpg','image/webp','image/gif'];
    if (allowedTypes.indexOf(f.type) === -1) {
      if (typeof showNotif==='function') showNotif('Format non supporté','error');
      return;
    }
    if (f.size > maxSize) {
      if (typeof showNotif==='function') showNotif('Fichier trop volumineux (max 5 Mo)','error');
      return;
    }

    try {
      // Récupérer les captures existantes pour vérifier la limite
      var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
      var res = await db.from(table).select('code, screenshots').eq('id', id).single();
      if (res.error) throw res.error;
      var current = res.data.screenshots || [];
      if (current.length >= 3) {
        if (typeof showNotif==='function') showNotif('Limite de 3 captures atteinte','error');
        return;
      }
      var code = res.data.code;

      // Upload
      if (typeof showNotif==='function') showNotif('Upload en cours…','info');
      var paths = await dpUploadScreenshots([f], code);
      var updated = current.concat(paths);

      // Sauvegarde dans la DB
      var updateRes = await db.from(table).update({screenshots: updated}).eq('id', id);
      if (updateRes.error) throw updateRes.error;

      if (typeof showNotif==='function') showNotif('✅ Capture ajoutée','success');
      dpOuvrirDetail(type, id); // refresh
    } catch(e) {
      if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
    }
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(function(){ input.remove(); }, 1000);
};

window.dpConfirmerEtape = async function(type, id, nouveauStatut) {
  var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  try {
    var res = await db.from(table).update({statut: nouveauStatut}).eq('id',id);
    if (res.error) throw res.error;
    if (typeof showNotif==='function') showNotif('✅ Statut → '+nouveauStatut,'success');
    dpOuvrirDetail(type, id);
    dpLoadStats();
    dpLoadAQualifier();
    dpRenderBugs();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

window.dpSauvegarderDetail = async function(type, id) {
  var echeance  = (document.getElementById('dp-det-echeance')         ||{}).value||null;
  var urgence   = (document.getElementById('dp-det-urgence')          ||{}).value||null;
  var commAdmin = (document.getElementById('dp-det-commentaire-admin')||{}).value||null;
  var table  = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  var payload = {};
  if (echeance) payload.date_echeance = echeance;
  if (urgence && urgence !== '' && urgence !== '—') payload.urgence = urgence;
  if (commAdmin !== null && type==='evolution') payload.commentaire_admin = commAdmin;
  if (!Object.keys(payload).length) { if (typeof showNotif==='function') showNotif('Rien à mettre à jour','info'); return; }
  try {
    var res = await db.from(table).update(payload).eq('id',id);
    if (res.error) throw res.error;
    if (typeof showNotif==='function') showNotif('✅ Mis à jour !','success');
    dpOuvrirDetail(type, id);
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
