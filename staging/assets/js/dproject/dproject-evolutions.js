/* =========================================================
   Dproject — ÉVOLUTIONS (stub)
   ---------------------------------------------------------
   À CÂBLER ULTÉRIEUREMENT
   ---------------------------------------------------------
   Ce fichier accueillera la logique de l'onglet Évolutions :
     • dpRenderEvolutions()      → liste des évolutions
     • dpFilterEvolutions()      → filtre par statut
     • dpRenderEvolutionsTable() → rendu du tableau
     • dpOuvrirFormulaireProposer() → modal "Proposer une évolution"
     • dpSoumettreProposition()  → soumission

   Bonne nouvelle : tout le générique (détail, édition, captures,
   workflow) est DÉJÀ dans dproject-core.js et fonctionne pour
   `type === 'evolution'`. Il ne reste qu'à coder les vues + form.

   Pattern recommandé : copier dproject-bugs.js et adapter :
     • Table source     : dsp_evolutions
     • Statuts          : Nouvelle / En analyse / Acceptée / Refusée / Livrée
     • Code préfixe     : EVO-XXX au lieu de BUG-XXX
   ========================================================= */

// (vide pour l'instant — l'onglet affiche la vue "à venir" gérée
//  par dprojectRender dans dproject-main.js)
