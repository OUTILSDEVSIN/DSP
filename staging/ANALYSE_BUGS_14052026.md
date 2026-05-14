# 🔍 Rapport d'analyse — Session du 14/05/2026

> **Contexte** : Suite à un test de dispatch en PROD avec exclusion d'Andy Canali, des dossiers sont restés non attribués. Analyse complète réalisée sur Supabase PROD + comparaison des fichiers de code.

---

## 📋 Résumé exécutif

- **13 dossiers non attribués** détectés en PROD au moment de l'analyse
- **12 dossiers MRH** (`type = "Habitation"`) → problème de données en base
- **1 dossier Auto** (`nature = INC`) → problème d'habilitations + code
- **5 bugs + 2 améliorations** identifiés
- Le nouveau code déployé le matin du 14/05 **n'est pas la cause** — l'ordre de chargement des scripts est correct
- **⚠️ Aucune correction n'a encore été appliquée — tout reste à faire**

---

## 🐛 Bugs identifiés

### BUG-01 — Casse `"Auto"` ≠ `"AUTO"` dans `isEligible`

| | |
|---|---|
| **Fichier concerné** | `assets/js/dispatch/dispatch-intelligent.js` |
| **Impact** | 1 dossier `Auto / INC` non attribué |
| **Cause** | La valeur stockée en base est `"Auto"` (avec majuscule initiale), mais les habilitations stockent `"AUTO"`. La fonction `normalizeType` est présente dans le nouveau code mais le dossier reste bloqué en base. |
| **Statut** | ❌ Non corrigé en PROD |
| **Correction à faire** | Vérifier que `normalizeType` est bien appelée au moment du dispatch et relancer le dispatch sur ce dossier |

---

### BUG-02 — Nature `INC` absente des habilitations gestionnaires

| | |
|---|---|
| **Fichier concerné** | Table `habilitation_gestionnaires` (Supabase PROD) |
| **Impact** | Dossier `SINMIAA100007974` non attribué |
| **Cause** | Aucun gestionnaire n'a `INC` dans sa liste de natures habilitées |
| **Statut** | ❌ Non corrigé en PROD |
| **Correction à faire** | Ajouter `INC` dans les habilitations des gestionnaires Auto concernés via l'interface ou en base (staging d'abord) |

---

### BUG-03 — `"Habitation"` en base ≠ `"MRH"` dans les habilitations

| | |
|---|---|
| **Fichier concerné** | Table `dossiers` (Supabase PROD) + `assets/js/dispatch/import.js` |
| **Impact** | **12 dossiers MRH bloqués** (du 03/05 au 06/05/2026) |
| **Cause** | Lors du premier import de dossiers MRH début mai, le champ `type` a été enregistré avec la valeur `"Habitation"` (libellé métier) au lieu de `"MRH"` (code technique attendu par les habilitations). |
| **Statut** | ❌ Non corrigé en PROD |
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
| **Cause** | Le champ `Nature MIN` (code court) n'est pas systématiquement utilisé à l'import. |
| **Statut** | ❌ Non corrigé en PROD |
| **Correction à faire** | Forcer l'utilisation de la colonne `Nature MIN` à l'import dans `import.js`, avec fallback sur un mapping libellé → code court |

---

### BUG-05 — `normalizeType` absente de l'ancien code monolithique

| | |
|---|---|
| **Fichier concerné** | `dispatch-intelligent-1.js` (ancien fichier, remplacé le 14/05) |
| **Impact** | Tous les checks `type` silencieusement cassés dans l'ancien code |
| **Cause** | Dans l'ancien fichier monolithique, `normalizeType` était appelée ligne 166 mais jamais définie dans ce fichier. |
| **Statut** | ⚠️ Partiellement traité par le refactoring du 14/05 — à confirmer après correction des bugs précédents |

---

## 🔧 Améliorations souhaitées

### AMÉLIO-01 — Tri des dossiers : utiliser `date_ouverture` au lieu de `date_etat`

| | |
|---|---|
| **Fichiers concernés** | `assets/js/dispatch/dispatch-intelligent.js` ET `assets/js/dispatch/attribution.js` |
| **Problème** | Le tri secondaire utilise `date_etat` pour ordonner les dossiers (plus ancienne en premier). Or `date_etat` peut changer entre deux exports, ce qui rend le tri **instable** : un dossier peut changer de rang entre deux sessions. |
| **Comportement attendu** | Trier sur `date_ouverture` (date de création du sinistre) qui est stable et reflète l'ancienneté réelle. |
| **Priorité** | 🔴 Haute — remontée par les managers |
| **Statut** | ❌ Non corrigé — à développer sur staging |

**Code actuel** (dans les deux fichiers) :
```javascript
// Tri secondaire : plus ancienne date_etat en premier
var da = parseDE(a.date_etat);
var db = parseDE(b.date_etat);
```

**Code cible** :
```javascript
// Tri secondaire : plus ancienne date_ouverture en premier (stable)
var da = parseDE(a.date_ouverture);
var db = parseDE(b.date_ouverture);
```

---

### AMÉLIO-02 — Comparaison portefeuille : remplacer `.includes()` par `===`

| | |
|---|---|
| **Fichier concerné** | `assets/js/dispatch/dispatch-intelligent.js` — fonction `isEligible` |
| **Problème** | La comparaison portefeuille utilise `.includes()` ce qui peut provoquer des faux positifs. |
| **Statut** | ❌ Non corrigé — à développer sur staging |

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

| Priorité | Action | Fichier/Table | Statut |
|---|---|---|---|
| 1 | Correction SQL `type = 'MRH'` sur dossiers non attribués | Table `dossiers` | ❌ À faire |
| 2 | Ajouter `INC` dans les habilitations gestionnaires Auto | Table `habilitation_gestionnaires` | ❌ À faire |
| 3 | Tri sur `date_ouverture` dans `dispatch-intelligent.js` | `dispatch-intelligent.js` | ❌ À faire |
| 4 | Tri sur `date_ouverture` dans `attribution.js` | `attribution.js` | ❌ À faire |
| 5 | Mapping nature libellé long → code court dans `import.js` | `import.js` | ❌ À faire |
| 6 | Remplacer `.includes()` par `===` dans `isEligible` | `dispatch-intelligent.js` | ❌ À faire |

> ⚠️ Toute modification doit être validée sur **staging** avant d'aller en **PROD**.

---

> 📝 Document généré automatiquement suite à la session d'analyse du 14/05/2026.
