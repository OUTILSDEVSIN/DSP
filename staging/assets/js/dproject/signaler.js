// ===================================================
// SIGNALER.JS — Bouton gestionnaire dans le header DSP
// Signaler un bug ou une évolution + voir ses demandes
// ===================================================

// ===== OUVRIR LE MODAL SIGNALEMENT =====
function ouvrirSignalement() {
  var existing = document.getElementById('modal-signalement');
  if (existing) { existing.style.display = 'flex'; return; }

  var modal = document.createElement('div');
  modal.id = 'modal-signalement';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

  modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;">

      <!-- Header modal -->
      <div style="padding:20px 24px 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:0;">📣 Signaler</h2>
        <button onclick="document.getElementById('modal-signalement').style.display='none'"
          style="background:#f1f5f9;border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;color:#64748b;">✕</button>
      </div>

      <!-- Sous-onglets -->
      <div style="display:flex;gap:0;padding:16px 24px 0;border-bottom:2px solid #f1f5f9;margin-top:12px;">
        <button onclick="signalSwitchTab('nouveau')" id="stab-nouveau"
          style="padding:8px 16px;border:none;background:transparent;font-size:13px;font-weight:700;color:#0f172a;border-bottom:2px solid #0f172a;margin-bottom:-2px;cursor:pointer;">
          ➕ Nouveau signalement
        </button>
        <button onclick="signalSwitchTab('mesDemandes')" id="stab-mesDemandes"
          style="padding:8px 16px;border:none;background:transparent;font-size:13px;font-weight:600;color:#94a3b8;border-bottom:2px solid transparent;margin-bottom:-2px;cursor:pointer;">
          📋 Mes demandes
        </button>
      </div>

      <!-- Contenu -->
      <div id="signal-content" style="padding:20px 24px 24px;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  signalSwitchTab('nouveau');
}

// ===== SWITCH ONGLETS =====
function signalSwitchTab(tab) {
  ['nouveau','mesDemandes'].forEach(function(t) {
    var btn = document.getElementById('stab-' + t);
    if (!btn) return;
    if (t === tab) {
      btn.style.color = '#0f172a';
      btn.style.borderBottomColor = '#0f172a';
      btn.style.fontWeight = '700';
    } else {
      btn.style.color = '#94a3b8';
      btn.style.borderBottomColor = 'transparent';
      btn.style.fontWeight = '600';
    }
  });
  var content = document.getElementById('signal-content');
  if (!content) return;
  if (tab === 'nouveau')      signalRenderForm(content);
  if (tab === 'mesDemandes')  signalRenderMesDemandes(content);
}

// ===== FORMULAIRE SIGNALEMENT =====
var _signalScreenshot = null;
var _signalType = 'bug';

function signalRenderForm(container) {
  _signalScreenshot = null;
  _signalType = 'bug';

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">

      <!-- Type -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:8px;">Type de signalement *</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div onclick="signalSelectType('bug')" id="stype-bug"
            style="padding:12px;border:2px solid #0f172a;border-radius:10px;cursor:pointer;text-align:center;background:#f8fafc;">
            <div style="font-size:20px;margin-bottom:4px;">🐛</div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;">Bug</div>
            <div style="font-size:11px;color:#94a3b8;">Quelque chose ne fonctionne pas</div>
          </div>
          <div onclick="signalSelectType('evolution')" id="stype-evolution"
            style="padding:12px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:center;background:white;">
            <div style="font-size:20px;margin-bottom:4px;">💡</div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;">Évolution</div>
            <div style="font-size:11px;color:#94a3b8;">Une idée d'amélioration</div>
          </div>
        </div>
      </div>

      <!-- Titre -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;">Titre *</label>
        <input type="text" id="signal-titre" placeholder="Résumé en quelques mots"
          style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>

      <!-- Description -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;">Description *</label>
        <textarea id="signal-description" rows="3"
          placeholder="Décris ce qui se passe, ou ce que tu aimerais voir…"
          style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>
      </div>

      <!-- Champs bug uniquement -->
      <div id="signal-bug-fields">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;">Zone concernée</label>
            <select id="signal-zone"
              style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;">
              <option value="">— Choisir —</option>
              <option>Dispatch</option>
              <option>Dplane</option>
              <option>Dvol</option>
              <option>Auth</option>
              <option>Dashboard</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;">Environnement</label>
            <select id="signal-env"
              style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;">
              <option value="">— Choisir —</option>
              <option>PROD</option>
              <option>Staging</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Upload capture -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;">Capture d'écran (optionnel)</label>
        <div id="signal-drop-zone"
          onclick="document.getElementById('signal-file-input').click()"
          ondragover="event.preventDefault();this.style.borderColor='#0f172a';"
          ondragleave="this.style.borderColor='#e2e8f0';"
          ondrop="signalHandleDrop(event)"
          style="border:2px dashed #e2e8f0;border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:all 0.15s;">
          <div style="font-size:24px;margin-bottom:6px;">📎</div>
          <div style="font-size:13px;color:#64748b;">Clique ou glisse une image ici</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:3px;">PNG, JPG, GIF — max 5 Mo</div>
        </div>
        <input type="file" id="signal-file-input" accept="image/*" style="display:none"
          onchange="signalHandleFile(this.files[0])">
        <div id="signal-preview" style="margin-top:8px;display:none;">
          <img id="signal-preview-img" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;max-height:160px;object-fit:contain;">
          <button onclick="signalRemoveScreenshot()"
            style="display:block;margin-top:6px;background:#fee2e2;color:#dc2626;border:none;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">
            ✕ Supprimer
          </button>
        </div>
      </div>

      <!-- Erreur -->
      <div id="signal-error" style="color:#dc2626;font-size:12px;display:none;"></div>

      <!-- Bouton envoyer -->
      <button onclick="signalSubmit()"
        style="background:#0f172a;color:white;border:none;padding:11px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%;margin-top:4px;">
        Envoyer le signalement ✉️
      </button>
    </div>
  `;
}

function signalSelectType(type) {
  _signalType = type;
  ['bug','evolution'].forEach(function(t) {
    var el = document.getElementById('stype-' + t);
    if (!el) return;
    el.style.borderColor = t === type ? '#0f172a' : '#e2e8f0';
    el.style.background  = t === type ? '#f8fafc' : 'white';
  });
  var bugFields = document.getElementById('signal-bug-fields');
  if (bugFields) bugFields.style.display = type === 'bug' ? 'block' : 'none';
}

// ===== GESTION FICHIER =====
function signalHandleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Image trop lourde (max 5 Mo).');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    _signalScreenshot = e.target.result; // base64
    var preview = document.getElementById('signal-preview');
    var img = document.getElementById('signal-preview-img');
    if (preview && img) {
      img.src = _signalScreenshot;
      preview.style.display = 'block';
    }
    var dropZone = document.getElementById('signal-drop-zone');
    if (dropZone) dropZone.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function signalHandleDrop(e) {
  e.preventDefault();
  var file = e.dataTransfer.files[0];
  if (file) signalHandleFile(file);
  var dropZone = document.getElementById('signal-drop-zone');
  if (dropZone) dropZone.style.borderColor = '#e2e8f0';
}

function signalRemoveScreenshot() {
  _signalScreenshot = null;
  var preview = document.getElementById('signal-preview');
  if (preview) preview.style.display = 'none';
  var dropZone = document.getElementById('signal-drop-zone');
  if (dropZone) dropZone.style.display = 'block';
  var input = document.getElementById('signal-file-input');
  if (input) input.value = '';
}

// ===== SOUMISSION =====
async function signalSubmit() {
  var titre       = (document.getElementById('signal-titre')       || {}).value || '';
  var description = (document.getElementById('signal-description') || {}).value || '';
  var zone        = (document.getElementById('signal-zone')        || {}).value || '';
  var env         = (document.getElementById('signal-env')         || {}).value || '';
  var errEl       = document.getElementById('signal-error');

  errEl.style.display = 'none';
  if (!titre.trim())       { errEl.textContent = 'Le titre est obligatoire.';       errEl.style.display = 'block'; return; }
  if (!description.trim()) { errEl.textContent = 'La description est obligatoire.'; errEl.style.display = 'block'; return; }

  var btn = document.querySelector('#signal-content button[onclick="signalSubmit()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Envoi en cours…'; }

  try {
    var payload = {
      titre: titre.trim(),
      description: description.trim(),
      signale_par: currentUser ? currentUser.id : null,
      screenshot: _signalScreenshot || null
    };

    if (_signalType === 'bug') {
      payload.zone          = zone || null;
      payload.environnement = env  || null;
      payload.urgence       = null; // sera qualifié par l'admin
      payload.statut        = 'Nouveau';
      await db.from('dsp_bugs').insert(payload);
    } else {
      payload.statut = 'Nouvelle';
      await db.from('dsp_evolutions').insert(payload);
    }

    // Succès → afficher confirmation
    var content = document.getElementById('signal-content');
    if (content) {
      content.innerHTML = `
        <div style="text-align:center;padding:32px 16px;">
          <div style="font-size:52px;margin-bottom:16px;">✅</div>
          <h3 style="font-size:17px;font-weight:800;color:#0f172a;margin:0 0 8px;">Signalement envoyé !</h3>
          <p style="font-size:13px;color:#64748b;margin:0 0 24px;">
            Ton ${_signalType === 'bug' ? 'bug' : 'évolution'} a bien été transmis.<br>
            Tu peux suivre son avancement dans "Mes demandes".
          </p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button onclick="signalSwitchTab('mesDemandes')"
              style="background:#0f172a;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
              Voir mes demandes
            </button>
            <button onclick="signalSwitchTab('nouveau')"
              style="background:#f1f5f9;color:#374151;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
              Nouveau signalement
            </button>
          </div>
        </div>`;
    }
  } catch(e) {
    errEl.textContent = 'Erreur : ' + e.message;
    errEl.style.display = 'block';
    if (btn) { btn.disabled = false; btn.textContent = 'Envoyer le signalement ✉️'; }
  }
}

// ===== MES DEMANDES =====
async function signalRenderMesDemandes(container) {
  container.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;">Chargement…</div>`;

  try {
    var userId = currentUser ? currentUser.id : null;
    if (!userId) { container.innerHTML = '<p style="color:#ef4444;text-align:center;">Non connecté.</p>'; return; }

    const [bugs, evols] = await Promise.all([
      db.from('dsp_bugs').select('id,code,titre,statut,urgence,created_at').eq('signale_par', userId).order('created_at', { ascending: false }),
      db.from('dsp_evolutions').select('id,code,titre,statut,created_at').eq('soumis_par', userId).order('created_at', { ascending: false })
    ]);

    var all = [
      ...(bugs.data  || []).map(function(b) { return Object.assign({}, b, { _type: 'bug' }); }),
      ...(evols.data || []).map(function(e) { return Object.assign({}, e, { _type: 'evolution' }); })
    ].sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

    if (!all.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:#94a3b8;">
          <div style="font-size:36px;margin-bottom:12px;">📭</div>
          <p>Tu n'as encore aucune demande.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${all.map(function(item) {
          var code   = item.code || (item._type === 'bug' ? 'BUG-???' : 'EVOL-???');
          var icon   = item._type === 'bug' ? '🐛' : '💡';
          var date   = new Date(item.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
          var statut = item.statut || 'Nouveau';
          var color  = signalStatutColor(statut);
          return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <span style="font-size:18px;flex-shrink:0;">${icon}</span>
                <div style="min-width:0;">
                  <div style="font-weight:700;font-size:13px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.titre}</div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${code} · ${date}</div>
                </div>
              </div>
              <span style="background:${color.bg};color:${color.text};font-size:11px;font-weight:700;
                padding:4px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0;">${statut}</span>
            </div>`;
        }).join('')}
      </div>
    `;
  } catch(e) {
    container.innerHTML = '<p style="color:#ef4444;text-align:center;">Erreur : ' + e.message + '</p>';
  }
}

function signalStatutColor(statut) {
  var map = {
    'Nouveau':          { bg:'#f1f5f9', text:'#64748b' },
    'Nouvelle':         { bg:'#f1f5f9', text:'#64748b' },
    'En analyse':       { bg:'#eff6ff', text:'#1e40af' },
    'En correction':    { bg:'#fff7ed', text:'#9a3412' },
    'En staging':       { bg:'#f0fdf4', text:'#166534' },
    'Corrigé':          { bg:'#dcfce7', text:'#166534' },
    'En développement': { bg:'#fef9c3', text:'#854d0e' },
    'Acceptée':         { bg:'#dcfce7', text:'#166534' },
    'Refusée':          { bg:'#fee2e2', text:'#991b1b' },
    'Déployée':         { bg:'#dcfce7', text:'#166534' }
  };
  return map[statut] || { bg:'#f1f5f9', text:'#64748b' };
}
