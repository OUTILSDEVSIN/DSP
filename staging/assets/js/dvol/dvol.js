// ============================================================
// DVOL v3.3 — Gestion des dossiers vol de véhicule
// Fix v3.3 :
//   - openModal/closeModal/openConfirm → dvolOpenModal/dvolCloseModal/dvolOpenConfirm
//     (évite le conflit avec auth.js closeModal(id))
//   - full_name → prenom + ' ' + nom (cohérent avec table utilisateurs)
//   - Simplification gestionnaire : select direct au lieu de toggle display
//   - Bouton procédure expertise branché sur dvolOuvrirProcedure()
//   - auditLog() appelé sur création
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
    // Fallback sans join si la relation n'existe pas encore
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

  // Règle 3 — Allongement automatique :
  // La date prévue de chaque étape est calculée depuis la date de réalisation
  // RÉELLE de l'étape précédente (et non depuis date_declaration fixe).
  // Si l'étape précédente est en retard, toutes les suivantes se décalent.
  let baseDate  = dateDecl;   // point de départ glissant
  let baseDelai = 0;          // délai accumulé de l'étape précédente

  return DVOL_ETAPES_DEF.map((def, idx) => {
    const row = (dossier._etapes || []).find(e => e.slug === def.slug);
    let statut = 'attente', dateRealisee = null, datePrevue = null;
    if (row) { statut = row.statut; dateRealisee = row.date_realisee; }

    // Calcul de la date prévue
    if (def.delai === 0) {
      datePrevue = dateDecl;
    } else {
      const delaiRelatif = def.delai - baseDelai; // jours ouvrés depuis l'étape précédente
      datePrevue = dvolDecalerOuvre(dvolAddJoursOuvres(baseDate, delaiRelatif));
    }

    // Mise à jour de la base pour l'étape suivante :
    // - Si réalisée → on part de la date réelle (même si en retard)
    // - Sinon       → on part de la date prévue calculée
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

  // Alertes — étapes en retard
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

  // Lignes du tableau
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
    // Les dossiers clôturés restent visibles (grisés) jusqu'au reset SQL du soir (22h59)
    tbody.innerHTML = actifs.map(ligneTr).join('') + clos.map(ligneTr).join('');
  }

  // Fix : supprimer le <th>Assuré</th> résiduel dans le HTML statique (index.html)
  document.querySelectorAll('#dvol-screen th').forEach(th => {
    if (th.textContent.trim().toUpperCase().replace(/[ÉE]/g, 'E').includes('ASSUR')) {
      th.remove();
    }
  });

  // Bouton "Nouveau dossier" dans le header (ajout dynamique si absent)
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
// MODALE DOSSIER
// ────────────────────────────────────────────────────────────

function dvolOuvrirDossier(id) {
  const d = dvolDossiers.find(x => String(x.id) === String(id));
  if (!d) return;

  const jours        = dvolJours(d.date_declaration);
  const etapes       = dvolEtapesEnrichies(d);
  const etapeEnCours = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');

  // Timeline
  const dossierClos = d.statut === 'clos' || d.statut === 'refuse';
  const timelineHtml = etapes.map((e, i) => {
    let bg = '#e5e7eb', color = '#6b7280', icon = '', border = '1px solid #e5e7eb';
    if (e.statut === 'realise')      { bg = '#dcfce7'; color = '#166534'; icon = '✓ '; }
    else if (e.statut === 'annule')  { bg = '#f3f4f6'; color = '#9ca3af'; icon = '✗ '; border = '1px dashed #d1d5db'; }
    else if (e === etapeEnCours)     { bg = '#dbeafe'; color = '#1e40af'; icon = '● '; border = '2px solid #3b82f6'; }
    const dateAff = e.statut === 'realise' ? dvolFmtDate(e.dateRealisee) : dvolFmtDate(e.datePrevue);
    return `<div style="flex:1;text-align:center;padding:8px 4px;background:${bg};border-radius:8px;border:${border};font-size:0.8em${e.statut === 'annule' ? ';opacity:0.6' : ''}">
      <div style="font-weight:700;color:${color}">${icon}${e.label}</div>
      <div style="color:#6b7280;margin-top:2px">${dateAff}</div>
    </div>${i < etapes.length - 1 ? '<div style="display:flex;align-items:center;padding:0 2px;color:#9ca3af">›</div>' : ''}`;
  }).join('');

  // Action étape en cours (masquée si dossier clôturé ou en LABTAF)
  let actionHtml = '';
  if (etapeEnCours && !dossierClos && d.statut !== 'vehicule_retrouve' && d.statut !== 'labtaf') {
    actionHtml = `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="font-weight:700;color:#1e40af;margin-bottom:10px">● Étape en cours : ${etapeEnCours.label}</div>
      <button data-dossier-id="${d.id}" data-slug="${etapeEnCours.slug}" data-label="${etapeEnCours.label}"
        onclick="dvolDemanderConfirmEtape(this)"
        style="background:#1e40af;color:#fff;border:none;border-radius:8px;padding:8px 20px;cursor:pointer;font-weight:600">
        ✓ Confirmer « ${etapeEnCours.label} »
      </button>
    </div>`;
  }

  // Documents
  const recusList    = dvolGetDocsRecus(d);
  // Docs verrouillés une fois validation_docs confirmée
  const etapeValidDocs = etapes.find(e => e.slug === 'validation_docs');
  const docsVerrouilles = dossierClos || (etapeValidDocs && etapeValidDocs.statut === 'realise');

  const docsObligHtml = DVOL_DOCS_OBLIGATOIRES.map(doc => {
    const ok = recusList.includes(doc.key);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:${docsVerrouilles ? 'default' : 'pointer'}">
      <input type="checkbox" ${ok ? 'checked' : ''} ${docsVerrouilles ? 'disabled' : ''}
        onchange="dvolToggleDoc('${d.id}', '${doc.key}', this.checked)"
        style="width:16px;height:16px">
      <span style="${docsVerrouilles ? 'color:#9ca3af' : ''}">${doc.icon} ${doc.label}</span>
      ${ok ? '<span style="color:#16a34a;font-size:0.8em;margin-left:auto">✓ Reçu</span>' : ''}
    </label>`;
  }).join('');

  const docsOptHtml = DVOL_DOCS_OPTIONNELS.map(doc => {
    const ok = recusList.includes(doc.key);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:${docsVerrouilles ? 'default' : 'pointer'}">
      <input type="checkbox" ${ok ? 'checked' : ''} ${docsVerrouilles ? 'disabled' : ''}
        onchange="dvolToggleDoc('${d.id}', '${doc.key}', this.checked)"
        style="width:16px;height:16px">
      <span style="${docsVerrouilles ? 'color:#9ca3af' : ''}">${doc.icon} ${doc.label}</span>
    </label>`;
  }).join('');

  // Gestionnaire
  const gestOpts = `<option value="">— Non assigné —</option>` +
    (allUsers || []).map(u =>
      `<option value="${u.id}" ${d.gestionnaire_id === u.id ? 'selected' : ''}>${u.prenom} ${u.nom}</option>`
    ).join('');

  const html = `
  <div style="font-family:inherit">

    <!-- Infos principales — Statut remplacé par badge (non modifiable manuellement) -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Statut</div>
        <div style="padding-top:5px">${dvolBadgeStatut(d.statut)}</div>
      </div>
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Gestionnaire</div>
        <select id="dvol-gest-sel-${d.id}"
          style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9em"
          onchange="dvolSauvegarderGestionnaire('${d.id}', this.value)">
          ${gestOpts}
        </select>
      </div>
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Date déclaration</div>
        <div style="font-weight:600;padding-top:4px">${dvolFmtDate(d.date_declaration)}</div>
      </div>
      <div>
        <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Ancienneté</div>
        <div style="padding-top:4px">${dvolBadgeJours(jours)}</div>
      </div>
    </div>

    <!-- Bannière LABTAF active -->
    ${d.statut === 'labtaf' ? `
    <div style="background:#ecfeff;border:2px solid #06b6d4;border-radius:10px;padding:14px 16px;margin-bottom:16px">
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
    </div>` : ''}

    <!-- Actions dossier : Véhicule retrouvé / Refusé / LABTAF -->
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${dossierClos || d.statut === 'vehicule_retrouve'
        ? `<div style="display:inline-flex;align-items:center;gap:8px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:8px 14px;">
             <span style="font-weight:700;color:#166534">🚗 Véhicule retrouvé — Clôturé 🔒</span>
           </div>`
        : d.statut !== 'labtaf' && d.statut !== 'refuse' ? `
           <button onclick="dvolDemanderRetrouve('${d.id}')"
             style="background:#15803d;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:0.88em;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,.2)">
             🚗 Véhicule retrouvé
           </button>
           <button onclick="dvolDemanderRefus('${d.id}')"
             style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:0.88em;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,.2)">
             ❌ Refusé
           </button>
           <button onclick="dvolDemanderLabtaf('${d.id}')"
             style="background:#0891b2;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:0.88em;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,.2)">
             🔄 Procédure LABTAF
           </button>` : ''
      }
    </div>

    <!-- Bouton procédure expertise — juste au-dessus de la frise -->
    <div style="margin-bottom:12px;display:flex;justify-content:flex-end;">
      <button onclick="dvolOuvrirProcedureParDessus('${d.compagnie_mere || d.compagnie || ''}')"
        style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:7px 16px;cursor:pointer;font-size:0.88em;font-weight:600;white-space:nowrap;">
        📋 Procédure ${d.compagnie_mere || d.compagnie || ''}
      </button>
    </div>

    <!-- Timeline -->
    <div style="margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:10px;color:#374151">📊 Avancement du dossier</div>
      <div style="display:flex;align-items:stretch;gap:4px">${timelineHtml}</div>
    </div>

    <!-- Action étape -->
    ${actionHtml}

    <!-- Documents -->
    <div style="margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:8px;color:#374151">📎 Documents
        ${docsVerrouilles ? '<span style="font-size:0.75em;color:#16a34a;font-weight:400;margin-left:8px">✓ Validés et verrouillés</span>' : ''}
      </div>
      <details ${docsVerrouilles ? '' : 'open'} style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;margin-bottom:6px">
        <summary style="cursor:pointer;font-weight:600;color:#374151;list-style:none">
          📋 Obligatoires
          (${recusList.filter(k => DVOL_DOCS_OBLIGATOIRES.find(o => o.key === k)).length}/${DVOL_DOCS_OBLIGATOIRES.length})
        </summary>
        <div style="padding:4px 0 4px 8px;margin-top:6px">${docsObligHtml}</div>
      </details>
      <details style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px">
        <summary style="cursor:pointer;font-weight:600;color:#6b7280;list-style:none">
          📋 Optionnels <span style="font-weight:400">(sans alerte si absent)</span>
        </summary>
        <div style="padding:4px 0 4px 8px;margin-top:6px">${docsOptHtml}</div>
      </details>
    </div>

    <!-- Notes -->
    <div style="margin-bottom:8px">
      <div style="font-weight:700;margin-bottom:6px;color:#374151">📝 Notes</div>
      <textarea id="dvol-notes-${d.id}" rows="3"
        style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9em;resize:vertical;box-sizing:border-box"
        placeholder="Notes internes…">${d.notes || ''}</textarea>
    </div>

  </div>`;

  dvolOpenModal({
    title: `Dossier VOL — ${d.ref_sinistre || d.numero_dossier || String(d.id).substring(0, 8)}`,
    content: html,
    size: 'large',
    actions: [
      { label: 'Fermer',         style: 'secondary', onClick: dvolCloseModal },
      { label: '💾 Enregistrer', style: 'primary',   onClick: () => dvolEnregistrer(d.id) }
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
  dvolOpenConfirm({
    message: `Confirmer l'étape : <strong>${label}</strong> ?`,
    onConfirm: () => dvolValiderEtape(dossierId, slug)
  });
}

async function dvolValiderEtape(dossierId, slug) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const today = new Date().toISOString().split('T')[0];

  // ── Règle J+10 : expertise impossible avant J+10 ─────────────────────────
  if (slug === 'lancement_expertise') {
    const jours = dvolJours(d.date_declaration);
    if (jours !== null && jours < 10) {
      const reste = 10 - jours;
      dvolOpenModal({
        title: '⛔ Expertise prématurée',
        content: `<div style="padding:8px 0">
          <p style="color:#374151;margin-bottom:12px">
            Le lancement de l'expertise ne peut être confirmé qu'à partir de <strong>J+10</strong>.
          </p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.4em;font-weight:800;color:#92400e">J+${jours} / J+10</div>
            <div style="color:#92400e;font-size:0.9em;margin-top:4px">
              Encore <strong>${reste} jour${reste > 1 ? 's' : ''}</strong> à patienter
            </div>
          </div>
        </div>`,
        size: 'small',
        actions: [{ label: 'Compris', style: 'primary', onClick: dvolCloseModal }]
      });
      return;
    }
  }

  // ── Règle 1 : documents obligatoires requis avant validation_docs ──────────
  if (slug === 'validation_docs') {
    const recusList = dvolGetDocsRecus(d);
    const manquants = DVOL_DOCS_OBLIGATOIRES.filter(doc => !recusList.includes(doc.key));
    if (manquants.length > 0) {
      dvolOpenModal({
        title: '⛔ Documents manquants',
        content: `<div style="padding:8px 0">
          <p style="color:#374151;margin-bottom:12px">
            Impossible de passer à l'expertise : <strong>${manquants.length} document(s) obligatoire(s)</strong> non reçu(s) :
          </p>
          <ul style="margin:0;padding-left:20px;color:#dc2626;line-height:2">
            ${manquants.map(m => `<li>${m.icon} ${m.label}</li>`).join('')}
          </ul>
          <p style="color:#6b7280;font-size:0.85em;margin-top:12px">
            Cochez les documents reçus dans la section "Documents" avant de valider cette étape.
          </p>
        </div>`,
        size: 'small',
        actions: [{ label: 'Compris', style: 'primary', onClick: dvolCloseModal }]
      });
      return;
    }
  }

  // ── Règle 2 : règlement impossible avant J+30 ─────────────────────────────
  if (slug === 'reglement') {
    const jours = dvolJours(d.date_declaration);
    if (jours !== null && jours < 30) {
      const reste = 30 - jours;
      dvolOpenModal({
        title: '⛔ Règlement prématuré',
        content: `<div style="padding:8px 0">
          <p style="color:#374151;margin-bottom:12px">
            Le règlement ne peut être confirmé qu'à partir de <strong>J+30</strong> depuis la date de déclaration.
          </p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.4em;font-weight:800;color:#92400e">J+${jours} / J+30</div>
            <div style="color:#92400e;font-size:0.9em;margin-top:4px">
              Encore <strong>${reste} jour${reste > 1 ? 's' : ''}</strong> à patienter
            </div>
          </div>
        </div>`,
        size: 'small',
        actions: [{ label: 'Compris', style: 'primary', onClick: dvolCloseModal }]
      });
      return;
    }
  }

  // ── Validation en base ────────────────────────────────────────────────────
  const etapeExistante = (d._etapes || []).find(e => e.slug === slug);
  if (etapeExistante) {
    await db.from('dvol_etapes')
      .update({ statut: 'realise', date_realisee: today })
      .eq('id', etapeExistante.id);
  } else {
    await db.from('dvol_etapes')
      .insert({ dossier_id: dossierId, slug, statut: 'realise', date_realisee: today });
  }

  // Mise à jour statut dossier selon étape validée
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

async function dvolSauvegarderGestionnaire(dossierId, gestId) {
  await db.from('dvol_dossiers')
    .update({ gestionnaire_id: gestId || null })
    .eq('id', dossierId);
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
    content: `
      <div style="padding:8px 0">
        <p style="font-size:1em;color:#374151;line-height:1.6;margin-bottom:16px">
          Confirmer la découverte du véhicule pour le dossier
          <strong>${d.ref_sinistre || d.numero_dossier || dossierId}</strong>
          (${compagnie}) ?
        </p>
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 14px;font-size:0.9em;color:#92400e;line-height:1.5">
          ⚠️ Cette action est <strong>irréversible</strong> :<br>
          • Le dossier sera <strong>clôturé</strong><br>
          • Toutes les étapes non effectuées seront <strong>verrouillées</strong><br>
          • Le dossier disparaîtra du tableau au prochain reset
        </div>
      </div>`,
    size: 'small',
    actions: [
      { label: 'Annuler',             style: 'secondary', onClick: dvolCloseModal },
      { label: '✅ Confirmer la clôture', style: 'primary', onClick: () => dvolCloturerRetrouve(dossierId) }
    ]
  });
}

async function dvolCloturerRetrouve(dossierId) {
  dvolCloseModal();
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  const today = new Date().toISOString().split('T')[0];

  // 1. Clôturer le dossier
  const { error: eDossier } = await db.from('dvol_dossiers')
    .update({ statut: 'clos' })
    .eq('id', dossierId);
  if (eDossier) {
    showNotif('Erreur clôture dossier : ' + eDossier.message, 'error');
    return;
  }

  // 2. Verrouiller toutes les étapes non réalisées → statut 'annule'
  const etapesExistantes = d._etapes || [];
  for (const def of DVOL_ETAPES_DEF) {
    const etapeExistante = etapesExistantes.find(e => e.slug === def.slug);
    if (etapeExistante) {
      if (etapeExistante.statut !== 'realise') {
        await db.from('dvol_etapes')
          .update({ statut: 'annule' })
          .eq('id', etapeExistante.id);
      }
    } else {
      // Étape jamais créée → on l'insère directement comme annulée
      await db.from('dvol_etapes').insert({
        dossier_id:   dossierId,
        slug:         def.slug,
        statut:       'annule',
        date_realisee: null
      });
    }
  }

  showNotif('🚗 Véhicule retrouvé — Dossier clôturé et étapes verrouillées', 'success');
  await dvolCharger();
  dvolOuvrirDossier(dossierId);
}

// ────────────────────────────────────────────────────────────
// REFUS DU DOSSIER
// ────────────────────────────────────────────────────────────

function dvolDemanderRefus(dossierId) {
  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;
  dvolOpenModal({
    title: '❌ Refus du dossier — Confirmation',
    content: `<div style="padding:8px 0">
      <p style="color:#374151;line-height:1.6;margin-bottom:16px">
        Confirmer le refus du dossier <strong>${d.ref_sinistre || d.numero_dossier || ''}</strong> ?
      </p>
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 14px;font-size:0.9em;color:#991b1b;line-height:1.5">
        ⚠️ Action <strong>irréversible</strong> :<br>
        • Le dossier sera clôturé avec statut <strong>Refusé</strong><br>
        • Toutes les étapes non effectuées seront verrouillées<br>
        • Le dossier disparaîtra au prochain reset du soir
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
  // Verrouiller toutes les étapes non réalisées
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
        Passage en <strong>procédure LABTAF</strong> pour le dossier
        <strong>${d.ref_sinistre || d.numero_dossier || ''}</strong>.
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
        <div style="font-size:0.8em;color:#6b7280;margin-top:6px">
          À cette date, le gestionnaire recevra une relance pour indiquer si la compagnie a répondu.
        </div>
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
  const dateEcheance = document.getElementById('labtaf-date-echeance')?.value;
  const conserveGestion = document.getElementById('labtaf-conserve-gestion')?.checked;
  dvolCloseModal();

  const d = dvolDossiers.find(x => String(x.id) === String(dossierId));
  if (!d) return;

  const updates = { statut: 'labtaf', date_cloture_prevue: dateEcheance || null };
  const { error } = await db.from('dvol_dossiers').update(updates).eq('id', dossierId);
  if (error) { showNotif('Erreur LABTAF : ' + error.message, 'error'); return; }

  // Insérer une notification de relance à l'échéance
  if (d.gestionnaire_id && dateEcheance) {
    await db.from('dvol_notifications').insert({
      dossier_id:            dossierId,
      gestionnaire_id:       d.gestionnaire_id,
      message:               `📋 Relance LABTAF — Dossier ${d.ref_sinistre || d.numero_dossier || ''} : avez-vous un retour de la compagnie ?`,
      type_alerte:           'labtaf',
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
      <p style="color:#374151;margin-bottom:16px;line-height:1.6">
        Quel est le résultat du retour de la compagnie ?
      </p>
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
  // Reprendre au statut correspondant à la dernière étape réalisée
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
  const notesEl = document.getElementById('dvol-notes-' + dossierId);
  const updates = {};
  if (notesEl) updates.notes = notesEl.value;
  if (!Object.keys(updates).length) { dvolCloseModal(); return; }

  const { error } = await db.from('dvol_dossiers').update(updates).eq('id', dossierId);
  if (error) {
    console.error('[DVOL] save error', error);
    showNotif('Erreur lors de la sauvegarde : ' + error.message, 'error');
    return;
  }
  showNotif('✅ Dossier enregistré', 'success');
  await dvolCharger();
  dvolCloseModal();
}

// ────────────────────────────────────────────────────────────
// CRÉATION
// ────────────────────────────────────────────────────────────

function dvolOuvrirCreation() {
  const today = new Date().toISOString().split('T')[0];
  const gestOpts = `<option value="">— Non assigné —</option>` +
    (allUsers || []).map(u =>
      `<option value="${u.id}">${u.prenom} ${u.nom}</option>`
    ).join('');

  const html = `
  <div style="font-family:inherit">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:0.82em;color:#6b7280;display:block;margin-bottom:4px">Compagnie mère *</label>
        <select id="dvol-new-compagnie"
          style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;box-sizing:border-box">
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
        <select id="dvol-new-gest"
          style="width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;box-sizing:border-box">
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
  const compagnie      = document.getElementById('dvol-new-compagnie')?.value;
  const refSinistre    = document.getElementById('dvol-new-refsinistre')?.value?.trim();
  const dateDeclaration = document.getElementById('dvol-new-date')?.value;
  const gestId         = document.getElementById('dvol-new-gest')?.value || null;
  const notes          = document.getElementById('dvol-new-notes')?.value?.trim();

  if (!compagnie || !dateDeclaration) {
    showNotif('Veuillez remplir la compagnie et la date de déclaration.', 'error');
    return;
  }

  const payload = {
    compagnie_mere:    compagnie,
    compagnie:         compagnie,
    ref_sinistre:      refSinistre || null,
    date_declaration:  dateDeclaration,
    statut:            'declare',
    gestionnaire_id:   gestId,
    notes:             notes || null,
    created_at:        new Date().toISOString(),
    updated_at:        new Date().toISOString()
  };

  const { data, error } = await db.from('dvol_dossiers').insert(payload).select().single();
  if (error) {
    console.error('[DVOL] create error', error);
    showNotif('Erreur création : ' + error.message, 'error');
    return;
  }

  // Étape déclaration = réalisée d'emblée
  await db.from('dvol_etapes').insert({
    dossier_id:    data.id,
    slug:          'declaration',
    statut:        'realise',
    date_realisee: dateDeclaration
  });

  // Fix : mise à jour automatique du statut → déclaration déjà validée à la création
  await db.from('dvol_dossiers')
    .update({ statut: 'en_attente_documents' })
    .eq('id', data.id);

  if (typeof auditLog === 'function') {
    await auditLog('CREATION_DVOL', 'Dossier VOL créé : ' + (refSinistre || data.id));
  }

  showNotif('✅ Dossier VOL créé', 'success');
  await dvolCharger();
  dvolCloseModal();
  dvolOuvrirDossier(data.id);
}

// ────────────────────────────────────────────────────────────
// SYSTÈME MODAL DVOL
// Nommé dvolOpenModal / dvolCloseModal / dvolOpenConfirm
// pour éviter tout conflit avec closeModal(id) de auth.js
// ────────────────────────────────────────────────────────────

function dvolOpenModal({ title = '', content = '', size = 'medium', actions = [], headerContent = '' } = {}) {
  // Supprimer une éventuelle modale existante
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
  overlay.style.cssText = [
    'position:fixed;inset:0;',
    'background:rgba(0,0,0,.5);',
    'z-index:9000;',
    'display:flex;align-items:center;justify-content:center;',
    'padding:16px;'
  ].join('');

  overlay.innerHTML = `
    <div style="background:white;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.25);width:100%;max-width:${maxW};max-height:90vh;overflow:hidden;display:flex;flex-direction:column;">
      ${title ? `
      <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <h3 style="margin:0;font-size:15px;font-weight:800;">${title}</h3>
        <div style="display:flex;align-items:center;gap:10px;">
          ${headerContent}
          <button onclick="dvolCloseModal()"
            style="background:rgba(255,255,255,.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">
            ×
          </button>
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

  // Attacher les callbacks
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
      {
        label: labelConfirm,
        style: 'primary',
        onClick: () => {
          dvolCloseModal();
          if (typeof onConfirm === 'function') onConfirm();
        }
      }
    ]
  });
}

// ────────────────────────────────────────────────────────────
// PROCÉDURE EXPERTISE — ouverture par-dessus le modal dossier
// ────────────────────────────────────────────────────────────

function dvolOuvrirProcedureParDessus(compagnie) {
  // Snapshot des overlays existants AVANT l'ouverture de la procédure
  const avantOuverture = new Set(
    Array.from(document.querySelectorAll('body > div[style*="z-index"], body > div[style*="position:fixed"], body > div[class*="modal"], body > div[class*="overlay"]'))
      .map(el => el)
  );

  // Ouvrir la fenêtre procédure (fonction définie ailleurs dans l'app)
  if (typeof dvolOuvrirProcedure === 'function') {
    dvolOuvrirProcedure(compagnie);
  } else {
    console.warn('[DVOL] dvolOuvrirProcedure non définie');
    return;
  }

  // Après rendu, monter le z-index de tout nouvel overlay apparu au-dessus de dvol-modal-overlay (9000)
  setTimeout(() => {
    const Z_DESSUS = 9500;
    document.querySelectorAll('body > div').forEach(el => {
      if (el.id === 'dvol-modal-overlay') return; // ne pas toucher notre propre modal
      if (avantOuverture.has(el))         return; // existait déjà avant
      // Monter le z-index de cet élément et de tous ses enfants qui en ont un
      el.style.zIndex = Z_DESSUS;
      el.querySelectorAll('[style*="z-index"]').forEach(child => {
        const z = parseInt(child.style.zIndex || '0', 10);
        if (z > 0) child.style.zIndex = Z_DESSUS + 1;
      });
    });
    // Filet de sécurité : chercher aussi par classe générique
    document.querySelectorAll('[class*="modal"],[class*="overlay"],[class*="backdrop"]').forEach(el => {
      if (el.id === 'dvol-modal-overlay') return;
      if (avantOuverture.has(el))         return;
      el.style.zIndex = Z_DESSUS;
    });
  }, 80);
}
