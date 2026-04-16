// ===== TABS =====
function buildTabs() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const tabs = [{ id: 'dashboard', label: '📊 Tableau de bord' }];
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'import', label: '📂 Importer Excel' });
  tabs.push({ id: 'attribution', label: '📋 Attribution' });
  tabs.push({ id: 'mesdossiers', label: '📁 Mes dossiers' });
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'utilisateurs', label: '👥 Équipe' });
  if (role === 'admin' || role === 'manager') tabs.push({ id: 'audit', label: '🔍 Journal d\'audit' });
  tabs.push({ id: 'stats', label: '📊 Stats' });
  const container = document.getElementById('tabs-container');
  container.innerHTML = tabs.map(t =>
    `<div class="tab" id="tab-${t.id}" onclick="showTab('${t.id}')">${t.label}</div>`
  ).join('');
}

function showTab(id) {
  // Reset filtres seulement si on QUITTE attribution
  if (currentTab === 'attribution' && id !== 'attribution') {
    searchQuery = '';
    window._fPortefeuille = ''; window._fType = ''; window._fNature = '';
    window._fStatut = ''; window._fGestionnaire = ''; window._fNonAttribue = false;
  }
  currentTab = id;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('tab-' + id);
  if (el) el.classList.add('active');
  if (id === 'dashboard') renderDashboard();
  else if (id === 'import') renderImport();
  else if (id === 'attribution') renderAttribution();
  else if (id === 'mesdossiers') renderMesDossiers();
  else if (id === 'utilisateurs') renderUtilisateurs();
  else if (id === 'audit') renderAuditLogs();
  else if (id === 'stats') renderStats();
}

// ===== TOOL SWITCHER (Dispatch / Dplane / Dvol) =====
function switchTool(tool) {
  // Masquer tous les écrans outils
  var screens = ['dispatch-screen', 'dplane-screen', 'dvol-screen'];
  screens.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Masquer aussi les zones principales de dispatch (tabs + content)
  var tabsContainer = document.getElementById('tabs-container');
  var mainContent   = document.getElementById('main-content');

  // Mettre à jour les boutons du tool switcher
  ['dispatch', 'dplane', 'dvol'].forEach(function(t) {
    var btn = document.getElementById('btn-tool-' + t);
    if (btn) btn.classList.toggle('active', t === tool);
  });

  if (tool === 'dispatch') {
    if (tabsContainer) tabsContainer.style.display = '';
    if (mainContent)   mainContent.style.display   = '';
    showTab(currentTab || 'dashboard');

  } else if (tool === 'dplane') {
    if (tabsContainer) tabsContainer.style.display = 'none';
    if (mainContent)   mainContent.style.display   = 'none';
    var dplaneScreen = document.getElementById('dplane-screen');
    if (dplaneScreen) dplaneScreen.style.display = '';
    if (typeof dplaneInit === 'function') dplaneInit();

  } else if (tool === 'dvol') {
    if (tabsContainer) tabsContainer.style.display = 'none';
    if (mainContent)   mainContent.style.display   = 'none';
    var dvolScreen = document.getElementById('dvol-screen');
    if (dvolScreen) dvolScreen.style.display = '';
    if (typeof dvolCharger === 'function') dvolCharger();
  }
}
// ===== FIN TOOL SWITCHER =====

// ===== LOAD DATA =====
async function loadAllUsers() {
  const { data } = await db.from('utilisateurs').select('id,nom,prenom,role,email,actif').eq('actif', true);
  allUsers = data || [];
}

async function loadDossiers() {
  const { data } = await db.from('dossiers').select('id,ref_sinistre,ref_contrat,nature,nature_label,type,portefeuille,gestionnaire,statut,traite,verrouille,created_at,demande_supp,date_etat,is_dvol,date_passage_dvol,traite_at').order('created_at', { ascending: true });
  allDossiers = data || [];
}
