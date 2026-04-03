// ===== DISPATCH INTELLIGENT =====
async function runDispatchIntelligent() {
  if (!confirm('Lancer le dispatch intelligent des dossiers non attribués ?')) return;

  await loadDossiers();
  const dossiers = allDossiers.filter(d => !d.gestionnaire && !d.traite);
  if (!dossiers.length) return showNotif('Aucun dossier à dispatcher', 'info');

  const { data: users, error } = await db
    .from('utilisateurs')
    .select('*')
    .eq('actif', true)
    .in('role', ['gestionnaire','superviseur']);

  if (error || !users?.length) {
    console.error(error);
    return showNotif('Aucun gestionnaire actif', 'error');
  }

  let idx = 0;
  const updates = [];
  for (const d of dossiers) {
    const user = users[idx % users.length];
    updates.push({
      id: d.id,
      gestionnaire: `${user.prenom} ${user.nom}`,
      statut: 'en_cours',
      date_attribution: new Date().toISOString()
    });
    idx++;
  }

  for (const u of updates) {
    const { error: upErr } = await db.from('dossiers').update({
      gestionnaire: u.gestionnaire,
      statut: u.statut,
      date_attribution: u.date_attribution
    }).eq('id', u.id);
    if (upErr) console.error(upErr);
  }

  showNotif(`${updates.length} dossiers dispatchés`, 'success');
  renderDispatch();
}

async function getNombreBlocs(nomGestionnaire) {
  const dossiers = allDossiers.filter(d => d.gestionnaire === nomGestionnaire && !d.traite);
  return dossiers.length;
}
