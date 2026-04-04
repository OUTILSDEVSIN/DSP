// ===== GOD SWITCH -- MODE TEST ADMIN =====
var _realRole = null;

function showGodSwitchMenu() {
    var existing = document.getElementById('god-switch-menu');
    if (existing) { existing.remove(); return; }

    var menu = document.createElement('div');
    menu.id = 'god-switch-menu';
    menu.style.cssText = 'position:fixed;top:56px;right:12px;background:white;border:1px solid var(--gray-200);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:9999;min-width:200px;overflow:hidden';

    var currentSimRole = safeSession.getItem('sim_role') || currentUserData.role;
    var roles = [
        { val: 'admin',        label: '👑 Admin',        desc: 'Tous les accès' },
        { val: 'manager',      label: '🔧 Manager',      desc: 'Importer + Équipe' },
        { val: 'gestionnaire', label: '📋 Gestionnaire', desc: 'Tableau de bord + Mes dossiers' }
    ];

    var items = '<div style="padding:10px 14px;border-bottom:1px solid var(--gray-200);font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:0.5px">🎭 Simuler un rôle</div>';
    roles.forEach(function(r) {
        var isActive = currentSimRole === r.val;
        items += '<div onclick="applyGodSwitch(\'' + r.val + '\')" style="padding:12px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:' + (isActive ? '#fff5f7' : 'white') + ';border-left:3px solid ' + (isActive ? 'var(--rose)' : 'transparent') + '" onmouseover="this.style.background=\'#f8f9fa\'" onmouseout="this.style.background=\'' + (isActive ? '#fff5f7' : 'white') + '\'">'
            + '<div><div style="font-weight:600;font-size:13px;color:var(--navy)">' + r.label + '</div>'
            + '<div style="font-size:11px;color:var(--gray-600)">' + r.desc + '</div></div>'
            + (isActive ? '<span style="color:var(--rose);font-size:16px">✓</span>' : '')
            + '</div>';
    });
    menu.innerHTML = items;

    document.body.appendChild(menu);
    setTimeout(function() {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target.id !== 'btn-god-switch') {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function applyGodSwitch(role) {
    var menu = document.getElementById('god-switch-menu');
    if (menu) menu.remove();

    var previousRole = safeSession.getItem('sim_role') || currentUserData.role;
    if (role === previousRole) return;

    safeSession.setItem('sim_role', role);

    // Bannière si pas admin réel
    var existingBanner = document.getElementById('god-banner');
    if (existingBanner) existingBanner.remove();

    if (role !== 'admin') {
        var banner = document.createElement('div');
        banner.id = 'god-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:8888;background:linear-gradient(90deg,#e81251,#ff4d7d);color:white;text-align:center;padding:6px 16px;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:12px';
        banner.innerHTML = '🎭 Mode test : <strong>' + role.toUpperCase() + '</strong> -- Vue simulée uniquement'
            + '<button onclick="applyGodSwitch(\'admin\')" style="margin-left:16px;background:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.5);color:white;padding:3px 12px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px">✕ Quitter</button>';
        document.body.insertBefore(banner, document.body.firstChild);
        // Décaler le header
        var appScreen = document.getElementById('app-screen');
        if (appScreen) appScreen.style.paddingTop = '36px';
    } else {
        var appScreen2 = document.getElementById('app-screen');
        if (appScreen2) appScreen2.style.paddingTop = '';
        sessionStorage.removeItem('sim_role');
    }

    // Mettre à jour le badge rôle dans le header
    var headerRole = document.getElementById('header-role');
    if (headerRole) headerRole.textContent = role.toUpperCase();

    // Masquer/afficher bouton Reset selon rôle simulé
    var btnReset = document.getElementById('btn-reset-header');
    if (btnReset) {
        btnReset.style.display = ['admin','manager'].includes(role) ? '' : 'none';
    }

    // Reconstruire les onglets avec le nouveau rôle simulé
    var savedRole = currentUserData.role;
    currentUserData.role = role;
    buildTabs();
    currentUserData.role = savedRole;

    // Rediriger vers dashboard
    currentUserData._simRole = role;
    showTab('dashboard');

    showNotif('Mode test : ' + role + ' activé', 'success');
}

// Override getEffectiveRole pour toutes les vérifications de rôle
function getEffectiveRole() {
    try {
        return safeSession.getItem('sim_role') || currentUserData.role;
    } catch(e) {
        return currentUserData ? currentUserData.role : 'gestionnaire';
    }
}

// ===== DPLANE FONCTIONS COMPLÉMENTAIRES v4.6 =====

// ── Réinitialiser la semaine ──
async function dplaneReinitialiserSemaineUI() {
  if (!currentUserData) return;
  const lundi    = dplaneGetLundiSemaine(dplaneSemaineOffset);
  const vendredi = new Date(lundi); vendredi.setDate(lundi.getDate() + 4);
  const dateDebut = dplaneDateStr(lundi), dateFin = dplaneDateStr(vendredi);
  dplaneConfirm(
    `Supprimer TOUT le planning et les absences<br>du ${lundi.toLocaleDateString('fr-FR', {day:'numeric',month:'long'})} au ${vendredi.toLocaleDateString('fr-FR', {day:'numeric',month:'long'})} ?`,
    '🗑️',
    async () => {
      await db.from('dplane_planning').delete().gte('jour', dateDebut).lte('jour', dateFin);
      await db.from('dplane_absences').delete().gte('jour', dateDebut).lte('jour', dateFin);
      showNotif('Planning de la semaine réinitialisé ✓', 'success');
      await renderDplaneGrille();
    }
  );
}

// ── Briefing quotidien gestionnaire ──
async function dplaneBriefingGestionnaire() {
  if (!currentUserData) return;
  const today = new Date().toISOString().split('T')[0];
  // Afficher une seule fois par jour
  const lastShown = localStorage.getItem('dplane_briefing_' + currentUserData.id);
  if (lastShown === today) return;
  localStorage.setItem('dplane_briefing_' + currentUserData.id, today);

  const { data: planning } = await db.from('dplane_planning')
    .select('creneau, activite_id').eq('gestionnaire_id', currentUserData.id)
    .eq('jour', today).eq('is_brouillon', false);
  const { data: absences } = await db.from('dplane_absences')
    .select('creneau, type_absence').eq('gestionnaire_id', currentUserData.id).eq('jour', today);
  const { data: dossiersPending } = await db.from('dossiers')
    .select('id', { count: 'exact', head: true })
    .eq('gestionnaire', currentUserData.prenom + ' ' + currentUserData.nom)
    .in('statut', ['nonattribue', 'en cours', 'ouvert']);

  const actsDplane = await dplaneGetActivites();
  const actsAujourd = (planning || []).map(p => {
    const act = actsDplane.find(a => a.id === p.activite_id);
    return `<span style="background:${act?.couleur_hex||'#666'};color:white;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${act?.nom||'?'}</span>`;
  });
  const absAujourd = (absences || []);
  const absLabels = {conge:'🏖️ Congé', maladie:'🤒 Maladie', formation:'📚 Formation', absence:'❌ Absence'};
  const nbDossiers = dossiersPending?.length || 0;

  const overlay = document.createElement('div');
  overlay.className = 'dplane-popup-overlay';
  overlay.id = 'dplane-briefing-modal';
  overlay.innerHTML = `
    <div class="dplane-popup" style="max-width:420px;width:95vw;text-align:center;">
      <div style="font-size:42px;margin-bottom:8px;">☀️</div>
      <h2 style="margin:0 0 4px;">Bonjour ${currentUserData.prenom} !</h2>
      <div style="color:var(--gray-500);font-size:13px;margin-bottom:20px;">${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>

      ${absAujourd.length ? `
        <div style="background:#fff3e0;border:1px solid #f97316;border-radius:10px;padding:12px;margin-bottom:14px;">
          <div style="font-weight:700;color:#e65100;margin-bottom:6px;">⚠️ Absence aujourd'hui</div>
          ${absAujourd.map(a=>`<div style="color:#bf360c;font-size:13px;">${absLabels[a.type_absence]||a.type_absence} -- ${a.creneau==='journee'?'Journée entière':a.creneau==='matin'?'Matin':'Après-midi'}</div>`).join('')}
        </div>` : ''}

      ${actsAujourd.length ? `
        <div style="background:var(--gray-50,#f9f9f9);border-radius:10px;padding:12px;margin-bottom:14px;">
          <div style="font-weight:700;color:var(--navy);margin-bottom:10px;">📋 Vos activités du jour</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">${actsAujourd.join('')}</div>
        </div>` : 
        `<div style="background:var(--gray-50,#f9f9f9);border-radius:10px;padding:12px;margin-bottom:14px;color:var(--gray-500);">
          Aucune activité planifiée aujourd'hui
        </div>`}

      <div style="background:#e8f5e9;border-radius:10px;padding:12px;margin-bottom:20px;">
        <div style="font-size:28px;font-weight:800;color:#2e7d32;">${nbDossiers}</div>
        <div style="font-size:13px;color:#388e3c;font-weight:600;">dossier${nbDossiers>1?'s':''} à traiter</div>
      </div>

      <button class="btn btn-primary" onclick="document.getElementById('dplane-briefing-modal').remove()" style="width:100%;">
        Bonne journée ! 🚀
      </button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Initialisation bouton reset (admin/manager seulement) ──
async function dplaneInitBoutonsRole() {
  if (!currentUserData) return;
  const canEdit = ['admin','manager'].includes(dplaneGetRole());
  const btn = document.getElementById('btn-reinit-semaine');
  if (btn) btn.style.display = canEdit ? '' : 'none';
}


// ── Toggle Mon planning (gestionnaire) ──
function dplaneToggleMonPlanning() {
  window._dplaneMonPlanning = !window._dplaneMonPlanning;
  const btn = document.getElementById('btn-mon-planning');
  if (btn) {
    if (window._dplaneMonPlanning) {
      btn.textContent = '👥 Tout voir';
      btn.style.cssText = 'background:var(--navy);color:white;border-color:var(--navy);';
    } else {
      btn.textContent = '👤 Mon planning';
      btn.style.cssText = '';
    }
  }
  renderDplaneGrille();
}
// ===== FIN DPLANE FONCTIONS COMPLÉMENTAIRES v4.6 =====

// ===== FIN GOD SWITCH =====




