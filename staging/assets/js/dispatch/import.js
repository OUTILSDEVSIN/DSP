// ===== IMPORT DOSSIERS =====
function showImportModal() {
  if (!canImportDossiers() && !['admin','manager'].includes(getEffectiveRole())) {
    return showNotif('Import non autorisé', 'error');
  }
  const html = `
    <div class="modal-overlay active" id="import-modal-overlay">
      <div class="modal">
        <div class="modal-title">📥 Importer des dossiers</div>
        <div class="form-group">
          <label>Fichier Excel (.xlsx)</label>
          <input type="file" id="import-file" class="form-control" accept=".xlsx,.xls">
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal('import-modal-overlay')">Annuler</button>
          <button class="btn btn-primary" onclick="importDossiersFromExcel()">Importer</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function importDossiersFromExcel() {
  const file = document.getElementById('import-file')?.files?.[0];
  if (!file) return showNotif('Aucun fichier sélectionné', 'error');

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!json.length) return showNotif('Fichier vide', 'error');

      const rows = json.map(r => ({
        numero_dossier: r.numero_dossier || r.Numero || r.Dossier || '',
        nom_client: r.nom_client || r.Client || '',
        date_reception: r.date_reception || new Date().toISOString(),
        statut: 'non_traite',
        traite: false,
        verrouille: false
      })).filter(r => r.numero_dossier);

      const { error } = await db.from('dossiers').insert(rows);
      if (error) throw error;

      closeModal('import-modal-overlay');
      showNotif(`${rows.length} dossiers importés`, 'success');
      if (currentTab === 'dispatch') renderDispatch();
    } catch (err) {
      console.error(err);
      showNotif('Erreur import fichier', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}
