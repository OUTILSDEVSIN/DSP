// ============================================================
// DVOL.JS — Module de suivi des dossiers vol pour Dispatchis
// Version 1.0 — 29 mars 2026
// ============================================================

// ─── INITIALISER UN DOSSIER EN SUIVI DVOL ───────────────────
async function dvolInitialiserDossier(numeroDossier, gestionnaireId, compagnie, dateDeclaration, assureNom, assureEmail) {
  const { data: dossier, error: errDossier } = await supabase
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

  await supabase
    .from('dossiers')
    .update({ is_dvol: true, date_passage_dvol: new Date().toISOString() })
    .eq('numero', numeroDossier);

  const { error: errEtapes } = await supabase.rpc('initialiser_suivi_dvol', {
    p_dossier_id: dossier.id,
    p_compagnie: compagnie
  });

  if (errEtapes) { console.error('dvolInitialiserDossier (étapes):', errEtapes); }
  return dossier;
}

async function dvolGetTableauDeBord() {
  const { data, error } = await supabase.from('dvol_tableau_de_bord').select('*');
  if (error) { console.error('dvolGetTableauDeBord:', error); return []; }
  return data;
}

async function dvolGetDossier(dossierId) {
  const { data, error } = await supabase
    .from('dvol_dossiers')
    .select(`*, utilisateurs!dvol_dossiers_gestionnaire_id_fkey ( id, nom, prenom )`)
    .eq('id', dossierId)
    .single();
  if (error) { console.error('dvolGetDossier:', error); return null; }
  return data;
}

async function dvolGetEtapesDossier(dossierId) {
  const { data, error } = await supabase
    .from('dvol_suivi_etapes')
    .select(`*, dvol_etapes_template ( ordre, label, description, delai_jours )`)
    .eq('dossier_id', dossierId)
    .order('date_prevue', { ascending: true });
  if (error) { console.error('dvolGetEtapesDossier:', error); return []; }
  return data;
}

async function dvolConfirmerDocuments(dossierId) {
  const { error } = await supabase.rpc('confirmer_documents_dvol', { p_dossier_id: dossierId });
  if (error) { console.error('dvolConfirmerDocuments:', error); return false; }
  return true;
}

async function dvolCloturerVehiculeRetrouve(dossierId) {
  const confirmed = await dvolAfficherDialogConfirmation(
    '🚗 Véhicule retrouvé',
    'Confirmez-vous que le véhicule a été retrouvé ? Cette action clôturera immédiatement le suivi Dvol.',
    'Oui, clôturer le dossier'
  );
  if (!confirmed) return false;
  const { error } = await supabase.rpc('cloturer_dvol_vehicule_retrouve', { p_dossier_id: dossierId });
  if (error) { console.error('dvolCloturerVehiculeRetrouve:', error); return false; }
  return true;
}

async function dvolChangerStatut(dossierId, nouveauStatut, dateCloturePrevue = null) {
  const update = { statut: nouveauStatut, updated_at: new Date().toISOString() };
  if (dateCloturePrevue) update.date_cloture_prevue = dateCloturePrevue;
  const { error } = await supabase.from('dvol_dossiers').update(update).eq('id', dossierId);
  if (error) { console.error('dvolChangerStatut:', error); return false; }
  return true;
}

async function dvolMarquerEtapeRealisee(suiviEtapeId, commentaire = null) {
  const { error } = await supabase
    .from('dvol_suivi_etapes')
    .update({ statut: 'realise', date_realisee: new Date().toISOString().split('T')[0], commentaire, updated_at: new Date().toISOString() })
    .eq('id', suiviEtapeId);
  if (error) { console.error('dvolMarquerEtapeRealisee:', error); return false; }
  return true;
}

async function dvolGetNotificationsNonLues(gestionnaireId) {
  const { data, error } = await supabase
    .from('dvol_notifications')
    .select(`*, dvol_dossiers ( numero_dossier, assure_nom, compagnie )`)
    .eq('gestionnaire_id', gestionnaireId)
    .eq('lu', false)
    .order('date_envoi', { ascending: false });
  if (error) { console.error('dvolGetNotificationsNonLues:', error); return []; }
  return data;
}

async function dvolMarquerNotificationLue(notifId) {
  const { error } = await supabase.from('dvol_notifications').update({ lu: true }).eq('id', notifId);
  if (error) { console.error('dvolMarquerNotificationLue:', error); return false; }
  return true;
}

async function dvolVerifierRelances(gestionnaireId) {
  const tableau = await dvolGetTableauDeBord();
  const aujourd_hui = new Date().toISOString().split('T')[0];
  const alertes = [];
  for (const dossier of tableau) {
    if (dossier.gestionnaire_id !== gestionnaireId) continue;
    if (dossier.relance_cloture_active) {
      alertes.push({ type: 'cloture', dossierId: dossier.id, numeroDossier: dossier.numero_dossier, assureNom: dossier.assure_nom, message: `⏰ Clôture en attente — Dossier ${dossier.numero_dossier} (${dossier.assure_nom})` });
    }
    if (dossier.date_prochaine_etape && dossier.date_prochaine_etape <= aujourd_hui) {
      alertes.push({ type: 'etape', dossierId: dossier.id, numeroDossier: dossier.numero_dossier, assureNom: dossier.assure_nom, message: `📋 Action requise — ${dossier.prochaine_etape} (${dossier.numero_dossier})` });
    }
  }
  return alertes;
}

function dvolAfficherDialogConfirmation(titre, message, labelConfirm = 'Confirmer') {
  return new Promise((resolve) => {
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
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#dvol-dialog-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
    overlay.querySelector('#dvol-dialog-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); };
  });
}

function dvolLabelStatut(statut) {
  const labels = { 'declare': '📋 Déclaré', 'en_attente_documents': '📂 En attente de documents', 'relance': '🔔 Relancé', 'en_cours_expertise': '🔍 En cours d\'expertise', 'en_attente_cloture': '⏳ En attente de clôture', 'vehicule_retrouve': '🚗 Véhicule retrouvé', 'labtaf': '📁 LABTAF', 'refuse': '❌ Refusé', 'clos': '✅ Clos' };
  return labels[statut] || statut;
}

function dvolCouleurStatut(statut) {
  const couleurs = { 'declare': '#3b82f6', 'en_attente_documents': '#f59e0b', 'relance': '#f97316', 'en_cours_expertise': '#8b5cf6', 'en_attente_cloture': '#06b6d4', 'vehicule_retrouve': '#22c55e', 'labtaf': '#6b7280', 'refuse': '#ef4444', 'clos': '#10b981' };
  return couleurs[statut] || '#6b7280';
}
// ===== RENDER DVOL — Tableau de bord =====
async function renderDvol() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement...</div>';

  const dossiers = await dvolGetTableauDeBord();
  const aujourd_hui = new Date().toISOString().split('T')[0];

  const total   = dossiers.length;
  const enCours = dossiers.filter(d => !['clos','vehicule_retrouve','labtaf','refuse'].includes(d.statut)).length;
  const alertes = dossiers.filter(d => d.date_prochaine_etape && d.date_prochaine_etape <= aujourd_hui && !['clos','vehicule_retrouve','labtaf','refuse'].includes(d.statut)).length;
  const clos    = dossiers.filter(d => ['clos','vehicule_retrouve'].includes(d.statut)).length;

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="color:var(--navy);margin:0">🚗 Suivi Dvol</h2>
      <span style="font-size:12px;color:#888;background:#f0f4f8;padding:4px 12px;border-radius:12px">
        📅 Mis à jour le ${new Date().toLocaleDateString('fr-FR')}
      </span>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="number">${total}</div><div class="label">Total dossiers Dvol</div></div>
      <div class="stat-card"><div class="number" style="color:#e67e22">${enCours}</div><div class="label">En cours</div></div>
      <div class="stat-card"><div class="number" style="color:#e74c3c">${alertes}</div><div class="label">⚠️ Action requise</div></div>
      <div class="stat-card"><div class="number" style="color:#27ae60">${clos}</div><div class="label">Clôturés</div></div>
    </div>
    <div class="table-container">
      <div class="table-toolbar">
        <h2>Dossiers vol <span style="color:#888;font-weight:400;font-size:14px">(${total})</span></h2>
      </div>`;

  if (!total) {
    html += `<div style="text-align:center;padding:60px;color:#aaa">
      <div style="font-size:48px;margin-bottom:12px">🚗</div>
      <p>Aucun dossier vol en suivi pour le moment.</p>
    </div>`;
  } else {
    html += `<table>
      <thead><tr>
        <th>N° Dossier</th><th>Assuré</th><th>Compagnie</th><th>Gestionnaire</th>
        <th>Déclaration</th><th>Prochaine étape</th><th>Statut</th><th>Action</th>
      </tr></thead><tbody>`;

    dossiers.forEach(d => {
      const estActif  = !['clos','vehicule_retrouve','labtaf','refuse'].includes(d.statut);
      const enRetard  = estActif && d.date_prochaine_etape && d.date_prochaine_etape <= aujourd_hui;
      const rowStyle  = enRetard ? 'background:#fff5f5;border-left:3px solid #e74c3c'
                      : estActif ? 'background:#fffde7;border-left:3px solid #f39c12' : '';
      const gestNom   = d.utilisateurs ? (d.utilisateurs.prenom + ' ' + d.utilisateurs.nom) : '—';
      const dateDecl  = d.date_declaration ? new Date(d.date_declaration).toLocaleDateString('fr-FR') : '—';
      const dateEtape = d.date_prochaine_etape ? new Date(d.date_prochaine_etape).toLocaleDateString('fr-FR') : '—';
      const btnAction = enRetard
        ? `<button class="btn btn-danger" style="padding:4px 10px;font-size:11px" onclick="dvolOuvrirDossier('${d.id}')">⚠️ Retard</button>`
        : estActif
          ? `<button class="btn btn-primary" style="padding:4px 10px;font-size:11px" onclick="dvolOuvrirDossier('${d.id}')">📋 Voir</button>`
          : `<button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;opacity:.6" onclick="dvolOuvrirDossier('${d.id}')">📁 Archivé</button>`;

      html += `<tr style="${rowStyle}">
        <td><strong>${d.numero_dossier || d.id}</strong></td>
        <td>${d.assure_nom || '—'}</td>
        <td>${d.compagnie || '—'}</td>
        <td>${gestNom}</td>
        <td style="font-size:12px;color:#666">${dateDecl}</td>
        <td style="font-size:12px;font-weight:600;color:${enRetard ? '#e74c3c' : '#1B3461'}">${dateEtape}</td>
        <td><span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;color:white;background:${dvolCouleurStatut(d.statut)}">${dvolLabelStatut(d.statut)}</span></td>
        <td>${btnAction}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
  }

  html += `</div>`;
  document.getElementById('main-content').innerHTML = html;
}

function dvolOuvrirDossier(id) {
  showNotif('📋 Dossier ' + id + ' — vue détail à venir.', 'info');
}
// ===== FIN RENDER DVOL =====
