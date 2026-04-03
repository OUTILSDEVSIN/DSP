// ===== HABILITATIONS =====
async function loadHabilitations() {
  if (!currentUserData?.id) return null;
  const { data, error } = await db
    .from('habilitations')
    .select('*')
    .eq('user_id', currentUserData.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    currentHabilitations = null;
    return null;
  }
  currentHabilitations = data || null;
  return currentHabilitations;
}

function canUseDispatchIntelligent() {
  return !!currentHabilitations?.dispatch_intelligent;
}

function canImportDossiers() {
  return !!currentHabilitations?.import_dossiers;
}
