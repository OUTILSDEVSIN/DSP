// ===== ACTIONS =====

// ── SÉLECTION & VERROUILLAGE ──────────────────────────────
function updateSelectionCount() {
  const n = document.querySelectorAll('.row-check:checked').length;
  const el = document.getElementById('selection-count');
  if (el) el.textContent = n;
}

function toggleSelectAll(source) {
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = source.checked);
  updateSelectionCount();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function showNotif(message, type='info') {
  let container = document.getElementById('notif-toast');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notif-toast';
    document.body.appendChild(container);
  }
  const div = document.createElement('div');
  div.className = 'toast toast-' + type;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function badgeStatut(statut) {
  const map = {
    'non_traite': 'badge badge-warning',
    'en_cours': 'badge badge-info',
    'traite': 'badge badge-success',
    'bloque': 'badge badge-danger'
  };
  return `<span class="${map[statut] || 'badge badge-neutral'}">${statut || '-'}</span>`;
}

function formatDateFR(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  } catch(e) { return dateStr; }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[s]));
}
