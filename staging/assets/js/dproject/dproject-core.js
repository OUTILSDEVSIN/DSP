/* =========================================================
   Dproject — CORE (helpers partagés)
   ---------------------------------------------------------
   Fonctions utilisées par plusieurs onglets (Bugs, Évolutions,
   Tâches, Roadmap). Toute fonction générique (= qui prend un
   paramètre `type` ou qui sert d'helper visuel) vit ici.

   Contenu :
     • Badges : urgence, statut, environnement, zone
     • Gestion fichiers en mémoire (preview avant upload)
     • Upload Supabase Storage + nettoyage des orphelins
     • Modal de détail (générique : bug ET évolution)
     • Modal d'édition (générique)
     • Affichage captures (URLs signées) + lightbox
     • Ajout capture depuis le modal de détail
     • Actions workflow : confirmer étape, sauvegarder, commenter
   ========================================================= */

// ── Helpers HTML : badges ─────────────────────────────────
// ── Helpers HTML ──────────────────────────────────────────
function dpBadgeUrgence(u) {
  var map = {
    'Critique':   {cls:'dp-urg--critique',   label:'Critique'},
    'Majeur':     {cls:'dp-urg--majeur',     label:'Majeur'},
    'Mineur':     {cls:'dp-urg--mineur',     label:'Mineur'},
    'Cosmétique': {cls:'dp-urg--cosmetique', label:'Cosmétique'}
  };
  var s = map[u] || {cls:'dp-urg--cosmetique', label: u||'—'};
  return '<span class="dp-urg '+s.cls+'"><span class="dp-urg__dot"></span>'+s.label+'</span>';
}

function dpBadgeStatut(s) {
  var map = {
    'Nouveau':      'nouveau',
    'En analyse':   'analyse',
    'En correction':'correction',
    'En staging':   'staging',
    'Corrigé':      'corrige'
  };
  var cls = map[s] || 'nouveau';
  return '<span class="dp-pill dp-pill--'+cls+'">'+( s||'—')+'</span>';
}

function dpBadgeEnv(e) {
  if (e === 'PROD')    return '<span class="dp-env-prod">PROD</span>';
  if (e === 'Staging') return '<span class="dp-env-staging">Staging</span>';
  return '<span style="color:var(--ink-400)">—</span>';
}

function dpBadgeZone(z) {
  if (!z) return '<span style="color:var(--ink-400)">—</span>';
  return '<span class="dp-zone">'+z+'</span>';
}

// ── Gestion des fichiers sélectionnés (en mémoire) ───────
window.dpHandleFiles = function(fileList) {
  if (!window._dpSelectedFiles) window._dpSelectedFiles = [];
  var maxFiles = 3;
  var maxSize = 5 * 1024 * 1024; // 5 Mo
  var allowedTypes = ['image/png','image/jpeg','image/jpg','image/webp','image/gif'];

  for (var i = 0; i < fileList.length; i++) {
    var f = fileList[i];
    if (window._dpSelectedFiles.length >= maxFiles) {
      if (typeof showNotif==='function') showNotif('Maximum '+maxFiles+' captures','error');
      break;
    }
    if (allowedTypes.indexOf(f.type) === -1) {
      if (typeof showNotif==='function') showNotif('Format non supporté : '+f.name,'error');
      continue;
    }
    if (f.size > maxSize) {
      if (typeof showNotif==='function') showNotif('Fichier trop volumineux : '+f.name+' (max 5 Mo)','error');
      continue;
    }
    window._dpSelectedFiles.push(f);
  }
  dpRenderThumbs();
};

window.dpRenderThumbs = function() {
  var thumbsContainer = document.getElementById('dp-thumbs');
  var countEl = document.getElementById('dp-upload-count');
  var zone = document.getElementById('dp-upload-zone');
  if (!thumbsContainer) return;

  var files = window._dpSelectedFiles || [];
  thumbsContainer.innerHTML = files.map(function(f, idx){
    var url = URL.createObjectURL(f);
    return '<div class="dp-thumb">' +
      '<img src="'+url+'" alt="'+f.name+'">' +
      '<button class="dp-thumb__remove" onclick="dpRemoveFile('+idx+')">✕</button>' +
      '<div class="dp-thumb__name">'+f.name+'</div>' +
    '</div>';
  }).join('');

  if (countEl) countEl.textContent = files.length+'/3 capture(s) sélectionnée(s)';
  if (zone) {
    if (files.length >= 3) zone.classList.add('is-disabled');
    else zone.classList.remove('is-disabled');
  }
};

window.dpRemoveFile = function(idx) {
  if (!window._dpSelectedFiles) return;
  window._dpSelectedFiles.splice(idx, 1);
  dpRenderThumbs();
};

// ── Upload Supabase Storage + nettoyage orphelins ────────
window.dpNettoyerOrphelins = async function(paths) {
  try {
    if (!paths || !paths.length) return;
    await db.storage.from('bug-screenshots').remove(paths);
  } catch(e) {
    // best-effort, on ne propage pas l'erreur
    console.warn('Nettoyage orphelins échoué:', e);
  }
};

// ── Upload de captures vers Supabase Storage ─────────────
// Reçoit un tableau de Files + le code du bug (ex: BUG-003)
// Retourne un tableau de chemins (ex: ["BUG-003/1747234567-1.png", ...])
window.dpUploadScreenshots = async function(files, bugCode) {
  var paths = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    // Génère un nom unique : timestamp + index + extension
    var ext = (f.name.split('.').pop() || 'png').toLowerCase();
    var fileName = Date.now()+'-'+i+'.'+ext;
    var path = bugCode+'/'+fileName;
    var res = await db.storage.from('bug-screenshots').upload(path, f, {
      cacheControl: '3600',
      upsert: false,
      contentType: f.type
    });
    if (res.error) throw new Error('Upload échoué : '+res.error.message);
    paths.push(path);
  }
  return paths;
};

// ── Modal de détail (générique : bug ET évolution) ───────
window.dpOuvrirDetail = async function(type, id) {
  var existing = document.getElementById('dp-detail-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'dp-detail-modal';
  overlay.className = 'dp-modal-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="dp-modal-box"><div style="text-align:center;padding:40px;color:var(--ink-400)">Chargement…</div></div>';
  document.body.appendChild(overlay);

  try {
    var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
    var res  = await db.from(table).select('*').eq('id',id).single();
    if (!res.data) throw new Error('Introuvable');
    var commRes = await db.from('dsp_commentaires').select('*').eq('ref_type',type).eq('ref_id',id).order('created_at',{ascending:true});
    dpRenderDetailModal(overlay.querySelector('.dp-modal-box'), type, res.data, commRes.data||[]);
  } catch(e) {
    overlay.querySelector('.dp-modal-box').innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose)">Erreur : '+e.message+'</div>';
  }
};

function dpRenderDetailModal(box, type, data, comments) {
  var isBug  = type === 'bug';
  var etapes = isBug
    ? ['Nouveau','En analyse','En correction','En staging','Corrigé']
    : ['Nouvelle','En analyse','Acceptée','En développement','Déployée'];
  var statut  = data.statut || etapes[0];
  var stepIdx = etapes.indexOf(statut);
  var code    = data.code || (isBug ? 'BUG-?' : 'EVOL-?');

  // Ancienneté en jours
  var ageJours = Math.floor((Date.now() - new Date(data.created_at)) / 86400000);
  var ageLabel = ageJours === 0 ? 'Aujourd\'hui' : 'J+'+ageJours;

  // Stepper chips
  var stepperHTML = '<div class="dp-stepper">' +
    etapes.map(function(e,i){
      var state = i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'future';
      var label = state==='done' ? '✓' : String(i+1);
      return '<div class="dp-step dp-step--'+state+'">' +
        '<span class="dp-step__num">'+label+'</span>' +
        '<span class="dp-step__label">'+e+'</span>' +
        (i < etapes.length-1 ? '<span class="dp-step-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>' : '') +
      '</div>';
    }).join('') +
  '</div>';

  // Step-bar — bouton "Confirmer étape suivante"
  var nextEtape = etapes[stepIdx+1];
  var stepBarHTML = nextEtape
    ? '<div class="dp-step-bar">' +
        '<div class="dp-step-bar__left">' +
          '<div class="dp-step-bar__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>' +
          '<div><div class="dp-step-bar__lab">Étape en cours</div><div class="dp-step-bar__val">'+statut+'</div></div>' +
        '</div>' +
        '<button class="dp-btn dp-btn--primary" onclick="dpConfirmerEtape(\''+type+'\','+data.id+',\''+nextEtape+'\')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
          'Confirmer «&nbsp;'+nextEtape+'&nbsp;»' +
        '</button>' +
      '</div>'
    : '<div class="dp-step-bar" style="justify-content:center;color:var(--ok-700);font-weight:700">✅ Terminé</div>';

  // Meta-grid
  var creeLe = data.created_at ? new Date(data.created_at).toLocaleDateString('fr-FR') : '—';
  var echeance = data.date_echeance ? new Date(data.date_echeance).toLocaleDateString('fr-FR') : null;
  var metaHTML = '<div class="dp-meta-grid">' +
    '<div><div class="dp-meta-label">Statut</div>'+dpBadgeStatut(statut)+'</div>' +
    (isBug&&data.urgence ? '<div><div class="dp-meta-label">Urgence</div>'+dpBadgeUrgence(data.urgence)+'</div>' : '') +
    (isBug&&data.zone    ? '<div><div class="dp-meta-label">Zone</div>'+dpBadgeZone(data.zone)+'</div>' : '') +
    (isBug&&data.environnement ? '<div><div class="dp-meta-label">Env.</div>'+dpBadgeEnv(data.environnement)+'</div>' : '') +
    '<div><div class="dp-meta-label">Signalé par</div><div class="dp-meta-value">'+(data.signale_par_nom||'<span class="dp-meta-value--muted">—</span>')+'</div></div>' +
    '<div><div class="dp-meta-label">Créé le</div><div class="dp-meta-value dp-meta-value--mono">'+creeLe+'</div></div>' +
    '<div><div class="dp-meta-label">Ancienneté</div><div class="dp-age">'+ageLabel+'</div></div>' +
    '<div><div class="dp-meta-label">Échéance</div><div class="'+(echeance?'dp-meta-value dp-meta-value--mono':'dp-meta-value--muted')+'">'+(echeance||'—')+'</div></div>' +
  '</div>';

  // Événements/commentaires
  function dpInitiales(nom) {
    if (!nom) return '?';
    var parts = nom.trim().split(' ');
    return (parts[0][0]+(parts[1]?parts[1][0]:'')).toUpperCase();
  }
  var avatarColors = ['#4f63d2','#e5195e','#16a34a','#d97706','#7c3aed'];
  var eventsHTML = comments.length
    ? comments.map(function(c,i){
        var d = new Date(c.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).replace(':','h');
        var color = avatarColors[i % avatarColors.length];
        return '<div class="dp-event">' +
          '<div class="dp-ev-avatar" style="--av-color:'+color+'">'+dpInitiales(c.auteur_nom)+'</div>' +
          '<div class="dp-ev-body">' +
            '<div class="dp-ev-head"><span class="dp-ev-author">'+(c.auteur_nom||'Admin')+'</span><span class="dp-ev-tag">Note</span><span class="dp-ev-time">'+d+'</span></div>' +
            '<p class="dp-ev-text">'+c.contenu+'</p>' +
          '</div>' +
        '</div>';
      }).join('')
    : '<div style="color:var(--ink-400);font-size:13px;text-align:center;padding:16px">Aucun commentaire</div>';

  // Icônes sections
  var icoAvancement = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20V10M9 20V4M15 20v-7M21 20v-3"/></svg>';
  var icoDesc       = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>';
  var icoAdmin      = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82 2 2 0 01-2.83 2.83 1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51A2 2 0 0110 21a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33 2 2 0 01-2.83-2.83 1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1A2 2 0 013 10a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82 2 2 0 012.83-2.83 1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51A2 2 0 0114 3a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33 2 2 0 012.83 2.83 1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1A2 2 0 0121 14a1.65 1.65 0 00-1.51 1z"/></svg>';
  var icoEvents     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  var icoCapture    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  // Section captures (repliable, repliée par défaut)
  var screenshots = data.screenshots || [];
  var nbCaptures = screenshots.length;
  var canAddMore = nbCaptures < 3;
  var chevronCapturesIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var capturesHTML = '<div class="dp-section dp-captures-section" data-open="false">' +
    '<h3 class="dp-section-title" style="display:flex;justify-content:space-between;align-items:center;width:100%" onclick="dpToggleCaptures(this)">' +
      '<span style="display:flex;align-items:center;gap:8px">' +
        '<span class="dp-section-ico">'+icoCapture+'</span>Captures' +
        '<span class="dp-captures-count-pill">'+nbCaptures+'/3</span>' +
        '<span class="dp-captures-toggle-ico">'+chevronCapturesIco+'</span>' +
      '</span>' +
      (canAddMore
        ? '<button class="dp-btn dp-btn--ghost" style="height:28px;font-size:11px;padding:0 10px" onclick="event.stopPropagation();dpAjouterCaptureDetail(\''+type+'\','+data.id+')">+ Ajouter</button>'
        : '') +
    '</h3>' +
    '<div class="dp-captures-content">' +
      (nbCaptures > 0
        ? '<div class="dp-screenshots" id="dp-screenshots-'+data.id+'">' +
            '<div style="grid-column:1/-1;text-align:center;color:var(--ink-400);font-size:12px;padding:8px">Chargement des captures…</div>' +
          '</div>'
        : '<div style="color:var(--ink-400);font-size:13px;text-align:center;padding:16px">Aucune capture jointe</div>') +
    '</div>' +
  '</div>';

  // Si captures présentes : génère les URLs signées et les affiche après injection du HTML
  if (nbCaptures > 0) {
    setTimeout(function(){ dpAfficherCaptures(data.id, screenshots, type); }, 0);
  }

  box.innerHTML =
    // ── Header gradient navy ──
    '<div class="dp-modal-head">' +
      '<div class="dp-modal-head-left">' +
        '<span class="dp-modal-head-type">'+(isBug?'Bug':'Évolution')+'</span>' +
        '<span class="dp-modal-head-sep"></span>' +
        '<span class="dp-modal-head-code">'+code+'</span>' +
      '</div>' +
      '<div class="dp-modal-head-actions">' +
        '<button class="dp-modal-edit" title="Modifier" onclick="dpOuvrirModalEdition(\''+type+'\','+data.id+')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>' +
        '</button>' +
        '<button class="dp-modal-close" onclick="document.getElementById(\'dp-detail-modal\').remove()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +

    // ── Body scrollable ──
    '<div class="dp-modal-body">' +
      '<h2 class="dp-bug-title">'+data.titre+'</h2>' +

      metaHTML +

      // Section description (1ère position)
      (data.description
        ? '<div class="dp-section dp-section--rose">' +
            '<h3 class="dp-section-title dp-section-title--rose"><span class="dp-section-ico">'+icoDesc+'</span>Description</h3>' +
            '<p class="dp-desc">'+data.description+'</p>' +
          '</div>'
        : '') +

      // Section captures (entre description et avancement)
      capturesHTML +

      // Section avancement
      '<div class="dp-section">' +
        '<h3 class="dp-section-title"><span class="dp-section-ico">'+icoAvancement+'</span>Avancement</h3>' +
        stepperHTML +
        stepBarHTML +
      '</div>' +

      // Section événements (3ème position)
      '<div class="dp-section">' +
        '<h3 class="dp-section-title dp-section-title--ok"><span class="dp-section-ico">'+icoEvents+'</span>Événements ('+comments.length+')</h3>' +
        '<div class="dp-events">'+eventsHTML+'</div>' +
      '</div>' +

    '</div>' +

    // ── Composer footer ──
    '<div class="dp-composer">' +
      '<input id="dp-det-new-comment" placeholder="Consigner un événement (ex. relance par e-mail)…" onkeydown="if(event.key===\'Enter\') dpAjouterCommentaire(\''+type+'\','+data.id+')">' +
      '<button class="dp-btn dp-btn--primary" onclick="dpAjouterCommentaire(\''+type+'\','+data.id+')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' +
        'Ajouter' +
      '</button>' +
    '</div>';
}

// ── Toggle section captures (repliable) ─────────────────
window.dpToggleCaptures = function(headerEl) {
  var section = headerEl.closest('.dp-captures-section');
  if (!section) return;
  var isOpen = section.getAttribute('data-open') === 'true';
  section.setAttribute('data-open', isOpen ? 'false' : 'true');
};

// ── Modal d'édition (générique) ──────────────────────────
window.dpOuvrirModalEdition = async function(type, id) {
  // Récupérer les données actuelles pour pré-remplir
  var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  var res = await db.from(table).select('*').eq('id',id).single();
  if (!res.data) {
    if (typeof showNotif==='function') showNotif('Élément introuvable','error');
    return;
  }
  var data = res.data;
  var isBug = type === 'bug';

  // Supprimer un overlay éventuel existant
  var existing = document.getElementById('dp-edit-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'dp-edit-modal-overlay';
  overlay.className = 'dp-edit-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  // Options urgence (bug uniquement)
  var urgenceOptions = ['Critique','Majeur','Mineur','Cosmétique'].map(function(u){
    return '<option'+(u===data.urgence?' selected':'')+'>'+u+'</option>';
  }).join('');

  // Options zone
  var zones = ['Dispatch','Dplane','Dvol','Mes dossiers','Auth','Autre'];
  var zoneOptions = zones.map(function(z){
    return '<option'+(z===data.zone?' selected':'')+'>'+z+'</option>';
  }).join('');

  overlay.innerHTML =
    '<div class="dp-edit-modal" onclick="event.stopPropagation()">' +
      '<div class="dp-edit-modal__head">' +
        '<span class="dp-edit-modal__title">Modifier '+(isBug?'le bug':'l\'évolution')+'</span>' +
        '<button class="dp-modal-close" onclick="document.getElementById(\'dp-edit-modal-overlay\').remove()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="dp-edit-modal__body">' +
        (isBug
          ? '<div class="dp-form-row">' +
              '<div class="dp-field">' +
                '<label class="dp-form-label" for="dp-edit-urgence">Urgence</label>' +
                '<select id="dp-edit-urgence">'+urgenceOptions+'</select>' +
              '</div>' +
              '<div class="dp-field">' +
                '<label class="dp-form-label" for="dp-edit-echeance">Échéance</label>' +
                '<input id="dp-edit-echeance" type="date" value="'+(data.date_echeance||'')+'">' +
              '</div>' +
            '</div>'
          : '<div class="dp-form-row dp-form-row--full">' +
              '<div class="dp-field">' +
                '<label class="dp-form-label" for="dp-edit-echeance">Échéance</label>' +
                '<input id="dp-edit-echeance" type="date" value="'+(data.date_echeance||'')+'">' +
              '</div>' +
            '</div>'
        ) +
        '<div class="dp-form-row dp-form-row--full">' +
          '<div class="dp-field">' +
            '<label class="dp-form-label" for="dp-edit-zone">Zone</label>' +
            '<select id="dp-edit-zone">'+zoneOptions+'</select>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dp-edit-modal__foot">' +
        '<button class="dp-btn dp-btn--ghost" onclick="document.getElementById(\'dp-edit-modal-overlay\').remove()">Annuler</button>' +
        '<button class="dp-btn dp-btn--primary" onclick="dpEnregistrerEdition(\''+type+'\','+id+')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
          'Enregistrer' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
};

window.dpEnregistrerEdition = async function(type, id) {
  var isBug = type === 'bug';
  var table = isBug ? 'dsp_bugs' : 'dsp_evolutions';

  var urgEl = document.getElementById('dp-edit-urgence');
  var echEl = document.getElementById('dp-edit-echeance');
  var zoneEl = document.getElementById('dp-edit-zone');

  var payload = {};
  if (isBug && urgEl) payload.urgence = urgEl.value;
  if (echEl && echEl.value) payload.date_echeance = echEl.value;
  if (zoneEl) payload.zone = zoneEl.value;

  try {
    var res = await db.from(table).update(payload).eq('id',id);
    if (res.error) throw res.error;
    if (typeof showNotif==='function') showNotif('✅ Modifications enregistrées','success');
    // Fermer le modal d'édition et rafraîchir le modal de détail
    var overlay = document.getElementById('dp-edit-modal-overlay');
    if (overlay) overlay.remove();
    dpOuvrirDetail(type, id);
    dpRenderBugs();
    dpLoadStats();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

// ── Affichage captures (URLs signées) + lightbox ─────────
window.dpAfficherCaptures = async function(bugId, paths, type) {
  var container = document.getElementById('dp-screenshots-'+bugId);
  if (!container) return;
  try {
    // Génère les URLs signées (valables 1h)
    var signedUrls = [];
    for (var i = 0; i < paths.length; i++) {
      var res = await db.storage.from('bug-screenshots').createSignedUrl(paths[i], 3600);
      if (res.error) {
        signedUrls.push(null);
      } else {
        signedUrls.push(res.data.signedUrl);
      }
    }
    container.innerHTML = signedUrls.map(function(url, idx){
      if (!url) {
        return '<div class="dp-screenshot-thumb" style="cursor:default;color:var(--ink-400);font-size:11px">⚠ Erreur</div>';
      }
      // On encode le path en base64 pour le passer dans onclick sans souci de quotes
      var safePath = btoa(paths[idx]);
      return '<div class="dp-screenshot-thumb" onclick="dpOuvrirLightbox(\''+url+'\')" title="Cliquer pour agrandir">' +
        '<img src="'+url+'" alt="capture '+(idx+1)+'">' +
      '</div>';
    }).join('');
  } catch(e) {
    container.innerHTML = '<div style="grid-column:1/-1;color:var(--rose);font-size:12px;text-align:center;padding:8px">Erreur de chargement : '+e.message+'</div>';
  }
};

// ── Lightbox (image en grand) ────────────────────────────
window.dpOuvrirLightbox = function(url) {
  var existing = document.getElementById('dp-lightbox');
  if (existing) existing.remove();
  var lb = document.createElement('div');
  lb.id = 'dp-lightbox';
  lb.className = 'dp-lightbox';
  lb.onclick = function(){ lb.remove(); };
  lb.innerHTML = '<button class="dp-lightbox__close" onclick="event.stopPropagation();document.getElementById(\'dp-lightbox\').remove()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button><img src="'+url+'" alt="capture">';
  document.body.appendChild(lb);
};

// ── Ajout d'une capture depuis le modal de détail ────────
window.dpAjouterCaptureDetail = async function(type, id) {
  // Sélection d'un fichier via input
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
  input.style.display = 'none';
  input.onchange = async function(e) {
    var f = e.target.files[0];
    if (!f) return;

    // Validations
    var maxSize = 5 * 1024 * 1024;
    var allowedTypes = ['image/png','image/jpeg','image/jpg','image/webp','image/gif'];
    if (allowedTypes.indexOf(f.type) === -1) {
      if (typeof showNotif==='function') showNotif('Format non supporté','error');
      return;
    }
    if (f.size > maxSize) {
      if (typeof showNotif==='function') showNotif('Fichier trop volumineux (max 5 Mo)','error');
      return;
    }

    try {
      // Récupérer les captures existantes pour vérifier la limite
      var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
      var res = await db.from(table).select('code, screenshots').eq('id', id).single();
      if (res.error) throw res.error;
      var current = res.data.screenshots || [];
      if (current.length >= 3) {
        if (typeof showNotif==='function') showNotif('Limite de 3 captures atteinte','error');
        return;
      }
      var code = res.data.code;

      // Upload
      if (typeof showNotif==='function') showNotif('Upload en cours…','info');
      var paths = await dpUploadScreenshots([f], code);
      var updated = current.concat(paths);

      // Sauvegarde dans la DB
      var updateRes = await db.from(table).update({screenshots: updated}).eq('id', id);
      if (updateRes.error) throw updateRes.error;

      if (typeof showNotif==='function') showNotif('✅ Capture ajoutée','success');
      dpOuvrirDetail(type, id); // refresh
    } catch(e) {
      if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
    }
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(function(){ input.remove(); }, 1000);
};

// ── Actions workflow : confirmer / sauvegarder / commenter ─
window.dpConfirmerEtape = async function(type, id, nouveauStatut) {
  var table = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  try {
    var res = await db.from(table).update({statut: nouveauStatut}).eq('id',id);
    if (res.error) throw res.error;
    if (typeof showNotif==='function') showNotif('✅ Statut → '+nouveauStatut,'success');
    dpOuvrirDetail(type, id);
    dpLoadStats();
    dpLoadAQualifier();
    dpRenderBugs();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

window.dpSauvegarderDetail = async function(type, id) {
  var echeance  = (document.getElementById('dp-det-echeance')         ||{}).value||null;
  var urgence   = (document.getElementById('dp-det-urgence')          ||{}).value||null;
  var commAdmin = (document.getElementById('dp-det-commentaire-admin')||{}).value||null;
  var table  = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  var payload = {};
  if (echeance) payload.date_echeance = echeance;
  if (urgence && urgence !== '' && urgence !== '—') payload.urgence = urgence;
  if (commAdmin !== null && type==='evolution') payload.commentaire_admin = commAdmin;
  if (!Object.keys(payload).length) { if (typeof showNotif==='function') showNotif('Rien à mettre à jour','info'); return; }
  try {
    var res = await db.from(table).update(payload).eq('id',id);
    if (res.error) throw res.error;
    if (typeof showNotif==='function') showNotif('✅ Mis à jour !','success');
    dpOuvrirDetail(type, id);
    dpLoadStats();
    dpRenderBugs();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

window.dpAjouterCommentaire = async function(type, id) {
  var input   = document.getElementById('dp-det-new-comment');
  var contenu = (input||{}).value||'';
  if (!contenu.trim()) return;
  try {
    await db.from('dsp_commentaires').insert({
      ref_type: type, ref_id: id, contenu: contenu.trim(),
      auteur_id:  currentUser     ? currentUser.id : null,
      auteur_nom: currentUserData ? (currentUserData.prenom+' '+currentUserData.nom) : 'Admin'
    });
    if (input) input.value = '';
    dpOuvrirDetail(type, id);
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};
