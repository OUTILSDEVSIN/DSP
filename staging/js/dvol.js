// ============================================================
// DVOL.JS — Fonctions data du module Dvol (vol de véhicules)
// Version 1.1 — 02 avril 2026
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
async function dvolChangerStatut(dossierId, nouveauStatut) {
  const update = { statut: nouveauStatut };

  if (nouveauStatut === 'clos' || nouveauStatut === 'vehicule_retrouve' || nouveauStatut === 'labtaf' || nouveauStatut === 'refuse') {
    update.date_cloture = new Date().toISOString().split('T')[0];
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
async function dvolConfirmerDocuments(dossierId) {
  const { error } = await db
    .from('dvol_dossiers')
    .update({ statut: 'en_instruction' })
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
      date_cloture: new Date().toISOString().split('T')[0]
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
    declare: 'Déclaré',
    en_attente_documents: 'En attente docs',
    en_instruction: 'En instruction',
    relance: 'Relancé',
    en_cours_expertise: 'Expertise',
    en_attente_cloture: 'En att. clôture',
    vehicule_retrouve: 'Véhicule retrouvé',
    labtaf: 'LABTAF',
    refuse: 'Refusé',
    clos: 'Clos'
  };
  return labels[statut] || statut || '—';
}

function dvolCouleurStatut(statut) {
  const couleurs = {
    declare: '#3b82f6',
    en_attente_documents: '#f59e0b',
    en_instruction: '#8b5cf6',
    relance: '#f97316',
    en_cours_expertise: '#06b6d4',
    en_attente_cloture: '#64748b',
    vehicule_retrouve: '#10b981',
    labtaf: '#6366f1',
    refuse: '#ef4444',
    clos: '#059669'
  };
  return couleurs[statut] || '#9ca3af';
}
