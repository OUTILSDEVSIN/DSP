// ============================================================
// DVOL v4.0 — Gestion des dossiers vol de véhicule
//
// Historique :
// v3.3 — openModal/closeModal renommés dvol*, fix full_name, auditLog
// v3.4 — Déclaration auto-validée, colonne Assuré supprimée, bouton
//         procédure dans header, véhicule retrouvé 2 appels séparés
// v3.5 — Suppression th Assuré via JS, procédure au-dessus frise,
//         dvolOuvrirProcedureParDessus (z-index)
// v3.6 — vehicule_retrouve piloté via statut (colonne inexistante),
//         payload création nettoyé
// v3.7 — Bouton véhicule retrouvé → flow confirmation + clôture dossier
//         + verrouillage étapes, dossiers clôturés visibles jusqu'au reset
// v3.8 — Règle J+10 expertise, J+30 règlement, blocage docs obligatoires,
//         planning glissant (baseDate), statut select → badge, docs
//         verrouillés après validation_docs
// v3.9 — Bouton Refusé, procédure LABTAF complète (confirmation,
//         relance, reprendre gestion), statut badge lecture seule,
//         bannière LABTAF, étapes bloquées en LABTAF
// v4.0 — Nouveau design modal (maquette Bolt), section Événements
//         remplace Notes, table dvol_evenements en base
// ============================================================

let dvolDossiers = [];

const DVOL_DOCS_OBLIGATOIRES = [
  { key: 'questionnaire_vol',  label: 'Questionnaire VOL',                    icon: '📋' },
  { key: 'certificat_cession', label: 'Certificat de cession ou Carte grise', icon: '📄' },
  { key: 'non_gage',           label: 'Non-gage',                             icon: '📄' },
  { key: 'controle_technique', label: 'Contrôle technique',                   icon: '🔧' }
];
const DVOL_DOCS_OPTIONNELS = [
  { key: 'facture_achat',     label: "Facture d'achat",   icon: '🧾' },
  { key: 'facture_entretien', label: 'Facture entretien', icon: '🧾' }
];

const DVOL_ETAPES_DEF = [
  { ordre: 1, slug: 'declaration',         label: 'Déclaration',          delai: 0  },
  { ordre: 2, slug: 'validation_docs',     label: 'Validation documents', delai: 8  },
  { ordre: 3, slug: 'lancement_expertise', label: 'Lancement expertise',  delai: 10 },
  { ordre: 4, slug: 'reception_rapport',   label: 'Réception rapport',    delai: 25 },
  { ordre: 5, slug: 'reglement',           label: 'Règlement',            delai: 30 }
];

const DVOL_STATUTS = {
  declare:              { label: 'Déclaré',              color: '#6b7280', bg: '#f3f4f6' },
  en_attente_documents: { label: 'Attente documents',    color: '#d97706', bg: '#fffbeb' },
  relance:              { label: 'Relancé',              color: '#f59e0b', bg: '#fef3c7' },
  expertise_necessaire: { label: 'Expertise nécessaire', color: '#7c3aed', bg: '#f5f3ff' },
  en_cours_expertise:   { label: 'Expertise en cours',   color: '#2563eb', bg: '#eff6ff' },
  en_attente_cloture:   { label: 'Attente clôture',      color: '#0891b2', bg: '#ecfeff' },
  vehicule_retrouve:    { label: 'Véhicule retrouvé',    color: '#059669', bg: '#ecfdf5' },
  labtaf:               { label: 'LABTAF',               color: '#0891b2', bg: '#ecfeff' },
  refuse:               { label: 'Refusé',               color: '#dc2626', bg: '#fef2f2' },
  clos:                 { label: 'Clôturé',              color: '#374151', bg: '#f9fafb' }
};

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

function dvolNomGestionnaire(userId) {
  if (!userId) return '—';
  const u = (allUsers || []).find(x => x.id === userId);
  return u ? (u.prenom + ' ' + u.nom) : '—';
}

function dvolJours(dateStr) {
  if (!dateStr) return null;
  const debut = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - debut) / 86400000);
}

function dvolAddJoursOuvres(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().split('T')[0];
}

function dvolDecalerOuvre(dateStr) {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2);
  if (dow === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function dvolFmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function dvolBadgeJours(jours) {
  if (jours === null) return '—';
  let color = '#16a34a', bg = '#f0fdf4';
  if (jours >= 10 && jours < 20) { color = '#d97706'; bg = '#fffbeb'; }
  if (jours >= 20 && jours < 30) { color = '#dc2626'; bg = '#fef2f2'; }
  if (jours >= 30)               { color = '#7c2d12'; bg = '#fef2f2'; }
  return `<span style="background:${bg};color:${color};padding:2px 7px;border-radius:12px;font-size:0.78em;font-weight:600">J+${jours}</span>`;
}

function dvolBadgeStatut(statut) {
  const s = DVOL_STATUTS[statut] || { label: statut, color: '#6b7280', bg: '#f3f4f6' };
  return `<span style="background:${s.bg};color:${s.color};padding:2px 9px;border-radius:12px;font-size:0.8em;font-weight:600">${s.label}</span>`;
}

function dvolGetDocsRecus(dossier) {
  try {
    const raw = dossier.documents_recus_liste;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : JSON.parse(raw);
  } catch(e) { return []; }
}

function dvolBarreDocs(dossier) {
  const recusList = dvolGetDocsRecus(dossier);
  const recus = DVOL_DOCS_OBLIGATOIRES.filter(d => recusList.includes(d.key)).length;
  const total  = DVOL_DOCS_OBLIGATOIRES.length;
  const pct    = Math.round((recus / total) * 100);
  const color  = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return `<div style="display:flex;align-items:center;gap:6px">
    <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${color};transition:width .3s"></div>
    </div>
    <span style="font-size:0.75em;color:${color};font-weight:600;white-space:nowrap">${recus}/${total}</span>
  </div>`;
}

// ────────────────────────────────────────────────────────────
// DONNÉES — chargement Supabase
// ────────────────────────────────────────────────────────────

async function dvolCharger() {
  if (typeof db === 'undefined') return;

  const { data, error } = await db
    .from('dvol_dossiers')
    .select('*, dvol_etapes(id, slug, statut, date_realisee)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[DVOL] Erreur chargement (avec join):', error.message);
    const { data: data2, error: error2 } = await db
      .from('dvol_dossiers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error2) {
      console.error('[DVOL] Erreur fallback:', error2.message);
      showNotif('Erreur chargement DVOL : ' + error2.message, 'error');
      return;
    }
    dvolDossiers = (data2 || []).map(d => ({ ...d, _etapes: [] }));
  } else {
    dvolDossiers = (data || []).map(d => ({
      ...d,
      _etapes: d.dvol_etapes || []
    }));
  }

  dvolRendreTableau();
}

// ────────────────────────────────────────────────────────────
// ENRICHISSEMENT — étapes calculées
// ────────────────────────────────────────────────────────────

function dvolEtapesEnrichies(dossier) {
  const dateDecl = dossier.date_declaration;
  if (!dateDecl) return DVOL_ETAPES_DEF.map(def => ({ ...def, statut: 'attente', dateRealisee: null, datePrevue: null, row: null }));

  let baseDate  = dateDecl;
  let baseDelai = 0;

  return DVOL_ETAPES_DEF.map((def, idx) => {
    const row = (dossier._etapes || []).find(e => e.slug === def.slug);
    let statut = 'attente', dateRealisee = null, datePrevue = null;
    if (row) { statut = row.statut; dateRealisee = row.date_realisee; }

    if (def.delai === 0) {
      datePrevue = dateDecl;
    } else {
      const delaiRelatif = def.delai - baseDelai;
      datePrevue = dvolDecalerOuvre(dvolAddJoursOuvres(baseDate, delaiRelatif));
    }

    baseDate  = (statut === 'realise' && dateRealisee) ? dateRealisee : datePrevue;
    baseDelai = def.delai;

    return { ...def, statut, dateRealisee, datePrevue, row };
  });
}

// ────────────────────────────────────────────────────────────
// RENDU — tableau principal
// ────────────────────────────────────────────────────────────

function dvolRendreTableau() {
  const tbody         = document.getElementById('dvol-tbody');
  const compteur      = document.getElementById('dvol-compteur');
  const encartAlertes = document.getElementById('dvol-encart-alertes');
  const badgeAlertes  = document.getElementById('dvol-badge-alertes');
  const listeAlertes  = document.getElementById('dvol-liste-alertes');

  if (!tbody) return;

  const actifs = dvolDossiers.filter(d => d.statut !== 'clos' && d.statut !== 'refuse');
  const clos   = dvolDossiers.filter(d => d.statut === 'clos'  || d.statut === 'refuse');

  if (compteur) {
    compteur.textContent = `${actifs.length} dossier${actifs.length > 1 ? 's' : ''} actif${actifs.length > 1 ? 's' : ''}`;
  }

  const alertes = dvolDossiers.filter(d => {
    if (d.statut === 'clos' || d.statut === 'refuse') return false;
    const etapes  = dvolEtapesEnrichies(d);
    const enCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
    if (!enCours || !enCours.datePrevue) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(enCours.datePrevue + 'T12:00:00') <= today;
  });

  if (encartAlertes) {
    encartAlertes.style.display = alertes.length > 0 ? 'block' : 'none';
    if (badgeAlertes) badgeAlertes.textContent = alertes.length;
    if (listeAlertes && alertes.length > 0) {
      listeAlertes.innerHTML = alertes.map(d => {
        const etapes  = dvolEtapesEnrichies(d);
        const enCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
        const jours   = dvolJours(d.date_declaration);
        return `<div style="background:white;border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #fecaca;">
          <div>
            <span style="font-weight:700;color:var(--navy)">${d.compagnie_mere || d.compagnie || '?'}</span>
            <span style="color:#6b7280;font-size:12px;margin-left:8px">${d.numero_dossier || d.ref_sinistre || ''}</span><br>
            <span style="font-size:12px;color:#dc2626">Étape en retard : <b>${enCours?.label || '?'}</b></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${dvolBadgeJours(jours)}
            <button onclick="dvolOuvrirDossier('${d.id}')"
              style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600">
              Ouvrir →
            </button>
          </div>
        </div>`;
      }).join('');
    }
  }

  function ligneTr(d) {
    const jours   = dvolJours(d.date_declaration);
    const gestNom = dvolNomGestionnaire(d.gestionnaire_id);
    const rowBg   = (d.statut === 'clos' || d.statut === 'refuse') ? '#f9fafb' : 'white';
    return `<tr style="cursor:pointer;background:${rowBg};border-bottom:1px solid #f3f4f6;"
              onmouseover="this.style.background='#f0f9ff'"
              onmouseout="this.style.background='${rowBg}'"
              onclick="dvolOuvrirDossier('${d.id}')">
      <td style="padding:10px 14px;font-weight:700;color:var(--navy);white-space:nowrap;">
        <div>${d.numero_dossier || ('ID:' + String(d.id).substring(0, 8))}</div>
        ${d.ref_sinistre ? `<div style="font-size:0.8em;color:#6b7280;font-weight:400;margin-top:2px">${d.ref_sinistre}</div>` : ''}
      </td>
      <td style="padding:10px 14px;white-space:nowrap;">${d.compagnie_mere || d.compagnie || '—'}</td>
      <td style="padding:10px 14px;white-space:nowrap;">${dvolFmtDate(d.date_declaration)}</td>
      <td style="padding:10px 14px;text-align:center;">${dvolBadgeJours(jours)}</td>
      <td style="padding:10px 14px;">${dvolBadgeStatut(d.statut)}</td>
      <td style="padding:10px 14px;font-size:13px;color:#374151;">${gestNom}</td>
      <td style="padding:10px 14px;">${dvolBarreDocs(d)}</td>
      <td style="padding:10px 14px;text-align:center;">
        <button onclick="event.stopPropagation();dvolOuvrirDossier('${d.id}')"
          style="background:#1e40af;color:#fff;border:none;border-radius:6px;padding:5px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
          Ouvrir →
        </button>
      </td>
    </tr>`;
  }

  if (actifs.length === 0 && clos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;">
      <div style="font-size:24px;margin-bottom:8px;">📂</div>Aucun dossier VOL pour le moment.
    </td></tr>`;
  } else {
    tbody.innerHTML = actifs.map(ligneTr).join('') + clos.map(ligneTr).join('');
  }

  document.querySelectorAll('#dvol-screen th').forEach(th => {
    if (th.textContent.trim().toUpperCase().replace(/[ÉE]/g, 'E').includes('ASSUR')) {
      th.remove();
    }
  });

  const headerZone = document.querySelector('#dvol-screen .content > div:first-child > div:last-child');
  if (headerZone && !headerZone.querySelector('#dvol-btn-nouveau')) {
    const btn = document.createElement('button');
    btn.id        = 'dvol-btn-nouveau';
    btn.className = 'btn btn-primary';
    btn.textContent = '+ Nouveau dossier VOL';
    btn.onclick = dvolOuvrirCreation;
    headerZone.appendChild(btn);
  }
}

// ────────────────────────────────────────────────────────────
// v4.0 — INJECTION CSS MODAL
// ────────────────────────────────────────────────────────────

function dvolInjecterStylesV4() {
  if (document.getElementById('dvol-styles-v4')) return;
  const style = document.createElement('style');
  style.id = 'dvol-styles-v4';
  style.textContent = `
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
      --d4-warn-700:#8a5a1c;
      --d4-shadow-xl:0 30px 60px -20px rgba(15,23,42,.25),0 12px 24px -12px rgba(15,23,42,.18);
      --d4-shadow-xs:0 1px 0 rgba(15,23,42,.04);
      font-family:'Inter',system-ui,-apple-system,sans-serif;
      -webkit-font-smoothing:antialiased;
      background:#fff; border-radius:18px;
      box-shadow:var(--d4-shadow-xl);
      width:100%; max-width:880px; max-height:90vh;
      overflow:hidden; display:flex; flex-direction:column;
      border:1px solid rgba(15,23,42,.06);
    }
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
    .dvol4-header-title { display:flex; align-items:center; gap:12px; font-size:16px; font-weight:600; }
    .dvol4-ref-tag {
      font-family:ui-monospace,monospace; font-size:12px; font-weight:500;
      background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.14);
      padding:4px 8px; border-radius:6px;
    }
    .dvol4-close-btn {
      width:32px; height:32px; border-radius:10px; border:0;
      background:rgba(255,255,255,.1); color:#fff; cursor:pointer;
      display:grid; place-items:center; transition:background .15s; flex-shrink:0;
    }
    .dvol4-close-btn:hover { background:rgba(255,255,255,.2) }
    .dvol4-body { padding:24px 28px 8px; overflow-y:auto; flex:1 }
    .dvol4-meta {
      display:grid; grid-template-columns:1.2fr 1.3fr 1fr .8fr;
      gap:20px; padding-bottom:20px; border-bottom:1px solid var(--d4-ink-200);
    }
    .dvol4-meta-label {
      font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
      color:var(--d4-ink-500); font-weight:600; margin-bottom:8px;
    }
    .dvol4-meta-value { font-size:14px; font-weight:500; color:var(--d4-ink-800); padding-top:2px }
    .dvol4-pill { display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border-radius:999px; font-size:12.5px; font-weight:500; border:1px solid; }
    .dvol4-pill-dot { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.85 }
    .dvol4-pill--info { color:var(--d4-brand-700); background:var(--d4-brand-50); border-color:var(--d4-brand-100) }
    .dvol4-pill--ok   { color:var(--d4-ok-700);    background:var(--d4-ok-50);    border-color:var(--d4-ok-100) }
    .dvol4-pill--red  { color:#a1293a; background:#fbe7ea; border-color:#f5d6db }
    .dvol4-select-wrap { position:relative; width:100%; max-width:220px }
    .dvol4-select-wrap select {
      appearance:none; -webkit-appearance:none; width:100%; padding:8px 34px 8px 12px;
      font:inherit; font-size:13.5px; color:var(--d4-ink-800);
      background:#fff; border:1px solid var(--d4-ink-200); border-radius:8px; cursor:pointer;
    }
    .dvol4-select-wrap::after {
      content:""; position:absolute; right:12px; top:50%; width:8px; height:8px;
      border-right:1.5px solid var(--d4-ink-500); border-bottom:1.5px solid var(--d4-ink-500);
      transform:translateY(-75%) rotate(45deg); pointer-events:none;
    }
    .dvol4-actions {
      display:flex; flex-wrap:wrap; align-items:center; gap:10px;
      padding:20px 0; border-bottom:1px solid var(--d4-ink-200);
    }
    .dvol4-actions-spacer { flex:1 }
    .dvol4-btn {
      display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 14px;
      border-radius:9px; border:1px solid transparent; font:inherit; font-size:13px;
      font-weight:500; cursor:pointer; transition:transform .08s, background .15s;
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
    .dvol4-btn--primary { background:linear-gradient(180deg,#2b3a87 0%,#1f2a6d 100%); color:#fff; border-color:rgba(15,23,42,.15); }
    .dvol4-btn--primary:hover { background:linear-gradient(180deg,#324296 0%,#24317b 100%) }
    .dvol4-btn--ghost { background:#fff; border-color:var(--d4-ink-200); color:var(--d4-ink-800) }
    .dvol4-btn--ghost:hover { background:var(--d4-ink-50) }
    .dvol4-section { padding:22px 0; border-bottom:1px solid var(--d4-ink-200) }
    .dvol4-section:last-child { border-bottom:0 }
    .dvol4-section-head { display:flex; align-items:center; gap:10px; margin-bottom:14px }
    .dvol4-section-icon { width:22px; height:22px; border-radius:7px; display:grid; place-items:center; color:var(--d4-ink-600); background:var(--d4-ink-100); }
    .dvol4-section-title { font-size:13.5px; font-weight:600; color:var(--d4-ink-800) }
    .dvol4-section-aside { font-size:12px; color:var(--d4-ok-700) }
    .dvol4-section-aside--muted { font-size:12px; color:var(--d4-ink-500) }
    .dvol4-stepper { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
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
    .dvol4-step-check { width:14px; height:14px; border-radius:50%; background:var(--d4-ok-600); color:#fff; display:inline-grid; place-items:center; }
    .dvol4-step-check svg { width:9px; height:9px }
    .dvol4-step-pulse { width:8px; height:8px; border-radius:50%; background:var(--d4-brand-600); box-shadow:0 0 0 4px rgba(79,99,210,.18); }
    .dvol4-banner {
      margin-top:14px; padding:14px 16px; border-radius:12px;
      background:linear-gradient(180deg,#f3f5fb 0%,#eef1f9 100%);
      border:1px solid var(--d4-brand-100);
      display:flex; align-items:center; justify-content:space-between; gap:16px;
    }
    .dvol4-banner-left { display:flex; align-items:center; gap:12px }
    .dvol4-banner-icon { width:34px; height:34px; border-radius:10px; background:#fff; color:var(--d4-brand-700); display:grid; place-items:center; border:1px solid var(--d4-brand-100); }
    .dvol4-banner-eyebrow { font-size:11px; color:var(--d4-ink-500); text-transform:uppercase; letter-spacing:.08em; font-weight:600 }
    .dvol4-banner-title   { font-size:14px; font-weight:600; color:var(--d4-ink-900); margin-top:2px }
    .dvol4-doclist { display:flex; flex-direction:column; gap:10px }
    .dvol4-docrow { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border:1px solid var(--d4-ink-200); border-radius:10px; background:#fff; }
    .dvol4-docrow-left { display:flex; align-items:center; gap:12px }
    .dvol4-docrow-icon { width:30px; height:30px; border-radius:8px; display:grid; place-items:center; background:var(--d4-brand-50); color:var(--d4-brand-700); border:1px solid var(--d4-brand-100); }
    .dvol4-docrow-title { font-size:13.5px; font-weight:500; color:var(--d4-ink-800) }
    .dvol4-docrow-sub   { font-size:12px; color:var(--d4-ink-500); margin-left:6px }
    .dvol4-docrow-meta  { display:flex; align-items:center; gap:12px; font-size:12px; color:var(--d4-ink-600) }
    .dvol4-progress { width:140px; height:6px; background:var(--d4-ink-100); border-radius:999px; overflow:hidden }
    .dvol4-progress-bar { height:100%; background:linear-gradient(90deg,var(--d4-ok-600),#2ca976); border-radius:inherit }
    .dvol4-timeline { list-style:none; margin:0; padding:4px 0 0 0; display:flex; flex-direction:column; gap:4px }
    .dvol4-tl { position:relative; display:grid; grid-template-columns:32px 1fr; column-gap:14px; padding:10px 0; }
    .dvol4-tl-avatar { width:32px; height:32px; border-radius:50%; color:#fff; font-size:11px; font-weight:600; display:grid; place-items:center; box-shadow:0 0 0 3px #fff,0 0 0 4px var(--d4-ink-200); position:relative; z-index:1; }
    .dvol4-tl-line { position:absolute; left:15px; top:42px; bottom:-4px; width:2px; background:var(--d4-ink-200); }
    .dvol4-tl:last-child .dvol4-tl-line { display:none }
    .dvol4-tl-body { padding-top:2px }
    .dvol4-tl-head { display:flex; align-items:center; flex-wrap:wrap; gap:6px; font-size:12.5px; color:var(--d4-ink-600) }
    .dvol4-tl-who  { color:var(--d4-ink-900); font-weight:600; font-size:13px }
    .dvol4-tl-role { font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--d4-ink-500); background:var(--d4-ink-100); border:1px solid var(--d4-ink-200); padding:2px 6px; border-radius:5px; }
    .dvol4-tl-when { font-size:12px; color:var(--d4-ink-500); margin-left:auto }
    .dvol4-tl-what { margin-top:4px; font-size:13.5px; color:var(--d4-ink-700) }
    .dvol4-compose { margin-top:12px; display:grid; grid-template-columns:32px 1fr 140px auto; gap:10px; align-items:center; padding:10px; background:var(--d4-ink-50); border:1px solid var(--d4-ink-200); border-radius:12px; }
    .dvol4-compose-avatar { width:32px; height:32px; border-radius:50%; background:var(--d4-brand-500); color:#fff; font-size:11px; font-weight:600; display:grid; place-items:center; }
    .dvol4-compose-input, .dvol4-compose-select { height:36px; border:1px solid var(--d4-ink-200); border-radius:8px; background:#fff; padding:0 12px; font:inherit; font-size:13px; color:var(--d4-ink-800); outline:none; }
    .dvol4-compose-input:focus, .dvol4-compose-select:focus { border-color:var(--d4-brand-500); box-shadow:0 0 0 3px rgba(79,99,210,.15); }
    .dvol4-compose-select { appearance:none; -webkit-appearance:none; padding-right:28px; background-image:linear-gradient(45deg,transparent 50%,var(--d4-ink-500) 50%),linear-gradient(-45deg,transparent 50%,var(--d4-ink-500) 50%); background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%; background-size:5px 5px; background-repeat:no-repeat; }
    .dvol4-footer { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; background:var(--d4-ink-50); border-top:1px solid var(--d4-ink-200); flex-shrink:0; }
    .dvol4-foot-note { font-size:12px; color:var(--d4-ink-500); display:inline-flex; align-items:center; gap:8px }
    .dvol4-foot-actions { display:flex; gap:10px }
    .dvol4-labtaf-banner { background:#ecfeff; border:2px solid #06b6d4; border-radius:10px; padding:14px 16px; margin-bottom:16px; }
  `;
  document.head.appendChild(style);
}

// ────────────────────────────────────────────────────────────
// v4.0 — ÉVÉNEMENTS
// ────────────────────────────────────────────────────────────

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
    showNotif("Saisis un texte avant d'ajouter un événement.", 'error');
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
  if (error) { showNotif('Erreur ajout événement : ' + error.message, 'error'); return; }
  showNotif('✅ Événement ajouté', 'success');
  dvolOuvrirDossier(dossierId);
}

// ────────────────────────────────────────────────────────────
// v4.0 — MODALE DOSSIER (nouveau design)
// ────────────────────────────────────────────────────────────

async function dvolOuvrirDossier(id) {
  dvolInjecterStylesV4();

  const d = dvolDossiers.find(x => String(x.id) === String(id));
  if (!d) return;

  const jours        = dvolJours(d.date_declaration);
  const etapes       = dvolEtapesEnrichies(d);
  const etapeEnCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
  const dossierClos  = d.statut === 'clos' || d.statut === 'refuse';
  const compagnie    = d.compagnie_mere || d.compagnie || '';

  const evenements = await dvolChargerEvenements(d.id);

  // ── Stepper ──
  const SVG_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"></path></svg>`;
  const SVG_CLOCK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`;
  const SVG_CHEV  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"></path></svg>`;

  const stepperHtml = etapes.map((e, i) => {
    let cls = 'dvol4-step--future', iconHtml = SVG_CLOCK;
    if (e.statut === 'annule')  { cls = 'dvol4-step--annule'; }
    else if (e.statut === 'realise') { cls = 'dvol4-step--done'; iconHtml = `<span class="dvol4-step-check">${SVG_CHECK}</span>`; }
    else if (e === etapeEnCours)     { cls = 'dvol4-step--current'; iconHtml = `<span class="dvol4-step-pulse"></span>`; }
    const dateAff = e.statut === 'realise' ? dvolFmtDate(e.dateRealisee) : dvolFmtDate(e.datePrevue);
    const chev = i < etapes.length - 1 ? `<div class="dvol4-step-chev">${SVG_CHEV}</div>` : '';
    return `<div class="dvol4-step ${cls}">
      <div class="dvol4-step__label">${iconHtml} ${e.label}</div>
      <div class="dvol4-step__date">${dateAff || '—'}</div>
      ${chev}
    </div>`;
  }).join('');

  // ── Bannière étape en cours ──
  const banniereHtml = etapeEnCours && !dossierClos && d.statut !== 'labtaf' ? `
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

  // ── Bannière LABTAF ──
  const labtafBanniere = d.statut === 'labtaf' ? `
    <div class="dvol4-labtaf-banner">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-weight:800;color:#0e7490;font-size:1em;margin-bottom:4px">🔒 Dossier en attente LABTAF</div>
          ${d.date_cloture_prevue ? `<div style="font-size:0.85em;color:#0891b2">Échéance relance : <strong>${dvolFmtDate(d.date_cloture_prevue)}</strong></div>` : ''}
        </div>
        <button onclick="dvolReprendreGestionLabtaf('${d.id}')"
          style="background:#0891b2;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:0.9em;white-space:nowrap">
          ↩️ Reprendre la gestion
        </button>
      </div>
    </div>` : '';

  // ── Boutons d'action ──
  const btnActions = dossierClos || d.statut === 'vehicule_retrouve'
    ? `<span style="display:inline-flex;align-items:center;gap:8px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:8px 14px;font-weight:700;color:#166534">🚗 Véhicule retrouvé — Clôturé 🔒</span>`
    : d.statut !== 'labtaf' && d.statut !== 'refuse' ? `
      <button class="dvol4-btn dvol4-btn--ok" onclick="dvolDemanderRetrouve('${d.id}')">
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
      </button>` : '';

  // ── Documents ──
  const recusList    = dvolGetDocsRecus(d);
  const etapeValidDocs = etapes.find(e => e.slug === 'validation_docs');
  const docsVerrouilles = dossierClos || (etapeValidDocs && etapeValidDocs.statut === 'realise');
  const nbOblig  = recusList.filter(k => DVOL_DOCS_OBLIGATOIRES.find(o => o.key === k)).length;
  const pctOblig = Math.round((nbOblig / DVOL_DOCS_OBLIGATOIRES.length) * 100);
  const SVG_DOC  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l3 3v15H6z"></path><path d="M9 12h6M9 16h4"></path></svg>`;

  // ── Statut pill ──
  const statutInfo = DVOL_STATUTS[d.statut] || { label: d.statut, color: '#6b7280', bg: '#f3f4f6' };
  const statutPill = `<span class="dvol4-pill ${d.statut === 'clos' || d.statut === 'vehicule_retrouve' ? 'dvol4-pill--ok' : d.statut === 'refuse' ? 'dvol4-pill--red' : 'dvol4-pill--info'}">
    <span class="dvol4-pill-dot"></span>${statutInfo.label}
  </span>`;

  // ── Gestionnaire select ──
  const gestOpts = `<option value="">— Non assigné —</option>` +
    (allUsers || []).map(u =>
      `<option value="${u.id}" ${d.gestionnaire_id === u.id ? 'selected' : ''}>${u.prenom} ${u.nom}</option>`
    ).join('');

  // ── Timeline événements ──
  const couleurType = { 'Appel':'#4f63d2', 'E-mail':'#128087', 'Validation':'#166534', 'Note':'#64748b' };
  const timelineEv = evenements.length === 0
    ? `<li style="padding:16px 0;text-align:center;color:#94a3b8;font-size:13px">Aucun événement pour le moment</li>`
    : evenements.map(ev => {
        const initiales = (ev.user_nom || 'SY').split(' ').map(n => n[0]||'').join('').substring(0, 2).toUpperCase();
        const couleur   = couleurType[ev.type_action] || '#64748b';
        const dateAff   = new Date(ev.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        return `<li class="dvol4-tl">
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

  const initUser = currentUserData
    ? ((currentUserData.prenom?.[0]||'') + (currentUserData.nom?.[0]||'U')).toUpperCase()
    : 'U';

  const formulaireEv = dossierClos ? '' : `
    <div class="dvol4-compose">
      <div class="dvol4-compose-avatar">${initUser}</div>
      <input id="dvol-ev-texte-${d.id}" class="dvol4-compose-input"
        placeholder="Consigner un événement (ex. Relance client par e-mail)…">
      <select id="dvol-ev-type-${d.id}" class="dvol4-compose-select">
        <option>Note</option><option>Appel</option><option>E-mail</option><option>Validation</option>
      </select>
      <button class="dvol4-btn dvol4-btn--primary" onclick="dvolAjouterEvenement('${d.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16M14 6l6 6-6 6"></path></svg>
        Ajouter
      </button>
    </div>`;

  // ── Assemblage ──
  const existing = document.getElementById('dvol-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dvol-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.addEventListener('click', e => { if (e.target === overlay) dvolCloseModal(); });

  overlay.innerHTML = `
  <div class="dvol4-modal" onclick="event.stopPropagation()">

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

    <div class="dvol4-body">

      ${labtafBanniere}

      <section class="dvol4-meta">
        <div>
          <div class="dvol4-meta-label">Statut</div>
          ${statutPill}
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

      <section class="dvol4-actions">
        ${btnActions}
        <div class="dvol4-actions-spacer"></div>
        <button class="dvol4-btn dvol4-btn--violet" onclick="dvolOuvrirProcedureParDessus('${compagnie}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l3 3v15H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>
          Procédure ${compagnie || 'Expert'}
        </button>
      </section>

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

      <div class="dvol4-section">
        <div class="dvol4-section-head">
          <div class="dvol4-section-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l3 3v15H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>
          </div>
          <h3 class="dvol4-section-title">Documents</h3>
          ${docsVerrouilles ? `<span class="dvol4-section-aside">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 10V7a6 6 0 0112 0v3"></path><rect x="4" y="10" width="16" height="11" rx="2"></rect></svg>
            Validés et verrouillés</span>` : ''}
        </div>
        <div class="dvol4-doclist">
          <div class="dvol4-docrow">
            <div class="dvol4-docrow-left">
              <div class="dvol4-docrow-icon">${SVG_DOC}</div>
              <div>
                <span class="dvol4-docrow-title">Obligatoires</span>
                <span class="dvol4-docrow-sub">${DVOL_DOCS_OBLIGATOIRES.length} documents requis</span>
              </div>
            </div>
            <div class="dvol4-docrow-meta">
              <span>${nbOblig} / ${DVOL_DOCS_OBLIGATOIRES.length}</span>
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
        </div>
      </div>

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

    </div>

    <footer class="dvol4-footer">
      <span class="dvol4-foot-note">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>
        ${d.ref_sinistre || String(d.id).substring(0,8)}
      </span>
      <div class="dvol4-foot-actions">
        <button class="dvol4-btn dvol4-btn--ghost" onclick="dvolCloseModal()">Fermer</button>
      </div>
    </footer>

  </div>`;

  document.body.appendChild(overlay);
}

// ────────────────────────────────────────────────────────────
// ACTIONS ÉTAPES
// ────────────────────────────────────────────────────────────

function dvolDemanderConfirmEtape(btn) {
  const dossierId = btn.dataset.dossierId;
  const slug      = btn.dataset.slug;
  const label     = btn.dataset.label;
  dvolOpenConfirm({
    message: `Confirmer l'étape : <strong>${label}</strong> ?`,
    onConfirm: () => dvolValiderEtape(dossierId, slug)
  });
}

async function dvolValiderEtape(dossierId, slug) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const today = new Date().toISOString().split('T')[0];

  if (slug === 'lancement_expertise') {
    const jours = dvolJours(d.date_declaration);
    if (jours !== null && jours < 10) {
      const reste = 10 - jours;
      dvolOpenModal({
        title: '⛔ Expertise prématurée',
        content: `<div style="padding:8px 0">
          <p style="color:#374151;margin-bottom:12px">Le lancement de l'expertise ne peut être confirmé qu'à partir de <strong>J+10</strong>.</p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.4em;font-weight:800;color:#92400e">J+${jours} / J+10</div>
            <div style="color:#92400e;font-size:0.9em;margin-top:4px">Encore <strong>${reste} jour${reste > 1 ? 's' : ''}</strong> à patienter</div>
          </div>
        </div>`,
        size: 'small',
        actions: [{ label: 'Compris', style: 'primary', onClick: dvolCloseModal }]
      });
      return;
    }
  }

  if (slug === 'validation_docs') {
    const recusList = dvolGetDocsRecus(d);
    const manquants = DVOL_DOCS_OBLIGATOIRES.filter(doc => !recusList.includes(doc.key));
    if (manquants.length > 0) {
      dvolOpenModal({
        title: '⛔ Documents manquants',
        content: `<div style="padding:8px 0">
          <p style="color:#374151;margin-bottom:12px">Impossible de passer à l'expertise : <strong>${manquants.length} document(s) obligatoire(s)</strong> non reçu(s) :</p>
          <ul style="margin:0;padding-left:20px;color:#dc2626;line-height:2">${manquants.map(m => `<li>${m.icon} ${m.label}</li>`).join('')}</ul>
        </div>`,
        size: 'small',
        actions: [{ label: 'Compris', style: 'primary', onClick: dvolCloseModal }]
      });
      return;
    }
  }

  if (slug === 'reglement') {
    const jours = dvolJours(d.date_declaration);
    if (jours !== null && jours < 30) {
      const reste = 30 - jours;
      dvolOpenModal({
        title: '⛔ Règlement prématuré',
        content: `<div style="padding:8px 0">
          <p style="color:#374151;margin-bottom:12px">Le règlement ne peut être confirmé qu'à partir de <strong>J+30</strong>.</p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.4em;font-weight:800;color:#92400e">J+${jours} / J+30</div>
            <div style="color:#92400e;font-size:0.9em;margin-top:4px">Encore <strong>${reste} jour${reste > 1 ? 's' : ''}</strong> à patienter</div>
          </div>
        </div>`,
        size: 'small',
        actions: [{ label: 'Compris', style: 'primary', onClick: dvolCloseModal }]
      });
      return;
    }
  }

  const etapeExistante = (d._etapes || []).find(e => e.slug === slug);
  if (etapeExistante) {
    await db.from('dvol_etapes').update({ statut: 'realise', date_realisee: today }).eq('id', etapeExistante.id);
  } else {
    await db.from('dvol_etapes').insert({ dossier_id: dossierId, slug, statut: 'realise', date_realisee: today });
  }

  const nouveauStatut = {
    declaration:         'en_attente_documents',
    validation_docs:     'expertise_necessaire',
    lancement_expertise: 'en_cours_expertise',
    reception_rapport:   'en_attente_cloture',
    reglement:           'clos'
  }[slug];
  if (nouveauStatut) {
    await db.from('dvol_dossiers').update({ statut: nouveauStatut }).eq('id', dossierId);
  }

  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

async function dvolToggleDoc(dossierId, docKey, nouvelleValeur) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  let liste = dvolGetDocsRecus(d);
  if (nouvelleValeur) {
    if (!liste.includes(docKey)) liste.push(docKey);
  } else {
    liste = liste.filter(k => k !== docKey);
  }
  await db.from('dvol_dossiers').update({ documents_recus_liste: JSON.stringify(liste) }).eq('id', dossierId);
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

async function dvolSauvegarderGestionnaire(dossierId, gestId) {
  await db.from('dvol_dossiers').update({ gestionnaire_id: gestId || null }).eq('id', dossierId);
  showNotif('Gestionnaire mis à jour', 'success');
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

function dvolDemanderRetrouve(dossierId) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const compagnie = d.compagnie_mere || d.compagnie || '';
  dvolOpenModal({
    title: '🚗 Véhicule retrouvé — Confirmation',
    content: `<div style="padding:8px 0">
      <p style="font-size:1em;color:#374151;line-height:1.6;margin-bottom:16px">
        Confirmer la découverte du véhicule pour le dossier <strong>${d.ref_sinistre || d.numero_dossier || dossierId}</strong> (${compagnie}) ?
      </p>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 14px;font-size:0.9em;color:#92400e;line-height:1.5">
        ⚠️ Cette action est <strong>irréversible</strong> :<br>
        • Le dossier sera <strong>clôturé</strong><br>
        • Toutes les étapes non effectuées seront <strong>verrouillées</strong>
      </div>
    </div>`,
    size: 'small',
    actions: [
      { label: 'Annuler', style: 'secondary', onClick: dvolCloseModal },
      { label: '✅ Confirmer la clôture', style: 'primary', onClick: () => dvolCloturerRetrouve(dossierId) }
    ]
  });
}

async function dvolCloturerRetrouve(dossierId) {
  dvolCloseModal();
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const { error: eDossier } = await db.from('dvol_dossiers').update({ statut: 'clos' }).eq('id', dossierId);
  if (eDossier) { showNotif('Erreur clôture dossier : ' + eDossier.message, 'error'); return; }
  const etapesExistantes = d._etapes || [];
  for (const def of DVOL_ETAPES_DEF) {
    const etapeExistante = etapesExistantes.find(e => e.slug === def.slug);
    if (etapeExistante) {
      if (etapeExistante.statut !== 'realise') await db.from('dvol_etapes').update({ statut: 'annule' }).eq('id', etapeExistante.id);
    } else {
      await db.from('dvol_etapes').insert({ dossier_id: dossierId, slug: def.slug, statut: 'annule', date_realisee: null });
    }
  }
  showNotif('🚗 Véhicule retrouvé — Dossier clôturé', 'success');
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

function dvolDemanderRefus(dossierId) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  dvolOpenModal({
    title: '❌ Refus du dossier — Confirmation',
    content: `<div style="padding:8px 0">
      <p style="color:#374151;line-height:1.6;margin-bottom:16px">Confirmer le refus du dossier <strong>${d.ref_sinistre || d.numero_dossier || ''}</strong> ?</p>
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 14px;font-size:0.9em;color:#991b1b;line-height:1.5">
        ⚠️ Action <strong>irréversible</strong> :<br>
        • Le dossier sera clôturé avec statut <strong>Refusé</strong><br>
        • Toutes les étapes non effectuées seront verrouillées
      </div>
    </div>`,
    size: 'small',
    actions: [
      { label: 'Annuler', style: 'secondary', onClick: dvolCloseModal },
      { label: '❌ Confirmer le refus', style: 'primary', onClick: () => dvolCloturerRefus(dossierId) }
    ]
  });
}

async function dvolCloturerRefus(dossierId) {
  dvolCloseModal();
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const { error } = await db.from('dvol_dossiers').update({ statut: 'refuse' }).eq('id', dossierId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  for (const def of DVOL_ETAPES_DEF) {
    const etapeExistante = (d._etapes || []).find(e => e.slug === def.slug);
    if (etapeExistante) {
      if (etapeExistante.statut !== 'realise') await db.from('dvol_etapes').update({ statut: 'annule' }).eq('id', etapeExistante.id);
    } else {
      await db.from('dvol_etapes').insert({ dossier_id: dossierId, slug: def.slug, statut: 'annule' });
    }
  }
  showNotif('❌ Dossier refusé et clôturé', 'success');
  await dvolCharger();
  dvolCloseModal();
}

// ────────────────────────────────────────────────────────────
// PROCÉDURE LABTAF
// ────────────────────────────────────────────────────────────

function dvolDemanderLabtaf(dossierId) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const dateDefaut = dvolAddJoursOuvres(new Date().toISOString().split('T')[0], 30);
  dvolOpenModal({
    title: '🔄 Procédure LABTAF',
    content: `<div style="padding:8px 0">
      <p style="color:#374151;line-height:1.6;margin-bottom:16px">
        Passage en <strong>procédure LABTAF</strong> pour le dossier <strong>${d.ref_sinistre || d.numero_dossier || ''}</strong>.
      </p>
      <div style="margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px">
          <input type="checkbox" id="labtaf-conserve-gestion" checked style="width:16px;height:16px">
          <span style="font-weight:600;color:#0369a1">Le gestionnaire conserve la gestion du dossier</span>
        </label>
      </div>
      <div>
        <label style="font-size:0.85em;color:#6b7280;display:block;margin-bottom:6px">
          📅 Date d'échéance pour relance <span style="color:#6b7280;font-weight:400">(défaut : J+30 ouvrés)</span>
        </label>
        <input type="date" id="labtaf-date-echeance" value="${dateDefaut}"
          style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:0.95em;box-sizing:border-box">
      </div>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;margin-top:14px;font-size:0.85em;color:#92400e">
        ⚠️ Les étapes du dossier seront <strong>bloquées</strong> jusqu'à la reprise de gestion.
      </div>
    </div>`,
    size: 'medium',
    actions: [
      { label: 'Annuler', style: 'secondary', onClick: dvolCloseModal },
      { label: '🔄 Confirmer LABTAF', style: 'primary', onClick: () => dvolConfirmerLabtaf(dossierId) }
    ]
  });
}

async function dvolConfirmerLabtaf(dossierId) {
  const dateEcheance    = document.getElementById('labtaf-date-echeance')?.value;
  const conserveGestion = document.getElementById('labtaf-conserve-gestion')?.checked;
  dvolCloseModal();
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const updates = { statut: 'labtaf', date_cloture_prevue: dateEcheance || null };
  const { error } = await db.from('dvol_dossiers').update(updates).eq('id', dossierId);
  if (error) { showNotif('Erreur LABTAF : ' + error.message, 'error'); return; }
  if (d.gestionnaire_id && dateEcheance) {
    await db.from('dvol_notifications').insert({
      dossier_id:             dossierId,
      gestionnaire_id:        d.gestionnaire_id,
      message:                `📋 Relance LABTAF — Dossier ${d.ref_sinistre || d.numero_dossier || ''} : avez-vous un retour de la compagnie ?`,
      type_alerte:            'labtaf',
      date_prochaine_relance: dateEcheance
    });
  }
  showNotif('🔄 Dossier passé en procédure LABTAF', 'success');
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

function dvolReprendreGestionLabtaf(dossierId) {
  dvolOpenModal({
    title: '↩️ Reprendre la gestion — LABTAF',
    content: `<div style="padding:8px 0">
      <p style="color:#374151;margin-bottom:16px;line-height:1.6">Quel est le résultat du retour de la compagnie ?</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onclick="dvolLabtafValide('${dossierId}')"
          style="background:#16a34a;color:#fff;border:none;border-radius:10px;padding:14px 20px;cursor:pointer;font-weight:700;font-size:1em;text-align:left">
          ✅ Validé par la compagnie — Reprendre la gestion classique
        </button>
        <button onclick="dvolLabtafRefuse('${dossierId}')"
          style="background:#dc2626;color:#fff;border:none;border-radius:10px;padding:14px 20px;cursor:pointer;font-weight:700;font-size:1em;text-align:left">
          ❌ Refusé par la compagnie — Clôturer le dossier
        </button>
      </div>
    </div>`,
    size: 'small',
    actions: [{ label: 'Annuler', style: 'secondary', onClick: dvolCloseModal }]
  });
}

async function dvolLabtafValide(dossierId) {
  dvolCloseModal();
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const etapes = dvolEtapesEnrichies(d);
  const mapStatut = { declaration:'en_attente_documents', validation_docs:'expertise_necessaire', lancement_expertise:'en_cours_expertise', reception_rapport:'en_attente_cloture' };
  const derniereRealisee = [...etapes].reverse().find(e => e.statut === 'realise');
  const statutReprise = (derniereRealisee && mapStatut[derniereRealisee.slug]) || 'en_attente_documents';
  await db.from('dvol_dossiers').update({ statut: statutReprise, date_cloture_prevue: null }).eq('id', dossierId);
  showNotif('✅ Gestion reprise — Retour au flux normal', 'success');
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

async function dvolLabtafRefuse(dossierId) {
  dvolCloseModal();
  await dvolCloturerRefus(dossierId);
}

async function dvolEnregistrer(dossierId) {
  dvolCloseModal();
}

// ────────────────────────────────────────────────────────────
// CRÉATION
// ────────────────────────────────────────────────────────────

function dvolOuvrirCreation() {
  const today = new Date().toISOString().split('T')[0];
  const gestOpts = `<option value="">— Non assigné —</option>` +
    (allUsers || []).map(u => `<option value="${u.id}">${u.prenom} ${u.nom}</option>`).join('');

  const html = `
  <div style="font-family:inherit">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:0.82em;color:#6b7280;display:block;margin-bottom:4px">Compagnie mère *</label>
        <select id="dvol-new-compagnie" style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;box-sizing:border-box">
          <option value="">— Choisir —</option>
          <option value="CMAM">CMAM</option>
          <option value="ALLIANZ">Allianz</option>
          <option value="EQUITE">Équité</option>
        </select>
      </div>
      <div>
        <label style="font-size:0.82em;color:#6b7280;display:block;margin-bottom:4px">Référence sinistre</label>
        <input id="dvol-new-refsinistre" type="text" placeholder="MIA-2026-XXXX"
          style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:0.82em;color:#6b7280;display:block;margin-bottom:4px">Date déclaration *</label>
        <input id="dvol-new-date" type="date" value="${today}"
          style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:0.82em;color:#6b7280;display:block;margin-bottom:4px">Gestionnaire</label>
        <select id="dvol-new-gest" style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;box-sizing:border-box">
          ${gestOpts}
        </select>
      </div>
    </div>
    <div style="margin-top:12px">
      <label style="font-size:0.82em;color:#6b7280;display:block;margin-bottom:4px">Notes</label>
      <textarea id="dvol-new-notes" rows="2"
        style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;resize:vertical;box-sizing:border-box"
        placeholder="Informations complémentaires…"></textarea>
    </div>
  </div>`;

  dvolOpenModal({
    title: 'Nouveau dossier VOL',
    content: html,
    size: 'medium',
    actions: [
      { label: 'Annuler',             style: 'secondary', onClick: dvolCloseModal },
      { label: '✅ Créer le dossier', style: 'primary',   onClick: dvolCreerDossier }
    ]
  });
}

async function dvolCreerDossier() {
  const compagnie       = document.getElementById('dvol-new-compagnie')?.value;
  const refSinistre     = document.getElementById('dvol-new-refsinistre')?.value?.trim();
  const dateDeclaration = document.getElementById('dvol-new-date')?.value;
  const gestId          = document.getElementById('dvol-new-gest')?.value || null;
  const notes           = document.getElementById('dvol-new-notes')?.value?.trim();

  if (!compagnie || !dateDeclaration) {
    showNotif('Veuillez remplir la compagnie et la date de déclaration.', 'error');
    return;
  }

  const payload = {
    compagnie_mere:   compagnie,
    compagnie:        compagnie,
    ref_sinistre:     refSinistre || null,
    date_declaration: dateDeclaration,
    statut:           'declare',
    gestionnaire_id:  gestId,
    notes:            notes || null,
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString()
  };

  const { data, error } = await db.from('dvol_dossiers').insert(payload).select().single();
  if (error) {
    console.error('[DVOL] create error', error);
    showNotif('Erreur création : ' + error.message, 'error');
    return;
  }

  await db.from('dvol_etapes').insert({
    dossier_id:    data.id,
    slug:          'declaration',
    statut:        'realise',
    date_realisee: dateDeclaration
  });

  await db.from('dvol_dossiers').update({ statut: 'en_attente_documents' }).eq('id', data.id);

  if (typeof auditLog === 'function') {
    await auditLog('CREATION_DVOL', 'Dossier VOL créé : ' + (refSinistre || data.id));
  }

  showNotif('✅ Dossier VOL créé', 'success');
  await dvolCharger();
  dvolCloseModal();
  dvolOuvrirDossier(data.id);
}

// ────────────────────────────────────────────────────────────
// SYSTÈME MODAL DVOL (pour les modales secondaires)
// ────────────────────────────────────────────────────────────

function dvolOpenModal({ title = '', content = '', size = 'medium', actions = [], headerContent = '' } = {}) {
  const existing = document.getElementById('dvol-modal-overlay');
  if (existing) existing.remove();

  const widths = { small: '420px', medium: '620px', large: '820px' };
  const maxW = widths[size] || widths.medium;

  const actionsHtml = actions.map((a, i) => {
    const bg = a.style === 'primary' ? '#1e40af' : '#f3f4f6';
    const fg = a.style === 'primary' ? '#ffffff' : '#374151';
    return `<button id="dvol-modal-action-${i}"
      style="padding:9px 22px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;background:${bg};color:${fg}">
      ${a.label}
    </button>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'dvol-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';

  overlay.innerHTML = `
    <div style="background:white;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.25);width:100%;max-width:${maxW};max-height:90vh;overflow:hidden;display:flex;flex-direction:column;">
      ${title ? `
      <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <h3 style="margin:0;font-size:15px;font-weight:800;">${title}</h3>
        <div style="display:flex;align-items:center;gap:10px;">
          ${headerContent}
          <button onclick="dvolCloseModal()"
            style="background:rgba(255,255,255,.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
      </div>` : ''}
      <div style="padding:20px;overflow-y:auto;flex:1;">${content}</div>
      ${actions.length ? `
      <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
        ${actionsHtml}
      </div>` : ''}
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) dvolCloseModal(); });
  document.body.appendChild(overlay);
  actions.forEach((a, i) => {
    const btn = document.getElementById('dvol-modal-action-' + i);
    if (btn && typeof a.onClick === 'function') btn.onclick = a.onClick;
  });
}

function dvolCloseModal() {
  const el = document.getElementById('dvol-modal-overlay');
  if (el) el.remove();
}

function dvolOpenConfirm({ message, onConfirm, labelConfirm = 'Confirmer', labelCancel = 'Annuler' }) {
  dvolOpenModal({
    title: 'Confirmation',
    content: `<div style="padding:8px 0"><p style="font-size:1em;color:#374151;line-height:1.5">${message}</p></div>`,
    size: 'small',
    actions: [
      { label: labelCancel,  style: 'secondary', onClick: dvolCloseModal },
      { label: labelConfirm, style: 'primary',   onClick: () => { dvolCloseModal(); if (typeof onConfirm === 'function') onConfirm(); } }
    ]
  });
}

// ────────────────────────────────────────────────────────────
// PROCÉDURE EXPERTISE — ouverture par-dessus le modal dossier
// ────────────────────────────────────────────────────────────

function dvolOuvrirProcedureParDessus(compagnie) {
  const avantOuverture = new Set(
    Array.from(document.querySelectorAll('body > div[style*="z-index"], body > div[style*="position:fixed"], body > div[class*="modal"], body > div[class*="overlay"]'))
      .map(el => el)
  );

  if (typeof dvolOuvrirProcedure === 'function') {
    dvolOuvrirProcedure(compagnie);
  } else {
    console.warn('[DVOL] dvolOuvrirProcedure non définie');
    return;
  }

  setTimeout(() => {
    const Z_DESSUS = 9500;
    document.querySelectorAll('body > div').forEach(el => {
      if (el.id === 'dvol-modal-overlay') return;
      if (avantOuverture.has(el)) return;
      el.style.zIndex = Z_DESSUS;
      el.querySelectorAll('[style*="z-index"]').forEach(child => {
        const z = parseInt(child.style.zIndex || '0', 10);
        if (z > 0) child.style.zIndex = Z_DESSUS + 1;
      });
    });
    document.querySelectorAll('[class*="modal"],[class*="overlay"],[class*="backdrop"]').forEach(el => {
      if (el.id === 'dvol-modal-overlay') return;
      if (avantOuverture.has(el)) return;
      el.style.zIndex = Z_DESSUS;
    });
  }, 80);
}
