// ===== MES DOSSIERS =====
async function renderMesDossiers() {
  await loadDossiers();
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const dossiers = allDossiers.filter(d => d.gestionnaire === monNom);

  const rows = dossiers.map(d => `
    <tr>
      <td>${escapeHtml(d.numero_dossier || '-')}</td>
      <td>${escapeHtml(d.nom_client || '-')}</td>
      <td>${badgeStatut(d.statut)}</td>
      <td>${formatDateFR(d.date_reception)}</td>
      <td>${d.traite ? '✅' : '—'}</td>
      <td>
        ${!d.traite ? `<button class="btn btn-sm btn-success" onclick="marquerTraite(${d.id})">Traiter</button>` : ''}
        ${d.traite ? `<button class="btn btn-sm btn-secondary" onclick="recupererDossier(${d.id})">Récupérer</button>` : ''}
      </td>
    </tr>`).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <h2>📁 Mes dossiers</h2>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" onclick="demanderDossierSupp()">➕ Demander un dossier supp</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Dossier</th>
            <th>Client</th>
            <th>Statut</th>
            <th>Date réception</th>
            <th>Traité</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6">Aucun dossier</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function recupererDossier(id) {
  const { error } = await db.from('dossiers').update({
    traite: false,
    statut: 'en_cours',
    date_traitement: null
  }).eq('id', id);

  if (error) return showNotif('Erreur récupération', 'error');
  showNotif('Dossier récupéré', 'success');
  renderMesDossiers();
}
