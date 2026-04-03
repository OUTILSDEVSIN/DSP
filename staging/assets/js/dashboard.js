// ===== DASHBOARD =====
async function renderDashboard() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement…</div>';
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const isManagerOrAbove = ['admin', 'manager', 'superviseur'].includes(role);

  // Récupère les dossiers visibles
  let query = db.from('dossiers').select('*');
  if (!isManagerOrAbove) query = query.eq('attribué_à', currentUserData.id);
  const { data, error } = await query;
  if (error) { console.error('[renderDashboard]', error); return; }

  const dossiers = data || [];
  const total       = dossiers.length;
  const nonTraites  = dossiers.filter(d => d.statut === 'non_traite').length;
  const enCours     = dossiers.filter(d => d.statut === 'en_cours').length;
  const traites     = dossiers.filter(d => d.statut === 'traite').length;
  const bloques     = dossiers.filter(d => d.statut === 'bloque').length;

  document.getElementById('main-content').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total dossiers</div>
        <div class="kpi-value">${total}</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-label">Non traités</div>
        <div class="kpi-value">${nonTraites}</div>
      </div>
      <div class="kpi-card kpi-info">
        <div class="kpi-label">En cours</div>
        <div class="kpi-value">${enCours}</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-label">Traités</div>
        <div class="kpi-value">${traites}</div>
      </div>
      <div class="kpi-card kpi-danger">
        <div class="kpi-label">Bloqués</div>
        <div class="kpi-value">${bloques}</div>
      </div>
    </div>`;
}
