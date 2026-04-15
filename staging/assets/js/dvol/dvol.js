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
  const today = new Date(); today.setHours(0,0,0,0);
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

// Priorité 1 : ref_sinistre stockée directement dans dvol_dossiers
// Priorité 2 : chercher dans allDossiers dispatch par dispatch_dossier_id
// Fallback   : afficher 'ID:xxx' si rien trouvé
function dvolGetRefSinistre(dispatchDossierIdOrObj) {
  if (dispatchDossierIdOrObj && typeof dispatchDossierIdOrObj === 'object') {
    if (dispatchDossierIdOrObj.ref_sinistre) return dispatchDossierIdOrObj.ref_sinistre;
    const id = dispatchDossierIdOrObj.dispatch_dossier_id;
    if (!id) return '—';
    const d = (allDossiers || []).find(x => String(x.id) === String(id));
    return d ? d.ref_sinistre : ('ID:' + id);
  }
  if (!dispatchDossierIdOrObj) return '—';
  const dv = (dvolDossiers || []).find(x => String(x.dispatch_dossier_id) === String(dispatchDossierIdOrObj));
  if (dv && dv.ref_sinistre) return dv.ref_sinistre;
  const d = (allDossiers || []).find(x => String(x.id) === String(dispatchDossierIdOrObj));
  return d ? d.ref_sinistre : ('ID:' + dispatchDossierIdOrObj);
}

// Calcule les dates prévisionnelles
function dvolCalcDatesPrev(dateDeclaration, decalageJours = 0) {
  if (!dateDeclaration) return {};
  const dates = {};
  for (const e of DVOL_ETAPES_DEF) {
    const dateCalc = dvolAddDays(dateDeclaration, e.delai + decalageJours);
    dates[e.slug] = dvolDecalerOuvre(dateCalc);
  }
  return dates;
}

function dvolGetEtapes(dossierEtapes, dateDeclaration, decalageJours) {
  const datesPrev = dvolCalcDatesPrev(dateDeclaration, decalageJours || 0);
  return DVOL_ETAPES_DEF.map(def => {
    const row = (dossierEtapes || []).find(e => e.slug === def.slug);
    return {
      ...def,
      date_prevue:   row ? row.date_prevue   : (datesPrev[def.slug] || null),
      date_realisee: row ? row.date_realisee : null,
      statut:        row ? row.statut        : (def.ordre === 1 ? 'realise' : 'en_attente'),
      date_report:   row ? row.date_report   : null,
      commentaire:   row ? row.commentaire   : null,
      id:            row ? row.id            : null
    };
  });
}

function dvolGetRole() {
  if (!currentUserData) return 'gestionnaire';
  return (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
}

// ────────────────────────────────────────────────────────────
// RÈGLE J+30
// ────────────────────────────────────────────────────────────
function dvolPeutRegler(dateDeclaration) {
  const jours = dvolJours(dateDeclaration);
  return jours !== null && jours >= 30;
}

// ────────────────────────────────────────────────────────────
// ALERTES
// ────────────────────────────────────────────────────────────

function dvolGetAlertes(dossiers) {
  const alertes = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const ordreUrgence = { haute: 2, moyenne: 1, normale: 0 };

  for (const d of dossiers) {
    if (['clos','refuse','labtaf','vehicule_retrouve'].includes(d.statut)) continue;
    const jours = dvolJours(d.date_declaration);
    if (jours === null) continue;

    const ref = dvolGetRefSinistre(d);
    const recusList = dvolGetDocsRecus(d);
    const docsObligManquants = DVOL_DOCS_OBLIGATOIRES.filter(doc => !recusList.includes(doc.key)).length;
    const decalage = d.decalage_jours || 0;
    const etapes = dvolGetEtapes(d._etapes || [], d.date_declaration, decalage);

    const anomalies = [];
    let urgenceMax = 'normale';

    for (const etape of etapes) {
      if (etape.statut === 'realise' || etape.statut === 'annule') continue;
      if (!etape.date_prevue) continue;
      const dateNotif = dvolDecalerOuvre(etape.date_report || etape.date_prevue);
      const dateL = new Date(dateNotif + 'T12:00:00');
      if (dateL > today) continue;
      const joursRetard = Math.floor((today - dateL) / 86400000);

      let label = '', urgence = 'normale';
      if (etape.slug === 'validation_docs') {
        if (docsObligManquants > 0) {
          label = `Documents manquants (${docsObligManquants})`;
          urgence = joursRetard >= 5 ? 'haute' : 'normale';
        } else {
          label = 'Documents à valider';
          urgence = 'normale';
        }
      } else if (etape.slug === 'lancement_expertise') {
        label = 'Expertise à lancer';
        urgence = joursRetard >= 3 ? 'haute' : 'moyenne';
      } else if (etape.slug === 'reception_rapport') {
        label = 'Rapport attendu';
        urgence = joursRetard >= 5 ? 'haute' : 'normale';
      } else if (etape.slug === 'reglement') {
        label = 'Règlement à initier';
        urgence = 'haute';
      }

      if (label) {
        anomalies.push({ label, urgence });
        if (ordreUrgence[urgence] > ordreUrgence[urgenceMax]) urgenceMax = urgence;
      }
    }

    if (anomalies.length > 0) {
      const messageResume = anomalies.length === 1
        ? `J+${jours} — ${anomalies[0].label}`
        : `J+${jours} — ${anomalies.length} actions requises`;
      alertes.push({
        dossier: d,
        message: messageResume,
        detail: `${ref} · ${d.compagnie_mere || d.compagnie}`,
        urgence: urgenceMax,
        anomalies
      });
    }
  }

  const ordre = { haute: 0, moyenne: 1, normale: 2 };
  alertes.sort((a, b) => (ordre[a.urgence]??3) - (ordre[b.urgence]??3));
  return alertes;
}

function dvolGetAlertesForMatin() { return dvolGetAlertes(dvolDossiers); }

const DVOL_URGENCE_STYLES = {
  haute:   { border:'#dc2626', bg:'#fef2f2', color:'#dc2626', icon:'🔴' },
  moyenne: { border:'#d97706', bg:'#fffbeb', color:'#d97706', icon:'⚠️' },
  normale: { border:'#e5e7eb', bg:'#f9fafb', color:'#374151', icon:'📋' }
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
    const sousDetail = a.anomalies.length > 1
      ? `<div style="font-size:10px;color:#9ca3af;margin-top:3px;">${a.anomalies.map(x => x.label).join(' · ')}</div>`
      : '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;background:${s.bg};border:1.5px solid ${s.border};">
      <span style="font-size:18px;flex-shrink:0;">${s.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:${s.color};">${a.message}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">${a.detail}</div>
        ${sousDetail}
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
    const refSin  = dvolGetRefSinistre(d);
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
// FILE D'ARIANE — Chevrons collés, une seule ligne horizontale
//
// Technique :
//   - Conteneur flex en ligne unique, overflow-x:auto, flex-wrap:nowrap
//   - Chaque case a un margin-left négatif pour s'emboîter
//   - Deux divs superposés (position:absolute) simulent le contour coloré
//   - La date est affichée DANS la case, sous le label
//   - Toutes les flèches pointent vers la DROITE (gauche→droite)
// ────────────────────────────────────────────────────────────

function dvolRenderFilAriane(etapes, estCloture) {
  const today = new Date(); today.setHours(0,0,0,0);
  const nbEtapes = etapes.length;
  const BORDER = 2;   // épaisseur contour simulé en px
  const ARROW  = 14;  // largeur de la pointe de flèche en px
  const H      = 58;  // hauteur fixe de chaque case en px

  const cases = etapes.map((e, i) => {
    const fait    = e.statut === 'realise';
    const annule  = e.statut === 'annule';
    const enCours = !fait && !annule && i > 0 && etapes[i-1].statut === 'realise';
    const retard  = !fait && !annule && e.date_prevue && new Date(e.date_prevue+'T12:00:00') < today;
    const isFirst = i === 0;
    const isLast  = i === nbEtapes - 1;

    // Couleur du contour selon état
    let couleur;
    if (annule)       couleur = '#d1d5db';
    else if (fait)    couleur = '#16a34a';
    else if (enCours) couleur = '#1e3a5f';
    else if (retard)  couleur = '#dc2626';
    else              couleur = '#d1d5db'; // en attente

    const textColor = annule ? '#9ca3af' : couleur;
    const bgInner   = annule ? '#f9fafb' : '#ffffff';

    // clip-path couche CONTOUR (pleine taille)
    // Toutes les cases : entrée coupée à gauche (sauf première), sortie en flèche à droite (sauf dernière)
    const shapeOuter = isFirst
      ? (isLast
          ? `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`
          : `polygon(0% 0%, calc(100% - ${ARROW}px) 0%, 100% 50%, calc(100% - ${ARROW}px) 100%, 0% 100%)`)
      : (isLast
          ? `polygon(${ARROW}px 0%, 100% 0%, 100% 100%, ${ARROW}px 100%, 0% 50%)`
          : `polygon(${ARROW}px 0%, calc(100% - ${ARROW}px) 0%, 100% 50%, calc(100% - ${ARROW}px) 100%, ${ARROW}px 100%, 0% 50%)`);

    // clip-path couche FOND (insérée de BORDER px pour simuler le contour)
    const b = BORDER;
    const a = ARROW;
    const shapeInner = isFirst
      ? (isLast
          ? `polygon(${b}px ${b}px, calc(100% - ${b}px) ${b}px, calc(100% - ${b}px) calc(100% - ${b}px), ${b}px calc(100% - ${b}px))`
          : `polygon(${b}px ${b}px, calc(100% - ${a+b}px) ${b}px, calc(100% - ${b}px) 50%, calc(100% - ${a+b}px) calc(100% - ${b}px), ${b}px calc(100% - ${b}px))`)
      : (isLast
          ? `polygon(${a+b}px ${b}px, calc(100% - ${b}px) ${b}px, calc(100% - ${b}px) calc(100% - ${b}px), ${a+b}px calc(100% - ${b}px), ${b}px 50%)`
          : `polygon(${a+b}px ${b}px, calc(100% - ${a+b}px) ${b}px, calc(100% - ${b}px) 50%, calc(100% - ${a+b}px) calc(100% - ${b}px), ${a+b}px calc(100% - ${b}px), ${b}px 50%)`);

    // Date à afficher sous le label
    let dateLbl = '';
    if (annule) {
      dateLbl = `<span style="font-size:9px;color:#9ca3af;font-style:italic;">Annulée</span>`;
    } else if (fait) {
      dateLbl = `<span style="font-size:9px;color:#16a34a;">✅ ${dvolFmtDate(e.date_realisee||e.date_prevue)}</span>`;
    } else if (e.date_report) {
      dateLbl = `<span style="font-size:9px;color:#d97706;">📅 ${dvolFmtDate(e.date_report)}</span>`;
    } else {
      dateLbl = `<span style="font-size:9px;color:${retard?'#dc2626':'#9ca3af'};">${dvolFmtDate(e.date_prevue)}</span>`;
    }

    // margin-left négatif pour coller les cases (sauf première)
    const marginLeft = isFirst ? '0' : `-${ARROW}px`;
    const zIndex     = nbEtapes - i;
    const padL       = isFirst ? '12px' : `${ARROW + 8}px`;
    const padR       = isLast  ? '12px' : `${ARROW + 8}px`;

    return `<div style="
        position:relative;
        flex:1;
        min-width:80px;
        height:${H}px;
        margin-left:${marginLeft};
        z-index:${zIndex};
        ${annule ? 'opacity:.55;' : ''}
        cursor:default;
      " title="${e.label}">
      <!-- Couche 1 : contour coloré -->
      <div style="position:absolute;inset:0;clip-path:${shapeOuter};background:${couleur};"></div>
      <!-- Couche 2 : fond blanc inséré -->
      <div style="position:absolute;inset:0;clip-path:${shapeInner};background:${bgInner};"></div>
      <!-- Texte : label + date empilés, centrés -->
      <div style="
        position:absolute;inset:0;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:4px ${padR} 4px ${padL};
        box-sizing:border-box;
        gap:2px;
        ${annule ? 'text-decoration:line-through;' : ''}
      ">
        <span style="font-size:11px;font-weight:700;color:${textColor};text-align:center;line-height:1.2;white-space:normal;word-break:break-word;overflow-wrap:anywhere;">
          ${fait ? '✓ ' : enCours ? '● ' : ''}${e.label}
        </span>
        <span style="font-size:9px;text-align:center;line-height:1.2;">${dateLbl}</span>
      </div>
    </div>`;
  }).join('');

  return `<div style="
    display:flex;
    flex-direction:row;
    flex-wrap:nowrap;
    align-items:stretch;
    width:100%;
    overflow-x:auto;
    margin-bottom:20px;
    height:${H}px;
  ">${cases}</div>`;
}

// ────────────────────────────────────────────────────────────
// SECTION DOCUMENTS
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
    <div style="border:1.5px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:8px;">
      <button onclick="dvolToggleSection('dvol-docs-oblig-${id}',this)" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border:none;cursor:pointer;font-size:13px;font-weight:700;color:var(--navy);">
        <span>📎 Obligatoires <span style="font-size:11px;font-weight:600;color:${tousObligRecus?'#16a34a':'#d97706'};">(${DVOL_DOCS_OBLIGATOIRES.filter(d=>recusList.includes(d.key)).length}/${DVOL_DOCS_OBLIGATOIRES.length})</span></span>
        <span class="dvol-chevron" style="font-size:12px;transition:transform .2s;">${tousObligRecus?'▶':'▼'}</span>
      </button>
      <div id="dvol-docs-oblig-${id}" style="display:${tousObligRecus?'none':'flex'};flex-direction:column;gap:6px;padding:10px;">
        ${DVOL_DOCS_OBLIGATOIRES.map(docRow).join('')}
      </div>
    </div>
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
// MODALE CONFIRMATION GÉNÉRIQUE
// ────────────────────────────────────────────────────────────

function dvolConfirmer({ titre, message, labelOk = 'Confirmer', dangereux = false, onConfirm }) {
  document.getElementById('dvol-confirm-modal')?.remove();
  const m = document.createElement('div');
  m.id = 'dvol-confirm-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:6000;display:flex;align-items:center;justify-content:center;padding:16px;';
  const btnColor = dangereux ? '#dc2626' : '#2563eb';
  const btnBg    = dangereux ? '#fef2f2' : '#eff6ff';
  m.innerHTML = `
  <div style="background:white;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.25);width:100%;max-width:420px;overflow:hidden;">
    <div style="padding:22px 24px 0;">
      <div style="font-size:16px;font-weight:800;color:var(--navy,#1a2e4a);margin-bottom:10px;">${titre}</div>
      <div style="font-size:13px;color:#374151;line-height:1.6;">${message}</div>
    </div>
    <div style="display:flex;gap:8px;padding:20px 24px;justify-content:flex-end;">
      <button onclick="document.getElementById('dvol-confirm-modal').remove()" class="btn btn-secondary" style="padding:8px 20px;">Annuler</button>
      <button id="dvol-confirm-ok" style="padding:8px 20px;border-radius:8px;border:1.5px solid ${btnColor};background:${btnBg};color:${btnColor};font-weight:700;cursor:pointer;font-size:13px;">${labelOk}</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  document.getElementById('dvol-confirm-ok').onclick = () => { m.remove(); onConfirm(); };
}

// ────────────────────────────────────────────────────────────
// MODALE DÉTAIL DOSSIER — centrée
// ────────────────────────────────────────────────────────────

async function dvolOuvrirDossier(id) {
  const d = dvolDossiers.find(x => x.id === id);
  if (!d) return;

  const role = dvolGetRole();
  const isAdmin   = role === 'admin';
  const isManager = ['manager','admin'].includes(role);
  const canEdit   = true;

  const { data: suiviRows } = await db.from('dvol_suivi_etapes')
    .select('*').eq('dossier_id', id).order('date_prevue', { ascending: true });

  d._etapes = suiviRows || [];
  const estCloture = ['clos','vehicule_retrouve'].includes(d.statut);
  const etapes = dvolGetEtapes(d._etapes, d.date_declaration, d.decalage_jours || 0);
  const jours  = dvolJours(d.date_declaration);
  const gest   = d.gestionnaire_id ? (allUsers||[]).find(u => u.id === d.gestionnaire_id) : null;
  const refSin = dvolGetRefSinistre(d);

  document.getElementById('dvol-detail-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'dvol-detail-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:4000;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:24px 16px;';

  const statutHtml = isAdmin
    ? `<select id="dvol-edit-statut" style="font-size:13px;font-weight:600;border:none;background:transparent;color:var(--navy);cursor:pointer;width:100%;">${Object.entries(DVOL_STATUTS).map(([k,v])=>`<option value="${k}" ${d.statut===k?'selected':''}>${v.label}</option>`).join('')}</select>`
    : dvolBadgeStatut(d.statut);

  const gestNomAff = gest ? gest.prenom+' '+gest.nom : '— Non assigné —';
  const gestOptions = (allUsers||[]).filter(u=>u.actif!==false).map(u=>
    `<option value="${u.id}" ${d.gestionnaire_id===u.id?'selected':''}>${u.prenom} ${u.nom}</option>`).join('');
  const gestHtml = `
    <div style="display:flex;align-items:center;gap:6px;">
      <span id="dvol-gest-label" style="font-size:13px;font-weight:600;color:var(--navy);">${gestNomAff}</span>
      ${isManager ? `<button onclick="dvolToggleGestEdit('${id}')" title="Modifier le gestionnaire" style="background:none;border:none;cursor:pointer;color:#6b7280;padding:2px 4px;font-size:14px;line-height:1;border-radius:4px;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#6b7280'">✏️</button>` : ''}
    </div>
    <select id="dvol-edit-gestionnaire" style="display:none;font-size:13px;font-weight:600;border:1.5px solid #93c5fd;border-radius:6px;padding:4px 8px;color:var(--navy);margin-top:4px;width:100%;" onchange="dvolSauvegarderGestionnaire('${id}',this.value)">
      <option value="">— Non assigné —</option>${gestOptions}
    </select>`;

  const retrouveHtml = `
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
      <input type="checkbox" id="dvol-edit-retrouve" ${d.vehicule_retrouve_confirme?'checked':''} ${estCloture && !isAdmin ? 'disabled' : ''} style="accent-color:var(--rose);width:16px;height:16px;" onchange="dvolOnRetrouve('${id}',this)">
      <span style="font-size:13px;font-weight:600;">${d.vehicule_retrouve_confirme?'Oui':'Non'}</span>
    </label>`;

  const bandeauCloture = estCloture
    ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;"><span style="font-size:20px;">✅</span><div><div style="font-weight:700;color:#16a34a;font-size:13px;">Dossier clôturé</div><div style="font-size:12px;color:#6b7280;">Plus aucune action requise sur ce dossier.</div></div></div>`
    : '';

  const compagnieNorm = (d.compagnie_mere || d.compagnie || '').toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');
  const compagniesAvecProc = ['CMAM','ALLIANZ','EQUITE'];
  const btnProcedure = compagniesAvecProc.includes(compagnieNorm)
    ? `<div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><button class="btn btn-secondary" onclick="window.open('https://outilsdevsin.github.io/DSP/staging/procedures/DVOL/${compagnieNorm}.pdf','_blank')">📄 Procédure expertise</button></div>`
    : '';

  overlay.innerHTML = `...TRONQUE...`;
  document.body.appendChild(overlay);
}
