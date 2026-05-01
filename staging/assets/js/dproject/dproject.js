/* =========================================================
   Dproject — Module gestion projet DSP
   v2.2 — Aligné Dispatchis Design System (charte officielle)
   ─────────────────────────────────────────────────────────
   Onglet Bugs : ✅ fonctionnel
   Onglets Évolutions / Tâches / Roadmap : 🔜 à venir

   ── Changements vs v2.1 ──
   1. Tous les tokens CSS sont redéfinis dans le scope
      #dproject-content avec les VALEURS de la charte
      (pastel-blue, navy, rose, ombres cool-tinted).
      Les noms de variables restent identiques pour ne PAS
      casser le JS qui les référence.
   2. Onglets : pill navy → soulignement rose (charte).
   3. KPI numbers : 22px noir → 28px rose 800 tabular (charte).
   4. Boutons : dégradés → couleurs flat (charte).
   5. Focus inputs : rose → cobalt --brand-500 (charte).
   6. Ombres : neutres → cool-tinted rgba(27,52,97,…) (charte).
   7. Logique JS : INCHANGÉE — refactor purement visuel.

   ── Pourquoi v2.1 (= refactor JS) reste en place ──
   La v2.1 sortait le JS du innerHTML pour qu'il s'exécute.
   On garde cette structure ici, on ne refait que la couche
   visuelle.
   ========================================================= */

/* =========================================================
   ENTRÉE DU MODULE
   ========================================================= */
function dprojectInit() {
  dprojectRender();
}

/* =========================================================
   HELPERS HTML — disponibles globalement
   ========================================================= */

function dpKpiCard(color, iconPath, label, value, sub) {
  return '<div class="dp-kpi"><div class="dp-kpi__ico dp-kpi__ico--'+color+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+iconPath+'</svg></div><div><div class="dp-kpi__label">'+label+'</div><div class="dp-kpi__value">'+value+'</div>'+(sub?'<div class="dp-kpi__sub">'+sub+'</div>':'')+'</div></div>';
}

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

function dpAnciennete(createdAt) {
  if (!createdAt) return '—';
  var diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000*60*60*24));
  return 'J+' + diff;
}

function dpInitials(nom) {
  if (!nom) return '?';
  var parts = String(nom).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

// Couleur stable par personne (charte: "color is per-person, kept stable")
function dpAvatarColor(nom) {
  if (!nom) return '#9aa6ba';
  var palette = ['#1B3461','#4A7EC7','#3463aa','#16a34a','#d97706','#7c3aed','#0891b2','#e5195e'];
  var hash = 0;
  for (var i = 0; i < nom.length; i++) hash = (hash * 31 + nom.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function dpFmtDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
}

function dpFmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}



/* =========================================================
   ÉTAT DU MODULE
   ========================================================= */
var _dpBugsData = [];

/* =========================================================
   TABS
   ========================================================= */
window.dpSwitchTab = function(tab) {
  document.querySelectorAll('#dproject-content .dp-tabs button').forEach(function(b){
    b.classList.toggle('is-active', b.dataset.tab === tab);
  });
  document.querySelectorAll('#dproject-content .dp-tab-panel').forEach(function(p){
    p.classList.toggle('is-active', p.id === 'dp-tab-'+tab);
  });
  if (tab === 'bugs') dpRenderBugs();
};

/* =========================================================
   KPIs
   ========================================================= */
async function dpLoadStats() {
  try {
    var results = await Promise.all([
      db.from('dsp_bugs').select('id,urgence,statut'),
      db.from('dsp_evolutions').select('id,statut'),
      db.from('dsp_taches').select('id,statut')
    ]);
    var bugs   = results[0].data || [];
    var evols  = results[1].data || [];
    var taches = results[2].data || [];

    var bugsActifs    = bugs.filter(function(b){ return b.statut !== 'Corrigé'; });
    var evolsActives  = evols.filter(function(e){ return !['Déployée','Refusée'].includes(e.statut); });
    var tachesActives = taches.filter(function(t){ return t.statut !== 'Terminé'; });
    var critiques     = bugsActifs.filter(function(b){ return b.urgence === 'Critique'; }).length;

    var grid = document.getElementById('dp-kpis');
    if (grid) grid.innerHTML =
      dpKpiCard('rose','<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>','TÂCHES ACTIVES', tachesActives.length, '') +
      dpKpiCard('blue','<path d="M12 3v18M3 12h18"/>','ÉVOLUTIONS OUVERTES', evolsActives.length, '') +
      dpKpiCard('warn','<path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/>','BUGS À TRAITER', bugsActifs.length, critiques ? critiques+' critiques' : '') +
      dpKpiCard('ok','<path d="M20 6L9 17l-5-5"/>','LIVRÉS CE TRIMESTRE', '—', '');

    var countEl = document.getElementById('dp-count-bugs');
    if (countEl) countEl.textContent = bugsActifs.length;

  } catch(e) { console.warn('dpLoadStats:', e); }
}

/* =========================================================
   À QUALIFIER (bannière haut de page)
   ========================================================= */
async function dpLoadAQualifier() {
  var zone = document.getElementById('dp-a-qualifier-zone');
  if (!zone) return;
  try {
    var results = await Promise.all([
      db.from('dsp_bugs').select('*').eq('statut','Nouveau').order('created_at',{ascending:false}),
      db.from('dsp_evolutions').select('*').eq('statut','Nouvelle').order('created_at',{ascending:false})
    ]);
    var items = [
      ...(results[0].data||[]).map(function(b){ return Object.assign({},b,{_type:'bug'}); }),
      ...(results[1].data||[]).map(function(e){ return Object.assign({},e,{_type:'evolution'}); })
    ].sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });

    if (!items.length) { zone.innerHTML = ''; return; }

    zone.innerHTML = '<div class="dp-qualifier-banner">' +
      '<div class="dp-qualifier-banner__head">' +
        '<span style="font-size:18px">🔔</span>' +
        '<span style="font-size:14px;font-weight:800;color:var(--warn-700)">À qualifier</span>' +
        '<span class="dp-qualifier-count">'+items.length+'</span>' +
        '<span style="font-size:12px;color:var(--ink-400)">nouvelles demandes en attente</span>' +
      '</div>' +
      items.map(function(item) {
        var code = item.code || (item._type==='bug' ? 'BUG-???' : 'EVOL-???');
        var icon = item._type==='bug' ? '🐛' : '💡';
        var date = new Date(item.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
        return '<div class="dp-qualifier-item" onclick="dpOuvrirDetail(\''+item._type+'\','+item.id+')">' +
          '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
            '<span style="font-size:16px">'+icon+'</span>' +
            '<div><div style="font-weight:700;font-size:13px;color:var(--ink-900)">'+item.titre+'</div>' +
            '<div style="font-size:11px;color:var(--ink-400)">'+code+' · '+date+'</div></div>' +
          '</div>' +
          '<span class="dp-qualifier-badge">Qualifier →</span>' +
        '</div>';
      }).join('') +
    '</div>';
  } catch(e) { console.warn('dpLoadAQualifier:', e); }
}

/* =========================================================
   ONGLET BUGS
   ========================================================= */
window.dpRenderBugs = async function() {
  var panel = document.getElementById('dp-tab-bugs');
  if (!panel) return;

  panel.innerHTML = '<div class="dp-card">' +
    '<div class="dp-card__head">' +
      '<div><h3 class="dp-card__title">Bugs</h3><div class="dp-card__sub">Signalements en cours · qualifiés par niveau d\'urgence</div></div>' +
      '<div class="dp-toolbar">' +
        '<div class="dp-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="dp-bugs-search" placeholder="Rechercher…" oninput="dpFilterBugs()"></div>' +
        '<select class="dp-select" id="dp-bugs-urgence" onchange="dpFilterBugs()"><option value="">Toute urgence</option><option>Critique</option><option>Majeur</option><option>Mineur</option><option>Cosmétique</option></select>' +
        '<select class="dp-select" id="dp-bugs-env" onchange="dpFilterBugs()"><option value="">Tous env.</option><option>PROD</option><option>Staging</option></select>' +
        '<select class="dp-select" id="dp-bugs-statut" onchange="dpFilterBugs()"><option value="">Tous statuts</option><option>Nouveau</option><option>En analyse</option><option>En correction</option><option>En staging</option><option>Corrigé</option></select>' +
        '<button class="dp-btn dp-btn--rose" onclick="dpOuvrirFormulaireSignaler()">+ Signaler un bug</button>' +
      '</div>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table class="dp-t">' +
        '<thead><tr><th>ID</th><th>Titre</th><th>Urgence</th><th>Zone</th><th>Env.</th><th>Statut</th></tr></thead>' +
        '<tbody id="dp-bugs-tbody"><tr><td colspan="6" style="text-align:center;padding:40px;color:var(--ink-400)">Chargement…</td></tr></tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  try {
    var res = await db.from('dsp_bugs').select('*').order('created_at',{ascending:false});
    _dpBugsData = res.data || [];
    dpRenderBugsTable(_dpBugsData);
  } catch(e) {
    var tbody = document.getElementById('dp-bugs-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--rose)">Erreur de chargement</td></tr>';
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
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--ink-400)">Aucun bug trouvé</td></tr>';
    return;
  }
  tbody.innerHTML = bugs.map(function(b) {
    return '<tr onclick="dpOuvrirDetail(\'bug\','+b.id+')">' +
      '<td><span class="dp-ref dp-ref--bug">'+(b.code||'BUG-?')+'</span></td>' +
      '<td><div class="dp-title-cell">'+b.titre+'</div>'+(b.description?'<div class="dp-desc">'+b.description.substring(0,70)+'…</div>':'')+'</td>' +
      '<td>'+dpBadgeUrgence(b.urgence)+'</td>' +
      '<td>'+dpBadgeZone(b.zone)+'</td>' +
      '<td>'+dpBadgeEnv(b.environnement)+'</td>' +
      '<td>'+dpBadgeStatut(b.statut)+'</td>' +
    '</tr>';
  }).join('');
}

/* =========================================================
   FORMULAIRE — SIGNALER UN BUG
   ========================================================= */
window.dpOuvrirFormulaireSignaler = function() {
  var existing = document.getElementById('dp-signaler-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'dp-signaler-modal';
  overlay.className = 'dp-modal-overlay';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="dp-modal-box">' +
      '<div class="dp-modal-head">' +
        '<div><div style="font-size:11px;font-weight:700;color:var(--ink-400);font-family:monospace">NOUVEAU BUG</div>' +
        '<h2 style="font-size:17px;font-weight:800;color:var(--ink-900);margin:4px 0 0">Signaler un bug</h2></div>' +
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

        '<div><label class="dp-form-label">Niveau d\'urgence *</label>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px" id="dp-sig-urgence-grid">' +
          ['Critique','Majeur','Mineur','Cosmétique'].map(function(u,i){
            var colors = ['#dc2626','#d97706','#eab308','#4A7EC7'];
            return '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:6px;border:1px solid var(--ink-200);background:#fff;cursor:pointer;font-size:12.5px;font-weight:600" class="dp-urg-opt-label">' +
              '<input type="radio" name="dp-sig-u" value="'+u+'" style="display:none"'+(i===2?' checked':'')+'>'+
              '<span style="width:10px;height:10px;border-radius:50%;background:'+colors[i]+';flex-shrink:0"></span>'+u+
            '</label>';
          }).join('') +
        '</div></div>' +

        '<div style="display:flex;justify-content:flex-end;gap:10px;padding-top:4px;border-top:1px solid var(--ink-100)">' +
          '<button class="dp-btn dp-btn--ghost" onclick="document.getElementById(\'dp-signaler-modal\').remove()">Annuler</button>' +
          '<button class="dp-btn dp-btn--rose" onclick="dpSoumettreSignalement()">Soumettre le bug</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  // Style sélection urgence (focus visuel = cobalt, pas rose)
  overlay.querySelectorAll('.dp-urg-opt-label').forEach(function(lbl){
    var radio = lbl.querySelector('input[type=radio]');
    if (radio && radio.checked) lbl.style.cssText += ';border-color:var(--brand-500);background:var(--brand-50)';
    lbl.addEventListener('click', function(){
      overlay.querySelectorAll('.dp-urg-opt-label').forEach(function(l){ l.style.borderColor='var(--ink-200)'; l.style.background='#fff'; });
      lbl.style.borderColor='var(--brand-500)'; lbl.style.background='var(--brand-50)';
    });
  });
};

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

  var codeRes = await db.from('dsp_bugs').select('code').order('created_at',{ascending:false}).limit(1);
  var lastCode = codeRes.data && codeRes.data[0] && codeRes.data[0].code ? codeRes.data[0].code : 'BUG-000';
  var lastNum = parseInt(lastCode.replace('BUG-',''),10) || 0;
  var newCode = 'BUG-' + String(lastNum+1).padStart(3,'0');

  var payload = {
    code: newCode,
    titre: titre.trim(),
    description: desc.trim()||null,
    zone: zone,
    environnement: env,
    urgence: urgence,
    statut: 'Nouveau',
    signale_par: currentUser ? currentUser.id : null,
    signale_par_nom: currentUserData ? (currentUserData.prenom+' '+currentUserData.nom) : 'Admin'
  };

  try {
    var res = await db.from('dsp_bugs').insert(payload);
    if (res.error) throw res.error;
    document.getElementById('dp-signaler-modal').remove();
    if (typeof showNotif==='function') showNotif('✅ Bug '+newCode+' signalé !','success');
    dpRenderBugs();
    dpLoadStats();
    dpLoadAQualifier();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

/* =========================================================
   DÉTAIL BUG / ÉVOLUTION
   ========================================================= */
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
  var statut   = data.statut || etapes[0];
  var stepIdx  = etapes.indexOf(statut);
  var code     = data.code || (isBug ? 'BUG-?' : 'EVOL-?');
  var prochaine = (stepIdx >= 0 && stepIdx < etapes.length - 1) ? etapes[stepIdx + 1] : null;

  // Bandeau infos clés (4 colonnes)
  var bandeauHTML =
    '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Statut</div><div>' + dpBadgeStatut(statut) + '</div></div>' +
    (isBug
      ? '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Urgence</div><div>' + dpBadgeUrgence(data.urgence) + '</div></div>' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Zone</div><div class="dp-bandeau__value">' + (data.zone||'—') + '</div></div>' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Env.</div><div>' + dpBadgeEnv(data.environnement) + '</div></div>'
      : '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Soumis par</div><div class="dp-bandeau__value">' + (data.signale_par_nom||'—') + '</div></div>' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Créé le</div><div class="dp-bandeau__value">' + new Date(data.created_at).toLocaleDateString('fr-FR') + '</div></div>' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Ancienneté</div><div><span class="dp-bandeau__pill dp-bandeau__pill--ok">' + dpAnciennete(data.created_at) + '</span></div></div>'
    );

  // Ligne 2 du bandeau (uniquement pour les bugs)
  var bandeau2HTML = isBug
    ? '<div class="dp-bandeau">' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Signalé par</div><div class="dp-bandeau__value">' + (data.signale_par_nom||'—') + '</div></div>' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Créé le</div><div class="dp-bandeau__value">' + new Date(data.created_at).toLocaleDateString('fr-FR') + '</div></div>' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Ancienneté</div><div><span class="dp-bandeau__pill dp-bandeau__pill--ok">' + dpAnciennete(data.created_at) + '</span></div></div>' +
        '<div class="dp-bandeau__col"><div class="dp-bandeau__label">Échéance</div><div class="dp-bandeau__value' + (data.date_echeance?'':' dp-bandeau__value--muted')+'">' + (data.date_echeance ? new Date(data.date_echeance).toLocaleDateString('fr-FR') : '—') + '</div></div>' +
      '</div>'
    : '';

  // Avancement chips
  var progressHTML = etapes.map(function(e, i) {
    var done = i < stepIdx, current = i === stepIdx;
    var cls = done ? 'is-done' : current ? 'is-current' : '';
    var icon = done ? '✓' : current ? '●' : (i+1);
    var date = (i === 0) ? new Date(data.created_at).toLocaleDateString('fr-FR') : '';
    var chip = '<div class="dp-step '+cls+'">' +
      '<div class="dp-step__title"><span class="dp-step__ico">'+icon+'</span> '+e+'</div>' +
      (date ? '<div class="dp-step__date">'+date+'</div>' : '') +
    '</div>';
    return chip + (i < etapes.length - 1 ? '<div class="dp-step__chev">›</div>' : '');
  }).join('');

  // Étape en cours / Workflow terminé
  var currentHTML;
  if (prochaine) {
    currentHTML =
      '<div class="dp-current">' +
        '<div class="dp-current__icon">🕐</div>' +
        '<div class="dp-current__text">' +
          '<div class="dp-current__label">Étape en cours</div>' +
          '<div class="dp-current__step">'+statut+'</div>' +
        '</div>' +
        '<button class="dp-btn dp-btn--primary" onclick="dpAvancerStatut(\''+type+'\','+data.id+',\''+prochaine+'\')">' +
          '✓ Confirmer « '+prochaine+' »' +
        '</button>' +
      '</div>';
  } else {
    currentHTML =
      '<div class="dp-current dp-current--done">' +
        '<div class="dp-current__icon">✅</div>' +
        '<div class="dp-current__text">' +
          '<div class="dp-current__label">'+(isBug?'Bug corrigé':'Évolution déployée')+'</div>' +
          '<div class="dp-current__step">Workflow terminé</div>' +
        '</div>' +
      '</div>';
  }

  // Événements / commentaires
  var eventsHTML = comments.length
    ? comments.map(function(c) {
        var nom = c.auteur_nom || 'Admin';
        return '<div class="dp-event">' +
          '<div class="dp-avatar" style="background:'+dpAvatarColor(nom)+'">'+dpInitials(nom)+'</div>' +
          '<div class="dp-event__body">' +
            '<div class="dp-event__head">' +
              '<span class="dp-event__author">'+nom+'</span>' +
              '<span class="dp-event__tag">NOTE</span>' +
              '<span class="dp-event__date">'+dpFmtDateTime(c.created_at)+'</span>' +
            '</div>' +
            '<p class="dp-event__text">'+c.contenu+'</p>' +
          '</div>' +
        '</div>';
      }).join('')
    : '<div class="dp-events__empty">Aucun événement pour ce '+(isBug?'bug':'élément')+'</div>';

  // Détails admin compacts pour bugs (urgence + échéance modifiables)
  var detailsAdminHTML = isBug
    ? '<div class="dp-section dp-admin-compact">' +
        '<div class="dp-section__title">⚙️ Détails admin</div>' +
        '<div class="dp-admin-compact__row">' +
          '<div><label class="dp-form-label">Urgence</label><select class="dp-form-select" id="dp-det-urgence">'+
            '<option value="">— Choisir —</option>'+
            ['Critique','Majeur','Mineur','Cosmétique'].map(function(u){
              return '<option'+(u===data.urgence?' selected':'')+'>'+u+'</option>';
            }).join('') +
          '</select></div>' +
          '<div><label class="dp-form-label">Échéance</label><input type="date" class="dp-form-input" id="dp-det-echeance" value="'+(data.date_echeance||'')+'"></div>' +
          '<button class="dp-btn dp-btn--ghost" onclick="dpSauvegarderDetailsBug('+data.id+')">Mettre à jour</button>' +
        '</div>' +
      '</div>'
    : '';

  // Commentaire admin (évolutions seulement)
  var commAdminHTML = !isBug
    ? '<div class="dp-section">' +
        '<div class="dp-section__title">Commentaire admin</div>' +
        '<textarea class="dp-form-input" id="dp-det-commentaire-admin" rows="2" style="resize:vertical">'+(data.commentaire_admin||'')+'</textarea>' +
        '<button class="dp-btn dp-btn--ghost" style="margin-top:8px" onclick="dpSauvegarderDetail(\''+type+'\','+data.id+')">Mettre à jour</button>' +
      '</div>'
    : '';

  box.innerHTML =
    // HEADER NAVY
    '<div class="dp-mh">' +
      '<div class="dp-mh__title">' +
        '<span class="dp-mh__type">'+(isBug?'Bug':'Évolution')+'</span>' +
        '<span class="dp-mh__sep">—</span>' +
        '<span class="dp-mh__ref">'+code+'</span>' +
      '</div>' +
      '<button class="dp-mh__close" onclick="document.getElementById(\'dp-detail-modal\').remove()">✕</button>' +
    '</div>' +

    // TITRE
    '<h2 class="dp-modal-title">'+data.titre+'</h2>' +

    // BANDEAU 1
    '<div class="dp-bandeau">'+bandeauHTML+'</div>' +

    // BANDEAU 2 (bugs)
    bandeau2HTML +

    // AVANCEMENT
    '<div class="dp-progress">' +
      '<div class="dp-progress__title">📊 Avancement</div>' +
      '<div class="dp-progress__chips">'+progressHTML+'</div>' +
    '</div>' +

    // ÉTAPE EN COURS
    currentHTML +

    // DESCRIPTION
    (data.description
      ? '<div class="dp-section"><div class="dp-section__title">Description</div><p class="dp-section__text">'+data.description+'</p></div>'
      : ''
    ) +

    // DÉTAILS ADMIN (bugs)
    detailsAdminHTML +

    // COMMENTAIRE ADMIN (évolutions)
    commAdminHTML +

    // ÉVÉNEMENTS
    '<div class="dp-events">' +
      '<div class="dp-events__title">📝 Événements ('+comments.length+')</div>' +
      eventsHTML +
      '<div class="dp-event-add">' +
        '<input class="dp-form-input" id="dp-det-new-comment" placeholder="Ajouter un commentaire…" onkeydown="if(event.key===\'Enter\') dpAjouterCommentaire(\''+type+'\','+data.id+')">' +
        '<button class="dp-btn dp-btn--primary" onclick="dpAjouterCommentaire(\''+type+'\','+data.id+')">Envoyer</button>' +
      '</div>' +
    '</div>' +

    // FOOTER
    '<div class="dp-mf">' +
      '<div class="dp-mf__ref">'+code+'</div>' +
      '<button class="dp-btn dp-btn--ghost" onclick="document.getElementById(\'dp-detail-modal\').remove()">Fermer</button>' +
    '</div>';
}

window.dpSauvegarderDetail = async function(type, id) {
  var statut    = (document.getElementById('dp-det-statut')           ||{}).value||'';
  var echeance  = (document.getElementById('dp-det-echeance')         ||{}).value||null;
  var urgence   = (document.getElementById('dp-det-urgence')          ||{}).value||null;
  var commAdmin = (document.getElementById('dp-det-commentaire-admin')||{}).value||null;
  var table  = type==='bug' ? 'dsp_bugs' : 'dsp_evolutions';
  var payload = {statut: statut};
  if (echeance) payload.date_echeance = echeance;
  if (urgence && urgence !== '')  payload.urgence = urgence;
  if (commAdmin !== null && type==='evolution') payload.commentaire_admin = commAdmin;
  try {
    var res = await db.from(table).update(payload).eq('id',id);
    if (res.error) throw res.error;
    document.getElementById('dp-detail-modal').remove();
    if (typeof showNotif==='function') showNotif('✅ Mis à jour !','success');
    dpLoadAQualifier();
    dpLoadStats();
    dpRenderBugs();
  } catch(e) {
    if (typeof showNotif==='function') showNotif('Erreur : '+e.message,'error');
  }
};

window.dpAvancerStatut = async function(type, id, prochaine) {
  var table = type === 'bug' ? 'dsp_bugs' : 'dsp_evolutions';
  try {
    var res = await db.from(table).update({statut: prochaine}).eq('id', id);
    if (res.error) throw res.error;
    if (typeof showNotif === 'function') showNotif('✅ Statut : ' + prochaine, 'success');
    dpOuvrirDetail(type, id);
    dpLoadStats();
    dpLoadAQualifier();
    if (type === 'bug') dpRenderBugs();
  } catch(e) {
    if (typeof showNotif === 'function') showNotif('Erreur : ' + e.message, 'error');
  }
};

window.dpSauvegarderDetailsBug = async function(id) {
  var urgence  = (document.getElementById('dp-det-urgence') ||{}).value || null;
  var echeance = (document.getElementById('dp-det-echeance')||{}).value || null;
  var payload = {};
  if (urgence)  payload.urgence = urgence;
  if (echeance) payload.date_echeance = echeance;
  if (!Object.keys(payload).length) return;
  try {
    var res = await db.from('dsp_bugs').update(payload).eq('id', id);
    if (res.error) throw res.error;
    if (typeof showNotif === 'function') showNotif('✅ Détails mis à jour', 'success');
    dpOuvrirDetail('bug', id);
    dpRenderBugs();
  } catch(e) {
    if (typeof showNotif === 'function') showNotif('Erreur : ' + e.message, 'error');
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

/* =========================================================
   RENDU PRINCIPAL — HTML/CSS UNIQUEMENT
   (charte Dispatchis Design System)
   ========================================================= */
function dprojectRender() {
  var container = document.getElementById('dproject-content');
  if (!container) return;
  container.style.padding = '0';
  container.style.background = '#f4f7fc';   /* charte: --bg pastel-blue */
  container.style.minHeight = '100%';
  container.style.fontFamily = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";

  container.innerHTML = `
<style>
/* =========================================================
   TOKENS — alignés Dispatchis Design System
   Les noms (--ink-*, --brand-*, --rose, etc.) sont conservés
   pour compatibilité avec le JS. Seules les VALEURS changent.
   ========================================================= */
#dproject-content {
  /* Page & surface */
  --bg:             #f4f7fc;   /* blue-50 — page bg pastel */
  --surface:        #ffffff;

  /* Greys cool-toned (charte) */
  --ink-900:        #122446;   /* navy-deep — texte primaire */
  --ink-800:        #1c2434;   /* gray-800 */
  --ink-700:        #303a4d;   /* gray-700 */
  --ink-600:        #4a5567;   /* gray-600 — texte muted */
  --ink-500:        #6b7689;   /* gray-500 */
  --ink-400:        #9aa6ba;   /* gray-400 — placeholder */
  --ink-300:        #cdd6e3;   /* gray-300 — border-strong */
  --ink-200:        #e4eaf2;   /* gray-200 — border default */
  --ink-100:        #f1f4f9;   /* gray-100 */
  --ink-50:         #f8f9fb;   /* gray-50 */

  /* Brand */
  --navy:           #1B3461;
  --navy-2:         #2A4A7F;   /* navy-light */

  /* Rose (réservé : CTA principal, KPI, lettres D, onglet actif) */
  --rose:           #e5195e;
  --rose-2:         #c9164f;   /* rose-hover */

  /* Bleus (= ex "brand-*") */
  --brand-700:      #1B3461;   /* blue-700 (= navy) */
  --brand-600:      #3463aa;   /* blue-600 (hover primary) */
  --brand-500:      #4A7EC7;   /* blue-500 / cobalt */
  --brand-100:      #e9f0fa;   /* blue-100 */
  --brand-50:       #f4f7fc;   /* blue-50 */

  /* Statuts (charte) */
  --ok-700:         #166534;
  --ok-100:         #dcfce7;
  --ok-50:          #dcfce7;

  --warn-700:       #92540a;
  --warn-100:       #fef3e2;
  --warn-50:        #fef3e2;

  --danger-700:     #991b1b;
  --danger-100:     #feeaea;
  --danger-50:      #feeaea;

  --info-700:       #1B3461;   /* info-fg (navy) */
  --info-100:       #d6e3f5;   /* blue-200 */
  --info-50:        #e9f0fa;   /* blue-100 */

  /* Ombres cool-tinted (charte) */
  --shadow-xs:      0 1px 2px rgba(27,52,97,.06);
  --shadow-sm:      0 1px 3px rgba(27,52,97,.07), 0 1px 2px rgba(27,52,97,.04);
  --shadow-md:      0 4px 16px rgba(27,52,97,.10);
  --shadow-focus:   0 0 0 3px rgba(74,126,199,.18);
}
#dproject-content *{box-sizing:border-box}
#dproject-content a{text-decoration:none}

/* ---- Page ---- */
.dp-page{padding:24px 32px 48px;max-width:1480px;margin:0 auto}
.dp-page-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px;gap:16px;flex-wrap:wrap}
.dp-page-head__title{font-size:28px;font-weight:800;letter-spacing:-.02em;color:var(--navy);margin:0}
.dp-page-head__sub{font-size:13.5px;color:var(--ink-500);margin-top:4px}

/* ---- Buttons (FLAT, charte: no gradients) ---- */
.dp-btn{
  display:inline-flex;align-items:center;gap:8px;
  height:36px;padding:0 14px;
  border-radius:6px;          /* charte: --radius-sm */
  border:1px solid transparent;
  font:inherit;font-size:13px;font-weight:600;
  cursor:pointer;
  background:#fff;color:var(--ink-800);
  box-shadow:var(--shadow-xs);
  transition:background .12s, border-color .12s, transform .1s
}
.dp-btn:hover{transform:translateY(-1px)}
.dp-btn:active{transform:translateY(0)}
.dp-btn svg{width:14px;height:14px;flex-shrink:0}

.dp-btn--ghost{background:#fff;border-color:var(--ink-200);color:var(--ink-800)}
.dp-btn--ghost:hover{background:var(--ink-50);border-color:var(--ink-300)}

.dp-btn--primary{background:var(--navy);color:#fff;border-color:transparent}
.dp-btn--primary:hover{background:var(--navy-2)}

/* THE CTA — rose flat (charte: rose réservé au primary CTA) */
.dp-btn--rose{background:var(--rose);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(229,25,94,.20)}
.dp-btn--rose:hover{background:var(--rose-2);box-shadow:0 4px 12px rgba(229,25,94,.28)}

/* ---- Tabs (charte: rose underline, no background fill) ---- */
.dp-tabs{
  display:flex;
  gap:0;
  background:transparent;
  border:none;
  border-bottom:1px solid var(--ink-200);
  border-radius:0;
  padding:0;
  box-shadow:none;
  margin-bottom:18px;
  width:100%;
  overflow-x:auto;
}
.dp-tabs button{
  display:inline-flex;align-items:center;gap:8px;
  height:38px;padding:0 16px;
  border:0;
  border-bottom:2px solid transparent;
  border-radius:0;
  background:transparent;
  font:inherit;font-size:13px;font-weight:500;
  color:var(--ink-600);
  cursor:pointer;
  white-space:nowrap;
  transition:color .12s, border-color .12s;
}
.dp-tabs button:hover{color:var(--navy)}
.dp-tabs button.is-active{color:var(--rose);border-bottom-color:var(--rose);font-weight:600}
.dp-tabs button .dp-count{
  display:inline-grid;place-items:center;
  min-width:20px;height:18px;padding:0 6px;
  border-radius:999px;
  background:var(--ink-100);color:var(--ink-600);
  font-size:10.5px;font-weight:700
}
.dp-tabs button.is-active .dp-count{background:var(--rose);color:#fff}

/* ---- KPIs (charte: rose number 28px weight 800 tabular) ---- */
.dp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
.dp-kpi{
  background:var(--surface);
  border:1px solid var(--ink-200);
  border-radius:10px;            /* charte: stat-cards 10px */
  padding:14px 16px;
  box-shadow:var(--shadow-sm);
  display:flex;align-items:center;gap:12px;
  transition:box-shadow .15s, transform .15s
}
.dp-kpi:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
.dp-kpi__ico{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
.dp-kpi__ico--rose{background:#fce8ef;color:var(--rose)}
.dp-kpi__ico--blue{background:var(--brand-100);color:var(--brand-700)}
.dp-kpi__ico--ok{background:var(--ok-100);color:var(--ok-700)}
.dp-kpi__ico--warn{background:var(--warn-100);color:var(--warn-700)}
.dp-kpi__ico svg{width:18px;height:18px}
.dp-kpi__label{font-size:11px;color:var(--ink-500);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.dp-kpi__value{
  font-size:28px;                       /* charte */
  font-weight:800;                      /* charte */
  color:var(--rose);                    /* charte: KPI rose */
  font-variant-numeric:tabular-nums;    /* charte: tabular */
  margin-top:2px;
  letter-spacing:-.01em
}
.dp-kpi__sub{font-size:11px;color:var(--danger-700);font-weight:600;margin-top:2px}

/* ---- Card ---- */
.dp-card{
  background:var(--surface);
  border:1px solid var(--ink-200);
  border-radius:14px;            /* charte: --radius-lg */
  box-shadow:var(--shadow-sm);
  overflow:hidden
}
.dp-card__head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--ink-100)}
.dp-card__title{font-size:14px;font-weight:700;color:var(--navy);margin:0}
.dp-card__sub{font-size:12px;color:var(--ink-500);margin-top:2px}

/* ---- Toolbar ---- */
.dp-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dp-select{
  height:32px;padding:0 30px 0 12px;
  border-radius:6px;
  border:1px solid var(--ink-200);
  background:#fff url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7689' stroke-width='2.4'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e") no-repeat right 10px center;
  font:inherit;font-size:12.5px;color:var(--ink-800);cursor:pointer;
  transition:border-color .12s, box-shadow .12s
}
.dp-select:focus{outline:none;border-color:var(--brand-500);box-shadow:var(--shadow-focus)}

.dp-search{position:relative;width:220px}
.dp-search input{
  width:100%;height:32px;
  border:1px solid var(--ink-200);border-radius:6px;
  background:#fff;padding:0 10px 0 30px;
  font:inherit;font-size:12.5px;color:var(--ink-800);outline:none;
  transition:border-color .12s, box-shadow .12s
}
.dp-search input:focus{border-color:var(--brand-500);box-shadow:var(--shadow-focus)}
.dp-search svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--ink-400);width:13px;height:13px}

/* ---- Table ---- */
table.dp-t{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.dp-t thead th{
  background:var(--ink-50);
  color:var(--ink-500);
  padding:10px 14px;
  font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  text-align:left;
  border-bottom:1px solid var(--ink-200)
}
.dp-t tbody td{padding:12px 14px;border-bottom:1px solid var(--ink-100);vertical-align:middle}
.dp-t tbody tr{cursor:pointer;transition:background .1s}
.dp-t tbody tr:hover td{background:var(--brand-50)}
.dp-t tbody tr:last-child td{border-bottom:none}
.dp-title-cell{font-weight:600;color:var(--ink-900);font-size:13px}
.dp-desc{font-size:11.5px;color:var(--ink-500);margin-top:2px;line-height:1.4}

/* ---- Ref badges (charte: monospace claim IDs) ---- */
.dp-ref{
  font-family:'SF Mono', ui-monospace, 'Cascadia Mono', Menlo, monospace;
  font-size:11.5px;font-weight:600;
  color:var(--navy);
  background:var(--ink-100);
  padding:3px 8px;border-radius:4px;
  border:1px solid var(--ink-200)
}
.dp-ref--bug{color:var(--danger-700);background:var(--danger-100);border-color:#f3a0a0}

/* ---- Pills statuts ---- */
.dp-pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 9px;
  border-radius:999px;            /* charte: pill */
  font-size:11px;font-weight:600;
  border:1px solid;white-space:nowrap
}
.dp-pill::before{content:"";width:6px;height:6px;border-radius:50%;flex-shrink:0}
.dp-pill--nouveau    {background:var(--ink-50);  border-color:var(--ink-200); color:var(--ink-700)}
.dp-pill--nouveau::before{background:var(--ink-400)}
.dp-pill--analyse    {background:var(--info-50); border-color:var(--info-100);color:var(--info-700)}
.dp-pill--analyse::before{background:var(--brand-500)}
.dp-pill--correction {background:var(--warn-50); border-color:#f3c988;        color:var(--warn-700)}
.dp-pill--correction::before{background:#d97706}
.dp-pill--staging    {background:var(--warn-50); border-color:#f3c988;        color:var(--warn-700)}
.dp-pill--staging::before{background:#d97706}
.dp-pill--corrige    {background:var(--ok-50);   border-color:#a0e0c0;        color:var(--ok-700)}
.dp-pill--corrige::before{background:#16a34a}

/* ---- Urgence ---- */
.dp-urg{
  display:inline-flex;align-items:center;gap:6px;
  padding:3px 9px;
  border-radius:999px;
  font-size:11px;font-weight:600;
  border:1px solid;white-space:nowrap
}
.dp-urg__dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dp-urg--critique{background:var(--danger-100);border-color:#f3a0a0;color:var(--danger-700)}
.dp-urg--critique .dp-urg__dot{background:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.15)}
.dp-urg--majeur{background:var(--warn-100);border-color:#f3c988;color:var(--warn-700)}
.dp-urg--majeur .dp-urg__dot{background:#d97706}
.dp-urg--mineur{background:#fef9c3;border-color:#fde68a;color:#854d0e}
.dp-urg--mineur .dp-urg__dot{background:#eab308}
.dp-urg--cosmetique{background:var(--info-50);border-color:var(--info-100);color:var(--info-700)}
.dp-urg--cosmetique .dp-urg__dot{background:var(--brand-500)}

/* ---- Zone + Env ---- */
.dp-zone{
  display:inline-flex;align-items:center;
  padding:2px 8px;border-radius:4px;
  background:var(--brand-50);color:var(--brand-700);
  font-size:10.5px;font-weight:600
}
.dp-env-prod{
  display:inline-flex;align-items:center;
  padding:2px 8px;border-radius:4px;
  background:var(--danger-100);color:var(--danger-700);
  font-size:10.5px;font-weight:700
}
.dp-env-staging{
  display:inline-flex;align-items:center;
  padding:2px 8px;border-radius:4px;
  background:var(--warn-100);color:var(--warn-700);
  font-size:10.5px;font-weight:700
}

/* ---- À qualifier (banner) ---- */
.dp-qualifier-banner{
  background:var(--warn-50);
  border:1.5px solid #f3c988;
  border-radius:12px;
  padding:16px 20px;margin-bottom:18px
}
.dp-qualifier-banner__head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.dp-qualifier-count{
  background:#d97706;color:#fff;
  font-size:11px;font-weight:700;
  padding:2px 8px;border-radius:999px
}
.dp-qualifier-item{
  background:#fff;
  border:1px solid #f3c988;
  border-radius:10px;
  padding:12px 16px;margin-bottom:8px;
  cursor:pointer;
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  transition:box-shadow .15s, transform .15s
}
.dp-qualifier-item:last-child{margin-bottom:0}
.dp-qualifier-item:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
.dp-qualifier-badge{
  background:var(--warn-100);color:var(--warn-700);
  font-size:11px;font-weight:700;
  padding:3px 10px;border-radius:999px;
  white-space:nowrap
}

/* ---- Tab panels ---- */
.dp-tab-panel{display:none}
.dp-tab-panel.is-active{display:block}

/* ---- Modal ---- */
.dp-modal-overlay{
  position:fixed;inset:0;
  background:rgba(15,27,45,.5);     /* charte: navy-tinted overlay */
  backdrop-filter:blur(2px);
  -webkit-backdrop-filter:blur(2px);
  z-index:9999;
  display:flex;align-items:center;justify-content:center;padding:16px
}
.dp-modal-box{
  background:#fff;
  border-radius:16px;
  width:100%;max-width:660px;max-height:92vh;overflow-y:auto;
  box-shadow:0 24px 80px rgba(27,52,97,.25)   /* cool-tinted */
}
.dp-modal-head{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.dp-modal-body{padding:16px 24px 24px;display:flex;flex-direction:column;gap:20px}
.dp-modal-close{
  background:var(--ink-100);border:none;border-radius:6px;
  width:32px;height:32px;cursor:pointer;
  font-size:16px;color:var(--ink-600);flex-shrink:0;
  display:grid;place-items:center;
  transition:background .12s
}
.dp-modal-close:hover{background:var(--ink-200)}

/* Progression steps */
.dp-prog-wrap{display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:4px;gap:0}
.dp-prog-step{display:flex;align-items:flex-start;flex-shrink:0}
.dp-prog-circle{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin:0 auto}
.dp-prog-label{font-size:10px;margin-top:4px;max-width:68px;text-align:center;line-height:1.2}
.dp-prog-line{width:28px;height:2px;margin:14px 2px 0;flex-shrink:0}

/* Info grid */
.dp-info-grid{
  background:var(--ink-50);
  border-radius:10px;
  padding:14px 16px;
  display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px
}
.dp-info-label{font-size:10px;font-weight:700;color:var(--ink-400);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}

/* Admin box */
.dp-admin-box{
  background:var(--info-50);
  border:1px solid var(--info-100);
  border-radius:10px;
  padding:14px 16px
}
.dp-admin-box__title{font-size:11px;font-weight:700;color:var(--info-700);margin-bottom:12px;letter-spacing:.06em}

/* Forms */
.dp-form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.dp-form-label{font-size:11px;font-weight:600;color:var(--ink-700);display:block;margin-bottom:4px}
.dp-form-select{
  width:100%;padding:8px 10px;
  border:1.5px solid var(--ink-200);border-radius:6px;
  font-size:13px;font:inherit;background:#fff;
  transition:border-color .12s, box-shadow .12s
}
.dp-form-select:focus{outline:none;border-color:var(--brand-500);box-shadow:var(--shadow-focus)}
.dp-form-input{
  width:100%;padding:8px 10px;
  border:1.5px solid var(--ink-200);border-radius:6px;
  font-size:13px;font:inherit;box-sizing:border-box;
  transition:border-color .12s, box-shadow .12s
}
.dp-form-input:focus{outline:none;border-color:var(--brand-500);box-shadow:var(--shadow-focus)}

/* Comments */
.dp-comments-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:200px;overflow-y:auto}
.dp-comment{background:var(--ink-50);border-radius:10px;padding:10px 14px}
.dp-comment__meta{display:flex;justify-content:space-between;margin-bottom:4px}
.dp-comment__author{font-size:12px;font-weight:700;color:var(--ink-900)}
.dp-comment__date{font-size:11px;color:var(--ink-400)}
.dp-comment__text{font-size:13px;color:var(--ink-700);margin:0}
.dp-comment-input-row{display:flex;gap:8px}

/* À venir */
.dp-coming-soon{text-align:center;padding:80px 40px;color:var(--ink-400)}
.dp-coming-soon__icon{font-size:40px;margin-bottom:16px}
.dp-coming-soon__title{font-size:15px;font-weight:600;color:var(--ink-500)}

/* =========================================================
   MODAL DÉTAIL — STYLE DVOL
   ========================================================= */

/* Modal box override pour permettre header navy flush */
.dp-modal-box{padding:0;max-width:760px}

/* Header navy flush au top */
.dp-mh{
  background:var(--navy);
  color:#fff;
  padding:14px 20px;
  display:flex;align-items:center;justify-content:space-between;
  border-radius:16px 16px 0 0
}
.dp-mh__title{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700}
.dp-mh__type{letter-spacing:.02em}
.dp-mh__sep{opacity:.5}
.dp-mh__ref{
  font-family:'SF Mono',ui-monospace,'Cascadia Mono',Menlo,monospace;
  font-size:12px;font-weight:600;
  background:rgba(255,255,255,.12);
  padding:4px 10px;border-radius:6px;
  letter-spacing:.04em
}
.dp-mh__close{
  background:rgba(255,255,255,.12);
  color:#fff;border:none;
  width:30px;height:30px;border-radius:6px;
  font-size:13px;cursor:pointer;
  display:grid;place-items:center;
  transition:background .12s
}
.dp-mh__close:hover{background:rgba(255,255,255,.22)}

/* Titre principal */
.dp-modal-title{
  font-size:22px;font-weight:800;
  color:var(--ink-900);
  letter-spacing:-.01em;
  padding:0 20px;margin:18px 0 14px
}

/* Bandeau infos clés (4 col) */
.dp-bandeau{
  display:grid;grid-template-columns:repeat(4,1fr);
  gap:18px;
  padding:14px 20px;
  border-bottom:1px solid var(--ink-100)
}
.dp-bandeau:nth-of-type(2){border-bottom:1px solid var(--ink-100)}
.dp-bandeau__col{display:flex;flex-direction:column;gap:6px;min-width:0}
.dp-bandeau__label{font-size:10px;font-weight:700;color:var(--ink-400);letter-spacing:.06em;text-transform:uppercase}
.dp-bandeau__value{font-size:14px;font-weight:600;color:var(--ink-900);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dp-bandeau__value--muted{color:var(--ink-400);font-weight:500}
.dp-bandeau__pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 11px;border-radius:999px;
  font-size:11px;font-weight:700;
  width:fit-content
}
.dp-bandeau__pill::before{content:"●";font-size:7px}
.dp-bandeau__pill--ok{background:var(--ok-100);color:var(--ok-700)}
.dp-bandeau__pill--warn{background:var(--warn-100);color:var(--warn-700)}
.dp-bandeau__pill--danger{background:var(--danger-100);color:var(--danger-700)}

/* Avancement (chips horizontaux) */
.dp-progress{padding:18px 20px;border-bottom:1px solid var(--ink-100)}
.dp-progress__title{font-size:13px;font-weight:700;color:var(--ink-900);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.dp-progress__chips{display:flex;align-items:stretch;gap:6px;flex-wrap:wrap}
.dp-step{
  background:var(--ink-50);
  border:1px solid var(--ink-200);
  border-radius:10px;
  padding:9px 13px;
  display:flex;flex-direction:column;justify-content:center;
  min-width:130px;flex:1
}
.dp-step__title{font-size:12.5px;font-weight:600;color:var(--ink-500);display:flex;align-items:center;gap:6px}
.dp-step__ico{
  display:inline-grid;place-items:center;
  width:18px;height:18px;border-radius:50%;
  background:var(--ink-200);color:var(--ink-500);
  font-size:10px;font-weight:800;flex-shrink:0
}
.dp-step__date{font-size:10.5px;color:var(--ink-400);margin-top:3px}
.dp-step.is-done{background:var(--ok-50);border-color:#a0e0c0}
.dp-step.is-done .dp-step__title{color:var(--ok-700)}
.dp-step.is-done .dp-step__ico{background:var(--ok-700);color:#fff}
.dp-step.is-current{background:var(--brand-50);border:1.5px solid var(--brand-500);box-shadow:0 0 0 3px rgba(74,126,199,.10)}
.dp-step.is-current .dp-step__title{color:var(--navy);font-weight:700}
.dp-step.is-current .dp-step__ico{background:var(--brand-500);color:#fff}
.dp-step__chev{display:flex;align-items:center;color:var(--ink-300);font-size:18px;font-weight:700;flex-shrink:0;padding:0 1px}

/* Étape en cours call-out */
.dp-current{
  background:var(--ink-50);
  border:1px solid var(--ink-200);
  border-radius:12px;
  margin:18px 20px;padding:14px 16px;
  display:flex;align-items:center;gap:14px;flex-wrap:wrap
}
.dp-current__icon{
  width:38px;height:38px;
  background:var(--brand-100);color:var(--brand-700);
  border-radius:10px;
  display:grid;place-items:center;
  font-size:17px;flex-shrink:0
}
.dp-current__text{flex:1;min-width:140px}
.dp-current__label{font-size:10px;font-weight:700;color:var(--ink-500);letter-spacing:.06em;text-transform:uppercase}
.dp-current__step{font-size:14px;font-weight:700;color:var(--ink-900);margin-top:2px}
.dp-current--done{background:var(--ok-50);border-color:#a0e0c0}
.dp-current--done .dp-current__icon{background:var(--ok-100);color:var(--ok-700)}

/* Sections (description, etc.) */
.dp-section{padding:14px 20px;border-bottom:1px solid var(--ink-100)}
.dp-section:last-of-type{border-bottom:none}
.dp-section__title{font-size:11px;font-weight:700;color:var(--ink-400);letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px}
.dp-section__text{font-size:13.5px;line-height:1.6;color:var(--ink-700);margin:0}

/* Détails admin compacts */
.dp-admin-compact__row{
  display:grid;
  grid-template-columns:1fr 1fr auto;
  gap:10px;align-items:end
}
.dp-admin-compact__row .dp-btn{height:36px}

/* Événements */
.dp-events{padding:14px 20px 18px}
.dp-events__title{font-size:13px;font-weight:700;color:var(--ink-900);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.dp-event{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--ink-100)}
.dp-event:last-of-type{border-bottom:none}
.dp-avatar{
  width:34px;height:34px;border-radius:50%;
  display:grid;place-items:center;
  color:#fff;font-size:12px;font-weight:700;
  flex-shrink:0;letter-spacing:.02em
}
.dp-event__body{flex:1;min-width:0}
.dp-event__head{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap}
.dp-event__author{font-size:13px;font-weight:700;color:var(--ink-900)}
.dp-event__tag{
  background:var(--ink-100);color:var(--ink-600);
  font-size:9.5px;font-weight:700;
  padding:2px 6px;border-radius:4px;
  letter-spacing:.05em
}
.dp-event__date{font-size:11px;color:var(--ink-400);margin-left:auto}
.dp-event__text{font-size:13px;color:var(--ink-700);margin:0;line-height:1.5}
.dp-events__empty{
  text-align:center;padding:18px;
  color:var(--ink-400);font-size:13px;
  background:var(--ink-50);border-radius:8px
}
.dp-event-add{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--ink-100)}

/* Modal footer */
.dp-mf{
  border-top:1px solid var(--ink-100);
  padding:12px 20px;
  display:flex;align-items:center;justify-content:space-between;
  border-radius:0 0 16px 16px
}
.dp-mf__ref{
  font-family:'SF Mono',ui-monospace,'Cascadia Mono',Menlo,monospace;
  font-size:11px;color:var(--ink-400);
  letter-spacing:.04em
}

/* Mobile : bandeau passe en 2 col, chips en colonne */
@media(max-width:720px){
  .dp-bandeau{grid-template-columns:repeat(2,1fr)}
  .dp-progress__chips{flex-direction:column;align-items:stretch}
  .dp-step{min-width:0}
  .dp-step__chev{display:none;transform:rotate(90deg);justify-content:center}
  .dp-admin-compact__row{grid-template-columns:1fr}
  .dp-current{flex-direction:column;align-items:stretch}
  .dp-current .dp-btn{width:100%;justify-content:center}
}

@media(max-width:1100px){.dp-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.dp-kpis{grid-template-columns:1fr}.dp-page{padding:16px}}
</style>

<div class="dp-page">

  <!-- En-tête -->
  <div class="dp-page-head">
    <div>
      <h1 class="dp-page-head__title">Dproject — Gestion projet DSP</h1>
      <div class="dp-page-head__sub">Tâches, évolutions, bugs et roadmap · remplace Jira pour l'équipe Dispatchis</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="dp-btn dp-btn--ghost" onclick="dpOuvrirFormulaireSignaler()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/></svg>
        Signaler un bug
      </button>
      <button class="dp-btn dp-btn--ghost" onclick="dpSwitchTab('evolutions')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
        Proposer une évolution
      </button>
    </div>
  </div>

  <!-- KPIs -->
  <section class="dp-kpis" id="dp-kpis">
    ${dpKpiCard('rose','<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>','TÂCHES ACTIVES','—','')}
    ${dpKpiCard('blue','<path d="M12 3v18M3 12h18"/>','ÉVOLUTIONS OUVERTES','—','')}
    ${dpKpiCard('warn','<path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/>','BUGS À TRAITER','—','')}
    ${dpKpiCard('ok','<path d="M20 6L9 17l-5-5"/>','LIVRÉS CE TRIMESTRE','—','')}
  </section>

  <!-- Bannière À qualifier -->
  <div id="dp-a-qualifier-zone"></div>

  <!-- Tabs -->
  <div class="dp-tabs" role="tablist">
    <button class="is-active" data-tab="bugs" onclick="dpSwitchTab('bugs')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6V4a4 4 0 018 0v2"/><rect x="4" y="6" width="16" height="14" rx="3"/></svg>
      Bugs <span class="dp-count" id="dp-count-bugs">—</span>
    </button>
    <button data-tab="evolutions" onclick="dpSwitchTab('evolutions')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg>
      Évolutions
    </button>
    <button data-tab="taches" onclick="dpSwitchTab('taches')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      Tâches
    </button>
    <button data-tab="roadmap" onclick="dpSwitchTab('roadmap')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      Roadmap
    </button>
  </div>

  <!-- Panels -->
  <section class="dp-tab-panel is-active" id="dp-tab-bugs"></section>
  <section class="dp-tab-panel" id="dp-tab-evolutions">
    <div class="dp-card"><div class="dp-coming-soon"><div class="dp-coming-soon__icon">💡</div><div class="dp-coming-soon__title">Évolutions — à venir</div></div></div>
  </section>
  <section class="dp-tab-panel" id="dp-tab-taches">
    <div class="dp-card"><div class="dp-coming-soon"><div class="dp-coming-soon__icon">📝</div><div class="dp-coming-soon__title">Tâches — à venir</div></div></div>
  </section>
  <section class="dp-tab-panel" id="dp-tab-roadmap">
    <div class="dp-card"><div class="dp-coming-soon"><div class="dp-coming-soon__icon">🗺️</div><div class="dp-coming-soon__title">Roadmap — à venir</div></div></div>
  </section>

</div>
`;

  /* ── INIT — appelé APRÈS que innerHTML soit posé ── */
  dpRenderBugs();
  dpLoadStats();
  dpLoadAQualifier();
}
