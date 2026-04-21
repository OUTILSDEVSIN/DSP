// ============================================================
// DVOL v4.0 — Nouveau design modal + système Événements
//
// CE FICHIER CONTIENT 3 BLOCS À INTÉGRER dans dvol.js :
//
//  BLOC 1 — Fonction CSS à AJOUTER (une seule fois, en haut du fichier)
//  BLOC 2 — Fonctions Événements à AJOUTER avant dvolEnregistrer()
//  BLOC 3 — Remplacer COMPLÈTEMENT dvolOuvrirDossier() par la version ci-dessous
//           + Remplacer dvolEnregistrer() par la version simplifiée
// ============================================================


// ════════════════════════════════════════════════════════════
// BLOC 1 — INJECTION CSS
// À AJOUTER une seule fois, tout en haut de dvol.js
// (après les constantes DVOL_DOCS_OBLIGATOIRES, DVOL_ETAPES_DEF, etc.)
// ════════════════════════════════════════════════════════════

function dvolInjecterStylesV4() {
  if (document.getElementById('dvol-styles-v4')) return; // Évite de l'injecter 2 fois

  const style = document.createElement('style');
  style.id = 'dvol-styles-v4';
  style.textContent = `
    /* ── Variables locales au modal DVOL v4 ── */
    .dvol4-modal {
      --d4-ink-900:#0f172a; --d4-ink-800:#1e293b; --d4-ink-700:#334155;
      --d4-ink-600:#475569; --d4-ink-500:#64748b; --d4-ink-400:#94a3b8;
      --d4-ink-300:#cbd5e1; --d4-ink-200:#e2e8f0; --d4-ink-100:#f1f5f9;
      --d4-ink-50:#f8fafc;
      --d4-brand-700:#2f3d95; --d4-brand-600:#3b4cb8; --d4-brand-500:#4f63d2;
      --d4-brand-100:#e6eaf7; --d4-brand-50:#f3f5fb;
      --d4-ok-700:#166b4a; --d4-ok-600:#1c8a5e; --d4-ok-100:#e3f5ec; --d4-ok-50:#f1faf5;
      --d4-danger-700:#a1293a; --d4-danger-100:#fbe7ea;
      --d4-teal-700:#0e6b70; --d4-teal-100:#d6f0f1;
      --d4-violet-700:#5b3bb8; --d4-violet-100:#ece5fb;
      --d4-warn-700:#8a5a1c; --d4-warn-100:#fbefd9;
      --d4-shadow-xl:0 30px 60px -20px rgba(15,23,42,.25),0 12px 24px -12px rgba(15,23,42,.18);
      --d4-shadow-xs:0 1px 0 rgba(15,23,42,.04);
      font-family:'Inter',system-ui,-apple-system,sans-serif;
      -webkit-font-smoothing:antialiased;
    }

    /* ── Shell ── */
    .dvol4-modal {
      background:#fff; border-radius:18px;
      box-shadow:var(--d4-shadow-xl);
      width:100%; max-width:880px; max-height:90vh;
      overflow:hidden; display:flex; flex-direction:column;
      border:1px solid rgba(15,23,42,.06);
    }

    /* ── Header ── */
    .dvol4-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:20px 24px;
      background:linear-gradient(180deg,#22306e 0%,#1b2656 100%);
      color:#fff; position:relative; flex-shrink:0;
    }
    .dvol4-header::after {
      content:""; position:absolute; left:0; right:0; bottom:0; height:1px;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
    }
    .dvol4-header-title {
      display:flex; align-items:center; gap:12px;
      font-size:16px; font-weight:600; letter-spacing:-0.01em;
    }
    .dvol4-ref-tag {
      font-family:ui-monospace,monospace; font-size:12px; font-weight:500;
      background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.14);
      padding:4px 8px; border-radius:6px; letter-spacing:0.02em;
    }
    .dvol4-close-btn {
      width:32px; height:32px; border-radius:10px; border:0;
      background:rgba(255,255,255,.1); color:#fff; cursor:pointer;
      display:grid; place-items:center;
      transition:background .15s ease; flex-shrink:0;
    }
    .dvol4-close-btn:hover { background:rgba(255,255,255,.2) }

    /* ── Body scrollable ── */
    .dvol4-body { padding:24px 28px 8px; overflow-y:auto; flex:1 }

    /* ── Meta row ── */
    .dvol4-meta {
      display:grid; grid-template-columns:1.2fr 1.3fr 1fr .8fr;
      gap:20px; padding-bottom:20px;
      border-bottom:1px solid var(--d4-ink-200);
    }
    .dvol4-meta-label {
      font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
      color:var(--d4-ink-500); font-weight:600; margin-bottom:8px;
    }
    .dvol4-meta-value { font-size:14px; font-weight:500; color:var(--d4-ink-800); padding-top:2px }
    .dvol4-pill {
      display:inline-flex; align-items:center; gap:6px;
      padding:5px 10px; border-radius:999px;
      font-size:12.5px; font-weight:500; border:1px solid;
    }
    .dvol4-pill-dot { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.85 }
    .dvol4-pill--info { color:var(--d4-brand-700); background:var(--d4-brand-50); border-color:var(--d4-brand-100) }
    .dvol4-pill--ok   { color:var(--d4-ok-700);    background:var(--d4-ok-50);    border-color:var(--d4-ok-100) }
    .dvol4-select-wrap { position:relative; width:100%; max-width:220px }
    .dvol4-select-wrap select {
      appearance:none; -webkit-appearance:none;
      width:100%; padding:8px 34px 8px 12px;
      font:inherit; font-size:13.5px; color:var(--d4-ink-800);
      background:#fff; border:1px solid var(--d4-ink-200);
      border-radius:8px; cursor:pointer;
    }
    .dvol4-select-wrap::after {
      content:""; position:absolute; right:12px; top:50%;
      width:8px; height:8px;
      border-right:1.5px solid var(--d4-ink-500);
      border-bottom:1.5px solid var(--d4-ink-500);
      transform:translateY(-75%) rotate(45deg); pointer-events:none;
    }

    /* ── Boutons actions ── */
    .dvol4-actions {
      display:flex; flex-wrap:wrap; align-items:center; gap:10px;
      padding:20px 0; border-bottom:1px solid var(--d4-ink-200);
    }
    .dvol4-actions-spacer { flex:1 }
    .dvol4-btn {
      display:inline-flex; align-items:center; gap:8px;
      height:36px; padding:0 14px; border-radius:9px;
      border:1px solid transparent; font:inherit;
      font-size:13px; font-weight:500; cursor:pointer;
      transition:transform .08s ease, background .15s ease, border-color .15s ease;
    }
    .dvol4-btn:hover  { transform:translateY(-1px) }
    .dvol4-btn:active { transform:translateY(0) }
    .dvol4-btn svg { width:15px; height:15px; flex-shrink:0 }
    .dvol4-btn--ok     { background:var(--d4-ok-50);     color:var(--d4-ok-700);     border-color:var(--d4-ok-100) }
    .dvol4-btn--ok:hover { background:#dcf0e4 }
    .dvol4-btn--danger { background:var(--d4-danger-100); color:var(--d4-danger-700); border-color:#f5d6db }
    .dvol4-btn--danger:hover { background:#f9d1d8 }
    .dvol4-btn--teal   { background:var(--d4-teal-100);  color:var(--d4-teal-700);   border-color:#c0e4e6 }
    .dvol4-btn--teal:hover { background:#b7e1e4 }
    .dvol4-btn--violet { background:var(--d4-violet-100); color:var(--d4-violet-700); border-color:#dcd1f6 }
    .dvol4-btn--violet:hover { background:#d5c7f5 }
    .dvol4-btn--primary {
      background:linear-gradient(180deg,#2b3a87 0%,#1f2a6d 100%);
      color:#fff; border-color:rgba(15,23,42,.15);
    }
    .dvol4-btn--primary:hover { background:linear-gradient(180deg,#324296 0%,#24317b 100%) }
    .dvol4-btn--ghost { background:#fff; border-color:var(--d4-ink-200); color:var(--d4-ink-800) }
    .dvol4-btn--ghost:hover { background:var(--d4-ink-50) }

    /* ── Sections ── */
    .dvol4-section { padding:22px 0; border-bottom:1px solid var(--d4-ink-200) }
    .dvol4-section:last-child { border-bottom:0 }
    .dvol4-section-head { display:flex; align-items:center; gap:10px; margin-bottom:14px }
    .dvol4-section-icon {
      width:22px; height:22px; border-radius:7px;
      display:grid; place-items:center;
      color:var(--d4-ink-600); background:var(--d4-ink-100);
    }
    .dvol4-section-title { font-size:13.5px; font-weight:600; color:var(--d4-ink-800) }
    .dvol4-section-aside { font-size:12px; color:var(--d4-ok-700) }
    .dvol4-section-aside--muted { font-size:12px; color:var(--d4-ink-500) }

    /* ── Stepper ── */
    .dvol4-stepper { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; position:relative }
    .dvol4-step {
      position:relative; padding:12px 14px; border-radius:12px;
      border:1px solid var(--d4-ink-200); background:#fff;
      min-height:64px; display:flex; flex-direction:column; gap:4px;
    }
    .dvol4-step__label { font-size:12.5px; font-weight:600; color:var(--d4-ink-800); display:flex; align-items:center; gap:6px }
    .dvol4-step__date  { font-size:11px; color:var(--d4-ink-500) }
    .dvol4-step--done  { background:var(--d4-ok-50); border-color:var(--d4-ok-100) }
    .dvol4-step--done .dvol4-step__label { color:var(--d4-ok-700) }
    .dvol4-step--done .dvol4-step__date  { color:var(--d4-ok-700); opacity:.75 }
    .dvol4-step--current { border-color:var(--d4-brand-500); box-shadow:0 0 0 3px rgba(79,99,210,.12) }
    .dvol4-step--current .dvol4-step__label { color:var(--d4-brand-700) }
    .dvol4-step--current .dvol4-step__date  { color:var(--d4-brand-600) }
    .dvol4-step--future { background:var(--d4-ink-50) }
    .dvol4-step--future .dvol4-step__label { color:var(--d4-ink-600) }
    .dvol4-step--annule { background:var(--d4-ink-100); opacity:.5 }
    .dvol4-step-chev {
      position:absolute; right:-12px; top:50%; transform:translateY(-50%);
      width:18px; height:18px; z-index:2; display:grid; place-items:center;
      background:#fff; border-radius:50%; color:var(--d4-ink-400);
      box-shadow:0 0 0 1px var(--d4-ink-200);
    }
    .dvol4-step-check {
      width:14px; height:14px; border-radius:50%;
      background:var(--d4-ok-600); color:#fff;
      display:inline-grid; place-items:center;
    }
    .dvol4-step-check svg { width:9px; height:9px }
    .dvol4-step-pulse {
      width:8px; height:8px; border-radius:50%;
      background:var(--d4-brand-600);
      box-shadow:0 0 0 4px rgba(79,99,210,.18);
    }

    /* ── Bannière étape en cours ── */
    .dvol4-banner {
      margin-top:14px; padding:14px 16px; border-radius:12px;
      background:linear-gradient(180deg,#f3f5fb 0%,#eef1f9 100%);
      border:1px solid var(--d4-brand-100);
      display:flex; align-items:center; justify-content:space-between; gap:16px;
    }
    .dvol4-banner-left { display:flex; align-items:center; gap:12px }
    .dvol4-banner-icon {
      width:34px; height:34px; border-radius:10px;
      background:#fff; color:var(--d4-brand-700);
      display:grid; place-items:center; border:1px solid var(--d4-brand-100);
    }
    .dvol4-banner-eyebrow { font-size:11px; color:var(--d4-ink-500); text-transform:uppercase; letter-spacing:.08em; font-weight:600 }
    .dvol4-banner-title   { font-size:14px; font-weight:600; color:var(--d4-ink-900); margin-top:2px }

    /* ── Documents ── */
    .dvol4-doclist { display:flex; flex-direction:column; gap:10px }
    .dvol4-docrow {
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 14px; border:1px solid var(--d4-ink-200);
      border-radius:10px; background:#fff;
      transition:border-color .15s ease, background .15s ease;
    }
    .dvol4-docrow:hover { border-color:var(--d4-ink-300); background:var(--d4-ink-50) }
    .dvol4-docrow-left { display:flex; align-items:center; gap:12px }
    .dvol4-docrow-icon {
      width:30px; height:30px; border-radius:8px;
      display:grid; place-items:center;
      background:var(--d4-brand-50); color:var(--d4-brand-700); border:1px solid var(--d4-brand-100);
    }
    .dvol4-docrow-title { font-size:13.5px; font-weight:500; color:var(--d4-ink-800) }
    .dvol4-docrow-sub   { font-size:12px; color:var(--d4-ink-500); margin-left:6px }
    .dvol4-docrow-meta  { display:flex; align-items:center; gap:12px; font-size:12px; color:var(--d4-ink-600) }
    .dvol4-progress { width:140px; height:6px; background:var(--d4-ink-100); border-radius:999px; overflow:hidden }
    .dvol4-progress-bar { height:100%; background:linear-gradient(90deg,var(--d4-ok-600),#2ca976); border-radius:inherit }

    /* ── Timeline Événements ── */
    .dvol4-timeline { list-style:none; margin:0; padding:4px 0 0 0; display:flex; flex-direction:column; gap:4px }
    .dvol4-tl {
      position:relative; display:grid;
      grid-template-columns:32px 1fr; column-gap:14px; padding:10px 0;
    }
    .dvol4-tl-avatar {
      width:32px; height:32px; border-radius:50%;
      color:#fff; font-size:11px; font-weight:600; letter-spacing:.02em;
      display:grid; place-items:center;
      box-shadow:0 0 0 3px #fff,0 0 0 4px var(--d4-ink-200);
      position:relative; z-index:1;
    }
    .dvol4-tl-line {
      position:absolute; left:15px; top:42px; bottom:-4px;
      width:2px; background:var(--d4-ink-200);
    }
    .dvol4-tl:last-child .dvol4-tl-line { display:none }
    .dvol4-tl-body { padding-top:2px }
    .dvol4-tl-head { display:flex; align-items:center; flex-wrap:wrap; gap:6px; font-size:12.5px; color:var(--d4-ink-600) }
    .dvol4-tl-who  { color:var(--d4-ink-900); font-weight:600; font-size:13px }
    .dvol4-tl-role {
      font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.06em;
      color:var(--d4-ink-500); background:var(--d4-ink-100); border:1px solid var(--d4-ink-200);
      padding:2px 6px; border-radius:5px;
    }
    .dvol4-tl-when { font-size:12px; color:var(--d4-ink-500); margin-left:auto }
    .dvol4-tl-what { margin-top:4px; font-size:13.5px; color:var(--d4-ink-700) }

    /* ── Formulaire ajout événement ── */
    .dvol4-compose {
      margin-top:12px; display:grid;
      grid-template-columns:32px 1fr 140px auto;
      gap:10px; align-items:center; padding:10px;
      background:var(--d4-ink-50); border:1px solid var(--d4-ink-200); border-radius:12px;
    }
    .dvol4-compose-avatar {
      width:32px; height:32px; border-radius:50%;
      background:var(--d4-brand-500); color:#fff;
      font-size:11px; font-weight:600; display:grid; place-items:center;
    }
    .dvol4-compose-input, .dvol4-compose-select {
      height:36px; border:1px solid var(--d4-ink-200); border-radius:8px;
      background:#fff; padding:0 12px; font:inherit; font-size:13px;
      color:var(--d4-ink-800); outline:none;
    }
    .dvol4-compose-input:focus, .dvol4-compose-select:focus {
      border-color:var(--d4-brand-500);
      box-shadow:0 0 0 3px rgba(79,99,210,.15);
    }
    .dvol4-compose-select { appearance:none; -webkit-appearance:none; padding-right:28px;
      background-image:linear-gradient(45deg,transparent 50%,var(--d4-ink-500) 50%),linear-gradient(-45deg,transparent 50%,var(--d4-ink-500) 50%);
      background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;
      background-size:5px 5px,5px 5px; background-repeat:no-repeat;
    }

    /* ── Footer ── */
    .dvol4-footer {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 28px; background:var(--d4-ink-50);
      border-top:1px solid var(--d4-ink-200); flex-shrink:0;
    }
    .dvol4-foot-note { font-size:12px; color:var(--d4-ink-500); display:inline-flex; align-items:center; gap:8px }
    .dvol4-foot-actions { display:flex; gap:10px }

    /* ── Bannière LABTAF (réutilise l'existant, juste redéfini proprement) ── */
    .dvol4-labtaf-banner {
      background:#ecfeff; border:2px solid #06b6d4; border-radius:10px;
      padding:14px 16px; margin-bottom:16px;
    }
  `;
  document.head.appendChild(style);
}


// ════════════════════════════════════════════════════════════
// BLOC 2 — FONCTIONS ÉVÉNEMENTS
// À AJOUTER juste avant dvolEnregistrer()
// ════════════════════════════════════════════════════════════

async function dvolChargerEvenements(dossierId) {
  const { data, error } = await db
    .from('dvol_evenements')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: true });
  if (error) { console.warn('[DVOL] Événements:', error.message); return []; }
  return data || [];
}

async function dvolAjouterEvenement(dossierId) {
  const texteEl = document.getElementById('dvol-ev-texte-' + dossierId);
  const typeEl  = document.getElementById('dvol-ev-type-' + dossierId);
  if (!texteEl || !texteEl.value.trim()) {
    showNotif('Saisis un texte avant d\'ajouter un événement.', 'error');
    return;
  }
  const nomUtilisateur = currentUserData
    ? (currentUserData.prenom + ' ' + currentUserData.nom).trim()
    : 'Utilisateur';

  const { error } = await db.from('dvol_evenements').insert({
    dossier_id:  dossierId,
    user_id:     currentUser?.id || null,
    user_nom:    nomUtilisateur,
    type_action: typeEl?.value || 'Note',
    description: texteEl.value.trim()
  });
  if (error) {
    showNotif('Erreur ajout événement : ' + error.message, 'error');
    return;
  }
  showNotif('✅ Événement ajouté', 'success');
  dvolOuvrirDossier(dossierId);
}


// ════════════════════════════════════════════════════════════
// BLOC 3A — REMPLACER dvolOuvrirDossier() COMPLÈTEMENT
// ════════════════════════════════════════════════════════════

async function dvolOuvrirDossier(id) {
  dvolInjecterStylesV4(); // Inject CSS si pas encore fait

  const d = dvolDossiers.find(x => String(x.id) === String(id));
  if (!d) return;

  const jours        = dvolJours(d.date_declaration);
  const etapes       = dvolEtapesEnrichies(d);
  const etapeEnCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
  const dossierClos  = d.statut === 'clos' || d.statut === 'refuse';
  const compagnie    = d.compagnie_mere || d.compagnie || '';

  // ── Charge les événements ──
  const evenements = await dvolChargerEvenements(d.id);

  // ── STEPPER ──
  const SVG_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"></path></svg>`;
  const SVG_CLOCK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`;
  const SVG_CHEV  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"></path></svg>`;

  const stepperHtml = etapes.map((e, i) => {
    let cls = 'dvol4-step--future';
    let iconHtml = SVG_CLOCK;
    if (e.statut === 'annule') {
      cls = 'dvol4-step--annule';
    } else if (e.statut === 'realise') {
      cls = 'dvol4-step--done';
      iconHtml = `<span class="dvol4-step-check">${SVG_CHECK}</span>`;
    } else if (e === etapeEnCours) {
      cls = 'dvol4-step--current';
      iconHtml = `<span class="dvol4-step-pulse"></span>`;
    }
    const dateAff = e.statut === 'realise' ? dvolFmtDate(e.dateRealisee) : dvolFmtDate(e.datePrevue);
    const chevron = i < etapes.length - 1
      ? `<div class="dvol4-step-chev">${SVG_CHEV}</div>` : '';
    return `
      <div class="dvol4-step ${cls}">
        <div class="dvol4-step__label">${iconHtml} ${e.label}</div>
        <div class="dvol4-step__date">${dateAff || '—'}</div>
        ${chevron}
      </div>`;
  }).join('');

  // ── BANNIÈRE ÉTAPE EN COURS ──
  const banniereHtml = etapeEnCours && !dossierClos ? `
    <div class="dvol4-banner">
      <div class="dvol4-banner-left">
        <div class="dvol4-banner-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4l3 2"></path></svg>
        </div>
        <div>
          <div class="dvol4-banner-eyebrow">Étape en cours</div>
          <div class="dvol4-banner-title">${etapeEnCours.label}</div>
        </div>
      </div>
      <button class="dvol4-btn dvol4-btn--primary"
        data-dossier-id="${d.id}" data-slug="${etapeEnCours.slug}" data-label="${etapeEnCours.label}"
        onclick="dvolDemanderConfirmEtape(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12l5 5 9-10"></path></svg>
        Confirmer « ${etapeEnCours.label} »
      </button>
    </div>` : '';

  // ── BANNIÈRE LABTAF ──
  const dateDefautLabtaf = (() => {
    const dt = new Date(); dt.setDate(dt.getDate() + 30);
    return dt.toISOString().split('T')[0];
  })();
  const labtafBanniere = d.statut === 'labtaf' ? `
    <div class="dvol4-labtaf-banner">
      <div style="font-weight:800;color:#0e7490;margin-bottom:6px">🔒 Dossier en attente LABTAF</div>
      ${d.date_cloture_prevue
        ? `<div style="font-size:13px;color:#0e7490">Relance prévue le <strong>${dvolFmtDate(d.date_cloture_prevue)}</strong></div>`
        : ''}
    </div>` : '';

  // ── BOUTONS D'ACTION ──
  const btnRetrouve = dossierClos
    ? `<span style="font-size:13px;color:#6b7280;font-style:italic">🔒 Dossier clôturé</span>`
    : `<button class="dvol4-btn dvol4-btn--ok" onclick="dvolDemanderRetrouve('${d.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 13l4 4L21 5"></path></svg>
        Véhicule retrouvé
       </button>
       <button class="dvol4-btn dvol4-btn--danger" onclick="dvolDemanderRefus('${d.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M5.6 5.6l12.8 12.8"></path></svg>
        Refusé
       </button>
       <button class="dvol4-btn dvol4-btn--teal" onclick="dvolDemanderLabtaf('${d.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h12l4 4v10H4z"></path><path d="M8 5v5h8V5"></path></svg>
        Procédure LABTAF
       </button>`;

  const btnCmam = `
    <div class="dvol4-actions-spacer"></div>
    <button class="dvol4-btn dvol4-btn--violet" onclick="dvolOuvrirProcedureParDessus('${compagnie}', '${d.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l3 3v15H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>
      Procédure ${compagnie || 'Expert'}
    </button>`;

  // ── DOCUMENTS ──
  const recusList    = dvolGetDocsRecus(d);
  const nbOblig      = recusList.filter(k => DVOL_DOCS_OBLIGATOIRES.find(o => o.key === k)).length;
  const totalOblig   = DVOL_DOCS_OBLIGATOIRES.length;
  const pctOblig     = Math.round((nbOblig / totalOblig) * 100);
  const docsVerrouilles = d.statut !== 'declare' && d.statut !== 'en_attente_documents';
  const SVG_DOC = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l3 3v15H6z"></path><path d="M9 12h6M9 16h4"></path></svg>`;

  const documentsHtml = `
    <div class="dvol4-doclist">
      <div class="dvol4-docrow">
        <div class="dvol4-docrow-left">
          <div class="dvol4-docrow-icon">${SVG_DOC}</div>
          <div>
            <span class="dvol4-docrow-title">Obligatoires</span>
            <span class="dvol4-docrow-sub">${totalOblig} documents requis</span>
          </div>
        </div>
        <div class="dvol4-docrow-meta">
          <span>${nbOblig} / ${totalOblig}</span>
          <div class="dvol4-progress"><div class="dvol4-progress-bar" style="width:${pctOblig}%"></div></div>
        </div>
      </div>
      <div class="dvol4-docrow">
        <div class="dvol4-docrow-left">
          <div class="dvol4-docrow-icon" style="background:var(--d4-ink-100);border-color:var(--d4-ink-200);color:var(--d4-ink-600)">${SVG_DOC}</div>
          <div>
            <span class="dvol4-docrow-title">Optionnels</span>
            <span class="dvol4-docrow-sub">sans alerte si absent</span>
          </div>
        </div>
        <div class="dvol4-docrow-meta">
          <span style="color:var(--d4-ink-500)">0 / ${DVOL_DOCS_OPTIONNELS.length}</span>
          <div class="dvol4-progress"><div class="dvol4-progress-bar" style="width:0%;background:var(--d4-ink-300)"></div></div>
        </div>
      </div>
    </div>`;

  // ── TIMELINE ÉVÉNEMENTS ──
  const couleurType = { 'Appel':'#4f63d2', 'E-mail':'#128087', 'Validation':'#166534', 'Note':'#64748b' };

  const timelineEv = evenements.length === 0
    ? `<li style="padding:16px 0;text-align:center;color:#94a3b8;font-size:13px">Aucun événement pour le moment</li>`
    : evenements.map(ev => {
        const initiales = (ev.user_nom || 'SY').split(' ').map(n => n[0]||'').join('').substring(0, 2).toUpperCase();
        const couleur   = couleurType[ev.type_action] || '#64748b';
        const dateAff   = new Date(ev.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        return `
          <li class="dvol4-tl">
            <div class="dvol4-tl-avatar" style="background:${couleur}">${initiales}</div>
            <div class="dvol4-tl-line"></div>
            <div class="dvol4-tl-body">
              <div class="dvol4-tl-head">
                <span class="dvol4-tl-who">${ev.user_nom || 'Utilisateur'}</span>
                <span class="dvol4-tl-role">${ev.type_action}</span>
                <span class="dvol4-tl-when">${dateAff}</span>
              </div>
              <div class="dvol4-tl-what">${ev.description}</div>
            </div>
          </li>`;
      }).join('');

  const initUserActuel = currentUserData
    ? ((currentUserData.prenom?.[0]||'') + (currentUserData.nom?.[0]||'U')).toUpperCase()
    : 'U';

  const formulaireEv = dossierClos ? '' : `
    <div class="dvol4-compose">
      <div class="dvol4-compose-avatar">${initUserActuel}</div>
      <input id="dvol-ev-texte-${d.id}" class="dvol4-compose-input"
        placeholder="Consigner un événement (ex. « Relance client par e-mail »)…">
      <select id="dvol-ev-type-${d.id}" class="dvol4-compose-select">
        <option>Note</option>
        <option>Appel</option>
        <option>E-mail</option>
        <option>Validation</option>
      </select>
      <button class="dvol4-btn dvol4-btn--primary" onclick="dvolAjouterEvenement('${d.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16M14 6l6 6-6 6"></path></svg>
        Ajouter
      </button>
    </div>`;

  // ── STATUT PILL ──
  const statutInfo = dvolBadgeStatutV4(d.statut);

  // ── GESTIONNAIRE SELECT ──
  const gestOpts = `<option value="">— Non assigné —</option>` +
    (allUsers || []).map(u =>
      `<option value="${u.id}" ${d.gestionnaire_id === u.id ? 'selected' : ''}>${u.prenom} ${u.nom}</option>`
    ).join('');

  // ── ANCIENNETÉ PILL ──
  const jousPillCls = jours === null ? 'dvol4-pill--info'
    : jours <= 10 ? 'dvol4-pill--ok'
    : jours <= 25 ? 'dvol4-pill--info'
    : 'dvol4-pill--danger'; // Utiliser une classe danger custom si besoin

  // ── ASSEMBLAGE FINAL ──
  const modalHtml = `
    <div class="dvol4-modal" onclick="event.stopPropagation()">

      <!-- Header -->
      <header class="dvol4-header">
        <div class="dvol4-header-title">
          <span>Dossier VOL</span>
          <span style="opacity:.5">—</span>
          <span class="dvol4-ref-tag">${d.ref_sinistre || d.numero_dossier || String(d.id).substring(0,8)}</span>
        </div>
        <button class="dvol4-close-btn" onclick="dvolCloseModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
        </button>
      </header>

      <!-- Body -->
      <div class="dvol4-body">

        ${labtafBanniere}

        <!-- Meta -->
        <section class="dvol4-meta">
          <div>
            <div class="dvol4-meta-label">Statut</div>
            ${statutInfo}
          </div>
          <div>
            <div class="dvol4-meta-label">Gestionnaire</div>
            <div class="dvol4-select-wrap">
              <select onchange="dvolSauvegarderGestionnaire('${d.id}', this.value)">${gestOpts}</select>
            </div>
          </div>
          <div>
            <div class="dvol4-meta-label">Date déclaration</div>
            <div class="dvol4-meta-value">${dvolFmtDate(d.date_declaration)}</div>
          </div>
          <div>
            <div class="dvol4-meta-label">Ancienneté</div>
            <span class="dvol4-pill dvol4-pill--ok"><span class="dvol4-pill-dot"></span>J+${jours ?? '?'}</span>
          </div>
        </section>

        <!-- Actions -->
        <section class="dvol4-actions">
          ${btnRetrouve}
          ${btnCmam}
        </section>

        <!-- Avancement -->
        <div class="dvol4-section">
          <div class="dvol4-section-head">
            <div class="dvol4-section-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"></path><path d="M7 15l4-4 3 3 5-6"></path></svg>
            </div>
            <h3 class="dvol4-section-title">Avancement du dossier</h3>
          </div>
          <div class="dvol4-stepper">${stepperHtml}</div>
          ${banniereHtml}
        </div>

        <!-- Documents -->
        <div class="dvol4-section">
          <div class="dvol4-section-head">
            <div class="dvol4-section-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l3 3v15H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>
            </div>
            <h3 class="dvol4-section-title">Documents</h3>
            ${docsVerrouilles
              ? `<span class="dvol4-section-aside">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 10V7a6 6 0 0112 0v3"></path><rect x="4" y="10" width="16" height="11" rx="2"></rect></svg>
                  Validés et verrouillés
                 </span>`
              : ''}
          </div>
          ${documentsHtml}
        </div>

        <!-- Événements -->
        <div class="dvol4-section">
          <div class="dvol4-section-head">
            <div class="dvol4-section-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"></path></svg>
            </div>
            <h3 class="dvol4-section-title">Événements</h3>
            <span class="dvol4-section-aside--muted">Journal · qui, quoi, quand</span>
          </div>
          <ol class="dvol4-timeline">${timelineEv}</ol>
          ${formulaireEv}
        </div>

      </div><!-- fin .dvol4-body -->

      <!-- Footer -->
      <footer class="dvol4-footer">
        <span class="dvol4-foot-note">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>
          Dossier ${d.ref_sinistre || String(d.id).substring(0,8)}
        </span>
        <div class="dvol4-foot-actions">
          <button class="dvol4-btn dvol4-btn--ghost" onclick="dvolCloseModal()">Fermer</button>
        </div>
      </footer>

    </div>`;

  // ── OVERLAY ──
  const existing = document.getElementById('dvol-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dvol-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = modalHtml;
  overlay.addEventListener('click', dvolCloseModal);
  document.body.appendChild(overlay);
}

// ── Helper : badge statut nouvelle version ──
function dvolBadgeStatutV4(statut) {
  const map = {
    declare:              ['dvol4-pill--info', 'Déclaré'],
    en_attente_documents: ['dvol4-pill--info', 'En attente docs'],
    expertise_necessaire: ['dvol4-pill--info', 'Expertise nécessaire'],
    en_cours_expertise:   ['dvol4-pill--info', 'Expertise en cours'],
    en_attente_cloture:   ['dvol4-pill--info', 'En attente clôture'],
    labtaf:               ['dvol4-pill--info', 'LABTAF'],
    vehicule_retrouve:    ['dvol4-pill--ok',   'Véhicule retrouvé'],
    clos:                 ['dvol4-pill--ok',   'Clôturé'],
    refuse:               ['', 'Refusé'],
  };
  const [cls, label] = map[statut] || ['dvol4-pill--info', statut];
  if (statut === 'refuse') {
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-size:12.5px;font-weight:500;background:#fbe7ea;color:#a1293a;border:1px solid #f5d6db"><span class="dvol4-pill-dot"></span>${label}</span>`;
  }
  return `<span class="dvol4-pill ${cls}"><span class="dvol4-pill-dot"></span>${label}</span>`;
}


// ════════════════════════════════════════════════════════════
// BLOC 3B — REMPLACER dvolEnregistrer() par cette version
// (simplifié : plus de sauvegarde notes, les événements se
//  sauvegardent en temps réel via dvolAjouterEvenement)
// ════════════════════════════════════════════════════════════

async function dvolEnregistrer(dossierId) {
  dvolCloseModal();
}
