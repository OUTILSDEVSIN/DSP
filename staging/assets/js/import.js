// ===== IMPORT FICHIER =====
function showImportModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'import-modal';
  modal.innerHTML = `
    <div class="modal">
      <h2 style="color:var(--navy);margin-bottom:16px">📥 Importer des dossiers</h2>
      <p style="font-size:13px;color:#888;margin-bottom:14px">Format attendu : CSV ou XLSX avec en-têtes.</p>
      <div class="form-group">
        <label>Fichier</label>
        <input type="file" id="import-file" class="form-control" accept=".csv,.xlsx">
      </div>
      <div class="modal-error" id="import-error" style="display:none;"></div>
      <div id="import-preview" style="margin-top:10px;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('import-modal')">Annuler</button>
        <button class="btn btn-primary"   onclick="doImport()">Importer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('import-file')?.addEventListener('change', previewImport);
}

let importData = [];

async function previewImport(e) {
  const file  = e.target.files?.[0];
  const errEl = document.getElementById('import-error');
  if (!file) return;
  if (errEl) errEl.style.display = 'none';

  try {
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      importData = parseCSV(text);
    } else if (file.name.endsWith('.xlsx')) {
      importData = await parseXLSX(file);
    } else {
      if (errEl) { errEl.textContent = 'Format non supporté (.csv ou .xlsx)'; errEl.style.display = 'block'; }
      return;
    }
    showImportPreview(importData);
  } catch (err) {
    console.error('[previewImport]', err);
    if (errEl) { errEl.textContent = 'Erreur lecture fichier : ' + err.message; errEl.style.display = 'block'; }
  }
}

function parseCSV(text) {
  const lines  = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

async function parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function showImportPreview(data) {
  const preview = document.getElementById('import-preview');
  if (!preview || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows    = data.slice(0, 5).map(row =>
    `<tr>${headers.map(h => `<td>${escapeHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`
  ).join('');
  preview.innerHTML = `
    <p style="font-size:12px;color:#888;margin-bottom:6px">Échantillon (${Math.min(5, data.length)} / ${data.length} lignes)</p>
    <div style="overflow-x:auto">
      <table style="font-size:12px">
        <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function doImport() {
  const errEl = document.getElementById('import-error');
  if (!importData.length) {
    if (errEl) { errEl.textContent = 'Aucune donnée à importer.'; errEl.style.display = 'block'; }
    return;
  }
  // Mapping des colonnes vers le schéma dossiers
  const toInsert = importData.map(row => ({
    numero_sinistre: row.numero_sinistre || row['N° Sinistre'] || row.numero || '',
    assure_nom:      row.assure_nom      || row['Assuré']     || row.assure || '',
    type_sinistre:   row.type_sinistre   || row['Type']       || '',
    statut:          row.statut          || 'non_traite',
    date_sinistre:   row.date_sinistre   || row['Date']       || null,
    commentaire:     row.commentaire     || ''
  })).filter(r => r.numero_sinistre);

  if (!toInsert.length) {
    if (errEl) { errEl.textContent = 'Aucune ligne valide (colonne numero_sinistre manquante ?).'; errEl.style.display = 'block'; }
    return;
  }

  const { error } = await db.from('dossiers').insert(toInsert);
  if (error) {
    if (errEl) { errEl.textContent = 'Erreur insertion : ' + error.message; errEl.style.display = 'block'; }
    return;
  }
  closeModal('import-modal');
  importData = [];
  showNotif(`✅ ${toInsert.length} dossier(s) importé(s)`, 'success');
  await auditLog('IMPORT', `${toInsert.length} dossiers importés`);
  await fetchDispatch?.();
  renderDispatch?.();
}
