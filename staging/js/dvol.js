// ============================================================
// DVOL.JS — Fonctions data du module Dvol (vol de véhicules)
// Version 1.2 — 02 avril 2026
// Statuts valides : declare | en_attente_documents | relance |
//   en_cours_expertise | en_attente_cloture | vehicule_retrouve
//   | labtaf | refuse | clos
// ============================================================

// ─── TABLEAU DE BORD ─────────────────────────────────────────
async function dvolGetTableauDeBord() {
  const { data, error } = await db
    .from('dvol_tableau_de_bord')
    .select('*')
    .order('date_prochaine_etape', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[dvol] Erreur tableau de bord:', error.message);
    return [];
  }
  return data || [];
}

// ─── RÉCUPÉRER UN DOSSIER COMPLET ────────────────────────────
async function dvolGetDossier(dossierId) {
  const { data, error } = await db
    .from('dvol_dossiers')
    .select('*')
    .eq('id', dossierId)
    .single();

  if (error) {
    console.error('[dvol] Erreur lecture dossier:', error.message);
    return null;
  }
  return data;
}

// ─── RÉCUPÉRER LES ÉTAPES D'UN DOSSIER ───────────────────────
async function dvolGetEtapesDossier(dossierId) {
  const { data, error } = await db
    .from('dvol_suivi_etapes')
    .select('*, dvol_etapes_template(label, description, ordre)')
    .eq('dossier_id', dossierId)
    .order('dvol_etapes_template(ordre)', { ascending: true });

  if (error) {
    console.error('[dvol] Erreur étapes:', error.message);
    return [];
  }
  return data || [];
}

// ─── MARQUER UNE ÉTAPE COMME RÉALISÉE ────────────────────────
async function dvolMarquerEtapeRealisee(suiviEtapeId) {
  const { error } = await db
    .from('dvol_suivi_etapes')
    .update({
      statut: 'realise',
      date_realisee: new Date().toISOString().split('T')[0]
    })
    .eq('id', suiviEtapeId);

  if (error) {
    console.error('[dvol] Erreur marquage étape:', error.message);
    return false;
  }
  return true;
}

// ─── CHANGER LE STATUT D'UN DOSSIER ──────────────────────────
// Statuts valides (contrainte CHECK en base) :
// declare | en_attente_documents | relance | en_cours_expertise |
// en_attente_cloture | vehicule_retrouve | labtaf | refuse | clos
async function dvolChangerStatut(dossierId, nouveauStatut) {
  const statutsValides = [
    'declare', 'en_attente_documents', 'relance',
    'en_cours_expertise', 'en_attente_cloture',
    'vehicule_retrouve', 'labtaf', 'refuse', 'clos'
  ];

  if (!statutsValides.includes(nouveauStatut)) {
    console.error('[dvol] Statut invalide:', nouveauStatut);
    return false;
  }

  const update = { statut: nouveauStatut };

  // Colonnes spécifiques selon le statut de clôture
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
  return true;
}

// ─── CONFIRMER RÉCEPTION DOCUMENTS ───────────────────────────
// Passe le dossier en "relance" (n'existe pas en base)
// Si le dossier est en declare ou en_attente_documents
async function dvolConfirmerDocuments(dossierId) {
  const { error } = await db
    .from('dvol_dossiers')
    .update({
      documents_recus: true,
      date_reception_documents: new Date().toISOString().split('T')[0],
      statut: 'relance'
    })
    .eq('id', dossierId)
    .in('statut', ['declare', 'en_attente_documents']);

  if (error) {
    console.error('[dvol] Erreur confirmation documents:', error.message);
    return false;
  }
  return true;
}

// ─── CLÔTURER — VÉHICULE RETROUVÉ ────────────────────────────
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
    console.error('[dvol] Erreur clôture véhicule retrouvé:', error.message);
    return false;
  }
  return true;
}

// ─── VÉRIFIER LES RELANCES ───────────────────────────────────
async function dvolVerifierRelances() {
  const { data, error } = await db
    .from('dvol_tableau_de_bord')
    .select('id, numero_dossier, action_requise, relance_cloture_active')
    .or('action_requise.eq.true,relance_cloture_active.eq.true');

  if (error) {
    console.error('[dvol] Erreur relances:', error.message);
    return [];
  }
  return data || [];
}

// ─── HELPERS STATUT ──────────────────────────────────────────
function dvolLabelStatut(statut) {
  const labels = {
    declare:              'Déclaré',
    en_attente_documents: 'En attente docs',
    relance:              'Relancé',
    en_cours_expertise:   'Expertise',
    en_attente_cloture:   'En att. clôture',
    vehicule_retrouve:    'Véhicule retrouvé',
    labtaf:               'LABTAF',
    refuse:               'Refusé',
    clos:                 'Clos'
  };
  return labels[statut] || statut || '—';
}

function dvolCouleurStatut(statut) {
  const couleurs = {
    declare:              '#3b82f6',
    en_attente_documents: '#f59e0b',
    relance:              '#f97316',
    en_cours_expertise:   '#06b6d4',
    en_attente_cloture:   '#64748b',
    vehicule_retrouve:    '#10b981',
    labtaf:               '#6366f1',
    refuse:               '#ef4444',
    clos:                 '#059669'
  };
  return couleurs[statut] || '#9ca3af';
}
