// ===== TICKET 1 -- DISPATCH INTELLIGENT =====

function showGestionnairesModal() {
    var gests = (allUsers||[]).filter(function(u) {
        return u.role === 'gestionnaire' || u.role === 'manager' || u.role === 'admin';
    });
    var items = '';
    gests.forEach(function(u) {
        var initials = ((u.prenom||'')[0]||'') + ((u.nom||'')[0]||'');
        items += '<label style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid var(--gray-200);cursor:pointer">'
            + '<div style="display:flex;align-items:center;gap:12px">'
            + '<div style="width:36px;height:36px;border-radius:50%;background:var(--rose);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">' + initials + '</div>'
            + '<div>'
            + '<div style="font-weight:600;color:var(--navy);font-size:14px">' + u.prenom + ' ' + u.nom + '</div>'
            + '<div style="font-size:12px;color:var(--gray-600)">' + u.role.toUpperCase() + '</div>'
            + '</div></div>'
            + '<input type="checkbox" class="gest-active-cb" value="' + u.id + '" checked style="width:18px;height:18px;accent-color:var(--rose)">'
            + '</label>';
    });
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'gest-modal';
    modal.innerHTML = '<div class="modal" style="max-width:500px">'
        + '<h2>👥 Sélection des gestionnaires</h2>'
        + '<p style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Cochez les gestionnaires qui recevront des dossiers aujourd\'hui.</p>'
        + '<div style="max-height:300px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:var(--radius-md);background:var(--gray-100)">' + items + '</div>'
        + '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px">'
        + '<button class="btn btn-secondary" id="btn-gest-cancel">Annuler</button>'
        + '<button class="btn btn-primary" id="btn-gest-confirm">Suivant →</button>'
        + '</div></div>';
    document.body.appendChild(modal);
    document.getElementById('btn-gest-cancel').onclick = function() { closeModal('gest-modal'); };
    document.getElementById('btn-gest-confirm').onclick = confirmGestionnaires;
}

function confirmGestionnaires() {
    var checked = Array.from(document.querySelectorAll('.gest-active-cb:checked')).map(function(cb) { return String(cb.value); });
    if (checked.length === 0) { showNotif('Sélectionnez au moins un gestionnaire', 'error'); return; }
    safeSession.setItem('dispatch_gestionnaires', JSON.stringify(checked));
    closeModal('gest-modal');
    showRepartitionModal();
}

function showRepartitionModal() {
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'repart-modal';
    modal.innerHTML = '<div class="modal" style="max-width:420px">'
        + '<h2>⚙️ Mode de répartition</h2>'
        + '<div id="box-auto" style="display:flex;align-items:center;gap:12px;padding:16px;border:2px solid var(--rose);border-radius:var(--radius-md);margin-bottom:10px;cursor:pointer;background:#fff5f7">'
        + '<input type="radio" id="r-auto" name="repart-mode" value="auto" checked style="width:18px;height:18px;accent-color:var(--rose)">'
        + '<div><strong>Automatique</strong><br><small style="color:var(--gray-600)">Dispatch intelligent par habilitations (15/gestionnaire)</small></div></div>'
        + '<div id="box-manual" style="display:flex;align-items:center;gap:12px;padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius-md);margin-bottom:20px;cursor:pointer">'
        + '<input type="radio" id="r-manual" name="repart-mode" value="manual" style="width:18px;height:18px;accent-color:var(--rose)">'
        + '<div><strong>Manuelle</strong><br><small style="color:var(--gray-600)">Aller directement au menu Attribution</small></div></div>'
        + '<div style="display:flex;gap:12px;justify-content:flex-end">'
        + '<button class="btn btn-secondary" id="btn-repart-cancel">Retour</button>'
        + '<button class="btn btn-primary" id="btn-repart-confirm">Confirmer</button>'
        + '</div></div>';
    document.body.appendChild(modal);
    document.getElementById('box-auto').onclick   = function() { document.getElementById('r-auto').checked = true; };
    document.getElementById('box-manual').onclick = function() { document.getElementById('r-manual').checked = true; };
    document.getElementById('btn-repart-cancel').onclick = function() { closeModal('repart-modal'); };
    document.getElementById('btn-repart-confirm').onclick = function() {
        var mode = document.querySelector('input[name="repart-mode"]:checked').value;
        closeModal('repart-modal');
        if (mode === 'manual') { showTab('attribution'); }
        else { showPropositionModal(); }
    };
}

async function showPropositionModal() {
    await loadDossiers();
    await loadAllUsers();
    var res = await db.from('habilitation_gestionnaires').select('*');
    var habMap = {};
    if (res.data) res.data.forEach(function(h) { habMap[String(h.user_id)] = h; });

    // Charger historique référents pour pré-assignation intelligente
    var resHistoProp = await db.from('historique_sinistres').select('ref_sinistre, gestionnaire, date_traitement');
    var histoPropMap = {};
    if (resHistoProp.data) resHistoProp.data.forEach(function(h){ histoPropMap[h.ref_sinistre] = h; });
    var resFlagProp = await db.from('app_config').select('value').eq('key','historique_actif').maybeSingle();
    var histoPropActif = !resFlagProp.data || resFlagProp.data.value !== 'false';

    // ── ÉVOL-B : Chargement du planning Dplane du jour ───────────────
    // Permet de calculer le Max de dossiers proposé par défaut selon
    // l'activité Préouvertures (journée=25, demi-journée=15, autre=0).
    var todayStr = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD
    var resDplane = await db
        .from('dplane_planning')
        .select('gestionnaire_id, creneau, dplane_activites(code)')
        .eq('jour', todayStr)
        .is('deleted_at', null)
        .eq('is_brouillon', false);
    // Map : gestionnaire_id (string) -> [{ creneau, code }, ...]
    var dplaneMap = {};
    if (resDplane && resDplane.data) {
        resDplane.data.forEach(function(row) {
            var code = row.dplane_activites ? row.dplane_activites.code : null;
            var key = String(row.gestionnaire_id);
            if (!dplaneMap[key]) dplaneMap[key] = [];
            dplaneMap[key].push({ creneau: row.creneau, code: code });
        });
    }

    /**
     * Calcule le Max de dossiers proposé par défaut pour un gestionnaire,
     * selon son planning Dplane du jour (règle ÉVOL-B v4).
     * - Préouvertures journée entière → 25
     * - Préouvertures demi-journée    → 15
     * - Pas de Préouvertures          → 0  (le manager peut quand même attribuer)
     * - Aucun planning saisi          → 15 (fallback prudent)
     * @returns {number} Max indicatif (le manager peut le modifier dans l'UI)
     */
    function getMaxDefaut(gestionnaireId) {
        var entries = dplaneMap[String(gestionnaireId)];
        if (!entries || entries.length === 0) return 15; // fallback : pas de planning
        var preos = entries.filter(function(e) { return e.code === 'PREOUVERTURES'; });
        if (preos.length === 0) return 0; // pas de Préouvertures
        var preoJournee = preos.some(function(e) { return e.creneau === 'journee'; });
        if (preoJournee) return 25;
        return 15; // Préouvertures sur 1 ou plusieurs créneaux mais pas la journée
    }

    /**
     * Renvoie un petit badge HTML représentant le profil Dplane du gestionnaire,
     * affiché à côté de son nom dans la modale.
     */
    function getBadgeProfil(gestionnaireId) {
        var entries = dplaneMap[String(gestionnaireId)] || [];
        var hasPreo = entries.some(function(e) { return e.code === 'PREOUVERTURES'; });
        if (hasPreo) {
            var preoJournee = entries.some(function(e) {
                return e.code === 'PREOUVERTURES' && e.creneau === 'journee';
            });
            return preoJournee
                ? '<span title="Préouvertures journée entière (max 25)" style="margin-right:4px">📂</span>'
                : '<span title="Préouvertures sur un créneau (max 15)" style="margin-right:4px">📂½</span>';
        }
        // Sinon, afficher l'activité principale s'il y en a une
        var principale = entries.find(function(e) { return e.creneau === 'journee'; }) || entries[0];
        if (!principale) return '';
        var iconMap = {
            'TELEPHONIE': '<span title="Téléphonie" style="margin-right:4px">📞</span>',
            'WHATSAPP':   '<span title="WhatsApp" style="margin-right:4px">💬</span>',
            'MAILS':      '<span title="Mails" style="margin-right:4px">✉️</span>'
        };
        return iconMap[principale.code] || '<span title="' + (principale.code || 'Autre') + '" style="margin-right:4px">⚙️</span>';
    }
    // ── FIN ÉVOL-B ───────────────────────────────────────────────────

    // ── ÉVOL-C : Détection des dossiers anciens ──────────────────────
    var SEUIL_CRITIQUE = 48; // heures
    var SEUIL_ALERTE   = 24; // heures

    /**
     * Calcule l'ancienneté en heures d'un dossier depuis sa date_etat (format DD/MM/YYYY).
     * @returns {number|null} heures écoulées, ou null si date absente/invalide.
     */
    function getAncienneteHeures(dossier) {
        var s = dossier.date_etat;
        if (!s) return null;
        var p = s.split('/');
        if (p.length !== 3) return null;
        var d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
        if (isNaN(d.getTime())) return null;
        return Math.floor((Date.now() - d.getTime()) / 3600000);
    }

    /**
     * Renvoie un badge HTML 🔴/🟠 selon l'ancienneté du dossier, ou chaîne vide.
     */
    function getBadgeAnciennete(dossier) {
        var h = getAncienneteHeures(dossier);
        if (h === null) return '';
        if (h > SEUIL_CRITIQUE) return '<span class="badge-ancien critique" title="Critique (>48h)">🔴 +' + h + 'h</span>';
        if (h > SEUIL_ALERTE)   return '<span class="badge-ancien alerte" title="Alerte (>24h)">🟠 +' + h + 'h</span>';
        return '';
    }
    // ── FIN ÉVOL-C utilitaires ───────────────────────────────────────

    var activeIds = JSON.parse(safeSession.getItem('dispatch_gestionnaires') || '[]');
    var activeGest = (allUsers||[]).filter(function(u) { return activeIds.includes(String(u.id)); });

    // Dossiers libres -- pré-triés : OPTINEO + HABITATION/MRH + BDG en priorité absolue
    function _priScore(d) {
        var pf  = (d.portefeuille||'').toUpperCase();
        var tp  = (d.type||'').toUpperCase();
        var nat = (d.nature||'').toUpperCase();
        var score = 0;
        if (pf.includes('OPTINEO'))                          score += 4;
        if (tp.includes('HABITATION') || tp.includes('MRH')) score += 2;
        if (nat.includes('BDG'))                             score += 1;
        return score;
    }
    var dossiersLibres = (allDossiers||[]).filter(function(d) {
        var s = (d.statut||'').toLowerCase();
        return s === 'nonattribue' || s === '' || !d.gestionnaire || d.gestionnaire === '';
    }).sort(function(a, b) {
        var scoreDiff = _priScore(b) - _priScore(a);  // score décroissant = priorités d'abord
        if (scoreDiff !== 0) return scoreDiff; // priorité d'abord

        // ── ÉVOL-C : Tri secondaire par tranche d'ancienneté ─────────
        // Critiques (>48h) avant Alertes (>24h) avant Normaux
        var hA = getAncienneteHeures(a) || 0;
        var hB = getAncienneteHeures(b) || 0;
        var tierA = hA > SEUIL_CRITIQUE ? 2 : hA > SEUIL_ALERTE ? 1 : 0;
        var tierB = hB > SEUIL_CRITIQUE ? 2 : hB > SEUIL_ALERTE ? 1 : 0;
        if (tierB !== tierA) return tierB - tierA;
        // ── FIN ÉVOL-C tri ───────────────────────────────────────────

        // - Tri tertiaire : plus ancienne date_etat en premier -
        var parseDE = function(s) {
                if (!s) return null;
                var p = s.split('/');
                if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
                return new Date(s);
        };
        var da = parseDE(a.date_etat);
        var db = parseDE(b.date_etat);
        if (!da && !db) return 0;
        if (!da) return 1; // null va en dernier
        if (!db) return -1;
        return da - db;    // plus anciennes en premier   
    });

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'proposition-modal';
    modal.style.zIndex = 4000;

    var propData = {};
    activeGest.forEach(function(g) {
        propData[String(g.id)] = { g: g, dossiers: [] };
    });

    // ── PRÉ-ASSIGNATION HISTORIQUE ─────────────────────────────
    var idsPreAssignes = [];
    if (histoPropActif) {
        dossiersLibres.forEach(function(d) {
            var hEntry = histoPropMap[d.ref_sinistre];
            if (!hEntry) return;
            var refGest = activeGest.find(function(g) {
                return (g.prenom + ' ' + g.nom) === hEntry.gestionnaire;
            });
            if (!refGest) return;
            var hab2 = habMap[String(refGest.id)];
            var pf2  = hab2 ? (hab2.portefeuille && hab2.portefeuille.length > 0 ? hab2.portefeuille.map(function(x){ return (x+'').toUpperCase().trim(); }) : []) : null;
            var tp2  = hab2 ? (hab2.type && hab2.type.length > 0 ? hab2.type.map(function(x){ return (x+'').toUpperCase().trim(); }) : []) : null;
            var nat2 = hab2 ? (hab2.nature && hab2.nature.length > 0 ? hab2.nature.map(function(x){ return (x+'').toUpperCase().trim(); }) : []) : null;
            var okPf2  = !pf2  || pf2.length  === 0 || pf2.some(function(p){ return (d.portefeuille||'').toUpperCase().includes(p); });
            var okTp2  = !tp2  || tp2.length  === 0 || tp2.some(function(p){ return (d.type||'').toUpperCase().includes(p); });
            var okNat2 = !nat2 || nat2.length === 0 || nat2.some(function(p){ return (d.nature||'').toUpperCase().includes(p); });
            if (!okPf2 || !okTp2 || !okNat2) return;
            propData[String(refGest.id)].dossiers.push(d);
            idsPreAssignes.push(d.id);
        });
    }
    // ── FIN PRÉ-ASSIGNATION ────────────────────────────────────

    // ── ÉVOL-C : Comptage des dossiers anciens (pour bannière) ───────
    var nbCritiques = dossiersLibres.filter(function(d) {
        return (getAncienneteHeures(d)||0) > SEUIL_CRITIQUE;
    }).length;
    var nbAlertes = dossiersLibres.filter(function(d) {
        var h = getAncienneteHeures(d) || 0;
        return h > SEUIL_ALERTE && h <= SEUIL_CRITIQUE;
    }).length;
    // ── FIN comptage anciens ─────────────────────────────────────────

    // Dossiers restants après pré-assignation
    var dossiersRestants = dossiersLibres.filter(function(d){ return !idsPreAssignes.includes(d.id); });

    // ── ROUND-ROBIN ÉQUITABLE ─────────────────────────────────
    // Construire pour chaque gestionnaire la liste des dossiers qu'il peut recevoir (habilitations)
    function isEligible(d, g) {
        var hab = habMap[String(g.id)];
        var pf  = hab ? (hab.portefeuille && hab.portefeuille.length > 0 ? hab.portefeuille.map(function(x){ return (x+'').toUpperCase().trim(); }) : []) : null;
        var tp  = hab ? (hab.type && hab.type.length > 0 ? hab.type.map(function(x){ return (x+'').toUpperCase().trim(); }) : []) : null;
        var nat = hab ? (hab.nature && hab.nature.length > 0 ? hab.nature.map(function(x){ return (x+'').toUpperCase().trim(); }) : []) : null;
        var dPf  = (d.portefeuille||'').toUpperCase().trim();
        var dTp  = normalizeType(d.type);
        var dNat = (d.nature||'').toUpperCase().trim();
        var okPf  = !pf  || pf.length  === 0 || pf.some(function(p){ return dPf.includes(p); });
        var okTp  = !tp  || tp.length  === 0 || tp.some(function(p){ return dTp.includes(p); });
        var okNat = !nat || nat.length === 0 || nat.some(function(p){ return dNat.includes(p); });
        return okPf && okTp && okNat;
    }

    // ── ÉVOL-B : Max individualisé selon Dplane ──────────────────────
    // DEFAULT_MAX reste défini en fallback pour applyMaxToGest
    // (utilisé si l'input est vide/invalide), mais le Max INITIAL
    // de chaque gestionnaire vient maintenant de getMaxDefaut().
    var DEFAULT_MAX = 15;
    var maxPerGest = {};
    activeGest.forEach(function(g){ maxPerGest[String(g.id)] = getMaxDefaut(g.id); });
    // ── FIN ÉVOL-B ───────────────────────────────────────────────────

    // Round-robin : on parcourt les dossiers restants et on les attribue
    // au prochain gestionnaire éligible qui n'a pas encore atteint son Max
    var dossiersAssigned = new Set(idsPreAssignes);
    var keepGoing = true;
    while (keepGoing) {
        keepGoing = false;
        for (var gi = 0; gi < activeGest.length; gi++) {
            var g = activeGest[gi];
            var gid = String(g.id);
            var current = propData[gid].dossiers.length;
            if (current >= maxPerGest[gid]) continue; // Max atteint pour ce gest
            // Trouver le prochain dossier non attribué éligible
            var found = null;
            for (var di = 0; di < dossiersRestants.length; di++) {
                var d = dossiersRestants[di];
                if (dossiersAssigned.has(d.id)) continue;
                if (isEligible(d, g)) { found = d; break; }
            }
            if (found) {
                propData[gid].dossiers.push(found);
                dossiersAssigned.add(found.id);
                keepGoing = true; // au moins un dossier attribué ce tour
            }
        }
    }
    // ── FIN ROUND-ROBIN ────────────────────────────────────────

    // Compteurs globaux
    var totalPreAssignes = idsPreAssignes.length;
    var totalRoundRobin  = dossiersRestants.filter(function(d){ return dossiersAssigned.has(d.id) && !idsPreAssignes.includes(d.id); }).length;
    var totalLibresCount = dossiersLibres.length;

    var blocks = '';
    activeGest.forEach(function(g) {
        var prop = propData[String(g.id)];
        var dLines = '';
        prop.dossiers.forEach(function(d) {
            var badgeAncien = getBadgeAnciennete(d); // ÉVOL-C : badge si dossier > 24h
            dLines += '<div data-dossier-id="' + d.id + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--gray-300);border-radius:8px;margin-bottom:4px;background:#f8f9fa">'
                + '<input type="checkbox" class="dossier-sel-cb" data-gest-id="' + g.id + '" style="width:14px;height:14px;accent-color:var(--rose);cursor:pointer;flex-shrink:0">'
                + (badgeAncien ? badgeAncien : '')
                + '<span style="font-family:monospace;font-weight:600;color:var(--navy);font-size:12px">' + (d.ref_sinistre||'') + '</span>'
                + '<span style="font-size:11px;color:var(--gray-600);flex:1">' + (d.portefeuille||'') + ' | ' + (d.type||'') + ' | ' + (d.nature||'') + '</span>'
                + '<select data-dossier-move="' + d.id + '" data-current-gest="' + g.id + '" title="Déplacer vers..." style="font-size:11px;padding:2px 4px;border:1px solid var(--gray-300);border-radius:6px;cursor:pointer;max-width:130px"><option value="">↔️ Déplacer</option>' + activeGest.map(function(og){ return '<option value="' + og.id + '">' + og.prenom + ' ' + og.nom + '</option>'; }).join('') + '</select>'
                + '<button data-dossier-rm="' + d.id + '" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:16px;font-weight:700;padding:0 4px">✕</button>'
                + '</div>';
        });
        if (prop.dossiers.length === 0) {
            dLines = '<div style="padding:12px;text-align:center;color:var(--gray-600);font-size:13px">⚠️ Aucun dossier éligible pour les habilitations de ce gestionnaire</div>';
        }
        blocks += '<div class="gest-block" data-gestid="' + g.id + '" style="padding:14px;border:1px solid var(--gray-200);border-radius:var(--radius-md);margin-bottom:12px;background:white">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
            + '<div>' + getBadgeProfil(g.id) + '<strong style="color:var(--navy)">' + g.prenom + ' ' + g.nom + '</strong>'
            + ' <span class="badge-count" style="font-size:11px;color:var(--gray-600);background:var(--gray-100);padding:2px 8px;border-radius:10px">' + prop.dossiers.length + ' dossier(s)</span></div>'
            + '<div style="display:flex;align-items:center;gap:6px">'
            + '<label style="font-size:12px;color:var(--gray-600)" title="Le manager peut modifier ce Max à tout moment">Max :</label>'
            + '<input type="number" class="nb-dossiers-input" data-gestid="' + g.id + '" value="' + getMaxDefaut(g.id) + '" min="0" max="50" style="width:55px;padding:4px 6px;border:1px solid var(--gray-300);border-radius:6px;text-align:center;font-size:13px">'
            + '</div></div>'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px 8px;background:#f0f4f8;border-radius:8px">'
            + '<input type="checkbox" class="sel-all-block" data-gestid="' + g.id + '" style="width:14px;height:14px;accent-color:var(--rose);cursor:pointer" title="Tout sélectionner">'
            + '<span style="font-size:12px;color:var(--gray-600)">Tout sélectionner</span>'
            + '<span style="flex:1"></span>'
            + '<select class="bulk-move-sel" data-gestid="' + g.id + '" style="font-size:11px;padding:3px 6px;border:1px solid var(--gray-300);border-radius:6px;display:none"><option value="">↔️ Déplacer vers...</option>' + activeGest.map(function(og){ return '<option value="' + og.id + '|' + og.prenom + ' ' + og.nom + '">' + og.prenom + ' ' + og.nom + '</option>'; }).join('') + '</select>'
            + '<button class="bulk-rm-btn" data-gestid="' + g.id + '" style="font-size:11px;padding:3px 10px;background:#e74c3c;color:white;border:none;border-radius:6px;cursor:pointer;display:none">🗑️ Supprimer sélection</button>'
            + '</div>'
            + '<div class="dossiers-list-block" data-gestid="' + g.id + '">' + dLines + '</div>'
            + '</div>';
    });

    // ── ÉVOL-C : Construction de la bannière dossiers anciens ────────
    var banniereHTML = '';
    if (nbCritiques + nbAlertes > 0) {
        var optionsGests = '<option value="">Libre (algo)</option>'
            + activeGest.map(function(g) {
                return '<option value="' + g.id + '">' + g.prenom + ' ' + g.nom + '</option>';
            }).join('');
        banniereHTML = '<div id="banniere-anciens" style="background:#fff8e1;border:1px solid #f0ad4e;border-radius:var(--radius-md);padding:10px 14px;margin-bottom:12px;display:flex;gap:18px;align-items:center;flex-wrap:wrap">'
            + '<strong style="color:#856404;font-size:13px">⚠️ Dossiers anciens détectés</strong>'
            + (nbCritiques > 0
                ? '<div style="display:flex;align-items:center;gap:8px;font-size:13px">'
                  + '🔴 <strong>' + nbCritiques + '</strong> critique(s) (&gt;48h) → Priorité&nbsp;: '
                  + '<select id="target-critiques" style="font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid var(--gray-300)">' + optionsGests + '</select>'
                  + '</div>'
                : '')
            + (nbAlertes > 0
                ? '<div style="display:flex;align-items:center;gap:8px;font-size:13px">'
                  + '🟠 <strong>' + nbAlertes + '</strong> alerte(s) (&gt;24h) → Priorité&nbsp;: '
                  + '<select id="target-alertes" style="font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid var(--gray-300)">' + optionsGests + '</select>'
                  + '</div>'
                : '')
            + '<button id="btn-appliquer-cible" class="btn btn-warning" style="font-size:12px;padding:5px 12px" title="Forcer l\'attribution des anciens vers le gestionnaire choisi">✅ Appliquer</button>'
            + '</div>';
    }
    // ── FIN ÉVOL-C bannière ──────────────────────────────────────────

    modal.innerHTML = '<div class="modal" style="max-width:720px;width:95vw;max-height:88vh;overflow-y:auto">'
        + '<h2>🚀 Proposition de dispatch intelligent</h2>'
        + banniereHTML
        + '<div id="global-dispatch-counter" style="font-size:12px;color:var(--gray-700);margin:-4px 0 8px 0;padding:6px 10px;background:#f5f5fb;border-radius:8px;border:1px solid #e0e3ff">'
        + 'Total libres : <strong>' + totalLibresCount + '</strong> · Déjà prévus : <strong>0</strong> · Reste à attribuer : <strong>' + totalLibresCount + '</strong>'
        + '</div>'
        + '<p style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Dossiers filtrés par habilitations. Ajustez le nombre max ou supprimez des dossiers.</p>'
        + blocks
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;border-top:1px solid var(--gray-200);padding-top:16px">'
        + '<div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--gray-700)">' 
        + '<div id="global-dispatch-counter-footer"></div>'
        + '<button id="btn-reeq" class="btn btn-light" style="padding:4px 10px;font-size:11px;align-self:flex-start">🔄 Rééquilibrer la proposition</button>'
        + '</div>'
        + '<div style="display:flex;gap:12px;justify-content:flex-end">'
        + '<button class="btn btn-secondary" id="btn-prop-cancel">Annuler</button>'
        + '<button class="btn btn-success" id="btn-do-dispatch" style="font-size:15px;padding:10px 32px;font-weight:700">✅ DISPATCH</button>'
        + '</div></div></div>';

    document.body.appendChild(modal);
    document.getElementById('btn-prop-cancel').onclick = function() { closeModal('proposition-modal'); };

    // ── ÉVOL-C : Handler du bouton "Appliquer" de la bannière ────────
    // Quand le manager choisit un gestionnaire dans les selects critiques/alertes
    // et clique Appliquer, on déplace les dossiers ciblés vers son bloc (force).
    var btnAppliquer = document.getElementById('btn-appliquer-cible');
    if (btnAppliquer) {
        btnAppliquer.onclick = function() {
            var targetCritId = (document.getElementById('target-critiques') || {}).value || '';
            var targetAlertId = (document.getElementById('target-alertes') || {}).value || '';
            if (!targetCritId && !targetAlertId) {
                showNotif('Choisissez au moins un gestionnaire dans la bannière', 'info');
                return;
            }
            var nbDeplaces = 0;

            function deplacerVers(targetGestId, predicateAge) {
                if (!targetGestId) return;
                var targetBlock = modal.querySelector('.dossiers-list-block[data-gestid="' + targetGestId + '"]');
                if (!targetBlock) return;
                // Parcourir tous les dossiers de tous les blocs et déplacer ceux qui correspondent
                modal.querySelectorAll('.dossiers-list-block [data-dossier-id]').forEach(function(row) {
                    var sourceBlock = row.closest('.dossiers-list-block');
                    if (!sourceBlock) return;
                    if (sourceBlock.dataset.gestid === String(targetGestId)) return; // déjà chez la cible
                    var dossierId = row.dataset.dossierId;
                    var dossier = (allDossiers || []).find(function(x) { return String(x.id) === String(dossierId); });
                    if (!dossier) return;
                    var h = getAncienneteHeures(dossier) || 0;
                    if (!predicateAge(h)) return;
                    // Vérifier que le gestionnaire cible est habilité pour ce dossier
                    var targetGest = activeGest.find(function(g) { return String(g.id) === String(targetGestId); });
                    if (targetGest && !isEligible(dossier, targetGest)) return;
                    // Déplacement physique du DOM
                    targetBlock.appendChild(row);
                    nbDeplaces++;
                    // Si le Max du gestionnaire cible est dépassé, on l'incrémente
                    var input = modal.querySelector('.nb-dossiers-input[data-gestid="' + targetGestId + '"]');
                    if (input) {
                        var nbActuel = targetBlock.querySelectorAll('[data-dossier-id]').length;
                        var maxActuel = parseInt(input.value) || 0;
                        if (nbActuel > maxActuel) input.value = nbActuel;
                    }
                });
            }

            deplacerVers(targetCritId, function(h) { return h > SEUIL_CRITIQUE; });
            deplacerVers(targetAlertId, function(h) { return h > SEUIL_ALERTE && h <= SEUIL_CRITIQUE; });

            // Réappliquer Max sur tous les blocs touchés + recompter
            modal.querySelectorAll('.nb-dossiers-input').forEach(function(inp) {
                applyMaxToGest(inp.dataset.gestid);
            });
            bindMoveSelects();

            if (nbDeplaces > 0) {
                showNotif('✅ ' + nbDeplaces + ' dossier(s) ancien(s) attribué(s) selon votre choix', 'success');
            } else {
                showNotif('Aucun dossier déplacé (vérifiez les habilitations du gestionnaire ciblé)', 'info');
            }
        };
    }
    // ── FIN ÉVOL-C handler bannière ──────────────────────────────────

    // Bouton Rééquilibrer : relance showPropositionModal
    var btnReeq = document.getElementById('btn-reeq');
    if (btnReeq) {
        btnReeq.onclick = function() {
            closeModal('proposition-modal');
            showPropositionModal();
        };
    }

    function recomputeGlobalCounters() {
        var totalAssigned = 0;
        modal.querySelectorAll('.dossiers-list-block').forEach(function(block){
            totalAssigned += Array.from(block.querySelectorAll('[data-dossier-id]')).filter(function(row){
                return row.style.display !== 'none';
            }).length;
        });
        var remaining = totalLibresCount - totalAssigned;
        var txt = 'Total libres : <strong>' + totalLibresCount + '</strong> · Déjà prévus : <strong>' + totalAssigned + '</strong> · Reste à attribuer : <strong>' + Math.max(remaining,0) + '</strong>';
        var top = modal.querySelector('#global-dispatch-counter');
        var bottom = modal.querySelector('#global-dispatch-counter-footer');
        if (top) top.innerHTML = txt;
        if (bottom) bottom.innerHTML = txt;
    }

    function applyMaxToGest(gestid) {
        var input = modal.querySelector('.nb-dossiers-input[data-gestid="' + gestid + '"]');
        var max = parseInt((input && input.value) || String(DEFAULT_MAX), 10);
        var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
        if (!block) return;
        var rows = Array.from(block.querySelectorAll('[data-dossier-id]'));
        rows.forEach(function(row, idx){ row.style.display = idx < max ? '' : 'none'; });
        var badge = modal.querySelector('.gest-block[data-gestid="' + gestid + '"] .badge-count');
        if (badge) badge.textContent = Math.min(max, rows.length) + ' dossier(s)';
        recomputeGlobalCounters();
    }

    modal.querySelectorAll('.nb-dossiers-input').forEach(function(inp){
        inp.addEventListener('input', function(){ applyMaxToGest(this.dataset.gestid); });
    });

    modal.querySelectorAll('[data-dossier-rm]').forEach(function(btn) {
        btn.onclick = function() {
            var row = this.closest('[data-dossier-id]');
            if (row) {
                var gestid = row.closest('.dossiers-list-block').dataset.gestid;
                row.remove();
                applyMaxToGest(gestid);
            }
        };
    });

    // Logique déplacer un dossier vers un autre gestionnaire
    function bindMoveSelects() {
        modal.querySelectorAll('[data-dossier-move]').forEach(function(sel) {
            sel.onchange = function() {
                var targetGestId = this.value;
                if (!targetGestId) return;
                var row = this.closest('[data-dossier-id]');
                if (!row) return;
                var sourceGestId = row.closest('.dossiers-list-block').dataset.gestid;
                var targetBlock = modal.querySelector('.dossiers-list-block[data-gestid="' + targetGestId + '"]');
                if (!targetBlock) { this.value = ''; return; }
                this.setAttribute('data-current-gest', targetGestId);
                this.value = '';
                var emptyMsg = targetBlock.querySelector('[data-empty-msg]');
                if (emptyMsg) emptyMsg.remove();
                targetBlock.appendChild(row);
                applyMaxToGest(sourceGestId);
                applyMaxToGest(targetGestId);
            };
        });
    }
    bindMoveSelects();

    // ── MULTI-SÉLECTION : Tout sélectionner par bloc ──────────────────
    modal.querySelectorAll('.sel-all-block').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var gestid = this.dataset.gestid;
            var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
            block.querySelectorAll('.dossier-sel-cb').forEach(function(c) { c.checked = cb.checked; });
            updateBulkBar(gestid);
        });
    });

    function updateBulkBar(gestid) {
        var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
        var selected = block ? block.querySelectorAll('.dossier-sel-cb:checked').length : 0;
        var moveBtn = modal.querySelector('.bulk-move-sel[data-gestid="' + gestid + '"]');
        var rmBtn   = modal.querySelector('.bulk-rm-btn[data-gestid="' + gestid + '"]');
        if (moveBtn) moveBtn.style.display = selected > 0 ? '' : 'none';
        if (rmBtn)   rmBtn.style.display   = selected > 0 ? '' : 'none';
    }

    modal.addEventListener('change', function(e) {
        if (e.target.classList.contains('dossier-sel-cb')) {
            var block = e.target.closest('.dossiers-list-block');
            if (block) updateBulkBar(block.dataset.gestid);
        }
    });

    // ── SUPPRESSION EN MASSE ─────────────────────────────────────────
    modal.querySelectorAll('.bulk-rm-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var gestid = this.dataset.gestid;
            var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
            block.querySelectorAll('.dossier-sel-cb:checked').forEach(function(cb) {
                var row = cb.closest('[data-dossier-id]');
                if (row) row.remove();
            });
            modal.querySelector('.sel-all-block[data-gestid="' + gestid + '"]').checked = false;
            applyMaxToGest(gestid);
            updateBulkBar(gestid);
        });
    });

    // ── DÉPLACEMENT EN MASSE ─────────────────────────────────────────
    modal.querySelectorAll('.bulk-move-sel').forEach(function(sel) {
        sel.addEventListener('change', function() {
            if (!this.value) return;
            var parts = this.value.split('|');
            var targetGestId = parts[0];
            var gestid = this.dataset.gestid;
            if (targetGestId === gestid) { this.value = ''; return; }
            var block  = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
            var target = modal.querySelector('.dossiers-list-block[data-gestid="' + targetGestId + '"]');
            if (!target) { this.value = ''; return; }
            block.querySelectorAll('.dossier-sel-cb:checked').forEach(function(cb) {
                var row = cb.closest('[data-dossier-id]');
                if (row) { cb.checked = false; target.appendChild(row); }
            });
            this.value = '';
            applyMaxToGest(gestid);
            applyMaxToGest(targetGestId);
            modal.querySelector('.sel-all-block[data-gestid="' + gestid + '"]').checked = false;
            bindMoveSelects();
        });
    });

    // Initialiser Max pour tous les blocs
    modal.querySelectorAll('.nb-dossiers-input').forEach(function(inp){
        applyMaxToGest(inp.dataset.gestid);
    });

    document.getElementById('btn-do-dispatch').onclick = async function() {
        var btnDispatch = this;
        btnDispatch.disabled = true;
        btnDispatch.innerHTML = '<span style="display:inline-block;animation:spin 0.8s linear infinite">⏳</span> Dispatch en cours...';
        btnDispatch.style.opacity = '0.8';
        var assignments = [];
        activeGest.forEach(function(g) {
            var block = document.querySelector('.dossiers-list-block[data-gestid="' + g.id + '"]');
            if (!block) return;
            var rows = Array.from(block.querySelectorAll('[data-dossier-id]')).filter(function(row){ return row.style.display !== 'none'; });
            var nom = g.prenom + ' ' + g.nom;
            rows.forEach(function(el) {
                assignments.push({ dossierId: el.dataset.dossierId, nom: nom });
            });
        });
        var ok = 0;
        for (var i = 0; i < assignments.length; i++) {
            var a = assignments[i];
            var r = await db.from('dossiers').update({
                gestionnaire: a.nom,
                statut: 'attribue',
                verrouille: true,
                dispatched_at: new Date().toISOString()
            }).eq('id', a.dossierId);
            if (!r.error) ok++;
        }
        closeModal('proposition-modal');
        showNotif(ok + ' dossier(s) dispatchés avec succès !', 'success');
        await auditLog('DISPATCH', ok + ' dossiers - dispatch intelligent');
        await loadDossiers();
        renderDashboard();
        // ── Alerte dossiers prioritaires non attribués ──
        checkPrioritairesNonAttribues(activeGest, habMap, histoPropMap, histoPropActif);
    };
}
// ===== FIN TICKET 1 =====




// ===== ALERTE PRIORITAIRES NON ATTRIBUÉs =====
async function checkPrioritairesNonAttribues(activeGest, habMap, histoPropMap, histoPropActif) {
    await loadDossiers();
    var PRIORITAIRES_ATTR = ['OPTINEO'];
    var PRIORITAIRES_TYPE = ['MRH', 'HABITATION'];
    var PRIORITAIRES_NAT  = ['BRIS DE GLACE', 'BDG'];

    function _isPrio(d) {
        var pf  = (d.portefeuille||'').toUpperCase();
        var tp  = (d.type||'').toUpperCase();
        var nat = (d.nature_label||d.nature||'').toUpperCase();
        var hasRef = histoPropActif && histoPropMap && histoPropMap[d.ref_sinistre];
        return PRIORITAIRES_ATTR.some(function(x){ return pf.includes(x); })
            || PRIORITAIRES_TYPE.some(function(x){ return tp.includes(x); })
            || PRIORITAIRES_NAT.some(function(x){ return nat.includes(x); })
            || hasRef;
    }

    var nonAttribuesPrio = (allDossiers||[]).filter(function(d) {
        var s = (d.statut||'').toLowerCase();
        var estLibre = s === 'nonattribue' || s === '' || !d.gestionnaire || d.gestionnaire === '';
        return estLibre && _isPrio(d);
    });

    if (nonAttribuesPrio.length === 0) return;

    function getMotif(d) {
        var hasRef = histoPropActif && histoPropMap && histoPropMap[d.ref_sinistre];
        if (hasRef) {
            var refGestNom = histoPropMap[d.ref_sinistre].gestionnaire;
            var refGestActif = (activeGest||[]).some(function(g){ return (g.prenom+' '+g.nom) === refGestNom; });
            if (!refGestActif) return '👤 Référent (<strong>' + refGestNom + '</strong>) non sélectionné pour ce dispatch';
        }
        var habiliteExiste = (activeGest||[]).some(function(g) {
            var hab = habMap ? habMap[String(g.id)] : null;
            if (!hab) return true;
            var pf  = hab.portefeuille && hab.portefeuille.length > 0 ? hab.portefeuille.map(function(x){ return (x+'').toUpperCase(); }) : null;
            var tp  = hab.type && hab.type.length > 0 ? hab.type.map(function(x){ return (x+'').toUpperCase(); }) : null;
            var okPf = !pf || pf.some(function(p){ return (d.portefeuille||'').toUpperCase().includes(p); });
            var okTp = !tp || tp.some(function(p){ return (d.type||'').toUpperCase().includes(p); });
            return okPf && okTp;
        });
        if (!habiliteExiste) return '🚫 Aucun gestionnaire habilité pour ce type de dossier';
        return '⚠️ Capacité maximale atteinte pour tous les gestionnaires habilités';
    }

    var rows = nonAttribuesPrio.map(function(d) {
        var pf  = (d.portefeuille||'');
        var ref = d.ref_sinistre||'';
        var nat = d.nature_label||d.nature||'';
        var motif = getMotif(d);
        return '<tr style="border-bottom:1px solid #eee">'
            + '<td style="padding:8px 10px;font-weight:600">' + ref + '</td>'
            + '<td style="padding:8px 10px">' + pf + '</td>'
            + '<td style="padding:8px 10px">' + nat + '</td>'
            + '<td style="padding:8px 10px;font-size:12px">' + motif + '</td>'
            + '<td style="padding:8px 10px;text-align:center">'
            + '<button class="btn btn-warning" style="font-size:11px;padding:4px 8px" onclick="forceAttribuerPrioritaire(' + d.id + ', this)">🔧 Forcer</button>'
            + '</td></tr>';
    }).join('');

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'prio-alert-modal';
    modal.style.zIndex = 5000;
    modal.innerHTML = '<div class="modal" style="max-width:960px;width:95vw;padding:28px">'
        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
        + '<div style="font-size:36px">⚠️</div>'
        + '<div><h2 style="color:#e74c3c;margin:0">' + nonAttribuesPrio.length + ' dossier(s) prioritaire(s) non attribué(s)</h2>'
        + '<p style="color:#666;font-size:13px;margin:4px 0 0">Ces dossiers nécessitent une attention immédiate.</p></div></div>'
        + '<div style="overflow-x:auto;border:1px solid #eee;border-radius:8px">'
        + '<table style="width:100%;border-collapse:collapse;font-size:13px">'
        + '<thead><tr style="background:#f8f9fa"><th style="padding:8px 10px;text-align:left">Réf.</th>'
        + '<th style="padding:8px 10px;text-align:left">Portefeuille</th>'
        + '<th style="padding:8px 10px;text-align:left">Nature</th>'
        + '<th style="padding:8px 10px;text-align:left">Motif</th>'
        + '<th style="padding:8px 10px">Action</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table></div>'
        + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">'
        + '<button class="btn btn-secondary" onclick="closeModal(&quot;prio-alert-modal&quot;)">Ignorer pour l&apos;instant</button>'
        + '<button class="btn btn-primary" onclick="closeModal(&quot;prio-alert-modal&quot;)">✅ Valider</button>'
        + '</div></div>';
    document.body.appendChild(modal);
}

async function forceAttribuerPrioritaire(dossierId, btn) {
    await loadAllUsers();
    var gests = (allUsers||[]).filter(function(u){ return ['gestionnaire','manager','admin'].includes(u.role) && u.actif; });
    var opts = gests.map(function(g){ return '<option value="' + (g.prenom+' '+g.nom) + '">' + g.prenom + ' ' + g.nom + '</option>'; }).join('');
    var minModal = document.createElement('div');
    minModal.className = 'modal-overlay';
    minModal.id = 'force-attr-modal';
    minModal.style.zIndex = 6000;
    minModal.innerHTML = [
        '<div class="modal" style="max-width:400px;text-align:center">',
        '<div style="font-size:36px;margin-bottom:8px">&#x1F527;</div>',
        '<h2 style="color:var(--navy)">Forcer l&apos;attribution</h2>',
        '<p style="color:#666;font-size:13px;margin:12px 0">Choisissez un gestionnaire pour ce dossier prioritaire&nbsp;:</p>',
        '<select id="force-attr-select" style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:16px">' + opts + '</select>',
        '<div style="display:flex;gap:10px;justify-content:center">',
        '<button class="btn btn-secondary" onclick="closeModal(&quot;force-attr-modal&quot;)">Annuler</button>',
        '<button class="btn btn-primary" onclick="doForceAttribution(' + dossierId + ')">&#x2705; Confirmer</button>',
        '</div></div>'
    ].join('');
    document.body.appendChild(minModal);
}

async function doForceAttribution(dossierId) {
    var nom = document.getElementById('force-attr-select').value;
    if (!nom) return;
    var r = await db.from('dossiers').update({ gestionnaire: nom, statut: 'attribue', verrouille: true }).eq('id', dossierId);
    if (r.error) { showNotif('Erreur : ' + r.error.message, 'error'); return; }
    await auditLog('FORCE_ATTRIBUTION_PRIORITAIRE', 'Dossier ' + dossierId + ' forcé vers ' + nom);
    closeModal('force-attr-modal');
    var row = document.querySelector('#prio-alert-modal tr td button[onclick*="' + dossierId + '"]');
    if (row) row.closest('tr').style.opacity = '0.4';
    showNotif('✅ Dossier attribué à ' + nom, 'success');
    await loadDossiers();
}
// ===== FIN ALERTE PRIORITAIRES =====
