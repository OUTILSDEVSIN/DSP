// ===== ATTRIBUTION =====
async function attribuerDossier(id) {
  const { data: users, error } = await db
    .from('utilisateurs')
    .select('*')
    .eq('actif', true)
    .in('role', ['gestionnaire','superviseur'])
    .order('nom');

  if (error) return showNotif('Erreur chargement utilisateurs', 'error');

  const options = (users || []).map(u =>
    `<option value="${u.prenom} ${u.nom}">${u.prenom} ${u.nom}</option>`
  ).join('');

  const html = `
    <div class="modal-overlay active" id="attrib-modal-overlay">
      <div class="modal">
        <div class="modal-title">👤 Attribuer le dossier</div>
        <div class="form-group">
          <label>Gestionnaire</label>
          <select id="attrib-user" class="form-control">${options}</select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal('attrib-modal-overlay')">Annuler</button>
          <button class="btn btn-primary" onclick="saveAttribution(${id})">Attribuer</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveAttribution(id) {
  const gestionnaire = document.getElementById('attrib-user').value;
  const { error } = await db.from('dossiers').update({
    gestionnaire,
    statut: 'en_cours',
    date_attribution: new Date().toISOString()
  }).eq('id', id);

  if (error) return showNotif('Erreur attribution', 'error');
  closeModal('attrib-modal-overlay');
  showNotif('Dossier attribué', 'success');
  renderDispatch();
}

async function marquerTraite(id) {
  const { error } = await db.from('dossiers').update({
    traite: true,
    statut: 'traite',
    date_traitement: new Date().toISOString()
  }).eq('id', id);

  if (error) return showNotif('Erreur mise à jour', 'error');
  showNotif('Dossier traité', 'success');
  if (currentTab === 'dispatch') renderDispatch();
  if (currentTab === 'mes_dossiers') renderMesDossiers();
}
