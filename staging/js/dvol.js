// ============================================================
// DVOL.JS — Module de suivi des dossiers vol pour Dispatchis
// Version 1.2 — 02 avril 2026 — Section actions jaune, modal actions complet, bouton Action dans tableau
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
  const container = document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="color:var(--navy);margin:0;">🚗 Suivi DVOL</h2>
      <button onclick="dvolOuvrirNouveauDossier()" style="background:var(--rose,#e5195e);color:white;border:none;border-radius:8px;padding:9px 18px;font-weight:600;cursor:pointer;font-size:14px;">+ Nouveau dossier vol</button>
    </div>
    <div id="dvol-alertes"></div>
    <div id="dvol-actions-requises"></div>
    <div id="dvol-tableau"></div>`;

  const alertesEl  = document.getElementById('dvol-alertes');
  const actionsEl  = document.getElementById('dvol-actions-requises');
  const tableauEl  = document.getElementById('dvol-tableau');

  tableauEl.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Chargement...</div>';

  const dossiers = await dvolGetTableauDeBord();
  const aujourdHui = (function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(new Date());

  // ── Section jaune : dossiers nécessitant une action ──
  const enAttente = (dossiers||[]).filter(d =>
    d.relance_cloture_active ||
    (d.date_prochaine_etape && d.date_prochaine_etape <= aujourdHui) ||
    d.action_requise
  );

  if (enAttente.length > 0) {
    actionsEl.innerHTML = `
      <div style="margin-bottom:20px;">
        <div style="background:#fef9c3;border:1px solid #f59e0b;border-radius:10px;overflow:hidden;">
          <div style="background:#fef08a;padding:10px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f59e0b;">
            <span style="font-size:16px;">⚠️</span>
            <span style="font-weight:700;color:#78350f;font-size:14px;">Actions gestionnaire requises (${enAttente.length})</span>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;">N° Dossier</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;">Assuré</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;">Action requise</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;">Prochaine étape</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;"></th>
              </tr>
            </thead>
            <tbody>
              ${enAttente.map(d => {
                let actionLabel = '';
                if (d.relance_cloture_active) actionLabel = '🔴 Clôture en attente';
                else if (d.date_prochaine_etape && d.date_prochaine_etape <= aujourdHui) actionLabel = '📋 Étape dépassée';
                else if (d.action_requise) actionLabel = '⚡ ' + d.action_requise;
                return `<tr style="background:#fefce8;border-bottom:1px solid #fde68a;">
                  <td style="padding:10px 16px;font-weight:700;color:#92400e;">${d.numero_dossier||'—'}</td>
                  <td style="padding:10px 16px;color:#78350f;">${d.assure_nom||'—'}</td>
                  <td style="padding:10px 16px;font-weight:600;color:#b45309;">${actionLabel}</td>
                  <td style="padding:10px 16px;font-size:13px;color:#92400e;">${d.prochaine_etape||'—'} ${d.date_prochaine_etape ? '('+new Date(d.date_prochaine_etape+'T12:00:00').toLocaleDateString('fr-FR')+')' : ''}</td>
                  <td style="padding:10px 16px;">
                    <button onclick="event.stopPropagation();dvolOuvrirActions('${d.id}')" style="background:#f59e0b;color:white;border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;">⚡ Agir</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Tableau principal ──
  if (!dossiers || dossiers.length === 0) {
    tableauEl.innerHTML = `
      <div style="padding:60px 24px;text-align:center;color:#6b7280;">
        <div style="font-size:40px;margin-bottom:16px;">🚗</div>
        <div style="font-weight:600;font-size:16px;margin-bottom:8px;">Aucun dossier vol</div>
        <div style="font-size:14px;">Cliquez sur "Nouveau dossier vol" pour commencer.</div>
      </div>`;
    return;
  }

  const rows = (dossiers||[]).map(d => {
    const isEnAttente = enAttente.some(e => e.id === d.id);
    const rowBg = isEnAttente ? 'background:#fffbeb;' : '';
    return `<tr style="border-bottom:1px solid #f3f4f6;cursor:pointer;${rowBg}" onclick="dvolOuvrirDossier('${d.id}')">
      <td style="padding:12px 16px;font-weight:600;color:var(--navy);">${d.numero_dossier||'—'}${isEnAttente?'<span style="margin-left:6px;font-size:10px;background:#f59e0b;color:white;padding:1px 5px;border-radius:8px;">⚡ Action</span>':''}</td>
      <td style="padding:12px 16px;">${d.assure_nom||'—'}</td>
      <td style="padding:12px 16px;">${d.compagnie||'—'}</td>
      <td style="padding:12px 16px;">
        <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:white;background:${dvolCouleurStatut(d.statut)};">
          ${dvolLabelStatut(d.statut)}
        </span>
      </td>
      <td style="padding:12px 16px;color:#6b7280;font-size:13px;">${d.date_declaration ? new Date(d.date_declaration+'T12:00:00').toLocaleDateString('fr-FR') : '—'}</td>
      <td style="padding:12px 8px;" onclick="event.stopPropagation();">
        <button onclick="dvolOuvrirActions('${d.id}')" style="background:var(--navy,#1e3a5f);color:white;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">⚡ Action</button>
      </td>
    </tr>`;
  }).join('');

  tableauEl.innerHTML = `
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">N° Dossier</th>
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Assuré</th>
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Compagnie</th>
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Statut</th>
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Date décl.</th>
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
async function dvolOuvrirDossier(dossierId) {
  const dossier = await dvolGetDossier(dossierId);
  if (!dossier) return;
  const etapes = await dvolGetEtapesDossier(dossierId);

  const overlay = document.createElement('div');
  overlay.className = 'dispatch-modal-overlay';
  overlay.id = 'dvol-detail-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:4000;display:flex;align-items:center;justify-content:center;';

  const etapesHtml = etapes.length > 0 ? `
    <div style="margin-top:20px;">
      <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:10px;">Suivi des étapes</div>
      ${etapes.map(e => {
        const label = e.dvol_etapes_template?.label || '—';
        const fait  = e.statut === 'realise';
        const enRet = !fait && e.date_prevue && e.date_prevue <= (function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(new Date());
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:16px;">${fait ? '✅' : enRet ? '🔴' : '⬜'}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:${fait?'400':'600'};color:${fait?'#9ca3af':enRet?'#dc2626':'#111827'};text-decoration:${fait?'line-through':'none'};">${label}</div>
            ${e.date_prevue ? `<div style="font-size:11px;color:#9ca3af;">Prévue le ${new Date(e.date_prevue+'T12:00:00').toLocaleDateString('fr-FR')}</div>` : ''}
          </div>
          ${!fait ? `<button onclick="dvolActionMarquerEtape('${e.id}','${dossierId}')" style="background:#10b981;color:white;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;">✓ Fait</button>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:640px;width:95%;max-height:88vh;overflow-y:auto;padding:28px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;font-size:18px;color:var(--navy);">🚗 Dossier ${dossier.numero_dossier}</h2>
        <button onclick="document.getElementById('dvol-detail-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#6b7280;line-height:1;">×</button>
      </div>

      <!-- Infos dossier -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:20px;">
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Assuré</div><div style="font-weight:600;">${dossier.assure_nom||'—'}</div></div>
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Compagnie</div><div style="font-weight:600;">${dossier.compagnie||'—'}</div></div>
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Statut actuel</div>
          <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:white;background:${dvolCouleurStatut(dossier.statut)};">${dvolLabelStatut(dossier.statut)}</span>
        </div>
        <div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Date déclaration</div><div>${dossier.date_declaration ? new Date(dossier.date_declaration+'T12:00:00').toLocaleDateString('fr-FR') : '—'}</div></div>
        ${dossier.assure_email ? `<div style="grid-column:1/-1;"><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Email assuré</div><div>${dossier.assure_email}</div></div>` : ''}
      </div>

      <!-- Actions disponibles -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:12px;">Actions disponibles</div>
        <div style="display:flex;flex-direction:column;gap:8px;">

          <button onclick="dvolActionConfirmerDocuments('${dossier.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;text-align:left;font-size:14px;">
            <span style="font-size:20px;">📁</span>
            <div><div style="font-weight:600;color:#111827;">Confirmer réception des documents</div><div style="font-size:12px;color:#6b7280;">Valider que tous les documents ont été reçus</div></div>
          </button>

          <button onclick="dvolActionChangerStatut('${dossier.id}','${dossier.statut}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;text-align:left;font-size:14px;">
            <span style="font-size:20px;">🔄</span>
            <div><div style="font-weight:600;color:#111827;">Changer le statut</div><div style="font-size:12px;color:#6b7280;">Statut actuel : ${dvolLabelStatut(dossier.statut)}</div></div>
          </button>

          <button onclick="dvolActionAjouterCommentaire('${dossier.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;text-align:left;font-size:14px;">
            <span style="font-size:20px;">📝</span>
            <div><div style="font-weight:600;color:#111827;">Ajouter un commentaire</div><div style="font-size:12px;color:#6b7280;">Saisir une note sur le dossier</div></div>
          </button>

          <button onclick="dvolActionVehiculeRetrouve('${dossier.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #10b981;border-radius:8px;background:#f0fdf4;cursor:pointer;text-align:left;font-size:14px;">
            <span style="font-size:20px;">🚗✅</span>
            <div><div style="font-weight:600;color:#065f46;">Véhicule retrouvé — Clôturer</div><div style="font-size:12px;color:#6b7280;">Clôture immédiate du dossier vol</div></div>
          </button>

          <button onclick="dvolActionCloturerSansRetrouve('${dossier.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #fee2e2;border-radius:8px;background:#fff5f5;cursor:pointer;text-align:left;font-size:14px;">
            <span style="font-size:20px;">📕</span>
            <div><div style="font-weight:600;color:#991b1b;">Clôturer sans retrouver le véhicule</div><div style="font-size:12px;color:#6b7280;">Clôture définitive — indemnisation</div></div>
          </button>

        </div>
      </div>

      <!-- Suivi des étapes -->
      ${etapesHtml}

      <button onclick="document.getElementById('dvol-detail-modal').remove()" style="width:100%;margin-top:20px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:14px;color:#6b7280;">Fermer</button>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
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


// ─── MENU D'ACTIONS RAPIDES (depuis bouton ⚡ Action) ────────────────────────
async function dvolOuvrirActions(dossierId) {
  const dossier = await dvolGetDossier(dossierId);
  if (!dossier) return;
  dvolOuvrirDossier(dossierId);
}

// ─── ACTION : Confirmer documents ────────────────────────────────────────────
async function dvolActionConfirmerDocuments(dossierId) {
  document.getElementById('dvol-detail-modal')?.remove();
  const ok = await dvolConfirmerDocuments(dossierId);
  if (ok) { showNotif('📁 Documents confirmés avec succès.', 'success'); await renderDvol(); }
  else showNotif('Erreur lors de la confirmation des documents.', 'error');
}

// ─── ACTION : Changer statut ─────────────────────────────────────────────────
function dvolActionChangerStatut(dossierId, statutActuel) {
  document.getElementById('dvol-detail-modal')?.remove();
  const statuts = [
    { val: 'declare',       label: '🔵 Déclaré' },
    { val: 'en_instruction', label: '🟡 En instruction' },
    { val: 'attente_doc',   label: '🟠 Attente documents' },
    { val: 'expert',        label: '🔍 En expertise' },
    { val: 'cloture_retro', label: '✅ Clôturé — Retrouvé' },
    { val: 'cloture_indem', label: '📕 Clôturé — Indemnisé' },
  ];
  const overlay = document.createElement('div');
  overlay.id = 'dvol-statut-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:4100;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:420px;width:95%;padding:28px;">
      <h3 style="margin:0 0 18px;font-size:17px;color:var(--navy);">🔄 Changer le statut</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${statuts.map(s => `
          <button onclick="dvolActionAppliquerStatut('${dossierId}','${s.val}')"
            style="padding:11px 16px;border:2px solid ${s.val===statutActuel?'var(--navy,#1e3a5f)':'#e5e7eb'};border-radius:8px;background:${s.val===statutActuel?'#f0f4ff':'white'};cursor:pointer;text-align:left;font-size:14px;font-weight:${s.val===statutActuel?'700':'400'};">
            ${s.label} ${s.val===statutActuel?'← actuel':''}
          </button>`).join('')}
      </div>
      <button onclick="document.getElementById('dvol-statut-modal').remove()" style="width:100%;margin-top:14px;padding:9px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:14px;color:#6b7280;">Annuler</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function dvolActionAppliquerStatut(dossierId, newStatut) {
  document.getElementById('dvol-statut-modal')?.remove();
  const ok = await dvolChangerStatut(dossierId, newStatut);
  if (ok) { showNotif('✅ Statut mis à jour.', 'success'); await renderDvol(); }
  else showNotif('Erreur lors du changement de statut.', 'error');
}

// ─── ACTION : Commentaire ────────────────────────────────────────────────────
function dvolActionAjouterCommentaire(dossierId) {
  document.getElementById('dvol-detail-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'dvol-comment-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:4100;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:440px;width:95%;padding:28px;">
      <h3 style="margin:0 0 16px;font-size:17px;color:var(--navy);">📝 Ajouter un commentaire</h3>
      <textarea id="dvol-comment-text" placeholder="Saisir votre commentaire..." rows="4"
        style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button onclick="document.getElementById('dvol-comment-modal').remove()" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:14px;color:#6b7280;">Annuler</button>
        <button onclick="dvolActionSauvegarderCommentaire('${dossierId}')" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--navy,#1e3a5f);color:white;cursor:pointer;font-size:14px;font-weight:600;">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function dvolActionSauvegarderCommentaire(dossierId) {
  const text = document.getElementById('dvol-comment-text')?.value?.trim();
  if (!text) return;
  document.getElementById('dvol-comment-modal')?.remove();
  const { error } = await db.from('dvol_dossiers').update({ commentaire: text, updated_at: new Date().toISOString() }).eq('id', dossierId);
  if (!error) { showNotif('📝 Commentaire enregistré.', 'success'); await renderDvol(); }
  else showNotif('Erreur lors de l\'enregistrement.', 'error');
}

// ─── ACTION : Marquer étape réalisée ─────────────────────────────────────────
async function dvolActionMarquerEtape(suiviEtapeId, dossierId) {
  const ok = await dvolMarquerEtapeRealisee(suiviEtapeId);
  if (ok) {
    showNotif('✅ Étape marquée comme réalisée.', 'success');
    document.getElementById('dvol-detail-modal')?.remove();
    await renderDvol();
  } else {
    showNotif("Erreur lors de la mise à jour de l'étape.", 'error');
  }
}

// ─── ACTION : Véhicule retrouvé ───────────────────────────────────────────────
async function dvolActionVehiculeRetrouve(dossierId) {
  document.getElementById('dvol-detail-modal')?.remove();
  const ok = await dvolCloturerVehiculeRetrouve(dossierId);
  if (ok) { showNotif('🚗✅ Dossier clôturé — véhicule retrouvé.', 'success'); await renderDvol(); }
}

// ─── ACTION : Clôturer sans retrouver ────────────────────────────────────────
async function dvolActionCloturerSansRetrouve(dossierId) {
  document.getElementById('dvol-detail-modal')?.remove();
  const confirmed = await dvolAfficherDialogConfirmation(
    '📕 Clôture définitive',
    'Le véhicule n\'a pas été retrouvé. Cette action clôture le dossier pour indemnisation. Action irréversible.',
    'Confirmer la clôture'
  );
  if (!confirmed) return;
  const ok = await dvolChangerStatut(dossierId, 'cloture_indem');
  if (ok) { showNotif('📕 Dossier clôturé — indemnisation.', 'success'); await renderDvol(); }
}

// ─── EXPOSITION GLOBALE (appelées depuis onclick HTML) ───────────────────────
window.dvolOuvrirNouveauDossier    = dvolOuvrirNouveauDossier;
window.dvolSoumettreNouveauDossier = dvolSoumettreNouveauDossier;
window.dvolOuvrirDossier           = dvolOuvrirDossier;
window.dvolOuvrirActions           = dvolOuvrirActions;
window.dvolActionConfirmerDocuments = dvolActionConfirmerDocuments;
window.dvolActionChangerStatut     = dvolActionChangerStatut;
window.dvolActionAppliquerStatut   = dvolActionAppliquerStatut;
window.dvolActionAjouterCommentaire = dvolActionAjouterCommentaire;
window.dvolActionSauvegarderCommentaire = dvolActionSauvegarderCommentaire;
window.dvolActionMarquerEtape      = dvolActionMarquerEtape;
window.dvolActionVehiculeRetrouve  = dvolActionVehiculeRetrouve;
window.dvolActionCloturerSansRetrouve = dvolActionCloturerSansRetrouve;
window.renderDvol                  = renderDvol;
