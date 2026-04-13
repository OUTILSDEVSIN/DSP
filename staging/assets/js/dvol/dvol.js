// ============================================================
// DVOL v1.0 — Gestion des dossiers vol de véhicule
// ============================================================

let dvolDossiers = [];

// ── Labels statuts ──
const DVOL_STATUTS = {
  declare:               { label: 'Déclaré',              color: '#6b7280', bg: '#f3f4f6' },
  en_attente_documents:  { label: 'Attente documents',    color: '#d97706', bg: '#fffbeb' },
  relance:               { label: 'Relancé',              color: '#f59e0b', bg: '#fef3c7' },
  en_cours_expertise:    { label: 'Expertise en cours',   color: '#2563eb', bg: '#eff6ff' },
  en_attente_cloture:    { label: 'Attente clôture',      color: '#7c3aed', bg: '#f5f3ff' },
  vehicule_retrouve:     { label: 'Véhicule retrouvé',    color: '#059669', bg: '#ecfdf5' },
  labtaf:                { label: 'LABTAF',               color: '#0891b2', bg: '#ecfeff' },
  refuse:                { label: 'Refusé',               color: '#dc2626', bg: '#fef2f2' },
  clos:                  { label: 'Clôturé',              color: '#374151', bg: '#f9fafb' }
};

// ── Calcul du nombre de jours depuis le vol ──
function dvolJoursDepuisVol(dateDeclaration) {
  if (!dateDeclaration) return null;
  const debut = new Date(dateDeclaration + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - debut) / (1000 * 60 * 60 * 24));
}

// ── Badge J+X coloré selon l'urgence ──
function dvolBadgeJours(jours) {
  if (jours === null) return '<span style="color:#9ca3af;">—</span>';
  let color = '#16a34a', bg = '#f0fdf4'; // vert
  if (jours >= 10 && jours < 20) { color = '#d97706'; bg = '#fffbeb'; } // orange
  if (jours >= 20 && jours < 30) { color = '#dc2626'; bg = '#fef2f2'; } // rouge
  if (jours >= 30)               { color = '#7c2d12'; bg = '#fef2f2'; } // rouge foncé
  return `<span style="
    display:inline-block;padding:2px 8px;border-radius:20px;
    background:${bg};color:${color};font-weight:700;font-size:12px;white-space:nowrap;
  ">J+${jours}</span>`;
}

// ── Badge statut ──
function dvolBadgeStatut(statut) {
  const s = DVOL_STATUTS[statut] || { label: statut, color: '#6b7280', bg: '#f3f4f6' };
  return `<span style="
    display:inline-block;padding:2px 10px;border-radius:20px;
    background:${s.bg};color:${s.color};font-weight:600;font-size:11px;white-space:nowrap;
  ">${s.label}</span>`;
}

// ── Barre de progression documents ──
function dvolBarreDocs(d) {
  const champs = ['docs_questionnaire_vol','docs_certificat_cession','docs_non_gage','docs_controle_technique','docs_facture_achat','docs_facture_entretien'];
  const recus = champs.filter(c => d[c]).length;
  const total = champs.length;
  const pct = Math.round((recus / total) * 100);
  const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return `<div title="${recus}/${total} documents reçus" style="display:flex;align-items:center;gap:6px;">
    <div style="width:60px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
    </div>
    <span style="font-size:11px;color:${color};font-weight:600;">${recus}/${total}</span>
  </div>`;
}

// ── Déterminer les alertes d'un dossier ──
function dvolGetAlertes(dossiers) {
  const alertes = [];
  const today = new Date(); today.setHours(0,0,0,0);

  for (const d of dossiers) {
    if (['clos','refuse','labtaf'].includes(d.statut)) continue;
    const jours = dvolJoursDepuisVol(d.date_declaration);
    if (jours === null) continue;

    // J+10 : Véhicule non retrouvé → à lancer expertise
    if (jours >= 10 && !d.date_lancement_expertise && !d.vehicule_retrouve_confirme) {
      alertes.push({
        dossier: d,
        type: 'expertise_a_lancer',
        message: `J+${jours} — Expertise à lancer`,
        detail: `Dossier ${d.numero_dossier} · ${d.assure_nom || '—'} · ${d.compagnie}`,
        urgence: jours >= 30 ? 'haute' : jours >= 20 ? 'moyenne' : 'normale'
      });
    }

    // Documents manquants relance
    if (!d.documents_recus && jours >= 5) {
      const champs = ['docs_questionnaire_vol','docs_certificat_cession','docs_non_gage','docs_controle_technique','docs_facture_achat','docs_facture_entretien'];
      const manquants = champs.filter(c => !d[c]).length;
      if (manquants > 0) {
        alertes.push({
          dossier: d,
          type: 'docs_manquants',
          message: `Documents manquants (${manquants}/6)`,
          detail: `Dossier ${d.numero_dossier} · ${d.assure_nom || '—'} · J+${jours}`,
          urgence: jours >= 20 ? 'haute' : 'normale'
        });
      }
    }

    // Rapport expertise manquant
    if (d.date_lancement_expertise && !d.rapport_expertise_recu && !d.vehicule_retrouve_confirme) {
      const joursExpertise = Math.floor((today - new Date(d.date_lancement_expertise + 'T12:00:00')) / (1000 * 60 * 60 * 24));
      if (joursExpertise >= 7) {
        alertes.push({
          dossier: d,
          type: 'rapport_manquant',
          message: `Rapport expertise non reçu (J+${joursExpertise} depuis mission)`,
          detail: `Dossier ${d.numero_dossier} · ${d.assure_nom || '—'} · ${d.compagnie}`,
          urgence: joursExpertise >= 14 ? 'haute' : 'normale'
        });
      }
    }

    // Véhicule retrouvé → action requise
    if (d.vehicule_retrouve_confirme && d.statut === 'vehicule_retrouve') {
      alertes.push({
        dossier: d,
        type: 'vehicule_retrouve',
        message: 'Véhicule retrouvé — expertise terrain à planifier',
        detail: `Dossier ${d.numero_dossier} · ${d.assure_nom || '—'}`,
        urgence: 'haute'
      });
    }
  }

  // Trier : haute urgence en premier
  const ordreUrgence = { haute: 0, moyenne: 1, normale: 2 };
  alertes.sort((a, b) => (ordreUrgence[a.urgence] ?? 3) - (ordreUrgence[b.urgence] ?? 3));
  return alertes;
}

// ── Icônes alertes ──
const DVOL_ALERTE_ICONS = {
  expertise_a_lancer: '🔍',
  docs_manquants:     '📄',
  rapport_manquant:   '📋',
  vehicule_retrouve:  '🚗'
};

const DVOL_URGENCE_STYLES = {
  haute:   { border: '#dc2626', bg: '#fef2f2', color: '#dc2626' },
  moyenne: { border: '#d97706', bg: '#fffbeb', color: '#d97706' },
  normale: { border: '#e5e7eb', bg: '#f9fafb', color: '#374151' }
};

// ── Rendu de l'encart alertes ──
function dvolRenderAlertes(alertes) {
  const encart = document.getElementById('dvol-encart-alertes');
  const liste = document.getElementById('dvol-liste-alertes');
  const badge = document.getElementById('dvol-badge-alertes');
  if (!encart || !liste || !badge) return;

  if (alertes.length === 0) {
    encart.style.display = 'none';
    return;
  }

  encart.style.display = 'block';
  badge.textContent = alertes.length;

  liste.innerHTML = alertes.map(a => {
    const s = DVOL_URGENCE_STYLES[a.urgence] || DVOL_URGENCE_STYLES.normale;
    const icon = DVOL_ALERTE_ICONS[a.type] || '⚠️';
    return `<div style="
      display:flex;align-items:center;gap:12px;
      padding:10px 14px;border-radius:8px;
      background:${s.bg};border:1.5px solid ${s.border};
    ">
      <span style="font-size:18px;flex-shrink:0;">${icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:${s.color};">${a.message}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">${a.detail}</div>
      </div>
      <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;white-space:nowrap;"
        onclick="dvolOuvrirDossier('${a.dossier.id}')">
        Voir →
      </button>
    </div>`;
  }).join('');
}

// ── Rendu du tableau ──
function dvolRenderTableau(dossiers) {
  const tbody = document.getElementById('dvol-tbody');
  const compteur = document.getElementById('dvol-compteur');
  if (!tbody) return;

  const actifs = dossiers.filter(d => !['clos','refuse'].includes(d.statut));
  if (compteur) compteur.textContent = `${dossiers.length} dossier${dossiers.length > 1 ? 's' : ''} (${actifs.length} actif${actifs.length > 1 ? 's' : ''})`;

  if (dossiers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;">
      <div style="font-size:24px;margin-bottom:8px;">📂</div>
      Aucun dossier VOL pour le moment
    </td></tr>`;
    return;
  }

  tbody.innerHTML = dossiers.map((d, i) => {
    const jours = dvolJoursDepuisVol(d.date_declaration);
    const rowBg = i % 2 === 0 ? '' : 'background:#f9fafb;';
    const dateVol = d.date_declaration
      ? new Date(d.date_declaration + 'T12:00:00').toLocaleDateString('fr-FR')
      : '—';
    const gest = d.gestionnaire_id
      ? (allUsers || []).find(u => u.id === d.gestionnaire_id)
      : null;
    const gestNom = gest ? gest.prenom + ' ' + gest.nom : '<span style="color:#9ca3af;">—</span>';

    return `<tr style="border-bottom:1px solid #f3f4f6;${rowBg}transition:background .1s;"
      onmouseover="this.style.background='#f0f7ff'" onmouseout="this.style.background='${i%2===0?'':'#f9fafb'}'">
      <td style="padding:10px 14px;font-weight:600;color:var(--navy);white-space:nowrap;">${d.numero_dossier}</td>
      <td style="padding:10px 14px;">${d.assure_nom || '<span style="color:#9ca3af;">—</span>'}</td>
      <td style="padding:10px 14px;white-space:nowrap;">
        <span style="font-weight:600;">${d.compagnie_mere || d.compagnie || '—'}</span>
        ${d.compagnie && d.compagnie !== d.compagnie_mere ? `<br><span style="font-size:11px;color:#6b7280;">${d.compagnie}</span>` : ''}
      </td>
      <td style="padding:10px 14px;white-space:nowrap;">${dateVol}</td>
      <td style="padding:10px 14px;text-align:center;">${dvolBadgeJours(jours)}</td>
      <td style="padding:10px 14px;">${dvolBadgeStatut(d.statut)}</td>
      <td style="padding:10px 14px;white-space:nowrap;">${gestNom}</td>
      <td style="padding:10px 14px;">${dvolBarreDocs(d)}</td>
      <td style="padding:10px 14px;text-align:center;">
        <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;"
          onclick="dvolOuvrirDossier('${d.id}')">
          📂 Ouvrir
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ── Charger les dossiers depuis Supabase ──
async function dvolCharger() {
  if (!currentUserData) return;
  const { data, error } = await db.from('dvol_dossiers')
    .select('*')
    .order('date_declaration', { ascending: true });

  if (error) {
    showNotif('Erreur chargement dossiers VOL : ' + error.message, 'error');
    return;
  }

  dvolDossiers = data || [];

  // Tri : actifs d'abord (par J+X croissant), clos/refusés en fin
  dvolDossiers.sort((a, b) => {
    const closA = ['clos','refuse','labtaf'].includes(a.statut);
    const closB = ['clos','refuse','labtaf'].includes(b.statut);
    if (closA !== closB) return closA ? 1 : -1;
    const jA = dvolJoursDepuisVol(a.date_declaration) ?? 0;
    const jB = dvolJoursDepuisVol(b.date_declaration) ?? 0;
    return jB - jA; // plus anciens en premier
  });

  const alertes = dvolGetAlertes(dvolDossiers);
  dvolRenderAlertes(alertes);
  dvolRenderTableau(dvolDossiers);
}

// ── Ouvrir un dossier (fiche détail — à développer étape suivante) ──
function dvolOuvrirDossier(id) {
  const d = dvolDossiers.find(x => x.id === id);
  if (!d) return;
  // TODO étape suivante : modale de détail / édition
  showNotif(`📂 Dossier ${d.numero_dossier} — fiche détail à venir`, 'info');
}

// ── Init DVOL ──
async function dvolInit() {
  if (!currentUserData) { setTimeout(dvolInit, 300); return; }
  await dvolCharger();
}

// ── Switcher — mise à jour pour inclure DVOL ──
function switchTool(tool) {
  const tabs = document.getElementById('tabs-container');
  const mc   = document.getElementById('main-content');
  const dp   = document.getElementById('dplane-screen');
  const dv   = document.getElementById('dvol-screen');
  const bd   = document.getElementById('btn-tool-dispatch');
  const bpl  = document.getElementById('btn-tool-dplane');
  const bvol = document.getElementById('btn-tool-dvol');

  // Tout masquer
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
    // dispatch (défaut)
    if (tabs) tabs.style.display = '';
    if (mc)   mc.style.display   = '';
    bd?.classList.add('active');
  }
}
// FIN DVOL v1.0
