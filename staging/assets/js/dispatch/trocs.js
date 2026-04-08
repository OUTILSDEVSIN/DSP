// ===== SYSTÈME TROCS =====
let trocModeActive = false;
let dossiersSelectionnes = [];

// Toggle mode troc
function toggleTrocMode() {
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
    // FIX: admin ET gestionnaire voient le bouton réapparaître
    if (btnTroc) btnTroc.style.display = ['gestionnaire', 'admin'].includes(currentUserData.role) ? 'inline-flex' : 'none';
    if (trocBar) trocBar.style.display = 'none';
    document.querySelectorAll('.troc-check-col').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
    dossiersSelectionnes = [];
  }
}

// Update compteur sélection
function updateTrocCount() {
  const count = dossiersSelectionnes.length;
  const spanEl = document.getElementById('troc-count');
  const btnProp = document.getElementById('btn-troc-proposer');
  if (spanEl) spanEl.textContent = `${count} dossier${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
  if (btnProp) btnProp.disabled = count === 0;
}

// Modal proposer troc — pattern DOM natif (pas de createModal)
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

  // Titre
  const titre = document.createElement('h2');
  titre.style.marginBottom = '16px';
  titre.textContent = '⇄ Proposer un troc';
  modal.appendChild(titre);

  // Liste des dossiers sélectionnés
  const listWrap = document.createElement('div');
  listWrap.style.cssText = 'background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:10px 14px;margin-bottom:16px;max-height:160px;overflow-y:auto;';
  dossiersSelectionnes.forEach(d => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:4px 0;font-size:13px;border-bottom:1px solid #eee;';
    item.innerHTML = '📄 <strong>' + (d.nom || d.id) + '</strong>';
    listWrap.appendChild(item);
  });
  modal.appendChild(listWrap);

  // Sélection destinataire
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

  // Boutons
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

  if (!error) {
    showNotif('Proposition envoyée !', 'success');
    await db.channel('trocs').send({
      type: 'broadcast',
      event: 'nouveau_troc',
      payload: { from_id: currentUserData.id, dossiers: dossiersSelectionnes.length }
    });
  } else {
    showNotif('Erreur lors de l\'envoi : ' + error.message, 'error');
  }
}

// Realtime troc
function setupTrocRealtime() {
  db.channel('trocs')
    .on('broadcast', { event: 'nouveau_troc' }, ({ payload }) => {
      showTrocPopup(payload);
    })
    .subscribe();
}

// Popup realtime troc
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
    + '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px">'
    + '<button class="btn btn-danger" onclick="refuserTroc()">❌ Refuser</button>'
    + '<button class="btn btn-warning" onclick="ouvrirContreProposition()">🔄 Contre-proposer</button>'
    + '<button class="btn btn-success" onclick="accepterTroc()">✅ Accepter</button>'
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
