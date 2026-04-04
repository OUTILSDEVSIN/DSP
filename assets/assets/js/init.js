// ===== NOTIF =====

// ===== T10 -- DOSSIER SUPPLÉMENTAIRE =====
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

