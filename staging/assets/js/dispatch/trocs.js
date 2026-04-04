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
    tbody.classList.add('troc-mode');
    btnTroc.style.display = 'none';
    trocBar.style.display = 'flex';
    dossiersSelectionnes = [];
    updateTrocCount();
  } else {
    tbody.classList.remove('troc-mode');
    btnTroc.style.display = currentUserData.role === 'gestionnaire' ? 'inline-flex' : 'none';
    trocBar.style.display = 'none';
  }
}

// Update compteur sélection
function updateTrocCount() {
  const count = dossiersSelectionnes.length;
  document.getElementById('troc-count').textContent = `${count} dossier${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}(s)`;
  document.getElementById('btn-troc-proposer').disabled = count === 0;
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
    // Realtime notification au destinataire
    await db.channel('trocs').send({
      type: 'broadcast',
      event: 'nouveau_troc',
      payload: { from_id: currentUserData.id, dossiers: dossiersSelectionnes.length }
    });
  }
}

// Realtime troc (à ajouter au channel supabase_realtime)
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
    <div class="troc-dossiers-echange">
      <h4>Vos dossiers disponibles :</h4>
      ${/* Ici liste des dossiers non-traités avec checkboxes */ ''}
    </div>
    <div class="troc-actions">
      <button class="btn btn-danger" onclick="refuserTroc()">❌ Refuser</button>
      <button class="btn btn-warning" onclick="ouvrirContreProposition()">🔄 Contre-proposer</button>
      <button class="btn btn-success" onclick="accepterTroc()">✅ Accepter</button>
    </div>
  `, 'troc-popup');
}

// Toggle checkbox troc sur les lignes
document.addEventListener('click', e => {
  if (trocModeActive && e.target.classList.contains('row-check')) {
    const row = e.target.closest('tr');
    const dossierId = row.dataset.dossierId; // à adapter selon votre structure
    if (dossiersSelectionnes.some(d => d.id === dossierId)) {
      dossiersSelectionnes = dossiersSelectionnes.filter(d => d.id !== dossierId);
    } else {
      dossiersSelectionnes.push({ id: dossierId, nom: row.dataset.dossierNom });
    }
    e.target.checked = !e.target.checked;
    updateTrocCount();
  }
});

// Afficher bouton troc si gestionnaire (appelé après login)
function initTrocButton() {
  if (!currentUserData) return;
  if (currentUserData.role === 'gestionnaire') {
    const btn = document.getElementById('btn-troc');
    if (btn) btn.style.display = 'inline-flex';
  }
}

// ===== FIN TROCS =====
