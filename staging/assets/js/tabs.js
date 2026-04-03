// ===== TABS =====
function buildTabs() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : (currentUserData?.role || 'gestionnaire');
  const tabs = [{ id: 'dashboard', label: '📊 Tableau de bord' }];

  if (['admin', 'manager', 'superviseur'].includes(role)) tabs.push({ id: 'dispatch',     label: '📦 Dispatch' });
  tabs.push({ id: 'mes_dossiers', label: '📁 Mes dossiers' });
  tabs.push({ id: 'trocs',        label: '🔁 Trocs' });
  if (['admin', 'manager'].includes(role))               tabs.push({ id: 'utilisateurs', label: '👥 Utilisateurs' });
  if (role === 'admin')                                   tabs.push({ id: 'audit',        label: '🛡️ Audit' });

  const container = document.getElementById('tabs-container');
  if (!container) return;
  container.innerHTML = tabs.map(tab =>
    `<div class="tab ${tab.id === currentTab ? 'active' : ''}" onclick="showTab('${tab.id}')">${tab.label}</div>`
  ).join('');
}

async function showTab(tabId) {
  currentTab = tabId;
  buildTabs();

  const renders = {
    dashboard:     () => (typeof renderDashboard    === 'function') && renderDashboard(),
    dispatch:      () => (typeof renderDispatch     === 'function') && renderDispatch(),
    mes_dossiers:  () => (typeof renderMesDossiers  === 'function') && renderMesDossiers(),
    trocs:         () => (typeof renderTrocs        === 'function') && renderTrocs(),
    utilisateurs:  () => (typeof renderUtilisateurs === 'function') && renderUtilisateurs(),
    audit:         () => (typeof renderAudit        === 'function') && renderAudit(),
    dvol:          () => (typeof renderDvolPlaceholder === 'function') && renderDvolPlaceholder()
  };

  const fn = renders[tabId];
  if (fn) await fn();
  else console.warn('[showTab] onglet inconnu :', tabId);
}

// ── switchTool : bascule entre Dispatch (onglets+contenu) et Dplane ──
function switchTool(tool) {
  const tabsContainer = document.getElementById('tabs-container');
  const mainContent   = document.getElementById('main-content');
  const dplaneScreen  = document.getElementById('dplane-screen');
  const btnDispatch   = document.getElementById('btn-tool-dispatch');
  const btnDplane     = document.getElementById('btn-tool-dplane');

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
