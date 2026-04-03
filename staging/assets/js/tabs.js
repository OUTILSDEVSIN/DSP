// ===== TABS =====
function buildTabs() {
  const role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
  const tabs = [{ id: 'dashboard', label: '📊 Tableau de bord' }];

  if (['admin','manager','superviseur'].includes(role)) tabs.push({ id: 'dispatch', label: '📦 Dispatch' });
  tabs.push({ id: 'mes_dossiers', label: '📁 Mes dossiers' });
  tabs.push({ id: 'trocs', label: '🔁 Trocs' });
  if (['admin','manager'].includes(role)) tabs.push({ id: 'utilisateurs', label: '👥 Utilisateurs' });
  if (role === 'admin') tabs.push({ id: 'audit', label: '🛡️ Audit' });

  const container = document.getElementById('tabs-container');
  container.innerHTML = tabs.map(tab =>
    `<div class="tab ${tab.id===currentTab?'active':''}" onclick="showTab('${tab.id}')">${tab.label}</div>`
  ).join('');
}

async function showTab(tabId) {
  currentTab = tabId;
  buildTabs();

  if (tabId === 'dashboard') return renderDashboard();
  if (tabId === 'dispatch') return renderDispatch();
  if (tabId === 'mes_dossiers') return renderMesDossiers();
  if (tabId === 'trocs') return renderTrocs();
  if (tabId === 'utilisateurs') return renderUtilisateurs();
  if (tabId === 'audit') return renderAudit();
}

function switchTool(tool) {
  document.getElementById('dispatch-screen').style.display = tool === 'dispatch' ? 'block' : 'none';
  document.getElementById('dplane-screen').style.display = tool === 'dplane' ? 'block' : 'none';
  document.getElementById('btn-tool-dispatch').classList.toggle('active', tool === 'dispatch');
  document.getElementById('btn-tool-dplane').classList.toggle('active', tool === 'dplane');
  if (tool === 'dplane' && typeof dplaneInit === 'function') dplaneInit();
}
