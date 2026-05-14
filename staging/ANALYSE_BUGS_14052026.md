# 🔍 Rapport d'analyse — Session du 14/05/2026

> **Contexte** : Suite à un test de dispatch en PROD avec exclusion d'Andy Canali, des dossiers sont restés non attribués. Analyse complète réalisée sur Supabase PROD + comparaison des fichiers de code.

---

## 📋 Résumé exécutif

- **13 dossiers non attribués** détectés en PROD au moment de l'analyse
- **12 dossiers MRH** (`type = "Habitation"`) → problème de données en base
- **1 dossier Auto** (`nature = INC`) → problème de code
- **5 points** identifiés au total (bugs + améliorations souhaitées)
- Le nouveau code déployé le matin du 14/05 **n'est pas la cause** — l'ordre de chargement des scripts est correct

---

## 🐛 Bugs identifiés

### BUG-01 — Casse `"Auto"` ≠ `"AUTO"` dans `isEligible`

| | |
|---|---|
| **Fichier concerné** | `assets/js/dispatch/dispatch-intelligent.js` (ancien code) |
| **Impact** | 1 dossier `Auto / INC` non attribué |
| **Cause** | La valeur stockée en base est `"Auto"` (avec majuscule initiale), mais les habilitations stockent `"AUTO"`. La fonction `normalizeType` est censée corriger ça mais n'était pas présente dans l'ancien fichier monolithique. |
| **Statut** | ✅ Corrigé dans le nouveau code via `normalizeType` dans `habilitations.js` |
| **Correction** | `normalizeType` convertit `"auto"` → `"AUTO"` via `TYPE_LABEL_MAP` |

---

### BUG-02 — Nature `INC` absente des habilitations gestionnaires

| | |
|---|---|
| **Fichier concerné** | Table `habilitation_gestionnaires` (Supabase PROD) |
| **Impact** | Dossier `SINMIAA100007974` non attribué |
| **Cause** | Aucun gestionnaire n'a `INC` dans sa liste de natures habilitées |
| **Statut** | ⚠️ À corriger — ajouter `INC` dans les habilitations des gestionnaires concernés |
| **Correction** | Via l'interface Habilitations de Dispatchis ou directement en base sur staging puis PROD |

---

### BUG-03 — `"Habitation"` en base ≠ `"MRH"` dans les habilitations

| | |
|---|---|
| **Fichier concerné** | Table `dossiers` (Supabase PROD) + `assets/js/dispatch/import.js` |
| **Impact** | **12 dossiers MRH bloqués** (du 03/05 au 06/05/2026) |
| **Cause** | Lors du premier import de dossiers MRH début mai, le champ `type` a été enregistré avec la valeur `"Habitation"` (libellé métier de la grille Excel) au lieu de `"MRH"` (code technique attendu par les habilitations). `normalizeType` corrige cela à la volée au moment du dispatch, mais les données en base restent avec `"Habitation"`. |
| **Statut** | ⚠️ À corriger en base + à sécuriser dans `import.js` |
| **Correction en base (staging d'abord)** : |

```sql
UPDATE dossiers
SET type = 'MRH'
WHERE type = 'Habitation'
  AND (gestionnaire IS NULL OR gestionnaire = '');
```

> ⚠️ À appliquer sur **staging** pour validation avant PROD.

**Correction dans `import.js`** : s'assurer que le mapping `"Habitation" → "MRH"` est appliqué à l'enregistrement, pas seulement à la lecture.

---

### BUG-04 — Nature stockée en libellé long au lieu du code court

| | |
|---|---|
| **Fichier concerné** | `assets/js/dispatch/import.js` |
| **Impact** | 1 dossier (`SINMIAM100002358`) avec `nature = "Cambriolage ou tentative de cambriolage"` au lieu de `"VOL"` ou `"BDG"` |
| **Cause** | Le champ `Nature MIN` (code court) n'est pas systématiquement utilisé à l'import. Certaines lignes du fichier Excel contiennent le libellé long dans la colonne nature. |
| **Statut** | ⚠️ À corriger dans `import.js` |
| **Correction** | Forcer l'utilisation de la colonne `Nature MIN` à l'import, avec fallback sur un mapping libellé → code court |

---

### BUG-05 — `normalizeType` absente de l'ancien code monolithique

| | |
|---|---|
| **Fichier concerné** | `dispatch-intelligent-1.js` (ancien fichier, remplacé le 14/05) |
| **Impact** | Potentiellement tous les checks `type` silencieusement cassés dans l'ancien code |
| **Cause** | Dans l'ancien fichier monolithique, `normalizeType` était appelée ligne 166 mais jamais définie dans ce fichier. Elle vivait dans `habilitations.js` qui était chargé séparément. |
| **Statut** | ✅ Résolu avec le nouveau code refactorisé |

---

## 🔧 Améliorations souhaitées

### AMÉLIO-01 — Tri des dossiers : utiliser `date_ouverture` au lieu de `date_etat`

| | |
|---|---|
| **Fichier concerné** | `assets/js/dispatch/dispatch-intelligent.js` et `attribution.js` |
| **Problème** | Le tri secondaire utilise `date_etat` pour ordonner les dossiers (plus ancienne en premier). Or `date_etat` peut changer entre deux exports, ce qui rend le tri **instable** : un dossier peut changer de rang entre deux sessions. |
| **Comportement attendu** | Trier sur `date_ouverture` (date de création du sinistre) qui est stable dans le temps et reflète l'ancienneté réelle du dossier. |
| **Priorité** | 🔴 Haute — remontée par les managers |
| **Statut** | ❌ À corriger sur staging |

**Code actuel dans `dispatch-intelligent.js`** :
```javascript
// - Tri secondaire : plus ancienne date_etat en premier -
var da = parseDE(a.date_etat);
var db = parseDE(b.date_etat);
```

**Code cible** :
```javascript
// - Tri secondaire : plus ancienne date_ouverture en premier (stable) -
var da = parseDE(a.date_ouverture);
var db = parseDE(b.date_ouverture);
```

> Même correction à appliquer dans `attribution.js` qui a son propre tri indépendant.

---

### AMÉLIO-02 — Comparaison portefeuille : remplacer `.includes()` par `===`

| | |
|---|---|
| **Fichier concerné** | `assets/js/dispatch/dispatch-intelligent.js` — fonction `isEligible` |
| **Problème** | La comparaison portefeuille utilise `.includes()` ce qui peut provoquer des faux positifs si un code portefeuille est contenu dans un autre (ex: `"MIA"` dans `"MIANEO"`). |
| **Statut** | ⚠️ À corriger par précaution |

**Code actuel** :
```javascript
var okPf = pf.some(function(p){ return dPf.includes(p); });
```

**Code cible** :
```javascript
var okPf = pf.some(function(p){ return dPf === p; });
```

---

## 📊 État des 13 dossiers non attribués au 14/05/2026

| Ref sinistre | Type | Nature | Cause |
|---|---|---|---|
| SINMIAM100002339 | Habitation | AUTRE | BUG-03 |
| SINMIAM100002342 | Habitation | AUTRE | BUG-03 |
| SINMIAM100002344 | Habitation | DDE | BUG-03 |
| SINMIAM100002347 | Habitation | DDE | BUG-03 |
| SINMIAM100002350 | Habitation | DDE | BUG-03 |
| SINMIAM100002351 | Habitation | DDE | BUG-03 |
| SINMIAM100002352 | Habitation | AUTRE | BUG-03 |
| SINMIAM100002353 | Habitation | DDE | BUG-03 |
| SINMIAM100002355 | Habitation | AUTRE | BUG-03 |
| SINMIAM100002356 | Habitation | AUTRE | BUG-03 |
| SINMIAM100002357 | Habitation | AUTRE | BUG-03 |
| SINMIAM100002358 | Habitation | Cambriolage… | BUG-03 + BUG-04 |
| SINMIAA100007974 | Auto | INC | BUG-01 + BUG-02 |

---

## ✅ Plan d'action recommandé (staging → PROD)

| Priorité | Action | Fichier/Table | Environnement |
|---|---|---|---|
| 1 | Correction SQL `type = 'MRH'` sur dossiers non attribués | Table `dossiers` | Staging puis PROD |
| 2 | Ajouter `INC` dans les habilitations gestionnaires Auto | Table `habilitation_gestionnaires` | Staging puis PROD |
| 3 | Tri sur `date_ouverture` dans `dispatch-intelligent.js` | `dispatch-intelligent.js` | Staging puis PROD |
| 4 | Tri sur `date_ouverture` dans `attribution.js` | `attribution.js` | Staging puis PROD |
| 5 | Mapping nature libellé long → code court dans `import.js` | `import.js` | Staging puis PROD |
| 6 | Remplacer `.includes()` par `===` dans `isEligible` | `dispatch-intelligent.js` | Staging puis PROD |

---

> 📝 Document généré automatiquement suite à la session d'analyse du 14/05/2026.
> Toute modification de PROD doit être validée sur staging au préalable.
