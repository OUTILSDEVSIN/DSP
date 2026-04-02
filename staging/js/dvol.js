// ============================================================
// DVOL.JS — Module de suivi des dossiers vol pour Dispatchis
// Version 1.1 — 02 avril 2026 — Patch: client DB unifié, dates locales, liaison ref_sinistre, UUID comparison
// ============================================================

// ─── INITIALISER UN DOSSIER EN SUIVI DVOL ───────────────────
async function dvolInitialiserDossier(numeroDossier, gestionnaireId, compagnie, dateDeclaration, assureNom, assureEmail) {
  // 1. Créer le dossier dans dvol_dossiers
  const { data: dossier, error: errDossier } = await db
    .from('dvol_dossiers')
    .insert({
      numero_dossier: numeroDossier,
      gestionnaire_id: gestionnaireId,
      compagnie: compagnie,
      date_declaration: dateDeclaration,
      assure_nom: assureNom,
      assure_email: assureEmail,
      statut: 'declare'
    })
    .select()
    .single();

  if (errDossier) { console.error('dvolInitialiserDossier:', errDossier); return null; }

  // 2. Activer le flag is_dvol sur la table dossiers principale
  await db
    .from('dossiers')
    .update({ is_dvol: true, date_passage_dvol: new Date().toISOString() })
    .eq('ref_sinistre', numeroDossier);

  // 3. Initialiser les étapes via la fonction SQL
  const { error: errEtapes } = await db.rpc('initialiser_suivi_dvol', {
    p_dossier_id: dossier.id,
    p_compagnie: compagnie
  });

  if (errEtapes) { console.error('dvolInitialiserDossier (étapes):', errEtapes); }

  return dossier;
}

// ─── RÉCUPÉRER LE TABLEAU DE BORD DVOL ──────────────────────
async function dvolGetTableauDeBord() {
  const { data, error } = await db
    .from('dvol_tableau_de_bord')
    .select('*');

  if (error) { console.error('dvolGetTableauDeBord:', error); return []; }
  return data;
}

// ─── RÉCUPÉRER UN DOSSIER DVOL ───────────────────────────────
async function dvolGetDossier(dossierId) {
  const { data, error } = await db
    .from('dvol_dossiers')
    .select(`
      *,
      utilisateurs!dvol_dossiers_gestionnaire_id_fkey ( id, nom, prenom )
    `)
    .eq('id', dossierId)
    .single();

  if (error) { console.error('dvolGetDossier:', error); return null; }
  return data;
}

// ─── RÉCUPÉRER LES ÉTAPES D'UN DOSSIER ──────────────────────
async function dvolGetEtapesDossier(dossierId) {
  const { data, error } = await db
    .from('dvol_suivi_etapes')
    .select(`
      *,
      dvol_etapes_template ( ordre, label, description, delai_jours )
    `)
    .eq('dossier_id', dossierId)
    .order('date_prevue', { ascending: true });

  if (error) { console.error('dvolGetEtapesDossier:', error); return []; }
  return data;
}

// ─── CONFIRMER RÉCEPTION DES DOCUMENTS ──────────────────────
async function dvolConfirmerDocuments(dossierId) {
  const { error } = await db.rpc('confirmer_documents_dvol', {
    p_dossier_id: dossierId
  });

  if (error) { console.error('dvolConfirmerDocuments:', error); return false; }
  return true;
}

// ─── CLÔTURER — VÉHICULE RETROUVÉ (avec confirmation) ────────
async function dvolCloturerVehiculeRetrouve(dossierId) {
  const confirmed = await dvolAfficherDialogConfirmation(
    '🚗 Véhicule retrouvé',
    'Confirmez-vous que le véhicule a été retrouvé ? Cette action clôturera immédiatement le suivi Dvol et ignorera toutes les étapes restantes.',
    'Oui, clôturer le dossier'
  );

  if (!confirmed) return false;

  const { error } = await db.rpc('cloturer_dvol_vehicule_retrouve', {
    p_dossier_id: dossierId
  });

  if (error) { console.error('dvolCloturerVehiculeRetrouve:', error); return false; }
  return true;
}

// ─── CHANGER LE STATUT D'UN DOSSIER ─────────────────────────
async function dvolChangerStatut(dossierId, nouveauStatut, dateCloturePrevue = null) {
  const update = { statut: nouveauStatut, updated_at: new Date().toISOString() };
  if (dateCloturePrevue) update.date_cloture_prevue = dateCloturePrevue;

  const { error } = await db
    .from('dvol_dossiers')
    .update(update)
    .eq('id', dossierId);

  if (error) { console.error('dvolChangerStatut:', error); return false; }
  return true;
}

// ─── MARQUER UNE ÉTAPE COMME RÉALISÉE ───────────────────────
async function dvolMarquerEtapeRealisee(suiviEtapeId, commentaire = null) {
  const { error } = await db
    .from('dvol_suivi_etapes')
    .update({
      statut: 'realise',
      date_realisee: (function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(new Date()),
      commentaire: commentaire,
      updated_at: new Date().toISOString()
    })
    .eq('id', suiviEtapeId);

  if (error) { console.error('dvolMarquerEtapeRealisee:', error); return false; }
  return true;
}

// ─── RÉCUPÉRER LES NOTIFICATIONS NON LUES ───────────────────
async function dvolGetNotificationsNonLues(gestionnaireId) {
  const { data, error } = await db
    .from('dvol_notifications')
    .select(`
      *,
      dvol_dossiers ( numero_dossier, assure_nom, compagnie )
    `)
    .eq('gestionnaire_id', gestionnaireId)
    .eq('lu', false)
    .order('date_envoi', { ascending: false });

  if (error) { console.error('dvolGetNotificationsNonLues:', error); return []; }
  return data;
}

// ─── MARQUER UNE NOTIFICATION COMME LUE ─────────────────────
async function dvolMarquerNotificationLue(notifId) {
  const { error } = await db
    .from('dvol_notifications')
    .update({ lu: true })
    .eq('id', notifId);

  if (error) { console.error('dvolMarquerNotificationLue:', error); return false; }
  return true;
}

// ─── VÉRIFIER LES RELANCES À ENVOYER (appelé au chargement) ──
async function dvolVerifierRelances(gestionnaireId) {
  const tableau = await dvolGetTableauDeBord();
  const aujourd_hui = (function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(new Date());
  const alertes = [];

  for (const dossier of tableau) {
    if (String(dossier.gestionnaire_id) !== String(gestionnaireId)) continue;

    // Relance clôture quotidienne
    if (dossier.relance_cloture_active) {
      alertes.push({
        type: 'cloture',
        dossierId: dossier.id,
        numeroDossier: dossier.numero_dossier,
        assureNom: dossier.assure_nom,
        message: `⏰ Clôture en attente — Dossier ${dossier.numero_dossier} (${dossier.assure_nom})`
      });
    }

    // Prochaine étape dépassée
    if (dossier.date_prochaine_etape && dossier.date_prochaine_etape <= aujourd_hui) {
      alertes.push({
        type: 'etape',
        dossierId: dossier.id,
        numeroDossier: dossier.numero_dossier,
        assureNom: dossier.assure_nom,
        message: `📋 Action requise — ${dossier.prochaine_etape} (${dossier.numero_dossier})`
      });
    }
  }

  return alertes;
}

// ─── UTILITAIRE : BOÎTE DE DIALOGUE DE CONFIRMATION ─────────
function dvolAfficherDialogConfirmation(titre, message, labelConfirm = 'Confirmer') {
  return new Promise((resolve) => {
    // Créer la modale
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

    overlay.innerHTML = `
      <div style="background:#1e2130;border:1px solid #374151;border-radius:12px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <h3 style="margin:0 0 12px;color:#f9fafb;font-size:18px;">${titre}</h3>
        <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.6;">${message}</p>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button id="dvol-dialog-cancel" style="padding:8px 18px;border-radius:8px;border:1px solid #374151;background:transparent;color:#9ca3af;cursor:pointer;font-size:14px;">Annuler</button>
          <button id="dvol-dialog-confirm" style="padding:8px 18px;border-radius:8px;border:none;background:#ef4444;color:white;cursor:pointer;font-size:14px;font-weight:600;">${labelConfirm}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#dvol-dialog-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
    overlay.querySelector('#dvol-dialog-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); };
  });
}

// ─── UTILITAIRE : LABEL STATUT LISIBLE ──────────────────────
function dvolLabelStatut(statut) {
  const labels = {
    'declare': '📋 Déclaré',
    'en_attente_documents': '📂 En attente de documents',
    'relance': '🔔 Relancé',
    'en_cours_expertise': '🔍 En cours d\'expertise',
    'en_attente_cloture': '⏳ En attente de clôture',
    'vehicule_retrouve': '🚗 Véhicule retrouvé',
    'labtaf': '📁 LABTAF',
    'refuse': '❌ Refusé',
    'clos': '✅ Clos'
  };
  return labels[statut] || statut;
}

// ─── UTILITAIRE : COULEUR BADGE STATUT ──────────────────────
function dvolCouleurStatut(statut) {
  const couleurs = {
     'declare': '#3b82f6',
    'en_attente_documents': '#f59e0b',
    'relance': '#f97316',
    'en_cours_expertise': '#8b5cf6',
    'en_attente_cloture': '#06b6d4',
    'vehicule_retrouve': '#22c55e',
    'labtaf': '#6b7280',
    'refuse': '#ef4444',
    'clos': '#10b981'
  };
  return couleurs[statut] || '#6b7280';
}
// ═══════════════════════════════════════════════════════════════
// POINT D'ENTRÉE — appelé par switchTool('dvol') dans core.js
// ═══════════════════════════════════════════════════════════════
async function renderDvol() {
  const tableau = document.getElementById('dvol-tableau');
  const alertes = document.getElementById('dvol-alertes');

  if (!tableau) return;

  tableau.innerHTML = '<div class="loading" style="padding:40px;text-align:center;">Chargement des dossiers vol...</div>';
  if (alertes) alertes.innerHTML = '';

  // Charger les relances en attente
  const relances = await dvolVerifierRelances();
  if (alertes && relances && relances.length > 0) {
    alertes.innerHTML = `
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">🔔</span>
        <span style="color:#92400e;font-weight:600;">${relances.length} dossier(s) nécessitent une relance</span>
      </div>`;
  }

  // Charger le tableau de bord
  const dossiers = await dvolGetTableauDeBord();

  if (!dossiers || dossiers.length === 0) {
    tableau.innerHTML = `
      <div style="padding:60px 24px;text-align:center;color:#6b7280;">
        <div style="font-size:40px;margin-bottom:16px;">🚗</div>
        <div style="font-weight:600;font-size:16px;margin-bottom:8px;">Aucun dossier vol</div>
        <div style="font-size:14px;">Cliquez sur "+ Nouveau dossier vol" pour commencer.</div>
      </div>`;
    return;
  }

  const rows = dossiers.map(d => `
    <tr style="border-bottom:1px solid #f3f4f6;cursor:pointer;" onclick="dvolOuvrirDossier('${d.id}')">
      <td style="padding:12px 16px;font-weight:600;color:var(--navy);">${d.numero_dossier || '—'}</td>
      <td style="padding:12px 16px;">${d.assure_nom || '—'}</td>
      <td style="padding:12px 16px;">${d.compagnie || '—'}</td>
      <td style="padding:12px 16px;">
        <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:white;background:${dvolCouleurStatut(d.statut)};">
          ${dvolLabelStatut(d.statut)}
        </span>
      </td>
      <td style="padding:12px 16px;color:#6b7280;font-size:13px;">${d.date_declaration ? new Date(d.date_declaration).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`).join('');

  tableau.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">N° Dossier</th>
          <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Assuré</th>
          <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Compagnie</th>
          <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Statut</th>
          <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Date déclaration</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─── OUVRIR UN DOSSIER VOL EXISTANT ─────────────────────────
async function dvolOuvrirDossier(dossierId) {
  const dossier = await dvolGetDossier(dossierId);
  if (!dossier) return;

  const overlay = document.createElement('div');
  overlay.className = 'dispatch-modal-overlay';
  overlay.id = 'dvol-detail-modal';
  overlay.innerHTML = `
    <div class="dispatch-modal" style="max-width:620px;width:95%;max-height:85vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;font-size:18px;color:var(--navy);">🚗 Dossier ${dossier.numero_dossier}</h2>
        <button onclick="document.getElementById('dvol-detail-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;">Assuré</div><div style="font-weight:600;">${dossier.assure_nom || '—'}</div></div>
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;">Compagnie</div><div style="font-weight:600;">${dossier.compagnie || '—'}</div></div>
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;">Statut</div>
          <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:white;background:${dvolCouleurStatut(dossier.statut)};">${dvolLabelStatut(dossier.statut)}</span>
        </div>
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;">Date déclaration</div><div>${dossier.date_declaration ? new Date(dossier.date_declaration).toLocaleDateString('fr-FR') : '—'}</div></div>
      </div>
      <button onclick="document.getElementById('dvol-detail-modal').remove()" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:14px;">Fermer</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ─── OUVRIR FORMULAIRE NOUVEAU DOSSIER VOL ───────────────────
function dvolOuvrirNouveauDossier() {
  const overlay = document.createElement('div');
  overlay.className = 'dispatch-modal-overlay';
  overlay.id = 'dvol-nouveau-modal';
  overlay.innerHTML = `
    <div class="dispatch-modal" style="max-width:520px;width:95%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2 style="margin:0;font-size:18px;color:var(--navy);">🚗 Nouveau dossier vol</h2>
        <button onclick="document.getElementById('dvol-nouveau-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">N° Dossier *</label>
          <input id="dvol-form-numero" type="text" placeholder="Ex: VOL-2026-001" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Nom de l'assuré *</label>
          <input id="dvol-form-assure" type="text" placeholder="Nom Prénom" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Email assuré</label>
          <input id="dvol-form-email" type="email" placeholder="email@exemple.fr" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Compagnie</label>
          <input id="dvol-form-compagnie" type="text" placeholder="Ex: AXA, MAIF, Groupama..." style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Date de déclaration *</label>
          <input id="dvol-form-date" type="date" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" value="${(function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(new Date())}">
        </div>
        <div id="dvol-form-error" style="display:none;color:#dc2626;font-size:13px;padding:8px 12px;background:#fef2f2;border-radius:6px;"></div>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button onclick="document.getElementById('dvol-nouveau-modal').remove()" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:14px;">Annuler</button>
          <button onclick="dvolSoumettreNouveauDossier()" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--rose);color:white;cursor:pointer;font-size:14px;font-weight:600;">Créer le dossier</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('dvol-form-numero').focus();
}

// ─── SOUMETTRE NOUVEAU DOSSIER VOL ───────────────────────────
async function dvolSoumettreNouveauDossier() {
  const numero    = document.getElementById('dvol-form-numero')?.value?.trim();
  const assure    = document.getElementById('dvol-form-assure')?.value?.trim();
  const email     = document.getElementById('dvol-form-email')?.value?.trim();
  const compagnie = document.getElementById('dvol-form-compagnie')?.value?.trim();
  const date      = document.getElementById('dvol-form-date')?.value;
  const errEl     = document.getElementById('dvol-form-error');

  if (!numero || !assure || !date) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Veuillez remplir les champs obligatoires (N° Dossier, Assuré, Date).'; }
    return;
  }

  const btn = document.querySelector('#dvol-nouveau-modal button[onclick="dvolSoumettreNouveauDossier()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Création...'; }

  const currentUser = window.currentUser || (await db.auth.getUser())?.data?.user;
  const gestionnaireId = currentUser?.id || null;

  const result = await dvolInitialiserDossier(numero, gestionnaireId, compagnie, date, assure, email);

  if (!result) {
    if (btn) { btn.disabled = false; btn.textContent = 'Créer le dossier'; }
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = "Erreur lors de la création. Vérifiez que le numéro de dossier n'existe pas déjà."; }
    return;
  }

  document.getElementById('dvol-nouveau-modal')?.remove();
  await renderDvol();
}

// ─── EXPOSITION GLOBALE (appelées depuis onclick HTML) ───────────────────────
window.dvolOuvrirNouveauDossier  = dvolOuvrirNouveauDossier;
window.dvolSoumettreNouveauDossier = dvolSoumettreNouveauDossier;
window.dvolOuvrirDossier         = dvolOuvrirDossier;
window.renderDvol                = renderDvol;
