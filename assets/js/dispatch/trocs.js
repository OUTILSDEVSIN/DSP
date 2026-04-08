// ===== SYSTÈME TROCS =====
let trocModeActive = false;
let dossiersSelectionnes = [];
let trocsPanelOuvert = false;
// Cache des trocs actifs courants
let _trocsActifs = [];

// ── INIT ──────────────────────────────────────────────────
function initTrocButton() {
  if (!currentUserData) return;
  // Visible pour gestionnaire ET manager/admin
  const btn = document.getElementById('btn-troc');
  if (btn) {
    btn.style.display = ['gestionnaire','manager','admin'].includes(currentUserData.role) ? 'inline-flex' : 'none';
  }
  setupTrocRealtime();
  rafraichirBadgeTroc();
}

// ── BADGE NUMÉRIQUE SUR LE BOUTON ─────────────────────────
async function rafraichirBadgeTroc() {
  if (!currentUserData) return;
  const { data } = await db.from('trocs')
    .select('id')
    .or('from_id.eq.' + currentUserData.id + ',to_id.eq.' + currentUserData.id)
    .in('status', ['en_attente', 'contre_proposition']);
  const nb = data ? data.length : 0;
  const btn = document.getElementById('btn-troc');
  if (!btn) return;
  const badge = btn.querySelector('.troc-badge-count');
  if (nb > 0) {
    if (badge) { badge.textContent = nb; }
    else {
      const sp = document.createElement('span');
      sp.className = 'troc-badge-count';
      sp.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#f39c12;color:#fff;border-radius:50%;width:17px;height:17px;font-size:10px;font-weight:800;margin-left:4px;';
      sp.textContent = nb;
      btn.appendChild(sp);
    }
    btn.style.background = 'rgba(243,156,18,0.15)';
    btn.style.borderColor = '#f39c12';
  } else {
    if (badge) badge.remove();
    btn.style.background = '';
    btn.style.borderColor = '';
  }
  _trocsActifs = data || [];
}

// ── CLIC BOUTON TROC (logique intelligente) ───────────────
async function onBtnTrocClick() {
  await rafraichirBadgeTroc();
  if (_trocsActifs.length > 0) {
    openTrocsPanel();
  } else {
    toggleTrocMode();
  }
}

// ── MODE SÉLECTION (proposer un troc) ────────────────────
function toggleTrocMode() {
  trocModeActive = !trocModeActive;
  const tbody = document.querySelector('tbody');
  const btnTroc = document.getElementById('btn-troc');
  const trocBar = document.getElementById('troc-selection-bar');
  if (trocModeActive) {
    tbody && tbody.classList.add('troc-mode');
    if (btnTroc) btnTroc.style.display = 'none';
    if (trocBar) { trocBar.style.display = 'flex'; }
    dossiersSelectionnes = [];
    updateTrocCount();
  } else {
    tbody && tbody.classList.remove('troc-mode');
    if (btnTroc) btnTroc.style.display = ['gestionnaire','manager','admin'].includes(currentUserData.role) ? 'inline-flex' : 'none';
    if (trocBar) trocBar.style.display = 'none';
  }
}

function updateTrocCount() {
  const count = dossiersSelectionnes.length;
  const el = document.getElementById('troc-count');
  if (el) el.textContent = `${count} dossier${count !== 1 ? 's' : ''} sélectionné${count !== 1 ? 's' : ''}`;
  const btn = document.getElementById('btn-troc-proposer');
  if (btn) btn.disabled = count === 0;
}

// ── PROPOSER UN TROC (modal) ──────────────────────────────
function openTrocModal() {
  const gestionnaires = (allUsers || []).filter(u =>
    ['gestionnaire','manager'].includes(u.role) &&
    u.id !== currentUserData.id &&
    u.actif !== false
  );
  const existing = document.getElementById('modal-troc-proposer');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-troc-proposer';

  const inner = document.createElement('div');
  inner.className = 'modal';
  inner.style.cssText = 'max-width:460px;text-align:left';
  inner.innerHTML = '<h2 style="margin-bottom:16px">⇄ Proposer un troc</h2>'
    + '<p style="font-size:13px;color:var(--gray-600);margin-bottom:12px">Dossiers que vous proposez :</p>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">'
    + dossiersSelectionnes.map(d =>
        '<span style="background:var(--navy);color:#fff;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700">'
        + (d.nom || d.ref_sinistre || d.id) + '</span>'
      ).join('')
    + '</div>'
    + '<label style="font-size:13px;font-weight:600;margin-bottom:6px;display:block">Destinataire :</label>'
    + '<select id="troc-destinataire" style="width:100%;padding:9px 10px;border:1px solid var(--gray-300);border-radius:var(--radius-sm);margin-bottom:14px;font-size:14px">'
    + '<option value="">-- Choisir un gestionnaire --</option>'
    + gestionnaires.map(g =>
        `<option value="${g.id}">${g.prenom} ${g.nom}</option>`
      ).join('')
    + '</select>'
    + '<p style="font-size:11px;color:var(--gray-500);margin-bottom:18px">Le destinataire pourra accepter, refuser, ou faire une contre-proposition.</p>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-troc-proposer\').remove()">Annuler</button>'
    + '<button class="btn btn-primary" onclick="envoyerTrocPropose()">✉️ Envoyer la proposition</button>'
    + '</div>';

  overlay.appendChild(inner);
  document.body.appendChild(overlay);
}

async function envoyerTrocPropose() {
  const destinataireId = document.getElementById('troc-destinataire')?.value;
  if (!destinataireId) return showNotif('Choisissez un destinataire', 'error');

  const { data: trocInsere, error } = await db.from('trocs').insert({
    from_id: currentUserData.id,
    to_id: parseInt(destinataireId),
    dossiers_proposes: dossiersSelectionnes.map(d => d.id),
    status: 'en_attente'
  }).select().single();

  document.getElementById('modal-troc-proposer')?.remove();
  toggleTrocMode();

  if (error) { showNotif('Erreur lors de l\'envoi : ' + error.message, 'error'); return; }

  showNotif('✉️ Proposition de troc envoyée !', 'success');
  await rafraichirBadgeTroc();

  // Notification realtime au destinataire via httpSend
  try {
    await db.channel('trocs-notifs').send({
      type: 'broadcast',
      event: 'nouveau_troc',
      payload: {
        troc_id: trocInsere.id,
        from_id: currentUserData.id,
        to_id: parseInt(destinataireId),
        nb_dossiers: dossiersSelectionnes.length,
        from_prenom: currentUserData.prenom
      }
    });
  } catch(e) {
    // Fallback httpSend
    try {
      await db.channel('trocs-notifs').httpSend({
        type: 'broadcast',
        event: 'nouveau_troc',
        payload: {
          troc_id: trocInsere.id,
          from_id: currentUserData.id,
          to_id: parseInt(destinataireId),
          nb_dossiers: dossiersSelectionnes.length,
          from_prenom: currentUserData.prenom
        }
      });
    } catch(e2) { /* silencieux */ }
  }
}

// ── REALTIME ──────────────────────────────────────────────
function setupTrocRealtime() {
  db.channel('trocs-notifs')
    .on('broadcast', { event: 'nouveau_troc' }, ({ payload }) => {
      if (payload.to_id === currentUserData.id) {
        showTrocPopup(payload, 'nouveau_troc');
        rafraichirBadgeTroc();
      }
    })
    .on('broadcast', { event: 'contre_proposition' }, ({ payload }) => {
      if (payload.to_id === currentUserData.id) {
        showTrocPopup(payload, 'contre_proposition');
        rafraichirBadgeTroc();
      }
    })
    .on('broadcast', { event: 'troc_accepte' }, ({ payload }) => {
      if (payload.to_id === currentUserData.id) {
        showNotif('✅ Votre troc a été accepté par ' + (payload.from_prenom || 'votre collègue') + ' !', 'success');
        rafraichirBadgeTroc();
        loadDossiers && loadDossiers().then(() => renderAttribution && renderAttribution());
      }
    })
    .on('broadcast', { event: 'troc_refuse' }, ({ payload }) => {
      if (payload.to_id === currentUserData.id) {
        showNotif('❌ Votre troc a été refusé.', 'error');
        rafraichirBadgeTroc();
      }
    })
    .subscribe();
}

// ── POPUP RÉCEPTION ──────────────────────────────────────
function showTrocPopup(payload, type) {
  const exp = (allUsers || []).find(u => u.id === payload.from_id);
  const prenomExp = exp ? (exp.prenom + ' ' + exp.nom) : (payload.from_prenom || 'Un collègue');
  const existing = document.getElementById('modal-troc-popup');
  if (existing) existing.remove();

  const isContrePropo = type === 'contre_proposition';
  const titre = isContrePropo
    ? `🔄 ${prenomExp} a fait une contre-proposition`
    : `⇄ ${prenomExp} vous propose un troc`;
  const desc = isContrePropo
    ? `Il a sélectionné ses dossiers en échange. Consultez la proposition avant de décider.`
    : `${payload.nb_dossiers || '?'} dossier${(payload.nb_dossiers || 1) > 1 ? 's' : ''} proposé${(payload.nb_dossiers || 1) > 1 ? 's' : ''}.`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-troc-popup';
  overlay.style.zIndex = '7000';

  const inner = document.createElement('div');
  inner.className = 'modal';
  inner.style.cssText = 'max-width:380px;text-align:center';
  inner.innerHTML = '<div style="font-size:42px;margin-bottom:10px">' + (isContrePropo ? '🔄' : '⇄') + '</div>'
    + '<h3 style="margin-bottom:8px">' + titre + '</h3>'
    + '<p style="font-size:13px;color:var(--gray-600);margin-bottom:20px">' + desc + '</p>'
    + '<div style="display:flex;gap:10px;justify-content:center">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-troc-popup\').remove()">👀 Voir plus tard</button>'
    + '<button class="btn btn-primary" onclick="document.getElementById(\'modal-troc-popup\').remove();openTrocsPanel()">⇄ Voir le troc</button>'
    + '</div>';

  overlay.appendChild(inner);
  document.body.appendChild(overlay);
}

// ── PANEL TROCS EN COURS ──────────────────────────────────
async function openTrocsPanel() {
  const existing = document.getElementById('panel-trocs');
  if (existing) existing.remove();

  // Charger tous les trocs actifs impliquant l'utilisateur
  const { data: trocs, error } = await db.from('trocs')
    .select('*')
    .or('from_id.eq.' + currentUserData.id + ',to_id.eq.' + currentUserData.id)
    .in('status', ['en_attente', 'contre_proposition'])
    .order('created_at', { ascending: false });

  if (error) { showNotif('Erreur chargement trocs : ' + error.message, 'error'); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'panel-trocs';

  const panel = document.createElement('div');
  panel.className = 'modal';
  panel.style.cssText = 'max-width:640px;max-height:85vh;overflow-y:auto;text-align:left';

  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<h2>⇄ Trocs en cours</h2>'
    + '<button class="btn btn-secondary" style="padding:4px 12px" onclick="document.getElementById(\'panel-trocs\').remove()">✕ Fermer</button>'
    + '</div>';

  if (!trocs || trocs.length === 0) {
    html += '<div style="text-align:center;padding:40px 0;color:var(--gray-500)">'
      + '<div style="font-size:36px;margin-bottom:12px">📭</div>'
      + '<p>Aucun troc en cours.</p></div>';
  } else {
    for (const troc of trocs) {
      html += await renderTrocCard(troc);
    }
  }

  html += '<div style="border-top:1px solid var(--gray-200);padding-top:16px;margin-top:16px;text-align:right">'
    + '<button class="btn btn-primary" onclick="document.getElementById(\'panel-trocs\').remove();toggleTrocMode()">+ Proposer un nouveau troc</button>'
    + '</div>';

  panel.innerHTML = html;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

async function renderTrocCard(troc) {
  const fromUser = (allUsers || []).find(u => u.id === troc.from_id);
  const toUser   = (allUsers || []).find(u => u.id === troc.to_id);
  const fromNom  = fromUser ? fromUser.prenom + ' ' + fromUser.nom : 'Utilisateur #' + troc.from_id;
  const toNom    = toUser   ? toUser.prenom   + ' ' + toUser.nom   : 'Utilisateur #' + troc.to_id;

  const isSender   = troc.from_id === currentUserData.id;
  const isReceiver = troc.to_id   === currentUserData.id;

  // Badges dossiers proposés
  const dossiersProposes = troc.dossiers_proposes || [];
  const dossiersEchange  = troc.dossiers_en_echange || [];
  const contreFromId     = troc.contre_from_id;

  // Récupérer les refs sinistres pour affichage lisible
  let refsProposees = dossiersProposes;
  let refsEchange   = dossiersEchange;
  if (allDossiers && allDossiers.length) {
    refsProposees = dossiersProposes.map(id => {
      const d = allDossiers.find(x => String(x.id) === String(id));
      return d ? d.ref_sinistre : id;
    });
    refsEchange = dossiersEchange.map(id => {
      const d = allDossiers.find(x => String(x.id) === String(id));
      return d ? d.ref_sinistre : id;
    });
  }

  const isContrePropo = troc.status === 'contre_proposition';

  // Statut label
  const statusLabel = isContrePropo
    ? '<span style="background:#fff3cd;color:#856404;border:1px solid #ffc107;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700">🔄 Contre-proposition</span>'
    : '<span style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700">⏳ En attente</span>';

  const badgesFrom = refsProposees.map(r =>
    '<span style="background:var(--navy,#1a2b49);color:#fff;border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;margin:2px">' + r + '</span>'
  ).join('');
  const badgesTo = refsEchange.map(r =>
    '<span style="background:#27ae60;color:#fff;border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;margin:2px">' + r + '</span>'
  ).join('');

  // Déterminer l'affichage des colonnes
  let colonneGauche = '';
  let colonneDroite = '';

  if (!isContrePropo) {
    // Troc simple : from propose, to n'a pas encore répondu
    colonneGauche = '<div style="font-size:11px;color:var(--gray-500);margin-bottom:4px">Ce que propose <strong>' + fromNom + '</strong></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px">' + (badgesFrom || '<em style="font-size:11px;color:var(--gray-400)">Aucun</em>') + '</div>';
    colonneDroite = '<div style="font-size:11px;color:var(--gray-500);margin-bottom:4px">En attente de <strong>' + toNom + '</strong></div>'
      + '<div style="font-size:12px;color:var(--gray-400);font-style:italic">— À définir —</div>';
  } else {
    // Contre-proposition : afficher les deux côtés
    const contreUser = (allUsers || []).find(u => u.id === contreFromId);
    const contreNom  = contreUser ? contreUser.prenom + ' ' + contreUser.nom : 'Collègue';
    colonneGauche = '<div style="font-size:11px;color:var(--gray-500);margin-bottom:4px">Propose <strong>' + fromNom + '</strong></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px">' + (badgesFrom || '<em style="font-size:11px;color:var(--gray-400)">Aucun</em>') + '</div>';
    colonneDroite = '<div style="font-size:11px;color:var(--gray-500);margin-bottom:4px">Contre-propose <strong>' + contreNom + '</strong></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px">' + (badgesTo || '<em style="font-size:11px;color:var(--gray-400)">Aucun</em>') + '</div>';
  }

  // Boutons d'action selon le rôle et le statut
  let actionsBtns = '';

  if (!isContrePropo && isReceiver) {
    // Destinataire peut : Accepter | Refuser | Contre-proposer
    actionsBtns = '<button class="btn btn-danger" style="font-size:12px;padding:5px 12px" onclick="actionTroc(\'annule\',\''
      + troc.id + '\')">❌ Refuser</button>'
      + '<button class="btn btn-warning" style="font-size:12px;padding:5px 12px" onclick="openContrePropositionModal(\''
      + troc.id + '\')">🔄 Contre-proposer</button>'
      + '<button class="btn btn-success" style="font-size:12px;padding:5px 12px" onclick="actionTroc(\'accepte\',\''
      + troc.id + '\')">✅ Accepter</button>';
  } else if (isContrePropo && isSender) {
    // L'initiateur reçoit la contre-proposition : Accepter ou Refuser
    actionsBtns = '<button class="btn btn-danger" style="font-size:12px;padding:5px 12px" onclick="actionTroc(\'refuse\',\''
      + troc.id + '\')">❌ Refuser</button>'
      + '<button class="btn btn-success" style="font-size:12px;padding:5px 12px" onclick="actionTroc(\'accepte\',\''
      + troc.id + '\')">✅ Accepter la contre-proposition</button>';
  } else if (!isContrePropo && isSender) {
    // Initiateur attend → peut juste annuler
    actionsBtns = '<button class="btn btn-secondary" style="font-size:12px;padding:5px 12px" onclick="actionTroc(\'annule\',\''
      + troc.id + '\')">🗑️ Annuler ma proposition</button>';
  } else if (isContrePropo && isReceiver) {
    // Contre-proposant attend la réponse
    actionsBtns = '<button class="btn btn-secondary" style="font-size:12px;padding:5px 12px" onclick="actionTroc(\'annule\',\''
      + troc.id + '\')">🗑️ Annuler ma contre-proposition</button>';
  }

  return '<div style="border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-bottom:14px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    + '<span style="font-size:12px;color:var(--gray-500)">' + fromNom + ' → ' + toNom + '</span>'
    + statusLabel
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
    + '<div style="background:var(--gray-50,#f8f9fa);border-radius:8px;padding:10px">' + colonneGauche + '</div>'
    + '<div style="background:var(--gray-50,#f8f9fa);border-radius:8px;padding:10px">' + colonneDroite + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + actionsBtns
    + '</div>'
    + '</div>';
}

// ── ACTIONS SUR UN TROC ───────────────────────────────────
async function actionTroc(action, trocId) {
  document.getElementById('panel-trocs')?.remove();

  const { data: troc, error: errLoad } = await db.from('trocs').select('*').eq('id', trocId).single();
  if (errLoad || !troc) { showNotif('Troc introuvable.', 'error'); return; }

  const { error } = await db.from('trocs').update({ status: action }).eq('id', trocId);
  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }

  // Si accepté : transférer les dossiers
  if (action === 'accepte') {
    await _executerEchangeTroc(troc);
  }

  // Déterminer qui notifier
  const notifTargetId = troc.from_id === currentUserData.id ? troc.to_id : troc.from_id;
  const eventName     = action === 'accepte' ? 'troc_accepte' : 'troc_refuse';

  try {
    await db.channel('trocs-notifs').httpSend({
      type: 'broadcast',
      event: eventName,
      payload: { troc_id: trocId, to_id: notifTargetId, from_prenom: currentUserData.prenom }
    });
  } catch(e) { /* silencieux */ }

  const msgs = {
    accepte: '✅ Troc accepté ! Les dossiers ont été échangés.',
    annule:  '🗑️ Troc annulé.',
    refuse:  '❌ Contre-proposition refusée.'
  };
  showNotif(msgs[action] || 'Troc mis à jour.', action === 'accepte' ? 'success' : 'info');
  await rafraichirBadgeTroc();
  await loadDossiers();
  renderAttribution && renderAttribution();
}

async function _executerEchangeTroc(troc) {
  const fromUser = (allUsers || []).find(u => u.id === troc.from_id);
  const toUser   = (allUsers || []).find(u => u.id === troc.to_id);
  // On échange les gestionnaires : dossiers_proposes → to, dossiers_en_echange → from
  const fromNom = fromUser ? fromUser.prenom + ' ' + fromUser.nom : null;
  const toNom   = toUser   ? toUser.prenom   + ' ' + toUser.nom   : null;

  if (toNom && troc.dossiers_proposes && troc.dossiers_proposes.length) {
    for (const dossierId of troc.dossiers_proposes) {
      await db.from('dossiers').update({ gestionnaire: toNom }).eq('id', dossierId);
    }
  }
  if (fromNom && troc.dossiers_en_echange && troc.dossiers_en_echange.length) {
    for (const dossierId of troc.dossiers_en_echange) {
      await db.from('dossiers').update({ gestionnaire: fromNom }).eq('id', dossierId);
    }
  }
  await auditLog('TROC_ECHANGE',
    'Troc ' + troc.id + ' — ' + (troc.dossiers_proposes||[]).length + ' dossier(s) échangé(s)'
  );
}

// ── CONTRE-PROPOSITION ───────────────────────────────────
async function openContrePropositionModal(trocId) {
  document.getElementById('panel-trocs')?.remove();

  const { data: troc, error: errLoad } = await db.from('trocs').select('*').eq('id', trocId).single();
  if (errLoad || !troc) { showNotif('Troc introuvable.', 'error'); return; }

  // Dossiers proposés par l'initiateur (pour affichage gauche)
  const dossiersProposes = troc.dossiers_proposes || [];
  let refsProposees = dossiersProposes.map(id => {
    const d = allDossiers && allDossiers.find(x => String(x.id) === String(id));
    return d ? d.ref_sinistre : id;
  });

  // Mes propres dossiers disponibles (non traités, en cours)
  const monNom = currentUserData.prenom + ' ' + currentUserData.nom;
  const mesDossiersDispo = (allDossiers || []).filter(d =>
    d.gestionnaire === monNom &&
    !d.traite &&
    ['attribue','encours','ouvert'].includes(d.statut || '')
  );

  const existing = document.getElementById('modal-contre-proposition');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-contre-proposition';

  const inner = document.createElement('div');
  inner.className = 'modal';
  inner.style.cssText = 'max-width:680px;text-align:left';

  inner.innerHTML = '<h2 style="margin-bottom:16px">🔄 Faire une contre-proposition</h2>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">'
    // Colonne gauche : ce que l'autre propose (lecture seule)
    + '<div style="background:var(--gray-50,#f8f9fa);border-radius:10px;padding:14px">'
    + '<h4 style="font-size:13px;color:var(--gray-600);margin-bottom:10px">📋 Ce que l\'autre propose</h4>'
    + '<div style="display:flex;flex-wrap:wrap;gap:5px">'
    + refsProposees.map(r =>
        '<span style="background:var(--navy,#1a2b49);color:#fff;border-radius:5px;padding:3px 9px;font-size:12px;font-weight:700">' + r + '</span>'
      ).join('')
    + '</div></div>'
    // Colonne droite : mes dossiers à sélectionner
    + '<div style="background:var(--gray-50,#f8f9fa);border-radius:10px;padding:14px">'
    + '<h4 style="font-size:13px;color:var(--gray-600);margin-bottom:10px">✏️ Vos dossiers à proposer en échange</h4>'
    + '<p style="font-size:11px;color:var(--gray-400);margin-bottom:8px">Sélectionnez 1 ou plusieurs dossiers (sans obligation de symétrie)</p>'
    + '<div id="contre-propos-liste" style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">'
    + (mesDossiersDispo.length === 0
        ? '<em style="font-size:12px;color:var(--gray-400)">Aucun dossier disponible</em>'
        : mesDossiersDispo.map(d =>
            '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:5px;hover:background:#eee">'
            + '<input type="checkbox" class="contre-propos-cb" value="' + d.id + '" style="width:15px;height:15px;accent-color:var(--rose,#e74c3c)">'
            + '<span><strong>' + d.ref_sinistre + '</strong>'
            + (d.nature_label ? ' – ' + d.nature_label : '')
            + '</span></label>'
          ).join('')
      )
    + '</div></div></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-contre-proposition\').remove();openTrocsPanel()">Annuler</button>'
    + '<button class="btn btn-warning" onclick="envoyerContreProposition(\''
    + trocId + '\')"'
    + (mesDossiersDispo.length === 0 ? ' disabled' : '')
    + '>🔄 Envoyer ma contre-proposition</button>'
    + '</div>';

  overlay.appendChild(inner);
  document.body.appendChild(overlay);
}

async function envoyerContreProposition(trocId) {
  const coches = [...document.querySelectorAll('.contre-propos-cb:checked')].map(cb => parseInt(cb.value));
  if (coches.length === 0) { showNotif('Sélectionnez au moins un dossier.', 'error'); return; }

  const { data: troc } = await db.from('trocs').select('*').eq('id', trocId).single();
  if (!troc) { showNotif('Troc introuvable.', 'error'); return; }

  const { error } = await db.from('trocs').update({
    dossiers_en_echange: coches,
    contre_from_id: currentUserData.id,
    status: 'contre_proposition'
  }).eq('id', trocId);

  document.getElementById('modal-contre-proposition')?.remove();

  if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }

  showNotif('🔄 Contre-proposition envoyée !', 'success');
  await rafraichirBadgeTroc();

  // Notifier l'initiateur
  try {
    await db.channel('trocs-notifs').httpSend({
      type: 'broadcast',
      event: 'contre_proposition',
      payload: {
        troc_id: trocId,
        from_id: currentUserData.id,
        to_id: troc.from_id,
        nb_dossiers: coches.length,
        from_prenom: currentUserData.prenom
      }
    });
  } catch(e) { /* silencieux */ }
}

// ── CHECKBOX SÉLECTION TROC SUR LES LIGNES ───────────────
document.addEventListener('click', e => {
  if (!trocModeActive) return;
  if (!e.target.classList.contains('row-check')) return;
  const row = e.target.closest('tr');
  if (!row) return;
  const dossierId = row.dataset.id || row.dataset.dossierId;
  const dossierRef = row.dataset.ref || row.querySelector('td strong')?.textContent || dossierId;
  e.preventDefault();
  if (dossiersSelectionnes.some(d => String(d.id) === String(dossierId))) {
    dossiersSelectionnes = dossiersSelectionnes.filter(d => String(d.id) !== String(dossierId));
    e.target.checked = false;
  } else {
    dossiersSelectionnes.push({ id: dossierId, ref_sinistre: dossierRef, nom: dossierRef });
    e.target.checked = true;
  }
  updateTrocCount();
});

// ── BADGE TROC EN COURS SUR LA LIGNE DOSSIER ─────────────
// Appelée depuis renderAttribution / renderMesDossiers pour savoir si un dossier est dans un troc actif
function isDossierEnTroc(dossierId) {
  if (!window._trocsActifsDetails) return false;
  return window._trocsActifsDetails.some(t => {
    const proposes = t.dossiers_proposes || [];
    const echange  = t.dossiers_en_echange || [];
    return [...proposes, ...echange].some(id => String(id) === String(dossierId));
  });
}

async function loadTrocsActifsDetails() {
  const { data } = await db.from('trocs')
    .select('id, dossiers_proposes, dossiers_en_echange, status')
    .in('status', ['en_attente', 'contre_proposition']);
  window._trocsActifsDetails = data || [];
}

// ===== FIN TROCS =====
