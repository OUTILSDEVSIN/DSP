// ============================================================
// DPLANE.JS — Module de planning intelligent pour Dispatchis
// Version 1.0 — 25 mars 2026
// ============================================================

// ─── RÉCUPÉRER LE PLANNING D'UNE DATE ───────────────────────
async function dplaneGetPlanningDuJour(date) {
  const { data, error } = await supabase
    .from('dplane_planning')
    .select(`
      id,
      creneau,
      gestionnaire_id,
      activite_id,
      deleted_at,
      dplane_activites ( nom, code, couleur_hex, permet_multiples ),
      utilisateurs!dplane_planning_gestionnaire_id_fkey ( id, nom, prenom, actif )
    `)
    .eq('jour', date)
    .is('deleted_at', null);

  if (error) { console.error('dplaneGetPlanningDuJour:', error); return []; }
  return data;
}

// ─── RÉCUPÉRER LES ABSENCES D'UNE DATE ──────────────────────
async function dplaneGetAbsencesDuJour(date) {
  const { data, error } = await supabase
    .from('dplane_absences')
    .select(`
      id,
      creneau,
      type_absence,
      gestionnaire_id,
      utilisateurs!dplane_absences_gestionnaire_id_fkey ( id, nom, prenom )
    `)
    .eq('jour', date);

  if (error) { console.error('dplaneGetAbsencesDuJour:', error); return []; }
  return data;
}

// ─── RÉCUPÉRER LE PLANNING D'UNE SEMAINE ────────────────────
async function dplaneGetPlanningSemaine(dateDebut, dateFin) {
  const { data, error } = await supabase
    .from('dplane_planning')
    .select(`
      id,
      jour,
      creneau,
      gestionnaire_id,
      activite_id,
      dplane_activites ( nom, code, couleur_hex, permet_multiples ),
      utilisateurs!dplane_planning_gestionnaire_id_fkey ( id, nom, prenom, actif )
    `)
    .gte('jour', dateDebut)
    .lte('jour', dateFin)
    .is('deleted_at', null)
    .order('jour');

  if (error) { console.error('dplaneGetPlanningSemaine:', error); return []; }
  return data;
}

// ─── RÉCUPÉRER LES ABSENCES D'UNE SEMAINE ───────────────────
async function dplaneGetAbsencesSemaine(dateDebut, dateFin) {
  const { data, error } = await supabase
    .from('dplane_absences')
    .select(`
      id,
      jour,
      creneau,
      type_absence,
      gestionnaire_id,
      utilisateurs!dplane_absences_gestionnaire_id_fkey ( id, nom, prenom )
    `)
    .gte('jour', dateDebut)
    .lte('jour', dateFin)
    .order('jour');

  if (error) { console.error('dplaneGetAbsencesSemaine:', error); return []; }
  return data;
}

// ─── AJOUTER UNE ENTRÉE PLANNING ────────────────────────────
async function dplaneAjouterPlanning(managerId, gestionnaireId, jour, creneau, activiteId) {
  const { data, error } = await supabase
    .from('dplane_planning')
    .insert({
      manager_id: managerId,
      gestionnaire_id: gestionnaireId,
      jour: jour,
      creneau: creneau,
      activite_id: activiteId
    })
    .select();

  if (error) { console.error('dplaneAjouterPlanning:', error); return null; }
  return data[0];
}

// ─── SUPPRIMER UNE ENTRÉE PLANNING (soft delete) ────────────
async function dplaneSupprimerPlanning(planningId) {
  const { error } = await supabase
    .from('dplane_planning')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', planningId);

  if (error) { console.error('dplaneSupprimerPlanning:', error); return false; }
  return true;
}

// ─── AJOUTER UNE ABSENCE ────────────────────────────────────
async function dplaneAjouterAbsence(managerId, gestionnaireId, jour, creneau, typeAbsence) {
  const { data, error } = await supabase
    .from('dplane_absences')
    .insert({
      manager_id: managerId,
      gestionnaire_id: gestionnaireId,
      jour: jour,
      creneau: creneau,
      type_absence: typeAbsence
    })
    .select();

  if (error) { console.error('dplaneAjouterAbsence:', error); return null; }
  return data[0];
}

// ─── SUPPRIMER UNE ABSENCE ──────────────────────────────────
async function dplaneSupprimerAbsence(absenceId) {
  const { error } = await supabase
    .from('dplane_absences')
    .delete()
    .eq('id', absenceId);

  if (error) { console.error('dplaneSupprimerAbsence:', error); return false; }
  return true;
}

// ─── RÉCUPÉRER TOUTES LES ACTIVITÉS ─────────────────────────
async function dplaneGetActivites() {
  const { data, error } = await supabase
    .from('dplane_activites')
    .select('*')
    .eq('actif', true)
    .order('ordre');

  if (error) { console.error('dplaneGetActivites:', error); return []; }
  return data;
}

// ─── COPIER UNE SEMAINE VERS LA SUIVANTE ────────────────────
async function dplaneCopierSemaine(dateDebutSource, dateFinSource, managerId) {
  const planning = await dplaneGetPlanningSemaine(dateDebutSource, dateFinSource);
  if (!planning.length) return { succes: 0, erreurs: 0 };

  const sourceDate = new Date(dateDebutSource);
  let succes = 0, erreurs = 0;

  for (const entree of planning) {
    const ancienJour = new Date(entree.jour);
    const diffJours = Math.round((ancienJour - sourceDate) / (1000 * 60 * 60 * 24));
    const nouveauJour = new Date(sourceDate);
    nouveauJour.setDate(nouveauJour.getDate() + diffJours + 7);
    const nouveauJourStr = nouveauJour.toISOString().split('T')[0];

    const result = await dplaneAjouterPlanning(
      managerId,
      entree.gestionnaire_id,
      nouveauJourStr,
      entree.creneau,
      entree.activite_id
    );
    result ? succes++ : erreurs++;
  }

  return { succes, erreurs };
}

// ─── INTÉGRATION DISPATCHIS : PRÉCHARGER LES GESTIONNAIRES ──
async function dplanePrechargerGestionnaires(date) {
  const planning = await dplaneGetPlanningDuJour(date);
  const absences = await dplaneGetAbsencesDuJour(date);

  if (!planning.length) return null; // fallback : pas de planning

  const absentsIds = absences.map(a => a.gestionnaire_id);

  const gestionnairesPreouvertures = planning
    .filter(p =>
      p.dplane_activites?.code === 'PREOUVERTURES' &&
      !absentsIds.includes(p.gestionnaire_id) &&
      p.utilisateurs?.actif === true
    )
    .map(p => ({
      id: p.gestionnaire_id,
      nom: p.utilisateurs?.nom,
      prenom: p.utilisateurs?.prenom,
      creneau: p.creneau
    }));

  return {
    date,
    gestionnaires: gestionnairesPreouvertures,
    planningComplet: planning
  };
}

// ─── POPUP MATINALE : PLANNING DU GESTIONNAIRE ──────────────
async function dplaneGetMonPlanningDuJour(gestionnaireId, date) {
  const { data, error } = await supabase
    .from('dplane_planning')
    .select(`
      creneau,
      dplane_activites ( nom, code, couleur_hex )
    `)
    .eq('gestionnaire_id', gestionnaireId)
    .eq('jour', date)
    .is('deleted_at', null);

  if (error) { console.error('dplaneGetMonPlanningDuJour:', error); return []; }
  return data;
}

// ─── VÉRIFIER SI POPUP DOIT S'AFFICHER ──────────────────────
function dplaneDoitAfficherPopup() {
  const aujourd_hui = new Date().toISOString().split('T')[0];
  const dernierAffichage = localStorage.getItem('dplane_popup_date');
  return dernierAffichage !== aujourd_hui;
}

function dplaneMarquerPopupAffichee() {
  const aujourd_hui = new Date().toISOString().split('T')[0];
  localStorage.setItem('dplane_popup_date', aujourd_hui);
}

// ─── VÉRIFIER CONFLITS ACTIVITÉ ──────────────────────────────
async function dplaneVerifierConflit(jour, creneau, activiteId) {
  const { data: activite } = await supabase
    .from('dplane_activites')
    .select('permet_multiples, nom')
    .eq('id', activiteId)
    .single();

  if (!activite || activite.permet_multiples) return null;

  const { data: existants } = await supabase
    .from('dplane_planning')
    .select('gestionnaire_id')
    .eq('jour', jour)
    .eq('creneau', creneau)
    .eq('activite_id', activiteId)
    .is('deleted_at', null);

  if (existants && existants.length >= 1) {
    return `Attention : un gestionnaire est déjà affecté sur "${activite.nom}" ce créneau. Confirmer quand même ?`;
  }
  return null;
}
