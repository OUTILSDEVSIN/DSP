// ============================================================
// DVOL-UI.JS — Interface utilisateur du module Dvol
// Version 1.1 — 02 avril 2026
// Exploite les nouveaux champs : portefeuille, notes,
// action_requise, documents_recus_liste, date_ouverture,
// assure_email
// ============================================================

// ═══════════════════════════════════════════════════════════════
// POINT D'ENTRÉE — appelé par switchTool('dvol') dans core.js
// ═══════════════════════════════════════════════════════════════
async function renderDvol() {
  const tableau = document.getElementById('dvol-tableau');
  const alertes = document.getElementById('dvol-alertes');

  if (!tableau) return;

  tableau.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Chargement des dossiers vol…</div>';
  if (alertes) alertes.innerHTML = '';

  // ── Alertes / relances ──────────────────────────────────────
  const relances = await dvolVerifierRelances();
  if (alertes && relances && relances.length > 0) {
    alertes.innerHTML = `
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:18px;">🔔</span>
        <span style="color:#92400e;font-weight:600;">${relances.length} dossier(s) nécessitent une action</span>
      </div>`;
  }

  // ── Tableau de bord ─────────────────────────────────────────
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

  const rows = dossiers.map(d => {
    const actionBadge = d.action_requise
      ? `<span title="Action requise" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:6px;vertical-align:middle;"></span>`
      : '';

    const docsRecus = Array.isArray(d.documents_recus_liste) ? d.documents_recus_liste.length : 0;
    const docsCell = docsRecus > 0
      ? `<span style="font-size:12px;background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;">✓ ${docsRecus} doc${docsRecus > 1 ? 's' : ''}</span>`
      : `<span style="font-size:12px;color:#9ca3af;">—</span>`;

    const portefeuille = d.portefeuille
      ? `<span style="font-size:11px;color:#6b7280;">${d.portefeuille}</span>`
      : '—';

    return `
      <tr style="border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.15s;"
          onmouseover="this.style.background='#f9fafb'"
          onmouseout="this.style.background=''"
          onclick="dvolOuvrirDossier('${d.id}')">
        <td style="padding:12px 16px;font-weight:600;color:var(--navy);">
          ${actionBadge}${d.numero_dossier || '—'}
        </td>
        <td style="padding:12px 16px;">
          <div style="font-weight:500;">${d.assure_nom || '—'}</div>
          ${d.assure_email ? `<div style="font-size:11px;color:#9ca3af;">${d.assure_email}</div>` : ''}
        </td>
        <td style="padding:12px 16px;">${d.compagnie || '—'}</td>
        <td style="padding:12px 16px;">${portefeuille}</td>
        <td style="padding:12px 16px;">
          <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:white;background:${dvolCouleurStatut(d.statut)};">
            ${dvolLabelStatut(d.statut)}
          </span>
        </td>
        <td style="padding:12px 16px;">${docsCell}</td>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;">
          ${d.date_declaration ? new Date(d.date_declaration).toLocaleDateString('fr-FR') : '—'}
        </td>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;">
          ${d.date_prochaine_etape ? new Date(d.date_prochaine_etape).toLocaleDateString('fr-FR') : '—'}
        </td>
      </tr>`;
  }).join('');

  tableau.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">N° Dossier</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Assuré</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Compagnie</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Portefeuille</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Statut</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Documents</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Déclaration</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Prochaine étape</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─── OUVRIR UN DOSSIER VOL EXISTANT ─────────────────────────
async function dvolOuvrirDossier(dossierId) {
  const dossier = await dvolGetDossier(dossierId);
  if (!dossier) return;

  const etapes = await dvolGetEtapesDossier(dossierId);

  const etapesHtml = etapes.length === 0
    ? `<p style="color:#9ca3af;font-size:13px;text-align:center;padding:16px;">Aucune étape définie.</p>`
    : etapes.map(e => {
        const label = e.dvol_etapes_template?.label || 'Étape';
        const statut = e.statut;
        const icon = statut === 'realise' ? '✅' : statut === 'en_attente' ? '⏳' : statut === 'alerte' ? '🔴' : '⬜';
        const dateP = e.date_prevue ? new Date(e.date_prevue).toLocaleDateString('fr-FR') : '—';
        const dateR = e.date_realisee ? new Date(e.date_realisee).toLocaleDateString('fr-FR') : null;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <span style="font-size:16px;">${icon}</span>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:#1f2937;">${label}</div>
              <div style="font-size:11px;color:#9ca3af;">Prévue : ${dateP}${dateR ? ` — Réalisée : ${dateR}` : ''}</div>
              ${e.commentaire ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;font-style:italic;">${e.commentaire}</div>` : ''}
            </div>
            ${statut !== 'realise' ? `<button onclick="dvolActionEtape('${e.id}','${dossierId}')" style="padding:4px 10px;border-radius:6px;border:1px solid #d1d5db;background:white;cursor:pointer;font-size:12px;">Marquer fait</button>` : ''}
          </div>`;
      }).join('');

  const docs = dossier.documents_recus_liste || [];
  const docsHtml = docs.length > 0
    ? docs.map(doc => `<span style="display:inline-block;padding:2px 8px;background:#e0f2fe;color:#0369a1;border-radius:12px;font-size:11px;margin:2px;">${typeof doc === 'string' ? doc : doc.nom || JSON.stringify(doc)}</span>`).join('')
    : `<span style="color:#9ca3af;font-size:12px;">Aucun document reçu</span>`;

  const overlay = document.createElement('div');
  overlay.className = 'dispatch-modal-overlay';
  overlay.id = 'dvol-detail-modal';
  overlay.innerHTML = `
    <div class="dispatch-modal" style="max-width:680px;width:95%;max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;font-size:18px;color:var(--navy);">🚗 Dossier ${dossier.numero_dossier}</h2>
        <button onclick="document.getElementById('dvol-detail-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">×</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
        <div>
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Assuré</div>
          <div style="font-weight:600;">${dossier.assure_nom || '—'}</div>
          ${dossier.assure_email ? `<div style="font-size:12px;color:#6b7280;">${dossier.assure_email}</div>` : ''}
        </div>
        <div>
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Compagnie</div>
          <div style="font-weight:600;">${dossier.compagnie || '—'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Portefeuille</div>
          <div>${dossier.portefeuille || '—'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Statut</div>
          <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:white;background:${dvolCouleurStatut(dossier.statut)};">
            ${dvolLabelStatut(dossier.statut)}
          </span>
        </div>
        <div>
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Date déclaration</div>
          <div>${dossier.date_declaration ? new Date(dossier.date_declaration).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;">Date ouverture</div>
          <div>${dossier.date_ouverture ? new Date(dossier.date_ouverture).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📂 Documents reçus</div>
        <div style="padding:10px;background:#f9fafb;border-radius:8px;">${docsHtml}</div>
      </div>

      ${dossier.notes ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📝 Notes</div>
        <div style="padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;line-height:1.6;color:#374151;">${dossier.notes}</div>
      </div>` : ''}

      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📋 Étapes de suivi</div>
        <div style="padding:0 4px;">${etapesHtml}</div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
        <button onclick="dvolChangerStatutUI('${dossier.id}')" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:13px;">🔄 Changer statut</button>
        <button onclick="dvolConfirmerDocumentsUI('${dossier.id}')" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:13px;">📂 Confirmer documents</button>
        <button onclick="dvolCloturerVehiculeRetrouveUI('${dossier.id}')" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:13px;">🚗 Véhicule retrouvé</button>
      </div>

      <button onclick="document.getElementById('dvol-detail-modal').remove()" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:14px;">Fermer</button>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ─── ACTION MARQUER ÉTAPE RÉALISÉE ──────────────────────────
async function dvolActionEtape(suiviEtapeId, dossierId) {
  const ok = await dvolMarquerEtapeRealisee(suiviEtapeId);
  if (ok) {
    document.getElementById('dvol-detail-modal')?.remove();
    await dvolOuvrirDossier(dossierId);
    await renderDvol();
  }
}

// ─── CHANGER STATUT — UI ─────────────────────────────────────
function dvolChangerStatutUI(dossierId) {
  const statuts = [
    { val: 'declare', label: '📋 Déclaré' },
    { val: 'en_attente_documents', label: '📂 En attente de documents' },
    
    { val: 'relance', label: '🔔 Relancé' },
    { val: 'en_cours_expertise', label: "🔍 En cours d'expertise" },
    { val: 'en_attente_cloture', label: '⏳ En attente de clôture' },
    { val: 'vehicule_retrouve', label: '🚗 Véhicule retrouvé' },
    { val: 'labtaf', label: '📁 LABTAF' },
    { val: 'refuse', label: '❌ Refusé' },
    { val: 'clos', label: '✅ Clos' }
  ];

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
  overlay.id = 'dvol-statut-modal';

  overlay.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
      <h3 style="margin:0 0 16px;font-size:16px;color:#1f2937;">🔄 Changer le statut</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${statuts.map(s => `
          <button onclick="dvolAppliquerStatut('${dossierId}','${s.val}')"
            style="padding:9px 14px;border:1px solid #e5e7eb;border-radius:8px;background:white;text-align:left;cursor:pointer;font-size:13px;transition:background 0.15s;"
            onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
            ${s.label}
          </button>`).join('')}
      </div>
      <button onclick="document.getElementById('dvol-statut-modal').remove()" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:13px;color:#6b7280;">Annuler</button>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function dvolAppliquerStatut(dossierId, nouveauStatut) {
  document.getElementById('dvol-statut-modal')?.remove();
  document.getElementById('dvol-detail-modal')?.remove();
  const ok = await dvolChangerStatut(dossierId, nouveauStatut);
  if (ok) {
    await renderDvol();
    await dvolOuvrirDossier(dossierId);
  }
}

// ─── CONFIRMER DOCUMENTS — UI ────────────────────────────────
async function dvolConfirmerDocumentsUI(dossierId) {
  const ok = await dvolConfirmerDocuments(dossierId);
  if (ok) {
    document.getElementById('dvol-detail-modal')?.remove();
    await renderDvol();
    await dvolOuvrirDossier(dossierId);
  }
}

// ─── CLÔTURER VÉHICULE RETROUVÉ — UI ────────────────────────
async function dvolCloturerVehiculeRetrouveUI(dossierId) {
  document.getElementById('dvol-detail-modal')?.remove();
  const ok = await dvolCloturerVehiculeRetrouve(dossierId);
  if (ok) {
    await renderDvol();
  }
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
          <input id="dvol-form-compagnie" type="text" placeholder="Ex: AXA, MAIF, Groupama…" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Portefeuille</label>
          <input id="dvol-form-portefeuille" type="text" placeholder="Ex: Paris Nord, IDF…" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Date de déclaration *</label>
          <input id="dvol-form-date" type="date" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" value="${new Date().toISOString().split('T')[0]}">
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
  const numero      = document.getElementById('dvol-form-numero')?.value.trim();
  const assureNom   = document.getElementById('dvol-form-assure')?.value.trim();
  const assureEmail = document.getElementById('dvol-form-email')?.value.trim();
  const compagnie   = document.getElementById('dvol-form-compagnie')?.value.trim();
  const portefeuille= document.getElementById('dvol-form-portefeuille')?.value.trim();
  const dateDecl    = document.getElementById('dvol-form-date')?.value;
  const errEl       = document.getElementById('dvol-form-error');

  if (!numero || !assureNom || !dateDecl) {
    errEl.textContent = 'Veuillez renseigner les champs obligatoires (*).';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';

  const gestionnaireId = currentUserData?.id || null;

  const { data: dossier, error } = await db
    .from('dvol_dossiers')
    .insert({
      numero_dossier: numero,
      gestionnaire_id: gestionnaireId,
      compagnie: compagnie || null,
      portefeuille: portefeuille || null,
      date_declaration: dateDecl,
      assure_nom: assureNom,
      assure_email: assureEmail || null,
      statut: 'declare'
    })
    .select()
    .single();

  if (error) {
    errEl.textContent = 'Erreur lors de la création : ' + error.message;
    errEl.style.display = 'block';
    return;
  }

  if (compagnie) {
    await db.rpc('initialiser_suivi_dvol', {
      p_dossier_id: dossier.id,
      p_compagnie: compagnie
    });
  }

  document.getElementById('dvol-nouveau-modal')?.remove();
  await renderDvol();
}
