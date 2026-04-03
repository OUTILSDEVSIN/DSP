// ===== DISPATCH =====
async function loadDossiers() {
  const { data, error } = await db
    .from('dossiers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    showNotif('Erreur chargement dossiers', 'error');
    allDossiers = [];
    return [];
  }

  allDossiers = data || [];
  return allDossiers;
}

async function renderDispatch() {
  await loadDossiers();
  const role = getEffectiveRole();

  let actions = '';
  if (['admin','manager','superviseur'].includes(role)) {
    actions += `<button class="btn btn-primary" onclick="runDispatchIntelligent()">⚡ Dispatch intelligent</button>`;
  }
  if (['admin','manager'].includes(role) || canImportDossiers()) {
    actions += `<button class="btn btn-secondary" onclick="showImportModal()">📥 Import</button>`;
  }

  const rows = allDossiers
    .filter(d => !filterGestionnaire || d.gestionnaire === filterGestionnaire)
    .filter(d => !filterStatut || d.statut === filterStatut)
    .filter(d => !searchQuery || JSON.stringify(d).toLowerCase().includes(searchQuery.toLowerCase()))
    .map(d => `
      <tr>
        <td><input type="checkbox" class="row-check" onchange="updateSelectionCount()"></td>
        <td>${escapeHtml(d.numero_dossier || '-')}</td>
        <td>${escapeHtml(d.nom_client || '-')}</td>
        <td>${escapeHtml(d.gestionnaire || '-')}</td>
        <td>${badgeStatut(d.statut)}</td>
        <td>${formatDateFR(d.date_reception)}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="attribuerDossier(${d.id})">Attribuer</button>
          <button class="btn btn-sm btn-success" onclick="marquerTraite(${d.id})">Traiter</button>
        </td>
      </tr>`).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <h2>📦 Dispatch des dossiers</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${actions}</div>
      </div>
      <div class="filters">
        <input class="search-bar" placeholder="Rechercher..." value="${escapeHtml(searchQuery)}" oninput="searchQuery=this.value; renderDispatch()">
        <span style="font-size:12px;color:var(--gray-600);">Sélection : <strong id="selection-count">0</strong></span>
      </div>
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" onchange="toggleSelectAll(this)"></th>
            <th>Dossier</th>
            <th>Client</th>
            <th>Gestionnaire</th>
            <th>Statut</th>
            <th>Date réception</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7">Aucun dossier</td></tr>'}</tbody>
      </table>
    </div>`;
}
