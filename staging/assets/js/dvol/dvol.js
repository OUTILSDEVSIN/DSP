// ============================================================
// DVOL v2.1 — Gestion des dossiers vol de véhicule
// ============================================================

let dvolDossiers = [];
let dvolEtapesTemplate = [];

// ── 6 documents attendus ──
const DVOL_DOCS = [
  { key: 'questionnaire_vol',    label: 'Questionnaire VOL',       icon: '📋' },
  { key: 'certificat_cession',   label: 'Certificat de cession',   icon: '📄' },
  { key: 'non_gage',             label: 'Non-gage',                icon: '📄' },
  { key: 'controle_technique',   label: 'Contrôle technique',      icon: '🔧' },
  { key: 'facture_achat',        label: 'Facture d\'achat',        icon: '🧾' },
  { key: 'facture_entretien',    label: 'Facture entretien',       icon: '🧾' }
];

// ── Labels statuts ──
const DVOL_STATUTS = {
  declare:               { label: 'Déclaré',               color: '#6b7280', bg: '#f3f4f6' },
  en_attente_documents:  { label: 'Attente documents',     color: '#d97706', bg: '#fffbeb' },
  relance:               { label: 'Relancé',               color: '#f59e0b', bg: '#fef3c7' },
  expertise_necessaire:  { label: 'Expertise nécessaire',  color: '#7c3aed', bg: '#f5f3ff' },
  en_cours_expertise:    { label: 'Expertise en cours',    color: '#2563eb', bg: '#eff6ff' },
  en_attente_cloture:    { label: 'Attente clôture',       color: '#0891b2', bg: '#ecfeff' },
  vehicule_retrouve:     { label: 'Véhicule retrouvé',     color: '#059669', bg: '#ecfdf5' },
  labtaf:                { label: 'LABTAF',                color: '#0891b2', bg: '#ecfeff' },
  refuse:                { label: 'Refusé',                color: '#dc2626', bg: '#fef2f2' },
  clos:                  { label: 'Clôturé',               color: '#374151', bg: '#f9fafb' }
};

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

function dvolJoursDepuisVol(dateDeclaration) {
  if (!dateDeclaration) return null;
  const debut = new Date(dateDeclaration + 'T12:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.floor((today - debut) / (1000 * 60 * 60 * 24));
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
  const recus = DVOL_DOCS.filter(d => recusList.includes(d.key)).length;
  const total = DVOL_DOCS.length;
  const pct = Math.round((recus / total) * 100);
  const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return `<div title="${recus}/${total} documents reçus" style="display:flex;align-items:center;gap:6px;">
    <div style="width:60px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
    </div>
    <span style="font-size:11px;color:${color};font-weight:600;">${recus}/${total}</span>
  </div>`;
}

// ── Récupérer la ref_sinistre depuis allDossiers (dispatch) ──
function dvolGetRefSinistre(dispatchDossierId) {
  if (!dispatchDossierId) return '—';
  const d = (allDossiers || []).find(x => String(x.id) === String(dispatchDossierId));
  return d ? d.ref_sinistre : ('VOL-ID:' + dispatchDossierId);
}

// ────────────────────────────────────────────────────────────
// ALERTES
// ────────────────────────────────────────────────────────────

function dvolGetAlertes(dossiers) {
  const alertes = [];
  const today = new Date(); today.setHours(0,0,0,0);

  for (const d of dossiers) {
    if (['clos','refuse','labtaf'].includes(d.statut)) continue;
    const jours = dvolJoursDepuisVol(d.date_declaration);
    if (jours === null) continue;

    const ref = dvolGetRefSinistre(d.dispatch_dossier_id);
    const recusList = dvolGetDocsRecus(d);
    const docsManquants = DVOL_DOCS.filter(doc => !recusList.includes(doc.key)).length;

    // ── Alerte J+10 : expertise à lancer ──
    if (jours >= 10 && !d.date_lancement_expertise && !d.vehicule_retrouve_confirme) {
      alertes.push({
        dossier: d, type: 'expertise_a_lancer',
        message: `J+${jours} — Expertise à lancer`,
        detail: `${ref} · ${d.compagnie_mere || d.compagnie}`,
        urgence: jours >= 30 ? 'haute' : jours >= 20 ? 'moyenne' : 'normale'
      });
    }
    // ── Alerte J+30 : demande d'indemnisation ──
    if (jours >= 30 && !d.vehicule_retrouve_confirme && d.statut !== 'en_attente_cloture') {
      alertes.push({
        dossier: d, type: 'indemnisation_a_demander',
        message: `J+${jours} — Demande d'indemnisation à initier`,
        detail: `${ref} · ${d.compagnie_mere || d.compagnie}`,
        urgence: 'haute'
      });
    }
    // ── Alerte docs manquants ──
    if (!d.documents_recus && jours >= 5 && docsManquants > 0) {
      alertes.push({
        dossier: d, type: 'docs_manquants',
        message: `Documents manquants (${docsManquants}/6)`,
        detail: `${ref} · J+${jours}`,
        urgence: jours >= 20 ? 'haute' : 'normale'
      });
    }
    // ── Alerte rapport expertise tardif ──
    if (d.date_lancement_expertise && !d.rapport_expertise_recu && !d.vehicule_retrouve_confirme) {
      const jExp = Math.floor((today - new Date(d.date_lancement_expertise + 'T12:00:00')) / 86400000);
      if (jExp >= 7) {
        alertes.push({
          dossier: d, type: 'rapport_manquant',
          message: `Rapport expertise non reçu (J+${jExp} depuis mission)`,
          detail: `${ref} · ${d.compagnie_mere || d.compagnie}`,
          urgence: jExp >= 14 ? 'haute' : 'normale'
        });
      }
    }
    // ── Alerte véhicule retrouvé ──
    if (d.vehicule_retrouve_confirme && d.statut === 'vehicule_retrouve') {
      alertes.push({
        dossier: d, type: 'vehicule_retrouve',
        message: 'Véhicule retrouvé — expertise terrain à planifier',
        detail: ref,
        urgence: 'haute'
      });
    }
  }

  const ordre = { haute: 0, moyenne: 1, normale: 2 };
  alertes.sort((a, b) => (ordre[a.urgence] ?? 3) - (ordre[b.urgence] ?? 3));
  return alertes;
}

const DVOL_ALERTE_ICONS = {
  expertise_a_lancer:        '🔍',
  indemnisation_a_demander:  '💰',
  docs_manquants:            '📄',
  rapport_manquant:          '📋',
  vehicule_retrouve:         '🚗'
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
// TABLEAU LISTE — sans colonne Assuré, ref sinistre en col 1
// ────────────────────────────────────────────────────────────

function dvolRenderTableau(dossiers) {
  const tbody    = document.getElementById('dvol-tbody');
  const compteur = document.getElementById('dvol-compteur');
  if (!tbody) return;
  const actifs = dossiers.filter(d => !['clos','refuse'].includes(d.statut));
  if (compteur) compteur.textContent = `${dossiers.length} dossier${dossiers.length>1?'s':''} (${actifs.length} actif${actifs.length>1?'s':''})`;

  // Mettre à jour l'en-tête du tableau
  const thead = document.querySelector('#dvol-screen table thead tr');
  if (thead) {
    thead.innerHTML = `
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">Réf. sinistre</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Compagnie</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Date vol</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:center;">J+X</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Statut</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Gestionnaire</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Docs</th>
      <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:center;">Actions</th>`;
  }

  if (dossiers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><div style="font-size:24px;margin-bottom:8px;">📂</div>Aucun dossier VOL pour le moment</td></tr>`;
    return;
  }

  tbody.innerHTML = dossiers.map((d, i) => {
    const jours   = dvolJoursDepuisVol(d.date_declaration);
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
// MODALE DÉTAIL DOSSIER
// ────────────────────────────────────────────────────────────

async function dvolOuvrirDossier(id) {
  const d = dvolDossiers.find(x => x.id === id);
  if (!d) return;

  const role = currentUserData ? ((typeof getEffectiveRole==='function')?getEffectiveRole():currentUserData.role) : 'gestionnaire';
  const canEdit = role === 'admin' || role === 'manager';

  const { data: suivi } = await db.from('dvol_suivi_etapes')
    .select('*, dvol_etapes_template(*)')
    .eq('dossier_id', id)
    .order('date_prevue', { ascending: true });

  const etapes = suivi || [];
  const recusList = dvolGetDocsRecus(d);
  const jours = dvolJoursDepuisVol(d.date_declaration);
  const gest = d.gestionnaire_id ? (allUsers||[]).find(u => u.id === d.gestionnaire_id) : null;
  const refSin = dvolGetRefSinistre(d.dispatch_dossier_id);

  document.getElementById('dvol-detail-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'dvol-detail-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:4000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 16px;';

  const docsHtml = DVOL_DOCS.map(doc => {
    const recu = recusList.includes(doc.key);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;background:${recu?'#f0fdf4':'#fef9f0'};border:1px solid ${recu?'#bbf7d0':'#fed7aa'};gap:12px;">
      <span style="font-size:13px;">${doc.icon} ${doc.label}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:12px;font-weight:700;color:${recu?'#16a34a':'#d97706'};">${recu?'✅ Reçu':'⏳ Manquant'}</span>
        ${canEdit ? `<button onclick="dvolToggleDoc('${id}','${doc.key}',${!recu})" style="background:none;border:1px solid ${recu?'#dc2626':'#16a34a'};color:${recu?'#dc2626':'#16a34a'};border-radius:6px;cursor:pointer;font-size:10px;padding:2px 8px;font-weight:600;">${recu?'Retirer':'Marquer reçu'}</button>` : ''}
      </div>
    </div>`;
  }).join('');

  const timelineHtml = etapes.length === 0
    ? `<div style="color:#9ca3af;font-size:13px;text-align:center;padding:16px;">Aucune étape enregistrée pour ce dossier.<br><small>Le suivi démarre à la création du dossier.</small></div>`
    : etapes.map(e => {
        const fait = e.statut === 'realise';
        const enAlerte = e.statut === 'alerte_envoyee';
        const prevue = e.date_prevue ? new Date(e.date_prevue+'T12:00:00').toLocaleDateString('fr-FR') : '—';
        const realisee = e.date_realisee ? new Date(e.date_realisee+'T12:00:00').toLocaleDateString('fr-FR') : null;
        const icon = fait ? '✅' : enAlerte ? '🔔' : '⏳';
        const bordColor = fait ? '#16a34a' : enAlerte ? '#d97706' : '#e5e7eb';
        return `<div style="display:flex;gap:12px;padding:10px 14px;border-radius:8px;border:1.5px solid ${bordColor};background:${fait?'#f0fdf4':enAlerte?'#fffbeb':'#f9fafb'};">
          <span style="font-size:20px;flex-shrink:0;margin-top:2px;">${icon}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--navy);">${e.dvol_etapes_template?.label||'Étape'}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">${e.dvol_etapes_template?.description||''}</div>
            <div style="font-size:11px;margin-top:6px;color:#374151;">📅 Prévue : ${prevue}${realisee?' · ✅ Réalisée : '+realisee:''}</div>
            ${e.commentaire ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;font-style:italic;">💬 ${e.commentaire}</div>` : ''}
          </div>
          ${canEdit && !fait ? `<button onclick="dvolMarquerEtapeFaite('${e.id}','${id}')" style="align-self:center;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;padding:6px 12px;white-space:nowrap;">✅ Fait</button>` : ''}
        </div>`;
      }).join('');

  const statutOptions = Object.entries(DVOL_STATUTS).map(([k,v]) =>
    `<option value="${k}" ${d.statut===k?'selected':''}>${v.label}</option>`
  ).join('');

  const gestOptions = (allUsers||[]).filter(u=>u.actif!==false).map(u =>
    `<option value="${u.id}" ${d.gestionnaire_id===u.id?'selected':''}>${u.prenom} ${u.nom}</option>`
  ).join('');

  overlay.innerHTML = `
  <div style="background:white;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.2);width:100%;max-width:760px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,var(--navy,#1a2e4a),#2a4a6e);color:white;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-size:18px;font-weight:800;">${refSin}</div>
        <div style="font-size:13px;opacity:.8;margin-top:2px;">${d.compagnie_mere||d.compagnie||'—'} · ${dvolBadgeJours(jours)}</div>
      </div>
      <button onclick="document.getElementById('dvol-detail-modal').remove()" style="background:rgba(255,255,255,.15);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">×</button>
    </div>
    <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Statut</div>
          ${canEdit
            ? `<select id="dvol-edit-statut" style="font-size:13px;font-weight:600;border:none;background:transparent;color:var(--navy);cursor:pointer;width:100%;">${statutOptions}</select>`
            : dvolBadgeStatut(d.statut)
          }
        </div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Gestionnaire</div>
          ${canEdit
            ? `<select id="dvol-edit-gestionnaire" style="font-size:13px;font-weight:600;border:none;background:transparent;color:var(--navy);cursor:pointer;width:100%;"><option value="">— Non assigné —</option>${gestOptions}</select>`
            : `<span style="font-size:13px;font-weight:600;">${gest ? gest.prenom+' '+gest.nom : '—'}</span>`
          }
        </div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Date déclaration</div>
          <span style="font-size:13px;font-weight:600;">${d.date_declaration ? new Date(d.date_declaration+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : '—'}</span>
        </div>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Véhicule retrouvé ?</div>
          ${canEdit
            ? `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="dvol-edit-retrouve" ${d.vehicule_retrouve_confirme?'checked':''} style="accent-color:var(--rose);width:16px;height:16px;"><span style="font-size:13px;font-weight:600;">${d.vehicule_retrouve_confirme?'Oui':'Non'}</span></label>`
            : `<span style="font-size:13px;font-weight:600;">${d.vehicule_retrouve_confirme?'✅ Oui':'❌ Non'}</span>`
          }
        </div>
      </div>
      ${canEdit ? `<button onclick="dvolSauvegarderEdition('${id}')" class="btn btn-primary" style="width:100%;padding:11px;">💾 Enregistrer les modifications</button>` : ''}
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 10px;">📎 Documents</h3>
        <div style="display:flex;flex-direction:column;gap:6px;">${docsHtml}</div>
      </div>
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 10px;">🗓️ Suivi des étapes</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">${timelineHtml}</div>
      </div>
      <div>
        <h3 style="font-size:14px;font-weight:800;color:var(--navy);margin:0 0 8px;">💬 Notes</h3>
        ${canEdit
          ? `<textarea id="dvol-edit-notes" rows="3" style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;">${d.notes||''}</textarea>`
          : `<p style="font-size:13px;color:#374151;background:#f9fafb;padding:12px;border-radius:8px;margin:0;">${d.notes||'<span style="color:#9ca3af;">Aucune note</span>'}</p>`
        }
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px;">
        <button onclick="document.getElementById('dvol-detail-modal').remove()" class="btn btn-secondary">Fermer</button>
      </div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ────────────────────────────────────────────────────────────
// ACTIONS SUR LA MODALE
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

async function dvolToggleDoc(dossierId, docKey, newVal) {
  const dossier = dvolDossiers.find(d => d.id === dossierId);
  if (!dossier) return;

  let recusList = dvolGetDocsRecus(dossier);
  if (newVal) {
    if (!recusList.includes(docKey)) recusList.push(docKey);
  } else {
    recusList = recusList.filter(k => k !== docKey);
  }

  const tousRecus = DVOL_DOCS.every(d => recusList.includes(d.key));
  const { error } = await db.from('dvol_dossiers').update({
    documents_recus_liste: recusList,
    documents_recus: tousRecus,
    date_reception_documents: tousRecus ? new Date().toISOString().split('T')[0] : null,
    updated_at: new Date().toISOString()
  }).eq('id', dossierId);

  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  showNotif(newVal ? '📄 Document marqué reçu' : '📄 Document retiré', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

async function dvolMarquerEtapeFaite(etapeId, dossierId) {
  const { error } = await db.from('dvol_suivi_etapes').update({
    statut: 'realise',
    date_realisee: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  }).eq('id', etapeId);

  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  showNotif('✅ Étape marquée comme réalisée', 'success');
  await dvolCharger();
  await dvolOuvrirDossier(dossierId);
}

// ────────────────────────────────────────────────────────────
// CHARGEMENT DONNÉES
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
    return (dvolJoursDepuisVol(b.date_declaration)??0) - (dvolJoursDepuisVol(a.date_declaration)??0);
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
// FIN DVOL v2.1
