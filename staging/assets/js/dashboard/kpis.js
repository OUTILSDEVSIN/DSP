// ===== DASHBOARD KPIS =====
async function renderDashboard() {
  await loadDossiers();
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;

  let dossiers = allDossiers || [];
  if (role === 'gestionnaire') {
    dossiers = dossiers.filter(d => d.gestionnaire === monNom);
  }

  const total = dossiers.length;
  const nonTraites = dossiers.filter(d => !d.traite && d.statut === 'non_traite').length;
  const enCours = dossiers.filter(d => !d.traite && d.statut === 'en_cours').length;
  const traites = dossiers.filter(d => d.traite).length;

  document.getElementById('main-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="number">${total}</div><div class="label">Total dossiers</div></div>
      <div class="stat-card"><div class="number">${nonTraites}</div><div class="label">Non traités</div></div>
      <div class="stat-card"><div class="number">${enCours}</div><div class="label">En cours</div></div>
      <div class="stat-card"><div class="number">${traites}</div><div class="label">Traités</div></div>
    </div>
    <div id="dashboard-stats"></div>
  `;

  renderDashboardStats(dossiers);
}
