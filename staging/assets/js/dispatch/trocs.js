// ===== TROCS =====
async function renderTrocs() {
  const { data, error } = await db
    .from('trocs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return showNotif('Erreur chargement trocs', 'error');
  }

  const rows = (data || []).map(t => `
    <tr>
      <td>${formatDateFR(t.created_at)}</td>
      <td>${escapeHtml(t.demandeur || '-')}</td>
      <td>${escapeHtml(t.cible || '-')}</td>
      <td>${escapeHtml(t.statut || '-')}</td>
    </tr>`).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="table-container">
      <div class="table-toolbar"><h2>🔁 Trocs</h2></div>
      <table>
        <thead><tr><th>Date</th><th>Demandeur</th><th>Cible</th><th>Statut</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">Aucun troc</td></tr>'}</tbody>
      </table>
    </div>`;
}
