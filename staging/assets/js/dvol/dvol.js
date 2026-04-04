// ============================================================
// DPLANE v5.0 -- lisibilité améliorée / 2e activité journée visible
// ============================================================

let dplaneSemaineOffset = 0;
let dplaneActivites     = [];
let dplaneBrouillonMode = true;

function dplaneGetRole() {
  if (!currentUserData) return null;
  return (typeof getEffectiveRole === 'function') ? getEffectiveRole() : currentUserData.role;
}

// ── Confirm personnalisé (remplace window.confirm) ──
function dplaneConfirm(message, emoji, onConfirm) {
  document.getElementById('dplane-confirm-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'dplane-popup-overlay';
  overlay.id = 'dplane-confirm-modal';
  overlay.innerHTML = `
    <div class="dplane-popup" style="max-width:360px;text-align:center;padding:32px 28px;">
      <div style="font-size:40px;margin-bottom:14px;">${emoji || '⚠️'}</div>
      <p style="font-size:15px;color:var(--navy);font-weight:600;margin:0 0 24px;line-height:1.5;">${message}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-secondary" onclick="document.getElementById('dplane-confirm-modal').remove()" style="min-width:110px;">Annuler</button>
        <button class="btn btn-primary" onclick="_dplConfirmOk()" style="min-width:110px;background:#e5195e;border-color:#e5195e;">Confirmer</button>
      </div>
    </div>`;
  window._dplConfirmCb = onConfirm;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
function _dplConfirmOk() {
  document.getElementById('dplane-confirm-modal')?.remove();
  if (window._dplConfirmCb) window._dplConfirmCb();
}

// ── CRUD Supabase ──

async function dplaneGetActivites() {
  const { data } = await db.from('dplane_activites').select('*').eq('actif', true).order('ordre');
  return data || [];
}
async function dplaneGetAllActivites() {
  const { data } = await db.from('dplane_activites').select('*').order('ordre');
  return data || [];
}
async function dplaneGetPlanningSemaine(dateDebut, dateFin) {
  const role = dplaneGetRole();
  let query = db.from('dplane_planning')
    .select('id, gestionnaire_id, jour, creneau, activite_id, is_brouillon')
    .gte('jour', dateDebut).lte('jour', dateFin);
  if (role === 'gestionnaire') query = query.eq('is_brouillon', false);
  const { data } = await query;
  return data || [];
}
async function dplaneGetAbsencesSemaine(dateDebut, dateFin) {
  const { data } = await db.from('dplane_absences').select('*').gte('jour', dateDebut).lte('jour', dateFin);
  return data || [];
}
async function dplaneAjouterPlanning(managerId, gestionnaireId, jour, creneau, activiteId, isBrouillon) {
  const { error } = await db.from('dplane_planning').insert({
    manager_id: managerId, gestionnaire_id: gestionnaireId,
    jour, creneau, activite_id: activiteId, is_brouillon: isBrouillon || false
  });
  if (error) console.error('dplaneAjouterPlanning error:', error);
  return !error;
}
async function dplaneSupprimerPlanning(planningId) {
  const { error } = await db.from('dplane_planning').delete().eq('id', planningId);
  return !error;
}
async function dplanePublierToutBrouillon(dateDebut, dateFin) {
  const { error } = await db.from('dplane_planning')
    .update({ is_brouillon: false })
    .gte('jour', dateDebut).lte('jour', dateFin).eq('is_brouillon', true);
  return !error;
}
async function dplaneAjouterAbsence(managerId, gestionnaireId, jour, creneau, type) {
  await db.from('dplane_absences').delete()
    .eq('gestionnaire_id', gestionnaireId).eq('jour', jour).eq('creneau', creneau);
  const { error } = await db.from('dplane_absences').insert({
    manager_id: managerId, gestionnaire_id: gestionnaireId,
    jour, creneau, type_absence: type
  });
  return !error;
}
async function dplaneSupprimerAbsence(absenceId) {
  const { error } = await db.from('dplane_absences').delete().eq('id', absenceId);
  return !error;
}
async function dplaneCopierSemaine(dateDebut, dateFin, managerId) {
  const planning = await dplaneGetPlanningSemaine(dateDebut, dateFin);
  let succes = 0, erreurs = 0;
  for (const p of planning) {
    const d = new Date(p.jour + 'T12:00:00'); d.setDate(d.getDate() + 7);
    const ok = await dplaneAjouterPlanning(managerId, p.gestionnaire_id, dplaneDateStr(d), p.creneau, p.activite_id, p.is_brouillon);
    if (ok) succes++; else erreurs++;
  }
  return { succes, erreurs };
}

// ── Helpers ──
function dplaneGetLundiSemaine(offset) {
  const today = new Date(), day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day) + (offset * 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function dplaneDateStr(date) { return date.toISOString().split('T')[0]; }
function dplaneNavSemaine(dir) { if (!currentUserData) return; dplaneSemaineOffset += dir; renderDplaneGrille(); }
function dplaneGoToday()       { if (!currentUserData) return; dplaneSemaineOffset = 0; renderDplaneGrille(); }

// ── Grille Planning ──
async function renderDplaneGrille() {
  if (!currentUserData) return;
  const lundi = dplaneGetLundiSemaine(dplaneSemaineOffset);
  const jours = Array.from({length:5}, (_,i) => { const d=new Date(lundi); d.setDate(lundi.getDate()+i); return d; });
  const dateDebut = dplaneDateStr(jours[0]), dateFin = dplaneDateStr(jours[4]);

  document.getElementById('dplane-week-label').textContent =
    'Sem. du ' + jours[0].toLocaleDateString('fr-FR',{day:'numeric',month:'long'}) +
    ' au ' + jours[4].toLocaleDateString('fr-FR',{day:'numeric',month:'long'});

  const [planning, absences] = await Promise.all([
    dplaneGetPlanningSemaine(dateDebut, dateFin),
    dplaneGetAbsencesSemaine(dateDebut, dateFin)
  ]);

  // Mode "Mon planning" : filtre sur l'utilisateur courant si activé
  let membres = (allUsers||[]).filter(u => u.actif!==false).sort((a,b)=>{
    const o={gestionnaire:0,manager:1,admin:2}; return (o[a.role]??3)-(o[b.role]??3);
  });
  if (window._dplaneMonPlanning && currentUserData) {
    membres = membres.filter(m => m.id === currentUserData.id);
  }
  const joursLabels=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
  const creneaux=['matin','apresmidi'], creneauxLabels={matin:'Matin',apresmidi:'Après-midi'};
  const today=dplaneDateStr(new Date()), role=dplaneGetRole(), canEdit=role==='admin'||role==='manager';
  const absLabels={conge:'🏖️ Congé',maladie:'🤒 Maladie',formation:'📚 Formation',absence:'❌ Absence'};

  // COLGROUP égalité colonnes
  const table = document.getElementById('dplane-table');
  let cg = table.querySelector('colgroup');
  if (!cg) { cg=document.createElement('colgroup'); table.prepend(cg); }
  cg.innerHTML = '<col class="col-membre">' + Array(10).fill('<col class="col-cr">').join('');

  // THEAD
  document.getElementById('dplane-thead').innerHTML = `
    <tr>
      <th rowspan="2" style="text-align:left;vertical-align:middle;">Membre</th>
      ${jours.map((j,i) => `
        <th colspan="2" style="${dplaneDateStr(j)===today?'background:var(--rose);':''}text-align:center;padding:8px 4px;">
          <div style="font-size:12px;font-weight:700;">${joursLabels[i]}</div>
          <div style="font-size:10px;font-weight:400;opacity:.85;">${j.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</div>
        </th>`).join('')}
    </tr>
    <tr>${jours.map(()=>creneaux.map(c=>`<th style="font-size:10px;opacity:.8;font-weight:500;text-align:center;padding:4px 2px;border-top:1px solid rgba(255,255,255,.15);">${creneauxLabels[c]}</th>`).join('')).join('')}</tr>`;

  // TBODY
  const roleColors={gestionnaire:'#16a34a',manager:'#9333ea',admin:'#e5195e'};
  document.getElementById('dplane-tbody').innerHTML = membres.map(m => {
    const ini=(m.prenom?.[0]||'')+(m.nom?.[0]||'');
    const ca=roleColors[m.role]||'#4A7EC7';
    return `<tr>
      <td style="white-space:nowrap;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${ca};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:white;flex-shrink:0;">${ini}</div>
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;" title="${m.prenom} ${m.nom}">${m.prenom} ${m.nom}</div>
            ${m.role!=='gestionnaire'?`<div style="font-size:10px;color:${ca};font-weight:600;text-transform:uppercase;">${m.role}</div>`:''}
          </div>
        </div>
      </td>
      ${jours.map(jour => {
        const dateJ = dplaneDateStr(jour);
        const renderTag = (p) => {
          const act = dplaneActivites.find(a => a.id === p.activite_id);
          return `<span class="dplane-tag" style="background:${act?.couleur_hex||'#666'};${p.is_brouillon?'opacity:.6;border:1.5px dashed rgba(0,0,0,.25);':''}">
            ${p.is_brouillon?'✏️ ':''}${act?.nom||'?'}
            ${canEdit?`<span class="tag-remove" onclick="dplaneSupprimerPlanningUI('${p.id}')">×</span>`:''}
          </span>`;
        };
        // ── Absence journée entière → 1 seul TD colspan=2 ──
        const absJournee = absences.find(a => a.gestionnaire_id===m.id && a.jour===dateJ && a.creneau==='journee');
        if (absJournee) {
          const absLabelsJ = {conge:'🏖️ Congé',maladie:'🤒 Maladie',formation:'📚 Formation',absence:'❌ Absence'};
          const addBtn = canEdit ? `<button class="dplane-cell-add" title="Ajouter" onclick="dplaneOuvrirMenu('${m.id}','${dateJ}','matin',this)" style="margin-left:6px;">+</button>` : '';
          return `<td colspan="2" style="background:#fff8f0;">
            <div class="dplane-cell" style="justify-content:center;">
              <span class="dplane-absence">${absLabelsJ[absJournee.type_absence]||absJournee.type_absence} <span style="font-size:10px;opacity:.7;">(journée)</span>
                ${canEdit?`<span class="tag-remove" onclick="dplaneSupprimerAbsenceUI('${absJournee.id}')" style="cursor:pointer;margin-left:4px;">×</span>`:''}
              </span>${addBtn}
            </div>
          </td>`;
        }
        // ── Entrées "journée" activité : 1 seul TD colspan=2 ──
        const journeeTags = planning.filter(p => p.gestionnaire_id===m.id && p.jour===dateJ && p.creneau==='journee');
        const hasJournee = journeeTags.length > 0;
        const matinAbs  = absences.find(a => a.gestionnaire_id===m.id && a.jour===dateJ && a.creneau==='matin');
        const amAbs     = absences.find(a => a.gestionnaire_id===m.id && a.jour===dateJ && a.creneau==='apresmidi');

        if (hasJournee && !matinAbs && !amAbs) {
          // Afficher TOUS les tags du jour : journee + matin + apresmidi
          const matinTags = planning.filter(p => p.gestionnaire_id===m.id && p.jour===dateJ && p.creneau==='matin');
          const amTags    = planning.filter(p => p.gestionnaire_id===m.id && p.jour===dateJ && p.creneau==='apresmidi');
          const allDayTags = [...journeeTags, ...matinTags, ...amTags];
          const tagsHtml = allDayTags.map(renderTag).join('');
          const addBtn = canEdit ? `<button class="dplane-cell-add" title="Ajouter" onclick="dplaneOuvrirMenu('${m.id}','${dateJ}','matin',this)">+</button>` : '';
          return `<td colspan="2" style="background:rgba(74,126,199,0.04);"><div class="dplane-cell" style="justify-content:center;flex-wrap:wrap;">${tagsHtml}${addBtn}</div></td>`;
        }

        // ── Cellules normales Matin + Après-midi ──
        return creneaux.map(creneau => {
          const abs = absences.find(a => a.gestionnaire_id===m.id && a.jour===dateJ && a.creneau===creneau);
          if (abs) return `<td style="background:#fff8f0;"><div class="dplane-cell">
            <span class="dplane-absence">${absLabels[abs.type_absence]||abs.type_absence}
              ${canEdit?`<span class="tag-remove" onclick="dplaneSupprimerAbsenceUI('${abs.id}')" style="cursor:pointer;margin-left:4px;opacity:.7;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.7">×</span>`:''}
            </span></div></td>`;
          const tags = planning.filter(p => p.gestionnaire_id===m.id && p.jour===dateJ && p.creneau===creneau);
          const tagsHtml = tags.map(renderTag).join('');
          const addBtn = canEdit ? `<button class="dplane-cell-add" title="Ajouter" onclick="dplaneOuvrirMenu('${m.id}','${dateJ}','${creneau}',this)">+</button>` : '';
          return `<td><div class="dplane-cell">${tagsHtml}${addBtn}</div></td>`;
        }).join('');
      }).join('')}
    </tr>`;
  }).join('');

  const hasBrou = planning.some(p => p.is_brouillon);
  const btnP = document.getElementById('btn-publier-brouillon');
  if (btnP && canEdit) {
    if (hasBrou) {
      btnP.disabled = false;
      btnP.title = '📢 Publier les brouillons de la semaine';
      btnP.style.opacity = '1';
      btnP.style.cursor = 'pointer';
    } else {
      btnP.disabled = true;
      btnP.title = 'Rien à publier cette semaine';
      btnP.style.opacity = '.35';
      btnP.style.cursor = 'default';
    }
  }
}

// ── Menu contextuel smart (position auto haut/bas) ──
function dplaneOuvrirMenu(gestionnaireId, jour, creneau, btn) {
  document.getElementById('dplane-ctx-menu')?.remove();
  const menu = document.createElement('div');
  menu.id = 'dplane-ctx-menu';
  menu.style.cssText = 'position:fixed;background:white;border:1px solid var(--gray-200);border-radius:var(--radius-md);box-shadow:var(--shadow-md);padding:6px;z-index:3000;min-width:200px;max-height:80vh;overflow-y:auto;';

  const crLabel = creneau === 'matin' ? 'Matin' : 'Après-midi';

  // Activités -- bouton 📅 compact inline
  const actsHtml = dplaneActivites.map(a => `
    <div style="display:flex;align-items:stretch;border-bottom:1px solid var(--gray-100);">
      <div onclick="dplaneAjouterPlanningUI('${gestionnaireId}','${jour}','${creneau}','${a.id}',false)"
           style="flex:1;padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;border-radius:6px 0 0 6px;transition:background .1s;"
           onmouseover="this.style.background='var(--gray-100)'" onmouseout="this.style.background=''">
        <span style="width:10px;height:10px;border-radius:50%;background:${a.couleur_hex};flex-shrink:0;"></span>
        <span style="flex:1;">${a.nom}</span>
      </div>
      <button onclick="dplaneAjouterPlanningUI('${gestionnaireId}','${jour}','${creneau}','${a.id}',true)"
              title="Ajouter pour toute la journée (Matin + Après-midi)"
              style="padding:0 12px;border:none;border-left:1px solid var(--gray-100);background:transparent;cursor:pointer;font-size:13px;color:var(--gray-400);border-radius:0 6px 6px 0;transition:all .15s;white-space:nowrap;"
              onmouseover="this.parentElement.style.background='';this.style.background='var(--rose)';this.style.color='white';this.style.borderColor='var(--rose)'"
              onmouseout="this.style.background='transparent';this.style.color='var(--gray-400)';this.style.borderColor='var(--gray-100)'">
        📅
      </button>
    </div>`).join('');

  const absItem = `
    <div onclick="dplaneAjouterAbsenceUI('${gestionnaireId}','${jour}','${creneau}')"
         style="padding:8px 12px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px;font-size:13px;"
         onmouseover="this.style.background='var(--gray-100)'" onmouseout="this.style.background=''">
      <span style="width:10px;height:10px;border-radius:50%;background:#f97316;flex-shrink:0;"></span>
      Absence
    </div>`;

  menu.innerHTML = actsHtml + absItem;
  document.body.appendChild(menu);

  // ── Position intelligente (haut si proche bas d'écran) ──
  const rect = btn.getBoundingClientRect();
  const menuH = menu.offsetHeight || (dplaneActivites.length * 56 + 80);
  const spaceBelow = window.innerHeight - rect.bottom;
  const topPos = spaceBelow < menuH + 16
    ? Math.max(10, rect.top - menuH - 6)   // au-dessus
    : rect.bottom + 6;                      // en-dessous
  const leftPos = Math.min(rect.left, window.innerWidth - 220);
  menu.style.top  = topPos + 'px';
  menu.style.left = leftPos + 'px';

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
    });
  }, 100);
}

// ── Ajouter activité (journeeEntiere = creneau 'journee' = 1 seul record + colspan) ──
async function dplaneAjouterPlanningUI(gestionnaireId, jour, creneau, activiteId, journeeEntiere) {
  document.getElementById('dplane-ctx-menu')?.remove();
  if (!currentUserData) { showNotif('Session expirée, reconnectez-vous', 'error'); return; }
  const managerId = currentUserData.id;
  const crCible = journeeEntiere ? 'journee' : creneau;

  // Vérifier doublon
  const { data: ex } = await db.from('dplane_planning').select('id')
    .eq('gestionnaire_id',gestionnaireId).eq('jour',jour).eq('creneau',crCible).eq('activite_id',activiteId).maybeSingle();
  if (ex) { showNotif('Activité déjà présente sur ce créneau', 'info'); return; }

  const ok = await dplaneAjouterPlanning(managerId, gestionnaireId, jour, crCible, activiteId, dplaneBrouillonMode);
  if (ok) {
    const label = journeeEntiere ? '📅 Activité ajoutée pour la journée ✓' : 'Activité ajoutée ✓';
    showNotif(dplaneBrouillonMode ? `✏️ Brouillon : ${label}` : label, 'success');
    await renderDplaneGrille();
  } else {
    showNotif('Erreur lors de l\'ajout', 'error');
  }
}

async function dplaneSupprimerPlanningUI(planningId) {
  dplaneConfirm('Supprimer cette activité ?', '🗑️', async () => {
    const ok = await dplaneSupprimerPlanning(planningId);
    if (ok) { showNotif('Activité supprimée', 'success'); await renderDplaneGrille(); }
    else showNotif('Erreur lors de la suppression', 'error');
  });
}

// ── Modal Absence ──
async function dplaneAjouterAbsenceUI(gestionnaireId, jour, creneau) {
  document.getElementById('dplane-ctx-menu')?.remove();
  document.getElementById('dplane-absence-modal')?.remove();
  window._dplAbsParams = { gestionnaireId, jour, creneau };
  const lundi=dplaneGetLundiSemaine(dplaneSemaineOffset);
  window._dplAbsJoursSemaine = Array.from({length:5},(_,i)=>{ const d=new Date(lundi); d.setDate(lundi.getDate()+i); return dplaneDateStr(d); });
  const creneauxLabels={matin:'Matin',apresmidi:'Après-midi'};
  const dateAffich=new Date(jour+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  const overlay=document.createElement('div');
  overlay.className='dplane-popup-overlay'; overlay.id='dplane-absence-modal';
  overlay.innerHTML=`
    <div class="dplane-popup" style="max-width:420px;width:95vw;">
      <h2 style="margin-bottom:4px;">🗓️ Ajouter une absence</h2>
      <div class="dplane-date">${dateAffich}</div>
      <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.5px;display:block;margin:16px 0 8px;">Type d'absence</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;">
        ${[{value:'conge',label:'Congé',icon:'🏖️'},{value:'maladie',label:'Maladie',icon:'🤒'},{value:'formation',label:'Formation',icon:'📚'},{value:'absence',label:'Absence',icon:'❌'}].map(t=>`
          <label class="_dabs-lbl" style="display:flex;align-items:center;gap:8px;padding:9px 12px;border:1.5px solid var(--gray-300);border-radius:8px;cursor:pointer;font-size:13px;transition:all .15s;">
            <input type="radio" name="dabs-type" value="${t.value}" style="accent-color:var(--rose);" onclick="_dplHighlightLabel(this,'_dabs-lbl','--rose','--rose-light')">
            ${t.icon} ${t.label}</label>`).join('')}
      </div>
      <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px;">Portée</label>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;">
        ${[{value:'creneau',icon:'🕐',label:`Ce créneau <strong>(${creneauxLabels[creneau]})</strong>`,c:true},{value:'journee',icon:'📅',label:'Toute la journée',c:false},{value:'semaine',icon:'📆',label:'Toute la semaine (Lun→Ven)',c:false}].map(p=>`
          <label class="_dabs-plbl" style="display:flex;align-items:center;gap:10px;padding:9px 14px;border:1.5px solid ${p.c?'var(--rose)':'var(--gray-300)'};border-radius:8px;cursor:pointer;font-size:13px;background:${p.c?'var(--rose-light)':''};transition:all .15s;">
            <input type="radio" name="dabs-portee" value="${p.value}" ${p.c?'checked':''} style="accent-color:var(--rose);" onclick="_dplHighlightLabel(this,'_dabs-plbl','--rose','--rose-light')">
            <span>${p.icon} ${p.label}</span></label>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" onclick="document.getElementById('dplane-absence-modal').remove()" style="flex:1;">Annuler</button>
        <button class="btn btn-primary" onclick="dplaneConfirmerAbsence()" style="flex:1;">✓ Confirmer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}

function _dplHighlightLabel(input, cls, bv, bgv) {
  document.querySelectorAll('.'+cls).forEach(l=>{
    const c=l.querySelector('input')?.checked;
    l.style.borderColor=c?`var(${bv})`:'var(--gray-300)';
    l.style.background=c?`var(${bgv})`:'';
  });
}

async function dplaneConfirmerAbsence() {
  const {gestionnaireId,jour,creneau}=window._dplAbsParams||{};
  const joursSemaine=window._dplAbsJoursSemaine||[];
  const typeEl=document.querySelector('input[name="dabs-type"]:checked');
  const porteeEl=document.querySelector('input[name="dabs-portee"]:checked');
  if (!typeEl) { showNotif('Sélectionnez un type d\'absence','error'); return; }
  if (!currentUserData) { showNotif('Session expirée','error'); return; }
  const type=typeEl.value, portee=porteeEl?.value||'creneau', managerId=currentUserData.id;
  document.getElementById('dplane-absence-modal')?.remove();
  let ok=false;
  if (portee==='creneau') {
    ok = await dplaneAjouterAbsence(managerId, gestionnaireId, jour, creneau, type);
  } else if (portee==='journee') {
    // 1 seul record avec creneau='journee'
    ok = await dplaneAjouterAbsence(managerId, gestionnaireId, jour, 'journee', type);
  } else {
    // semaine = 5 records journee (un par jour)
    ok = true;
    for (const j of joursSemaine) {
      if (!(await dplaneAjouterAbsence(managerId, gestionnaireId, j, 'journee', type))) ok = false;
    }
  }
  if(ok){showNotif('Absence ajoutée ✓','success');await renderDplaneGrille();}
  else showNotif('Erreur lors de l\'ajout','error');
}

async function dplaneSupprimerAbsenceUI(absenceId) {
  // Récupérer l'absence pour savoir si elle fait partie d'une série semaine
  const { data: abs } = await db.from('dplane_absences').select('*').eq('id', absenceId).maybeSingle();
  if (!abs) return;

  // Chercher d'autres absences identiques (même gestionnaire + même type) dans la semaine courante
  const lundi    = dplaneGetLundiSemaine(dplaneSemaineOffset);
  const vendredi = new Date(lundi); vendredi.setDate(lundi.getDate() + 4);
  const { data: semaine } = await db.from('dplane_absences')
    .select('id, jour')
    .eq('gestionnaire_id', abs.gestionnaire_id)
    .eq('type_absence', abs.type_absence)
    .gte('jour', dplaneDateStr(lundi))
    .lte('jour', dplaneDateStr(vendredi));

  const autresJours = (semaine || []).filter(a => a.id !== absenceId);

  if (autresJours.length >= 1) {
    // Il y a d'autres jours → proposer choix
    document.getElementById('dplane-abs-del-modal')?.remove();
    const absLabels = {conge:'Congé',maladie:'Maladie',formation:'Formation',absence:'Absence'};
    // Stocker les IDs dans window pour éviter les guillemets cassés dans onclick
    window._dplAbsSingleId = absenceId;
    window._dplAbsWeekIds  = (semaine || []).map(a => a.id);

    const overlay = document.createElement('div');
    overlay.className = 'dplane-popup-overlay';
    overlay.id = 'dplane-abs-del-modal';
    overlay.innerHTML = `
      <div class="dplane-popup" style="max-width:380px;text-align:center;padding:28px;">
        <div style="font-size:36px;margin-bottom:12px;">🗑️</div>
        <h3 style="color:var(--navy);margin-bottom:8px;">Supprimer l'absence</h3>
        <p style="color:var(--gray-500);font-size:13px;margin-bottom:20px;">
          Cette absence <strong>${absLabels[abs.type_absence]||abs.type_absence}</strong> est présente sur 
          <strong>${(semaine||[]).length} jour${(semaine||[]).length>1?'s':''}</strong> cette semaine.
        </p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn btn-secondary" style="padding:12px;" onclick="_dplAbsSupprJour()">
            📅 Ce jour uniquement
          </button>
          <button class="btn btn-primary" style="padding:12px;background:#e5195e;border-color:#e5195e;" onclick="_dplAbsSupprSemaine()">
            🗓️ Toute la semaine (${(semaine||[]).length} jour${(semaine||[]).length>1?'s':''})
          </button>
          <button class="btn btn-secondary" style="font-weight:400;color:var(--gray-500);" onclick="document.getElementById('dplane-abs-del-modal').remove()">
            Annuler
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
  } else {
    // Une seule absence → suppression directe
    dplaneConfirm('Supprimer cette absence ?', '🗑️', async () => {
      await dplaneSupprimerAbsenceConfirm([absenceId], 'Absence supprimée ✓');
    });
  }
}

async function dplaneSupprimerAbsenceConfirm(ids, msg) {
  let ok = true;
  for (const id of ids) {
    if (!(await dplaneSupprimerAbsence(id))) ok = false;
  }
  if (ok) { showNotif(msg, 'success'); await renderDplaneGrille(); }
  else showNotif('Erreur lors de la suppression', 'error');
}

// Helpers appelés depuis les boutons du modal (évite les guillemets dans onclick)
async function _dplAbsSupprJour() {
  document.getElementById('dplane-abs-del-modal')?.remove();
  await dplaneSupprimerAbsenceConfirm([window._dplAbsSingleId], 'Absence du jour supprimée ✓');
}
async function _dplAbsSupprSemaine() {
  document.getElementById('dplane-abs-del-modal')?.remove();
  await dplaneSupprimerAbsenceConfirm(window._dplAbsWeekIds || [], 'Absences de la semaine supprimées ✓');
}

// ── Copier semaine ──
async function dplaneCopierSemaineUI() {
  if (!currentUserData) { showNotif('Session expirée','error'); return; }
  const lundi=dplaneGetLundiSemaine(dplaneSemaineOffset);
  const vendredi=new Date(lundi); vendredi.setDate(lundi.getDate()+4);
  dplaneConfirm('Copier le planning de cette semaine vers la semaine suivante ?', '📋', async () => {
    const result=await dplaneCopierSemaine(dplaneDateStr(lundi),dplaneDateStr(vendredi),currentUserData.id);
    showNotif(`${result.succes} entrée(s) copiée(s)${result.erreurs?`, ${result.erreurs} erreur(s)`:''}`,result.erreurs?'error':'success');
    await renderDplaneGrille();
  });
}

// ── Mode brouillon ──
function dplaneToggleBrouillon() {
  dplaneBrouillonMode = !dplaneBrouillonMode;
  const btn=document.getElementById('btn-brouillon');
  if(btn){
    btn.textContent=dplaneBrouillonMode?'✏️ Mode brouillon actif':'✏️ Mode brouillon';
    btn.style.cssText=dplaneBrouillonMode?'background:var(--rose);color:white;border-color:var(--rose);':'';
  }
  showNotif(dplaneBrouillonMode?'✏️ Mode brouillon -- ajouts invisibles aux gestionnaires':'Mode brouillon désactivé','info');
}

async function dplanePublierToutUI() {
  const lundi=dplaneGetLundiSemaine(dplaneSemaineOffset);
  const vendredi=new Date(lundi); vendredi.setDate(lundi.getDate()+4);
  dplaneConfirm('Publier tous les brouillons de cette semaine ?\nLes gestionnaires pourront voir le planning.','📢', async () => {
    const ok=await dplanePublierToutBrouillon(dplaneDateStr(lundi),dplaneDateStr(vendredi));
    if(ok){showNotif('✅ Planning publié !','success');await renderDplaneGrille();}
    else showNotif('Erreur lors de la publication','error');
  });
}

// ── Gestion activités ──
async function dplaneOuvrirGestionActivites() {
  const toutes=await dplaneGetAllActivites();
  const overlay=document.createElement('div');
  overlay.className='dplane-popup-overlay'; overlay.id='dplane-activites-modal';
  overlay.innerHTML=`
    <div class="dplane-popup" style="max-width:520px;width:95vw;">
      <h2>⚙️ Gérer les activités</h2>
      <div id="dplane-acti-list" style="max-height:280px;overflow-y:auto;margin-bottom:16px;">
        ${toutes.map(a=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--gray-200);">
            <div style="width:20px;height:20px;border-radius:4px;background:${a.couleur_hex};flex-shrink:0;border:1px solid rgba(0,0,0,.1);"></div>
            <span style="flex:1;font-size:13px;font-weight:600;">${a.nom}</span>
            <span style="font-size:11px;color:${a.actif?'#16a34a':'#dc2626'};font-weight:600;min-width:70px;">${a.actif?'✅ Active':'❌ Inactive'}</span>
            <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;" onclick="dplaneToggleActivite('${a.id}',${a.actif})">${a.actif?'Désactiver':'Activer'}</button>
          </div>`).join('')}
      </div>
      <div style="border-top:1px solid var(--gray-200);padding-top:16px;">
        <h3 style="font-size:14px;margin:0 0 12px;font-weight:700;">➕ Nouvelle activité</h3>
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:10px;align-items:end;">
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;">Nom</label>
            <input id="dplane-new-act-nom" type="text" placeholder="Ex: Permanence" style="width:100%;padding:8px 10px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:13px;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;">Couleur</label>
            <input id="dplane-new-act-couleur" type="color" value="#4A7EC7" style="width:50px;height:38px;padding:2px;border:1.5px solid var(--gray-300);border-radius:6px;cursor:pointer;">
          </div>
        </div>
        <button class="btn btn-primary" onclick="dplaneCreerActivite()" style="width:100%;">✓ Créer l'activité</button>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:16px;">
        <button class="btn btn-secondary" onclick="document.getElementById('dplane-activites-modal').remove()">Fermer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}

async function dplaneCreerActivite() {
  const nom = document.getElementById('dplane-new-act-nom')?.value?.trim();
  const couleur = document.getElementById('dplane-new-act-couleur')?.value || '#4A7EC7';
  if (!nom) { showNotif("Entrez un nom pour l'activité", "error"); return; }

  // Générer un code unique depuis le nom (ex: "Pré-ouvertures" → "prouvertures")
  const code = nom.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // supprimer accents
    .replace(/[^a-z0-9]/g, '_')                          // remplacer non-alphanum
    .replace(/_+/g, '_').replace(/^_|_$/g, '');          // nettoyer underscores
  const codeUnique = code + '_' + Date.now().toString(36); // anti-doublon

  const payload = { nom, code: codeUnique, couleur_hex: couleur, actif: true };
  const { error } = await db.from('dplane_activites').insert(payload);

  if (error) {
    console.error('dplaneCreerActivite error:', error);
    // Si couleur_hex échoue aussi, essayer couleurhex (ancien schéma)
    if (error.message?.includes('couleur_hex') || error.code === '42703') {
      const { error: error2 } = await db.from('dplane_activites').insert({ nom, couleurhex: couleur, actif: true });
      if (error2) { showNotif('Erreur : ' + (error2.message || 'colonne inconnue'), 'error'); return; }
    } else {
      showNotif('Erreur : ' + (error.message || 'impossible'), 'error');
      return;
    }
  }
  document.getElementById('dplane-activites-modal')?.remove();
  dplaneActivites = await dplaneGetActivites();
  await renderDplaneGrille();
  showNotif(`Activité "${nom}" créée ✓`, 'success');
}

async function dplaneToggleActivite(activiteId, actuelActif) {
  const {error}=await db.from('dplane_activites').update({actif:!actuelActif}).eq('id',activiteId);
  if(error){showNotif('Erreur','error');return;}
  document.getElementById('dplane-activites-modal')?.remove();
  dplaneActivites=await dplaneGetActivites();
  await renderDplaneGrille();
  showNotif(`Activité ${!actuelActif?'activée':'désactivée'}`,'success');
}

// ── Init ──
async function dplaneInit() {
  if (!currentUserData) { setTimeout(dplaneInit, 300); return; }
  dplaneActivites = await dplaneGetActivites();
  const role = dplaneGetRole();
  const canEdit = role === 'admin' || role === 'manager';
  const isGest = role === 'gestionnaire';

  // Boutons manager/admin uniquement
  ['btn-copier-semaine','btn-brouillon','btn-gerer-activites','btn-reinit-semaine'].forEach(id => {
    const b = document.getElementById(id); if (b) b.style.display = canEdit ? '' : 'none';
  });
  // Publier : visible managers/admin, grisé par défaut
  const btnP = document.getElementById('btn-publier-brouillon');
  if (btnP) {
    btnP.style.display = canEdit ? '' : 'none';
    btnP.disabled = true; btnP.style.opacity = '.35'; btnP.style.cursor = 'default';
  }
  // Bouton "Mon planning" : visible gestionnaires uniquement
  const btnMon = document.getElementById('btn-mon-planning');
  if (btnMon) btnMon.style.display = isGest ? '' : 'none';

  // Brouillon actif par défaut → UI du bouton
  if (canEdit) {
    const btnBrou = document.getElementById('btn-brouillon');
    if (btnBrou && dplaneBrouillonMode) {
      btnBrou.textContent = '✏️ Mode brouillon actif';
      btnBrou.style.cssText = 'background:var(--rose);color:white;border-color:var(--rose);';
    }
  }

  await renderDplaneGrille();
  // Briefing gestionnaire (1x par jour)
  if (isGest) setTimeout(dplaneBriefingGestionnaire, 1200);
}

// ── Switcher ──
function switchTool(tool) {
  const tabs=document.getElementById('tabs-container');
  const mc=document.getElementById('main-content');
  const dp=document.getElementById('dplane-screen');
  const bd=document.getElementById('btn-tool-dispatch');
  const bpl=document.getElementById('btn-tool-dplane');
  if(tool==='dplane'){
    if(tabs)tabs.style.display='none'; if(mc)mc.style.display='none'; if(dp)dp.style.display='block';
    bd?.classList.remove('active'); bpl?.classList.add('active');
    dplaneInit();
  } else {
    if(tabs)tabs.style.display=''; if(mc)mc.style.display=''; if(dp)dp.style.display='none';
    bd?.classList.add('active'); bpl?.classList.remove('active');
  }
}
// FIN DPLANE v5.0



