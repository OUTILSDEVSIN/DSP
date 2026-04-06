// ===== TICKET 1 -- DISPATCH INTELLIGENT v2 =====

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
            + '<div style="font-size:12px;color:var(--gray-600)">' + u.role.toUpperCase() + (u.niveau === 'debutant' ? ' · 🌱 Débutant' : '') + '</div>'
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
        + '<div><strong>Automatique</strong><br><small style="color:var(--gray-600)">Dispatch intelligent équilibré par habilitations</small></div></div>'
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

// ── Score de priorité unifié ──────────────────────────────────────────
function _dispPriScore(d, histoPropMap, histoPropActif) {
    var score = 0;
    var nat = (d.nature_label||d.nature||'').toUpperCase();
    var pf  = (d.portefeuille||'').toUpperCase();
    var tp  = (d.type||'').toUpperCase();
    // +5 référent historique
    if (histoPropActif && histoPropMap && histoPropMap[d.ref_sinistre]) score += 5;
    // +4 OPTINEO
    if (pf.includes('OPTINEO')) score += 4;
    // +2 MRH / Habitation
    if (tp.includes('HABITATION') || tp.includes('MRH')) score += 2;
    // +1 BDG
    if (nat.includes('BDG') || nat.includes('BRIS DE GLACE')) score += 1;
    return score;
}

// ── Quota équilibré : base + 1 pour les N premiers si reste ──────────
function _calcQuota(total, nbGest, index) {
    if (nbGest === 0) return 0;
    var base   = Math.floor(total / nbGest);
    var reste  = total % nbGest;
    return base + (index < reste ? 1 : 0);
}

// ── Détecte si un dossier est BDG ────────────────────────────────────
function _isBDG(d) {
    var nat = (d.nature_label||d.nature||'').toUpperCase();
    return nat.includes('BDG') || nat.includes('BRIS DE GLACE');
}

// ── Vérifie si un gestionnaire est habilité pour un dossier ──────────
function _estHabilite(g, d, habMap) {
    var hab = habMap[String(g.id)];
    if (!hab) return true;
    var pf  = hab.portefeuille && hab.portefeuille.length > 0 ? hab.portefeuille.map(function(x){ return (x+'').toUpperCase().trim(); }) : null;
    var tp  = hab.type && hab.type.length > 0 ? hab.type.map(function(x){ return (x+'').toUpperCase().trim(); }) : null;
    var nat = hab.nature && hab.nature.length > 0 ? hab.nature.map(function(x){ return (x+'').toUpperCase().trim(); }) : null;
    var okPf  = !pf  || pf.some(function(p){ return (d.portefeuille||'').toUpperCase().includes(p); });
    var okTp  = !tp  || tp.some(function(p){ return (d.type||'').toUpperCase().includes(p); });
    var okNat = !nat || nat.some(function(p){ return (d.nature||'').toUpperCase().includes(p); });
    return okPf && okTp && okNat;
}

async function showPropositionModal() {
    await loadDossiers();
    await loadAllUsers();

    var res = await db.from('habilitation_gestionnaires').select('*');
    var habMap = {};
    if (res.data) res.data.forEach(function(h) { habMap[String(h.user_id)] = h; });

    var resHistoProp = await db.from('historique_sinistres').select('ref_sinistre, gestionnaire, date_traitement');
    var histoPropMap = {};
    if (resHistoProp.data) resHistoProp.data.forEach(function(h){ histoPropMap[h.ref_sinistre] = h; });
    var resFlagProp = await db.from('app_config').select('value').eq('key','historique_actif').maybeSingle();
    var histoPropActif = !resFlagProp.data || resFlagProp.data.value !== 'false';

    var activeIds  = JSON.parse(safeSession.getItem('dispatch_gestionnaires') || '[]');
    var activeGest = (allUsers||[]).filter(function(u) { return activeIds.includes(String(u.id)); });

    // ── Séparer débutants / confirmés ────────────────────────────────
    var debutants = activeGest.filter(function(g){ return g.niveau === 'debutant'; });
    var confirmes = activeGest.filter(function(g){ return g.niveau !== 'debutant'; });

    // ── Parser date_etat pour tri ancienneté ─────────────────────────
    function _parseDateEtat(s) {
        if (!s) return null;
        var p = s.split('/');
        if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
        return new Date(s);
    }

    // ── Dossiers libres triés par score unifié + ancienneté ──────────
    var dossiersLibres = (allDossiers||[]).filter(function(d) {
        var s = (d.statut||'').toLowerCase();
        return s === 'nonattribue' || s === '' || !d.gestionnaire || d.gestionnaire === '';
    }).sort(function(a, b) {
        var sa = _dispPriScore(a, histoPropMap, histoPropActif);
        var sb = _dispPriScore(b, histoPropMap, histoPropActif);
        if (sb !== sa) return sb - sa;
        var da = _parseDateEtat(a.date_etat);
        var db2 = _parseDateEtat(b.date_etat);
        if (!da && !db2) return 0;
        if (!da) return 1;
        if (!db2) return -1;
        return da - db2;
    });

    var dossiersBDG    = dossiersLibres.filter(_isBDG);
    var dossiersNonBDG = dossiersLibres.filter(function(d){ return !_isBDG(d); });

    var usedIds  = [];
    var propData = {};

    // ── PASS 1 : BDG → débutants en priorité ─────────────────────────
    debutants.forEach(function(g, idx) {
        var quotaG  = _calcQuota(dossiersLibres.length, activeGest.length, idx);
        var bdgElig = dossiersBDG.filter(function(d){ return !usedIds.includes(d.id) && _estHabilite(g, d, habMap); });
        var attrib  = bdgElig.slice(0, quotaG);
        attrib.forEach(function(d){ usedIds.push(d.id); });
        // Compléter avec non-BDG si quota non atteint
        if (attrib.length < quotaG) {
            var compl = dossiersNonBDG.filter(function(d){ return !usedIds.includes(d.id) && _estHabilite(g, d, habMap); })
                                      .slice(0, quotaG - attrib.length);
            compl.forEach(function(d){ usedIds.push(d.id); });
            attrib = attrib.concat(compl);
        }
        propData[String(g.id)] = { g: g, dossiers: attrib, quota: quotaG };
    });

    // ── PASS 2 : dossiers restants → confirmés / experts ─────────────
    var restants = dossiersLibres.filter(function(d){ return !usedIds.includes(d.id); });
    confirmes.forEach(function(g, idx) {
        var quotaG  = _calcQuota(restants.length, confirmes.length, idx);
        var eligibles = restants.filter(function(d){ return !usedIds.includes(d.id) && _estHabilite(g, d, habMap); });
        var attrib  = eligibles.slice(0, quotaG);
        attrib.forEach(function(d){ usedIds.push(d.id); });
        propData[String(g.id)] = { g: g, dossiers: attrib, quota: quotaG };
    });

    // ── Rendu modal ───────────────────────────────────────────────────
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'proposition-modal';
    modal.style.zIndex = 4000;

    var blocks = '';
    activeGest.forEach(function(g) {
        var prop       = propData[String(g.id)] || { dossiers: [], quota: 0 };
        var isDebutant = g.niveau === 'debutant';
        var dLines = '';
        prop.dossiers.forEach(function(d) {
            var bdg = _isBDG(d);
            dLines += '<div data-dossier-id="' + d.id + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--gray-300);border-radius:8px;margin-bottom:4px;background:#f8f9fa">'
                + '<input type="checkbox" class="dossier-sel-cb" data-gest-id="' + g.id + '" style="width:14px;height:14px;accent-color:var(--rose);cursor:pointer;flex-shrink:0">'
                + (bdg ? '<span title="BDG" style="font-size:12px">🔵</span>' : '')
                + '<span style="font-family:monospace;font-weight:600;color:var(--navy);font-size:12px">' + (d.ref_sinistre||'') + '</span>'
                + '<span style="font-size:11px;color:var(--gray-600);flex:1">' + (d.portefeuille||'') + ' | ' + (d.type||'') + ' | ' + (d.nature_label||d.nature||'') + '</span>'
                + '<select data-dossier-move="' + d.id + '" data-current-gest="' + g.id + '" title="Déplacer vers..." style="font-size:11px;padding:2px 4px;border:1px solid var(--gray-300);border-radius:6px;cursor:pointer;max-width:130px"><option value="">↔️ Déplacer</option>' + activeGest.map(function(og){ return '<option value="' + og.id + '">' + og.prenom + ' ' + og.nom + '</option>'; }).join('') + '</select>'
                + '<button data-dossier-rm="' + d.id + '" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:16px;font-weight:700;padding:0 4px">✕</button>'
                + '</div>';
        });
        if (prop.dossiers.length === 0) {
            dLines = '<div style="padding:12px;text-align:center;color:var(--gray-600);font-size:13px">⚠️ Aucun dossier éligible pour les habilitations de ce gestionnaire</div>';
        }
        blocks += '<div style="padding:14px;border:1px solid ' + (isDebutant ? '#86efac' : 'var(--gray-200)') + ';border-radius:var(--radius-md);margin-bottom:12px;background:' + (isDebutant ? '#f0fdf4' : 'white') + '">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
            + '<div><strong style="color:var(--navy)">' + g.prenom + ' ' + g.nom + '</strong>'
            + (isDebutant ? ' <span style="font-size:11px;background:#bbf7d0;color:#166534;padding:2px 8px;border-radius:10px;font-weight:600">🌱 Débutant</span>' : '')
            + ' <span style="font-size:11px;color:var(--gray-600);background:var(--gray-100);padding:2px 8px;border-radius:10px">' + prop.dossiers.length + ' / ' + prop.quota + ' dossier(s)</span></div>'
            + '<div style="display:flex;align-items:center;gap:6px">'
            + '<label style="font-size:12px;color:var(--gray-600)">Max :</label>'
            + '<input type="number" class="nb-dossiers-input" data-gestid="' + g.id + '" value="' + prop.quota + '" min="1" max="50" style="width:55px;padding:4px 6px;border:1px solid var(--gray-300);border-radius:6px;text-align:center;font-size:13px">'
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

    modal.innerHTML = '<div class="modal" style="max-width:700px;width:95vw;max-height:88vh;overflow-y:auto">'
        + '<h2>🚀 Proposition de dispatch intelligent</h2>'
        + '<p style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Quota équilibré par habilitations. 🔵 = BDG · 🌱 = débutant (BDG prioritaires). Ajustez si besoin.</p>'
        + blocks
        + '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;border-top:1px solid var(--gray-200);padding-top:16px">'
        + '<button class="btn btn-secondary" id="btn-prop-cancel">Annuler</button>'
        + '<button class="btn btn-success" id="btn-do-dispatch" style="font-size:15px;padding:10px 32px;font-weight:700">✅ DISPATCH</button>'
        + '</div></div>';

    document.body.appendChild(modal);
    document.getElementById('btn-prop-cancel').onclick = function() { closeModal('proposition-modal'); };

    modal.querySelectorAll('[data-dossier-rm]').forEach(function(btn) {
        btn.onclick = function() { var row = this.closest('[data-dossier-id]'); if (row) row.remove(); };
    });

    function bindMoveSelects() {
        modal.querySelectorAll('[data-dossier-move]').forEach(function(sel) {
            sel.onchange = function() {
                var targetGestId = this.value;
                if (!targetGestId) return;
                var row = this.closest('[data-dossier-id]');
                if (!row) return;
                var targetBlock = modal.querySelector('.dossiers-list-block[data-gestid="' + targetGestId + '"]');
                if (!targetBlock) { this.value = ''; return; }
                this.setAttribute('data-current-gest', targetGestId);
                this.value = '';
                targetBlock.appendChild(row);
            };
        });
    }
    bindMoveSelects();

    modal.querySelectorAll('.sel-all-block').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var gestid = this.dataset.gestid;
            var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
            block.querySelectorAll('.dossier-sel-cb').forEach(function(c) { c.checked = cb.checked; });
            updateBulkBar(gestid);
        });
    });

    function updateBulkBar(gestid) {
        var block   = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
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

    modal.querySelectorAll('.bulk-rm-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var gestid = this.dataset.gestid;
            var block  = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
            block.querySelectorAll('.dossier-sel-cb:checked').forEach(function(cb) {
                var row = cb.closest('[data-dossier-id]'); if (row) row.remove();
            });
            modal.querySelector('.sel-all-block[data-gestid="' + gestid + '"]').checked = false;
            updateBulkBar(gestid);
        });
    });

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
            updateBulkBar(gestid);
            updateBulkBar(targetGestId);
            modal.querySelector('.sel-all-block[data-gestid="' + gestid + '"]').checked = false;
            bindMoveSelects();
        });
    });

    document.getElementById('btn-do-dispatch').onclick = async function() {
        var btnDispatch = this;
        btnDispatch.disabled = true;
        btnDispatch.innerHTML = '<span style="display:inline-block;animation:spin 0.8s linear infinite">⏳</span> Dispatch en cours...';
        btnDispatch.style.opacity = '0.8';
        var assignments = [];
        var warnings    = [];
        activeGest.forEach(function(g) {
            var nb   = parseInt((document.querySelector('.nb-dossiers-input[data-gestid="' + g.id + '"]')||{}).value) || 10;
            var rows = Array.from(document.querySelectorAll('.dossiers-list-block[data-gestid="' + g.id + '"] [data-dossier-id]')).slice(0, nb);
            var nom  = g.prenom + ' ' + g.nom;
            if (rows.length < nb) warnings.push(nom + ' : ' + rows.length + '/' + nb + ' dossier(s) seulement');
            rows.forEach(function(el) { assignments.push({ dossierId: el.dataset.dossierId, nom: nom }); });
        });
        if (warnings.length > 0) {
            var msg = '⚠️ Certains gestionnaires n\'ont pas reçu le nombre demandé :\n' + warnings.join('\n');
            if (!confirm(msg + '\n\nContinuer quand même ?')) {
                btnDispatch.disabled = false;
                btnDispatch.innerHTML = '✅ DISPATCH';
                btnDispatch.style.opacity = '';
                return;
            }
        }
        var ok = 0;
        for (var i = 0; i < assignments.length; i++) {
            var a = assignments[i];
            var r = await db.from('dossiers').update({
                gestionnaire: a.nom, statut: 'attribue',
                verrouille: true, dispatched_at: new Date().toISOString()
            }).eq('id', a.dossierId);
            if (!r.error) ok++;
        }
        closeModal('proposition-modal');
        showNotif(ok + ' dossier(s) dispatchés avec succès !', 'success');
        await auditLog('DISPATCH', ok + ' dossiers - dispatch intelligent v2');
        await loadDossiers();
        renderDashboard();
        checkPrioritairesNonAttribues(activeGest, habMap, histoPropMap, histoPropActif);
    };
}
// ===== FIN TICKET 1 =====




// ===== ALERTE PRIORITAIRES NON ATTRIBUÉS =====
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
        var motif = getMotif(d);
        return '<tr style="border-bottom:1px solid #eee">'
            + '<td style="padding:8px 10px;font-weight:600">' + (d.ref_sinistre||'') + '</td>'
            + '<td style="padding:8px 10px">' + (d.portefeuille||'') + '</td>'
            + '<td style="padding:8px 10px">' + (d.nature_label||d.nature||'') + '</td>'
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
    var opts  = gests.map(function(g){ return '<option value="' + (g.prenom+' '+g.nom) + '">' + g.prenom + ' ' + g.nom + '</option>'; }).join('');
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
    var rowBtn = document.querySelector('#prio-alert-modal tr td button[onclick*="' + dossierId + '"]');
    if (rowBtn) rowBtn.closest('tr').style.opacity = '0.4';
    showNotif('✅ Dossier attribué à ' + nom, 'success');
    await loadDossiers();
}
// ===== FIN ALERTE PRIORITAIRES =====
