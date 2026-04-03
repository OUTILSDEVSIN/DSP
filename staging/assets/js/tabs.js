// ===== TABS =====
function buildTabs() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const tabs = [{ id: 'dashboard', label: '📊 Tableau de bord' }];

  if (['admin','manager','superviseur'].includes(role)) tabs.push({ id: 'dispatch',      label: '📦 Dispatch' });
  tabs.push({ id: 'mes_dossiers', label: '📁 Mes dossiers' });
  tabs.push({ id: 'trocs',        label: '🔁 Trocs' });
  if (['admin','manager'].includes(role))               tabs.push({ id: 'utilisateurs',  label: '👥 Utilisateurs' });
  if (role === 'admin')                                  tabs.push({ id: 'audit',         label: '🛡️ Audit' });

  const container = document.getElementById('tabs-container');
  container.innerHTML = tabs.map(tab =>
    `<div class="tab ${tab.id===currentTab?'active':''}" onclick="showTab('${tab.id}')">${tab.label}</div>`
  ).join('');
}

async function showTab(tabId) {
  currentTab = tabId;
  buildTabs();

  if (tabId === 'dashboard')     return renderDashboard();
  if (tabId === 'dispatch')      return renderDispatch();
  if (tabId === 'mes_dossiers')  return renderMesDossiers();
  if (tabId === 'trocs')         return renderTrocs();
  if (tabId === 'utilisateurs')  return renderUtilisateurs();
  if (tabId === 'audit')         return renderAudit();
}

// switchTool : bascule entre Dispatch (onglets+contenu) et Dplane
function switchTool(tool) {
  const tabsContainer   = document.getElementById('tabs-container');
  const mainContent     = document.getElementById('main-content');
  const dplaneScreen    = document.getElementById('dplane-screen');
  const btnDispatch     = document.getElementById('btn-tool-dispatch');
  const btnDplane       = document.getElementById('btn-tool-dplane');

  if (tool === 'dispatch') {
    if (tabsContainer) tabsContainer.style.display = '';
    if (mainContent)   mainContent.style.display   = '';
    if (dplaneScreen)  dplaneScreen.style.display   = 'none';
  } else {
    if (tabsContainer) tabsContainer.style.display = 'none';
    if (mainContent)   mainContent.style.display   = 'none';
    if (dplaneScreen)  dplaneScreen.style.display   = 'block';
    if (typeof dplaneInit === 'function') dplaneInit();
  }

  if (btnDispatch) btnDispatch.classList.toggle('active', tool === 'dispatch');
  if (btnDplane)   btnDplane.classList.toggle('active',   tool === 'dplane');
}
