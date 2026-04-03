// ===== AUDIT LOGS (R4 — Rétention 3 mois) =====

async function renderAudit() {
  // Guard : admin uniquement
  if (!currentUserData || getEffectiveRole() !== 'admin') {
    document.getElementById('main-content').innerHTML = `<div class="card">Accès refusé.</div>`;
    return;
  }

  const { data, error } = await db
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[renderAudit]', error);
    return showNotif('Erreur chargement audit', 'error');
  }

  const rows = (data || []).map(log => `
    <tr>
      <td>${formatDateFR(log.created_at)}</td>
      <td>${escapeHtml(log.actor   || '-')}</td>
      <td>${escapeHtml(log.action  || '-')}</td>
      <td>${escapeHtml(log.cible   || '-')}</td>
      <td>${escapeHtml(log.details || '-')}</td>
    </tr>`).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <h2>🛡️ Journal d'audit</h2>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-danger" onclick="confirmPurgeAuditLogs()">Purger +3 mois</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Acteur</th><th>Action</th><th>Cible</th><th>Détails</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5">Aucun log</td></tr>'}</tbody>
      </table>
    </div>`;
}

function confirmPurgeAuditLogs() {
  // Guard rôle avant même d'afficher la confirmation
  if (!currentUserData || getEffectiveRole() !== 'admin') {
    return showNotif('Accès refusé', 'error');
  }
  if (!confirm("Confirmer la purge des logs d'audit de plus de 3 mois ?\n\nCette action est irréversible.")) return;
  purgeAuditLogs();
}

async function purgeAuditLogs() {
  // Double guard — sécurité si appel direct
  if (!currentUserData || getEffectiveRole() !== 'admin') {
    return showNotif('Accès refusé', 'error');
  }

  const dateLimite = new Date();
  dateLimite.setMonth(dateLimite.getMonth() - 3);

  const { error } = await db
    .from('audit_logs')
    .delete()
    .lt('created_at', dateLimite.toISOString());

  if (error) {
    console.error('[purgeAuditLogs]', error);
    return showNotif('Erreur purge audit', 'error');
  }

  showNotif("Logs d'audit purgés", 'success');
  if (currentTab === 'audit') renderAudit();
}
