/* =========================================================
   Dproject — Module gestion projet DSP
   Rendu dans #dproject-content (app Dispatchis)
   Design basé sur le fichier Standalone Dproject Module
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
  container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
  container.style.webkitFontSmoothing = 'antialiased';

  container.innerHTML = `
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

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
.dp-btn--primary{background:linear-gradient(180deg,#2b3a87 0%,#1f2a6d 100%);color:#fff;border-color:rgba(15,23,42,.15);box-shadow:0 1px 0 rgba(255,255,255,.15) inset,0 1px 2px rgba(15,23,42,.2)}
.dp-btn--primary:hover{background:linear-gradient(180deg,#324296 0%,#24317b 100%)}
.dp-btn--rose{background:linear-gradient(180deg,#f04d65 0%,#d8344e 100%);color:#fff;border-color:rgba(0,0,0,.1);box-shadow:0 1px 0 rgba(255,255,255,.2) inset,0 1px 2px rgba(216,52,78,.35)}

/* ---- Tabs ---- */
.dp-tabs{display:flex;gap:4px;background:#fff;border:1px solid rgba(15,23,42,.06);border-radius:12px;padding:4px;box-shadow:var(--shadow-xs);margin-bottom:16px;width:fit-content}
.dp-tabs button{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:8px;border:0;background:transparent;font:inherit;font-size:13px;font-weight:500;color:var(--ink-600);cursor:pointer;transition:background .12s,color .12s}
.dp-tabs button:hover{background:var(--ink-50);color:var(--ink-800)}
.dp-tabs button.is-active{background:var(--navy);color:#fff;font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.15)}
.dp-tabs button .dp-count{display:inline-grid;place-items:center;min-width:20px;height:18px;padding:0 6px;border-radius:5px;background:#fde7ef;color:var(--rose);font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums}
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
.dp-kpi__value{font-size:22px;font-weight:700;color:var(--ink-900);margin-top:2px;font-variant-numeric:tabular-nums}

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

/* ---- Tables ---- */
table.dp-t{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.dp-t thead th{background:var(--ink-50);color:var(--ink-500);padding:10px 14px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;text-align:left;border-bottom:1px solid var(--ink-200)}
.dp-t tbody td{padding:12px 14px;border-bottom:1px solid var(--ink-100);vertical-align:middle}
.dp-t tbody tr:hover td{background:#fafbfd}
.dp-t tbody tr:last-child td{border-bottom:none}

/* ---- Ref badges ---- */
.dp-ref{font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:600;color:var(--navy);background:#eef1f6;padding:3px 8px;border-radius:5px;border:1px solid var(--ink-200)}
.dp-ref--evol{color:#9333ea;background:#f3e8ff;border-color:#d8b4fe}
.dp-ref--bug{color:#dc2626;background:#fde7e7;border-color:#f3a0a0}
.dp-ref--prod{color:var(--danger-700);background:var(--danger-50);border-color:#f3a0a0}
.dp-ref--staging{color:var(--warn-700);background:var(--warn-50);border-color:#f3c988}

.dp-title-cell{font-weight:600;color:var(--ink-900);font-size:13px}
.dp-desc{font-size:11.5px;color:var(--ink-500);margin-top:2px;line-height:1.4}

/* ---- Pills statuts ---- */
.dp-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.01em;border:1px solid;white-space:nowrap}
.dp-pill::before{content:"";width:6px;height:6px;border-radius:50%;flex-shrink:0}
.dp-pill--todo     {background:var(--ink-50);   border-color:var(--ink-200); color:var(--ink-700)}
.dp-pill--todo::before{background:var(--ink-400)}
.dp-pill--doing    {background:var(--info-50);  border-color:#a0c4f3;        color:var(--info-700)}
.dp-pill--doing::before{background:#2563eb}
.dp-pill--staging  {background:var(--warn-50);  border-color:#f3c988;        color:var(--warn-700)}
.dp-pill--staging::before{background:#d97706}
.dp-pill--done     {background:var(--ok-50);    border-color:#a0e0c0;        color:var(--ok-700)}
.dp-pill--done::before{background:#16a34a}
.dp-pill--new      {background:#f3e8ff;         border-color:#d8b4fe;        color:#6b21a8}
.dp-pill--new::before{background:#9333ea}
.dp-pill--analysis {background:var(--info-50);  border-color:#a0c4f3;        color:var(--info-700)}
.dp-pill--analysis::before{background:#2563eb}
.dp-pill--accepted {background:var(--ok-50);    border-color:#a0e0c0;        color:var(--ok-700)}
.dp-pill--accepted::before{background:#16a34a}
.dp-pill--refused  {background:var(--danger-50);border-color:#f3a0a0;        color:var(--danger-700)}
.dp-pill--refused::before{background:#dc2626}
.dp-pill--deployed {background:#ecfeff;         border-color:#67e8f9;        color:#0e7490}
.dp-pill--deployed::before{background:#06b6d4}

/* ---- Urgence bugs ---- */
.dp-urg{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid;white-space:nowrap}
.dp-urg__dot{width:8px;height:8px;border-radius:50%}
.dp-urg--critical{background:#fde7e7;border-color:#f3a0a0;color:#8c1f1f}
.dp-urg--critical .dp-urg__dot{background:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.15)}
.dp-urg--major{background:#fef3e2;border-color:#f3c988;color:#7a4a0c}
.dp-urg--major .dp-urg__dot{background:#ea580c}
.dp-urg--minor{background:#fef9c3;border-color:#fde68a;color:#854d0e}
.dp-urg--minor .dp-urg__dot{background:#eab308}
.dp-urg--cosmetic{background:#e3eefb;border-color:#a0c4f3;color:#1f458c}
.dp-urg--cosmetic .dp-urg__dot{background:#2563eb}

/* ---- Priorités ---- */
.dp-prio{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:5px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.dp-prio--high{background:#fde7e7;color:#8c1f1f}
.dp-prio--norm{background:var(--ink-50);color:var(--ink-600)}
.dp-prio--low{background:var(--ink-50);color:var(--ink-500)}

/* ---- Avatar / who ---- */
.dp-who{display:flex;align-items:center;gap:8px}
.dp-av{width:24px;height:24px;border-radius:50%;background:var(--av,var(--ink-500));color:#fff;font-size:9.5px;font-weight:700;display:grid;place-items:center;flex-shrink:0;box-shadow:0 0 0 2px #fff,0 0 0 3px var(--ink-200)}
.dp-who__name{font-size:12.5px;color:var(--ink-800);font-weight:500}
.dp-date{font-size:12px;color:var(--ink-600);font-variant-numeric:tabular-nums}
.dp-zone{display:inline-flex;align-items:center;padding:2px 8px;border-radius:5px;background:var(--brand-50);color:var(--brand-700);font-size:10.5px;font-weight:600;letter-spacing:.02em}

/* ---- Tab panels ---- */
.dp-tab-panel{display:none}
.dp-tab-panel.is-active{display:block}

/* ---- Roadmap ---- */
.dp-roadmap{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.dp-quarter{background:var(--surface);border:1px solid rgba(15,23,42,.06);border-radius:14px;padding:14px;box-shadow:var(--shadow-xs)}
.dp-quarter__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--ink-100)}
.dp-quarter__title{font-size:13px;font-weight:700;color:var(--navy);letter-spacing:-.005em}
.dp-quarter__count{font-size:10.5px;color:var(--ink-500);font-weight:600}
.dp-quarter--current{background:linear-gradient(180deg,#fff7fa 0%,#fff 70%);border-color:#fbd0dd}
.dp-quarter--current .dp-quarter__title{color:var(--rose)}
.dp-rm-item{background:#fff;border:1px solid var(--ink-200);border-radius:9px;padding:9px 11px;margin-bottom:8px;border-left:3px solid var(--ink-300)}
.dp-rm-item:last-child{margin-bottom:0}
.dp-rm-item--evol{border-left-color:#9333ea}
.dp-rm-item--task{border-left-color:var(--brand-600)}
.dp-rm-item--bug{border-left-color:#dc2626}
.dp-rm-item__top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.dp-rm-item__ref{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-500);font-weight:600}
.dp-rm-item__title{font-size:12.5px;font-weight:600;color:var(--ink-900);line-height:1.3}

/* ---- Formulaire ---- */
.dp-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px}
.dp-form-full{grid-column:1/-1}
.dp-form-field{display:flex;flex-direction:column;gap:6px}
.dp-form-field label{font-size:11px;font-weight:600;color:var(--ink-600);text-transform:uppercase;letter-spacing:.06em}
.dp-form-field input,.dp-form-field textarea,.dp-form-field select{padding:10px 12px;border:1px solid var(--ink-200);border-radius:9px;background:#fff;font:inherit;font-size:13px;color:var(--ink-900);outline:none}
.dp-form-field input:focus,.dp-form-field textarea:focus,.dp-form-field select:focus{border-color:var(--rose);box-shadow:0 0 0 3px rgba(229,25,94,.12)}
.dp-form-field textarea{resize:vertical;min-height:90px;font-family:inherit}
.dp-urg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.dp-urg-opt{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;border:1px solid var(--ink-200);background:#fff;cursor:pointer;font-size:12.5px;font-weight:600}
.dp-urg-opt:hover{border-color:var(--ink-300)}
.dp-urg-opt.is-selected{border-color:var(--rose);background:#fff7fa;box-shadow:0 0 0 3px rgba(229,25,94,.1)}
.dp-urg-opt input{display:none}
.dp-urg-opt .dp-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.dp-form-actions{padding:14px 18px;border-top:1px solid var(--ink-100);display:flex;justify-content:flex-end;gap:10px;background:#fafbfd}

@media(max-width:1100px){
  .dp-kpis{grid-template-columns:repeat(2,1fr)}
  .dp-roadmap{grid-template-columns:repeat(2,1fr)}
  .dp-form-grid{grid-template-columns:1fr}
}
</style>

<div class="dp-page">

  <!-- En-tête page -->
  <div class="dp-page-head">
    <div>
      <h1 class="dp-page-head__title">Dproject — Gestion projet DSP</h1>
      <div class="dp-page-head__sub">Tâches, évolutions, bugs et roadmap · remplace Jira pour l'équipe Dispatchis</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="dp-btn dp-btn--ghost" id="dp-btn-bug">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M9 12h6M9 16h6"/></svg>
        Signaler un bug
      </button>
      <button class="dp-btn dp-btn--ghost" id="dp-btn-evol">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
        Proposer une évolution
      </button>
      <button class="dp-btn dp-btn--rose">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Nouvelle tâche
      </button>
    </div>
  </div>

  <!-- KPIs -->
  <section class="dp-kpis">
    <div class="dp-kpi">
      <div class="dp-kpi__ico dp-kpi__ico--rose">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      </div>
      <div>
        <div class="dp-kpi__label">Tâches actives</div>
        <div class="dp-kpi__value">18</div>
      </div>
    </div>
    <div class="dp-kpi">
      <div class="dp-kpi__ico dp-kpi__ico--blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
      </div>
      <div>
        <div class="dp-kpi__label">Évolutions ouvertes</div>
        <div class="dp-kpi__value">12</div>
      </div>
    </div>
    <div class="dp-kpi">
      <div class="dp-kpi__ico dp-kpi__ico--warn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/></svg>
      </div>
      <div>
        <div class="dp-kpi__label">Bugs à traiter</div>
        <div class="dp-kpi__value">7 <span style="font-size:11px;color:var(--danger-700);font-weight:600;margin-left:4px">3 critiques</span></div>
      </div>
    </div>
    <div class="dp-kpi">
      <div class="dp-kpi__ico dp-kpi__ico--ok">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <div>
        <div class="dp-kpi__label">Livrés ce trimestre</div>
        <div class="dp-kpi__value">23</div>
      </div>
    </div>
  </section>

  <!-- Tabs -->
  <div class="dp-tabs" role="tablist">
    <button class="is-active" data-tab="taches">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      Tâches <span class="dp-count">18</span>
    </button>
    <button data-tab="evolutions">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
      Évolutions <span class="dp-count">12</span>
    </button>
    <button data-tab="bugs">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/></svg>
      Bugs <span class="dp-count">7</span>
    </button>
    <button data-tab="roadmap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      Roadmap
    </button>
  </div>

  <!-- ===== TÂCHES ===== -->
  <section class="dp-tab-panel is-active" id="dp-tab-taches">
    <div class="dp-card">
      <div class="dp-card__head">
        <div>
          <h3 class="dp-card__title">Tâches</h3>
          <div class="dp-card__sub">Suivi de développement · accès admin uniquement</div>
        </div>
        <div class="dp-toolbar">
          <div class="dp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input placeholder="Rechercher…">
          </div>
          <select class="dp-select"><option>Tous statuts</option><option>À faire</option><option>En cours</option><option>En staging</option><option>Terminé</option></select>
          <select class="dp-select"><option>Toute priorité</option><option>Haute</option><option>Normale</option><option>Basse</option></select>
          <select class="dp-select"><option>Tous assignés</option><option>Julien Maubon</option><option>Antoine Ferrand</option></select>
        </div>
      </div>
      <table class="dp-t">
        <colgroup><col style="width:90px"><col><col style="width:120px"><col style="width:100px"><col style="width:170px"><col style="width:110px"><col style="width:110px"></colgroup>
        <thead><tr><th>ID</th><th>Titre</th><th>Statut</th><th>Priorité</th><th>Assigné à</th><th>Cible</th><th>Lié à</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="dp-ref">TASK-042</span></td>
            <td>
              <div class="dp-title-cell">Refonte modal Dossier Vol — bannière actions</div>
              <div class="dp-desc">Intégrer la bannière dans la carte du tableau, ajout d'un second dossier en retard.</div>
            </td>
            <td><span class="dp-pill dp-pill--doing">En cours</span></td>
            <td><span class="dp-prio dp-prio--high">Haute</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#4f63d2">JM</span><span class="dp-who__name">Julien Maubon</span></div></td>
            <td class="dp-date">30 avr. 2026</td>
            <td><span class="dp-ref dp-ref--evol">EVOL-008</span></td>
          </tr>
          <tr>
            <td><span class="dp-ref">TASK-041</span></td>
            <td>
              <div class="dp-title-cell">KPIs Dvol — export Excel</div>
              <div class="dp-desc">Bouton d'export du tableau de bord avec données filtrées.</div>
            </td>
            <td><span class="dp-pill dp-pill--staging">En staging</span></td>
            <td><span class="dp-prio dp-prio--norm">Normale</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#5b3bb8">AF</span><span class="dp-who__name">Antoine Ferrand</span></div></td>
            <td class="dp-date">28 avr. 2026</td>
            <td><span class="dp-ref dp-ref--evol">EVOL-011</span></td>
          </tr>
          <tr>
            <td><span class="dp-ref">TASK-040</span></td>
            <td>
              <div class="dp-title-cell">Dplane — supprimer week-ends</div>
              <div class="dp-desc">Limiter la grille hebdo à lun-ven et adapter les colonnes.</div>
            </td>
            <td><span class="dp-pill dp-pill--done">Terminé</span></td>
            <td><span class="dp-prio dp-prio--norm">Normale</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#4f63d2">JM</span><span class="dp-who__name">Julien Maubon</span></div></td>
            <td class="dp-date">25 avr. 2026</td>
            <td>—</td>
          </tr>
          <tr>
            <td><span class="dp-ref">TASK-039</span></td>
            <td>
              <div class="dp-title-cell">Bouton « Demander une absence » sur Dplane</div>
              <div class="dp-desc">Workflow simple gestionnaire → admin pour valider absence/congé.</div>
            </td>
            <td><span class="dp-pill dp-pill--todo">À faire</span></td>
            <td><span class="dp-prio dp-prio--high">Haute</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#5b3bb8">AF</span><span class="dp-who__name">Antoine Ferrand</span></div></td>
            <td class="dp-date">5 mai 2026</td>
            <td><span class="dp-ref dp-ref--evol">EVOL-012</span></td>
          </tr>
          <tr>
            <td><span class="dp-ref">TASK-038</span></td>
            <td>
              <div class="dp-title-cell">Correction tri colonne « SIN » dans Dvol Dashboard</div>
              <div class="dp-desc">Le tri ne respectait pas l'ordre alphanumérique avec les zéros initiaux.</div>
            </td>
            <td><span class="dp-pill dp-pill--doing">En cours</span></td>
            <td><span class="dp-prio dp-prio--norm">Normale</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#4f63d2">JM</span><span class="dp-who__name">Julien Maubon</span></div></td>
            <td class="dp-date">2 mai 2026</td>
            <td><span class="dp-ref dp-ref--bug">BUG-005</span></td>
          </tr>
          <tr>
            <td><span class="dp-ref">TASK-037</span></td>
            <td>
              <div class="dp-title-cell">Politiques RLS Supabase — table dsp_bugs</div>
              <div class="dp-desc">Lecture par tous les gestionnaires, écriture restreinte au signaleur + admin.</div>
            </td>
            <td><span class="dp-pill dp-pill--todo">À faire</span></td>
            <td><span class="dp-prio dp-prio--high">Haute</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#5b3bb8">AF</span><span class="dp-who__name">Antoine Ferrand</span></div></td>
            <td class="dp-date">10 mai 2026</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ===== ÉVOLUTIONS ===== -->
  <section class="dp-tab-panel" id="dp-tab-evolutions">
    <div class="dp-card">
      <div class="dp-card__head">
        <div>
          <h3 class="dp-card__title">Évolutions</h3>
          <div class="dp-card__sub">Demandes de fonctionnalités proposées par les gestionnaires</div>
        </div>
        <div class="dp-toolbar">
          <div class="dp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input placeholder="Rechercher…">
          </div>
          <select class="dp-select"><option>Tous statuts</option><option>Nouvelle</option><option>En analyse</option><option>Acceptée</option><option>Refusée</option><option>Déployée</option></select>
          <button class="dp-btn dp-btn--rose" id="dp-btn-evol-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Proposer
          </button>
        </div>
      </div>
      <table class="dp-t">
        <colgroup><col style="width:90px"><col><col style="width:140px"><col style="width:170px"><col style="width:110px"></colgroup>
        <thead><tr><th>ID</th><th>Titre</th><th>Statut</th><th>Soumis par</th><th>Date</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="dp-ref dp-ref--evol">EVOL-012</span></td>
            <td>
              <div class="dp-title-cell">Workflow demande d'absence sur Dplane</div>
              <div class="dp-desc">Permettre aux gestionnaires de soumettre une absence directement depuis le planning.</div>
            </td>
            <td><span class="dp-pill dp-pill--accepted">Acceptée</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#b3791b">CD</span><span class="dp-who__name">Camille Durand</span></div></td>
            <td class="dp-date">22 avr. 2026</td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--evol">EVOL-011</span></td>
            <td>
              <div class="dp-title-cell">Export Excel des KPIs Dvol</div>
              <div class="dp-desc">Exporter le tableau de bord avec les filtres appliqués pour partage à la direction.</div>
            </td>
            <td><span class="dp-pill dp-pill--deployed">Déployée</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#128087">SL</span><span class="dp-who__name">Sophie Leroy</span></div></td>
            <td class="dp-date">18 avr. 2026</td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--evol">EVOL-010</span></td>
            <td>
              <div class="dp-title-cell">Filtrage du journal par rôle dans le modal dossier</div>
              <div class="dp-desc">Pouvoir masquer les événements système pour ne voir que les actions humaines.</div>
            </td>
            <td><span class="dp-pill dp-pill--analysis">En analyse</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#be3a4c">EP</span><span class="dp-who__name">Émilie Petit</span></div></td>
            <td class="dp-date">20 avr. 2026</td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--evol">EVOL-009</span></td>
            <td>
              <div class="dp-title-cell">Vue Kanban sur Dvol Dashboard</div>
              <div class="dp-desc">Alternative au tableau pour visualiser les dossiers par étape.</div>
            </td>
            <td><span class="dp-pill dp-pill--new">Nouvelle</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#0e6b70">MR</span><span class="dp-who__name">Marc Rousseau</span></div></td>
            <td class="dp-date">24 avr. 2026</td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--evol">EVOL-008</span></td>
            <td>
              <div class="dp-title-cell">Bannière « Actions requises » intégrée dans le tableau</div>
              <div class="dp-desc">Mettre en avant les dossiers en retard sans quitter la vue principale.</div>
            </td>
            <td><span class="dp-pill dp-pill--accepted">Acceptée</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#4f63d2">JM</span><span class="dp-who__name">Julien Maubon</span></div></td>
            <td class="dp-date">15 avr. 2026</td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--evol">EVOL-007</span></td>
            <td>
              <div class="dp-title-cell">Notifications push Dispatch</div>
              <div class="dp-desc">Alerter en temps réel l'arrivée d'un nouveau dossier.</div>
            </td>
            <td><span class="dp-pill dp-pill--refused">Refusée</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#128087">SL</span><span class="dp-who__name">Sophie Leroy</span></div></td>
            <td class="dp-date">10 avr. 2026</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ===== BUGS ===== -->
  <section class="dp-tab-panel" id="dp-tab-bugs">
    <div class="dp-card">
      <div class="dp-card__head">
        <div>
          <h3 class="dp-card__title">Bugs</h3>
          <div class="dp-card__sub">Signalements en cours · qualifiés par niveau d'urgence</div>
        </div>
        <div class="dp-toolbar">
          <div class="dp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input placeholder="Rechercher…">
          </div>
          <select class="dp-select"><option>Toute urgence</option><option>Critique</option><option>Majeur</option><option>Mineur</option><option>Cosmétique</option></select>
          <select class="dp-select"><option>Tous environnements</option><option>PROD</option><option>Staging</option></select>
          <button class="dp-btn dp-btn--rose" id="dp-btn-bug-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Signaler
          </button>
        </div>
      </div>
      <table class="dp-t">
        <colgroup><col style="width:90px"><col><col style="width:120px"><col style="width:130px"><col style="width:100px"><col style="width:140px"><col style="width:170px"></colgroup>
        <thead><tr><th>ID</th><th>Titre</th><th>Urgence</th><th>Zone</th><th>Env.</th><th>Statut</th><th>Signalé par</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="dp-ref dp-ref--bug">BUG-008</span></td>
            <td>
              <div class="dp-title-cell">Connexion impossible après mise à jour Supabase</div>
              <div class="dp-desc">Erreur 401 systématique pour les rôles « gestionnaire » depuis 9h ce matin.</div>
            </td>
            <td><span class="dp-urg dp-urg--critical"><span class="dp-urg__dot"></span>Critique</span></td>
            <td><span class="dp-zone">Auth</span></td>
            <td><span class="dp-ref dp-ref--prod">PROD</span></td>
            <td><span class="dp-pill dp-pill--analysis">En analyse</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#128087">SL</span><span class="dp-who__name">Sophie Leroy</span></div></td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--bug">BUG-007</span></td>
            <td>
              <div class="dp-title-cell">Création dossier — perte des pièces jointes au refresh</div>
              <div class="dp-desc">Les fichiers uploadés disparaissent si la page est rafraîchie avant validation.</div>
            </td>
            <td><span class="dp-urg dp-urg--critical"><span class="dp-urg__dot"></span>Critique</span></td>
            <td><span class="dp-zone">Dispatch</span></td>
            <td><span class="dp-ref dp-ref--prod">PROD</span></td>
            <td><span class="dp-pill dp-pill--doing">En correction</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#b3791b">CD</span><span class="dp-who__name">Camille Durand</span></div></td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--bug">BUG-006</span></td>
            <td>
              <div class="dp-title-cell">Dplane — affectation impossible le mercredi</div>
              <div class="dp-desc">Le clic « + » ne déclenche rien sur la colonne Mer pour les utilisateurs Firefox.</div>
            </td>
            <td><span class="dp-urg dp-urg--major"><span class="dp-urg__dot"></span>Majeur</span></td>
            <td><span class="dp-zone">Dplane</span></td>
            <td><span class="dp-ref dp-ref--prod">PROD</span></td>
            <td><span class="dp-pill dp-pill--staging">En staging</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#5b3bb8">AF</span><span class="dp-who__name">Antoine Ferrand</span></div></td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--bug">BUG-005</span></td>
            <td>
              <div class="dp-title-cell">Tri colonne SIN dans Dvol Dashboard</div>
              <div class="dp-desc">Le tri ignore les zéros initiaux et casse l'ordre alphanumérique.</div>
            </td>
            <td><span class="dp-urg dp-urg--minor"><span class="dp-urg__dot"></span>Mineur</span></td>
            <td><span class="dp-zone">Dvol</span></td>
            <td><span class="dp-ref dp-ref--prod">PROD</span></td>
            <td><span class="dp-pill dp-pill--doing">En correction</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#be3a4c">EP</span><span class="dp-who__name">Émilie Petit</span></div></td>
          </tr>
          <tr>
            <td><span class="dp-ref dp-ref--bug">BUG-004</span></td>
            <td>
              <div class="dp-title-cell">Avatar débordant sur la timeline événement</div>
              <div class="dp-desc">Léger décalage de 2px sur Safari uniquement.</div>
            </td>
            <td><span class="dp-urg dp-urg--cosmetic"><span class="dp-urg__dot"></span>Cosmétique</span></td>
            <td><span class="dp-zone">Dvol</span></td>
            <td><span class="dp-ref dp-ref--staging">Staging</span></td>
            <td><span class="dp-pill dp-pill--todo">Nouveau</span></td>
            <td><div class="dp-who"><span class="dp-av" style="--av:#4f63d2">JM</span><span class="dp-who__name">Julien Maubon</span></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ===== ROADMAP ===== -->
  <section class="dp-tab-panel" id="dp-tab-roadmap">
    <div class="dp-card">
      <div class="dp-card__head">
        <div>
          <h3 class="dp-card__title">Roadmap 2026</h3>
          <div class="dp-card__sub">Vue trimestrielle · évolutions acceptées et tâches importantes</div>
        </div>
        <div style="display:flex;gap:14px;align-items:center;font-size:11.5px;color:var(--ink-600)">
          <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#9333ea;display:inline-block"></span>Évolution</span>
          <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand-600);display:inline-block"></span>Tâche</span>
          <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#dc2626;display:inline-block"></span>Bug</span>
        </div>
      </div>
      <div style="padding:18px">
        <div class="dp-roadmap">
          <div class="dp-quarter dp-quarter--current">
            <div class="dp-quarter__head">
              <div class="dp-quarter__title">T2 · 2026 (en cours)</div>
              <div class="dp-quarter__count">5 items</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-012</span><span class="dp-pill dp-pill--accepted">Acceptée</span></div>
              <div class="dp-rm-item__title">Workflow demande absence Dplane</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-011</span><span class="dp-pill dp-pill--deployed">Déployée</span></div>
              <div class="dp-rm-item__title">Export Excel KPIs Dvol</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-008</span><span class="dp-pill dp-pill--doing">En cours</span></div>
              <div class="dp-rm-item__title">Bannière actions requises Dvol</div>
            </div>
            <div class="dp-rm-item dp-rm-item--task">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">TASK-037</span><span class="dp-pill dp-pill--todo">À faire</span></div>
              <div class="dp-rm-item__title">Politiques RLS Supabase</div>
            </div>
            <div class="dp-rm-item dp-rm-item--bug">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">BUG-007</span><span class="dp-pill dp-pill--doing">Correction</span></div>
              <div class="dp-rm-item__title">Pertes pièces jointes Dispatch</div>
            </div>
          </div>
          <div class="dp-quarter">
            <div class="dp-quarter__head">
              <div class="dp-quarter__title">T3 · 2026</div>
              <div class="dp-quarter__count">3 items</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-010</span><span class="dp-pill dp-pill--analysis">Analyse</span></div>
              <div class="dp-rm-item__title">Filtrage journal par rôle</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-013</span><span class="dp-pill dp-pill--new">Nouvelle</span></div>
              <div class="dp-rm-item__title">SSO Microsoft Entra</div>
            </div>
            <div class="dp-rm-item dp-rm-item--task">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">TASK-050</span><span class="dp-pill dp-pill--todo">À faire</span></div>
              <div class="dp-rm-item__title">Migration Supabase v2.5</div>
            </div>
          </div>
          <div class="dp-quarter">
            <div class="dp-quarter__head">
              <div class="dp-quarter__title">T4 · 2026</div>
              <div class="dp-quarter__count">2 items</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-009</span><span class="dp-pill dp-pill--new">Nouvelle</span></div>
              <div class="dp-rm-item__title">Vue Kanban Dvol Dashboard</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-014</span><span class="dp-pill dp-pill--new">Backlog</span></div>
              <div class="dp-rm-item__title">Mode sombre global</div>
            </div>
          </div>
          <div class="dp-quarter">
            <div class="dp-quarter__head">
              <div class="dp-quarter__title">T1 · 2027</div>
              <div class="dp-quarter__count">2 items</div>
            </div>
            <div class="dp-rm-item dp-rm-item--evol">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">EVOL-015</span><span class="dp-pill dp-pill--new">Backlog</span></div>
              <div class="dp-rm-item__title">App mobile lecture seule</div>
            </div>
            <div class="dp-rm-item dp-rm-item--task">
              <div class="dp-rm-item__top"><span class="dp-rm-item__ref">TASK-058</span><span class="dp-pill dp-pill--todo">À faire</span></div>
              <div class="dp-rm-item__title">Refonte design Dispatch</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Formulaire Signaler un bug -->
    <div class="dp-card" style="margin-top:14px">
      <div class="dp-card__head">
        <div>
          <h3 class="dp-card__title">Aperçu — Formulaire « Signaler un bug »</h3>
          <div class="dp-card__sub">Vue gestionnaire · soumission directe depuis n'importe quelle page DSP</div>
        </div>
      </div>
      <div class="dp-form-grid">
        <div class="dp-form-field dp-form-full">
          <label>Titre</label>
          <input value="Tri SIN cassé sur Dvol Dashboard">
        </div>
        <div class="dp-form-field dp-form-full">
          <label>Description — ce qui se passe / ce qui était attendu</label>
          <textarea>Lorsque je clique sur l'en-tête SIN pour trier, les dossiers SIN-2026-00045 apparaissent avant SIN-2026-00009. Le tri devrait respecter l'ordre numérique.</textarea>
        </div>
        <div class="dp-form-field">
          <label>Zone concernée</label>
          <select><option>Dispatch</option><option>Dplane</option><option selected>Dvol</option><option>Mes dossiers</option><option>Auth</option></select>
        </div>
        <div class="dp-form-field">
          <label>Environnement</label>
          <select><option selected>PROD</option><option>Staging</option></select>
        </div>
        <div class="dp-form-field dp-form-full">
          <label>Niveau d'urgence</label>
          <div class="dp-urg-grid">
            <label class="dp-urg-opt"><input type="radio" name="dp-u"><span class="dp-dot" style="background:#dc2626"></span>Critique</label>
            <label class="dp-urg-opt"><input type="radio" name="dp-u"><span class="dp-dot" style="background:#ea580c"></span>Majeur</label>
            <label class="dp-urg-opt is-selected"><input type="radio" name="dp-u" checked><span class="dp-dot" style="background:#eab308"></span>Mineur</label>
            <label class="dp-urg-opt"><input type="radio" name="dp-u"><span class="dp-dot" style="background:#2563eb"></span>Cosmétique</label>
          </div>
        </div>
      </div>
      <div class="dp-form-actions">
        <button class="dp-btn dp-btn--ghost">Annuler</button>
        <button class="dp-btn dp-btn--rose">Soumettre le bug</button>
      </div>
    </div>
  </section>

</div>

<script>
(function() {
  var tabs   = document.querySelectorAll('#dproject-content .dp-tabs button');
  var panels = document.querySelectorAll('#dproject-content .dp-tab-panel');

  function activateTab(name) {
    tabs.forEach(function(t) { t.classList.remove('is-active'); });
    panels.forEach(function(p) { p.classList.remove('is-active'); });
    var btn = document.querySelector('#dproject-content .dp-tabs button[data-tab="' + name + '"]');
    var panel = document.getElementById('dp-tab-' + name);
    if (btn)   btn.classList.add('is-active');
    if (panel) panel.classList.add('is-active');
  }

  tabs.forEach(function(t) {
    t.addEventListener('click', function() { activateTab(t.dataset.tab); });
  });

  var bugBtns  = ['dp-btn-bug',  'dp-btn-bug-2'];
  var evolBtns = ['dp-btn-evol', 'dp-btn-evol-2'];
  bugBtns.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function() { activateTab('bugs'); });
  });
  evolBtns.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function() { activateTab('evolutions'); });
  });

  // Urgence radio toggle
  document.querySelectorAll('#dproject-content .dp-urg-opt').forEach(function(o) {
    o.addEventListener('click', function() {
      var group = o.closest('.dp-urg-grid');
      if (group) group.querySelectorAll('.dp-urg-opt').forEach(function(x) { x.classList.remove('is-selected'); });
      o.classList.add('is-selected');
    });
  });
})();
</script>
`;
}
