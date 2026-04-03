// ============================================================
// DVOL.JS — Fonctions data du module Dvol (vol de vehicules)
// Version 1.5 — 03 avril 2026
// Corrections :
//   - Retrait des caracteres speciaux (em-dash, box-drawing)
//     dans les commentaires pour eviter SyntaxError encodage
//   - dvolGetEtapesDossier : tri ORDER BY retire (non supporte
//     sur relation jointe en Supabase JS v2), tri cote JS
//   - dvolChangerStatut : ajout auditLog pour tracabilite
//   - dvolVerifierRelances : gestionnaire_id ajoute au SELECT
//     pour eviter l'echec du filtre .eq()
//   - dvolConfirmerDocuments : statut -> 'en_instruction' au
//     lieu de 'relance' (workflow correct)
// ============================================================

// --- TABLEAU DE BORD -----------------------------------------
async function dvolGetTableauDeBord() {
  const isAdmin = ['admin', 'manager'].includes(currentUserData?.role);

  let query = db
    .from('dvol_tableau_de_bord')
    .select('*')
    .order('date_prochaine_etape', { ascending: true, nullsFirst: false });

  // Les gestionnaires ne voient que leurs dossiers
  if (!isAdmin && currentUserData?.id) {
    query = query.eq('gestionnaire_id', currentUserData.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[dvol] Erreur tableau de bord:', error.message);
    return [];
  }
  return data || [];
}

// --- RECUPERER UN DOSSIER COMPLET ----------------------------
// Lit depuis dvol_tableau_de_bord pour avoir tous les champs
// calcules : action_requise, notes, portefeuille,
// documents_recus_liste, date_ouverture, assure_email
async function dvolGetDossier(dossierId) {
  const { data, error } = await db
    .from('dvol_tableau_de_bord')
    .select('*')
    .eq('id', dossierId)
    .single();

  if (error) {
    // Fallback sur la table brute si la vue echoue
    console.warn('[dvol] Vue indisponible, fallback dvol_dossiers:', error.message);
    const { data: fallback, error: err2 } = await db
      .from('dvol_dossiers')
      .select('*')
      .eq('id', dossierId)
      .single();
    if (err2) {
      console.error('[dvol] Erreur lecture dossier:', err2.message);
      return null;
    }
    return fallback;
  }
  return data;
}

// --- RECUPERER LES ETAPES D'UN DOSSIER -----------------------
// CORRECTION : .order() sur relation jointe non supporte en
// Supabase JS v2 — tri effectue cote JS apres reception
async function dvolGetEtapesDossier(dossierId) {
  const { data, error } = await db
    .from('dvol_suivi_etapes')
    .select('*, dvol_etapes_template(label, description, ordre)')
    .eq('dossier_id', dossierId);

  if (error) {
    console.error('[dvol] Erreur etapes:', error.message);
    return [];
  }

  // Tri JS sur l'ordre du template
  return (data || []).sort((a, b) => {
    const ordreA = a.dvol_etapes_template?.ordre ?? 9999;
    const ordreB = b.dvol_etapes_template?.ordre ?? 9999;
    return ordreA - ordreB;
  });
}

// --- MARQUER UNE ETAPE COMME REALISEE ------------------------
async function dvolMarquerEtapeRealisee(suiviEtapeId) {
  const { error } = await db
    .from('dvol_suivi_etapes')
    .update({
      statut: 'realise',
      date_realisee: new Date().toISOString().split('T')[0]
    })
    .eq('id', suiviEtapeId);

  if (error) {
    console.error('[dvol] Erreur marquage etape:', error.message);
    return false;
  }
  return true;
}

// --- LIBERER UN DOSSIER (retour statut declare) ---------------
async function dvolLibererDossier(dossierId) {
  const { error } = await db
    .from('dvol_dossiers')
    .update({ statut: 'declare' })
    .eq('id', dossierId);

  if (error) {
    console.error('[dvol] Erreur liberation dossier:', error.message);
    return false;
  }

  if (typeof auditLog === 'function') {
    await auditLog('DVOL_LIBERER', 'Dossier #' + dossierId + ' libere -> declare');
  }

  return true;
}

// --- CHANGER LE STATUT D'UN DOSSIER --------------------------
// CORRECTION : ajout auditLog pour tracabilite des changements
async function dvolChangerStatut(dossierId, nouveauStatut) {
  const statutsValides = [
    'declare', 'en_attente_documents', 'relance',
    'en_instruction', 'en_cours_expertise', 'en_attente_cloture',
    'vehicule_retrouve', 'labtaf', 'refuse', 'clos'
  ];

  if (!statutsValides.includes(nouveauStatut)) {
    console.error('[dvol] Statut invalide:', nouveauStatut);
    return false;
  }

  const update = { statut: nouveauStatut };

  if (nouveauStatut === 'vehicule_retrouve') {
    update.vehicule_retrouve_confirme = true;
    update.date_vehicule_retrouve = new Date().toISOString();
  }

  const { error } = await db
    .from('dvol_dossiers')
    .update(update)
    .eq('id', dossierId);

  if (error) {
    console.error('[dvol] Erreur changement statut:', error.message);
    return false;
  }

  // Tracabilite — log du changement de statut
  if (typeof auditLog === 'function') {
    await auditLog('DVOL_STATUT', 'Dossier #' + dossierId + ' -> ' + nouveauStatut);
  }

  return true;
}

// --- CONFIRMER RECEPTION DOCUMENTS ---------------------------
// CORRECTION : statut -> 'en_instruction' (workflow correct)
// 'relance' etait incorrect car les docs sont recus
async function dvolConfirmerDocuments(dossierId) {
  const { error } = await db
    .from('dvol_dossiers')
    .update({
      documents_recus: true,
      date_reception_documents: new Date().toISOString().split('T')[0],
      statut: 'en_instruction'
    })
    .eq('id', dossierId)
    .in('statut', ['declare', 'en_attente_documents']);

  if (error) {
    console.error('[dvol] Erreur confirmation documents:', error.message);
    return false;
  }

  if (typeof auditLog === 'function') {
    await auditLog('DVOL_DOCS_RECUS', 'Documents recus — dossier #' + dossierId);
  }

  return true;
}

// --- CLOTURE — VEHICULE RETROUVE -----------------------------
async function dvolCloturerVehiculeRetrouve(dossierId) {
  const { error } = await db
    .from('dvol_dossiers')
    .update({
      statut: 'vehicule_retrouve',
      vehicule_retrouve_confirme: true,
      date_vehicule_retrouve: new Date().toISOString()
    })
    .eq('id', dossierId);

  if (error) {
    console.error('[dvol] Erreur cloture vehicule retrouve:', error.message);
    return false;
  }

  if (typeof auditLog === 'function') {
    await auditLog('DVOL_VEHICULE_RETROUVE', 'Vehicule retrouve — dossier #' + dossierId);
  }

  return true;
}

// --- VERIFIER LES RELANCES -----------------------------------
// CORRECTION : gestionnaire_id inclus dans le SELECT pour que
// le filtre .eq('gestionnaire_id') fonctionne correctement
async function dvolVerifierRelances() {
  const isAdmin = ['admin', 'manager'].includes(currentUserData?.role);

  let query = db
    .from('dvol_tableau_de_bord')
    .select('id, numero_dossier, gestionnaire_id, action_requise, relance_cloture_active')
    .or('action_requise.eq.true,relance_cloture_active.eq.true');

  if (!isAdmin && currentUserData?.id) {
    query = query.eq('gestionnaire_id', currentUserData.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[dvol] Erreur relances:', error.message);
    return [];
  }
  return data || [];
}

// --- HELPERS STATUT ------------------------------------------
function dvolLabelStatut(statut) {
  const labels = {
    declare:              'Declare',
    en_attente_documents: 'En attente docs',
    relance:              'Relance',
    en_instruction:       'En instruction',
    en_cours_expertise:   'Expertise',
    en_attente_cloture:   'En att. cloture',
    vehicule_retrouve:    'Vehicule retrouve',
    labtaf:               'LABTAF',
    refuse:               'Refuse',
    clos:                 'Clos'
  };
  return labels[statut] || statut || '-';
}

function dvolCouleurStatut(statut) {
  const couleurs = {
    declare:              '#3b82f6',
    en_attente_documents: '#f59e0b',
    relance:              '#f97316',
    en_instruction:       '#8b5cf6',
    en_cours_expertise:   '#06b6d4',
    en_attente_cloture:   '#64748b',
    vehicule_retrouve:    '#10b981',
    labtaf:               '#6366f1',
    refuse:               '#ef4444',
    clos:                 '#059669'
  };
  return couleurs[statut] || '#9ca3af';
}
