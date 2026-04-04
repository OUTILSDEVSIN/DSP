// ===== STATS =====
async function renderStats() {
document.getElementById('main-content').innerHTML = '<div class="loading">Chargement des stats...</div>';

// Données du jour (live)
await loadDossiers();
await loadAllUsers();

// Charger le flag archivage depuis app_config
var archivageActif = true;
var resConfig = await db.from('app_config').select('value').eq('key', 'archivage_stats').maybeSingle();
if (resConfig.data) {
  archivageActif = resConfig.data.value !== 'false' && resConfig.data.value !== false;
}

// Données historiques
var resHisto = await db.from('stats_journalieres').select('*').order('date_journee', { ascending: false });
var histo = resHisto.data || [];

var role = (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;

// ── KPIs DU JOUR ──────────────────────────────────────────
var total     = allDossiers.length;
var traites   = allDossiers.filter(function(d){ return d.traite; }).length;
var enCours   = total - traites;
var tauxGlobal = total > 0 ? Math.round(traites / total * 100) : 0;

// Temps moyen traitement (minutes) -- journée en cours
var dosAvecTemps = allDossiers.filter(function(d){
  return d.traite && d.traite_at && d.dispatched_at;
});
var tpsMoyenMin = 0;
if (dosAvecTemps.length > 0) {
  var totalMin = dosAvecTemps.reduce(function(acc, d) {
    return acc + (new Date(d.traite_at) - new Date(d.dispatched_at)) / 60000;
  }, 0);
  tpsMoyenMin = Math.round(totalMin / dosAvecTemps.length);
}

// Meilleur gestionnaire du jour
var gestScores = {};
allDossiers.forEach(function(d) {
  if (!d.gestionnaire) return;
  if (!gestScores[d.gestionnaire]) gestScores[d.gestionnaire] = { assignes: 0, traites: 0 };
  gestScores[d.gestionnaire].assignes++;
  if (d.traite) gestScores[d.gestionnaire].traites++;
});
var topGest = Object.entries(gestScores).sort(function(a,b){ return b[1].traites - a[1].traites; })[0];

// ── CLASSEMENT GESTIONNAIRES ──────────────────────────────
var gestRows = Object.entries(gestScores).map(function(e) {
  var nom = e[0]; var s = e[1];
  var pct = s.assignes > 0 ? Math.round(s.traites / s.assignes * 100) : 0;
  return { nom: nom, assignes: s.assignes, traites: s.traites, enCours: s.assignes - s.traites, pct: pct };
}).sort(function(a,b){ return b.traites - a.traites; });

var rankRows = gestRows.map(function(g, i) {
  var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.';
  var couleur = g.pct >= 80 ? '#27ae60' : g.pct >= 50 ? '#e67e22' : '#e74c3c';
  return '<tr>'
    + '<td style="text-align:center;font-size:16px">' + medal + '</td>'
    + '<td><strong>' + g.nom + '</strong></td>'
    + '<td style="text-align:center">' + g.assignes + '</td>'
    + '<td style="text-align:center;color:#27ae60;font-weight:700">' + g.traites + '</td>'
    + '<td style="text-align:center;color:#e67e22">' + g.enCours + '</td>'
    + '<td><div style="display:flex;align-items:center;gap:8px">'
    + '<div style="background:#eee;border-radius:10px;height:10px;flex:1"><div style="background:' + couleur + ';height:10px;border-radius:10px;width:' + g.pct + '%"></div></div>'
    + '<strong style="color:' + couleur + ';min-width:36px">' + g.pct + '%</strong></div></td>'
    + '</tr>';
}).join('');

// ── RÉPARTITION PAR CRITÈRES (jour) ──────────────────────
function countBy(field) {
  var map = {};
  allDossiers.forEach(function(d) {
    var v = (d[field] || 'N/A').toUpperCase();
    if (!map[v]) map[v] = { total: 0, traites: 0 };
    map[v].total++; if (d.traite) map[v].traites++;
  });
  return Object.entries(map).sort(function(a,b){ return b[1].total - a[1].total; });
}

function renderBars(entries) {
  return entries.map(function(e) {
    var label = e[0]; var s = e[1];
    var pct = s.total > 0 ? Math.round(s.traites / s.total * 100) : 0;
    return '<div style="margin-bottom:10px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'
      + '<span style="font-weight:600;font-size:13px">' + label + '</span>'
      + '<span style="font-size:12px;color:#888">' + s.traites + '/' + s.total + ' (' + pct + '%)</span>'
      + '</div>'
      + '<div style="background:#eee;border-radius:8px;height:10px">'
      + '<div style="background:var(--rose);height:10px;border-radius:8px;width:' + pct + '%"></div>'
      + '</div></div>';
  }).join('');
}

var byType  = countBy('type');
var byNat   = countBy('nature');
var byPf    = countBy('portefeuille');

// ── STATS HISTORIQUES (mois glissant) ────────────────────
// Agréger par semaine
function getWeek(dateStr) {
  var d = new Date(dateStr);
  var jan1 = new Date(d.getFullYear(), 0, 1);
  return 'S' + Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}
var weekMap = {};
histo.forEach(function(h) {
  var wk = getWeek(h.date_journee);
  if (!weekMap[wk]) weekMap[wk] = { assignes: 0, traites: 0 };
  weekMap[wk].assignes += h.nb_assignes;
  weekMap[wk].traites  += h.nb_traites;
});
var weekRows = Object.entries(weekMap).slice(0, 8).map(function(e) {
  var pct = e[1].assignes > 0 ? Math.round(e[1].traites / e[1].assignes * 100) : 0;
  return '<tr>'
    + '<td><strong>' + e[0] + '</strong></td>'
    + '<td style="text-align:center">' + e[1].assignes + '</td>'
    + '<td style="text-align:center;color:#27ae60">' + e[1].traites + '</td>'
    + '<td style="text-align:center">' + pct + '%</td>'
    + '</tr>';
}).join('');

// Classement mensuel (30 derniers jours)
var monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
var monthHisto = histo.filter(function(h){ return new Date(h.date_journee) >= monthAgo; });
var monthGest = {};
monthHisto.forEach(function(h) {
  if (!monthGest[h.gestionnaire]) monthGest[h.gestionnaire] = { assignes: 0, traites: 0 };
  monthGest[h.gestionnaire].assignes += h.nb_assignes;
  monthGest[h.gestionnaire].traites  += h.nb_traites;
});
var monthRows = Object.entries(monthGest).sort(function(a,b){ return b[1].traites - a[1].traites; }).map(function(e, i) {
  var pct = e[1].assignes > 0 ? Math.round(e[1].traites / e[1].assignes * 100) : 0;
  var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.';
  return '<tr>'
    + '<td style="text-align:center">' + medal + '</td>'
    + '<td><strong>' + e[0] + '</strong></td>'
    + '<td style="text-align:center">' + e[1].assignes + '</td>'
    + '<td style="text-align:center;color:#27ae60;font-weight:700">' + e[1].traites + '</td>'
    + '<td style="text-align:center">' + pct + '%</td>'
    + '</tr>';
}).join('');

var tpsTxt = tpsMoyenMin > 0
  ? (tpsMoyenMin >= 60 ? Math.floor(tpsMoyenMin/60) + 'h' + (tpsMoyenMin%60) + 'min' : tpsMoyenMin + ' min')
  : '--';

var html = '<div style="max-width:1100px">'

  // Titre
  + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'
  + '<h2 style="color:var(--navy);margin:0">📊 Statistiques</h2>'
  + '<div style="display:flex;align-items:center;gap:10px">'
  + '<span style="font-size:12px;color:#888;background:#f0f4f8;padding:4px 12px;border-radius:12px">📅 ' + new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long'}) + '</span>'
  + (role === 'admin' ? '<button class="btn btn-secondary" style="font-size:12px;padding:4px 14px;color:#e74c3c;border-color:#e74c3c" onclick="resetStats()">🗑️ Réinitialiser les stats</button>' : '')
  + (role === 'admin' ? '<div id="archivage-toggle-zone">⏳ Chargement...</div>' : '')
  + '</div>'
  + '</div>'

  // KPIs du jour
  + '<div class="stats-grid" style="margin-bottom:24px">'
  + '<div class="stat-card"><div class="number">' + total + '</div><div class="label">Total du jour</div></div>'
  + '<div class="stat-card"><div class="number" style="color:#27ae60">' + traites + '</div><div class="label">Traités</div></div>'
  + '<div class="stat-card"><div class="number" style="color:#e67e22">' + enCours + '</div><div class="label">En cours</div></div>'
  + '<div class="stat-card"><div class="number" style="color:var(--rose)">' + tauxGlobal + '%</div><div class="label">Taux global</div></div>'
  + '<div class="stat-card"><div class="number" style="font-size:20px">' + tpsTxt + '</div><div class="label">Temps moyen</div></div>'
  + '<div class="stat-card"><div class="number" style="font-size:16px;color:var(--navy)">' + (topGest ? topGest[0].split(' ')[0] : '--') + '</div><div class="label">🏆 Top du jour</div></div>'
  + '</div>'

  // Classement du jour
  + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">'
  + '<div class="table-container"><div class="table-toolbar"><h2>🏆 Classement du jour</h2></div>'
  + '<table><thead><tr><th>#</th><th>Gestionnaire</th><th>Assignés</th><th>Traités</th><th>En cours</th><th>Progression</th></tr></thead>'
  + '<tbody>' + (rankRows || '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">Aucun dossier dispatché aujourd&#39;hui</td></tr>') + '</tbody></table></div>'

  // Répartition par critères
  + '<div class="table-container"><div class="table-toolbar"><h2>📋 Répartition du jour</h2>'
  + '<div style="display:flex;gap:6px">'
  + '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="switchCritere(&#39;type&#39;)">Type</button>'
  + '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="switchCritere(&#39;nature&#39;)">Nature</button>'
  + '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="switchCritere(&#39;portefeuille&#39;)">Portefeuille</button>'
  + '</div></div>'
  + '<div style="padding:16px" id="critere-bars">' + renderBars(byType) + '</div></div>'
  + '</div>'

  // Stats historiques
  + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">'

  // Par semaine
  + '<div class="table-container"><div class="table-toolbar"><h2>📈 Volume par semaine</h2></div>'
  + '<table><thead><tr><th>Semaine</th><th>Assignés</th><th>Traités</th><th>Taux</th></tr></thead>'
  + '<tbody>' + (weekRows || '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">Pas encore de données historiques</td></tr>') + '</tbody></table></div>'

  // Classement mensuel
  + '<div class="table-container"><div class="table-toolbar"><h2>🗓️ Classement 30 derniers jours</h2></div>'
  + '<table><thead><tr><th>#</th><th>Gestionnaire</th><th>Assignés</th><th>Traités</th><th>Taux</th></tr></thead>'
  + '<tbody>' + (monthRows || '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">Pas encore de données historiques</td></tr>') + '</tbody></table></div>'

  + '</div></div>';

// Stocker les données pour switchCritere
window._statsByType  = byType;
window._statsByNat   = byNat;
window._statsByPf    = byPf;
window._renderBars   = renderBars;

document.getElementById('main-content').innerHTML = html;

// Rendre le bouton toggle archivage
var toggleZone = document.getElementById('archivage-toggle-zone');
if (toggleZone) {
  toggleZone.innerHTML = archivageActif
    ? '<button onclick="toggleArchivage(false)" style="display:flex;align-items:center;gap:6px;padding:4px 14px;background:#eafaf1;border:1.5px solid #27ae60;color:#1e8449;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">'
      + '<span style="width:10px;height:10px;border-radius:50%;background:#27ae60;display:inline-block"></span>Archivage ON</button>'
    : '<button onclick="toggleArchivage(true)" style="display:flex;align-items:center;gap:6px;padding:4px 14px;background:#fdf2f8;border:1.5px solid #e74c3c;color:#c0392b;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">'
      + '<span style="width:10px;height:10px;border-radius:50%;background:#e74c3c;display:inline-block"></span>Archivage SUSPENDU</button>';
}
}

function switchCritere(critere) {
var data = critere === 'type' ? window._statsByType
         : critere === 'nature' ? window._statsByNat
         : window._statsByPf;
if (data && window._renderBars) {
  document.getElementById('critere-bars').innerHTML = window._renderBars(data);
}
}

function resetStats() {
var modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'reset-stats-modal';
modal.innerHTML = '<div class="modal" style="max-width:420px;text-align:center">'
  + '<div style="font-size:48px;margin-bottom:12px">🗑️</div>'
  + '<h2 style="color:#e74c3c">Réinitialiser les stats ?</h2>'
  + '<p style="color:#666;margin:16px 0">Cette action supprime <strong>tout l\'historique</strong> des tables <code>stats_journalieres</code> et <code>historique_sinistres</code> (classement, volumes).<br>⚠️ Cette action est irréversible.</p>'
  + '<div style="display:flex;gap:12px;justify-content:center;margin-top:20px">'
  + '<button class="btn btn-secondary" onclick="closeModal(\'reset-stats-modal\')">Annuler</button>'
  + '<button class="btn btn-primary" style="background:#e74c3c;border-color:#e74c3c" onclick="confirmResetStats()">🗑️ Confirmer la suppression</button>'
  + '</div></div>';
document.body.appendChild(modal);
}

async function confirmResetStats() {
closeModal('reset-stats-modal');
// Vider stats_journalieres
var { error: e1 } = await db.from('stats_journalieres').delete().gte('id', 0);
if (e1) { showNotif('Erreur stats_journalieres : ' + e1.message, 'error'); return; }
// Vider aussi historique_sinistres (source du classement 30j et volume semaine)
var { error: e2 } = await db.from('historique_sinistres').delete().gte('id', 0);
if (e2) { showNotif('Erreur historique_sinistres : ' + e2.message, 'error'); return; }
await auditLog('RESET_STATS', 'stats_journalieres + historique_sinistres effacés manuellement');
showNotif('✅ Historique des stats réinitialisé (classement + volumes inclus) !', 'success');
renderStats();
}


async function toggleArchivage(activer) {
var valeur = activer ? 'true' : 'false';
var label   = activer ? 'activé' : 'suspendu';

// Upsert dans app_config
var { error } = await db.from('app_config')
  .upsert({ key: 'archivage_stats', value: valeur }, { onConflict: 'key' });

if (error) {
  showNotif('Erreur : ' + error.message, 'error');
  return;
}

await auditLog(
  activer ? 'ARCHIVAGE_STATS_ON' : 'ARCHIVAGE_STATS_OFF',
  activer ? 'Archivage des stats réactivé' : 'Archivage des stats suspendu (mode test)'
);

showNotif(activer ? '✅ Archivage réactivé' : '⏸️ Archivage suspendu', activer ? 'success' : 'info');
renderStats(); // Rafraîchir pour mettre à jour le bouton
}

// ===== FIN STATS =====

// ===== HISTORIQUE REFERENTS =====
async function toggleHistoriqueActif() {
var nouvelEtat = !window._historiqueActif;
var valeur = nouvelEtat ? 'true' : 'false';
var { error } = await db.from('app_config')
  .upsert({ key: 'historique_actif', value: valeur }, { onConflict: 'key' });
if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
window._historiqueActif = nouvelEtat;
await auditLog(
  nouvelEtat ? 'HISTORIQUE_REFERENT_ON' : 'HISTORIQUE_REFERENT_OFF',
  nouvelEtat ? 'Referent historique active' : 'Referent historique desactive'
);
showNotif(nouvelEtat ? '✅ Référent historique activé' : '⏸️ Référent historique désactivé',
          nouvelEtat ? 'success' : 'info');
renderAttribution();
}

async function changerReferent(refSinistre) {
await loadAllUsers();
var gests = (allUsers || []).filter(function(u) {
  return ['gestionnaire', 'manager', 'admin'].includes(u.role);
});
var optsHTML = gests.map(function(g) {
  var nom = g.prenom + ' ' + g.nom;
  var cur = window._historiqueMap && window._historiqueMap[refSinistre];
  var sel = cur && cur.gestionnaire === nom ? 'selected' : '';
  return '<option value="' + nom + '" ' + sel + '>' + nom + '</option>';
}).join('');
var modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'referent-modal';
modal.innerHTML = '<div class="modal" style="max-width:400px;text-align:center">'
  + '<h2 style="color:var(--navy)">✏️ Changer le référent</h2>'
  + '<p style="color:#666;margin:12px 0">Réf. sinistre : <strong>' + refSinistre + '</strong></p>'
  + '<select id="sel-new-referent" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:16px">' + optsHTML + '</select>'
  + '<div style="display:flex;gap:10px;justify-content:center">'
  + '<button class="btn btn-secondary" onclick="closeModal(\'referent-modal\')">Annuler</button>'
  + '<button class="btn btn-primary" onclick="confirmerChangementReferent(\'' + refSinistre + '\')">✅ Confirmer</button>'
  + '</div></div>';
document.body.appendChild(modal);
}

async function confirmerChangementReferent(refSinistre) {
var newGest = document.getElementById('sel-new-referent').value;
if (!newGest) return;
var { error } = await db.from('historique_sinistres')
  .update({ gestionnaire: newGest })
  .eq('ref_sinistre', refSinistre);
if (error) { showNotif('Erreur : ' + error.message, 'error'); return; }
closeModal('referent-modal');
await auditLog('REFERENT_CHANGE', 'Ref. ' + refSinistre + ' -> ' + newGest);
showNotif('✅ Référent mis à jour : ' + newGest, 'success');
renderAttribution();
}
// ===== FIN HISTORIQUE REFERENTS =====

