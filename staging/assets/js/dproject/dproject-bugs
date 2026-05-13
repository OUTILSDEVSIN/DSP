/* =========================================================
   Dproject — BUGS (logique onglet Bugs)
   ---------------------------------------------------------
   Tout ce qui est SPÉCIFIQUE à l'onglet Bugs :
     • Chargement et affichage de la liste
     • Filtre par statut
     • Rendu du tableau (avec colonne "Signalé par" + avatars)
     • Modal "Signaler un bug" (formulaire complet)
     • Soumission du signalement (avec upload captures)

   Dépend de : dproject-core.js (badges, upload, modals…)
   ========================================================= */

// ── Liste des bugs (état interne) ─────────────────────────
var _dpBugsData = [];

window.dpRenderBugs = async function() {
  var panel = document.getElementById('dp-tab-bugs');
  if (!panel) return;

  panel.innerHTML = '<div class="dp-card">' +
    '<div class="dp-card__head">' +
      '<div><h3 class="dp-card__title">Bugs</h3><div class="dp-card__sub">Signalements en cours · qualifiés par niveau d\'urgence</div></div>' +
      '<div class="dp-toolbar">' +
        '<div class="dp-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="dp-bugs-search" placeholder="Rechercher…" oninput="dpFilterBugs()"></div>' +
        '<select class="dp-select" id="dp-bugs-urgence" onchange="dpFilterBugs()"><option value="">Toute urgence</option><option>Critique</option><option>Majeur</option><option>Mineur</option><option>Cosmétique</option></select>' +
        '<select class="dp-select" id="dp-bugs-env" onchange="dpFilterBugs()"><option value="">Tous environnements</option><option>PROD</option><option>Staging</option></select>' +
        '<button class="dp-btn dp-btn--rose" onclick="dpOuvrirFormulaireSignaler()">+ Signaler un bug</button>' +
      '</div>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table class="dp-t">' +
        '<thead><tr><th>ID</th><th>Titre</th><th>Urgence</th><th>Zone</th><th>Env.</th><th>Statut</th><th>Signalé par</th></tr></thead>' +
        '<tbody id="dp-bugs-tbody"><tr><td colspan="7" style="text-align:center;padding:40px;color:var(--ink-400)">Chargement…</td></tr></tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  try {
    var res = await db.from('dsp_bugs').select('*').order('created_at',{ascending:false});
    _dpBugsData = res.data || [];
    dpRenderBugsTable(_dpBugsData);
  } catch(e) {
    var tbody = document.getElementById('dp-bugs-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--rose)">Erreur de chargement</td></tr>';
  }
};

window.dpFilterBugs = function() {
  var s = (document.getElementById('dp-bugs-search') ||{}).value || '';
  var u = (document.getElementById('dp-bugs-urgence')||{}).value || '';
  var e = (document.getElementById('dp-bugs-env')    ||{}).value || '';
  var st= (document.getElementById('dp-bugs-statut') ||{}).value || '';
  dpRenderBugsTable(_dpBugsData.filter(function(b){
    return (!s  || (b.titre||'').toLowerCase().includes(s.toLowerCase())) &&
           (!u  || b.urgence === u) &&
           (!e  || b.environnement === e) &&
           (!st || b.statut === st);
  }));
};

function dpRenderBugsTable(bugs) {
  var tbody = document.getElementById('dp-bugs-tbody');
  if (!tbody) return;
  if (!bugs.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--ink-400)">Aucun bug trouvé</td></tr>';
    return;
  }
  // Palette de couleurs stables pour les avatars (déterministe : même nom = même couleur)
  var avatarColors = ['#4f63d2','#be3a4c','#0e6b70','#128087','#5b3bb8','#d97706','#16a34a','#9333ea'];
  function dpAvatar(nom) {
    if (!nom) return '<span style="color:var(--ink-400);font-size:12px">—</span>';
    var parts = nom.trim().split(/\s+/);
    var initiales = (parts[0]||'').charAt(0).toUpperCase() + (parts[1]||'').charAt(0).toUpperCase();
    if (!initiales) initiales = nom.charAt(0).toUpperCase();
    var idx = 0;
    for (var i=0; i<nom.length; i++) idx += nom.charCodeAt(i);
    var color = avatarColors[idx % avatarColors.length];
    var avStyle = 'display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:'+color+';color:#fff;font-size:10.5px;font-weight:600;flex-shrink:0';
    var wrapStyle = 'display:inline-flex;align-items:center;gap:8px';
    var nameStyle = 'font-size:12.5px;color:var(--ink-900)';
    return '<div style="'+wrapStyle+'"><span style="'+avStyle+'">'+initiales+'</span><span style="'+nameStyle+'">'+nom+'</span></div>';
  }
  tbody.innerHTML = bugs.map(function(b) {
    return '<tr onclick="dpOuvrirDetail(\'bug\','+b.id+')">' +
      '<td><span class="dp-ref dp-ref--bug">'+(b.code||'BUG-?')+'</span></td>' +
      '<td><div class="dp-title-cell">'+b.titre+'</div>'+(b.description?'<div class="dp-desc" style="border:none;background:none;padding:0;font-size:11.5px;color:var(--ink-500);margin-top:2px;line-height:1.4">'+b.description.substring(0,70)+'…</div>':'')+'</td>' +
      '<td>'+dpBadgeUrgence(b.urgence)+'</td>' +
      '<td>'+dpBadgeZone(b.zone)+'</td>' +
      '<td>'+dpBadgeEnv(b.environnement)+'</td>' +
      '<td>'+dpBadgeStatut(b.statut)+'</td>' +
      '<td>'+dpAvatar(b.signale_par_nom)+'</td>' +
    '</tr>';
  }).join('');
}

// ── Modal : signaler un bug ──────────────────────────────
window.dpOuvrirFormulaireSignaler = function() {
  var existing = document.getElementById('dp-signaler-modal');
  if (existing) existing.remove();

  // Reset du tableau de fichiers sélectionnés (en mémoire, pas encore uploadés)
  window._dpSelectedFiles = [];

  var overlay = document.createElement('div');
  overlay.id = 'dp-signaler-modal';
  overlay.className = 'dp-modal-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="dp-modal-box">' +
      '<div class="dp-modal-head">' +
        '<div><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.65);font-family:monospace;letter-spacing:.04em">NOUVEAU BUG</div>' +
        '<h2 style="font-size:17px;font-weight:700;color:#fff;margin:4px 0 0">Signaler un bug</h2></div>' +
        '<button class="dp-modal-close" onclick="document.getElementById(\'dp-signaler-modal\').remove()">✕</button>' +
      '</div>' +
      '<div class="dp-modal-body">' +

        '<div><label class="dp-form-label">Titre *</label>' +
        '<input class="dp-form-input" id="dp-sig-titre" placeholder="Ex : Le bouton Valider ne répond pas…"></div>' +

        '<div><label class="dp-form-label">Description — ce qui se passe / ce qui était attendu</label>' +
        '<textarea class="dp-form-input" id="dp-sig-desc" rows="3" placeholder="Décris le problème et ce que tu attendais…" style="resize:vertical"></textarea></div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<div><label class="dp-form-label">Zone concernée</label>' +
          '<select class="dp-form-select" id="dp-sig-zone"><option>Dispatch</option><option>Dplane</option><option>Dvol</option><option>Mes dossiers</option><option>Auth</option><option>Autre</option></select></div>' +

          '<div><label class="dp-form-label">Environnement</label>' +
          '<select class="dp-form-select" id="dp-sig-env"><option>PROD</option><option>Staging</option></select></div>' +
        '</div>' +

        '<div><label class="dp-form-label">Captures d\'écran (optionnel · 3 max · 5 Mo/fichier)</label>' +
          '<div class="dp-upload-zone" id="dp-upload-zone" onclick="document.getElementById(\'dp-sig-file-input\').click()">' +
            '<div class="dp-upload-ico">📷</div>' +
            '<div class="dp-upload-title">Cliquer ou glisser-déposer</div>' +
            '<div class="dp-upload-hint">PNG, JPG, JPEG, WebP, GIF</div>' +
            '<div class="dp-upload-count" id="dp-upload-count">0/3 capture(s) sélectionnée(s)</div>' +
          '</div>' +
          '<input type="file" id="dp-sig-file-input" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" multiple style="display:none">' +
          '<div class="dp-thumbs" id="dp-thumbs"></div>' +
        '</div>' +

        '<div><label class="dp-form-label">Niveau d\'urgence *</label>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px" id="dp-sig-urgence-grid">' +
          ['Critique','Majeur','Mineur','Cosmétique'].map(function(u,i){
            var colors = ['#dc2626','#ea580c','#eab308','#3b82f6'];
            return '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;border:1px solid var(--ink-200);background:#fff;cursor:pointer;font-size:12.5px;font-weight:600" class="dp-urg-opt-label">' +
              '<input type="radio" name="dp-sig-u" value="'+u+'" style="display:none"'+(i===2?' checked':'')+'>'+
              '<span style="width:10px;height:10px;border-radius:50%;background:'+colors[i]+';flex-shrink:0"></span>'+u+
            '</label>';
          }).join('') +
        '</div></div>' +

        '<div style="display:flex;justify-content:flex-end;gap:10px;padding-top:4px;border-top:1px solid var(--ink-100)">' +
          '<button class="dp-btn dp-btn--ghost" onclick="document.getElementById(\'dp-signaler-modal\').remove()">Annuler</button>' +
          '<button class="dp-btn dp-btn--rose" id="dp-sig-submit" onclick="dpSoumettreSignalement()">Soumettre le bug</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  // Style sélection urgence
  overlay.querySelectorAll('.dp-urg-opt-label').forEach(function(lbl){
    var radio = lbl.querySelector('input[type=radio]');
    if (radio && radio.checked) lbl.style.cssText += ';border-color:var(--rose);background:#fff7fa';
    lbl.addEventListener('click', function(){
      overlay.querySelectorAll('.dp-urg-opt-label').forEach(function(l){ l.style.borderColor='var(--ink-200)'; l.style.background='#fff'; });
      lbl.style.borderColor='var(--rose)'; lbl.style.background='#fff7fa';
    });
  });

  // Setup upload : input file + drag&drop
  var fileInput = document.getElementById('dp-sig-file-input');
  var uploadZone = document.getElementById('dp-upload-zone');
  fileInput.addEventListener('change', function(e){ dpHandleFiles(e.target.files); });
  uploadZone.addEventListener('dragover', function(e){
    e.preventDefault();
    uploadZone.classList.add('is-dragover');
  });
  uploadZone.addEventListener('dragleave', function(){
    uploadZone.classList.remove('is-dragover');
  });
  uploadZone.addEventListener('drop', function(e){
    e.preventDefault();
    uploadZone.classList.remove('is-dragover');
    dpHandleFiles(e.dataTransfer.files);
  });
};

// ── Soumission du signalement ────────────────────────────
window.dpSoumettreSignalement = async function() {
  var titre = (document.getElementById('dp-sig-titre')||{}).value||'';
  var desc  = (document.getElementById('dp-sig-desc') ||{}).value||'';
  var zone  = (document.getElementById('dp-sig-zone') ||{}).value||'';
  var env   = (document.getElementById('dp-sig-env')  ||{}).value||'';
  var urgEl = document.querySelector('input[name="dp-sig-u"]:checked');
  var urgence = urgEl ? urgEl.value : 'Mineur';

  if (!titre.trim()) {
    if (typeof showNotif==='function') showNotif('Le titre est obligatoire','error');
    return;
  }

  // NOTE: La colonne `code` est GENERATED ALWAYS par Postgres
  // ('BUG-' || lpad(id, 3, '0')). On NE DOIT PAS l'inclure dans l'INSERT.
  var payload = {
    titre: titre.trim(),
    description: desc.trim()||null,
    zone: zone,
    environnement: env,
    urgence: urgence,
    statut: 'Nouveau',
    signale_par: currentUser ? currentUser.id : null,
    signale_par_nom: currentUserData ? (currentUserData.prenom+' '+currentUserData.nom) : 'Admin'
  };

  // Désactiver le bouton pendant le processus
  var submitBtn = document.getElementById('dp-sig-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.pointerEvents = 'none';
    submitBtn.textContent = 'Envoi en cours…';
  }

  try {
    // ── ÉTAPE 1 : INSERT du bug (Postgres génère le code automatiquement) ──
    var insertRes = await db.from('dsp_bugs').insert(payload).select('id, code').single();
    if (insertRes.error) throw insertRes.error;
    var newBug = insertRes.data;
    var bugCode = newBug.code; // ex: "BUG-003" (généré par Postgres)
    var bugId = newBug.id;

    // ── ÉTAPE 2 : Upload des captures (si présentes) ──
    var files = window._dpSelectedFiles || [];
    var uploadedPaths = [];
    var uploadError = null;
    if (files.length > 0) {
      try {
        uploadedPaths = await dpUploadScreenshots(files, bugCode);
      } catch(uploadErr) {
        uploadError = uploadErr;
      }
    }

    // ── ÉTAPE 3 : UPDATE du bug pour ajouter les chemins (si upload OK) ──
    if (uploadedPaths.length > 0) {
      var updRes = await db.from('dsp_bugs').update({screenshots: uploadedPaths}).eq('id', bugId);
      if (updRes.error) {
        // Le bug est créé mais on n'a pas pu attacher les captures
        // → on les retire du bucket pour éviter les orphelins
        await dpNettoyerOrphelins(uploadedPaths);
        throw new Error('Bug créé mais erreur attachement captures : '+updRes.error.message);
      }
    }

    // ── Fin : succès (avec ou sans warning upload) ──
    document.getElementById('dp-signaler-modal').remove();
    window._dpSelectedFiles = []; // reset
    if (uploadError) {
      if (typeof showNotif==='function') {
        showNotif('Bug '+bugCode+' créé, mais erreur upload capture : '+uploadError.message,'warning');
      }
    } else {
      if (typeof showNotif==='function') showNotif('✅ Bug '+bugCode+' signalé !','success');
    }
    dpRenderBugs();
    dpLoadStats();
    if (typeof dpLoadAQualifier==='function') dpLoadAQualifier();
  } catch(e) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.pointerEvents = 'auto';
      submitBtn.textContent = 'Soumettre le bug';
    }
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};
