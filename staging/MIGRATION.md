# Dispatchis — Architecture Refactorisée v2.5.41

## Structure

```
DSP/
├── index.html                          ← Coquille HTML pure (7 KB vs 694 KB avant)
├── MIGRATION.md                        ← Ce fichier
└── assets/
    ├── images/
    │   ├── logo.jpg                    ← Extrait du base64 inline
    │   └── logo2.png                   ← Extrait du base64 inline
    ├── css/
    │   ├── base.css                    ← Variables CSS, reset, dark mode
    │   ├── layout.css                  ← Nav, tabs, structure générale
    │   ├── components.css              ← Cards, modals, boutons, formulaires
    │   └── screens.css                 ← Styles spécifiques par vue
    └── js/
        ├── config.js                   ← Init Supabase + variables globales partagées
        ├── auth.js                     ← Login, logout, token, renouvellement mdp, RGPD
        ├── tabs.js                     ← Navigation entre onglets
        ├── actions.js                  ← Actions utilitaires partagées
        ├── init.js                     ← Notifications, T10, initialisation au load
        ├── admin/
        │   ├── users.js                ← Gestion utilisateurs (admin)
        │   ├── audit.js                ← Journal audit R4, purge 3 mois
        │   └── god-switch.js           ← Mode test admin + dplane complémentaire
        ├── dashboard/
        │   ├── kpis.js                 ← KPIs, compteurs, loadData
        │   └── stats.js                ← Stats journalières, historique référents
        ├── dispatch/
        │   ├── habilitations.js        ← Chargement habilitations gestionnaires
        │   ├── import.js               ← Import XLSX → Supabase dossiers
        │   ├── dispatch.js             ← Vue dispatch principale
        │   ├── dispatch-intelligent.js ← Algorithme dispatch intelligent (T1)
        │   ├── attribution.js          ← Attribution dossiers + copier référence
        │   ├── dossiers.js             ← Mes dossiers, toggle traité, récupérer
        │   └── trocs.js                ← Système d'échange de dossiers
        └── dvol/
            └── dvol.js                 ← Module complet Dvol (vol véhicules)
```

## Ordre de chargement des scripts (critique)

L'ordre dans index.html est intentionnel :
1. `config.js` — DOIT être premier (init db, variables globales)
2. `auth.js` — DOIT être avant tout module métier
3. `tabs.js`, `actions.js` — utilitaires partagés
4. `admin/` — gestion utilisateurs et audit
5. `dispatch/` — cœur métier (habilitations en premier dans ce groupe)
6. `dashboard/` — lecture seule des données
7. `dvol/` — module autonome
8. `init.js` — DOIT être dernier (appels d'init qui dépendent de tout le reste)

## Variables globales partagées (config.js)

Ces variables sont accessibles par tous les modules :
- `db` — client Supabase
- `currentUserData` — { id, email, nom, prenom, role }
- `allDossiers` — tableau des dossiers chargés
- `allUsers` — tableau des utilisateurs
- `currentHabilitations` — habilitations du gestionnaire connecté

## Checklist de migration

- [ ] Tester le login / logout
- [ ] Tester l'import XLSX
- [ ] Tester le dispatch intelligent
- [ ] Tester les habilitations par rôle
- [ ] Tester le module Dvol
- [ ] Tester la purge audit (admin)
- [ ] Vérifier dark mode
- [ ] Vérifier auto-logout inactivité
- [ ] Tester sur staging avant prod
