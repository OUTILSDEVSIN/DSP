// ===== DISPATCH =====
let dispatchFilters = {};
let dispatchPage    = 1;
let allDispatch     = [];

async function renderDispatch() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  if (!['admin', 'manager', 'superviseur'].includes(role)) {
    document.getElementById('main-content').innerHTML = `<div class="card">Accès refusé.</div>`;
    return;
  }
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement…</div>';
  await loadAllUsers();
  await fetchDispatch();
  renderDispatchTable();
}

async function fetchDispatch() {
  const { data, error } = await db
    .from('dossiers')
    .select('*, attribué_à:utilisateurs!dossiers_attribué_à_fkey(id,prenom,nom)')
    .order('created_at', { ascending: false });
  if (error) { console.error('[fetchDispatch]', error); allDispatch = []; return; }
  allDispatch = data || [];
}

function renderDispatchTable() {
  const start  = (dispatchPage - 1) * PAGE_SIZE;
  const page   = allDispatch.slice(start, start + PAGE_SIZE);
  const total  = allDispatch.length;
  const pages  = Math.ceil(total / PAGE_SIZE) || 1;

  const gestionnaires = allUsers.filter(u => ['gestionnaire','superviseur'].includes(u.role));

  const rows = page.map(d => {
    const attrib = d.attribué_à;
    const current = attrib ? escapeHtml(attrib.prenom + ' ' + attrib.nom) : '<em>Non attribué</em>';
    const opts = gestionnaires.map(u =>
      `<option value="${u.id}"${attrib?.id === u.id ? ' selected' : ''}>${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}</option>`
    ).join('');
    return `
      <tr>
        <td><input type="checkbox" class="row-check" value="${d.id}" onchange="updateSelectionCount()"></td>
        <td>${escapeHtml(d.numero_sinistre || '-')}</td>
        <td>${escapeHtml(d.assure_nom      || '-')}</td>
        <td>${badgeStatut(d.statut)}</td>
        <td>${formatDateFR(d.date_sinistre)}</td>
        <td>${current}</td>
        <td>
          <select class="form-control form-control-sm" id="dispatch-select-${d.id}">
            <option value="">-- Choisir --</option>
            ${opts}
          </select>
        </td>
        <td>
          <button class="btn btn-primary" style="font-size:11px;padding:3px 8px"
            onclick="doDispatch('${d.id}')">Attribuer</button>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <h2>📦 Dispatch — <span id="selection-count">0</span> sélectionné(s)</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-success" onclick="showBulkDispatchModal()">Attribuer en masse</button>
          <button class="btn btn-info"    onclick="showImportModal()">Importer</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" id="select-all" onchange="toggleSelectAll(this)"></th>
            <th>N° Sinistre</th><th>Assuré</th><th>Statut</th><th>Date</th>
            <th>Attribué à</th><th>Attribuer à</th><th></th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center">Aucun dossier</td></tr>'}</tbody>
      </table>
      <div class="pagination">
        <button class="btn btn-secondary" onclick="changeDispatchPage(${dispatchPage - 1})" ${dispatchPage <= 1 ? 'disabled' : ''}>&laquo;</button>
        <span>Page ${dispatchPage} / ${pages} &mdash; ${total} dossier(s)</span>
        <button class="btn btn-secondary" onclick="changeDispatchPage(${dispatchPage + 1})" ${dispatchPage >= pages ? 'disabled' : ''}>&raquo;</button>
      </div>
    </div>`;
}

function changeDispatchPage(n) {
  const pages = Math.ceil(allDispatch.length / PAGE_SIZE) || 1;
  dispatchPage = Math.max(1, Math.min(n, pages));
  renderDispatchTable();
}

async function doDispatch(dossierId) {
  const userId = document.getElementById('dispatch-select-' + dossierId)?.value;
  if (!userId) return showNotif('Choisissez un gestionnaire', 'warning');
  const { error } = await db.from('dossiers').update({ attribué_à: userId }).eq('id', dossierId);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  const u = allUsers.find(x => x.id === userId);
  showNotif(`✅ Attribué à ${u?.prenom || ''} ${u?.nom || ''}`, 'success');
  await auditLog('DISPATCH', `Dossier ${dossierId} → ${userId}`);
  await fetchDispatch();
  renderDispatchTable();
}

function showBulkDispatchModal() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => cb.value);
  if (!ids.length) return showNotif('Sélectionnez au moins un dossier', 'warning');
  const gestionnaires = allUsers.filter(u => ['gestionnaire','superviseur'].includes(u.role));
  const opts = gestionnaires.map(u =>
    `<option value="${u.id}">${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}</option>`
  ).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'bulk-dispatch-modal';
  modal.innerHTML = `
    <div class="modal">
      <h3>Attribuer ${ids.length} dossier(s)</h3>
      <div class="form-group">
        <label>Gestionnaire</label>
        <select id="bulk-dispatch-select" class="form-control">
          <option value="">-- Choisir --</option>${opts}
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('bulk-dispatch-modal')">Annuler</button>
        <button class="btn btn-primary"   onclick="doBulkDispatch(${JSON.stringify(ids)})">Attribuer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doBulkDispatch(ids) {
  const userId = document.getElementById('bulk-dispatch-select')?.value;
  if (!userId) return showNotif('Choisissez un gestionnaire', 'warning');
  const { error } = await db.from('dossiers').update({ attribué_à: userId }).in('id', ids);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  const u = allUsers.find(x => x.id === userId);
  closeModal('bulk-dispatch-modal');
  showNotif(`✅ ${ids.length} dossier(s) attribué(s) à ${u?.prenom || ''} ${u?.nom || ''}`, 'success');
  await auditLog('DISPATCH_BULK', `${ids.length} dossiers → ${userId}`);
  await fetchDispatch();
  renderDispatchTable();
}
