/* dispatchis.js — Dispatchis v2.5.58 — Actions, reset, notifs, tickets, stats, historique */

// ===== ACTIONS =====

// ── SÉLECTION & VERROUILLAGE ──────────────────────────────
function updateSelectionCount() {
  const n = document.querySelectorAll('.row-check:checked').length;
  const el = document.getElementById('selection-count');
  if (el) el.textContent = n + ' sélectionné(s)';
}

function toggleAll(checked) {
  document.querySelectorAll('.row-check:not([disabled])').forEach(cb => cb.checked = checked);
  updateSelectionCount();
}

function selectAll() {
  document.querySelectorAll('.row-check:not([disabled])').forEach(cb => cb.checked = true);
  const all = document.getElementById('check-all');
  if (all) all.checked = true;
  updateSelectionCount();
}

function clearSelection() {
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
  const all = document.getElementById('check-all');
  if (all) all.checked = false;
  updateSelectionCount();
}

async function lockSelection() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => parseInt(cb.dataset.id));
  if (!ids.length) { showNotif('Sélectionnez au moins un dossier.', 'error'); return; }
  const gestionnaire = document.getElementById('assign-bulk-select')?.value || '';
  const sansGest = ids.filter(id => { const d = allDossiers.find(x => x.id === id); return !gestionnaire && !(d && d.gestionnaire); });
  if (sansGest.length > 0) {
    const gests = allUsers.filter(u => ['gestionnaire','manager','admin'].includes(u.role));
    const modal = document.createElement('div');
    modal.className = 'modal-overlay'; modal.id = 'lock-warn-modal';
    // Construire la modale sans guillemets imbriqués
    const inner = document.createElement('div');
    inner.className = 'modal';
    inner.style.cssText = 'text-align:center;max-width:420px';
    inner.innerHTML = '<div style="font-size:44px;margin-bottom:12px">&#9888;&#65039;</div>'
      + '<h2 style="color:#e74c3c">Gestionnaire manquant</h2>'
      + '<p style="color:#666;margin:14px 0"><strong>' + sansGest.length + '</strong> dossier(s) sans gestionnaire.<br>Selectionnez-en un avant de verrouiller.</p>';
    const sel = document.createElement('select');
    sel.id = 'lock-warn-select'; sel.className = 'filter-select';
    sel.style.cssText = 'width:100%;margin-bottom:20px';
    sel.innerHTML = '<option value="">— Choisir un gestionnaire —</option>'
      + gests.map(g => { const n = g.prenom + ' ' + g.nom; return '<option value="' + n + '">' + n + ' (' + g.role + ')</option>'; }).join('');
    inner.appendChild(sel);
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:10px;justify-content:center';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary'; btnCancel.textContent = 'Annuler';
    btnCancel.onclick = () => closeModal('lock-warn-modal');
    const btnOk = document.createElement('button');
    btnOk.className = 'btn btn-warning'; btnOk.textContent = '🔒 Verrouiller';
    btnOk.onclick = () => confirmLockWithGest(ids);
    btns.appendChild(btnCancel); btns.appendChild(btnOk);
    inner.appendChild(btns);
    modal.appendChild(inner);
    document.body.appendChild(modal); return;
  }
  await executeLock(ids, gestionnaire);
}

async function confirmLockWithGest(ids) {
  const gestionnaire = document.getElementById('lock-warn-select')?.value;
  if (!gestionnaire) { showNotif('Veuillez sélectionner un gestionnaire.', 'error'); return; }
  closeModal('lock-warn-modal');
  await executeLock(ids, gestionnaire);
}

async function executeLock(ids, gestionnaire) {
  for (const id of ids) {
    const upd = { verrouille: true };
    if (gestionnaire) upd.gestionnaire = gestionnaire;
    await db.from('dossiers').update(upd).eq('id', id);
  }
  await auditLog('VERROUILLAGE', ids.length + ' dossier(s) verrouillés' + (gestionnaire ? ' → ' + gestionnaire : ''));
  showNotif('🔒 ' + ids.length + ' dossier(s) verrouillé(s)' + (gestionnaire ? ' et attribués à ' + gestionnaire : '') + '.', 'success');
  clearSelection();
  await loadDossiers();
  renderAttribution();
}

async function unlockSelection() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => parseInt(cb.dataset.id));
  if (!ids.length) { showNotif('Sélectionnez au moins un dossier.', 'error'); return; }
  for (const id of ids) {
    await db.from('dossiers').update({ verrouille: false }).eq('id', id);
  }
  await auditLog('DEVERROUILLAGE', ids.length + ' dossier(s) déverrouillés');
  showNotif(`🔓 ${ids.length} dossier(s) déverrouillé(s).`, 'info');
  clearSelection();
  await loadDossiers();
  renderAttribution();
}

async function toggleVerrouille(id, checked) {
  const dossier = allDossiers.find(d => d.id === id);
  const statut = dossier?.statut || 'nonattribue';
  const isDispatched = ['attribue','encours','ouvert','traite'].includes(statut);

  // Si on veut déverrouiller un dossier dispatché → seul manager
  if (!checked && isDispatched && !isManager) {
    showNotif('Seul le manager peut déverrouiller un dossier dispatché.', 'error');
    renderAttribution(); return;
  }

  if (!checked && isDispatched && isManager) {
    showUnlockConfirm(id);
    renderAttribution(); return;
  }

  const { error } = await db.from('dossiers').update({ verrouille: checked }).eq('id', id);
  if (error) { showNotif('Erreur.', 'error'); return; }
  allDossiers = allDossiers.map(d => d.id === id ? {...d, verrouille: checked} : d);
  showNotif(checked ? '🔒 Dossier verrouillé' : '🔓 Dossier déverrouillé', 'info');
  // Mettre à jour le compteur dispatch
  const nbVerrouilles = allDossiers.filter(d => d.verrouille && !['attribue','encours','ouvert','traite'].includes(d.statut||'nonattribue')).length;
  const btn = document.querySelector('.btn-dispatch');
  if (btn) { btn.disabled = nbVerrouilles === 0; btn.textContent = `🚀 DISPATCHER${nbVerrouilles > 0 ? ` (${nbVerrouilles})` : ''}`; }
}

function showUnlockConfirm(id) {
  const existing = document.getElementById('unlock-confirm-modal');
  if (existing) existing.remove();
  const d = allDossiers.find(x => x.id === id);
  const gname = d && d.gestionnaire ? ' (attribué à <strong>' + d.gestionnaire + '</strong>)' : '';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'unlock-confirm-modal';
  const inner = document.createElement('div');
  inner.className = 'modal'; inner.style.cssText = 'text-align:center;max-width:420px';
  inner.innerHTML = '<div style="font-size:44px;margin-bottom:12px">🔓</div>'
    + '<h2 style="color:#e74c3c">Libérer ce dossier ?</h2>'
    + '<p style="color:#666;margin:16px 0">Cette action va <strong>désattribuer</strong> le dossier' + gname + ' et remettre son statut à <strong>Non attribué</strong>.</p>';
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:20px';
  const btnC = document.createElement('button'); btnC.className = 'btn btn-secondary'; btnC.textContent = 'Annuler';
  btnC.onclick = () => closeModal('unlock-confirm-modal');
  const btnO = document.createElement('button'); btnO.className = 'btn btn-danger'; btnO.textContent = '🔓 Confirmer la libération';
  btnO.onclick = () => confirmUnlock(id);
  btns.appendChild(btnC); btns.appendChild(btnO); inner.appendChild(btns); modal.appendChild(inner);
  document.body.appendChild(modal);
}

async function confirmUnlock(id) {
  closeModal('unlock-confirm-modal');
  const { error } = await db.from('dossiers').update({ verrouille: false, gestionnaire: '', statut: 'nonattribue' }).eq('id', id);
  if (error) { showNotif('Erreur lors du déverrouillage.', 'error'); return; }
  showNotif('🔓 Dossier déverrouillé et désattribué.', 'success');
  await loadDossiers();
  renderAttribution();
}

async function assignDossier(id, gestionnaire) {
  const { error } = await db.from('dossiers').update({ gestionnaire }).eq('id', id);
  if (error) { showNotif('Erreur lors de l\'attribution.', 'error'); return; }
  showNotif(gestionnaire ? `Dossier attribué à ${gestionnaire}` : 'Attribution annulée', 'success');
  allDossiers = allDossiers.map(d => d.id === id ? {...d, gestionnaire} : d);
}

async function toggleTraite(id, checked, gestionnaire) {
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const isManager = ['admin','manager'].includes(currentUserData.role);
  if (!isManager && gestionnaire !== monNom) {
    showNotif('Vous ne pouvez cocher que vos propres dossiers.', 'error');
    renderAttribution(); return;
  }
  // Gestionnaire peut décocher traité → statut ouvert, reste verrouillé
  // (isManager ou propriétaire du dossier)
  const newStatut = checked ? 'traite' : 'ouvert';
  const { error } = await db.from('dossiers').update({ traite: checked, statut: newStatut, traite_at: checked ? new Date().toISOString() : null }).eq('id', id);
  if (error) { showNotif('Erreur.', 'error'); return; }
  const dossierRef = (allDossiers.find(function(d){ return d.id === id; }) || {}).ref_sinistre || ('ID ' + id);
  await auditLog(checked ? 'MARQUER_TRAITE' : 'REMETTRE_EN_COURS', 'Réf. sinistre : ' + dossierRef);
  if (checked) {
    const dFound = allDossiers.find(function(d){ return d.id === id; });
    if (dFound && dFound.ref_sinistre) {
      await db.from('historique_sinistres').upsert(
        { ref_sinistre: dFound.ref_sinistre, gestionnaire: gestionnaire, date_traitement: new Date().toISOString().split('T')[0] },
        { onConflict: 'ref_sinistre', ignoreDuplicates: true }
      );
    }
  }
  
  showNotif(checked ? '✅ Dossier marqué traité' : '↩️ Dossier remis en cours', 'success');
  allDossiers = allDossiers.map(d => d.id === id ? {...d, traite: checked, statut: newStatut} : d);
}

// ===== RESET =====


// ===== NOTIF =====

  // ===== T10 — DOSSIER SUPPLÉMENTAIRE =====
  async function demanderDossierSupp() {
    await loadDossiers(); // Reload pour avoir le compte exact
    const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
    const nonTraites = allDossiers.filter(function(d) { return d.gestionnaire === monNom && !d.traite; });
    if (nonTraites.length > 0) {
      const ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'supp-blocked-modal';
      const bx = document.createElement('div'); bx.className = 'modal'; bx.style.cssText = 'text-align:center;max-width:400px';
      bx.innerHTML = '<div style="font-size:52px;margin-bottom:12px">🐌</div><h2 style="color:#e74c3c">Pas trop vite !</h2>'
        + '<p style="color:#666;margin:16px 0">Tu as encore <strong>' + nonTraites.length + ' dossier(s) non trait&eacute;(s)</strong>.<br>Termine tes dossiers avant d&#39;en demander un nouveau !</p>'
        + '<div id="sbtn" style="margin-top:20px"></div>';
      ov.appendChild(bx); document.body.appendChild(ov);
      const bc = document.createElement('button'); bc.className = 'btn btn-secondary'; bc.textContent = 'OK, compris !'; bc.style.width = '100%';
      bc.onclick = function() { closeModal('supp-blocked-modal'); };
      document.getElementById('sbtn').appendChild(bc);
      return;
    }
    const dispo = allDossiers.filter(function(d) {
      const s = (d.statut||'').toLowerCase().replace(/[^a-z]/g,'');
      const isLibre = !['attribue','attribute','encours','ouvert','traite'].includes(s);
      return (!d.gestionnaire || d.gestionnaire === '') && !d.verrouille && isLibre;
    });
    const enAttenteDispatch = allDossiers.filter(function(d) { return d.verrouille && (!d.statut || d.statut === 'nonattribue'); }).length;
    if (dispo.length === 0) {
      const msg = enAttenteDispatch > 0
        ? 'Aucun dossier libre. ' + enAttenteDispatch + ' dossier(s) sont verrouillés en attente de dispatch.'
        : 'Aucun dossier disponible. Tous les dossiers ont été distribués.';
      showNotif(msg, 'error'); return;
    }
    const ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'supp-confirm-modal';
    const bx = document.createElement('div'); bx.className = 'modal'; bx.style.cssText = 'text-align:center;max-width:400px';
    bx.innerHTML = '<div style="font-size:52px;margin-bottom:12px">📋</div><h2 style="color:var(--navy)">Demander un dossier ?</h2>'
      + '<p style="color:#666;margin:16px 0">Il reste <strong>' + dispo.length + ' dossier(s) disponible(s)</strong>.<br>Un dossier va vous &ecirc;tre attribu&eacute; automatiquement.</p>'
      + '<div id="scbtn" style="display:flex;gap:10px;justify-content:center;margin-top:20px"></div>';
    ov.appendChild(bx); document.body.appendChild(ov);
    const bA = document.createElement('button'); bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
    bA.onclick = function() { closeModal('supp-confirm-modal'); };
    const bC = document.createElement('button'); bC.className = 'btn btn-success'; bC.textContent = 'Confirmer'; bC.onclick = confirmerDossierSupp;
    const d = document.getElementById('scbtn'); d.appendChild(bA); d.appendChild(bC);
  }
  async function confirmerDossierSupp() {
    closeModal('supp-confirm-modal');
    const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
    const monUser = (allUsers||[]).find(function(u){ return u.prenom + ' ' + u.nom === monNom; });
    // Charger habilitations du gestionnaire
    var habRes = monUser ? await db.from('habilitation_gestionnaires').select('*').eq('gestionnaire', monNom) : { data: null };
    var habs = habRes.data || null; // null = pas de fiche = pas de restriction
    const dispo = allDossiers.filter(function(d) {
      const s = (d.statut||'').toLowerCase().replace(/[^a-z]/g,'');
      const isLibre = !['attribue','attribute','encours','ouvert','traite'].includes(s);
      return (!d.gestionnaire || d.gestionnaire === '') && !d.verrouille && isLibre;
    });
    const enAttenteDispatch = allDossiers.filter(function(d) { return d.verrouille && (!d.statut || d.statut === 'nonattribue'); }).length;
    if (dispo.length === 0) {
      const msg = enAttenteDispatch > 0
        ? 'Aucun dossier libre. ' + enAttenteDispatch + ' dossier(s) sont verrouillés en attente de dispatch.'
        : 'Aucun dossier disponible. Tous les dossiers ont été distribués.';
      showNotif(msg, 'error'); return;
    }
    // Filtrer les dossiers selon les habilitations du gestionnaire
    var dispoHabilite = dispo;
    if (habs && habs.length > 0) {
      var portefeuilles = habs.map(function(h){ return (h.portefeuille||'').toUpperCase().trim(); }).filter(Boolean);
      var types = habs.map(function(h){ return (h.type_sinistre||'').toUpperCase().trim(); }).filter(Boolean);
      dispoHabilite = dispo.filter(function(d) {
        var dPf  = (d.portefeuille||'').toUpperCase().trim();
        var dTp  = (d.type||'').toUpperCase().trim();
        var okPf = portefeuilles.length === 0 || portefeuilles.some(function(p){ return dPf.includes(p); });
        var okTp = types.length === 0 || types.some(function(t){ return dTp.includes(t); });
        return okPf && okTp;
      });
    }
    if (dispoHabilite.length === 0) {
      // Aucun dossier habilité disponible
      var ov2 = document.createElement('div'); ov2.className = 'modal-overlay'; ov2.id = 'hab-blocked-modal';
      var bx2 = document.createElement('div'); bx2.className = 'modal'; bx2.style.cssText = 'text-align:center;max-width:420px';
      bx2.innerHTML = [
        '<div style="font-size:52px;margin-bottom:12px">&#x1F6AB;</div>',
        '<h2 style="color:#e74c3c">Dossier non disponible</h2>',
        '<p style="color:#666;margin:16px 0">Vous n&apos;êtes pas habilité(e) pour les dossiers disponibles.<br><br>',
        '<strong>Rapprochez-vous de votre manager</strong> pour une attribution manuelle.</p>',
        '<div style="margin-top:20px"><button class="btn btn-secondary" onclick="closeModal(&quot;hab-blocked-modal&quot;)" style="width:100%">OK, compris</button></div>'
      ].join('');

      ov2.appendChild(bx2); document.body.appendChild(ov2);
      return;
    }
    // Attribuer le premier dossier habilité (prioritaires en tête)
    var dossierChoisi = dispoHabilite[0];
    const { error } = await db.from('dossiers').update({ gestionnaire: monNom, statut: 'attribue', verrouille: true, demande_supp: true }).eq('id', dossierChoisi.id);
    if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
    await auditLog('DEMANDE_DOSSIER_SUPP', 'Nouveau dossier supplémentaire attribué : ' + dossierChoisi.ref_sinistre);
    showNotif('✅ Nouveau dossier attribué : ' + dossierChoisi.ref_sinistre, 'success');
    await loadDossiers(); renderMesDossiers();
  }
  // ===== FIN T10 =====
function showNotif(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `notif notif-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ===== INIT =====
db.auth.getSession().then(({ data }) => {
  if (data.session) { currentUser = data.session.user; loadUserData(); }
});

// ===== TICKET 2 — HABILITATIONS =====
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

            bodyHTML += '<div style="padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius-md);margin-bottom:12px;background:var(--gray-100)">';
            bodyHTML += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
            bodyHTML += '<div><strong style="color:var(--navy);font-size:14px">' + g.prenom + ' ' + g.nom + '</strong>';
            bodyHTML += ' <span style="font-size:11px;color:var(--gray-600)">' + g.role.toUpperCase() + '</span></div>';
            bodyHTML += '<button class="btn-sel-all btn btn-secondary" data-uid="' + g.id + '" style="font-size:11px;padding:3px 10px">Tout sélectionner</button>';
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

// ===== TICKET 1 — DISPATCH INTELLIGENT =====

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

    // Dossiers libres — pré-triés : OPTINEO + HABITATION/MRH + BDG en priorité absolue
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

        // dossiersLibres déjà triés MRH/BDG globalement — filtrer par habilitation
        var eligible = dossiersLibres.filter(function(d) {
            if (usedIds.includes(d.id)) return false;
            var dPf  = (d.portefeuille||'').toUpperCase().trim();
            var dTp  = normalizeType(d.type);
            var dNat = (d.nature||'').toUpperCase().trim();
            var okPf  = !pf  || pf.includes(dPf);
            var okTp  = !tp  || tp.includes(dTp);
            var okNat = !nat || nat.includes(dNat);
            return okPf && okTp && okNat;
        }).slice(0, 10);

        eligible.forEach(function(d) { usedIds.push(d.id); });
        // Fusionner pré-assignés (en tête) + éligibles normaux
        var preA = dossiersPreAssignes[String(g.id)] || [];
        var eligibleIds = eligible.map(function(d){ return d.id; });
        var preAFiltered = preA.filter(function(d){ return !eligibleIds.includes(d.id); });
        propData[String(g.id)] = { g: g, dossiers: preAFiltered.concat(eligible) };
    });

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
        blocks += '<div style="padding:14px;border:1px solid var(--gray-200);border-radius:var(--radius-md);margin-bottom:12px;background:white">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
            + '<div><strong style="color:var(--navy)">' + g.prenom + ' ' + g.nom + '</strong>'
            + ' <span style="font-size:11px;color:var(--gray-600);background:var(--gray-100);padding:2px 8px;border-radius:10px">' + prop.dossiers.length + ' dossier(s)</span></div>'
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

    modal.innerHTML = '<div class="modal" style="max-width:700px;width:95vw;max-height:88vh;overflow-y:auto">'
        + '<h2>🚀 Proposition de dispatch intelligent</h2>'
        + '<p style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Dossiers filtrés par habilitations. Ajustez le nombre max ou supprimez des dossiers.</p>'
        + blocks
        + '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;border-top:1px solid var(--gray-200);padding-top:16px">'
        + '<button class="btn btn-secondary" id="btn-prop-cancel">Annuler</button>'
        + '<button class="btn btn-success" id="btn-do-dispatch" style="font-size:15px;padding:10px 32px;font-weight:700">✅ DISPATCH</button>'
        + '</div></div>';

    document.body.appendChild(modal);
    document.getElementById('btn-prop-cancel').onclick = function() { closeModal('proposition-modal'); };

    modal.querySelectorAll('[data-dossier-rm]').forEach(function(btn) {
        btn.onclick = function() {
            var row = this.closest('[data-dossier-id]');
            if (row) row.remove();
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
                var targetBlock = modal.querySelector('.dossiers-list-block[data-gestid="' + targetGestId + '"]');
                if (!targetBlock) { this.value = ''; return; }
                // Mettre à jour l'attribut current-gest
                this.setAttribute('data-current-gest', targetGestId);
                this.value = '';
                // Retirer le message vide s'il existe
                var emptyMsg = targetBlock.querySelector('[data-empty-msg]');
                if (emptyMsg) emptyMsg.remove();
                targetBlock.appendChild(row);
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
            var gestid = e.target.dataset.gestId;
            // Chercher le gestid dans la ligne parente
            var block = e.target.closest('.dossiers-list-block');
            if (block) updateBulkBar(block.dataset.gestid);
        }
    });

    // ── SUPPRESSION EN MASSE ──────────────────────────────────────────
    modal.querySelectorAll('.bulk-rm-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var gestid = this.dataset.gestid;
            var block = modal.querySelector('.dossiers-list-block[data-gestid="' + gestid + '"]');
            block.querySelectorAll('.dossier-sel-cb:checked').forEach(function(cb) {
                var row = cb.closest('[data-dossier-id]');
                if (row) row.remove();
            });
            modal.querySelector('.sel-all-block[data-gestid="' + gestid + '"]').checked = false;
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
            updateBulkBar(gestid);
            updateBulkBar(targetGestId);
            modal.querySelector('.sel-all-block[data-gestid="' + gestid + '"]').checked = false;
            bindMoveSelects();
        });
    });

    document.getElementById('btn-do-dispatch').onclick = async function() {
        // Animation pendant le dispatch
        var btnDispatch = this;
        btnDispatch.disabled = true;
        btnDispatch.innerHTML = '<span style="display:inline-block;animation:spin 0.8s linear infinite">⏳</span> Dispatch en cours...';
        btnDispatch.style.opacity = '0.8';
        var assignments = [];
        var warnings = [];
        activeGest.forEach(function(g) {
            var nb = parseInt((document.querySelector('.nb-dossiers-input[data-gestid="' + g.id + '"]')||{}).value) || 10;
            var rows = Array.from(document.querySelectorAll('.dossiers-list-block[data-gestid="' + g.id + '"] [data-dossier-id]')).slice(0, nb);
            var nom = g.prenom + ' ' + g.nom;
            if (rows.length < nb) {
                warnings.push(nom + ' : ' + rows.length + '/' + nb + ' dossier(s) seulement');
            }
            rows.forEach(function(el) {
                assignments.push({ dossierId: el.dataset.dossierId, nom: nom });
            });
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

// ===== STATS =====
async function renderStats() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement des stats...</div>';

  // Données du jour (live)
  await loadDossiers();
  await loadAllUsers();

  // Charger le flag archivage depuis app_config
  var archivageActif = true;
  var resConfig = await db.from('app_config').select('value').eq('key', 'archivage_stats').maybeSingle();
  if (resConfig.data) {
    archivageActif = resConfig.data.value !== 'false' && resConfig.data.value !== false;
  }

  // Données historiques
  var resHisto = await db.from('stats_journalieres').select('*').order('date_journee', { ascending: false });
  var histo = resHisto.data || [];

  var role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;

  // ── KPIs DU JOUR ──────────────────────────────────────────
  var total     = allDossiers.length;
  var traites   = allDossiers.filter(function(d){ return d.traite; }).length;
  var enCours   = total - traites;
  var tauxGlobal = total > 0 ? Math.round(traites / total * 100) : 0;

  // Temps moyen traitement (minutes) — journée en cours
  var dosAvecTemps = allDossiers.filter(function(d){
    return d.traite && d.traite_at && d.dispatched_at;
  });
  var tpsMoyenMin = 0;
  if (dosAvecTemps.length > 0) {
    var totalMin = dosAvecTemps.reduce(function(acc, d) {
      return acc + (new Date(d.traite_at) - new Date(d.dispatched_at)) / 60000;
    }, 0);
    tpsMoyenMin = Math.round(totalMin / dosAvecTemps.length);
  }

  // Meilleur gestionnaire du jour
  var gestScores = {};
  allDossiers.forEach(function(d) {
    if (!d.gestionnaire) return;
    if (!gestScores[d.gestionnaire]) gestScores[d.gestionnaire] = { assignes: 0, traites: 0 };
    gestScores[d.gestionnaire].assignes++;
    if (d.traite) gestScores[d.gestionnaire].traites++;
  });
  var topGest = Object.entries(gestScores).sort(function(a,b){ return b[1].traites - a[1].traites; })[0];

  // ── CLASSEMENT GESTIONNAIRES ──────────────────────────────
  var gestRows = Object.entries(gestScores).map(function(e) {
    var nom = e[0]; var s = e[1];
    var pct = s.assignes > 0 ? Math.round(s.traites / s.assignes * 100) : 0;
    return { nom: nom, assignes: s.assignes, traites: s.traites, enCours: s.assignes - s.traites, pct: pct };
  }).sort(function(a,b){ return b.traites - a.traites; });

  var rankRows = gestRows.map(function(g, i) {
    var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.';
    var couleur = g.pct >= 80 ? '#27ae60' : g.pct >= 50 ? '#e67e22' : '#e74c3c';
    return '<tr>'
      + '<td style="text-align:center;font-size:16px">' + medal + '</td>'
      + '<td><strong>' + g.nom + '</strong></td>'
      + '<td style="text-align:center">' + g.assignes + '</td>'
      + '<td style="text-align:center;color:#27ae60;font-weight:700">' + g.traites + '</td>'
      + '<td style="text-align:center;color:#e67e22">' + g.enCours + '</td>'
      + '<td><div style="display:flex;align-items:center;gap:8px">'
      + '<div style="background:#eee;border-radius:10px;height:10px;flex:1"><div style="background:' + couleur + ';height:10px;border-radius:10px;width:' + g.pct + '%"></div></div>'
      + '<strong style="color:' + couleur + ';min-width:36px">' + g.pct + '%</strong></div></td>'
      + '</tr>';
  }).join('');

  // ── RÉPARTITION PAR CRITÈRES (jour) ──────────────────────
  function countBy(field) {
    var map = {};
    allDossiers.forEach(function(d) {
      var v = (d[field] || 'N/A').toUpperCase();
      if (!map[v]) map[v] = { total: 0, traites: 0 };
      map[v].total++; if (d.traite) map[v].traites++;
    });
    return Object.entries(map).sort(function(a,b){ return b[1].total - a[1].total; });
  }

  function renderBars(entries) {
    return entries.map(function(e) {
      var label = e[0]; var s = e[1];
      var pct = s.total > 0 ? Math.round(s.traites / s.total * 100) : 0;
      return '<div style="margin-bottom:10px">'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'
        + '<span style="font-weight:600;font-size:13px">' + label + '</span>'
        + '<span style="font-size:12px;color:#888">' + s.traites + '/' + s.total + ' (' + pct + '%)</span>'
        + '</div>'
        + '<div style="background:#eee;border-radius:8px;height:10px">'
        + '<div style="background:var(--rose);height:10px;border-radius:8px;width:' + pct + '%"></div>'
        + '</div></div>';
    }).join('');
  }

  var byType  = countBy('type');
  var byNat   = countBy('nature');
  var byPf    = countBy('portefeuille');

  // ── STATS HISTORIQUES (mois glissant) ────────────────────
  // Agréger par semaine
  function getWeek(dateStr) {
    var d = new Date(dateStr);
    var jan1 = new Date(d.getFullYear(), 0, 1);
    return 'S' + Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  }
  var weekMap = {};
  histo.forEach(function(h) {
    var wk = getWeek(h.date_journee);
    if (!weekMap[wk]) weekMap[wk] = { assignes: 0, traites: 0 };
    weekMap[wk].assignes += h.nb_assignes;
    weekMap[wk].traites  += h.nb_traites;
  });
  var weekRows = Object.entries(weekMap).slice(0, 8).map(function(e) {
    var pct = e[1].assignes > 0 ? Math.round(e[1].traites / e[1].assignes * 100) : 0;
    return '<tr>'
      + '<td><strong>' + e[0] + '</strong></td>'
      + '<td style="text-align:center">' + e[1].assignes + '</td>'
      + '<td style="text-align:center;color:#27ae60">' + e[1].traites + '</td>'
      + '<td style="text-align:center">' + pct + '%</td>'
      + '</tr>';
  }).join('');

  // Classement mensuel (30 derniers jours)
  var monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  var monthHisto = histo.filter(function(h){ return new Date(h.date_journee) >= monthAgo; });
  var monthGest = {};
  monthHisto.forEach(function(h) {
    if (!monthGest[h.gestionnaire]) monthGest[h.gestionnaire] = { assignes: 0, traites: 0 };
    monthGest[h.gestionnaire].assignes += h.nb_assignes;
    monthGest[h.gestionnaire].traites  += h.nb_traites;
  });
  var monthRows = Object.entries(monthGest).sort(function(a,b){ return b[1].traites - a[1].traites; }).map(function(e, i) {
    var pct = e[1].assignes > 0 ? Math.round(e[1].traites / e[1].assignes * 100) : 0;
    var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.';
    return '<tr>'
      + '<td style="text-align:center">' + medal + '</td>'
      + '<td><strong>' + e[0] + '</strong></td>'
      + '<td style="text-align:center">' + e[1].assignes + '</td>'
      + '<td style="text-align:center;color:#27ae60;font-weight:700">' + e[1].traites + '</td>'
      + '<td style="text-align:center">' + pct + '%</td>'
      + '</tr>';
  }).join('');

  var tpsTxt = tpsMoyenMin > 0
    ? (tpsMoyenMin >= 60 ? Math.floor(tpsMoyenMin/60) + 'h' + (tpsMoyenMin%60) + 'min' : tpsMoyenMin + ' min')
    : '—';

  var html = '<div style="max-width:1100px">'

    // Titre
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'
    + '<h2 style="color:var(--navy);margin:0">📊 Statistiques</h2>'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<span style="font-size:12px;color:#888;background:#f0f4f8;padding:4px 12px;border-radius:12px">📅 ' + new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long'}) + '</span>'
    + (role === 'admin' ? '<button class="btn btn-secondary" style="font-size:12px;padding:4px 14px;color:#e74c3c;border-color:#e74c3c" onclick="resetStats()">🗑️ Réinitialiser les stats</button>' : '')
    + (role === 'admin' ? '<div id="archivage-toggle-zone">⏳ Chargement...</div>' : '')
    + '</div>'
    + '</div>'

    // KPIs du jour
    + '<div class="stats-grid" style="margin-bottom:24px">'
    + '<div class="stat-card"><div class="number">' + total + '</div><div class="label">Total du jour</div></div>'
    + '<div class="stat-card"><div class="number" style="color:#27ae60">' + traites + '</div><div class="label">Traités</div></div>'
    + '<div class="stat-card"><div class="number" style="color:#e67e22">' + enCours + '</div><div class="label">En cours</div></div>'
    + '<div class="stat-card"><div class="number" style="color:var(--rose)">' + tauxGlobal + '%</div><div class="label">Taux global</div></div>'
    + '<div class="stat-card"><div class="number" style="font-size:20px">' + tpsTxt + '</div><div class="label">Temps moyen</div></div>'
    + '<div class="stat-card"><div class="number" style="font-size:16px;color:var(--navy)">' + (topGest ? topGest[0].split(' ')[0] : '—') + '</div><div class="label">🏆 Top du jour</div></div>'
    + '</div>'

    // Classement du jour
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">'
    + '<div class="table-container"><div class="table-toolbar"><h2>🏆 Classement du jour</h2></div>'
    + '<table><thead><tr><th>#</th><th>Gestionnaire</th><th>Assignés</th><th>Traités</th><th>En cours</th><th>Progression</th></tr></thead>'
    + '<tbody>' + (rankRows || '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">Aucun dossier dispatché aujourd&#39;hui</td></tr>') + '</tbody></table></div>'

    // Répartition par critères
    + '<div class="table-container"><div class="table-toolbar"><h2>📋 Répartition du jour</h2>'
    + '<div style="display:flex;gap:6px">'
    + '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="switchCritere(&#39;type&#39;)">Type</button>'
    + '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="switchCritere(&#39;nature&#39;)">Nature</button>'
    + '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="switchCritere(&#39;portefeuille&#39;)">Portefeuille</button>'
    + '</div></div>'
    + '<div style="padding:16px" id="critere-bars">' + renderBars(byType) + '</div></div>'
    + '</div>'

    // Stats historiques
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">'

    // Par semaine
    + '<div class="table-container"><div class="table-toolbar"><h2>📈 Volume par semaine</h2></div>'
    + '<table><thead><tr><th>Semaine</th><th>Assignés</th><th>Traités</th><th>Taux</th></tr></thead>'
    + '<tbody>' + (weekRows || '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">Pas encore de données historiques</td></tr>') + '</tbody></table></div>'

    // Classement mensuel
    + '<div class="table-container"><div class="table-toolbar"><h2>🗓️ Classement 30 derniers jours</h2></div>'
    + '<table><thead><tr><th>#</th><th>Gestionnaire</th><th>Assignés</th><th>Traités</th><th>Taux</th></tr></thead>'
    + '<tbody>' + (monthRows || '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">Pas encore de données historiques</td></tr>') + '</tbody></table></div>'

    + '</div></div>';

  // Stocker les données pour switchCritere
  window._statsByType  = byType;
  window._statsByNat   = byNat;
  window._statsByPf    = byPf;
  window._renderBars   = renderBars;

  document.getElementById('main-content').innerHTML = html;

  // Rendre le bouton toggle archivage
  var toggleZone = document.getElementById('archivage-toggle-zone');
  if (toggleZone) {
    toggleZone.innerHTML = archivageActif
      ? '<button onclick="toggleArchivage(false)" style="display:flex;align-items:center;gap:6px;padding:4px 14px;background:#eafaf1;border:1.5px solid #27ae60;color:#1e8449;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">'
        + '<span style="width:10px;height:10px;border-radius:50%;background:#27ae60;display:inline-block"></span>Archivage ON</button>'
      : '<button onclick="toggleArchivage(true)" style="display:flex;align-items:center;gap:6px;padding:4px 14px;background:#fdf2f8;border:1.5px solid #e74c3c;color:#c0392b;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">'
        + '<span style="width:10px;height:10px;border-radius:50%;background:#e74c3c;display:inline-block"></span>Archivage SUSPENDU</button>';
  }
}

function switchCritere(critere) {
  var data = critere === 'type' ? window._statsByType
           : critere === 'nature' ? window._statsByNat
           : window._statsByPf;
  if (data && window._renderBars) {
    document.getElementById('critere-bars').innerHTML = window._renderBars(data);
  }
}

function resetStats() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'reset-stats-modal';
  modal.innerHTML = '<div class="modal" style="max-width:420px;text-align:center">'
    + '<div style="font-size:48px;margin-bottom:12px">🗑️</div>'
    + '<h2 style="color:#e74c3c">Réinitialiser les stats ?</h2>'
    + '<p style="color:#666;margin:16px 0">Cette action supprime <strong>tout l\'historique</strong> des tables <code>stats_journalieres</code> et <code>historique_sinistres</code> (classement, volumes).<br>⚠️ Cette action est irréversible.</p>'
    + '<div style="display:flex;gap:12px;justify-content:center;margin-top:20px">'
    + '<button class="btn btn-secondary" onclick="closeModal(\'reset-stats-modal\')">Annuler</button>'
    + '<button class="btn btn-primary" style="background:#e74c3c;border-color:#e74c3c" onclick="confirmResetStats()">🗑️ Confirmer la suppression</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

async function confirmResetStats() {
  closeModal('reset-stats-modal');
  // Vider stats_journalieres
  var { error: e1 } = await db.from('stats_journalieres').delete().gte('id', 0);
  if (e1) { showNotif('Erreur stats_journalieres : ' + e1.message, 'error'); return; }
  // Vider aussi historique_sinistres (source du classement 30j et volume semaine)
  var { error: e2 } = await db.from('historique_sinistres').delete().gte('id', 0);
  if (e2) { showNotif('Erreur historique_sinistres : ' + e2.message, 'error'); return; }
  await auditLog('RESET_STATS', 'stats_journalieres + historique_sinistres effacés manuellement');
  showNotif('✅ Historique des stats réinitialisé (classement + volumes inclus) !', 'success');
  renderStats();
}


async function toggleArchivage(activer) {
  var valeur = activer ? 'true' : 'false';
  var label   = activer ? 'activé' : 'suspendu';

  // Upsert dans app_config
  var { error } = await db.from('app_config')
    .upsert({ key: 'archivage_stats', value: valeur }, { onConflict: 'key' });

  if (error) {
    showNotif('Erreur : ' + error.message, 'error');
    return;
  }

  await auditLog(
    activer ? 'ARCHIVAGE_STATS_ON' : 'ARCHIVAGE_STATS_OFF',
    activer ? 'Archivage des stats réactivé' : 'Archivage des stats suspendu (mode test)'
  );

  showNotif(activer ? '✅ Archivage réactivé' : '⏸️ Archivage suspendu', activer ? 'success' : 'info');
  renderStats(); // Rafraîchir pour mettre à jour le bouton
}

// ===== FIN STATS =====

// ===== HISTORIQUE REFERENTS =====
async function toggleHistoriqueActif() {
  var nouvelEtat = !window._historiqueActif;
  var valeur = nouvelEtat ? 'true' : 'false';
  var { error } = await db.from('app_config')
    .upsert({ key: 'historique_actif', value: valeur }, { onConflict: 'key' });
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  window._historiqueActif = nouvelEtat;
  await auditLog(
    nouvelEtat ? 'HISTORIQUE_REFERENT_ON' : 'HISTORIQUE_REFERENT_OFF',
    nouvelEtat ? 'Referent historique active' : 'Referent historique desactive'
  );
  showNotif(nouvelEtat ? '✅ Référent historique activé' : '⏸️ Référent historique désactivé',
            nouvelEtat ? 'success' : 'info');
  renderAttribution();
}

async function changerReferent(refSinistre) {
  await loadAllUsers();
  var gests = (allUsers || []).filter(function(u) {
    return ['gestionnaire', 'manager', 'admin'].includes(u.role);
  });
  var optsHTML = gests.map(function(g) {
    var nom = g.prenom + ' ' + g.nom;
    var cur = window._historiqueMap && window._historiqueMap[refSinistre];
    var sel = cur && cur.gestionnaire === nom ? 'selected' : '';
    return '<option value="' + nom + '" ' + sel + '>' + nom + '</option>';
  }).join('');
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'referent-modal';
  modal.innerHTML = '<div class="modal" style="max-width:400px;text-align:center">'
    + '<h2 style="color:var(--navy)">✏️ Changer le référent</h2>'
    + '<p style="color:#666;margin:12px 0">Réf. sinistre : <strong>' + refSinistre + '</strong></p>'
    + '<select id="sel-new-referent" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:16px">' + optsHTML + '</select>'
    + '<div style="display:flex;gap:10px;justify-content:center">'
    + '<button class="btn btn-secondary" onclick="closeModal(\'referent-modal\')">Annuler</button>'
    + '<button class="btn btn-primary" onclick="confirmerChangementReferent(\'' + refSinistre + '\')">✅ Confirmer</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

async function confirmerChangementReferent(refSinistre) {
  var newGest = document.getElementById('sel-new-referent').value;
  if (!newGest) return;
  var { error } = await db.from('historique_sinistres')
    .update({ gestionnaire: newGest })
    .eq('ref_sinistre', refSinistre);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
  closeModal('referent-modal');
  await auditLog('REFERENT_CHANGE', 'Ref. ' + refSinistre + ' -> ' + newGest);
  showNotif('✅ Référent mis à jour : ' + newGest, 'success');
  renderAttribution();
}
// ===== FIN HISTORIQUE REFERENTS =====