// ===== ACTIONS & HELPERS =====

// ── SÉLECTION & CASES à COCHER ───────────────────────────────
function updateSelectionCount() {
  const n  = document.querySelectorAll('.row-check:checked').length;
  const el = document.getElementById('selection-count');
  if (el) el.textContent = n;
}

function toggleSelectAll(source) {
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = source.checked);
  updateSelectionCount();
}

// ── MODAL ──────────────────────────────────────────────────────
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ── NOTIFICATIONS TOAST ───────────────────────────────────────
// showNotif est déclarée ici et disponible pour TOUS les modules
function showNotif(message, type = 'info') {
  let container = document.getElementById('notif-toast');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notif-toast';
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const div = document.createElement('div');
  div.className = 'toast toast-' + type;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.remove(); }, 3500);
}

// ── BADGE STATUT ──────────────────────────────────────────────
function badgeStatut(statut) {
  const map = {
    'non_traite': 'badge badge-warning',
    'en_cours':   'badge badge-info',
    'traite':     'badge badge-success',
    'bloque':     'badge badge-danger'
  };
  return `<span class="${map[statut] || 'badge badge-neutral'}">${escapeHtml(statut || '-')}</span>`;
}

// ── FORMAT DATE FR ────────────────────────────────────────────
function formatDateFR(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  } catch(e) { return String(dateStr); }
}

// ── ESCAPE HTML ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[s]));
}

// ── CHARGER TOUS LES UTILISATEURS ────────────────────────────
async function loadAllUsers() {
  const { data, error } = await db
    .from('utilisateurs')
    .select('*')
    .order('nom');
  if (error) { console.error('[loadAllUsers]', error); allUsers = []; return []; }
  allUsers = data || [];
  return allUsers;
}

// ── AUDIT LOG ─────────────────────────────────────────────────
async function auditLog(action, details = '') {
  if (!currentUserData) return;
  const actor = currentUserData.prenom + ' ' + currentUserData.nom;
  const { error } = await db.from('audit_logs').insert({
    actor,
    action,
    details,
    created_at: new Date().toISOString()
  });
  if (error) console.error('[auditLog]', error);
}
