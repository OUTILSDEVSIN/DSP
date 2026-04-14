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

// Priorité 1 : ref_sinistre stockée directement dans dvol_dossiers (colonne ajoutée étape 1)
// Priorité 2 : chercher dans allDossiers dispatch par dispatch_dossier_id
// Fallback   : afficher 'ID:xxx' si rien trouvé
function dvolGetRefSinistre(dispatchDossierIdOrObj) {
  // Appelé avec l'objet dvol_dossier complet (cas tableau et alertes)
  if (dispatchDossierIdOrObj && typeof dispatchDossierIdOrObj === 'object') {
    if (dispatchDossierIdOrObj.ref_sinistre) return dispatchDossierIdOrObj.ref_sinistre;
    const id = dispatchDossierIdOrObj.dispatch_dossier_id;
    if (!id) return '—';
    const d = (allDossiers || []).find(x => String(x.id) === String(id));
    return d ? d.ref_sinistre : ('ID:' + id);
  }
  // Appelé avec un simple ID (rétrocompatibilité)
  if (!dispatchDossierIdOrObj) return '—';
  // Chercher d'abord dans dvolDossiers si la ref est déjà stockée
  const dv = (dvolDossiers || []).find(x => String(x.dispatch_dossier_id) === String(dispatchDossierIdOrObj));
  if (dv && dv.ref_sinistre) return dv.ref_sinistre;
  // Fallback : chercher dans allDossiers dispatch
  const d = (allDossiers || []).find(x => String(x.id) === String(dispatchDossierIdOrObj));
  return d ? d.ref_sinistre : ('ID:' + dispatchDossierIdOrObj);
}

// Calcule les dates prévisionnelles en tenant compte des jours ouvrés pour les notifications
function dvolCalcDatesPrev(dateDeclaration, decalageJours = 0) {
  if (!dateDeclaration) return {};
  const dates = {};
  for (const e of DVOL_ETAPES_DEF) {
    const dateCalc = dvolAddDays(dateDeclaration, e.delai + decalageJours);
    // Les notifications sont décalées au lundi si elles tombent sam/dim
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
// RÈGLE J+30 — Le règlement est interdit avant J+30 calendaires
// depuis la date de déclaration, sans exception.
// ────────────────────────────────────────────────────────────
function dvolPeutRegler(dateDeclaration) {
  const jours = dvolJours(dateDeclaration);
  return jours !== null && jours >= 30;
}

// ────────────────────────────────────────────────────────────
// ALERTES — 1 entrée par dossier, même si plusieurs anomalies
// Le gestionnaire consulte le détail en ouvrant le dossier.
// ────────────────────────────────────────────────────────────

function dvolGetAlertes(dossiers) {
  const alertes = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const ordreUrgence = { haute: 2, moyenne: 1, normale: 0 };

  for (const d of dossiers) {
    if (['clos','refuse','labtaf','vehicule_retrouve'].includes(d.statut)) continue;
    const jours = dvolJours(d.date_declaration);
    if (jours === null) continue;

    // On passe l'objet complet pour profiter de la ref_sinistre stockée
    const ref = dvolGetRefSinistre(d);
    const recusList = dvolGetDocsRecus(d);
    const docsObligManquants = DVOL_DOCS_OBLIGATOIRES.filter(doc => !recusList.includes(doc.key)).length;
    const decalage = d.decalage_jours || 0;
    const etapes = dvolGetEtapes(d._etapes || [], d.date_declaration, decalage);

    // Collecter toutes les anomalies de ce dossier
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

    // Une seule ligne par dossier, même si plusieurs anomalies détectées
    if (anomalies.length > 0) {
      const messageResume = anomalies.length === 1
        ? `J+${jours} — ${anomalies[0].label}`
        : `J+${jours} — ${anomalies.length} actions requises`;
      alertes.push({
        dossier: d,
        message: messageResume,
        detail: `${ref} · ${d.compagnie_mere || d.compagnie}`,
        urgence: urgenceMax,
        anomalies // disponible pour affichage dans la fiche dossier
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
    // Sous-détail : liste des anomalies si plusieurs
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
    // On passe l'objet complet pour lire ref_sinistre directement
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
// FILE D'ARIANE — Style chevrons (cases fléchées)
// ────────────────────────────────────────────────────────────

function dvolRenderFilAriane(etapes, estCloture) {
  const today = new Date(); today.setHours(0,0,0,0);
  const nbEtapes = etapes.length;

  return `<div style="display:flex;align-items:stretch;width:100%;margin-bottom:20px;overflow-x:auto;">
    ${etapes.map((e, i) => {
      const fait    = e.statut === 'realise';
      const annule  = e.statut === 'annule';
      const enCours = !fait && !annule && i > 0 && etapes[i-1].statut === 'realise';
      const retard  = !fait && !annule && e.date_prevue && new Date(e.date_prevue+'T12:00:00') < today;
      const isLast  = i === nbEtapes - 1;

      let bg, textColor, borderColor;
      if (annule) {
        bg = '#e5e7eb'; textColor = '#9ca3af'; borderColor = '#d1d5db';
      } else if (fait) {
        bg = '#16a34a'; textColor = '#ffffff'; borderColor = '#15803d';
      } else if (enCours) {
        bg = '#1e3a5f'; textColor = '#ffffff'; borderColor = '#1e3a5f';
      } else if (retard) {
        bg = '#fef2f2'; textColor = '#dc2626'; borderColor = '#fca5a5';
      } else {
        // En attente — gris neutre (anciennement vert clair)
        bg = '#f3f4f6'; textColor = '#9ca3af'; borderColor = '#e5e7eb';
      }

      let dateLbl = '';
      if (annule) {
        dateLbl = '<span style="font-size:9px;color:#9ca3af;font-style:italic;">Annulée</span>';
      } else if (fait) {
        dateLbl = `<span style="font-size:9px;color:#16a34a;">✅ ${dvolFmtDate(e.date_realisee||e.date_prevue)}</span>`;
      } else if (e.date_report) {
        dateLbl = `<span style="font-size:9px;color:#d97706;">📅 ${dvolFmtDate(e.date_report)}</span>`;
      } else {
        dateLbl = `<span style="font-size:9px;color:${retard?'#dc2626':'#9ca3af'};">${dvolFmtDate(e.date_prevue)}</span>`;
      }

      const clipPathFirst = isLast
        ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
        : 'polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%)';
      const clipPathMiddle = isLast
        ? 'polygon(12px 0%, 100% 0%, 100% 100%, 12px 100%, 0% 50%)'
        : 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)';

      const shape = i === 0 ? clipPathFirst : clipPathMiddle;
      const marginLeft = i === 0 ? '0' : '-10px';

      return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;z-index:${nbEtapes - i};">
        <div style="
          width:100%;
          clip-path:${shape};
          background:${bg};
          border:none;
          margin-left:${marginLeft};
          padding:10px 18px 10px ${i===0?'14px':'22px'};
          display:flex;
          align-items:center;
          justify-content:center;
          box-sizing:border-box;
          min-height:56px;
          position:relative;
          ${annule?'text-decoration:line-through;opacity:.6;':''}
        ">
          <span style="font-size:11px;font-weight:700;color:${textColor};text-align:center;line-height:1.3;white-space:normal;word-break:break-word;overflow-wrap:anywhere;">
            ${fait ? '✓ ' : enCours ? '● ' : ''}${e.label}
          </span>
        </div>
        <div style="margin-top:4px;text-align:center;padding:0 4px;">${dateLbl}</div>
      </div>`;
    }).join('')}
  </div>`;
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
  // On passe l'objet complet pour lire ref_sinistre directement
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
    ? `<div style="display:flex;justify-content:flex-end;margin-top:4px;">
        <button
          onclick="dvolOuvrirProcedure('${d.compagnie_mere||d.compagnie}')"
          style="display:inline-flex;align-items:center;gap:6px;background:#6366f1;color:white;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;transition:background .2s;"
          onmouseover="this.style.background='#4f46e5'" onmouseout="this.style.background='#6366f1'"
          title="Consulter la procédure d'expertise pour ${d.compagnie_mere||d.compagnie}">
          📋 Procédure expertise
        </button>
      </div>`
    : '';

  overlay.innerHTML = `
  <div style="background:white;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.2);width:100%;max-width:780px;overflow:hidden;max-height:calc(100vh - 48px);display:flex;flex-direction:column;">
    <div style="background:linear-gradient(135deg,var(--navy,#1a2e4a),#2a4a6e);color:white;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0;">
      <div>
        <div style="font-size:18px;font-weight:800;">${refSin}</div>
        <div style="font-size:13px;opacity:.8;margin-top:2px;">${d.compagnie_mere||d.compagnie||'—'} · ${dvolBadgeJours(jours)}</div>
      </div>
      <button onclick="document.getElementById('dvol-detail-modal').remove()" style="background:rgba(255,255,255,.15);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">×</button>
    </div>
    <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;">
      ${bandeauCloture}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
        <div style="background:#f9fafb;border-radius:10px;padding:12px;"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Statut</div>${statutHtml}</div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;position:relative;"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Gestionnaire</div>${gestHtml}</div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Date déclaration</div><span style="font-size:13px;font-weight:600;">${d.date_declaration ? new Date(d.date_declaration+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : '—'}</span></div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Véhicule retrouvé ?</div>${retrouveHtml}</div>
      </div>
      ${btnProcedure}
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 12px;">🗺️ Avancement du dossier</h3>
        ${dvolRenderFilAriane(etapes, estCloture)}
        <div id="dvol-etapes-actions">${estCloture ? '' : dvolRenderEtapesActions(etapes, id, d)}</div>
      </div>
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 10px;">📎 Documents</h3>
        ${dvolRenderDocs(d, canEdit && !estCloture)}
      </div>
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 8px;">💬 Notes</h3>
        <textarea id="dvol-edit-notes" rows="3" style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;">${d.notes||''}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px;border-top:1px solid #f3f4f6;">
        <button onclick="document.getElementById('dvol-detail-modal').remove()" class="btn btn-secondary">Fermer</button>
        <button onclick="dvolSauvegarderEdition('${id}')" class="btn btn-primary">💾 Enregistrer</button>
      </div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function dvolToggleGestEdit(dossierId) {
  const sel = document.getElementById('dvol-edit-gestionnaire');
  const lbl = document.getElementById('dvol-gest-label');
  if (!sel) return;
  const isHidden = sel.style.display === 'none';
  sel.style.display = isHidden ? 'block' : 'none';
  if (lbl) lbl.style.display = isHidden ? 'none' : 'inline';
}

async function dvolSauvegarderGestionnaire(dossierId, valeur) {
  const gestId = valeur ? parseInt(valeur) : null;
  const { error } = await db.from('dvol_dossiers').update({ gestionnaire_id: gestId, updated_at: new Date().toISOString() }).eq('id', dossierId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  showNotif('✅ Gestionnaire mis à jour', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

function dvolOnRetrouve(dossierId, checkbox) {
  if (!checkbox.checked) { checkbox.checked = true; return; }
  checkbox.checked = false;
  dvolConfirmer({
    titre: '🚗 Véhicule retrouvé',
    message: 'Confirmer que le véhicule a été retrouvé ?<br><br><strong>Cette action est irréversible.</strong> Elle clôturera le suivi VOL et annulera toutes les étapes restantes.',
    labelOk: '✅ Confirmer', dangereux: true,
    onConfirm: () => dvolCloturerRetrouve(dossierId)
  });
}

async function dvolCloturerRetrouve(dossierId) {
  const d = dvolDossiers.find(x => x.id === dossierId);
  if (!d) return;
  await db.from('dvol_dossiers').update({ statut: 'vehicule_retrouve', vehicule_retrouve_confirme: true, date_vehicule_retrouve: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', dossierId);
  const etapes = dvolGetEtapes(d._etapes || [], d.date_declaration, d.decalage_jours || 0);
  for (const etape of etapes) {
    if (etape.statut === 'realise') continue;
    if (etape.id) {
      await db.from('dvol_suivi_etapes').update({ statut: 'annule', updated_at: new Date().toISOString() }).eq('id', etape.id);
    } else {
      const def = DVOL_ETAPES_DEF.find(e => e.slug === etape.slug);
      await db.from('dvol_suivi_etapes').insert({ dossier_id: dossierId, slug: etape.slug, label: def?.label || etape.slug, date_prevue: etape.date_prevue, statut: 'annule', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
  }
  showNotif('✅ Dossier clôturé — Véhicule retrouvé', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

// ────────────────────────────────────────────────────────────
// ACTIONS ÉTAPES — avec tous les blocages
// ────────────────────────────────────────────────────────────

function dvolRenderEtapesActions(etapes, dossierId, dossier) {
  const today = new Date(); today.setHours(0,0,0,0);
  const etapeCourante = etapes.find(e => e.statut !== 'realise' && e.statut !== 'annule');
  if (!etapeCourante) return `<div style="text-align:center;padding:8px;color:#16a34a;font-size:13px;font-weight:700;">✅ Toutes les étapes sont complétées !</div>`;

  const dateLimite = etapeCourante.date_report || etapeCourante.date_prevue;
  const echeanceAtteinte = dateLimite ? new Date(dateLimite + 'T12:00:00') <= today : true;

  if (!echeanceAtteinte) {
    return `<div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:22px;">🕐</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:#0369a1;">📍 Étape en cours : ${etapeCourante.label}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Prochaine étape prévue le <strong>${dvolFmtDate(dateLimite)}</strong></div>
      </div>
    </div>`;
  }

  if (etapeCourante.slug === 'reglement' && dossier && !dvolPeutRegler(dossier.date_declaration)) {
    const joursRestants = 30 - (dvolJours(dossier.date_declaration) || 0);
    return `<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:22px;">🔒</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:#dc2626;">Règlement impossible avant J+30</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Le règlement ne peut pas être effectué avant 30 jours depuis la déclaration.<br>Il reste <strong>${joursRestants} jour${joursRestants>1?'s':''}</strong> avant d'être autorisé.</div>
      </div>
    </div>`;
  }

  if (etapeCourante.slug === 'lancement_expertise' && dossier) {
    const recusList = dvolGetDocsRecus(dossier);
    const manquants = DVOL_DOCS_OBLIGATOIRES.filter(d => !recusList.includes(d.key));
    if (manquants.length > 0) {
      return `<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="font-size:22px;">🔒</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:#dc2626;">Expertise bloquée — Documents manquants</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">Tous les documents obligatoires doivent être reçus avant de lancer l'expertise.</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${manquants.map(m => `<div style="font-size:12px;color:#dc2626;padding:4px 8px;background:#fff5f5;border-radius:6px;">❌ ${m.icon} ${m.label}</div>`).join('')}
        </div>
      </div>`;
    }
  }

  let html = `<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:14px 16px;">`;
  html += `<div style="font-size:12px;font-weight:700;color:#2563eb;margin-bottom:10px;">📍 Étape en cours : ${etapeCourante.label}</div>`;

  if (etapeCourante.slug === 'declaration') {
    html += `<button onclick="dvolDemanderConfirmEtape('${dossierId}','declaration','Déclaration enregistrée','Confirmer que la déclaration a bien été enregistrée ?')" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">✅ Marquer déclaration enregistrée</button>`;
  } else if (etapeCourante.slug === 'validation_docs') {
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;"><button onclick="dvolDemanderConfirmEtape('${dossierId}','validation_docs','Documents confirmés','Confirmer la réception et validation de tous les documents ?')" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">✅ Confirmer docs reçus</button><button onclick="dvolDemanderRelance('${dossierId}')" class="btn" style="font-size:12px;padding:7px 16px;background:#fef3c7;border:1.5px solid #d97706;color:#92400e;">🔄 Relancer (+X jours)</button></div>`;
  } else if (etapeCourante.slug === 'lancement_expertise') {
    html += `<button onclick="dvolDemanderConfirmEtape('${dossierId}','lancement_expertise','Expertise lanc&#233;e','Confirmer le lancement de l&#39;expertise ?')" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">🔍 Confirmer lancement expertise</button>`;
  } else if (etapeCourante.slug === 'reception_rapport') {
    html += `<button onclick="dvolDemanderConfirmEtape('${dossierId}','reception_rapport','Rapport re&#231;u','Confirmer la r&#233;ception du rapport d&#39;expertise ?')" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">📋 Confirmer réception rapport</button>`;
  } else if (etapeCourante.slug === 'reglement') {
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;"><button onclick="dvolDemanderConfirmEtape('${dossierId}','reglement','R&#232;glement effectu&#233;','Confirmer que le r&#232;glement a bien &#233;t&#233; effectu&#233; ? Cette action cl&#244;turera le dossier.')" class="btn btn-primary" style="font-size:12px;padding:7px 16px;">💰 Confirmer règlement effectué</button><button onclick="dvolDemanderReport('${dossierId}','reglement')" class="btn" style="font-size:12px;padding:7px 16px;background:#f5f3ff;border:1.5px solid #7c3aed;color:#5b21b6;">📅 Reporter le règlement</button></div>`;
  }
  html += `</div>`;
  return html;
}

function dvolDemanderConfirmEtape(dossierId, slug, titre, message) {
  dvolConfirmer({ titre, message, labelOk: '✅ Confirmer', dangereux: false, onConfirm: () => dvolValiderEtape(dossierId, slug, null) });
}

async function dvolValiderEtape(dossierId, slug, commentaire) {
  const today = new Date().toISOString().split('T')[0];
  const d = dvolDossiers.find(x => x.id === dossierId);
  if (!d) return;

  if (slug === 'reglement' && !dvolPeutRegler(d.date_declaration)) {
    showNotif('🔒 Règlement impossible — J+30 non atteint', 'error');
    return;
  }

  const { data: existing } = await db.from('dvol_suivi_etapes').select('id').eq('dossier_id', dossierId).eq('slug', slug).single();
  const payload = { statut: 'realise', date_realisee: today, updated_at: new Date().toISOString() };
  if (commentaire) payload.commentaire = commentaire;
  if (existing) {
    await db.from('dvol_suivi_etapes').update(payload).eq('id', existing.id);
  } else {
    const def = DVOL_ETAPES_DEF.find(e => e.slug === slug);
    const datePrevue = def ? dvolAddDays(d.date_declaration, def.delai + (d.decalage_jours||0)) : today;
    await db.from('dvol_suivi_etapes').insert({ dossier_id: dossierId, slug, label: def?.label || slug, date_prevue: datePrevue, ...payload });
  }
  const statutMap = { validation_docs:'en_cours_expertise', lancement_expertise:'en_cours_expertise', reception_rapport:'en_attente_cloture', reglement:'clos' };
  if (statutMap[slug]) await db.from('dvol_dossiers').update({ statut: statutMap[slug], updated_at: new Date().toISOString() }).eq('id', dossierId);
  showNotif('✅ Étape validée', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

async function dvolDemanderRelance(dossierId) {
  const jours = parseInt(prompt('Combien de jours supplémentaires pour la relance ?'), 10);
  if (!jours || isNaN(jours) || jours <= 0) return;
  const d = dvolDossiers.find(x => x.id === dossierId);
  if (!d) return;
  const newDecalage = (d.decalage_jours || 0) + jours;
  await db.from('dvol_dossiers').update({ decalage_jours: newDecalage, statut: 'relance', updated_at: new Date().toISOString() }).eq('id', dossierId);
  showNotif(`🔄 Relance enregistrée : +${jours} jours`, 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

async function dvolDemanderReport(dossierId, slug) {
  const dateStr = prompt('Date de report (JJ/MM/AAAA) :');
  if (!dateStr) return;
  const parts = dateStr.split('/');
  if (parts.length !== 3) { showNotif('Format de date invalide', 'error'); return; }
  const isoDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  const d = dvolDossiers.find(x => x.id === dossierId);
  if (!d) return;
  const { data: existing } = await db.from('dvol_suivi_etapes').select('id').eq('dossier_id', dossierId).eq('slug', slug).single();
  const payload = { date_report: isoDate, updated_at: new Date().toISOString() };
  if (existing) {
    await db.from('dvol_suivi_etapes').update(payload).eq('id', existing.id);
  } else {
    const def = DVOL_ETAPES_DEF.find(e => e.slug === slug);
    const datePrevue = def ? dvolAddDays(d.date_declaration, def.delai + (d.decalage_jours||0)) : isoDate;
    await db.from('dvol_suivi_etapes').insert({ dossier_id: dossierId, slug, label: def?.label || slug, date_prevue: datePrevue, statut: 'en_attente', ...payload });
  }
  showNotif(`📅 Report enregistré jusqu'au ${dateStr}`, 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

// ────────────────────────────────────────────────────────────
// SAUVEGARDE / TOGGLE DOC / CHARGEMENT / INIT
// ────────────────────────────────────────────────────────────

async function dvolSauvegarderEdition(dossierId) {
  const statutEl = document.getElementById('dvol-edit-statut');
  const notesEl  = document.getElementById('dvol-edit-notes');
  const updates  = { updated_at: new Date().toISOString() };
  if (statutEl && statutEl.tagName === 'SELECT') updates.statut = statutEl.value;
  if (notesEl) updates.notes = notesEl.value;
  const { error } = await db.from('dvol_dossiers').update(updates).eq('id', dossierId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  showNotif('✅ Modifications enregistrées', 'success');
  document.getElementById('dvol-detail-modal')?.remove();
  await dvolCharger();
}

async function dvolToggleDoc(dossierId, docKey, newVal) {
  const dossier = dvolDossiers.find(d => d.id === dossierId);
  if (!dossier) return;
  let recusList = dvolGetDocsRecus(dossier);
  if (newVal) { if (!recusList.includes(docKey)) recusList.push(docKey); }
  else { recusList = recusList.filter(k => k !== docKey); }
  const tousObligRecus = DVOL_DOCS_OBLIGATOIRES.every(d => recusList.includes(d.key));
  const { error } = await db.from('dvol_dossiers').update({ documents_recus_liste: recusList, documents_recus: tousObligRecus, date_reception_documents: tousObligRecus ? new Date().toISOString().split('T')[0] : null, updated_at: new Date().toISOString() }).eq('id', dossierId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  showNotif(newVal ? '📄 Document marqué reçu' : '📄 Document retiré', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

async function dvolCharger() {
  if (!currentUserData) return;
  const { data, error } = await db.from('dvol_dossiers').select('*').order('date_declaration', { ascending: true });
  if (error) { showNotif('Erreur chargement dossiers VOL : ' + error.message, 'error'); return; }
  dvolDossiers = data || [];
  dvolDossiers.sort((a, b) => {
    const closA = ['clos','refuse','labtaf','vehicule_retrouve'].includes(a.statut);
    const closB = ['clos','refuse','labtaf','vehicule_retrouve'].includes(b.statut);
    if (closA !== closB) return closA ? 1 : -1;
    return (dvolJours(b.date_declaration)??0) - (dvolJours(a.date_declaration)??0);
  });
  dvolRenderAlertes(dvolGetAlertes(dvolDossiers));
  dvolRenderTableau(dvolDossiers);
}

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
// FIN DVOL v3.2
