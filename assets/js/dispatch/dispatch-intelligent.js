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
        + '<div><strong>Automatique</strong><br><small style="color:var(--gray-600)">Dispatch intelligent par habilitations (10/gestionnaire)</small></div></div>'
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
        return _priScore(b) - _priScore(a); // score décroissant = priorités d'abord
    });

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'proposition-modal';
    modal.style.zIndex = 4000;

    var usedIds = [];
    var propData = {};

    // ── PRÉ-ASSIGNATION HISTORIQUE ─────────────────────────────
    var dossiersPreAssignes = {};
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
        if (!dossiersPreAssignes[String(refGest.id)]) dossiersPreAssignes[String(refGest.id)] = [];
        dossiersPreAssignes[String(refGest.id)].push(d);
        idsPreAssignes.push(d.id);
      });
      dossiersLibres = dossiersLibres.filter(function(d){ return !idsPreAssignes.includes(d.id); });
    }
    // ── FIN PRÉ-ASSIGNATION ────────────────────────────────────

    activeGest.forEach(function(g) {
        var hab = habMap[String(g.id)];

        // Habilitations normalisées
        // null = aucune fiche → pas de restriction
        // []   = fiche vide  → rien n'est autorisé
        // [..] = fiche avec valeurs → filtre appliqué
        var pf  = hab
                    ? (hab.portefeuille && hab.portefeuille.length > 0
                        ? hab.portefeuille.map(function(x){ return (x+'').toUpperCase().trim(); })
                        : [])
                    : null;
        var tp  = hab
                    ? (hab.type && hab.type.length > 0
                        ? hab.type.map(function(x){ return (x+'').toUpperCase().trim(); })
                        : [])
                    : null;
        var nat = hab
                    ? (hab.nature && hab.nature.length > 0
                        ? hab.nature.map(function(x){ return (x+'').toUpperCase().trim(); })
                        : [])
                    : null;

        // dossiersLibres déjà triés MRH/BDG globalement -- filtrer par habilitation
        var eligible = dossiersLibres.filter(function(d) {
            if (usedIds.includes(d.id)) return false;
            var dPf  = (d.portefeuille||'').toUpperCase().trim();
            var dTp  = normalizeType(d.type);
            var dNat = (d.nature||'').toUpperCase().trim();
            var okPf  = !pf  || pf.includes(dPf);
            var okTp  = !tp  || tp.includes(dTp);
            var okNat = !nat || nat.includes(dNat);
            return okPf && okTp && okNat;
        });

        eligible.forEach(function(d) { usedIds.push(d.id); });
        // Fusionner pré-assignés (en tête) + éligibles normaux
        var preA = dossiersPreAssignes[String(g.id)] || [];
        var eligibleIds = eligible.map(function(d){ return d.id; });
        var preAFiltered = preA.filter(function(d){ return !eligibleIds.includes(d.id); });
        propData[String(g.id)] = { g: g, dossiers: preAFiltered.concat(eligible) };
    });

    // Compteurs globaux
    var totalLibres = dossiersLibres.length + Object.values(dossiersPreAssignes).reduce(function(acc, arr){ return acc + arr.length; }, 0);

    var blocks = '';
    activeGest.forEach(function(g) {
        var prop = propData[String(g.id)];
        var dLines = '';
        prop.dossiers.forEach(function(d) {
            dLines += '<div data-dossier-id="' + d.id + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--gray-300);border-radius:8px;margin-bottom:4px;background:#f8f9fa">'
                + '<input type="checkbox" class="dossier-sel-cb" data-gest-id="' + g.id + '" style="width:14px;height:14px;accent-color:var(--rose);cursor:pointer;flex-shrink:0">'
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
            + '<div><strong style="color:var(--navy)">' + g.prenom + ' ' + g.nom + '</strong>'
            + ' <span class="badge-count" style="font-size:11px;color:var(--gray-600);background:var(--gray-100);padding:2px 8px;border-radius:10px">' + prop.dossiers.length + ' dossier(s)</span></div>'
            + '<div style="display:flex;align-items:center;gap:6px">'
            + '<label style="font-size:12px;color:var(--gray-600)">Max :</label>'
            + '<input type="number" class="nb-dossiers-input" data-gestid="' + g.id + '" value="10" min="1" max="50" style="width:55px;padding:4px 6px;border:1px solid var(--gray-300);border-radius:6px;text-align:center;font-size:13px">'
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

    modal.innerHTML = '<div class="modal" style="max-width:720px;width:95vw;max-height:88vh;overflow-y:auto">'
        + '<h2>🚀 Proposition de dispatch intelligent</h2>'
        + '<div id="global-dispatch-counter" style="font-size:12px;color:var(--gray-700);margin:-4px 0 8px 0;padding:6px 10px;background:#f5f5fb;border-radius:8px;border:1px solid #e0e3ff">'
        + 'Total libres : <strong>' + totalLibres + '</strong> · Déjà prévus : <strong>0</strong> · Reste à attribuer : <strong>' + totalLibres + '</strong>'
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

    // Bouton Rééquilibrer : on relance simplement une nouvelle proposition à partir de l'état actuel des dossiers
    var btnReeq = document.getElementById('btn-reeq');
    if (btnReeq) {
        btnReeq.onclick = function() {
            closeModal('proposition-modal');
            // On relance showPropositionModal qui va lire les dossiers non attribués + habilitations
            showPropositionModal();
        };
    }

    function recomputeGlobalCounters() {
        var totalAssigned = 0;
        modal.querySelectorAll('.dossiers-list-block').forEach(function(block){
            // Ne compter que les lignes visibles (respect du Max)
            totalAssigned += Array.from(block.querySelectorAll('[data-dossier-id]')).filter(function(row){
                return row.style.display !== 'none';
            }).length;
        });
        var remaining = totalLibres - totalAssigned;
        var txt = 'Total libres : <strong>' + totalLibres + '</strong> · Déjà prévus : <strong>' + totalAssigned + '</strong> · Reste à attribuer : <strong>' + Math.max(remaining,0) + '</strong>';
        var top = modal.querySelector('#global-dispatch-counter');
        var bottom = modal.querySelector('#global-dispatch-counter-footer');
        if (top) top.innerHTML = txt;
        if (bottom) bottom.innerHTML = txt;
    }

    function applyMaxToGest(gestid) {
        var input = modal.querySelector('.nb-dossiers-input[data-gestid="' + gestid + '"]');
        var max = parseInt((input && input.value) || '10', 10);
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

    // Mise à jour de la barre d'actions groupées selon sélection
    function updateBulkBar(gestid) {
        var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
        var selected = block ? block.querySelectorAll('.dossier-sel-cb:checked').length : 0;
        var moveBtn = modal.querySelector('.bulk-move-sel[data-gestid="' + gestid + '"]');
        var rmBtn   = modal.querySelector('.bulk-rm-btn[data-gestid="' + gestid + '"]');
        if (moveBtn) moveBtn.style.display = selected > 0 ? '' : 'none';
        if (rmBtn)   rmBtn.style.display   = selected > 0 ? '' : 'none';
    }

    // Afficher la barre quand une case est cochée
    modal.addEventListener('change', function(e) {
        if (e.target.classList.contains('dossier-sel-cb')) {
            var block = e.target.closest('.dossiers-list-block');
            if (block) updateBulkBar(block.dataset.gestid);
        }
    });

    // ── SUPPRESSION EN MASSE ─────────────────────────────────────────-
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
        // Animation pendant le dispatch
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

    // Détecter les motifs pour chaque dossier
    function getMotif(d) {
        var hasRef = histoPropActif && histoPropMap && histoPropMap[d.ref_sinistre];
        if (hasRef) {
            var refGestNom = histoPropMap[d.ref_sinistre].gestionnaire;
            var refGestActif = (activeGest||[]).some(function(g){ return (g.prenom+' '+g.nom) === refGestNom; });
            if (!refGestActif) return '👤 Référent (<strong>' + refGestNom + '</strong>) non sélectionné pour ce dispatch';
        }
        // Vérifier si un gestionnaire habilité existe dans activeGest
        var habiliteExiste = (activeGest||[]).some(function(g) {
            var hab = habMap ? habMap[String(g.id)] : null;
            if (!hab) return true; // pas de fiche = pas de restriction
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
    // Ouvrir une mini-modale de sélection gestionnaire
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
    // Retirer la ligne du tableau de la modale alerte
    var row = document.querySelector('#prio-alert-modal tr td button[onclick*="' + dossierId + '"]');
    if (row) row.closest('tr').style.opacity = '0.4';
    showNotif('✅ Dossier attribué à ' + nom, 'success');
    await loadDossiers();
}
// ===== FIN ALERTE PRIORITAIRES =====
