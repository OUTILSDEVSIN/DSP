// ===== TROCS =====
let trocFilters = {};

async function renderTrocs() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement…</div>';
  await loadAllUsers();

  // Table correcte : dvol_dossiers — pas de jointure FK, résolution via allUsers
  const { data, error } = await db
    .from('dvol_dossiers')
    .select('*')
    .not('attribué_à', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[renderTrocs]', error);
    return showNotif('Erreur chargement trocs', 'error');
  }

  const dossiers = data || [];
  const autresGestionnaires = allUsers.filter(
    u => u.id !== currentUserData.id && ['gestionnaire','superviseur'].includes(u.role)
  );

  const rows = dossiers.map(d => {
    // Résolution du gestionnaire actuel via allUsers — cohérent avec dispatch.js
    const attrib = allUsers.find(u => u.id === d['attribué_à']);
    const nomActuel = attrib
      ? escapeHtml(attrib.prenom + ' ' + attrib.nom)
      : '<em>Non attribué</em>';

    const opts = autresGestionnaires.map(u =>
      `<option value="${u.id}">${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}</option>`
    ).join('');

    return `
      <tr>
        <td>${escapeHtml(d.numero_sinistre || '-')}</td>
        <td>${escapeHtml(d.assure_nom      || '-')}</td>
        <td>${badgeStatut(d.statut)}</td>
        <td>${nomActuel}</td>
        <td>
          <select class="form-control form-control-sm" id="troc-select-${d.id}">
            <option value="">-- Choisir --</option>
            ${opts}
          </select>
        </td>
        <td>
          <button class="btn btn-warning" style="font-size:11px;padding:3px 8px"
            onclick="doTroc('${d.id}')">Proposer</button>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <h2>🔁 Trocs de dossiers</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>N° Sinistre</th><th>Assuré</th><th>Statut</th><th>Gestionnaire actuel</th>
            <th>Transférer à</th><th></th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center">Aucun dossier</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function doTroc(dossierId) {
  const targetId = document.getElementById('troc-select-' + dossierId)?.value;
  if (!targetId) return showNotif('Choisissez un destinataire', 'warning');
  const { error } = await db.from('dvol_dossiers').update({ 'attribué_à': targetId }).eq('id', dossierId);
  if (error) return showNotif('Erreur troc : ' + error.message, 'error');
  const dest = allUsers.find(u => u.id === targetId);
  showNotif(`Dossier transféré à ${dest?.prenom || ''} ${dest?.nom || ''}`, 'success');
  await auditLog('TROC_DOSSIER', `Dossier ${dossierId} → ${targetId}`);
  renderTrocs();
}
