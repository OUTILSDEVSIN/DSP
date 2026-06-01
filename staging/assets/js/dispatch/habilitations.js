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
            var hab = habMap[g.id] || {portefeuille:[],type:[],nature:[]};
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

            // Niveaux souscription déjà cochés pour ce gestionnaire
            var sousNiveaux = ['critique','majeur','vigilance','mineur'];
            var sousBadges = sousNiveaux.map(function(niv) {
                var col = { critique:'#dc2626', majeur:'#ea580c', vigilance:'#ca8a04', mineur:'#2563eb' }[niv];
                var active = hab['hab_souscription_' + niv] === true;
                return active
                    ? '<span style="font-size:10px;font-weight:700;color:' + col + ';background:' + col + '18;border:1px solid ' + col + ';border-radius:20px;padding:2px 7px">' + niv.charAt(0).toUpperCase() + niv.slice(1) + '</span>'
                    : '';
            }).filter(Boolean).join(' ');

            bodyHTML += '<div style="padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius-md);margin-bottom:12px;background:var(--gray-100)">';
            bodyHTML += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
            bodyHTML += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
            bodyHTML += '<div><strong style="color:var(--navy);font-size:14px">' + g.prenom + ' ' + g.nom + '</strong>';
            bodyHTML += ' <span style="font-size:11px;color:var(--gray-600)">' + g.role.toUpperCase() + '</span></div>';
            if (sousBadges) bodyHTML += '<div style="display:flex;gap:4px;flex-wrap:wrap">' + sousBadges + '</div>';
            bodyHTML += '</div>';
            bodyHTML += '<div style="display:flex;gap:6px">';
            bodyHTML += '<button class="btn-souscription btn btn-secondary" data-uid="' + g.id + '" data-prenom="' + g.prenom + '" data-nom="' + g.nom + '" style="font-size:11px;padding:3px 10px">📋 Souscription ✏️</button>';
            bodyHTML += '<button class="btn-sel-all btn btn-secondary" data-uid="' + g.id + '" style="font-size:11px;padding:3px 10px">Tout sélectionner</button>';
            bodyHTML += '</div>';
            bodyHTML += '</div>' + catHTML + '</div>';
        });

        modal.innerHTML =
            '<div class="modal" style="max-width:580px;width:95vw;max-height:85vh;overflow-y:auto">' +
            '<h2 style="display:flex;align-items:center;justify-content:space-between">🔑 Habilitations' +
            '<button class="btn btn-secondary" style="font-size:12px;padding:4px 12px" id="btn-close-hab">✕ Fermer</button></h2>' +
            '<p style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Cochez les droits de chaque gestionnaire. Non coché = pas le droit.</p>' +
            '<div id="hab-users-list">' + bodyHTML + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;border-top:1px solid var(--gray-200);padding-top:16px">' +
            '<button class="btn btn-secondary" id="btn-cancel-hab">Annuler</button>' +
            '<button class="btn btn-primary" id="btn-save-hab">💾 Enregistrer</button>' +
            '</div></div>';

        document.body.appendChild(modal);

        document.getElementById('btn-close-hab').onclick  = function() { closeModal('hab-modal'); };
        document.getElementById('btn-cancel-hab').onclick = function() { closeModal('hab-modal'); };
        document.getElementById('btn-save-hab').onclick   = saveAllHabilitations;

        modal.querySelectorAll('.btn-souscription').forEach(function(btn) {
            btn.onclick = function() {
                var uid = this.dataset.uid;
                var prenom = this.dataset.prenom;
                var nom = this.dataset.nom;
                showSouscriptionModal(uid, prenom, nom, habMap);
            };
        });

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
    for (var i = 0; i < gests.length; i++) {
        var g = gests[i];
        var hab = { portefeuille: [], type: [], nature: [] };
        var modal = document.getElementById('hab-modal');
        modal.querySelectorAll('.hab-cb[data-uid="' + g.id + '"]:checked').forEach(function(cb) {
            hab[cb.dataset.cat].push(cb.value);
        });
        var result = await db.from('habilitation_gestionnaires')
            .upsert({ user_id: g.id, portefeuille: hab.portefeuille, type: hab.type, nature: hab.nature, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (result.error) errors++;
    }
    closeModal('hab-modal');
    if (errors === 0) {
        showNotif('Habilitations enregistrees !', 'success');
        await auditLog('HAB_UPDATE', 'Habilitations modifiees');
    } else {
        showNotif(errors + ' erreur(s) sauvegarde', 'error');
    }
}
// ===== FIN TICKET 2 =====


// ===== MODALE SOUSCRIPTION PAR GESTIONNAIRE =====
function showSouscriptionModal(uid, prenom, nom, habMap) {
    var hab = habMap[String(uid)] || {};
    var niveaux = [
        { key: 'critique',  label: 'Critique',  color: '#dc2626' },
        { key: 'majeur',    label: 'Majeur',    color: '#ea580c' },
        { key: 'vigilance', label: 'Vigilance', color: '#ca8a04' },
        { key: 'mineur',    label: 'Mineur',    color: '#2563eb' }
    ];

    var existing = document.getElementById('sous-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'sous-modal';
    modal.style.zIndex = 4000;

    var rowsHTML = niveaux.map(function(n) {
        var isChecked = hab['hab_souscription_' + n.key] === true;
        var borderCol = isChecked ? n.color : '#e0e3e8';
        var bgCol     = isChecked ? n.color + '18' : '#f8f9fa';
        var chk       = isChecked ? 'checked' : '';
        return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid ' + borderCol + ';border-radius:var(--radius-md);cursor:pointer;font-size:13px;font-weight:600;background:' + bgCol + ';transition:all 0.15s;margin-bottom:8px">' +
            '<input type="checkbox" class="sous-cb" data-key="hab_souscription_' + n.key + '" ' + chk + ' style="width:15px;height:15px;accent-color:' + n.color + '">' +
            '<span style="color:' + n.color + ';font-weight:700">' + n.label + '</span>' +
            '<span style="font-size:11px;color:var(--gray-600);font-weight:400;margin-left:auto">' + getDelaiLabel(n.key) + '</span>' +
            '</label>';
    }).join('');

    modal.innerHTML =
        '<div class="modal" style="max-width:420px;width:95vw">' +
        '<h2 style="display:flex;align-items:center;justify-content:space-between">📋 Souscription' +
        '<button class="btn btn-secondary" style="font-size:12px;padding:4px 12px" id="btn-close-sous">✕ Fermer</button></h2>' +
        '<p style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Niveaux autorisés pour <strong>' + prenom + ' ' + nom + '</strong></p>' +
        rowsHTML +
        '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;border-top:1px solid var(--gray-200);padding-top:16px">' +
        '<button class="btn btn-secondary" id="btn-cancel-sous">Annuler</button>' +
        '<button class="btn btn-primary" id="btn-save-sous">💾 Enregistrer</button>' +
        '</div></div>';

    document.body.appendChild(modal);

    document.getElementById('btn-close-sous').onclick  = function() { closeModal('sous-modal'); };
    document.getElementById('btn-cancel-sous').onclick = function() { closeModal('sous-modal'); };

    modal.querySelectorAll('.sous-cb').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var lbl = this.closest('label');
            var niv = this.dataset.key.replace('hab_souscription_','');
            var col = { critique:'#dc2626', majeur:'#ea580c', vigilance:'#ca8a04', mineur:'#2563eb' }[niv];
            lbl.style.borderColor = this.checked ? col : '#e0e3e8';
            lbl.style.background  = this.checked ? col + '18' : '#f8f9fa';
        });
    });

    document.getElementById('btn-save-sous').onclick = async function() {
        var payload = { user_id: uid, updated_at: new Date().toISOString() };
        modal.querySelectorAll('.sous-cb').forEach(function(cb) {
            payload[cb.dataset.key] = cb.checked;
        });
        var result = await db.from('habilitation_gestionnaires')
            .upsert(payload, { onConflict: 'user_id' });
        closeModal('sous-modal');
        if (!result.error) {
            showNotif('Habilitations souscription enregistrées !', 'success');
            await auditLog('HAB_SOUSCRIPTION_UPDATE', 'Souscription modifiée pour ' + prenom + ' ' + nom);
        } else {
            showNotif('Erreur sauvegarde souscription', 'error');
        }
    };
}

function getDelaiLabel(niv) {
    return { critique:'0 – 15 jours', majeur:'15 – 30 jours', vigilance:'30 – 60 jours', mineur:'60 – 90 jours' }[niv] || '';
}
// ===== FIN MODALE SOUSCRIPTION =====


    'habitation': 'MRH',
    'auto': 'AUTO',
    'mrh': 'MRH',
    'automobile': 'AUTO'
};
function normalizeType(val) {
    if (!val) return '';
    return TYPE_LABEL_MAP[(val+'').toLowerCase().trim()] || (val+'').toUpperCase().trim();
}
