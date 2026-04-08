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
    // Afficher les colonnes checkbox
    document.querySelectorAll('.troc-check-col').forEach(el => el.style.display = '');
    updateTrocCount();
  } else {
    if (tbody) tbody.classList.remove('troc-mode');
    // FIX: admin ET gestionnaire voient le bouton réapparaître
    if (btnTroc) btnTroc.style.display = ['gestionnaire', 'admin'].includes(currentUserData.role) ? 'inline-flex' : 'none';
    if (trocBar) trocBar.style.display = 'none';
    // Masquer et décocher les colonnes checkbox
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

// Modal proposer troc
function openTrocModal() {
  const gestionnaires = (allUsers || []).filter(u => u.role === 'gestionnaire' && u.id !== currentUserData.id && u.actif !== false);
  const modal = createModal(`
    <h2>↔️ Proposer un troc</h2>
    <div class="troc-dossier-list">
      ${dossiersSelectionnes.map(d => `<div class="troc-dossier-item"><span>📄 ${d.nom || d.id}</span></div>`).join('')}
    </div>
    <label>Destinataire :</label>
    <select id="troc-destinataire" style="width:100%;padding:8px;border:1px solid var(--gray-300);border-radius:var(--radius-sm);">
      ${gestionnaires.map(g => `<option value="${g.id}">${g.prenom} ${g.nom}</option>`).join('')}
    </select>
    <p style="font-size:12px;color:var(--gray-600);margin:12px 0 0;">Le destinataire choisira ses dossiers en échange</p>
    <div class="troc-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="envoyerTrocPropose()">✉️ Envoyer</button>
    </div>
  `, 'troc-modal');
}

// Envoyer proposition
async function envoyerTrocPropose() {
  const destinataireId = document.getElementById('troc-destinataire').value;
  if (!destinataireId) return showNotif('Choisissez un destinataire', 'error');

  const { error } = await db.from('trocs').insert({
    from_id: currentUserData.id,
    to_id: destinataireId,
    dossiers_proposes: dossiersSelectionnes.map(d => d.id),
    status: 'en_attente'
  });

  closeModal();
  toggleTrocMode();
  if (!error) {
    showNotif('Proposition envoyée !', 'success');
    await db.channel('trocs').send({
      type: 'broadcast',
      event: 'nouveau_troc',
      payload: { from_id: currentUserData.id, dossiers: dossiersSelectionnes.length }
    });
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
  const exp = allUsers.find(u => u.id === payload.from_id);
  createModal(`
    <h3>↔️ ${exp?.prenom || 'Un collègue'} vous propose un troc</h3>
    <div class="troc-dossiers-proposes">
      <strong>${payload.dossiers} dossier${payload.dossiers > 1 ? 's' : ''}</strong>
    </div>
    <div class="troc-actions">
      <button class="btn btn-danger" onclick="refuserTroc()">❌ Refuser</button>
      <button class="btn btn-warning" onclick="ouvrirContreProposition()">🔄 Contre-proposer</button>
      <button class="btn btn-success" onclick="accepterTroc()">✅ Accepter</button>
    </div>
  `, 'troc-popup');
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

// FIX: admin ET gestionnaire voient le bouton au chargement
function initTrocButton() {
  if (!currentUserData) return;
  if (['gestionnaire', 'admin'].includes(currentUserData.role)) {
    const btn = document.getElementById('btn-troc');
    if (btn) btn.style.display = 'inline-flex';
  }
}

// ===== FIN TROCS =====
