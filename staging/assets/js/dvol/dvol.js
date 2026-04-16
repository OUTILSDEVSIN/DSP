// ============================================================
// DVOL v3.2 — Gestion des dossiers vol de véhicule
// ============================================================

let dvolDossiers = [];

const DVOL_DOCS_OBLIGATOIRES = [
  { key: 'questionnaire_vol',  label: 'Questionnaire VOL',                    icon: '📋' },
  { key: 'certificat_cession', label: 'Certificat de cession ou Carte grise', icon: '📄' },
  { key: 'non_gage',           label: 'Non-gage',                             icon: '📄' },
  { key: 'controle_technique', label: 'Contrôle technique',                   icon: '🔧' }
];
const DVOL_DOCS_OPTIONNELS = [
  { key: 'facture_achat',    label: "Facture d'achat",  icon: '🧾' },
  { key: 'facture_entretien', label: 'Facture entretien', icon: '🧾' }
];
const DVOL_DOCS = [...DVOL_DOCS_OBLIGATOIRES, ...DVOL_DOCS_OPTIONNELS];

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

function dvolJours(dateStr) {
  if (!dateStr) return null;
  const debut = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.floor((today - debut) / 86400000);
}

function dvolAddDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Ajoute n jours ouvrés (lun-ven) à partir d'une date ISO
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

// Décale une date au prochain lundi si elle tombe sam/dim
function dvolDecalerOuvre(dateStr) {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2); // sam → lun
  if (dow === 0) d.setDate(d.getDate() + 1); // dim → lun
  return d.toISOString().split('T')[0];
}

function dvolFmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const total = DVOL_DOCS_OBLIGATOIRES.length;
  const pct   = Math.round((recus / total) * 100);
  const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
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

  // Charger les dossiers DVOL
  const { data, error } = await db
    .from('dvol_dossiers')
    .select('*, dvol_etapes(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[DVOL] Erreur chargement dvol_dossiers:', error.message);
    // Fallback sans join si dvol_etapes absent
    const { data: data2, error: error2 } = await db
      .from('dvol_dossiers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error2) { console.error('[DVOL] Erreur fallback:', error2.message); return; }
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
  return DVOL_ETAPES_DEF.map(def => {
    const row = (dossier._etapes || []).find(e => e.slug === def.slug);
    let statut = 'attente';
    let dateRealisee = null;
    let datePrevue = null;

    if (row) {
      statut       = row.statut;       // 'realise' | 'annule' | 'attente'
      dateRealisee = row.date_realisee;
    }

    if (dateDecl && def.delai > 0) {
      datePrevue = dvolDecalerOuvre(dvolAddJoursOuvres(dateDecl, def.delai));
    } else if (dateDecl && def.delai === 0) {
      datePrevue = dateDecl;
    }

    return { ...def, statut, dateRealisee, datePrevue, row };
  });
}

// ────────────────────────────────────────────────────────────
// RENDU — tableau principal
// ────────────────────────────────────────────────────────────

function dvolRendreTableau() {
  // ── Éléments HTML cibles (structure index.html actuelle) ──
  const tbody           = document.getElementById('dvol-tbody');
  const compteur        = document.getElementById('dvol-compteur');
  const encartAlertes   = document.getElementById('dvol-encart-alertes');
  const badgeAlertes    = document.getElementById('dvol-badge-alertes');
  const listeAlertes    = document.getElementById('dvol-liste-alertes');

  if (!tbody) return; // écran DVOL non chargé

  const tous   = dvolDossiers;
  const actifs = tous.filter(d => d.statut !== 'clos' && d.statut !== 'refuse');
  const clos   = tous.filter(d => d.statut === 'clos' || d.statut === 'refuse');

  // ── Compteur ──
  if (compteur) {
    compteur.textContent = `${actifs.length} dossier${actifs.length > 1 ? 's' : ''} actif${actifs.length > 1 ? 's' : ''}`;
  }

  // ── Encart alertes ──
  const alertes = tous.filter(d => {
    if (d.statut === 'clos' || d.statut === 'refuse') return false;
    const etapes = dvolEtapesEnrichies(d);
    const enCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
    if (!enCours || !enCours.datePrevue) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(enCours.datePrevue + 'T12:00:00') <= today;
  });

  if (encartAlertes) {
    if (alertes.length > 0) {
      encartAlertes.style.display = 'block';
      if (badgeAlertes) badgeAlertes.textContent = alertes.length;
      if (listeAlertes) {
        listeAlertes.innerHTML = alertes.map(d => {
          const etapes = dvolEtapesEnrichies(d);
          const enCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
          const jours = dvolJours(d.date_declaration);
          return `<div style="background:white;border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #fecaca;">
            <div>
              <span style="font-weight:700;color:var(--navy);">${d.compagnie || '?'}</span>
              <span style="color:#6b7280;font-size:12px;margin-left:8px">${d.numero_dossier || d.cie_ref || ''}</span><br>
              <span style="font-size:12px;color:#dc2626">Étape en retard : <b>${enCours?.label || '?'}</b></span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${dvolBadgeJours(jours)}
              <button onclick="dvolOuvrirDossier('${d.id}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600">Ouvrir →</button>
            </div>
          </div>`;
        }).join('');
      }
    } else {
      encartAlertes.style.display = 'none';
    }
  }

  // ── Lignes du tableau ──
  function ligneTr(d) {
    const jours = dvolJours(d.date_declaration);
    const etapes = dvolEtapesEnrichies(d);
    const etapeEnCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
    const recusList = dvolGetDocsRecus(d);
    const docsOk    = recusList.filter(k => DVOL_DOCS_OBLIGATOIRES.find(o => o.key === k)).length;
    const docsTotal = DVOL_DOCS_OBLIGATOIRES.length;
    const gest = (typeof allUsers !== 'undefined' ? allUsers : []).find(u => u.id === d.gestionnaire_id);
    const gestNom = gest ? (gest.full_name || gest.email || '—') : '—';
    const rowBg = d.statut === 'clos' || d.statut === 'refuse' ? '#f9fafb' : 'white';
    return `<tr style="cursor:pointer;background:${rowBg};border-bottom:1px solid #f3f4f6;"
              onmouseover="this.style.background='#f0f9ff'"
              onmouseout="this.style.background='${rowBg}'"
              onclick="dvolOuvrirDossier('${d.id}')">
      <td style="padding:10px 14px;font-weight:700;color:var(--navy);white-space:nowrap;">${d.numero_dossier || d.cie_ref || ('ID:' + d.id.substring(0,8))}</td>
      <td style="padding:10px 14px;white-space:nowrap;">${d.assure_nom || d.compagnie || '—'}</td>
      <td style="padding:10px 14px;white-space:nowrap;">${d.compagnie || '—'}</td>
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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;">
      <div style="font-size:24px;margin-bottom:8px;">📂</div>Aucun dossier VOL pour le moment.
    </td></tr>`;
  } else {
    tbody.innerHTML = actifs.map(ligneTr).join('')
      + (clos.length ? clos.map(ligneTr).join('') : '');
  }

  // ── Bouton "Nouveau dossier" dans le header (si absent) ──
  const headerZone = document.querySelector('#dvol-screen .content > div:first-child > div:last-child');
  if (headerZone && !headerZone.querySelector('#dvol-btn-nouveau')) {
    const btn = document.createElement('button');
    btn.id = 'dvol-btn-nouveau';
    btn.className = 'btn btn-primary';
    btn.textContent = '+ Nouveau dossier VOL';
    btn.onclick = dvolOuvrirCreation;
    headerZone.appendChild(btn);
  }
}

// ────────────────────────────────────────────────────────────
// MODALE DOSSIER
// ────────────────────────────────────────────────────────────

function dvolOuvrirDossier(id) {
  const d = dvolDossiers.find(x => String(x.id) === String(id));
  if (!d) return;

  const jours   = dvolJours(d.date_declaration);
  const etapes  = dvolEtapesEnrichies(d);
  const gest    = d.gestionnaire_id ? (allUsers||[]).find(u => u.id === d.gestionnaire_id) : null;
  const gestNom = gest ? (gest.full_name || gest.email || '—') : '—';

  // Timeline étapes
  const etapeEnCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
  const timelineHtml = etapes.map((e, i) => {
    let bg = '#e5e7eb', color = '#6b7280', icon = '';
    if (e.statut === 'realise') { bg = '#dcfce7'; color = '#166534'; icon = '✓ '; }
    else if (e === etapeEnCours) { bg = '#dbeafe'; color = '#1e40af'; icon = '• '; }
    const dateAff = e.statut === 'realise'
      ? dvolFmtDate(e.dateRealisee)
      : dvolFmtDate(e.datePrevue);
    return `<div style="flex:1;text-align:center;padding:8px 4px;background:${bg};border-radius:8px;border:${e===etapeEnCours?'2px solid #3b82f6':'1px solid #e5e7eb'};font-size:0.8em">
      <div style="font-weight:700;color:${color}">${icon}${e.label}</div>
      <div style="color:#6b7280;margin-top:2px">${dateAff}</div>
    </div>${i < etapes.length - 1 ? '<div style="display:flex;align-items:center;padding:0 2px">›</div>' : ''}`;
  }).join('');

  // Bouton action étape en cours
  let actionHtml = '';
  if (etapeEnCours && d.statut !== 'clos' && d.statut !== 'refuse') {
    const slug  = etapeEnCours.slug;
    const label = etapeEnCours.label;
    actionHtml = `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="font-weight:700;color:#1e40af;margin-bottom:10px">● Étape en cours : ${label}</div>
        <button
          data-dossier-id="${d.id}"
          data-slug="${slug}"
          data-label="${label}"
          onclick="dvolDemanderConfirmEtape(this)"
          style="background:#1e40af;color:#fff;border:none;border-radius:8px;padding:8px 20px;cursor:pointer;font-weight:600"
        >● Confirmer ${label}</button>
      </div>`;
  }

  // Documents
  const recusList = dvolGetDocsRecus(d);
  const docsObligHtml = DVOL_DOCS_OBLIGATOIRES.map(doc => {
    const ok = recusList.includes(doc.key);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
      <input type="checkbox" ${ok ? 'checked' : ''}
        onchange="dvolToggleDoc('${d.id}', '${doc.key}', this.checked)"
        style="width:16px;height:16px">
      <span>${doc.icon} ${doc.label}</span>
      ${ok ? '<span style="color:#16a34a;font-size:0.8em">✓ Reçu</span>' : ''}
    </label>`;
  }).join('');

  const docsOptHtml = DVOL_DOCS_OPTIONNELS.map(doc => {
    const ok = recusList.includes(doc.key);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
      <input type="checkbox" ${ok ? 'checked' : ''}
        onchange="dvolToggleDoc('${d.id}', '${doc.key}', this.checked)"
        style="width:16px;height:16px">
      <span>${doc.icon} ${doc.label}</span>
    </label>`;
  }).join('');

  // Statut sélect
  const statutOpts = Object.entries(DVOL_STATUTS).map(([k, v]) =>
    `<option value="${k}" ${d.statut === k ? 'selected' : ''}>${v.label}</option>`
  ).join('');

  const html = `
  <div style="font-family:inherit">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="font-size:1.05em;font-weight:700">ID:${d.id}</span>
      <span style="color:#6b7280">${d.compagnie || '—'}</span>
      ${dvolBadgeJours(jours)}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px">STATUT</div>
        <select id="dvol-statut-${d.id}" style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9em">${statutOpts}</select>
      </div>
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px">GESTIONNAIRE</div>
        <div style="display:flex;align-items:center;gap:6px" id="dvol-gest-display-${d.id}">
          <span style="font-weight:600">${gestNom}</span>
          <button onclick="dvolToggleGestEdit('${d.id}')" style="background:none;border:none;cursor:pointer;color:#3b82f6;font-size:0.85em">✏️</button>
        </div>
        <div id="dvol-gest-edit-${d.id}" style="display:none">
          <select id="dvol-gest-sel-${d.id}" style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9em">
            <option value="">— Non assigné —</option>
            ${(allUsers||[]).map(u => `<option value="${u.id}" ${d.gestionnaire_id === u.id ? 'selected' : ''}>${u.full_name || u.email}</option>`).join('')}
          </select>
          <button onclick="dvolSauvegarderGestionnaire('${d.id}', document.getElementById('dvol-gest-sel-${d.id}').value)" style="margin-top:4px;background:#1e40af;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.82em">Sauvegarder</button>
        </div>
      </div>
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px">DATE DÉCLARATION</div>
        <div style="font-weight:600">${dvolFmtDate(d.date_declaration)}</div>
      </div>
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px">VÉHICULE RETROUVÉ ?</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="dvol-retrouve-${d.id}" ${d.vehicule_retrouve ? 'checked' : ''}
            onchange="dvolOnRetrouve('${d.id}', this)"
            style="width:15px;height:15px">
          <span>${d.vehicule_retrouve ? 'Oui' : 'Non'}</span>
        </label>
      </div>
    </div>

    ${d.procedure_expertise ? `<div style="margin-bottom:12px"><a href="${d.procedure_expertise}" target="_blank" style="background:#7c3aed;color:#fff;padding:7px 16px;border-radius:8px;text-decoration:none;font-size:0.88em;font-weight:600">📋 Procédure expertise</a></div>` : ''}

    <div style="margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:8px;color:#374151">📊 Avancement du dossier</div>
      <div style="display:flex;align-items:stretch;gap:4px">${timelineHtml}</div>
    </div>

    ${actionHtml}

    <div style="margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:8px;color:#374151">📎 Documents</div>
      <details open>
        <summary style="cursor:pointer;font-weight:600;color:#374151;padding:6px 0">📋 Obligatoires (${recusList.filter(k => DVOL_DOCS_OBLIGATOIRES.find(o=>o.key===k)).length}/${DVOL_DOCS_OBLIGATOIRES.length})</summary>
        <div style="padding:4px 0 4px 16px">${docsObligHtml}</div>
      </details>
      <details>
        <summary style="cursor:pointer;font-weight:600;color:#6b7280;padding:6px 0">📋 Optionnels <span style="font-weight:400">(sans alerte si absent)</span></summary>
        <div style="padding:4px 0 4px 16px">${docsOptHtml}</div>
      </details>
    </div>

    <div style="margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:6px;color:#374151">📝 Notes</div>
      <textarea id="dvol-notes-${d.id}" rows="3"
        style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9em;resize:vertical"
        placeholder="Notes internes…">${d.notes || ''}</textarea>
    </div>
  </div>`;

  openModal({
    title: ``,
    content: html,
    size: 'large',
    actions: [
      { label: 'Fermer', style: 'secondary', onClick: closeModal },
      { label: '💾 Enregistrer', style: 'primary', onClick: () => dvolEnregistrer(d.id) }
    ]
  });
}

// ────────────────────────────────────────────────────────────
// ACTIONS ÉTAPES
// ────────────────────────────────────────────────────────────

function dvolDemanderConfirmEtape(btn) {
  const dossierId = btn.dataset.dossierId;
  const slug      = btn.dataset.slug;
  const label     = btn.dataset.label;
  openConfirm({
    message: `Confirmer l'étape : ${label} ?`,
    onConfirm: () => dvolValiderEtape(dossierId, slug)
  });
}

async function dvolValiderEtape(dossierId, slug) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;

  const today = new Date().toISOString().split('T')[0];
  const etapeExistante = (d._etapes || []).find(e => e.slug === slug);

  if (etapeExistante) {
    await db.from('dvol_etapes')
      .update({ statut: 'realise', date_realisee: today })
      .eq('id', etapeExistante.id);
  } else {
    await db.from('dvol_etapes')
      .insert({ dossier_id: dossierId, slug, statut: 'realise', date_realisee: today });
  }

  // Mise à jour statut dossier selon l'étape validée
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

  await db.from('dvol_dossiers')
    .update({ documents_recus_liste: JSON.stringify(liste) })
    .eq('id', dossierId);

  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

function dvolToggleGestEdit(dossierId) {
  const display = document.getElementById(`dvol-gest-display-${dossierId}`);
  const edit    = document.getElementById(`dvol-gest-edit-${dossierId}`);
  if (!display || !edit) return;
  display.style.display = display.style.display === 'none' ? 'flex' : 'none';
  edit.style.display    = edit.style.display    === 'none' ? 'block' : 'none';
}

async function dvolSauvegarderGestionnaire(dossierId, gestId) {
  await db.from('dvol_dossiers')
    .update({ gestionnaire_id: gestId || null })
    .eq('id', dossierId);
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

async function dvolOnRetrouve(dossierId, checkbox) {
  const val = checkbox.checked;
  const updates = { vehicule_retrouve: val };
  if (val) updates.statut = 'vehicule_retrouve';
  const { error } = await db.from('dvol_dossiers').update(updates).eq('id', dossierId);
  if (error) { checkbox.checked = !val; return; }
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

async function dvolEnregistrer(dossierId) {
  const statutEl = document.getElementById(`dvol-statut-${dossierId}`);
  const notesEl  = document.getElementById(`dvol-notes-${dossierId}`);
  const updates  = {};
  if (statutEl) updates.statut = statutEl.value;
  if (notesEl)  updates.notes  = notesEl.value;
  if (!Object.keys(updates).length) { closeModal(); return; }
  const { error } = await db.from('dvol_dossiers').update(updates).eq('id', dossierId);
  if (error) { console.error('dvol save error', error); return; }
  await dvolCharger();
  closeModal();
}

// ────────────────────────────────────────────────────────────
// CRÉATION
// ────────────────────────────────────────────────────────────

function dvolOuvrirCreation() {
  const today = new Date().toISOString().split('T')[0];
  const compagnies = ['ALLIANZ', 'EQUITE', 'CMAM', 'AUTRE'];

  const html = `
  <div style="font-family:inherit">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:0.82em;color:#6b7280">Compagnie *</label>
        <select id="dvol-new-compagnie" style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px">
          <option value="">— Choisir —</option>
          ${compagnies.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:0.82em;color:#6b7280">Référence compagnie</label>
        <input id="dvol-new-cieref" type="text" placeholder="MIA-2026-XXXX" style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px">
      </div>
      <div>
        <label style="font-size:0.82em;color:#6b7280">Date déclaration *</label>
        <input id="dvol-new-date" type="date" value="${today}" style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px">
      </div>
      <div>
        <label style="font-size:0.82em;color:#6b7280">Gestionnaire</label>
        <select id="dvol-new-gest" style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px">
          <option value="">— Non assigné —</option>
          ${(allUsers||[]).map(u => `<option value="${u.id}">${u.full_name || u.email}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top:12px">
      <label style="font-size:0.82em;color:#6b7280">Notes</label>
      <textarea id="dvol-new-notes" rows="2" style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px;resize:vertical" placeholder="Informations complémentaires…"></textarea>
    </div>
  </div>`;

  openModal({
    title: 'Nouveau dossier VOL',
    content: html,
    size: 'medium',
    actions: [
      { label: 'Annuler', style: 'secondary', onClick: closeModal },
      { label: '✅ Créer le dossier', style: 'primary', onClick: dvolCreerDossier }
    ]
  });
}

async function dvolCreerDossier() {
  const compagnie      = document.getElementById('dvol-new-compagnie')?.value;
  const cieRef         = document.getElementById('dvol-new-cieref')?.value?.trim();
  const dateDeclaration = document.getElementById('dvol-new-date')?.value;
  const gestId         = document.getElementById('dvol-new-gest')?.value || null;
  const notes          = document.getElementById('dvol-new-notes')?.value?.trim();

  if (!compagnie || !dateDeclaration) {
    alert('Veuillez remplir la compagnie et la date de déclaration.');
    return;
  }

  const payload = {
    compagnie,
    cie_ref:           cieRef || null,
    date_declaration:  dateDeclaration,
    statut:            'declare',
    gestionnaire_id:   gestId,
    notes:             notes || null,
    vehicule_retrouve: false
  };

  const { data, error } = await db.from('dvol_dossiers').insert(payload).select().single();
  if (error) { console.error('dvol create error', error); return; }

  // Créer l'étape déclaration comme réalisée
  await db.from('dvol_etapes').insert({
    dossier_id:   data.id,
    slug:         'declaration',
    statut:       'realise',
    date_realisee: dateDeclaration
  });

  await dvolCharger();
  closeModal();
  dvolOuvrirDossier(data.id);
}

// ────────────────────────────────────────────────────────────
// CONFIRM DIALOG — modale de confirmation générique
// ────────────────────────────────────────────────────────────

function openConfirm({ message, onConfirm, labelConfirm = 'Confirmer', labelCancel = 'Annuler' }) {
  const html = `
    <div style="font-family:inherit;padding:8px 0">
      <p style="font-size:1em;color:#374151;line-height:1.5">${message}</p>
    </div>`;

  openModal({
    title: 'Confirmation',
    content: html,
    size: 'small',
    actions: [
      { label: labelCancel,  style: 'secondary', onClick: closeModal },
      {
        label: labelConfirm,
        style: 'primary',
        onClick: () => {
          closeModal();
          if (typeof onConfirm === 'function') onConfirm();
        }
      }
    ]
  });
}

// ────────────────────────────────────────────────────────────
// MODAL SYSTEM — openModal / closeModal (auto-contenu DVOL)
// ────────────────────────────────────────────────────────────

function openModal({ title = '', content = '', size = 'medium', actions = [] } = {}) {
  // Supprimer une éventuelle modale existante
  const existing = document.getElementById('dvol-modal-overlay');
  if (existing) existing.remove();

  const widths = { small: '420px', medium: '620px', large: '800px' };
  const maxW = widths[size] || widths.medium;

  const actionsHtml = actions.map((a, i) => {
    const bg = a.style === 'primary' ? '#1e40af' : '#f3f4f6';
    const fg = a.style === 'primary' ? '#ffffff' : '#374151';
    return `<button id="dvol-modal-action-${i}"
      style="padding:9px 22px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;background:${bg};color:${fg};">
      ${a.label}
    </button>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'dvol-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.25);width:100%;max-width:${maxW};max-height:90vh;overflow:hidden;display:flex;flex-direction:column;">
      ${title ? `<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <h3 style="margin:0;font-size:15px;font-weight:800;">${title}</h3>
        <button onclick="closeModal()" style="background:rgba(255,255,255,.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;">×</button>
      </div>` : ''}
      <div style="padding:20px;overflow-y:auto;flex:1;">${content}</div>
      ${actions.length ? `<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">${actionsHtml}</div>` : ''}
    </div>`;

  // Clic en dehors = fermer
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);

  // Attacher les callbacks des boutons
  actions.forEach((a, i) => {
    const btn = document.getElementById(`dvol-modal-action-${i}`);
    if (btn && typeof a.onClick === 'function') btn.onclick = a.onClick;
  });
}

function closeModal() {
  const el = document.getElementById('dvol-modal-overlay');
  if (el) el.remove();
}
