// ===== IMPORT =====
function renderImport() {
  document.getElementById('main-content').innerHTML = `
    <div class="upload-zone" onclick="document.getElementById('file-input').click()">
      <div class="icon">📂</div>
      <h3>Cliquez pour importer un fichier Excel</h3>
      <p>Formats acceptés : .xlsx, .xls</p>
    </div>
    <input type="file" id="file-input" accept=".xlsx,.xls" onchange="handleFile(event)">
    <div id="import-result"></div>`;
}

function detectPortefeuille(refContrat) {
  const r = (refContrat || '').toUpperCase();
  if (r.includes('OPTI')) return 'OPTINEO';
  return 'MIA';
}

// BUG-03 (14/05/2026) :
// L'ancienne version retournait 'Habitation' alors que les habilitations
// gestionnaires stockent 'MRH'. Conséquence : 12 dossiers MRH non attribués
// en PROD début mai 2026. On lit désormais la colonne canonique 'Branche'
// du fichier source (valeurs : AUTO / MRH / VSP) pour stocker le code
// métier attendu en base.
function mapTypeFromBranche(branche) {
  const b = (branche || '').toUpperCase().trim();
  if (b === 'MRH')  return 'MRH';
  if (b === 'AUTO') return 'Auto';
  if (b === 'VSP')  return 'Auto'; // VSP = Véhicule Sans Permis → traité comme Auto
  return 'Auto'; // fallback prudent si Branche absente
}

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const workbook = XLSX.read(e.target.result, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) { showNotif('Fichier vide ou format incorrect.', 'error'); return; }

    const firstRow = rows[0];
    const normalize = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const keyMap = {};
    Object.keys(firstRow).forEach(k => { keyMap[normalize(k)] = k; });
    const formatDateVal = (v) => {
      if (!v) return '';
      // Si c'est déjà une date JS ou une string parseable
      var d = (v instanceof Date) ? v : new Date(v);
      if (!isNaN(d.getTime())) {
        var dd = String(d.getDate()).padStart(2,'0');
        var mm = String(d.getMonth()+1).padStart(2,'0');
        var yyyy = d.getFullYear();
        return dd + '/' + mm + '/' + yyyy;
      }
      return String(v).trim();
    };
    const get = (r, ...candidates) => {
      for (const c of candidates) {
        const norm = normalize(c);
        if (keyMap[norm] !== undefined && r[keyMap[norm]] !== undefined && r[keyMap[norm]] !== '') {
          var raw = r[keyMap[norm]];
          return (raw instanceof Date) ? formatDateVal(raw) : String(raw).trim();
        }
      }
      return '';
    };

    document.getElementById('import-result').innerHTML = '<div class="loading">Import en cours...</div>';

    const mapped = rows.map(r => ({
      ref_sinistre: get(r, 'Ref sinistre', 'Réf. sinistre', 'Ref. sinistre', 'REF SINISTRE', 'ref_sinistre'),
      // AMÉLIO-01 (14/05/2026) : on n'utilise plus 'Date Etat' (instable, modifiée
      // entre deux exports). On lit 'Date création' qui est la date d'ouverture
      // réelle du sinistre et reste stable.
      date_creation: get(r, 'Date création', 'Date creation', 'date_creation', 'DateCreation', 'DATE CREATION'),
      ref_contrat: get(r, 'Ref contrat', 'Réf. contrat', 'Ref. contrat', 'REF CONTRAT', 'ref_contrat'),
      // BUG-04 (14/05/2026) : on ne fallback plus sur la colonne 'Nature' si
      // 'Nature MIN' est vide. Sinon on stocke le libellé long (ex: "Cambriolage
      // ou tentative de cambriolage") dans le champ code court → casse les
      // habilitations qui attendent VOL/BDG/MAT/INC/DDE/AUTRE.
      nature: get(r, 'Nature MIN', 'nature_min', 'NATURE MIN'),
      // Le libellé long va dans nature_label (col "Nature" du SI)
      nature_label: get(r, 'Nature', 'Desc. Nature', 'nature_label', 'Libellé nature'),
      // BUG-03 (14/05/2026) : lecture directe de la Branche, code canonique
      // AUTO/MRH/VSP fourni par le SI. Plus de parsing fragile de la référence.
      type: mapTypeFromBranche(get(r, 'Branche', 'BRANCHE', 'branche')),
      portefeuille: detectPortefeuille(get(r, 'Ref contrat', 'Réf. contrat', 'Ref. contrat', 'REF CONTRAT', 'ref_contrat')),
    })).filter(d => d.ref_sinistre);

    if (!mapped.length) {
      showNotif('Aucune ligne valide trouvée. Vérifiez les noms de colonnes.', 'error');
      document.getElementById('import-result').innerHTML = '';
      return;
    }

    // ── DÉTECTION RE-IMPORT ────────────────────────────────────
    await loadDossiers();
    const existingRefs = new Map(allDossiers.map(d => [d.ref_sinistre, d]));
    const isReimport = existingRefs.size > 0;

    let nouveaux = [], relances = [], ignores = 0;

    for (const row of mapped) {
      const existing = existingRefs.get(row.ref_sinistre);
      if (!existing) {
        // Nouveau dossier
        nouveaux.push({ ...row, gestionnaire: '', traite: false, verrouille: false, statut: 'nonattribue' });
      } else if (existing.traite) {
        // Dossier traité → relancé
        relances.push(existing);
      } else {
        // Doublon non traité → mettre à jour date_creation si elle a changé
        // (cas rare puisque la date de création est censée être stable, mais on
        // garde la mise à jour défensive au cas où le SI source la corrige).
        if (row.date_creation) {
          await db.from('dossiers').update({ date_creation: row.date_creation }).eq('id', existing.id);
        }
        ignores++;
      }
    }

    // Insérer les nouveaux
    if (nouveaux.length > 0) {
      const { error } = await db.from('dossiers').insert(nouveaux);
      if (error) { showNotif('Erreur import : ' + error.message, 'error'); return; }
    }

    // Relancer les dossiers traités
    let relancesNotif = [];
    for (const d of relances) {
      await db.from('dossiers').update({
        statut: 'ouvert',
        traite: false,
        verrouille: true,
        traite_at: null
      }).eq('id', d.id);
      relancesNotif.push({ ref: d.ref_sinistre, gestionnaire: d.gestionnaire });
    }

    // Notifications temps réel pour les gestionnaires relancés
    if (relancesNotif.length > 0) {
      // Marquer en sessionStorage pour affichage dans renderMesDossiers
      const existingRelances = JSON.parse(safeSession.getItem('relances_notif') || '[]');
      const merged = [...existingRelances, ...relancesNotif.map(r => r.ref)];
      safeSession.setItem('relances_notif', JSON.stringify(merged));
    }

    await auditLog('IMPORT_EXCEL', (isReimport ? 'RE-IMPORT' : 'IMPORT') + ' -- ' + nouveaux.length + ' nouveaux, ' + relances.length + ' relancés, ' + ignores + ' ignorés');

    await loadDossiers();
    await loadAllUsers();

    // ── BOÎTE DE DIALOGUE RÉSUMÉ ───────────────────────────────
    showImportSummaryModal(nouveaux.length, relances.length, ignores, relancesNotif, isReimport);
  };
  reader.readAsArrayBuffer(file);
}

