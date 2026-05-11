// ===== TICKET 1 -- DISPATCH INTELLIGENT =====

/**
 * Échappe les caractères HTML spéciaux pour éviter les injections et les
 * affichages corrompus quand un prénom/nom contient < > & " ' (ÉVOL-003 Lot 2).
 * Doit être appliquée à TOUTE valeur dynamique insérée dans une chaîne HTML.
 * @param {string|number|null|undefined} str
 * @returns {string} chaîne sécurisée pour innerHTML
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── ÉVOL-C utilitaires d'ancienneté (extraits au scope global pour ÉVOL-003 Étape 2) ──
// Ces constantes et fonctions étaient initialement dans showPropositionModal.
// Extraction nécessaire pour que showPreDispatchModal y accède aussi.
var DISPATCH_SEUIL_CRITIQUE = 48; // heures
var DISPATCH_SEUIL_ALERTE   = 24; // heures

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
        // ÉVOL-003 Étape 2 : passage par le modal préliminaire avant la proposition
        else { showPreDispatchModal(); }
    };
}

// ============================================================================
// ÉVOL-003 Étape 2 v2 : Modal préliminaire des dossiers anciens (Scénario C)
// ============================================================================
//
// Workflow :
//   1. Si aucun ancien (≥24h) → on saute le modal et lance directement la
//      proposition automatique.
//   2. Sinon, on affiche un modal listant les gestionnaires actifs sous forme
//      de "pills" cliquables (multi-sélection). Quand un gestionnaire est coché,
//      un input numérique apparaît pour ajuster combien d'anciens il recevra
//      (plafonné à son Max du jour).
//   3. Une zone repliable (<details>) montre la liste des dossiers concernés
//      pour que le manager puisse vérifier ce qu'il y a dedans.
//   4. Au clic "Continuer", on stocke les choix dans window.dispatchGestsPrioritaires
//      sous la forme [{ id, nbAnciens }, ...] puis on lance la proposition
//      automatique qui appliquera la pré-attribution prioritaire.
//
// Stockage : window.dispatchGestsPrioritaires = [{ id, nbAnciens }, ...]
//            window.dispatchAnciensIds = ['id1', 'id2', ...]  (pour identifier
//            les dossiers à pré-attribuer en priorité)
// ============================================================================
window.dispatchGestsPrioritaires = [];
window.dispatchAnciensIds = [];

/**
 * Modal préliminaire — Scénario C avec capacités ajustables.
 */
async function showPreDispatchModal() {
    // 1. Chargement des données
    await loadDossiers();
    await loadAllUsers();

    // 2. Récupération des dossiers libres (même filtre que showPropositionModal)
    var dossiersLibres = (allDossiers || []).filter(function(d) {
        var s = (d.statut || '').toLowerCase();
        return s === 'nonattribue' || s === '' || !d.gestionnaire || d.gestionnaire === '';
    });

    // 3. Détection des anciens (>24h)
    var dossiersAnciens = dossiersLibres.filter(function(d) {
        var h = getAncienneteHeures(d);
        return h !== null && h > DISPATCH_SEUIL_ALERTE;
    });

    // 4. Si AUCUN ancien : reset et passage direct à la proposition
    if (dossiersAnciens.length === 0) {
        window.dispatchGestsPrioritaires = [];
        window.dispatchAnciensIds = [];
        showPropositionModal();
        return;
    }

    // 5. Tri par ancienneté décroissante (les plus vieux d'abord)
    dossiersAnciens.sort(function(a, b) {
        return (getAncienneteHeures(b) || 0) - (getAncienneteHeures(a) || 0);
    });

    // 6. Mémorisation des IDs d'anciens (utilisés par showPropositionModal pour
    //    identifier quels dossiers doivent passer dans la pré-attribution prioritaire)
    window.dispatchAnciensIds = dossiersAnciens.map(function(d) { return d.id; });

    // 7. Comptage critiques / alertes (pour le titre)
    var nbCritiques = dossiersAnciens.filter(function(d) {
        return (getAncienneteHeures(d) || 0) > DISPATCH_SEUIL_CRITIQUE;
    }).length;
    var nbAlertes = dossiersAnciens.length - nbCritiques;

    // 8. Récupération des gestionnaires actifs (MÊME source que showPropositionModal)
    var sess = window.safeSession || sessionStorage;
    var activeIds = JSON.parse(sess.getItem('dispatch_gestionnaires') || '[]');
    var actifs = (allUsers || []).filter(function(u) { return activeIds.includes(String(u.id)); });

    if (actifs.length === 0) {
        showNotif('Aucun gestionnaire actif sélectionné. Choisis-en au moins un.', 'warning');
        return;
    }

    // 9. Récupération du Max par défaut de chaque gestionnaire
    //    (même logique que getMaxDefaut dans showPropositionModal)
    function getMaxJour(gestId) {
        var key = 'dispatch_max_' + gestId;
        var stored = sess.getItem(key);
        if (stored !== null && stored !== '') {
            var n = parseInt(stored, 10);
            if (!isNaN(n) && n >= 0) return n;
        }
        return 15; // valeur par défaut DSP
    }

    // 10. Reset des choix précédents
    window.dispatchGestsPrioritaires = [];

    // 11. Construction du modal
    var modal = document.createElement('div');
    modal.id = 'pre-dispatch-modal';
    modal.className = 'modal-overlay';

    var totalAnciens = dossiersAnciens.length;

    /**
     * Génère la ligne d'un gestionnaire (pill cliquable + input nb anciens).
     */
    function renderLigneGest(g) {
        var maxJour = getMaxJour(g.id);
        var initiales = (((g.prenom || '')[0] || '') + ((g.nom || '')[0] || '')).toUpperCase();
        return '<div class="pre-gest-row" data-gest-id="' + escapeHtml(g.id) + '" data-max-jour="' + maxJour + '"'
            + ' style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--gray-300);border-radius:8px;background:white;cursor:pointer;transition:all 0.15s">'
            + '<input type="checkbox" class="pre-gest-cb" data-gest-id="' + escapeHtml(g.id) + '" style="margin:0;flex-shrink:0;accent-color:var(--rose);width:16px;height:16px;cursor:pointer">'
            + '<span style="width:24px;height:24px;border-radius:50%;background:var(--rose);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">' + escapeHtml(initiales) + '</span>'
            + '<span style="flex:1;font-size:13px;color:var(--navy)">' + escapeHtml(g.prenom + ' ' + g.nom) + '</span>'
            // Zone "Max actuel" (visible quand non coché) ou "Anciens à recevoir" (visible quand coché)
            + '<span class="pre-gest-info-uncheck" style="font-size:11px;color:var(--gray-600)">Max du jour : ' + maxJour + '</span>'
            + '<span class="pre-gest-info-check" style="font-size:11px;color:var(--gray-700);display:none;align-items:center;gap:6px">'
            +   'Anciens à recevoir : '
            +   '<input type="number" class="pre-gest-nb" data-gest-id="' + escapeHtml(g.id) + '" value="0" min="0"'
            +     ' style="width:60px;padding:3px 6px;border:1px solid var(--gray-300);border-radius:4px;font-size:12px;text-align:center">'
            +   '<span class="pre-gest-warning" data-gest-id="' + escapeHtml(g.id) + '" style="font-size:10px;color:var(--rose);font-weight:600;display:none">⚠️ dépasse Max (' + maxJour + ')</span>'
            + '</span>'
            + '</div>';
    }

    /**
     * Génère la liste informative des dossiers anciens (zone repliable).
     */
    function renderListeDossiers() {
        var rows = dossiersAnciens.map(function(d) {
            var h = getAncienneteHeures(d) || 0;
            var isCritique = h > DISPATCH_SEUIL_CRITIQUE;
            var bg = isCritique ? '#fee2e2' : '#fef3c7';
            var fg = isCritique ? '#991b1b' : '#92400e';
            var infos = escapeHtml((d.portefeuille || '?') + ' · ' + (d.type || '?') + ' · ' + (d.nature || '?'));
            return '<div style="padding:5px 8px;border:1px solid var(--gray-200);border-radius:6px;font-size:11px;display:flex;align-items:center;gap:8px;background:white">'
                + '<span style="background:' + bg + ';color:' + fg + ';padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700;flex-shrink:0">+' + h + 'h</span>'
                + '<span style="font-family:monospace;font-weight:600;color:var(--navy);flex-shrink:0">' + escapeHtml(d.ref_sinistre || '') + '</span>'
                + '<span style="color:var(--gray-600);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + infos + '</span>'
                + '</div>';
        }).join('');
        return rows;
    }

    modal.innerHTML = '<div class="modal" style="max-width:680px;width:92vw;max-height:88vh;display:flex;flex-direction:column;padding:0">'
        // En-tête
        + '<div style="padding:14px 18px;background:#fff8e1;border-bottom:1px solid #f0ad4e">'
        + '<h2 style="margin:0;font-size:17px;color:#856404">⚠️ ' + totalAnciens + ' dossier(s) ancien(s) détecté(s)</h2>'
        + '<p style="margin:4px 0 0;font-size:13px;color:var(--gray-700)">'
        + (nbCritiques > 0 ? '<strong style="color:#991b1b">' + nbCritiques + ' critique(s) (>48h)</strong>' : '')
        + (nbCritiques > 0 && nbAlertes > 0 ? ' · ' : '')
        + (nbAlertes > 0 ? '<strong style="color:#92400e">' + nbAlertes + ' alerte(s) (>24h)</strong>' : '')
        + '</p>'
        + '</div>'
        // Corps
        + '<div style="flex:1;overflow-y:auto">'
        + '<div style="padding:14px 18px;border-bottom:1px solid var(--gray-200)">'
        + '<div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--navy)">Quels gestionnaires doivent les recevoir en priorité&nbsp;?</div>'
        + '<div style="font-size:11px;color:var(--gray-600);margin-bottom:12px">Coche un ou plusieurs gestionnaires. Tu peux ajuster combien chacun recevra (plafonné à son Max du jour).</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px">'
        + actifs.map(renderLigneGest).join('')
        + '</div>'
        // Aperçu live de la répartition prévue
        + '<div id="pre-recap" style="margin-top:12px;padding:10px 12px;background:#f5f5fb;border:1px solid #e0e3ff;border-radius:6px;font-size:12px;color:var(--gray-700)">'
        + '👉 <em>Aucun gestionnaire coché. Les ' + totalAnciens + ' anciens passeront en répartition automatique.</em>'
        + '</div>'
        + '</div>'
        // Section repliable : liste des dossiers
        + '<details style="border-bottom:1px solid var(--gray-200)">'
        + '<summary style="padding:10px 18px;font-size:12px;color:var(--gray-700);cursor:pointer;user-select:none">📋 Voir le détail des ' + totalAnciens + ' dossiers concernés</summary>'
        + '<div style="padding:0 18px 12px;max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;background:#f8f9fa">'
        + renderListeDossiers()
        + '</div>'
        + '</details>'
        + '</div>'
        // Footer
        + '<div style="padding:12px 18px;border-top:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center;background:white">'
        + '<button class="btn btn-secondary" id="btn-pre-skip" title="Passer cette étape">Passer</button>'
        + '<button class="btn btn-primary" id="btn-pre-continue" style="padding:8px 22px;font-weight:700">Continuer →</button>'
        + '</div>'
        + '</div>';

    document.body.appendChild(modal);

    // ── Logique de répartition par défaut ────────────────────────────
    /**
     * Calcule la répartition équitable parmi les gestionnaires cochés.
     * Renvoie un objet { gestId: nbAnciensRecommandes }.
     *
     * Algorithme : distribution round-robin pure — chaque gestionnaire reçoit
     * à tour de rôle un dossier ancien, jusqu'à épuisement du stock. Plus de
     * plafond (le Max du jour est désormais une simple suggestion par défaut,
     * cf. ÉVOL-003 Anomalie 1, fix 8 mai 2026). Si la valeur calculée dépasse
     * le Max du jour, une alerte visuelle s'affiche sur la ligne (cf. refreshLignes).
     */
    function calculerRepartition(gestsCoches) {
        var rep = {};
        gestsCoches.forEach(function(g) { rep[g.id] = 0; });
        if (gestsCoches.length === 0) return rep;
        var distribues = 0;
        while (distribues < totalAnciens) {
            for (var i = 0; i < gestsCoches.length && distribues < totalAnciens; i++) {
                rep[gestsCoches[i].id]++;
                distribues++;
            }
        }
        return rep;
    }

    /**
     * Met à jour visuellement une ligne gestionnaire (selon coché/décoché)
     * et calcule/applique la valeur par défaut de l'input.
     */
    function refreshLignes() {
        // Construction de la liste des gestionnaires cochés (avec leur max)
        var gestsCoches = [];
        modal.querySelectorAll('.pre-gest-cb').forEach(function(cb) {
            if (cb.checked) {
                var row = cb.closest('.pre-gest-row');
                var max = parseInt(row.dataset.maxJour, 10) || 0;
                gestsCoches.push({ id: cb.dataset.gestId, max: max });
            }
        });

        // Calcul de la répartition équitable plafonnée
        var rep = calculerRepartition(gestsCoches);

        // Application visuelle
        modal.querySelectorAll('.pre-gest-row').forEach(function(row) {
            var cb = row.querySelector('.pre-gest-cb');
            var infoUncheck = row.querySelector('.pre-gest-info-uncheck');
            var infoCheck = row.querySelector('.pre-gest-info-check');
            var input = row.querySelector('.pre-gest-nb');
            var warning = row.querySelector('.pre-gest-warning');
            var maxJour = parseInt(row.dataset.maxJour, 10) || 0;
            if (cb.checked) {
                row.style.borderColor = 'var(--rose)';
                row.style.background = '#fff5f8';
                infoUncheck.style.display = 'none';
                infoCheck.style.display = 'inline-flex';
                // Ne pas écraser une saisie manuelle si déjà éditée
                if (!input.dataset.userEdited) {
                    input.value = rep[cb.dataset.gestId] || 0;
                }
                // Alerte visuelle si la valeur dépasse le Max du jour
                if (warning) {
                    warning.style.display = (parseInt(input.value, 10) > maxJour) ? 'inline' : 'none';
                }
            } else {
                row.style.borderColor = 'var(--gray-300)';
                row.style.background = 'white';
                infoUncheck.style.display = 'inline';
                infoCheck.style.display = 'none';
                input.value = 0;
                delete input.dataset.userEdited;
                if (warning) warning.style.display = 'none';
            }
        });

        refreshRecap();
    }

    /**
     * Met à jour l'aperçu de la répartition prévue (zone bleue en bas).
     */
    function refreshRecap() {
        var recap = modal.querySelector('#pre-recap');
        if (!recap) return;
        var coches = [];
        var totalAttribues = 0;
        modal.querySelectorAll('.pre-gest-cb').forEach(function(cb) {
            if (!cb.checked) return;
            var row = cb.closest('.pre-gest-row');
            var input = row.querySelector('.pre-gest-nb');
            var nb = parseInt(input.value, 10) || 0;
            var nom = row.querySelector('span:nth-of-type(2)').textContent;
            coches.push({ nom: nom, nb: nb });
            totalAttribues += nb;
        });
        if (coches.length === 0) {
            recap.innerHTML = '👉 <em>Aucun gestionnaire coché. Les ' + totalAnciens + ' anciens passeront en répartition automatique.</em>';
            return;
        }
        var detail = coches.map(function(c) { return '<strong>' + escapeHtml(c.nom) + '</strong> : ' + c.nb; }).join(' · ');
        var reste = totalAnciens - totalAttribues;
        var resteTxt = '';
        if (reste > 0) {
            resteTxt = ' Les <strong>' + reste + ' ancien(s) restant(s)</strong> + autres dossiers passeront en répartition automatique.';
        } else if (reste === 0) {
            resteTxt = ' Tous les anciens sont pris en charge.';
        }
        recap.innerHTML = '✅ <strong>' + totalAttribues + ' dossier(s) ancien(s)</strong> seront pré-attribués (' + detail + ').' + resteTxt;
    }

    // ── Bind handlers ────────────────────────────────────────────────
    // Click sur une row entière = toggle de la checkbox (sauf si on clique sur l'input)
    modal.querySelectorAll('.pre-gest-row').forEach(function(row) {
        row.onclick = function(e) {
            // Ignore les clics sur l'input numérique ou la checkbox elle-même
            if (e.target.tagName === 'INPUT') return;
            var cb = this.querySelector('.pre-gest-cb');
            cb.checked = !cb.checked;
            refreshLignes();
        };
    });

    // Click direct sur la checkbox
    modal.querySelectorAll('.pre-gest-cb').forEach(function(cb) {
        cb.onclick = function(e) {
            e.stopPropagation();
            refreshLignes();
        };
    });

    // Modification manuelle d'un input "nb anciens"
    modal.querySelectorAll('.pre-gest-nb').forEach(function(input) {
        input.oninput = function() {
            this.dataset.userEdited = 'true';
            var v = parseInt(this.value, 10) || 0;
            // Plus de plafond (Anomalie 1, fix 8 mai 2026) — seul le bornage à 0 reste
            if (v < 0) { this.value = 0; v = 0; }
            // Affichage de l'alerte si la valeur dépasse le Max du jour
            var row = this.closest('.pre-gest-row');
            var maxJour = parseInt(row.dataset.maxJour, 10) || 0;
            var warning = row.querySelector('.pre-gest-warning');
            if (warning) {
                warning.style.display = (v > maxJour) ? 'inline' : 'none';
            }
            refreshRecap();
        };
        input.onclick = function(e) { e.stopPropagation(); };
    });

    // Boutons Passer / Continuer
    document.getElementById('btn-pre-skip').onclick = function() {
        window.dispatchGestsPrioritaires = [];
        modal.remove();
        showPropositionModal();
    };
    document.getElementById('btn-pre-continue').onclick = function() {
        // Collecte des choix : [{ id, nbAnciens }, ...]
        var choix = [];
        modal.querySelectorAll('.pre-gest-cb').forEach(function(cb) {
            if (!cb.checked) return;
            var row = cb.closest('.pre-gest-row');
            var input = row.querySelector('.pre-gest-nb');
            var nb = parseInt(input.value, 10) || 0;
            if (nb > 0) {
                choix.push({ id: cb.dataset.gestId, nbAnciens: nb });
            }
        });
        window.dispatchGestsPrioritaires = choix;
        modal.remove();
        showPropositionModal();
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
    // Les utilitaires getAncienneteHeures et les seuils sont désormais
    // déclarés au scope global (DISPATCH_SEUIL_CRITIQUE, DISPATCH_SEUIL_ALERTE)
    // pour pouvoir être réutilisés par showPreDispatchModal (ÉVOL-003 Étape 2).
    var SEUIL_CRITIQUE = DISPATCH_SEUIL_CRITIQUE;
    var SEUIL_ALERTE   = DISPATCH_SEUIL_ALERTE;

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

    // ── ÉVOL-003 Étape 2 v2 : Pré-attribution PRIORITAIRE des anciens ──
    // Si le manager a coché des gestionnaires dans showPreDispatchModal,
    // on répartit les dossiers anciens (>24h) entre eux en round-robin,
    // en respectant à la fois :
    //   1. Le nombre demandé pour chaque gestionnaire (window.dispatchGestsPrioritaires[i].nbAnciens)
    //   2. Les habilitations (un dossier MIA va à un MIA-habilité)
    //
    // Si un dossier ancien ne peut être attribué à aucun gestionnaire choisi
    // (aucun n'est habilité), il retombe dans le pool général (round-robin classique).
    var gestsPrioritaires = window.dispatchGestsPrioritaires || [];
    var anciensIds = window.dispatchAnciensIds || [];
    if (gestsPrioritaires.length > 0 && anciensIds.length > 0) {
        // Compteur de dossiers attribués par gestionnaire prioritaire
        var compteurGest = {};
        gestsPrioritaires.forEach(function(gp) { compteurGest[String(gp.id)] = 0; });

        // Récupération des objets dossier correspondants (en respectant l'ordre :
        // les plus anciens d'abord, déjà ordonnés dans dispatchAnciensIds)
        var anciensDossiers = anciensIds
            .map(function(id) { return dossiersLibres.find(function(x) { return String(x.id) === String(id); }); })
            .filter(function(d) { return !!d; });

        // Distribution round-robin : pour chaque ancien, on cherche le prochain
        // gestionnaire prioritaire qui (a) n'a pas atteint son quota et (b) est habilité.
        var rrIndex = 0;
        anciensDossiers.forEach(function(d) {
            var attribue = false;
            // On essaie chaque gestionnaire prioritaire dans l'ordre rotatif
            for (var tentative = 0; tentative < gestsPrioritaires.length; tentative++) {
                var idx = (rrIndex + tentative) % gestsPrioritaires.length;
                var gp = gestsPrioritaires[idx];
                if (compteurGest[String(gp.id)] >= gp.nbAnciens) continue; // quota atteint
                var gObj = activeGest.find(function(g) { return String(g.id) === String(gp.id); });
                if (!gObj) continue;
                if (!isEligible(d, gObj)) continue; // pas habilité
                if (!propData[String(gp.id)]) continue;
                propData[String(gp.id)].dossiers.push(d);
                idsPreAssignes.push(d.id);
                compteurGest[String(gp.id)]++;
                attribue = true;
                rrIndex = (idx + 1) % gestsPrioritaires.length; // avance le tour
                break;
            }
            // Si aucun prioritaire ne convient → le dossier reste dans dossiersRestants
            // et sera traité par le round-robin général plus loin.
        });
    }
    // ── FIN pré-attribution prioritaire ─────────────────────────

    if (histoPropActif) {
        dossiersLibres.forEach(function(d) {
            if (idsPreAssignes.includes(d.id)) return; // déjà pris par une pré-attribution prioritaire
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

    // ── ÉVOL-003 Lot 2 : Liste des dossiers NON attribués (zone gauche) ──
    // Ces dossiers seront affichés à gauche de la modale ; le manager peut
    // les attribuer manuellement à un gestionnaire via un select + bouton ✓.
    var dossiersNonAttribues = dossiersLibres.filter(function(d){ return !dossiersAssigned.has(d.id); });

    /**
     * Génère le HTML d'une "carte dossier" COMPACTE en zone gauche (v3).
     * Format 2 lignes :
     *   [badge] [ref_sinistre]                    [+]
     *           [PORTEFEUILLE · TYPE · NATURE]
     * Le bouton + ouvre une popup positionnée sous la carte via togglePopupAttrib().
     */
    function renderLigneDossierLibre(d) {
        var badge = getBadgeAnciennete(d);
        var infos = escapeHtml((d.portefeuille || '?') + ' · ' + (d.type || '?') + ' · ' + (d.nature || '?'));
        return '<div class="dossier-libre-row" data-dossier-id="' + escapeHtml(d.id) + '"'
            + ' style="position:relative;display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--gray-300);border-radius:6px;margin-bottom:4px;background:white;font-size:11px">'
            // Bloc central : 2 lignes (ref + infos métier)
            + '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">'
            + '<div style="display:flex;align-items:center;gap:5px">'
            + (badge || '')
            + '<span style="font-family:monospace;font-weight:600;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(d.ref_sinistre || '') + '</span>'
            + '</div>'
            + '<div style="font-size:10px;color:var(--gray-600);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:2px">' + infos + '</div>'
            + '</div>'
            // Bouton + à droite (ouvre popup d'attribution)
            + '<button class="btn-attrib-libre" data-dossier-id="' + escapeHtml(d.id) + '"'
            + ' title="Attribuer à un gestionnaire"'
            + ' style="width:24px;height:24px;padding:0;background:var(--rose);color:white;border:none;border-radius:5px;cursor:pointer;font-size:15px;font-weight:700;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</button>'
            + '</div>';
    }

    /**
     * Génère le HTML de la popup d'attribution qui s'affiche au-dessus d'une carte
     * de la zone gauche au clic du bouton +. Liste les gestionnaires actifs avec
     * leur avatar coloré ; clic sur un nom = attribution.
     */
    function renderPopupAttrib(dossierId) {
        var items = activeGest.map(function(g) {
            var initiales = (((g.prenom || '')[0] || '') + ((g.nom || '')[0] || '')).toUpperCase();
            return '<button class="popup-attrib-item" data-gest-id="' + escapeHtml(g.id) + '" data-dossier-id="' + escapeHtml(dossierId) + '"'
                + ' style="width:100%;text-align:left;padding:5px 8px;background:transparent;border:none;border-radius:4px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:6px;color:var(--navy)">'
                + '<span style="width:20px;height:20px;border-radius:50%;background:var(--rose);color:white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">' + escapeHtml(initiales) + '</span>'
                + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(g.prenom + ' ' + g.nom) + '</span>'
                + '</button>';
        }).join('');
        return '<div class="popup-attrib" data-popup-for="' + escapeHtml(dossierId) + '"'
            + ' style="position:absolute;top:calc(100% + 4px);right:0;width:200px;background:white;border:1px solid var(--gray-300);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:6px;z-index:100">'
            + '<div style="font-size:10px;color:var(--gray-600);padding:3px 6px;border-bottom:1px solid var(--gray-200);margin-bottom:4px">Attribuer à&nbsp;:</div>'
            + '<div style="display:flex;flex-direction:column;gap:2px;max-height:240px;overflow-y:auto">' + items + '</div>'
            + '</div>';
    }

    var listeLibresHTML = dossiersNonAttribues.length === 0
        ? '<div style="padding:14px;text-align:center;color:var(--gray-600);font-size:12px">✅ Tous les dossiers sont attribués</div>'
        : dossiersNonAttribues.map(renderLigneDossierLibre).join('');
    // ── FIN zone gauche ──────────────────────────────────────────────

    /**
     * Génère le HTML d'une ligne dossier dans un bloc gestionnaire (zone droite, v3).
     * Layout horizontal : [☐] [badge] [ref + infos métier (flex:1)] [select déplacer] [✕]
     * Le select et le bouton ✕ sont alignés à droite avec une taille suffisante
     * pour utiliser tout l'espace disponible (et non plus rikiki).
     */
    function renderLigneDossierBloc(d, gestId) {
        var badgeAncien = getBadgeAnciennete(d);
        return '<div data-dossier-id="' + escapeHtml(d.id) + '" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--gray-300);border-radius:6px;margin-bottom:4px;background:#f8f9fa">'
            + '<input type="checkbox" class="dossier-sel-cb" data-gest-id="' + escapeHtml(gestId) + '" style="width:14px;height:14px;accent-color:var(--rose);cursor:pointer;flex-shrink:0;margin:0">'
            + (badgeAncien || '')
            // Bloc central : ref + infos métier (prend tout l'espace dispo)
            + '<div style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:1px">'
            + '<div style="font-family:monospace;font-weight:600;color:var(--navy);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(d.ref_sinistre || '') + '</div>'
            + '<div style="font-size:9px;color:var(--gray-600);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml((d.portefeuille || '') + ' · ' + (d.type || '') + ' · ' + (d.nature || '')) + '</div>'
            + '</div>'
            // Select "déplacer vers" : largeur correcte pour voir le nom
            + '<select data-dossier-move="' + escapeHtml(d.id) + '" data-current-gest="' + escapeHtml(gestId) + '" title="Déplacer vers..." style="font-size:10px;padding:3px 4px;border:1px solid var(--gray-300);border-radius:4px;cursor:pointer;flex-shrink:0;max-width:90px;background:white">'
            + '<option value="">↔️</option>'
            + activeGest.map(function(og){ return '<option value="' + escapeHtml(og.id) + '">' + escapeHtml(og.prenom + ' ' + og.nom) + '</option>'; }).join('')
            + '</select>'
            // Bouton ✕ : encadré et visible (au lieu de minuscule)
            + '<button data-dossier-rm="' + escapeHtml(d.id) + '" title="Retirer" style="width:24px;height:24px;padding:0;background:white;border:1px solid var(--gray-300);color:#e74c3c;cursor:pointer;font-size:13px;font-weight:700;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center">✕</button>'
            + '</div>';
    }

    var blocks = '';
    activeGest.forEach(function(g) {
        var prop = propData[String(g.id)];
        var dLines = '';
        prop.dossiers.forEach(function(d) {
            dLines += renderLigneDossierBloc(d, g.id);
        });
        if (prop.dossiers.length === 0) {
            dLines = '<div data-empty-msg style="padding:10px;text-align:center;color:var(--gray-600);font-size:11px">⚠️ Aucun dossier éligible</div>';
        }

        // Initiales pour avatar (ex : "Jean Martin" → "JM")
        var initiales = (((g.prenom || '')[0] || '') + ((g.nom || '')[0] || '')).toUpperCase();
        var nomComplet = escapeHtml((g.prenom || '') + ' ' + (g.nom || ''));

        blocks += '<div class="gest-block" data-gestid="' + escapeHtml(g.id) + '"'
            + ' style="display:flex;flex-direction:column;border:1px solid var(--gray-200);border-radius:var(--radius-md);background:white;overflow:hidden;min-height:200px;max-height:55vh">'
            // En-tête bloc gestionnaire
            + '<div style="padding:8px 10px;background:#f0f4f8;border-bottom:1px solid var(--gray-200)">'
            + '<div style="display:flex;align-items:center;gap:8px">'
            + '<div style="width:32px;height:32px;border-radius:50%;background:var(--rose);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">' + escapeHtml(initiales) + '</div>'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-weight:700;color:var(--navy);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + nomComplet + '">'
            + getBadgeProfil(g.id) + nomComplet + '</div>'
            + '<div style="font-size:11px;color:var(--gray-600)">'
            + '<span class="badge-count">' + prop.dossiers.length + '</span> dossier(s)'
            + '</div>'
            + '</div>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:6px;margin-top:6px">'
            + '<label style="font-size:11px;color:var(--gray-600)" title="Modifiable à tout moment">Max :</label>'
            // Auto-majoration du Max si la pré-attribution prioritaire dépasse la valeur par défaut
            // (Anomalie 1, fix 8 mai 2026 — la manager garde la main)
            + '<input type="number" class="nb-dossiers-input" data-gestid="' + escapeHtml(g.id) + '" value="' + Math.max(getMaxDefaut(g.id), prop.dossiers.length) + '" min="0" max="50" style="width:50px;padding:3px;border:1px solid var(--gray-300);border-radius:6px;text-align:center;font-size:12px">'
            + '</div>'
            + '</div>'
            // Barre multi-sélection
            + '<div style="padding:5px 8px;background:#f0f4f8;border-bottom:1px solid var(--gray-200);display:flex;align-items:center;gap:6px">'
            + '<input type="checkbox" class="sel-all-block" data-gestid="' + escapeHtml(g.id) + '" style="width:13px;height:13px;accent-color:var(--rose);cursor:pointer" title="Tout sélectionner">'
            + '<span style="font-size:10px;color:var(--gray-600)">Tout</span>'
            + '<span style="flex:1"></span>'
            + '<select class="bulk-move-sel" data-gestid="' + escapeHtml(g.id) + '" style="font-size:10px;padding:2px 4px;border:1px solid var(--gray-300);border-radius:4px;display:none;max-width:80px">'
            + '<option value="">↔️</option>'
            + activeGest.map(function(og){ return '<option value="' + escapeHtml(og.id + '|' + og.prenom + ' ' + og.nom) + '">' + escapeHtml(og.prenom + ' ' + og.nom) + '</option>'; }).join('')
            + '</select>'
            + '<button class="bulk-rm-btn" data-gestid="' + escapeHtml(g.id) + '" style="font-size:10px;padding:2px 6px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;display:none">🗑️</button>'
            + '</div>'
            // Liste dossiers (scrollable)
            + '<div class="dossiers-list-block drop-zone" data-gestid="' + escapeHtml(g.id) + '" style="flex:1;overflow-y:auto;padding:6px;min-height:120px">'
            + dLines
            + '</div>'
            + '</div>';
    });

    // ── ÉVOL-C : Bannière "Dossiers anciens détectés" ────────────────
    // Migrée vers showPreDispatchModal (ÉVOL-003 Étape 2) qui s'ouvre AVANT
    // la modale de proposition. Les pré-attributions manuelles choisies dans
    // ce modal préliminaire sont appliquées via window.dispatchGestsPrioritaires
    // au moment du calcul de la proposition (cf. bloc PRÉ-ASSIGNATION MANUELLE).
    // ── FIN ÉVOL-C bannière ──────────────────────────────────────────

    // ── ÉVOL-003 Lot 2 : Nouveau layout 2 zones (gauche/droite) ──────
    modal.innerHTML = '<div class="modal dispatch-layout" style="max-width:98vw;width:98vw;height:92vh;display:flex;flex-direction:column;padding:0">'
        // En-tête
        + '<div style="padding:14px 18px;border-bottom:1px solid var(--gray-200);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
        + '<h2 style="margin:0;font-size:18px">🚀 Proposition de dispatch intelligent</h2>'
        + '<div id="global-dispatch-counter" style="font-size:12px;color:var(--gray-700);padding:6px 10px;background:#f5f5fb;border-radius:8px;border:1px solid #e0e3ff">'
        + 'Total libres : <strong>' + totalLibresCount + '</strong> · Déjà prévus : <strong>' + (totalPreAssignes + totalRoundRobin) + '</strong> · Reste à attribuer : <strong>' + dossiersNonAttribues.length + '</strong>'
        + '</div>'
        + '</div>'
        // (bannière supprimée : migrée vers showPreDispatchModal — ÉVOL-003 Étape 2)
        // Corps splitté en 2 zones
        + '<div style="display:flex;flex:1;gap:12px;padding:12px;overflow:hidden;min-height:0">'
        // Zone gauche : dossiers non attribués
        + '<div id="zone-libre" style="width:280px;min-width:240px;flex-shrink:0;display:flex;flex-direction:column;border:1px solid var(--gray-200);border-radius:var(--radius-md);background:#f8f9fa;overflow:hidden">'
        + '<div style="padding:10px 12px;border-bottom:1px solid var(--gray-200);font-weight:700;color:var(--navy);font-size:13px;background:white">'
        + '📋 Non attribués — <span id="compteur-libres" style="background:#fff3cd;color:#856404;padding:1px 8px;border-radius:10px;font-size:11px">' + dossiersNonAttribues.length + '</span>'
        + '</div>'
        + '<div id="liste-dossiers-libres" style="flex:1;overflow-y:auto;padding:8px">'
        + listeLibresHTML
        + '</div>'
        + '</div>'
        // Zone droite : grille gestionnaires
        // Zone droite : grille gestionnaires (multi-rangées auto-fit, ÉVOL-003 Lot 2)
        + '<div id="zone-gestionnaires" style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:10px;align-content:start;padding-bottom:4px">'
        + blocks
        + '</div>'
        + '</div>'
        // Footer
        + '<div style="padding:12px 18px;border-top:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
        + '<div style="display:flex;align-items:center;gap:12px">'
        + '<button id="btn-reeq" class="btn btn-light" style="padding:5px 12px;font-size:12px">🔄 Rééquilibrer</button>'
        + '<span id="global-dispatch-counter-footer" style="font-size:12px;color:var(--gray-700)"></span>'
        + '</div>'
        + '<div style="display:flex;gap:12px">'
        + '<button class="btn btn-secondary" id="btn-prop-cancel">Annuler</button>'
        + '<button class="btn btn-success" id="btn-do-dispatch" style="font-size:15px;padding:10px 32px;font-weight:700">✅ DISPATCH</button>'
        + '</div>'
        + '</div>'
        + '</div>';
    // ── FIN nouveau layout ──────────────────────────────────────────

    document.body.appendChild(modal);
    document.getElementById('btn-prop-cancel').onclick = function() { closeModal('proposition-modal'); };

    // ── ÉVOL-003 Lot 2 : Mise à jour des compteurs (zone gauche + footer) ──
    /**
     * Met à jour tous les compteurs visibles. Délègue à recomputeGlobalCounters
     * qui gère à la fois le footer (Total libres / Déjà prévus / Reste) ET
     * le badge de la zone gauche. Les badges-count par bloc sont mis à jour
     * via applyMaxToGest qui est appelée séparément.
     */
    function updateAllCompteurs() {
        recomputeGlobalCounters();
    }

    /**
     * Attribue un dossier de la zone gauche vers un gestionnaire (zone droite).
     * - Retire la carte de la zone gauche
     * - Ajoute une ligne dans le bloc gestionnaire
     * - Auto-incrémente le Max si le bloc est plein (manager garde la main)
     */
    function attribuerDossierLibreVersGest(dossierId, gestId) {
        var d = (allDossiers || []).find(function(x) { return String(x.id) === String(dossierId); });
        if (!d) { showNotif('Dossier introuvable', 'error'); return; }

        var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestId + '"]');
        if (!block) { showNotif('Gestionnaire introuvable', 'error'); return; }

        // Auto-incrément du Max si nécessaire (règle ÉVOL-B v4 : manager garde la main)
        var maxInput = modal.querySelector('.nb-dossiers-input[data-gestid="' + gestId + '"]');
        var maxVal = maxInput ? (parseInt(maxInput.value) || 0) : 0;
        var nbActuel = block.querySelectorAll('[data-dossier-id]').length;
        if (nbActuel >= maxVal && maxInput) {
            maxInput.value = nbActuel + 1;
        }

        // Retirer la carte de la zone gauche
        var rowLibre = document.querySelector('#liste-dossiers-libres [data-dossier-id="' + dossierId + '"]');
        if (rowLibre) rowLibre.remove();

        // Retirer le message "aucun dossier éligible" s'il existe
        var emptyMsg = block.querySelector('[data-empty-msg]');
        if (emptyMsg) emptyMsg.remove();

        // Ajouter la ligne dans le bloc gestionnaire
        block.insertAdjacentHTML('beforeend', renderLigneDossierBloc(d, gestId));

        // Re-bind les nouveaux handlers (move + remove) sur la nouvelle ligne
        bindMoveSelects();
        bindDossierRemoveButtons();

        // Mettre à jour les compteurs et l'affichage Max
        applyMaxToGest(gestId);
        updateAllCompteurs();
    }

    /**
     * Rebind les boutons ✕ de suppression. Appelée à l'init et après chaque
     * insertion de ligne pour que les nouveaux boutons soient fonctionnels.
     */
    function bindDossierRemoveButtons() {
        modal.querySelectorAll('[data-dossier-rm]').forEach(function(btn) {
            if (btn._boundRm) return; // évite le double-binding
            btn._boundRm = true;
            btn.onclick = function() {
                var row = this.closest('[data-dossier-id]');
                if (row) {
                    var gestid = row.closest('.dossiers-list-block').dataset.gestid;
                    row.remove();
                    applyMaxToGest(gestid);
                    updateAllCompteurs();
                }
            };
        });
    }

    /**
     * Ferme toute popup d'attribution actuellement ouverte.
     */
    function closeAllPopupsAttrib() {
        modal.querySelectorAll('.popup-attrib').forEach(function(p) { p.remove(); });
        modal.querySelectorAll('.dossier-libre-row.popup-open').forEach(function(row) {
            row.classList.remove('popup-open');
        });
    }

    /**
     * Bind le bouton + de chaque carte dossier dans la zone gauche.
     * Au clic, ouvre une popup juste sous la carte avec la liste des gestionnaires.
     * Le click sur un gestionnaire dans la popup déclenche attribuerDossierLibreVersGest.
     */
    function bindAttribLibres() {
        modal.querySelectorAll('.btn-attrib-libre').forEach(function(btn) {
            if (btn._boundAttrib) return; // évite le double-binding
            btn._boundAttrib = true;
            btn.onclick = function(e) {
                e.stopPropagation(); // évite que le click-outside ferme tout de suite
                var dossierId = this.dataset.dossierId;
                var row = this.closest('.dossier-libre-row');
                if (!row) return;
                // Si une popup est déjà ouverte sur cette carte, on la ferme (toggle)
                if (row.classList.contains('popup-open')) {
                    closeAllPopupsAttrib();
                    return;
                }
                // Sinon : on ferme les autres popups, puis on ouvre celle-ci
                closeAllPopupsAttrib();
                row.classList.add('popup-open');
                row.insertAdjacentHTML('beforeend', renderPopupAttrib(dossierId));
                // Bind les boutons gestionnaires de la popup
                var popup = row.querySelector('.popup-attrib');
                if (popup) {
                    popup.querySelectorAll('.popup-attrib-item').forEach(function(item) {
                        item.onclick = function(ev) {
                            ev.stopPropagation();
                            var gid = this.dataset.gestId;
                            var did = this.dataset.dossierId;
                            closeAllPopupsAttrib();
                            attribuerDossierLibreVersGest(did, gid);
                        };
                    });
                }
            };
        });
    }
    bindAttribLibres();

    // Click-outside : ferme toute popup d'attribution ouverte
    // (handler attaché au modal pour ne pas polluer le document global)
    modal.addEventListener('click', function(e) {
        // Si le click est sur une popup ou un bouton +, on laisse les handlers locaux gérer
        if (e.target.closest('.popup-attrib') || e.target.closest('.btn-attrib-libre')) return;
        closeAllPopupsAttrib();
    });
    // ── FIN ÉVOL-003 Lot 2 ──────────────────────────────────────────

    // ── ÉVOL-C : Handler de la bannière SUPPRIMÉ ─────────────────────
    // La bannière a été migrée vers showPreDispatchModal (ÉVOL-003 Étape 2).
    // Les pré-attributions manuelles sont désormais gérées via
    // window.dispatchGestsPrioritaires + window.dispatchAnciensIds, appliquées au moment du calcul de
    // la proposition (cf. bloc PRÉ-ASSIGNATION MANUELLE plus haut).
    // ── FIN ÉVOL-C ──────────────────────────────────────────────────

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
        // ── ÉVOL-003 Lot 2 : compteur "Non attribués" basé sur la zone gauche ──
        var listeLibres = document.getElementById('liste-dossiers-libres');
        var nbLibres = listeLibres ? listeLibres.querySelectorAll('[data-dossier-id]').length : 0;
        var spanLibres = document.getElementById('compteur-libres');
        if (spanLibres) spanLibres.textContent = nbLibres;
        // ──────────────────────────────────────────────────────────────────
        var txt = 'Total libres : <strong>' + totalLibresCount + '</strong> · Déjà prévus : <strong>' + totalAssigned + '</strong> · Reste à attribuer : <strong>' + nbLibres + '</strong>';
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
        if (badge) badge.textContent = Math.min(max, rows.length);
        recomputeGlobalCounters();
    }

    modal.querySelectorAll('.nb-dossiers-input').forEach(function(inp){
        inp.addEventListener('input', function(){ applyMaxToGest(this.dataset.gestid); });
    });

    // ── ÉVOL-003 Lot 2 : utilise bindDossierRemoveButtons (déclaré plus haut) ──
    bindDossierRemoveButtons();

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
        // ÉVOL-003 Étape 2 : reset des pré-attribs pour la prochaine session de dispatch
        window.dispatchGestsPrioritaires = [];
        window.dispatchAnciensIds = [];
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
