// ===== TICKET 2 -- HABILITATIONS =====
var CRITERES_HAB = {
    portefeuille: ['MIA', 'OPTINEO'],
    type: ['AUTO', 'MRH'],
    nature: ['MAT', 'BDG', 'VOL', 'DDE', 'AUTRE']
};

function showHabilitationsModal() {
    db.from('habilitation_gestionnaires').select('*').then(function(res) {
        var habs = res.data || [];
        var habMap = {};
        habs.forEach(function(h) { habMap[String(h.user_id)] = h; });
        var gests = allUsers.filter(function(u) {
            return ['gestionnaire','manager','admin'].includes(u.role);
        });

        var modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'hab-modal';
        modal.style.zIndex = 3000;

        var bodyHTML = '';
        gests.forEach(function(g) {
            var hab = habMap[g.id] || {portefeuille:[],type:[],nature:[],actif:true};
            // actif = true par défaut si non défini
            var isActif = (hab.actif === undefined || hab.actif === null) ? true : hab.actif;

            var catHTML = '';
            Object.keys(CRITERES_HAB).forEach(function(cat) {
                var opts = CRITERES_HAB[cat];
                catHTML += '<div style="margin-bottom:10px">';
                catHTML += '<div style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</div>';
                catHTML += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
                opts.forEach(function(opt) {
                    var isChecked = Array.isArray(hab[cat]) && hab[cat].map(String).includes(String(opt));
                    var borderCol = isChecked ? 'var(--rose)' : '#e0e3e8';
                    var bgCol     = isChecked ? 'var(--rose-light)' : '#f8f9fa';
                    var chk       = isChecked ? 'checked' : '';
                    catHTML += '<label style="display:flex;align-items:center;gap:5px;padding:4px 10px;border:1.5px solid ' + borderCol + ';border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;background:' + bgCol + ';transition:all 0.15s">';
                    catHTML += '<input type="checkbox" class="hab-cb" data-uid="' + g.id + '" data-cat="' + cat + '" value="' + opt + '" ' + chk + ' style="width:13px;height:13px;accent-color:var(--rose)">';
                    catHTML += ' ' + opt + '</label>';
                });
                catHTML += '</div></div>';
            });

            bodyHTML += '<div class="hab-user-block" data-uid="' + g.id + '" style="padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius-md);margin-bottom:12px;background:var(--gray-100);transition:opacity .2s;' + (!isActif ? 'opacity:0.45;' : '') + '">';
            bodyHTML += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
            // Gauche : case à cocher Actif + nom
            bodyHTML += '<div style="display:flex;align-items:center;gap:10px">';
            bodyHTML += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;" title="Activer / désactiver les habilitations">';
            bodyHTML += '<input type="checkbox" class="hab-actif-cb" data-uid="' + g.id + '" ' + (isActif ? 'checked' : '') + ' style="width:15px;height:15px;accent-color:var(--rose);cursor:pointer;">';
            bodyHTML += '<span style="font-size:11px;font-weight:700;color:var(--gray-600);">' + (isActif ? 'Actif' : 'Inactif') + '</span>';
            bodyHTML += '</label>';
            bodyHTML += '<div><strong style="color:var(--navy);font-size:14px">' + g.prenom + ' ' + g.nom + '</strong>';
            bodyHTML += ' <span style="font-size:11px;color:var(--gray-600)">' + g.role.toUpperCase() + '</span></div>';
            bodyHTML += '</div>';
            // Droite : Tout sélectionner
            bodyHTML += '<button class="btn-sel-all btn btn-secondary" data-uid="' + g.id + '" style="font-size:11px;padding:3px 10px">Tout sélectionner</button>';
            bodyHTML += '</div>' + catHTML + '</div>';
        });

        modal.innerHTML =
            '<div class="modal" style="max-width:580px;width:95vw;max-height:85vh;overflow-y:auto">' +
            '<h2 style="display:flex;align-items:center;justify-content:space-between">🔑 Habilitations' +
            '<button class="btn btn-secondary" style="font-size:12px;padding:4px 12px" id="btn-close-hab">✕ Fermer</button></h2>' +
            '<p style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Cochez les droits de chaque gestionnaire. Non couché = pas le droit. Décochez <strong>Actif</strong> pour exclure un gestionnaire du dispatch.</p>' +
            '<div id="hab-users-list">' + bodyHTML + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;border-top:1px solid var(--gray-200);padding-top:16px">' +
            '<button class="btn btn-secondary" id="btn-cancel-hab">Annuler</button>' +
            '<button class="btn btn-primary" id="btn-save-hab">💾 Enregistrer</button>' +
            '</div></div>';

        document.body.appendChild(modal);

        document.getElementById('btn-close-hab').onclick  = function() { closeModal('hab-modal'); };
        document.getElementById('btn-cancel-hab').onclick = function() { closeModal('hab-modal'); };
        document.getElementById('btn-save-hab').onclick   = saveAllHabilitations;

        // Case actif : update label + opacité du bloc
        modal.querySelectorAll('.hab-actif-cb').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var uid   = this.dataset.uid;
                var block = modal.querySelector('.hab-user-block[data-uid="' + uid + '"]');
                var label = this.nextElementSibling;
                if (this.checked) {
                    block.style.opacity = '1';
                    label.textContent = 'Actif';
                } else {
                    block.style.opacity = '0.45';
                    label.textContent = 'Inactif';
                }
            });
        });

        // Tout sélectionner
        modal.querySelectorAll('.btn-sel-all').forEach(function(btn) {
            btn.onclick = function() {
                var uid = this.dataset.uid;
                modal.querySelectorAll('.hab-cb[data-uid="' + uid + '"]').forEach(function(cb) {
                    cb.checked = true;
                    var lbl = cb.closest('label');
                    lbl.style.borderColor = 'var(--rose)';
                    lbl.style.background  = 'var(--rose-light)';
                });
            };
        });

        // Style dynamique cases habilitations
        modal.querySelectorAll('.hab-cb').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var lbl = this.closest('label');
                lbl.style.borderColor = this.checked ? 'var(--rose)' : '#e0e3e8';
                lbl.style.background  = this.checked ? 'var(--rose-light)' : '#f8f9fa';
            });
        });
    });
}

async function saveAllHabilitations() {
    var gests = allUsers.filter(function(u) {
        return ['gestionnaire','manager','admin'].includes(u.role);
    });
    var errors = 0;
    var modal = document.getElementById('hab-modal');
    for (var i = 0; i < gests.length; i++) {
        var g = gests[i];
        var hab = { portefeuille: [], type: [], nature: [] };
        modal.querySelectorAll('.hab-cb[data-uid="' + g.id + '"]:checked').forEach(function(cb) {
            hab[cb.dataset.cat].push(cb.value);
        });
        // Récupérer l'état de la case actif
        var actifCb = modal.querySelector('.hab-actif-cb[data-uid="' + g.id + '"]');
        var actif = actifCb ? actifCb.checked : true;

        var result = await db.from('habilitation_gestionnaires')
            .upsert({
                user_id: g.id,
                portefeuille: hab.portefeuille,
                type: hab.type,
                nature: hab.nature,
                actif: actif,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        if (result.error) errors++;
    }
    closeModal('hab-modal');
    if (errors === 0) {
        showNotif('Habilitations enregistrées !', 'success');
        await auditLog('HAB_UPDATE', 'Habilitations modifiées');
    } else {
        showNotif(errors + ' erreur(s) sauvegarde', 'error');
    }
}
// ===== FIN TICKET 2 =====


var TYPE_LABEL_MAP = {
    'habitation': 'MRH',
    'auto': 'AUTO',
    'mrh': 'MRH',
    'automobile': 'AUTO'
};
function normalizeType(val) {
    if (!val) return '';
    return TYPE_LABEL_MAP[(val+'').toLowerCase().trim()] || (val+'').toUpperCase().trim();
}
