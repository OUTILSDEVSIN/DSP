// ===== MES DOSSIERS =====
// PAGE_SIZE est défini dans config.js — ne pas redéclarer ici
let currentPage         = 1;
let allDossiers         = [];
let filteredDossiers    = [];
let currentFilters      = {};
let currentDossierIds   = [];

async function renderMesDossiers() {
  document.getElementById('main-content').innerHTML = '<div class="loading">Chargement…</div>';
  await fetchMesDossiers();
  renderDossiersTable();
}

async function fetchMesDossiers() {
  const { data, error } = await db
    .from('dvol_dossiers')
    .select('*, gestionnaire:utilisateurs!dvol_dossiers_gestionnaire_id_fkey(prenom,nom)')
    .eq('gestionnaire_id', currentUserData.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('[fetchMesDossiers]', error); allDossiers = []; return; }
  allDossiers = data || [];
  filteredDossiers = allDossiers.slice();
  currentPage = 1;
}

function renderDossiersTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredDossiers.slice(start, start + PAGE_SIZE);
  const total = filteredDossiers.length;
  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  let rows = '';
  if (page.length === 0) {
    rows = '<tr><td colspan="8" style="text-align:center;color:#888;">Aucun dossier</td></tr>';
  } else {
    page.forEach(d => {
      rows += `
        <tr>
          <td><input type="checkbox" class="row-check" value="${d.id}" onchange="updateSelectionCount()"></td>
          <td>${escapeHtml(d.numero_dossier || '-')}</td>
          <td>${escapeHtml(d.assure_nom     || '-')}</td>
          <td>${escapeHtml(d.compagnie      || '-')}</td>
          <td>${badgeStatut(d.statut)}</td>
          <td>${formatDateFR(d.date_declaration)}</td>
          <td>${escapeHtml(d.notes          || '-')}</td>
          <td>
            <button class="btn btn-secondary" style="padding:3px 8px;font-size:11px"
              onclick="showDetailDossier('${d.id}')">&#128065;</button>
          </td>
        </tr>`;
    });
  }

  document.getElementById('main-content').innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <h2>&#128193; Mes dossiers — <span id="selection-count">0</span> sélectionné(s)</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="exportCSVDossiers()">Exporter CSV</button>
          <button class="btn btn-success"   onclick="showQuickCommentModal()">Commenter</button>
          <button class="btn btn-warning"   onclick="toggleTraiteSelection()">Marquer traité</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" id="select-all" onchange="toggleSelectAll(this)"></th>
            <th>N° Dossier</th><th>Assuré</th><th>Compagnie</th>
            <th>Statut</th><th>Date déclaration</th><th>Notes</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="pagination" style="padding:10px 18px;display:flex;align-items:center;gap:12px;">
        <button class="btn btn-secondary" onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>&laquo;</button>
        <span>Page ${currentPage} / ${pages} &mdash; ${total} dossier(s)</span>
        <button class="btn btn-secondary" onclick="changePage(${currentPage + 1})" ${currentPage >= pages ? 'disabled' : ''}>&raquo;</button>
      </div>
    </div>`;
}

function changePage(n) {
  const pages = Math.ceil(filteredDossiers.length / PAGE_SIZE) || 1;
  currentPage = Math.max(1, Math.min(n, pages));
  renderDossiersTable();
}

async function toggleTraiteSelection() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => cb.value);
  if (!ids.length) return showNotif('Sélectionnez au moins un dossier', 'warning');
  const { error } = await db.from('dvol_dossiers').update({ statut: 'traite' }).in('id', ids);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif(`${ids.length} dossier(s) marqué(s) traité`, 'success');
  await auditLog('MARQUER_TRAITE', `${ids.length} dossier(s)`);
  await fetchMesDossiers();
  renderDossiersTable();
}

async function showQuickCommentModal() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => cb.value);
  if (!ids.length) return showNotif('Sélectionnez au moins un dossier', 'warning');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'comment-modal';
  modal.innerHTML = `
    <div class="modal">
      <h3>Ajouter un commentaire (${ids.length} dossier(s))</h3>
      <textarea id="quick-comment" rows="4" style="width:100%;padding:8px;border:1.5px solid var(--gray-300);border-radius:var(--radius-sm);font-size:13px" placeholder="Votre commentaire..."></textarea>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('comment-modal')">Annuler</button>
        <button class="btn btn-primary"   onclick="doQuickComment(${JSON.stringify(ids)})">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doQuickComment(ids) {
  const comment = document.getElementById('quick-comment')?.value.trim();
  if (!comment) return showNotif('Commentaire vide', 'warning');
  for (const id of ids) {
    await db.from('dvol_dossiers').update({ notes: comment }).eq('id', id);
  }
  closeModal('comment-modal');
  showNotif('Commentaire ajouté', 'success');
  await fetchMesDossiers();
  renderDossiersTable();
}

function exportCSVDossiers() {
  if (!filteredDossiers.length) return showNotif('Aucun dossier à exporter', 'warning');
  const header = ['numero_dossier','assure_nom','compagnie','statut','date_declaration','notes'];
  const lines  = [header.join(';'), ...filteredDossiers.map(d =>
    header.map(k => '"' + String(d[k] ?? '').replace(/"/g, '""') + '"').join(';')
  )];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'dossiers.csv' });
  a.click();
  URL.revokeObjectURL(url);
}
