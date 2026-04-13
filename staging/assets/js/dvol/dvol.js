// ============================================================
// DVOL v3.0 — Gestion des dossiers vol de véhicule
// ============================================================

let dvolDossiers = [];

// ── Documents : 4 obligatoires + 2 optionnels ──
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

// ── Etapes file d'ariane (ordre, label, delai J+X, slug) ──
const DVOL_ETAPES_DEF = [
  { ordre: 1, slug: 'declaration',         label: 'Déclaration',             delai: 0  },
  { ordre: 2, slug: 'validation_docs',     label: 'Validation documents',    delai: 8  },
  { ordre: 3, slug: 'lancement_expertise', label: 'Lancement expertise',     delai: 10 },
  { ordre: 4, slug: 'reception_rapport',   label: 'Réception rapport',       delai: 25 },
  { ordre: 5, slug: 'reglement',           label: 'Règlement',               delai: 30 }
];

// ── Labels statuts ──
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
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.floor((today - debut) / 86400000);
}

function dvolAddDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function dvolFmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dvolBadgeJours(jours) {
  if (jours === null) return '<span style="color:#9ca3af;">—</span>';
  let color = '#16a34a', bg = '#f0fdf4';
  if (jours >= 10 && jours < 20) { color = '#d97706'; bg = '#fffbeb'; }
  if (jours >= 20 && jours < 30) { color = '#dc2626'; bg = '#fef2f2'; }
  if (jours >= 30)               { color = '#7c2d12'; bg = '#fef2f2'; }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:20px;background:${bg};color:${color};font-weight:700;font-size:12px;white-space:nowrap;">J+${jours}</span>`;
}

function dvolBadgeStatut(statut) {
  const s = DVOL_STATUTS[statut] || { label: statut, color: '#6b7280', bg: '#f3f4f6' };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:${s.bg};color:${s.color};font-weight:600;font-size:11px;white-space:nowrap;">${s.label}</span>`;
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
  const pct = Math.round((recus / total) * 100);
  const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return `<div title="${recus}/${total} docs obligatoires reçus" style="display:flex;align-items:center;gap:6px;">
    <div style="width:60px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
    </div>
    <span style="font-size:11px;color:${color};font-weight:600;">${recus}/${total}</span>
  </div>`;
}

function dvolGetRefSinistre(dispatchDossierId) {
  if (!dispatchDossierId) return '—';
  const d = (allDossiers || []).find(x => String(x.id) === String(dispatchDossierId));
  return d ? d.ref_sinistre : ('ID:' + dispatchDossierId);
}

// ── Calcul des dates prévisionnelles en cascade depuis date_declaration + decalage ──
function dvolCalcDatesPrev(dateDeclaration, decalageJours = 0) {
  if (!dateDeclaration) return {};
  const dates = {};
  for (const e of DVOL_ETAPES_DEF) {
    dates[e.slug] = dvolAddDays(dateDeclaration, e.delai + decalageJours);
  }
  return dates;
}

// ── Lire les étapes d'un dossier depuis dvol_suivi_etapes (depuis cache local) ──
function dvolGetEtapes(dossierEtapes, dateDeclaration, decalageJours) {
  const datesPrev = dvolCalcDatesPrev(dateDeclaration, decalageJours || 0);
  return DVOL_ETAPES_DEF.map(def => {
    const row = (dossierEtapes || []).find(e => e.slug === def.slug);
    return {
      ...def,
      date_prevue:       row ? row.date_prevue       : (datesPrev[def.slug] || null),
      date_realisee:     row ? row.date_realisee     : null,
      statut:            row ? row.statut            : (def.ordre === 1 ? 'realise' : 'en_attente'),
      date_report:       row ? row.date_report       : null,
      commentaire:       row ? row.commentaire       : null,
      id:                row ? row.id                : null
    };
  });
}

// ────────────────────────────────────────────────────────────
// ALERTES — pour DVOL + messages du matin
// ────────────────────────────────────────────────────────────

function dvolGetAlertes(dossiers) {
  const alertes = [];
  const today = new Date(); today.setHours(0,0,0,0);

  for (const d of dossiers) {
    if (['clos','refuse','labtaf'].includes(d.statut)) continue;
    const jours = dvolJours(d.date_declaration);
    if (jours === null) continue;
    const ref = dvolGetRefSinistre(d.dispatch_dossier_id);
    const recusList = dvolGetDocsRecus(d);
    const docsObligManquants = DVOL_DOCS_OBLIGATOIRES.filter(doc => !recusList.includes(doc.key)).length;
    const decalage = d.decalage_jours || 0;

    // Etapes
    const etapes = dvolGetEtapes(d._etapes || [], d.date_declaration, decalage);

    for (const etape of etapes) {
      if (etape.statut === 'realise') continue;
      if (!etape.date_prevue) continue;

      // Si report en cours, on skip jusqu'à la date de report
      const dateLimite = etape.date_report || etape.date_prevue;
      const dateL = new Date(dateLimite + 'T12:00:00');
      if (dateL > today) continue; // pas encore en retard

      const joursRetard = Math.floor((today - dateL) / 86400000);

      let message = '', type = '', urgence = 'normale';
      if (etape.slug === 'validation_docs') {
        if (docsObligManquants > 0) {
          message = `J+${jours} — Valider les documents (${docsObligManquants} manquant${docsObligManquants>1?'s':''})`;
          type = 'docs_manquants'; urgence = joursRetard >= 5 ? 'haute' : 'normale';
        } else {
          message = `J+${jours} — Documents reçus, validation à confirmer`;
          type = 'docs_a_valider'; urgence = 'normale';
        }
      } else if (etape.slug === 'lancement_expertise') {
        message = `J+${jours} — Lancement expertise à confirmer`;
        type = 'expertise_a_lancer'; urgence = joursRetard >= 3 ? 'haute' : 'moyenne';
      } else if (etape.slug === 'reception_rapport') {
        message = `J+${jours} — Réception rapport expertise attendue`;
        type = 'rapport_manquant'; urgence = joursRetard >= 5 ? 'haute' : 'normale';
      } else if (etape.slug === 'reglement') {
        message = `J+${jours} — Règlement à initier`;
        type = 'reglement'; urgence = 'haute';
      }

      if (message) {
        alertes.push({ dossier: d, type, message,
          detail: `${ref} · ${d.compagnie_mere || d.compagnie}`, urgence });
      }
    }
  }

  const ordre = { haute: 0, moyenne: 1, normale: 2 };
  alertes.sort((a, b) => (ordre[a.urgence]??3) - (ordre[b.urgence]??3));
  return alertes;
}

// Exposé pour le message du matin (dispatch.js appelle dvolGetAlertesForMatin)
function dvolGetAlertesForMatin() {
  return dvolGetAlertes(dvolDossiers);
}

const DVOL_ALERTE_ICONS = {
  docs_manquants:    '📄',
  docs_a_valider:    '✅',
  expertise_a_lancer:'🔍',
  rapport_manquant:  '📋',
  reglement:         '💰'
};
const DVOL_URGENCE_STYLES = {
  haute:   { border:'#dc2626', bg:'#fef2f2', color:'#dc2626' },
  moyenne: { border:'#d97706', bg:'#fffbeb', color:'#d97706' },
  normale: { border:'#e5e7eb', bg:'#f9fafb', color:'#374151' }
};

function dvolRenderAlertes(alertes) {
  const encart = document.getElementById('dvol-encart-alertes');
  const liste  = document.getElementById('dvol-liste-alertes');
  const badge  = document.getElementById('dvol-badge-alertes');
  if (!encart || !liste || !badge) return;
  if (alertes.length === 0) { encart.style.display = 'none'; return; }
  encart.style.display = 'block';
  badge.textContent = alertes.length;
  liste.innerHTML = alertes.map(a => {
    const s = DVOL_URGENCE_STYLES[a.urgence] || DVOL_URGENCE_STYLES.normale;
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;background:${s.bg};border:1.5px solid ${s.border};">
      <span style="font-size:18px;flex-shrink:0;">${DVOL_ALERTE_ICONS[a.type]||'⚠️'}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:${s.color};">${a.message}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">${a.detail}</div>
      </div>
      <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;white-space:nowrap;" onclick="dvolOuvrirDossier('${a.dossier.id}')">Voir →</button>
    </div>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────
// TABLEAU LISTE
// ────────────────────────────────────────────────────────────

function dvolRenderTableau(dossiers) {
  const tbody    = document.getElementById('dvol-tbody');
  const compteur = document.getElementById('dvol-compteur');
  if (!tbody) return;
  const actifs = dossiers.filter(d => !['clos','refuse'].includes(d.statut));
  if (compteur) compteur.textContent = `${dossiers.length} dossier${dossiers.length>1?'s':''} (${actifs.length} actif${actifs.length>1?'s':''})`;

  const thead = document.querySelector('#dvol-screen table thead tr');
  if (thead) {
    thead.innerHTML = `
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">Réf. sinistre</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Compagnie</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Date vol</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:center;">J+X</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Statut</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Gestionnaire</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Docs</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:center;">Actions</th>`;
  }

  if (dossiers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><div style="font-size:24px;margin-bottom:8px;">📂</div>Aucun dossier VOL pour le moment</td></tr>`;
    return;
  }

  tbody.innerHTML = dossiers.map((d, i) => {
    const jours   = dvolJours(d.date_declaration);
    const rowBg   = i % 2 === 0 ? '' : 'background:#f9fafb;';
    const dateVol = d.date_declaration ? new Date(d.date_declaration+'T12:00:00').toLocaleDateString('fr-FR') : '—';
    const gest    = d.gestionnaire_id ? (allUsers||[]).find(u => u.id === d.gestionnaire_id) : null;
    const gestNom = gest ? gest.prenom+' '+gest.nom : '<span style="color:#9ca3af;">—</span>';
    const refSin  = dvolGetRefSinistre(d.dispatch_dossier_id);
    return `<tr style="border-bottom:1px solid #f3f4f6;${rowBg}transition:background .1s;cursor:pointer;"
      onclick="dvolOuvrirDossier('${d.id}')"
      onmouseover="this.style.background='#f0f7ff'" onmouseout="this.style.background='${i%2===0?'':'#f9fafb'}'">
      <td style="padding:10px 14px;font-weight:600;color:var(--navy);white-space:nowrap;">${refSin}</td>
      <td style="padding:10px 14px;white-space:nowrap;">
        <span style="font-weight:600;">${d.compagnie_mere||d.compagnie||'—'}</span>
        ${d.compagnie&&d.compagnie!==d.compagnie_mere?`<br><span style="font-size:11px;color:#6b7280;">${d.compagnie}</span>`:''}
      </td>
      <td style="padding:10px 14px;white-space:nowrap;">${dateVol}</td>
      <td style="padding:10px 14px;text-align:center;">${dvolBadgeJours(jours)}</td>
      <td style="padding:10px 14px;">${dvolBadgeStatut(d.statut)}</td>
      <td style="padding:10px 14px;white-space:nowrap;">${gestNom}</td>
      <td style="padding:10px 14px;">${dvolBarreDocs(d)}</td>
      <td style="padding:10px 14px;text-align:center;">
        <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="event.stopPropagation();dvolOuvrirDossier('${d.id}')">📂 Ouvrir</button>
      </td>
    </tr>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────
// FILE D'ARIANE
// ────────────────────────────────────────────────────────────

function dvolRenderFilAriane(etapes) {
  const today = new Date(); today.setHours(0,0,0,0);
  return `<div style="display:flex;align-items:stretch;gap:0;margin-bottom:16px;overflow-x:auto;padding-bottom:4px;">
    ${etapes.map((e, i) => {
      const fait    = e.statut === 'realise';
      const enCours = !fait && i > 0 && etapes[i-1].statut === 'realise';
      const retard  = !fait && e.date_prevue && new Date(e.date_prevue+'T12:00:00') < today;

      let bgColor = '#f3f4f6', textColor = '#9ca3af', borderColor = '#e5e7eb', dotColor = '#d1d5db';
      if (fait)    { bgColor='#f0fdf4'; textColor='#16a34a'; borderColor='#bbf7d0'; dotColor='#16a34a'; }
      if (enCours) { bgColor='#eff6ff'; textColor='#2563eb'; borderColor='#bfdbfe'; dotColor='#2563eb'; }
      if (retard && !fait)  { bgColor='#fef2f2'; textColor='#dc2626'; borderColor='#fecaca'; dotColor='#dc2626'; }

      const dateLbl = fait
        ? `✅ ${dvolFmtDate(e.date_realisee||e.date_prevue)}`
        : (e.date_report
            ? `📅 Reporté au ${dvolFmtDate(e.date_report)}`
            : `Prévu ${dvolFmtDate(e.date_prevue)}`);

      return `<div style="flex:1;min-width:110px;position:relative;">
        <div style="background:${bgColor};border:1.5px solid ${borderColor};border-radius:${i===0?'10px 0 0 10px':i===etapes.length-1?'0 10px 10px 0':'0'};padding:10px 12px;height:100%;box-sizing:border-box;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;"></div>
            <span style="font-size:11px;font-weight:700;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.label}</span>
          </div>
          <div style="font-size:10px;color:#6b7280;white-space:nowrap;">${dateLbl}</div>
        </div>
        ${i < etapes.length-1 ? `<div style="position:absolute;right:-1px;top:50%;transform:translateY(-50%);z-index:1;width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:10px solid ${borderColor};"></div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

// ────────────────────────────────────────────────────────────
// SECTION DOCUMENTS (Obligatoires dépliés / Optionnels repliés)
// ────────────────────────────────────────────────────────────

function dvolRenderDocs(dossier, canEdit) {
  const recusList = dvolGetDocsRecus(dossier);
  const id = dossier.id;
  const tousObligRecus = DVOL_DOCS_OBLIGATOIRES.every(d => recusList.includes(d.key));

  function docRow(doc) {
    const recu = recusList.includes(doc.key);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;background:${recu?'#f0fdf4':'#fef9f0'};border:1px solid ${recu?'#bbf7d0':'#fed7aa'};gap:12px;">
      <span style="font-size:13px;">${doc.icon} ${doc.label}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:12px;font-weight:700;color:${recu?'#16a34a':'#d97706'};">${recu?'✅ Reçu':'⏳ Manquant'}</span>
        ${canEdit?`<button onclick="dvolToggleDoc('${id}','${doc.key}',${!recu})" style="background:none;border:1px solid ${recu?'#dc2626':'#16a34a'};color:${recu?'#dc2626':'#16a34a'};border-radius:6px;cursor:pointer;font-size:10px;padding:2px 8px;font-weight:600;">${recu?'Retirer':'Marquer reçu'}</button>`:''}
      </div>
    </div>`;
  }

  return `
    <!-- Obligatoires -->
    <div style="border:1.5px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:8px;">
      <button onclick="dvolToggleSection('dvol-docs-oblig-${id}',this)" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border:none;cursor:pointer;font-size:13px;font-weight:700;color:var(--navy);">
        <span>📎 Obligatoires <span style="font-size:11px;font-weight:600;color:${tousObligRecus?'#16a34a':'#d97706'};">(${DVOL_DOCS_OBLIGATOIRES.filter(d=>recusList.includes(d.key)).length}/${DVOL_DOCS_OBLIGATOIRES.length})</span></span>
        <span class="dvol-chevron" style="font-size:12px;transition:transform .2s;">${tousObligRecus?'▼':'▼'}</span>
      </button>
      <div id="dvol-docs-oblig-${id}" style="display:${tousObligRecus?'none':'flex'};flex-direction:column;gap:6px;padding:10px;">
        ${DVOL_DOCS_OBLIGATOIRES.map(docRow).join('')}
      </div>
    </div>
    <!-- Optionnels -->
    <div style="border:1.5px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <button onclick="dvolToggleSection('dvol-docs-opt-${id}',this)" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border:none;cursor:pointer;font-size:13px;font-weight:700;color:var(--navy);">
        <span>📎 Optionnels <span style="font-size:11px;font-weight:400;color:#9ca3af;">(sans alerte si absent)</span></span>
        <span class="dvol-chevron" style="font-size:12px;transition:transform .2s;">▶</span>
      </button>
      <div id="dvol-docs-opt-${id}" style="display:none;flex-direction:column;gap:6px;padding:10px;">
        ${DVOL_DOCS_OPTIONNELS.map(docRow).join('')}
      </div>
    </div>`;
}

function dvolToggleSection(sectionId, btn) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'flex';
  const chevron = btn ? btn.querySelector('.dvol-chevron') : null;
  if (chevron) chevron.textContent = isOpen ? '▶' : '▼';
}

// ────────────────────────────────────────────────────────────
// MODALE DÉTAIL DOSSIER
// ────────────────────────────────────────────────────────────

async function dvolOuvrirDossier(id) {
  const d = dvolDossiers.find(x => x.id === id);
  if (!d) return;

  const role = currentUserData
    ? ((typeof getEffectiveRole==='function') ? getEffectiveRole() : currentUserData.role)
    : 'gestionnaire';
  const canEdit = true; // gestionnaires ET admins peuvent éditer

  const { data: suiviRows } = await db.from('dvol_suivi_etapes')
    .select('*')
    .eq('dossier_id', id)
    .order('date_prevue', { ascending: true });

  d._etapes = suiviRows || [];
  const etapes = dvolGetEtapes(d._etapes, d.date_declaration, d.decalage_jours || 0);
  const jours  = dvolJours(d.date_declaration);
  const gest   = d.gestionnaire_id ? (allUsers||[]).find(u => u.id === d.gestionnaire_id) : null;
  const refSin = dvolGetRefSinistre(d.dispatch_dossier_id);

  document.getElementById('dvol-detail-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'dvol-detail-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:4000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 16px;';

  const statutOptions = Object.entries(DVOL_STATUTS).map(([k,v]) =>
    `<option value="${k}" ${d.statut===k?'selected':''}>${v.label}</option>`).join('');
  const gestOptions = (allUsers||[]).filter(u=>u.actif!==false).map(u =>
    `<option value="${u.id}" ${d.gestionnaire_id===u.id?'selected':''}>${u.prenom} ${u.nom}</option>`).join('');

  overlay.innerHTML = `
  <div style="background:white;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.2);width:100%;max-width:780px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,var(--navy,#1a2e4a),#2a4a6e);color:white;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-size:18px;font-weight:800;">${refSin}</div>
        <div style="font-size:13px;opacity:.8;margin-top:2px;">${d.compagnie_mere||d.compagnie||'—'} · ${dvolBadgeJours(jours)}</div>
      </div>
      <button onclick="document.getElementById('dvol-detail-modal').remove()" style="background:rgba(255,255,255,.15);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">×</button>
    </div>
    <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
      <!-- Champs édition -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Statut</div>
          <select id="dvol-edit-statut" style="font-size:13px;font-weight:600;border:none;background:transparent;color:var(--navy);cursor:pointer;width:100%;">${statutOptions}</select>
        </div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Gestionnaire</div>
          <select id="dvol-edit-gestionnaire" style="font-size:13px;font-weight:600;border:none;background:transparent;color:var(--navy);cursor:pointer;width:100%;"><option value="">— Non assigné —</option>${gestOptions}</select>
        </div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Date déclaration</div>
          <span style="font-size:13px;font-weight:600;">${d.date_declaration ? new Date(d.date_declaration+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : '—'}</span>
        </div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Véhicule retrouvé ?</div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="dvol-edit-retrouve" ${d.vehicule_retrouve_confirme?'checked':''} style="accent-color:var(--rose);width:16px;height:16px;"><span style="font-size:13px;font-weight:600;">${d.vehicule_retrouve_confirme?'Oui':'Non'}</span></label>
        </div>
      </div>

      <!-- File d'ariane -->
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 10px;">🗺️ Avancement du dossier</h3>
        ${dvolRenderFilAriane(etapes)}
        <div id="dvol-etapes-actions" style="display:flex;flex-direction:column;gap:8px;">
          ${dvolRenderEtapesActions(etapes, id)}
        </div>
      </div>

      <!-- Documents -->
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 10px;">📎 Documents</h3>
        ${dvolRenderDocs(d, canEdit)}
      </div>

      <!-- Notes -->
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 8px;">💬 Notes</h3>
        <textarea id="dvol-edit-notes" rows="3" style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;">${d.notes||''}</textarea>
      </div>

      <!-- Boutons bas -->
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px;border-top:1px solid #f3f4f6;">
        <button onclick="document.getElementById('dvol-detail-modal').remove()" class="btn btn-secondary">Fermer</button>
        <button onclick="dvolSauvegarderEdition('${id}')" class="btn btn-primary">💾 Enregistrer</button>
      </div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ────────────────────────────────────────────────────────────
// ACTIONS ÉTAPES (boutons dans la modale)
// ────────────────────────────────────────────────────────────

function dvolRenderEtapesActions(etapes, dossierId) {
  const today = new Date(); today.setHours(0,0,0,0);
  // Trouver l'étape courante (première non réalisée)
  const etapeCourante = etapes.find(e => e.statut !== 'realise');
  if (!etapeCourante) return `<div style="text-align:center;padding:8px;color:#16a34a;font-size:13px;font-weight:700;">✅ Toutes les étapes sont complétées !</div>`;

  let html = `<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:14px 16px;">`;
  html += `<div style="font-size:12px;font-weight:700;color:#2563eb;margin-bottom:10px;">📍 Étape en cours : ${etapeCourante.label}</div>`;

  if (etapeCourante.slug === 'declaration') {
    html += `<button onclick="dvolValiderEtape('${dossierId}','declaration',null)" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">✅ Marquer déclaration enregistrée</button>`;
  } else if (etapeCourante.slug === 'validation_docs') {
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="dvolValiderEtape('${dossierId}','validation_docs',null)" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">✅ Confirmer docs reçus</button>
      <button onclick="dvolDemanderRelance('${dossierId}')" class="btn" style="font-size:12px;padding:7px 16px;background:#fef3c7;border:1.5px solid #d97706;color:#92400e;">🔄 Relancer (+X jours)</button>
    </div>`;
  } else if (etapeCourante.slug === 'lancement_expertise') {
    html += `<button onclick="dvolValiderEtape('${dossierId}','lancement_expertise',null)" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">🔍 Confirmer lancement expertise</button>`;
  } else if (etapeCourante.slug === 'reception_rapport') {
    html += `<button onclick="dvolValiderEtape('${dossierId}','reception_rapport',null)" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">📋 Confirmer réception rapport</button>`;
  } else if (etapeCourante.slug === 'reglement') {
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="dvolValiderEtape('${dossierId}','reglement',null)" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">💰 Confirmer règlement effectué</button>
      <button onclick="dvolDemanderReport('${dossierId}','reglement')" class="btn" style="font-size:12px;padding:7px 16px;background:#f5f3ff;border:1.5px solid #7c3aed;color:#5b21b6;">📅 Reporter le règlement</button>
    </div>`;
  }

  html += `</div>`;
  return html;
}

// ── Valider une étape ──
async function dvolValiderEtape(dossierId, slug, commentaire) {
  const today = new Date().toISOString().split('T')[0];
  const d = dvolDossiers.find(x => x.id === dossierId);
  if (!d) return;

  // Chercher ou créer la ligne dans dvol_suivi_etapes
  const { data: existing } = await db.from('dvol_suivi_etapes')
    .select('id').eq('dossier_id', dossierId).eq('slug', slug).single();

  const payload = { statut: 'realise', date_realisee: today, updated_at: new Date().toISOString() };
  if (commentaire) payload.commentaire = commentaire;

  if (existing) {
    await db.from('dvol_suivi_etapes').update(payload).eq('id', existing.id);
  } else {
    // Récupérer la date_prevue depuis les définitions
    const def = DVOL_ETAPES_DEF.find(e => e.slug === slug);
    const decalage = d.decalage_jours || 0;
    const datePrevue = def ? dvolAddDays(d.date_declaration, def.delai + decalage) : today;
    await db.from('dvol_suivi_etapes').insert({
      dossier_id: dossierId, slug, label: def?.label || slug,
      date_prevue: datePrevue, ...payload
    });
  }

  // Maj automatique du statut si besoin
  const statutMap = {
    validation_docs:     'en_cours_expertise',
    lancement_expertise: 'en_cours_expertise',
    reception_rapport:   'en_attente_cloture',
    reglement:           'clos'
  };
  if (statutMap[slug]) {
    await db.from('dvol_dossiers').update({ statut: statutMap[slug], updated_at: new Date().toISOString() }).eq('id', dossierId);
  }

  showNotif('✅ Étape validée', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

// ── Relance docs : demander le nombre de jours supplémentaires ──
async function dvolDemanderRelance(dossierId) {
  const jours = parseInt(prompt('Combien de jours supplémentaires pour la relance ?'), 10);
  if (!jours || isNaN(jours) || jours <= 0) return;

  const d = dvolDossiers.find(x => x.id === dossierId);
  if (!d) return;
  const newDecalage = (d.decalage_jours || 0) + jours;

  await db.from('dvol_dossiers').update({
    decalage_jours: newDecalage, statut: 'relance', updated_at: new Date().toISOString()
  }).eq('id', dossierId);

  showNotif(`🔄 Relance enregistrée : +${jours} jours (toutes les dates sont recalculées)`, 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

// ── Reporter une étape : demander la nouvelle date ──
async function dvolDemanderReport(dossierId, slug) {
  const dateStr = prompt('Date de report (JJ/MM/AAAA) :');
  if (!dateStr) return;
  const parts = dateStr.split('/');
  if (parts.length !== 3) { showNotif('Format de date invalide', 'error'); return; }
  const isoDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;

  const d = dvolDossiers.find(x => x.id === dossierId);
  if (!d) return;

  const { data: existing } = await db.from('dvol_suivi_etapes')
    .select('id').eq('dossier_id', dossierId).eq('slug', slug).single();

  const payload = { date_report: isoDate, updated_at: new Date().toISOString() };
  if (existing) {
    await db.from('dvol_suivi_etapes').update(payload).eq('id', existing.id);
  } else {
    const def = DVOL_ETAPES_DEF.find(e => e.slug === slug);
    const decalage = d.decalage_jours || 0;
    const datePrevue = def ? dvolAddDays(d.date_declaration, def.delai + decalage) : isoDate;
    await db.from('dvol_suivi_etapes').insert({
      dossier_id: dossierId, slug, label: def?.label || slug,
      date_prevue: datePrevue, statut: 'en_attente', ...payload
    });
  }

  showNotif(`📅 Report enregistré jusqu'au ${dateStr} — les alertes sont pausées`, 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

// ────────────────────────────────────────────────────────────
// SAUVEGARDE CHAMPS MODALE
// ────────────────────────────────────────────────────────────

async function dvolSauvegarderEdition(dossierId) {
  const statutEl   = document.getElementById('dvol-edit-statut');
  const gestEl     = document.getElementById('dvol-edit-gestionnaire');
  const notesEl    = document.getElementById('dvol-edit-notes');
  const retrouveEl = document.getElementById('dvol-edit-retrouve');

  const updates = { updated_at: new Date().toISOString() };
  if (statutEl)   updates.statut = statutEl.value;
  if (gestEl)     updates.gestionnaire_id = gestEl.value ? parseInt(gestEl.value) : null;
  if (notesEl)    updates.notes = notesEl.value;
  if (retrouveEl) {
    updates.vehicule_retrouve_confirme = retrouveEl.checked;
    if (retrouveEl.checked && !dvolDossiers.find(d=>d.id===dossierId)?.vehicule_retrouve_confirme) {
      updates.date_vehicule_retrouve = new Date().toISOString();
    }
  }

  const { error } = await db.from('dvol_dossiers').update(updates).eq('id', dossierId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }

  showNotif('✅ Modifications enregistrées', 'success');
  document.getElementById('dvol-detail-modal')?.remove();
  await dvolCharger();
}

// ────────────────────────────────────────────────────────────
// TOGGLE DOC
// ────────────────────────────────────────────────────────────

async function dvolToggleDoc(dossierId, docKey, newVal) {
  const dossier = dvolDossiers.find(d => d.id === dossierId);
  if (!dossier) return;

  let recusList = dvolGetDocsRecus(dossier);
  if (newVal) { if (!recusList.includes(docKey)) recusList.push(docKey); }
  else { recusList = recusList.filter(k => k !== docKey); }

  const tousObligRecus = DVOL_DOCS_OBLIGATOIRES.every(d => recusList.includes(d.key));
  const { error } = await db.from('dvol_dossiers').update({
    documents_recus_liste: recusList,
    documents_recus: tousObligRecus,
    date_reception_documents: tousObligRecus ? new Date().toISOString().split('T')[0] : null,
    updated_at: new Date().toISOString()
  }).eq('id', dossierId);

  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  showNotif(newVal ? '📄 Document marqué reçu' : '📄 Document retiré', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

// ────────────────────────────────────────────────────────────
// CHARGEMENT
// ────────────────────────────────────────────────────────────

async function dvolCharger() {
  if (!currentUserData) return;
  const { data, error } = await db.from('dvol_dossiers').select('*').order('date_declaration', { ascending: true });
  if (error) { showNotif('Erreur chargement dossiers VOL : ' + error.message, 'error'); return; }

  dvolDossiers = data || [];
  dvolDossiers.sort((a, b) => {
    const closA = ['clos','refuse','labtaf'].includes(a.statut);
    const closB = ['clos','refuse','labtaf'].includes(b.statut);
    if (closA !== closB) return closA ? 1 : -1;
    return (dvolJours(b.date_declaration)??0) - (dvolJours(a.date_declaration)??0);
  });

  dvolRenderAlertes(dvolGetAlertes(dvolDossiers));
  dvolRenderTableau(dvolDossiers);
}

// ────────────────────────────────────────────────────────────
// INIT & SWITCHER
// ────────────────────────────────────────────────────────────

async function dvolInit() {
  if (!currentUserData) { setTimeout(dvolInit, 300); return; }
  await dvolCharger();
}

function switchTool(tool) {
  const tabs = document.getElementById('tabs-container');
  const mc   = document.getElementById('main-content');
  const dp   = document.getElementById('dplane-screen');
  const dv   = document.getElementById('dvol-screen');
  const bd   = document.getElementById('btn-tool-dispatch');
  const bpl  = document.getElementById('btn-tool-dplane');
  const bvol = document.getElementById('btn-tool-dvol');

  if (tabs) tabs.style.display = 'none';
  if (mc)   mc.style.display   = 'none';
  if (dp)   dp.style.display   = 'none';
  if (dv)   dv.style.display   = 'none';
  [bd, bpl, bvol].forEach(b => b?.classList.remove('active'));

  if (tool === 'dplane') {
    if (dp) dp.style.display = 'block';
    bpl?.classList.add('active');
    dplaneInit();
  } else if (tool === 'dvol') {
    if (dv) dv.style.display = 'block';
    bvol?.classList.add('active');
    dvolInit();
  } else {
    if (tabs) tabs.style.display = '';
    if (mc)   mc.style.display   = '';
    bd?.classList.add('active');
  }
}
// FIN DVOL v3.0
