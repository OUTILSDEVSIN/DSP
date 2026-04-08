// ===== SYSTÈME TROCS =====
let trocModeActive = false;
let dossiersSelectionnes = [];
let trocsPanelOpen = false;

// IDs de dossiers actuellement en troc (pour bloquer le bouton traiter)
window.dossiersTrocEnCours = new Set();

// Charge les trocs actifs depuis Supabase et met à jour dossiersTrocEnCours
async function loadTrocsEnCours() {
  const { data, error } = await db.from('trocs')
    .select('dossiers_proposes, status')
    .eq('status', 'en_attente');
  window.dossiersTrocEnCours = new Set();
  if (!error && data) {
    data.forEach(t => {
      (t.dossiers_proposes || []).forEach(id => window.dossiersTrocEnCours.add(String(id)));
    });
  }
}

// Toggle mode troc OU ouvrir le panel selon état
function toggleTrocMode() {
  // Si le panel est ouvert, on le ferme et on bascule en mode sélection
  if (trocsPanelOpen) {
    closeTrocsPanel();
    return;
  }
  trocModeActive = !trocModeActive;
  const tbody = document.querySelector('tbody');
  const btnTroc = document.getElementById('btn-troc');
  const trocBar = document.getElementById('troc-selection-bar');

  if (trocModeActive) {
    if (tbody) tbody.classList.add('troc-mode');
    if (btnTroc) btnTroc.style.display = 'none';
    if (trocBar) trocBar.style.display = 'flex';
    dossiersSelectionnes = [];
    document.querySelectorAll('.troc-check-col').forEach(el => el.style.display = '');
    updateTrocCount();
  } else {
    if (tbody) tbody.classList.remove('troc-mode');
    if (btnTroc) btnTroc.style.display = ['gestionnaire', 'admin'].includes(currentUserData.role) ? 'inline-flex' : 'none';
    if (trocBar) trocBar.style.display = 'none';
    document.querySelectorAll('.troc-check-col').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
    dossiersSelectionnes = [];
  }
}

// Ouvrir le panel trocs en cours
async function openTrocsPanel() {
  const existing = document.getElementById('trocs-panel-modal');
  if (existing) existing.remove();
  trocsPanelOpen = true;

  // Charger tous les trocs en attente
  const { data: trocs, error } = await db.from('trocs')
    .select('id, from_id, to_id, dossiers_proposes, status, created_at')
    .eq('status', 'en_attente')
    .order('created_at', { ascending: false });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'trocs-panel-modal';
  overlay.onclick = e => { if (e.target === overlay) closeTrocsPanel(); };

  const panel = document.createElement('div');
  panel.className = 'modal';
  panel.style.cssText = 'max-width:560px;text-align:left;max-height:80vh;display:flex;flex-direction:column;';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
  header.innerHTML = '<h2 style="margin:0">⇄ Trocs en cours</h2>'
    + '<button onclick="closeTrocsPanel()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;">×</button>';
  panel.appendChild(header);

  // Onglets
  const tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:0;border-bottom:2px solid #eee;margin-bottom:16px;';
  tabs.innerHTML = '<button id="tab-en-cours" onclick="switchTrocTab(\'en-cours\')" style="padding:8px 18px;border:none;background:none;font-weight:700;color:#e67e22;border-bottom:2px solid #e67e22;cursor:pointer;margin-bottom:-2px;">En attente</button>'
    + '<button id="tab-nouveau" onclick="switchTrocTab(\'nouveau\')" style="padding:8px 18px;border:none;background:none;font-weight:400;color:#888;cursor:pointer;">Nouveau troc</button>';
  panel.appendChild(tabs);

  // Corps — liste trocs
  const body = document.createElement('div');
  body.id = 'troc-panel-body';
  body.style.cssText = 'overflow-y:auto;flex:1;';

  if (error || !trocs || trocs.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#aaa;">⇄<br><br>Aucun troc en attente.</div>';
  } else {
    trocs.forEach(t => {
      const from = (allUsers || []).find(u => u.id === t.from_id);
      const to = (allUsers || []).find(u => u.id === t.to_id);
      const dossierRefs = (t.dossiers_proposes || []).map(id => {
        const d = (allDossiers || []).find(x => String(x.id) === String(id));
        return d ? d.ref_sinistre : 'ID ' + id;
      });
      const isFromMe = t.from_id === currentUserData.id;
      const isToMe = t.to_id === currentUserData.id;
      const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';

      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid #f0c36d;background:#fffbea;border-radius:8px;padding:12px 14px;margin-bottom:10px;';
      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        + '<span style="font-weight:700;font-size:13px;">' + (from ? from.prenom + ' ' + from.nom : '?') + ' → ' + (to ? to.prenom + ' ' + to.nom : '?') + '</span>'
        + '<span style="font-size:11px;color:#aaa;">' + dateStr + '</span>'
        + '</div>'
        + '<div style="font-size:12px;color:#555;margin-bottom:10px;">Dossiers proposés : '
        + dossierRefs.map(r => '<span style="display:inline-block;background:#fff3cd;border:1px solid #f39c12;border-radius:4px;padding:1px 6px;margin:2px;font-weight:600;color:#b45309;">' + r + '</span>').join('')
        + '</div>'
        + ((isFromMe || isToMe || ['admin','manager'].includes(currentUserData.role))
          ? '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-danger" style="font-size:12px;padding:4px 10px;" onclick="annulerTrocById(\''+t.id+'\')">❌ Annuler</button>'
            + (isToMe ? '<button class="btn btn-success" style="font-size:12px;padding:4px 10px;" onclick="accepterTrocById(\''+t.id+'\')">✅ Accepter</button>' : '')
            + '</div>'
          : '');
      body.appendChild(card);
    });
  }
  panel.appendChild(body);

  // Bouton nouveau troc en bas
  const footer = document.createElement('div');
  footer.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #eee;';
  footer.innerHTML = '<button class="btn btn-primary" style="width:100%;" onclick="closeTrocsPanelAndSelect()">+ Proposer un nouveau troc</button>';
  panel.appendChild(footer);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

function closeTrocsPanel() {
  const el = document.getElementById('trocs-panel-modal');
  if (el) el.remove();
  trocsPanelOpen = false;
}

function closeTrocsPanelAndSelect() {
  closeTrocsPanel();
  // Activer directement le mode sélection
  trocModeActive = false;
  toggleTrocMode();
}

function switchTrocTab(tab) {
  // Inutilisé pour l’instant, les onglets ferment et réouvrent le bon mode
}

// Clic bouton Troc : si trocs actifs existent → panel, sinon mode sélection direct
async function onBtnTrocClick() {
  const { count } = await db.from('trocs').select('id', { count: 'exact', head: true }).eq('status', 'en_attente');
  if (count && count > 0) {
    await openTrocsPanel();
  } else {
    trocModeActive = false;
    toggleTrocMode();
  }
}

// Annuler un troc
async function annulerTrocById(trocId) {
  await db.from('trocs').update({ status: 'annule' }).eq('id', trocId);
  await loadTrocsEnCours();
  closeTrocsPanel();
  await renderMesDossiers();
  showNotif('Troc annulé.', 'info');
}

// Accepter un troc
async function accepterTrocById(trocId) {
  await db.from('trocs').update({ status: 'accepte' }).eq('id', trocId);
  await loadTrocsEnCours();
  closeTrocsPanel();
  await renderMesDossiers();
  showNotif('✅ Troc accepté !', 'success');
}

// Update compteur sélection
function updateTrocCount() {
  const count = dossiersSelectionnes.length;
  const spanEl = document.getElementById('troc-count');
  const btnProp = document.getElementById('btn-troc-proposer');
  if (spanEl) spanEl.textContent = `${count} dossier${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
  if (btnProp) btnProp.disabled = count === 0;
}

// Modal proposer troc — pattern DOM natif
function openTrocModal() {
  const existing = document.getElementById('troc-propose-modal');
  if (existing) existing.remove();

  const gestionnaires = (allUsers || []).filter(u =>
    u.role === 'gestionnaire' && u.id !== currentUserData.id && u.actif !== false
  );

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'troc-propose-modal';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'max-width:460px;text-align:left';

  const titre = document.createElement('h2');
  titre.style.marginBottom = '16px';
  titre.textContent = '⇄ Proposer un troc';
  modal.appendChild(titre);

  const listWrap = document.createElement('div');
  listWrap.style.cssText = 'background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:10px 14px;margin-bottom:16px;max-height:160px;overflow-y:auto;';
  dossiersSelectionnes.forEach(d => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:4px 0;font-size:13px;border-bottom:1px solid #eee;';
    item.innerHTML = '📄 <strong>' + (d.nom || d.id) + '</strong>';
    listWrap.appendChild(item);
  });
  modal.appendChild(listWrap);

  const label = document.createElement('label');
  label.textContent = 'Destinataire :';
  label.style.cssText = 'font-weight:600;display:block;margin-bottom:6px;';
  modal.appendChild(label);

  const select = document.createElement('select');
  select.id = 'troc-destinataire';
  select.style.cssText = 'width:100%;padding:8px;border:1px solid var(--gray-300,#ddd);border-radius:var(--radius-sm,6px);margin-bottom:8px;';
  select.innerHTML = '<option value="">-- Choisir un gestionnaire --</option>'
    + gestionnaires.map(g => `<option value="${g.id}">${g.prenom} ${g.nom}</option>`).join('');
  modal.appendChild(select);

  const note = document.createElement('p');
  note.style.cssText = 'font-size:12px;color:#888;margin:0 0 18px;';
  note.textContent = 'Le destinataire choisira ses dossiers en échange.';
  modal.appendChild(note);

  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

  const btnAnnuler = document.createElement('button');
  btnAnnuler.className = 'btn btn-secondary';
  btnAnnuler.textContent = 'Annuler';
  btnAnnuler.onclick = () => closeModal('troc-propose-modal');

  const btnEnvoyer = document.createElement('button');
  btnEnvoyer.className = 'btn btn-primary';
  btnEnvoyer.textContent = '✉️ Envoyer';
  btnEnvoyer.onclick = () => envoyerTrocPropose();

  btns.appendChild(btnAnnuler);
  btns.appendChild(btnEnvoyer);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Envoyer proposition
async function envoyerTrocPropose() {
  const destinataireId = document.getElementById('troc-destinataire').value;
  if (!destinataireId) { showNotif('Choisissez un destinataire', 'error'); return; }

  const { error } = await db.from('trocs').insert({
    from_id: currentUserData.id,
    to_id: destinataireId,
    dossiers_proposes: dossiersSelectionnes.map(d => d.id),
    status: 'en_attente'
  });

  closeModal('troc-propose-modal');
  toggleTrocMode();
  await loadTrocsEnCours();

  if (!error) {
    showNotif('Proposition envoyée !', 'success');
    // FIX: utiliser httpSend() à la place de send() pour éviter le warning Realtime
    try {
      await db.channel('trocs-notif').httpSend({
        type: 'broadcast',
        event: 'nouveau_troc',
        payload: { from_id: currentUserData.id, dossiers: dossiersSelectionnes.length }
      });
    } catch(e) {
      // httpSend non critique, on ignore l'erreur silencieusement
    }
    await renderMesDossiers();
  } else {
    showNotif('Erreur lors de l\'envoi : ' + error.message, 'error');
  }
}

// Realtime troc — écoute les nouvelles propositions
function setupTrocRealtime() {
  db.channel('trocs-notif')
    .on('broadcast', { event: 'nouveau_troc' }, async ({ payload }) => {
      await loadTrocsEnCours();
      showTrocPopup(payload);
      await renderMesDossiers();
    })
    .subscribe();
}

// Popup réception troc
function showTrocPopup(payload) {
  const existing = document.getElementById('troc-popup-modal');
  if (existing) existing.remove();
  const exp = (allUsers || []).find(u => u.id === payload.from_id);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'troc-popup-modal';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'max-width:400px;text-align:center';
  modal.innerHTML = '<h3 style="margin-bottom:10px">⇄ ' + (exp?.prenom || 'Un collègue') + ' vous propose un troc</h3>'
    + '<div style="margin:12px 0;font-size:14px"><strong>' + payload.dossiers + ' dossier' + (payload.dossiers > 1 ? 's' : '') + '</strong></div>'
    + '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">'
    + '<button class="btn btn-secondary" onclick="closeModal(\'troc-popup-modal\')">👀 Voir plus tard</button>'
    + '<button class="btn btn-primary" onclick="closeModal(\'troc-popup-modal\');openTrocsPanel()">⇄ Voir le troc</button>'
    + '</div>';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Écoute clics sur les cases troc
document.addEventListener('click', e => {
  if (!trocModeActive) return;
  const cb = e.target.closest('.row-check');
  if (!cb) return;
  const row = cb.closest('tr');
  if (!row) return;
  const dossierId = row.dataset.dossierId;
  const dossierNom = row.dataset.dossierNom || dossierId;
  const idx = dossiersSelectionnes.findIndex(d => d.id === dossierId);
  if (idx >= 0) {
    dossiersSelectionnes.splice(idx, 1);
    cb.checked = false;
  } else {
    dossiersSelectionnes.push({ id: dossierId, nom: dossierNom });
    cb.checked = true;
  }
  updateTrocCount();
});

// Admin ET gestionnaire voient le bouton au chargement
function initTrocButton() {
  if (!currentUserData) return;
  if (['gestionnaire', 'admin'].includes(currentUserData.role)) {
    const btn = document.getElementById('btn-troc');
    if (btn) btn.style.display = 'inline-flex';
  }
}

// ===== FIN TROCS =====
