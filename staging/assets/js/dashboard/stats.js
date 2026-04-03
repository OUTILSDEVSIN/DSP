// ===== DASHBOARD STATS =====
function renderDashboardStats(dossiers) {
  const byGestionnaire = {};
  const byStatut = {};

  dossiers.forEach(d => {
    const g = d.gestionnaire || 'Non attribué';
    const s = d.statut || 'non_traite';
    byGestionnaire[g] = (byGestionnaire[g] || 0) + 1;
    byStatut[s] = (byStatut[s] || 0) + 1;
  });

  const topGestionnaires = Object.entries(byGestionnaire)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nom, nb]) => `<tr><td>${escapeHtml(nom)}</td><td>${nb}</td></tr>`)
    .join('');

  const statsHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
      <div class="table-container">
        <div class="table-toolbar"><h2>📈 Répartition par gestionnaire</h2></div>
        <table>
          <thead><tr><th>Gestionnaire</th><th>Nb dossiers</th></tr></thead>
          <tbody>${topGestionnaires || '<tr><td colspan="2">Aucune donnée</td></tr>'}</tbody>
        </table>
      </div>
      <div class="table-container">
        <div class="table-toolbar"><h2>📊 Répartition par statut</h2></div>
        <table>
          <thead><tr><th>Statut</th><th>Nb dossiers</th></tr></thead>
          <tbody>
            <tr><td>Non traités</td><td>${byStatut.non_traite || 0}</td></tr>
            <tr><td>En cours</td><td>${byStatut.en_cours || 0}</td></tr>
            <tr><td>Traités</td><td>${byStatut.traite || 0}</td></tr>
            <tr><td>Bloqués</td><td>${byStatut.bloque || 0}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('dashboard-stats').innerHTML = statsHtml;
}
