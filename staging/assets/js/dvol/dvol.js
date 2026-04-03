// ===== DVOL =====
function renderDvolPlaceholder() {
  const container = document.getElementById('main-content');
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <div class="modal-title">🚗 Dvol</div>
      <p style="font-size:13px;color:var(--gray-600);">Le module Dvol est chargé depuis <code>assets/js/dvol/dvol.js</code>.</p>
    </div>`;
}

window.renderDvolPlaceholder = renderDvolPlaceholder;
