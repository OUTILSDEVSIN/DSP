# CDC — Assistant IA de Dispatch

**Projet :** DISPATCHIS (DSP)  
**Version :** EVOL-002  
**Environnement cible :** Staging → Production  
**Date de rédaction :** 18/05/2026  
**Demandeur :** Marie Lou (Manager)  
**Statut :** En développement  
**Fichier cible principal :** `staging/assets/js/dispatch/dispatch-intelligent.js`

---

## 1. Contexte et objectif

Actuellement, Marilou lance le dispatch depuis une série de modales successives, puis visualise la proposition dans un tableau Kanban avec drag & drop par gestionnaire.

L'objectif de cette évolution est de **remplacer les modales de paramétrage** par un **assistant IA conversationnel** qui :
1. Lit les données du jour (dossiers à dispatcher, gestionnaires actifs, planning Dplane)
2. Pose 3 à 4 questions ciblées à Marilou
3. Génère directement une proposition intelligente
4. Injecte cette proposition dans le Kanban existant

Marilou conserve ensuite **toute la main** sur le Kanban pour affiner par drag & drop avant validation finale.

---

## 2. Modèle IA retenu

### Fournisseur : Google Gemini API

| Paramètre | Valeur |
|---|---|
| Modèle | `gemini-2.5-flash-lite` |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent` |
| Authentification | Clé API Google Cloud (voir section 3) |
| Coût estimé | 0 € (Free Tier dans les quotas) |
| Tokens par appel estimés | ~3 400 tokens (basé sur données PROD réelles) |
| Quota requêtes/jour | 1 000 req/jour — usage DSP : ~2 req/jour = 0,2% du quota |
| Quota tokens/jour | 500 000 000 tokens/jour — usage DSP : ~3 400 = 0,00068% du quota |

### Pourquoi Flash-Lite

Le modèle `gemini-2.5-flash-lite` est le plus léger et le plus économique de la gamme Gemini. Pour un cas d'usage de raisonnement de répartition sur ~70 dossiers et ~5 gestionnaires, il est largement suffisant. Si les règles métier devenaient plus complexes, basculer sur `gemini-2.5-flash` est trivial (changement d'une ligne).

---

## 3. Clé API et conformité RGPD

### Prérequis obligatoire avant tout développement

> ⚠️ **IMPORTANT — À faire avant d'écrire une seule ligne de code**

La clé API **doit être générée depuis un projet Google Cloud avec facturation activée**. Cette étape est gratuite et ne génère aucune dépense tant que l'usage reste dans les quotas. Elle est indispensable pour les raisons suivantes :

**Sans facturation activée (Free Tier pur AI Studio) :**
- Les données envoyées dans les prompts peuvent être utilisées pour entraîner les modèles Google
- Des reviewers humains Google peuvent accéder aux contenus
- Noms de salariés et références sinistres transmis sans garantie → **non conforme RGPD**

**Avec facturation activée (même sans dépenser) :**
- Les données sont automatiquement en "Paid Service" au sens des CGU Google
- Aucune utilisation pour l'entraînement des modèles
- Aucun accès humain aux prompts
- **Conforme RGPD pour un usage professionnel interne**

### Étapes pour créer la clé

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un projet (ex : `dsp-dispatch-ia`)
3. Activer la facturation (carte bancaire requise, poser une alerte budget à 1 €)
4. Activer l'API "Generative Language API"
5. Créer une clé API dans "Identifiants"
6. Restreindre la clé à l'API `generativelanguage.googleapis.com` uniquement

### Stockage de la clé en staging

Pour le POC staging, la clé peut être stockée dans un fichier de configuration dédié :

```js
// staging/assets/js/config/gemini-config.js
// ⚠️ NE PAS COMMITER CE FICHIER EN PROD — ajouter au .gitignore pour la PROD
const GEMINI_API_KEY = 'AIza...';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
```

> ⚠️ En production, cette clé devra être gérée côté serveur ou via une variable d'environnement sécurisée. Pour le POC staging interne (accès restreint), ce stockage est acceptable temporairement.

---

## 4. Parcours utilisateur (Marilou)

### Avant (flux actuel)
```
[Bouton "Lancer le dispatch"] 
  → Modale 1 : choix des paramètres
  → Modale 2 : validation
  → Kanban affiché
```

### Après (nouveau flux)
```
[Bouton "Préparer le dispatch avec l'assistant"] 
  → Écran de cadrage : 3-4 questions IA pré-remplies
  → [Bouton "Générer la proposition"]
  → Kanban injecté automatiquement
  → Marilou ajuste par drag & drop
  → [Bouton "Valider le dispatch"]
```

---

## 5. Les 4 questions de cadrage

L'assistant affiche un écran simple avec des questions pré-remplies à partir des données du jour. Marilou peut modifier chaque réponse avant de lancer la génération.

### Question 1 — Profils du jour
**Texte affiché :**
> "Aujourd'hui, j'ai détecté [X] gestionnaires disponibles : [liste]. Parmi eux, [Prénom1], [Prénom2] sont sur des activités pré-ouverture. Tu confirmes ces profils ?"

**Source :** Lecture de `dplane_planning` + `dplane_activites` du jour courant  
**Réponse :** Checkbox par gestionnaire / profil modifiable

### Question 2 — Dossiers anciens
**Texte affiché :**
> "J'ai [N] dossiers de plus de 24h et [M] de plus de 48h. Veux-tu les prioriser vers des gestionnaires spécifiques ?"

**Source :** Calcul d'ancienneté sur `date_creation` (format `DD/MM/YYYY`)  
**Réponse :** Oui/Non + select gestionnaire cible si Oui

### Question 3 — Volumes maximum
**Texte affiché :**
> "Par défaut, je propose [N] dossiers max pour les gestionnaires téléphone et [M] pour les pré-ouverture. Tu veux modifier ?"

**Source :** Valeurs par défaut configurables (téléphone : 10, pré-ouverture : 30)  
**Réponse :** Champ numérique par profil, modifiable

### Question 4 — Exclusions / cas particuliers
**Texte affiché :**
> "Y a-t-il un gestionnaire à exclure du dispatch aujourd'hui ou une règle particulière ?"

**Source :** Aucune (saisie libre)  
**Réponse :** Checkbox par gestionnaire + champ texte libre optionnel

---

## 6. Construction du prompt Gemini

Le prompt est construit dynamiquement en JS à partir des réponses de Marilou et des données Supabase.

### Structure du prompt

```js
function buildDispatchPrompt(gestionnaires, dossiers, reponsesMarilou) {
  const prompt = `
Tu es un assistant de dispatch de dossiers sinistres pour une équipe de gestion.
Tu dois répartir les dossiers entre les gestionnaires de manière équilibrée et intelligente.

## Gestionnaires disponibles aujourd'hui
${gestionnaires.map(g => 
  `- ${g.prenom} ${g.nom} | Profil: ${g.profil} | Max dossiers: ${g.max} | Niveau: ${g.niveau}`
).join('\n')}

## Dossiers à dispatcher (${dossiers.length} au total)
${dossiers.map(d => 
  `- ID:${d.id} | Ref:${d.ref_sinistre} | Nature:${d.nature_label} | Type:${d.type} | Age:${d.age_jours}j`
).join('\n')}

## Règles définies par la manager
- Profils confirmés : ${reponsesMarilou.profils}
- Dossiers anciens priorisés vers : ${reponsesMarilou.prioriteDossiersAnciens}
- Max téléphone : ${reponsesMarilou.maxTelephone} | Max pré-ouverture : ${reponsesMarilou.maxPreouverture}
- Exclusions : ${reponsesMarilou.exclusions || 'Aucune'}

## Format de réponse attendu (JSON strict)
Retourne UNIQUEMENT un JSON valide, sans texte avant ou après, au format :
{
  "proposition": [
    { "gestionnaire_id": 1, "dossiers": ["SINMIAA...", "SINMIAA..."] },
    { "gestionnaire_id": 2, "dossiers": ["SINMIAA..."] }
  ],
  "resume": "Texte court expliquant les choix principaux (max 3 phrases)",
  "alertes": ["Dossier X non attribué car aucun gestionnaire habilité"] 
}
  `;
  return prompt;
}
```

---

## 7. Appel API Gemini

```js
async function appelGemini(prompt) {
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.2,        // Réponses déterministes, peu de créativité
      maxOutputTokens: 2048,   // Suffisant pour 70 dossiers
      responseMimeType: 'application/json'  // Force le JSON
    }
  };

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Gemini API erreur ${response.status}: ${err.error?.message}`);
    }

    const data = await response.json();
    const texte = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(texte);

  } catch (e) {
    console.error('Erreur appel Gemini:', e);
    afficherErreurDispatch('L\'assistant IA est temporairement indisponible. Tu peux continuer manuellement.');
    return null;
  }
}
```

---

## 8. Injection dans le Kanban existant

Une fois la réponse Gemini parsée, elle est injectée dans le Kanban via la fonction existante de proposition (à adapter) :

```js
async function genererPropositionAvecIA(reponsesMarilou) {
  // 1. Afficher le loader
  afficherLoader('L\'assistant prépare la proposition...');

  // 2. Récupérer les données fraîches
  const gestionnaires = await chargerGestionnairesActifs();  // existant
  const dossiers = await chargerDossiersADispatcher();       // existant

  // 3. Calculer l'âge des dossiers
  dossiers.forEach(d => {
    d.age_jours = calculerAgeJours(d.date_creation);  // voir section 9
  });

  // 4. Construire et envoyer le prompt
  const prompt = buildDispatchPrompt(gestionnaires, dossiers, reponsesMarilou);
  const proposition = await appelGemini(prompt);
  if (!proposition) return;  // Gemini indisponible, l'utilisateur continue manuellement

  // 5. Injecter dans le Kanban
  injecterPropositionKanban(proposition);  // voir section suivante

  // 6. Afficher le résumé IA
  afficherResumeIA(proposition.resume, proposition.alertes);

  // 7. Cacher le loader
  cacherLoader();
}

function injecterPropositionKanban(proposition) {
  // Reset du Kanban
  reinitialiserKanban();  // vider les colonnes gestionnaires

  // Injecter chaque dossier dans la bonne colonne
  proposition.proposition.forEach(({ gestionnaire_id, dossiers }) => {
    dossiers.forEach(ref => {
      const dossier = allDossiers.find(d => d.ref_sinistre === ref);
      if (dossier) ajouterDossierKanban(gestionnaire_id, dossier);
    });
  });
}
```

---

## 9. Fonctions utilitaires

### Calcul de l'âge d'un dossier

```js
function calculerAgeJours(dateCreationStr) {
  // dateCreationStr format : 'DD/MM/YYYY'
  const [jour, mois, annee] = dateCreationStr.split('/');
  const dateCreation = new Date(`${annee}-${mois}-${jour}`);
  const maintenant = new Date();
  const diffMs = maintenant - dateCreation;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
```

---

## 10. Interface — Écran de cadrage

### HTML à ajouter dans `staging/index.html`

```html
<!-- Modale Assistant IA Dispatch -->
<div id="modal-assistant-ia" class="modal" style="display:none;">
  <div class="modal-content modal-large">
    <div class="modal-header">
      <h2>🤖 Assistant de dispatch</h2>
      <span class="modal-close" onclick="fermerAssistantIA()">×</span>
    </div>
    <div class="modal-body">
      
      <!-- Résumé du jour -->
      <div id="ia-resume-jour" class="ia-resume-bloc">
        <!-- Injecté dynamiquement -->
      </div>

      <!-- Question 1 : Profils -->
      <div class="ia-question-bloc" id="ia-q1">
        <h3>👥 Profils du jour</h3>
        <div id="ia-q1-content"><!-- Injecté dynamiquement --></div>
      </div>

      <!-- Question 2 : Dossiers anciens -->
      <div class="ia-question-bloc" id="ia-q2">
        <h3>⏰ Dossiers anciens</h3>
        <div id="ia-q2-content"><!-- Injecté dynamiquement --></div>
      </div>

      <!-- Question 3 : Volumes max -->
      <div class="ia-question-bloc" id="ia-q3">
        <h3>📊 Volumes maximum</h3>
        <div id="ia-q3-content"><!-- Injecté dynamiquement --></div>
      </div>

      <!-- Question 4 : Exclusions -->
      <div class="ia-question-bloc" id="ia-q4">
        <h3>🚫 Exclusions</h3>
        <div id="ia-q4-content"><!-- Injecté dynamiquement --></div>
      </div>

    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="fermerAssistantIA()">Annuler</button>
      <button class="btn btn-primary" id="btn-generer-ia" onclick="lancerGenerationIA()">
        ✨ Générer la proposition
      </button>
    </div>
  </div>
</div>
```

---

## 11. Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `staging/assets/js/config/gemini-config.js` | **Créer** | Clé API et config Gemini (ne pas commiter en prod) |
| `staging/assets/js/dispatch/gemini-assistant.js` | **Créer** | Toute la logique IA (prompt, appel API, injection) |
| `staging/assets/js/dispatch/dispatch-intelligent.js` | **Modifier** | Brancher le bouton assistant IA sur le nouveau flux |
| `staging/index.html` | **Modifier** | Ajouter la modale assistant IA + chargement des nouveaux scripts |
| `staging/assets/css/dispatch.css` | **Modifier** | Styles des blocs `.ia-question-bloc`, `.ia-resume-bloc` |

---

## 12. Ordre de développement recommandé

1. **Étape 1** — Créer `gemini-config.js` avec la clé API (projet Google Cloud avec facturation)
2. **Étape 2** — Créer `gemini-assistant.js` avec `buildDispatchPrompt()` et `appelGemini()`
3. **Étape 3** — Tester l'appel API en isolation (console JS) avec des données mockées
4. **Étape 4** — Ajouter la modale HTML dans `index.html` + styles CSS basiques
5. **Étape 5** — Brancher `genererPropositionAvecIA()` sur le bouton
6. **Étape 6** — Implémenter `injecterPropositionKanban()` en branchant sur le Kanban existant
7. **Étape 7** — Tests complets en staging avec Marilou
8. **Étape 8** — Validation → migration en PROD (avec gestion sécurisée de la clé)

---

## 13. Gestion des erreurs

| Cas | Comportement attendu |
|---|---|
| Gemini API indisponible (timeout, 503) | Message d'info + Kanban vide pour dispatch manuel |
| Quota Free Tier dépassé (erreur 429) | Message d'info + Kanban vide pour dispatch manuel |
| Réponse JSON invalide de Gemini | Retry 1 fois, sinon Kanban vide |
| Aucun dossier à dispatcher | Bloquer le bouton + message "Aucun dossier disponible" |
| Aucun gestionnaire actif aujourd'hui | Bloquer le bouton + message "Aucun gestionnaire disponible" |

> Dans tous les cas d'erreur IA, Marilou peut toujours remplir le Kanban manuellement. L'IA est une **aide**, jamais un blocage.

---

## 14. Points d'attention pour l'IA de développement

- La stack est **100% Vanilla JS**, pas de React, pas de framework. Tous les modules sont chargés en globals dans `index.html`. Le fichier `gemini-assistant.js` doit exposer ses fonctions en globals (`window.genererPropositionAvecIA = ...`).
- L'ordre de chargement des scripts dans `index.html` est **critique**. `gemini-config.js` doit être chargé **avant** `gemini-assistant.js`.
- Le champ `date_creation` dans la table `dossiers` est de type `text` au format `DD/MM/YYYY`. Utiliser `calculerAgeJours()` défini en section 9 pour le calcul d'ancienneté.
- La variable globale `allDossiers` contient tous les dossiers chargés. Ne pas refaire un appel Supabase si elle est déjà populée.
- Le modèle retourne du JSON — utiliser `responseMimeType: 'application/json'` dans `generationConfig` pour forcer ce format et éviter du parsing fragile.
